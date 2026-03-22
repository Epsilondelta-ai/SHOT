package game

import (
	"encoding/json"
	"fmt"
	"maps"
	"math/rand"
	"slices"
	"time"

	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/hub"
	"github.com/epsilondelta/shot/models"
	"github.com/google/uuid"
)

// SpyCount returns the number of spies for a given player count.
func SpyCount(playerCount int) int {
	switch {
	case playerCount <= 5:
		return 1
	case playerCount <= 7:
		return 2
	case playerCount <= 10:
		return 3
	default:
		return 4
	}
}

// Event represents a game event to broadcast via SSE and record for replay.
type Event struct {
	Type     string `json:"type"`
	ActorID  string `json:"actorId,omitempty"`
	TargetID string `json:"targetId,omitempty"`
	Card     string `json:"card,omitempty"`
	Payload  any    `json:"payload,omitempty"`
}

// StartGame initializes a new game from room members.
func StartGame(roomID string) (*GameState, []Event, error) {
	var room models.Room
	db.DB.First(&room, "id = ?", roomID)

	var members []models.RoomMember
	db.DB.Where("room_id = ? AND is_spectator = false", roomID).Order("joined_at ASC").Find(&members)

	playerCount := len(members)
	spyCount := SpyCount(playerCount)
	maxTurns := playerCount * 3

	// Assign roles randomly
	roles := make([]string, playerCount)
	for i := range roles {
		roles[i] = "agent"
	}
	spyIndices := rand.Perm(playerCount)[:spyCount]
	for _, idx := range spyIndices {
		roles[idx] = "spy"
	}

	// Build players
	players := make([]PlayerState, playerCount)
	turnOrder := make([]string, playerCount)
	gamePlayers := make([]models.GamePlayer, playerCount)

	for i, m := range members {
		var playerID string
		var username, avatarURL string

		if m.BotID != "" {
			playerID = m.BotID
			var bot models.Bot
			if err := db.DB.First(&bot, "id = ?", m.BotID).Error; err == nil {
				username = bot.Name
				avatarURL = bot.AvatarURL
			}
		} else {
			playerID = m.UserID
			var user models.User
			if err := db.DB.First(&user, "id = ?", m.UserID).Error; err == nil {
				username = user.Username
				avatarURL = user.AvatarURL
			}
		}

		players[i] = PlayerState{
			ID:        playerID,
			UserID:    m.UserID,
			BotID:     m.BotID,
			Role:      roles[i],
			HP:        3,
			MaxHP:     3,
			Cards:     []string{},
			Username:  username,
			AvatarURL: avatarURL,
		}
		turnOrder[i] = playerID
		gamePlayers[i] = models.GamePlayer{
			GameID:    "", // set after game created
			UserID:    m.UserID,
			BotID:     m.BotID,
			Role:      roles[i],
			StartHP:   3,
			Username:  username,
			AvatarURL: avatarURL,
		}
	}

	// Randomize turn order
	rand.Shuffle(len(turnOrder), func(i, j int) {
		turnOrder[i], turnOrder[j] = turnOrder[j], turnOrder[i]
	})

	// Build deck
	deck := BuildDeck(playerCount, spyCount)

	// Create game in DB
	gameModel := models.Game{
		RoomID:      roomID,
		Title:       room.Name,
		Status:      "playing",
		PlayerCount: playerCount,
		MaxTurns:    maxTurns,
	}
	if err := db.DB.Create(&gameModel).Error; err != nil {
		return nil, nil, err
	}

	// Save game players
	for i := range gamePlayers {
		gamePlayers[i].GameID = gameModel.ID
		db.DB.Create(&gamePlayers[i])
	}

	state := &GameState{
		GameID:           gameModel.ID,
		RoomID:           roomID,
		Status:           "playing",
		Players:          players,
		Deck:             deck,
		Discard:          []string{},
		Banished:         0,
		CurrentTurnIndex: 0,
		TurnOrder:        turnOrder,
		TurnCount:        1,
		MaxTurns:         maxTurns,
		Phase:            "draw",
		ActionSeq:        0,
	}

	// Initial draw: each player draws 2 cards
	var events []Event
	for i := range state.Players {
		drawEvents := drawCardsForPlayer(state, state.Players[i].ID, 2)
		events = append(events, drawEvents...)
	}

	// Start first turn
	state.TurnDeadline = time.Now().Add(2 * time.Minute).Unix()
	firstPlayer := state.FindPlayer(state.CurrentPlayerID())

	// Draw phase for first player
	turnDrawEvents := drawCardsForPlayer(state, firstPlayer.ID, 2)
	events = append(events, turnDrawEvents...)
	state.Phase = "action"

	events = append(events, Event{
		Type:    "turn_start",
		ActorID: firstPlayer.ID,
		Payload: map[string]any{
			"turnCount":    state.TurnCount,
			"maxTurns":     state.MaxTurns,
			"turnDeadline": state.TurnDeadline,
		},
	})

	// Record actions (must happen before SaveState so ActionSeq is up-to-date in Redis)
	for _, e := range events {
		recordAction(state, e)
	}

	// Save state to Redis
	if err := SaveState(db.RDB, state); err != nil {
		return nil, nil, err
	}

	return state, events, nil
}

