package llm

import (
	"encoding/json"
	"fmt"
	"strings"
)

// GameContext 는 LLM에 전달할 게임 상태 정보이다.
type GameContext struct {
	MyID             string        `json:"myId"`
	MyRole           string        `json:"myRole"`
	MyHP             int           `json:"myHp"`
	MyMaxHP          int           `json:"myMaxHp"`
	MyCards          []string      `json:"myCards"`
	IsJailed         bool          `json:"isJailed"`
	IsRevealed       bool          `json:"isRevealed"`
	HasAttackedThisTurn bool       `json:"hasAttackedThisTurn"`
	HasChatted       bool          `json:"hasChatted"`
	TurnCount        int           `json:"turnCount"`
	MaxTurns         int           `json:"maxTurns"`
	Players          []PlayerInfo  `json:"players"`
}

// PlayerInfo 는 다른 플레이어의 공개 정보이다.
type PlayerInfo struct {
	ID              string `json:"id"`
	Username        string `json:"username"`
	HP              int    `json:"hp"`
	MaxHP           int    `json:"maxHp"`
	IsDead          bool   `json:"isDead"`
	IsJailed        bool   `json:"isJailed"`
	IsRevealed      bool   `json:"isRevealed"`
	IsConfirmedAgent bool  `json:"isConfirmedAgent"`
	RevealedRole    string `json:"revealedRole,omitempty"` // 공개된 역할 (있는 경우)
	CardCount       int    `json:"cardCount"`
}

// LLMAction 은 LLM이 반환하는 게임 액션이다.
type LLMAction struct {
	Type     string `json:"type"`               // "play_card", "end_turn", "reveal", "chat"
	Card     string `json:"card,omitempty"`      // "attack", "heal", "jail", "inspect"
	TargetID string `json:"targetId,omitempty"`
	Message  string `json:"message,omitempty"`   // chat 메시지
}

// DefaultSystemPrompt 는 기본 시스템 프롬프트이다.
const DefaultSystemPrompt = `You are an AI player in a social deduction card game called SHOT!

## Game Rules
- Players are divided into Agents and Spies. Agents try to eliminate Spies, Spies try to eliminate Agents.
- Each turn you draw 2 cards and must play at least 1 attack card (unless jailed or no attack cards).
- Card types: attack (deal 1 damage), heal (restore 1 HP), jail (prevent target from attacking for 1 turn), inspect (reveal target's role).
- HP: 3 max. Death at 0 HP.
- Killing an agent as agent = friendly fire (jailed for 2 turns).
- Spies can reveal their identity to draw 2 extra cards and get 1 additional chat.
- 1 chat message per turn (max 100 characters).
- Game ends when all spies or all agents are eliminated, or after max turns (draw).

## Win Conditions
- Agents win: all spies eliminated
- Spies win: all agents eliminated
- Draw: max turns reached

## Your Task
Analyze the game state and decide your action. Respond with a JSON array of actions to take in order.
Each action: {"type": "play_card"|"end_turn"|"reveal"|"chat", "card": "attack"|"heal"|"jail"|"inspect", "targetId": "player_id", "message": "chat text"}

## Strategy Tips
- As Agent: inspect unknown players, attack revealed spies, heal wounded allies
- As Spy: blend in, attack agents strategically, reveal when advantageous
- Use chat to communicate, deceive, or coordinate

IMPORTANT: Respond ONLY with a valid JSON array. No markdown, no explanation.`

// BuildUserPrompt 는 게임 상태를 기반으로 유저 프롬프트를 생성한다.
func BuildUserPrompt(ctx GameContext) string {
	playersJSON, _ := json.MarshalIndent(ctx.Players, "", "  ")

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("## Current Game State (Turn %d/%d)\n\n", ctx.TurnCount, ctx.MaxTurns))
	sb.WriteString(fmt.Sprintf("**Your ID**: %s\n", ctx.MyID))
	sb.WriteString(fmt.Sprintf("**Your Role**: %s\n", ctx.MyRole))
	sb.WriteString(fmt.Sprintf("**Your HP**: %d/%d\n", ctx.MyHP, ctx.MyMaxHP))
	sb.WriteString(fmt.Sprintf("**Your Cards**: %s\n", strings.Join(ctx.MyCards, ", ")))
	sb.WriteString(fmt.Sprintf("**Jailed**: %v\n", ctx.IsJailed))
	sb.WriteString(fmt.Sprintf("**Already Revealed**: %v\n", ctx.IsRevealed))
	sb.WriteString(fmt.Sprintf("**Already Attacked This Turn**: %v\n", ctx.HasAttackedThisTurn))
	sb.WriteString(fmt.Sprintf("**Already Chatted This Turn**: %v\n", ctx.HasChatted))
	sb.WriteString(fmt.Sprintf("\n## Other Players\n```json\n%s\n```\n", string(playersJSON)))
	sb.WriteString("\n## Valid Actions\n")

	// 유효한 액션 힌트
	if !ctx.HasChatted {
		sb.WriteString("- {\"type\": \"chat\", \"message\": \"...\"} — Send a chat message (max 100 chars)\n")
	}
	if !ctx.IsRevealed && ctx.MyRole == "spy" {
		sb.WriteString("- {\"type\": \"reveal\"} — Reveal your spy identity (+2 cards, +1 chat)\n")
	}
	for _, card := range uniqueCards(ctx.MyCards) {
		switch card {
		case "attack":
			if !ctx.IsJailed {
				sb.WriteString("- {\"type\": \"play_card\", \"card\": \"attack\", \"targetId\": \"<alive player id>\"}\n")
			}
		case "heal":
			sb.WriteString("- {\"type\": \"play_card\", \"card\": \"heal\", \"targetId\": \"<any alive player id including yourself>\"}\n")
		case "jail":
			sb.WriteString("- {\"type\": \"play_card\", \"card\": \"jail\", \"targetId\": \"<alive unjailed player id>\"}\n")
		case "inspect":
			sb.WriteString("- {\"type\": \"play_card\", \"card\": \"inspect\", \"targetId\": \"<alive unknown player id>\"}\n")
		}
	}
	sb.WriteString("- {\"type\": \"end_turn\"} — End your turn (must attack first if able)\n")
	sb.WriteString("\nRespond with a JSON array of actions in order. Example: [{\"type\":\"chat\",\"message\":\"Hello!\"},{\"type\":\"play_card\",\"card\":\"attack\",\"targetId\":\"abc\"},...,{\"type\":\"end_turn\"}]")

	return sb.String()
}

// ParseActions 는 LLM 응답을 LLMAction 배열로 파싱한다.
func ParseActions(response string) ([]LLMAction, error) {
	// JSON 배열 추출 (마크다운 코드블록 처리)
	cleaned := strings.TrimSpace(response)
	if idx := strings.Index(cleaned, "["); idx >= 0 {
		if end := strings.LastIndex(cleaned, "]"); end > idx {
			cleaned = cleaned[idx : end+1]
		}
	}

	var actions []LLMAction
	if err := json.Unmarshal([]byte(cleaned), &actions); err != nil {
		// 단일 액션 시도
		var single LLMAction
		if err2 := json.Unmarshal([]byte(cleaned), &single); err2 != nil {
			return nil, fmt.Errorf("JSON 파싱 실패: %w", err)
		}
		actions = []LLMAction{single}
	}

	return actions, nil
}

func uniqueCards(cards []string) []string {
	seen := map[string]bool{}
	var result []string
	for _, c := range cards {
		if !seen[c] {
			seen[c] = true
			result = append(result, c)
		}
	}
	return result
}
