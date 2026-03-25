package game

import (
	"log"
	"math/rand"
	"time"

	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/hub"
)

// IsRuleBotID checks whether the given ID belongs to a server-side rule-based bot.
func IsRuleBotID(id string) bool {
	return len(id) > 8 && id[:8] == "rulebot_"
}

// RunRuleBotTurn executes the current player's turn if they are a rule-based bot.
// Returns events produced by the bot's actions plus the subsequent advanceTurn events.
// The caller must hold GL for the game.
func RunRuleBotTurn(state *GameState) []Event {
	player := state.FindPlayer(state.CurrentPlayerID())
	if player == nil || player.IsDead || !player.IsRuleBot {
		return nil
	}

	var allEvents []Event

	// Small delay so clients can see the turn_start before bot acts
	// (not blocking — the events are batched and sent after return)

	// Play cards until we must end turn
	for state.Status == "playing" && state.CurrentPlayerID() == player.ID {
		card, targetID := chooseBotAction(state, player)
		if card == "" {
			break
		}

		events, err := PlayCard(state, player.ID, card, targetID)
		if err != nil {
			break
		}
		allEvents = append(allEvents, events...)

		if state.Status != "playing" {
			return allEvents
		}
	}

	// End turn
	if state.Status == "playing" && state.CurrentPlayerID() == player.ID {
		turnEvents, err := EndTurn(state, player.ID)
		if err == nil {
			allEvents = append(allEvents, turnEvents...)
		}
	}

	return allEvents
}

// chooseBotAction decides which card to play and on which target.
func chooseBotAction(state *GameState, bot *PlayerState) (cardType, targetID string) {
	// Must attack if not jailed and has attack cards and hasn't attacked yet
	mustAttack := !bot.HasAttackedThisTurn && !bot.IsJailed && hasCard(bot, CardAttack)

	// 1. If spy and not revealed, consider revealing when outnumbered
	if bot.Role == "spy" && !bot.IsRevealed {
		aliveSpies := state.AliveSpyCount()
		aliveAgents := state.AliveAgentCount()
		if aliveSpies <= aliveAgents/3 && len(bot.Cards) <= 2 {
			// Will reveal via separate mechanism, not a card
			// Skip for now — reveal is handled separately
		}
	}

	// 2. Use inspect on unknown players (agent strategy)
	if bot.Role == "agent" && hasCard(bot, CardInspect) {
		if target := findInspectTarget(state, bot); target != nil {
			return CardInspect, target.ID
		}
	}

	// 3. Attack revealed spies first
	if hasCard(bot, CardAttack) && !bot.IsJailed {
		if target := findRevealedSpy(state, bot); target != nil {
			return CardAttack, target.ID
		}
	}

	// 4. Heal self if HP low
	if bot.HP <= 1 && bot.HP < bot.MaxHP && hasCard(bot, CardHeal) {
		return CardHeal, bot.ID
	}

	// 5. Jail a threatening player (revealed spy for agents, or strong agent for spies)
	if hasCard(bot, CardJail) {
		if target := findJailTarget(state, bot); target != nil {
			return CardJail, target.ID
		}
	}

	// 6. Must attack — pick a smart target
	if mustAttack {
		if target := pickAttackTarget(state, bot); target != nil {
			return CardAttack, target.ID
		}
	}

	// 7. Heal damaged allies or self
	if hasCard(bot, CardHeal) && bot.HP < bot.MaxHP {
		return CardHeal, bot.ID
	}

	// No useful action left
	return "", ""
}

// findInspectTarget finds an alive player whose identity is unknown.
func findInspectTarget(state *GameState, bot *PlayerState) *PlayerState {
	var candidates []*PlayerState
	for i := range state.Players {
		p := &state.Players[i]
		if p.IsDead || p.ID == bot.ID || p.IsRevealed || p.IsConfirmedAgent {
			continue
		}
		candidates = append(candidates, p)
	}
	if len(candidates) == 0 {
		return nil
	}
	return candidates[rand.Intn(len(candidates))]
}

// findRevealedSpy finds an alive, revealed spy to attack.
func findRevealedSpy(state *GameState, bot *PlayerState) *PlayerState {
	var candidates []*PlayerState
	for i := range state.Players {
		p := &state.Players[i]
		if p.IsDead || p.ID == bot.ID || !p.IsRevealed || p.Role != "spy" {
			continue
		}
		candidates = append(candidates, p)
	}
	if len(candidates) == 0 {
		return nil
	}
	// Prefer lowest HP
	best := candidates[0]
	for _, c := range candidates[1:] {
		if c.HP < best.HP {
			best = c
		}
	}
	return best
}