// PlayCard handles a player using a card on a target.
func PlayCard(state *GameState, playerID, cardType, targetID string) ([]Event, error) {
	if state.Status != "playing" {
		return nil, fmt.Errorf("game not in progress")
	}
	player := state.FindPlayer(playerID)
	if player == nil || player.IsDead {
		return nil, fmt.Errorf("invalid player")
	}
	if state.CurrentPlayerID() != playerID {
		return nil, fmt.Errorf("not your turn")
	}
	if state.Phase != "action" {
		return nil, fmt.Errorf("not in action phase")
	}

	// Check player has the card
	cardIdx := -1
	for i, c := range player.Cards {
		if c == cardType {
			cardIdx = i
			break
		}
	}
	if cardIdx < 0 {
		return nil, fmt.Errorf("card not in hand")
	}

	target := state.FindPlayer(targetID)
	if target == nil || target.IsDead {
		return nil, fmt.Errorf("invalid target")
	}

	// Validate card-specific rules
	if err := validateCardUse(state, player, cardType, target); err != nil {
		return nil, err
	}

	// Remove card from hand
	player.Cards = append(player.Cards[:cardIdx], player.Cards[cardIdx+1:]...)

	// Card disposal: banish inspect/jail on use, discard attack/heal
	if BanishOnUse(cardType) {
		state.Banished++
	} else {
		state.Discard = append(state.Discard, cardType)
	}

	var events []Event

	// Apply card effect
	switch cardType {
	case CardAttack:
		player.HasAttackedThisTurn = true
		target.HP--
		events = append(events, Event{
			Type:     "game_action",
			ActorID:  playerID,
			TargetID: targetID,
			Card:     CardAttack,
			Payload: map[string]any{
				"targetHP": target.HP,
				"damage":   1,
			},
		})

		// Check death
		if target.HP <= 0 {
			deathEvents := handleDeath(state, player, target)
			events = append(events, deathEvents...)
		}

	case CardHeal:
		if target.HP < target.MaxHP {
			target.HP++
		}
		events = append(events, Event{
			Type:     "game_action",
			ActorID:  playerID,
			TargetID: targetID,
			Card:     CardHeal,
			Payload: map[string]any{
				"targetHP": target.HP,
			},
		})

	case CardJail:
		target.IsJailed = true
		target.JailTurnsLeft = 1
		events = append(events, Event{
			Type:     "game_action",
			ActorID:  playerID,
			TargetID: targetID,
			Card:     CardJail,
		})

	case CardInspect:
		revealed := target.Role
		if target.Role == "agent" {
			target.IsConfirmedAgent = true
		} else {
			target.IsRevealed = true
		}
		events = append(events, Event{
			Type:     "game_action",
			ActorID:  playerID,
			TargetID: targetID,
			Card:     CardInspect,
			Payload: map[string]any{
				"revealedRole": revealed,
			},
		})
	}

	// Reset turn timer on card use
	state.TurnDeadline = time.Now().Add(2 * time.Minute).Unix()
	events = append(events, Event{
		Type: "timer_sync",
		Payload: map[string]any{
			"turnDeadline": state.TurnDeadline,
		},
	})

	// Check win condition after every card
	if result := CheckWinCondition(state); result != "" {
		endEvents := endGame(state, result)
		events = append(events, endEvents...)
	}

	// Record and save (record first so ActionSeq is up-to-date in Redis)
	for _, e := range events {
		recordAction(state, e)
	}
	SaveState(db.RDB, state)

	return events, nil
}

