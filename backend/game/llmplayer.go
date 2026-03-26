package game

import (
	"log"
	"time"

	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/hub"
	"github.com/epsilondelta/shot/llm"
	"github.com/epsilondelta/shot/models"
)

const llmPlayerPrefix = "llm_"

// IsLLMPlayerID 는 주어진 ID가 LLM Player인지 확인한다.
func IsLLMPlayerID(id string) bool {
	return len(id) > 4 && id[:4] == llmPlayerPrefix
}

// ScheduleLLMPlayerTurn 은 LLM Player의 턴을 비동기로 스케줄링한다.
func ScheduleLLMPlayerTurn(state *GameState, roomID string, delay time.Duration) {
	gameID := state.GameID
	go runLLMPlayerLoop(gameID, roomID, delay)
}

// buildGameContext 는 LLM에 전달할 게임 컨텍스트를 생성한다.
func buildGameContext(state *GameState, player *PlayerState) llm.GameContext {
	var players []llm.PlayerInfo
	for _, p := range state.Players {
		if p.ID == player.ID {
			continue
		}
		info := llm.PlayerInfo{
			ID:               p.ID,
			Username:         p.Username,
			HP:               p.HP,
			MaxHP:            p.MaxHP,
			IsDead:           p.IsDead,
			IsJailed:         p.IsJailed,
			IsRevealed:       p.IsRevealed,
			IsConfirmedAgent: p.IsConfirmedAgent,
			CardCount:        len(p.Cards),
		}
		if p.IsRevealed {
			info.RevealedRole = p.Role
		}
		players = append(players, info)
	}

	return llm.GameContext{
		MyID:                player.ID,
		MyRole:              player.Role,
		MyHP:                player.HP,
		MyMaxHP:             player.MaxHP,
		MyCards:             player.Cards,
		IsJailed:            player.IsJailed,
		IsRevealed:          player.IsRevealed,
		HasAttackedThisTurn: player.HasAttackedThisTurn,
		HasChatted:          player.HasChatted,
		TurnCount:           state.TurnCount,
		MaxTurns:            state.MaxTurns,
		Players:             players,
	}
}

// getLLMConfig 는 DB에서 LLM 설정을 가져온다.
func getLLMConfig(providedModelID string) (provider, modelID, apiKey, baseURL, systemPrompt string, err error) {
	var pm models.ProvidedModel
	if e := db.DB.First(&pm, "id = ?", providedModelID).Error; e != nil {
		return "", "", "", "", "", e
	}

	var key models.LLMProviderKey
	if e := db.DB.Where("provider = ?", pm.Provider).First(&key).Error; e != nil {
		return "", "", "", "", "", e
	}

	sp := pm.SystemPrompt
	if sp == "" {
		sp = llm.DefaultSystemPrompt
	}

	return pm.Provider, pm.ModelID, key.APIKey, key.BaseURL, sp, nil
}

// runLLMPlayerLoop 은 LLM Player의 턴을 실행하는 루프이다.
func runLLMPlayerLoop(gameID, _ string, initialDelay time.Duration) {
	if initialDelay > 0 {
		time.Sleep(initialDelay)
	}

	for {
		done := func() bool {
			GL.Lock(gameID)
			defer GL.Unlock(gameID)

			st, err := LoadState(db.RDB, gameID)
			if err != nil || st.Status != "playing" {
				return true
			}

			rid := st.RoomID
			player := st.FindPlayer(st.CurrentPlayerID())
			if player == nil || !player.IsLLMPlayer || player.IsDead {
				if player != nil && !player.IsLLMPlayer {
					TM.StartTimer(gameID, rid, st.TurnDeadline)
				}
				return true
			}

			// LLM 호출을 위해 lock 해제
			providedModelID := player.ProvidedModelID
			userPrompt := player.UserPrompt
			ctx := buildGameContext(st, player)
			playerID := player.ID

			GL.Unlock(gameID)

			// LLM API 호출 (lock 없이)
			actions := callLLMForActions(providedModelID, userPrompt, ctx, gameID, playerID)

			GL.Lock(gameID)

			// 상태 재로드 (다른 동작이 있었을 수 있음)
			st, err = LoadState(db.RDB, gameID)
			if err != nil || st.Status != "playing" {
				return true
			}
			player = st.FindPlayer(st.CurrentPlayerID())
			if player == nil || player.ID != playerID || player.IsDead {
				return true
			}
			rid = st.RoomID

			// 액션 실행
			executedAny := false
			for _, action := range actions {
				if st.Status != "playing" || st.CurrentPlayerID() != playerID {
					break
				}
				player = st.FindPlayer(playerID)
				if player == nil || player.IsDead {
					break
				}

				switch action.Type {
				case "chat":
					if !player.HasChatted && action.Message != "" {
						events, err := SendChat(st, playerID, action.Message)
						if err == nil {
							for _, e := range events {
								hub.H.BroadcastJSONToAll(rid, e)
							}
							executedAny = true
						}
					}

				case "reveal":
					if player.Role == "spy" && !player.IsRevealed {
						events, err := RevealIdentity(st, playerID)
						if err == nil {
							for _, e := range events {
								hub.H.BroadcastJSONToAll(rid, e)
							}
							executedAny = true
						}
					}

				case "play_card":
					if action.Card != "" && action.TargetID != "" {
						events, err := PlayCard(st, playerID, action.Card, action.TargetID)
						if err == nil {
							for _, e := range events {
								hub.H.BroadcastJSONToAll(rid, e)
							}
							ProcessPendingBotKicks(st)
							executedAny = true
						}
					}

				case "end_turn":
					events, err := EndTurn(st, playerID)
					if err == nil {
						for _, e := range events {
							hub.H.BroadcastJSONToAll(rid, e)
						}
						ProcessPendingBotKicks(st)

						if st.Status != "playing" {
							return true
						}
						next := st.FindPlayer(st.CurrentPlayerID())
						if next != nil && !next.IsLLMPlayer && !next.IsRuleBot {
							TM.StartTimer(gameID, rid, st.TurnDeadline)
							return true
						}
						if next != nil && next.IsRuleBot {
							ScheduleRuleBotTurn(st, rid, 1500*time.Millisecond)
							return true
						}
						// 다음도 LLM Player이면 계속 루프
						return false
					}
				}

				if st.Status != "playing" {
					return true
				}
			}

			// LLM이 end_turn을 반환하지 않은 경우 강제 종료
			if st.Status == "playing" && st.CurrentPlayerID() == playerID {
				// 공격 카드가 있으면 필수 공격 후 end_turn
				if !player.HasAttackedThisTurn && !player.IsJailed && hasCard(player, CardAttack) {
					target := randomAttackTarget(st, player)
					if target != nil {
						events, _ := PlayCard(st, playerID, CardAttack, target.ID)
						for _, e := range events {
							hub.H.BroadcastJSONToAll(rid, e)
						}
						ProcessPendingBotKicks(st)
					}
				}
				if st.Status == "playing" && st.CurrentPlayerID() == playerID {
					events, err := EndTurn(st, playerID)
					if err == nil {
						for _, e := range events {
							hub.H.BroadcastJSONToAll(rid, e)
						}
						ProcessPendingBotKicks(st)
					}
				}

				if st.Status != "playing" {
					return true
				}
				next := st.FindPlayer(st.CurrentPlayerID())
				if next != nil && !next.IsLLMPlayer && !next.IsRuleBot {
					TM.StartTimer(gameID, rid, st.TurnDeadline)
					return true
				}
				if next != nil && next.IsRuleBot {
					ScheduleRuleBotTurn(st, rid, 1500*time.Millisecond)
					return true
				}
				return false
			}

			if !executedAny {
				return true
			}
			return false
		}()

		if done {
			return
		}

		time.Sleep(1 * time.Second)
	}
}