// findJailTarget finds a good target to jail.
func findJailTarget(state *GameState, bot *PlayerState) *PlayerState {
	for i := range state.Players {
		p := &state.Players[i]
		if p.IsDead || p.ID == bot.ID || p.IsJailed {
			continue
		}
		if bot.Role == "agent" && p.IsRevealed && p.Role == "spy" {
			return p // jail revealed spy
		}
		if bot.Role == "spy" && p.IsConfirmedAgent {
			return p // jail confirmed agent
		}
	}
	return nil
}

// pickAttackTarget selects an attack target based on the bot's role.
func pickAttackTarget(state *GameState, bot *PlayerState) *PlayerState {
	var preferred, fallback []*PlayerState

	for i := range state.Players {
		p := &state.Players[i]
		if p.IsDead || p.ID == bot.ID {
			continue
		}

		if bot.Role == "agent" {
			// Prefer attacking revealed spies, avoid confirmed agents
			if p.IsRevealed && p.Role == "spy" {
				preferred = append(preferred, p)
			} else if !p.IsConfirmedAgent {
				fallback = append(fallback, p)
			}
		} else {
			// Spy: prefer attacking non-spy players
			if p.Role != "spy" {
				preferred = append(preferred, p)
			} else if p.ID != bot.ID {
				fallback = append(fallback, p)
			}
		}
	}

	if len(preferred) > 0 {
		return preferred[rand.Intn(len(preferred))]
	}
	if len(fallback) > 0 {
		return fallback[rand.Intn(len(fallback))]
	}
	return randomAttackTarget(state, bot)
}

// ScheduleRuleBotTurn schedules a rule-based bot's turn with a small delay
// to give clients time to render the turn_start event.
func ScheduleRuleBotTurn(state *GameState, roomID string, delay time.Duration) {
	gameID := state.GameID
	go runRuleBotLoop(gameID, roomID, delay)
}

// runRuleBotLoop runs rule-based bot turns in a loop with delays between actions.
// Each action acquires the game lock independently to avoid blocking other operations.
func runRuleBotLoop(gameID, roomID string, initialDelay time.Duration) {
	if initialDelay > 0 {
		time.Sleep(initialDelay)
	}

	for {
		// 1. Load state and play one card
		action := func() (done bool) {
			GL.Lock(gameID)
			defer GL.Unlock(gameID)

			st, err := LoadState(db.RDB, gameID)
			if err != nil || st.Status != "playing" {
				return true
			}

			player := st.FindPlayer(st.CurrentPlayerID())
			if player == nil || !player.IsRuleBot || player.IsDead {
				// 현재 플레이어가 룰봇이 아니면 타이머 시작
				if player != nil && !player.IsRuleBot {
					TM.StartTimer(gameID, roomID, st.TurnDeadline)
				}
				return true
			}

			// 카드 선택
			card, targetID := chooseBotAction(st, player)
			if card == "" {
				// 카드 없음 → 턴 종료
				turnEvents, err := EndTurn(st, player.ID)
				if err == nil {
					for _, e := range turnEvents {
						hub.H.BroadcastJSON(roomID, e)
					}
				}
				ProcessPendingBotKicks(st)

				if st.Status != "playing" {
					log.Printf("[rulebot] game %s: game finished", gameID)
					return true
				}
				// 다음 플레이어가 룰봇이면 계속, 아니면 종료
				next := st.FindPlayer(st.CurrentPlayerID())
				if next == nil || !next.IsRuleBot || next.IsDead {
					if next != nil {
						TM.StartTimer(gameID, roomID, st.TurnDeadline)
					}
					return true
				}
				return false // 다음 룰봇 턴 계속
			}

			// 카드 플레이
			events, err := PlayCard(st, player.ID, card, targetID)
			if err != nil {
				return true
			}
			for _, e := range events {
				hub.H.BroadcastJSON(roomID, e)
			}
			ProcessPendingBotKicks(st)

			if st.Status != "playing" {
				log.Printf("[rulebot] game %s: game finished", gameID)
				return true
			}
			return false // 다음 액션 계속
		}()

		if action {
			return
		}

		// 액션 사이 1초 딜레이 (클라이언트 렌더링 시간)
		time.Sleep(1 * time.Second)
	}
}