// EndTurn handles a player ending their turn.
func EndTurn(state *GameState, playerID string) ([]Event, error) {
	if state.Status != "playing" {
		return nil, fmt.Errorf("game not in progress")
	}
	player := state.FindPlayer(playerID)
	if player == nil || state.CurrentPlayerID() != playerID {
		return nil, fmt.Errorf("not your turn")
	}
	if state.Phase != "action" {
		return nil, fmt.Errorf("not in action phase")
	}

	// Must have attacked unless jailed or no attack cards
	if !player.HasAttackedThisTurn && !player.IsJailed && hasCard(player, CardAttack) {
		return nil, fmt.Errorf("must use at least one attack card")
	}

	return advanceTurn(state)
}

// HandleTimeout handles automatic action when turn timer expires.
func HandleTimeout(state *GameState) ([]Event, error) {
	player := state.FindPlayer(state.CurrentPlayerID())
	if player == nil || player.IsDead {
		return advanceTurn(state)
	}

	var events []Event

	// If hasn't attacked and can attack, do random attack
	if !player.HasAttackedThisTurn && !player.IsJailed && hasCard(player, CardAttack) {
		target := randomAttackTarget(state, player)
		if target != nil {
			attackEvents, _ := PlayCard(state, player.ID, CardAttack, target.ID)
			events = append(events, attackEvents...)

			// Check if game ended after the attack
			if state.Status == "finished" {
				return events, nil
			}
		}
	}

	events = append(events, Event{
		Type:    "timeout",
		ActorID: player.ID,
	})
	recordAction(state, Event{Type: "timeout", ActorID: player.ID})

	turnEvents, err := advanceTurn(state)
	if err != nil {
		return events, err
	}
	events = append(events, turnEvents...)

	return events, nil
}

// RevealIdentity handles a spy voluntarily revealing their identity.
func RevealIdentity(state *GameState, playerID string) ([]Event, error) {
	if state.Status != "playing" {
		return nil, fmt.Errorf("game not in progress")
	}
	player := state.FindPlayer(playerID)
	if player == nil || player.IsDead {
		return nil, fmt.Errorf("invalid player")
	}
	if state.CurrentPlayerID() != playerID {
		return nil, fmt.Errorf("not your turn")
	}
	if state.Phase != "action" {
		return nil, fmt.Errorf("not in action phase")
	}
	if player.Role != "spy" {
		return nil, fmt.Errorf("only spies can reveal")
	}
	if player.IsRevealed {
		return nil, fmt.Errorf("already revealed")
	}

	player.IsRevealed = true
	player.HasChatted = false // reset so spy can send 1 additional chat after reveal

	var events []Event
	events = append(events, Event{
		Type:    "game_action",
		ActorID: playerID,
		Card:    "reveal",
		Payload: map[string]any{
			"role": "spy",
		},
	})

	// Draw 2 cards on reveal
	drawEvents := drawCardsForPlayer(state, playerID, 2)
	events = append(events, drawEvents...)

	// Reset timer
	state.TurnDeadline = time.Now().Add(2 * time.Minute).Unix()
	events = append(events, Event{
		Type: "timer_sync",
		Payload: map[string]any{
			"turnDeadline": state.TurnDeadline,
		},
	})

	for _, e := range events {
		recordAction(state, e)
	}
	SaveState(db.RDB, state)

	return events, nil
}

// SendChat handles in-game chat (1 per turn).
func SendChat(state *GameState, playerID, message string) ([]Event, error) {
	if state.Status != "playing" {
		return nil, fmt.Errorf("game not in progress")
	}
	player := state.FindPlayer(playerID)
	if player == nil || player.IsDead {
		return nil, fmt.Errorf("invalid player")
	}
	if state.CurrentPlayerID() != playerID {
		return nil, fmt.Errorf("not your turn")
	}
	if player.HasChatted {
		return nil, fmt.Errorf("already chatted this turn")
	}
	if len([]rune(message)) > 100 {
		message = string([]rune(message)[:100])
	}

	player.HasChatted = true

	event := Event{
		Type:    "game_chat",
		ActorID: playerID,
		Payload: map[string]any{
			"message":   message,
			"username":  player.Username,
			"avatarUrl": player.AvatarURL,
		},
	}

	recordAction(state, event)
	SaveState(db.RDB, state)

	return []Event{event}, nil
}

// CheckWinCondition checks if the game should end.
func CheckWinCondition(state *GameState) string {
	if state.AliveSpyCount() == 0 {
		return "agent_win"
	}
	if state.AliveAgentCount() == 0 {
		return "spy_win"
	}
	if state.TurnCount > state.MaxTurns {
		return "draw"
	}
	return ""
}