// callLLMForActions 는 LLM을 호출하여 액션 목록을 반환한다.
// 실패 시 기본 폴백 액션을 반환한다.
func callLLMForActions(providedModelID, customPrompt string, ctx llm.GameContext, gameID, playerID string) []llm.LLMAction {
	provider, modelID, apiKey, baseURL, systemPrompt, err := getLLMConfig(providedModelID)
	if err != nil {
		log.Printf("[llm-player] game %s player %s: 설정 로드 실패: %v", gameID, playerID, err)
		return fallbackActions(ctx)
	}

	if customPrompt != "" {
		systemPrompt += "\n\n## Personality\n" + customPrompt
	}

	userPrompt := llm.BuildUserPrompt(ctx)

	resp, err := llm.CallLLM(provider, modelID, apiKey, baseURL, systemPrompt, userPrompt, 3)
	if err != nil {
		log.Printf("[llm-player] game %s player %s: LLM 호출 실패: %v", gameID, playerID, err)
		// 환불 플래그 기록
		markRefund(gameID, playerID, providedModelID)
		return fallbackActions(ctx)
	}

	actions, err := llm.ParseActions(resp.Content)
	if err != nil {
		log.Printf("[llm-player] game %s player %s: 응답 파싱 실패: %v (응답: %s)", gameID, playerID, err, resp.Content)
		return fallbackActions(ctx)
	}

	return actions
}

// fallbackActions 는 LLM 실패 시 기본 액션을 반환한다.
func fallbackActions(ctx llm.GameContext) []llm.LLMAction {
	var actions []llm.LLMAction
	// end_turn만 반환 (필수 공격은 runLLMPlayerLoop에서 처리)
	actions = append(actions, llm.LLMAction{Type: "end_turn"})
	return actions
}

// markRefund 는 LLM 응답 실패 시 환불 대상으로 기록한다.
func markRefund(gameID, playerID, providedModelID string) {
	var pm models.ProvidedModel
	if err := db.DB.First(&pm, "id = ?", providedModelID).Error; err != nil {
		return
	}

	// 게임에서 이 LLM을 초대한 유저 찾기
	var gp models.GamePlayer
	if err := db.DB.Where("game_id = ? AND bot_id = ?", gameID, playerID).First(&gp).Error; err != nil {
		return
	}

	// 크레딧 환불
	db.DB.Model(&models.User{}).Where("id = ?", gp.UserID).
		Update("credits", db.DB.Raw("credits + ?", pm.CreditCost))

	tx := models.CreditTransaction{
		UserID:      gp.UserID,
		Amount:      pm.CreditCost,
		Type:        "refund_llm",
		Description: "LLM 응답 실패로 인한 환불: " + pm.Name,
	}
	db.DB.Create(&tx)
	log.Printf("[llm-player] game %s: %s 크레딧 %d 환불 (player %s)", gameID, pm.Name, pm.CreditCost, playerID)
}