// --- internal helpers ---

func validateCardUse(_ *GameState, player *PlayerState, cardType string, target *PlayerState) error {
	switch cardType {
	case CardAttack:
		if player.IsJailed {
			return fmt.Errorf("jailed players cannot attack")
		}
		if target.ID == player.ID {
			return fmt.Errorf("cannot attack self")
		}
	case CardHeal:
		// can heal self or others, no restrictions
	case CardJail:
		if target.IsJailed {
			return fmt.Errorf("target already jailed")
		}
		if target.ID == player.ID {
			return fmt.Errorf("cannot jail self")
		}
	case CardInspect:
		if target.IsRevealed || target.IsConfirmedAgent {
			return fmt.Errorf("target identity already confirmed")
		}
		if target.ID == player.ID {
			return fmt.Errorf("cannot inspect self")
		}
	}
	return nil
}

func handleDeath(state *GameState, killer, victim *PlayerState) []Event {
	victim.IsDead = true
	victim.IsRevealed = true

	var events []Event
	events = append(events, Event{
		Type:     "death",
		ActorID:  killer.ID,
		TargetID: victim.ID,
		Payload: map[string]any{
			"role": victim.Role,
		},
	})

	// Kill rewards: +1 HP + draw 1 card
	if killer.HP < killer.MaxHP {
		killer.HP++
	}
	drawEvents := drawCardsForPlayer(state, killer.ID, 1)
	events = append(events, drawEvents...)

	events = append(events, Event{
		Type:    "kill_reward",
		ActorID: killer.ID,
		Payload: map[string]any{
			"hp": killer.HP,
		},
	})

	// Friendly fire penalty: agent kills agent, or hidden spy kills agent
	if victim.Role == "agent" && (killer.Role == "agent" || (killer.Role == "spy" && !killer.IsRevealed)) {
		killer.IsJailed = true
		killer.JailTurnsLeft = 2 // next turn end to release
		events = append(events, Event{
			Type:    "friendly_fire_jail",
			ActorID: killer.ID,
			Payload: map[string]any{
				"reason": "killed_agent",
			},
		})
	}

	return events
}

func endGame(state *GameState, result string) []Event {
	state.Status = "finished"
	state.Result = result
	now := time.Now()

	// Update DB
	db.DB.Model(&models.Game{}).Where("id = ?", state.GameID).Updates(map[string]any{
		"status":      "finished",
		"result":      result,
		"turn_count":  state.TurnCount,
		"finished_at": now,
	})

	// Reset room back to waiting so another game can start in the same room.
	db.DB.Model(&models.Room{}).Where("id = ?", state.RoomID).Update("status", "waiting")

	// 봇 멤버 수집 및 삭제 — kick 이벤트는 game_end broadcast 후 호출자가 처리
	var botIDs []string
	db.DB.Model(&models.RoomMember{}).
		Where("room_id = ? AND bot_id != ''", state.RoomID).
		Pluck("bot_id", &botIDs)

	if len(botIDs) > 0 {
		db.DB.Where("room_id = ? AND bot_id != ''", state.RoomID).Delete(&models.RoomMember{})
		state.PendingBotKicks = botIDs
	}

	// Stop the turn timer (idempotent — safe to call even if already stopped).
	if TM != nil {
		TM.StopTimer(state.GameID)
	}

	event := Event{
		Type: "game_end",
		Payload: map[string]any{
			"result":  result,
			"players": state.Players,
		},
	}

	recordAction(state, event)
	SaveState(db.RDB, state)

	return []Event{event}
}

func advanceTurn(state *GameState) ([]Event, error) {
	currentPlayer := state.FindPlayer(state.CurrentPlayerID())
	if currentPlayer != nil {
		// Clear turn-specific flags
		currentPlayer.HasAttackedThisTurn = false
		currentPlayer.HasChatted = false

		// Handle jail release at end of turn
		if currentPlayer.IsJailed {
			currentPlayer.JailTurnsLeft--
			if currentPlayer.JailTurnsLeft <= 0 {
				currentPlayer.IsJailed = false
				currentPlayer.JailTurnsLeft = 0
			}
		}
	}

	var events []Event
	events = append(events, Event{
		Type:    "end_turn",
		ActorID: state.CurrentPlayerID(),
	})

	// Move to next alive player
	startIndex := state.CurrentTurnIndex
	for {
		state.CurrentTurnIndex = (state.CurrentTurnIndex + 1) % len(state.TurnOrder)

		// Check draw by turn limit
		if result := CheckWinCondition(state); result != "" {
			endEvents := endGame(state, result)
			events = append(events, endEvents...)
			return events, nil
		}

		nextPlayer := state.FindPlayer(state.CurrentPlayerID())
		if nextPlayer != nil && !nextPlayer.IsDead {
			state.TurnCount++
			break
		}

		// Safety: full cycle with no alive player found — force end
		if state.CurrentTurnIndex == startIndex {
			endEvents := endGame(state, "draw")
			events = append(events, endEvents...)
			return events, nil
		}
	}

	// Draw phase for next player
	nextPlayer := state.FindPlayer(state.CurrentPlayerID())
	drawEvents := drawCardsForPlayer(state, nextPlayer.ID, 2)
	events = append(events, drawEvents...)

	state.Phase = "action"
	state.ActionSeq = 0
	state.TurnDeadline = time.Now().Add(2 * time.Minute).Unix()

	events = append(events, Event{
		Type:    "turn_start",
		ActorID: nextPlayer.ID,
		Payload: map[string]any{
			"turnCount":    state.TurnCount,
			"maxTurns":     state.MaxTurns,
			"turnDeadline": state.TurnDeadline,
		},
	})

	for _, e := range events {
		recordAction(state, e)
	}
	SaveState(db.RDB, state)

	return events, nil
}

func drawCardsForPlayer(state *GameState, playerID string, count int) []Event {
	player := state.FindPlayer(playerID)
	if player == nil || player.IsDead {
		return nil
	}

	drawn, newDeck, newDiscard := DrawFromDeck(state.Deck, state.Discard, count)
	state.Deck = newDeck
	state.Discard = newDiscard
	player.Cards = append(player.Cards, drawn...)

	var events []Event
	if len(drawn) > 0 {
		events = append(events, Event{
			Type:    "draw",
			ActorID: playerID,
			Payload: map[string]any{
				"cards": drawn,
				"count": len(drawn),
			},
		})
	}

	// Check overflow
	kept, overflow := CheckOverflow(player.Cards)
	if len(overflow) > 0 {
		player.Cards = kept
		// Overflow cards always go to discard (never banished)
		state.Discard = append(state.Discard, overflow...)
		events = append(events, Event{
			Type:    "overflow_discard",
			ActorID: playerID,
			Payload: map[string]any{
				"discarded": overflow,
			},
		})
	}

	return events
}

func hasCard(player *PlayerState, cardType string) bool {
	return slices.Contains(player.Cards, cardType)
}

func randomAttackTarget(state *GameState, attacker *PlayerState) *PlayerState {
	var candidates []*PlayerState
	for i := range state.Players {
		p := &state.Players[i]
		if p.IsDead || p.ID == attacker.ID {
			continue
		}
		candidates = append(candidates, p)
	}
	if len(candidates) == 0 {
		return nil
	}
	return candidates[rand.Intn(len(candidates))]
}

func recordAction(state *GameState, event Event) {
	// Skip timer_sync events — not needed for replay reconstruction
	if event.Type == "timer_sync" {
		return
	}

	state.ActionSeq++

	// Merge the Card field into the payload so it's preserved in replay data
	payloadMap := map[string]any{}
	if event.Payload != nil {
		if m, ok := event.Payload.(map[string]any); ok {
			maps.Copy(payloadMap, m)
		}
	}
	if event.Card != "" {
		payloadMap["card"] = event.Card
	}

	payload, _ := json.Marshal(payloadMap)

	action := models.GameAction{
		ID:         uuid.New().String(),
		GameID:     state.GameID,
		Turn:       state.TurnCount,
		Seq:        state.ActionSeq,
		ActorID:    event.ActorID,
		ActionType: event.Type,
		TargetID:   event.TargetID,
		Payload:    string(payload),
		CreatedAt:  time.Now(),
	}
	db.DB.Create(&action)
}

// ProcessPendingBotKicks 는 game_end broadcast 후 호출하여 봇 kick 이벤트를 전송한다.
// endGame에서 즉시 kick하면 봇이 game_end보다 kick을 먼저 수신하는 문제를 방지.
func ProcessPendingBotKicks(state *GameState) {
	if len(state.PendingBotKicks) == 0 {
		return
	}
	for _, botID := range state.PendingBotKicks {
		hub.H.PublishBotEvent(botID, map[string]any{
			"type":   "kicked_from_room",
			"roomId": state.RoomID,
		})
	}
	state.PendingBotKicks = nil
}
