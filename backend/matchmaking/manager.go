package matchmaking

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/game"
	"github.com/epsilondelta/shot/hub"
	"github.com/epsilondelta/shot/models"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// MatchmakingManager는 매치메이킹 큐를 주기적으로 폴링하여 매치를 생성하는 매니저이다.
type MatchmakingManager struct {
	rdb          *redis.Client
	stopCh       chan struct{}
	tickInterval time.Duration
	queueTimeout time.Duration
}

// MM은 전역 매치메이킹 매니저 인스턴스이다.
var MM *MatchmakingManager

// NewManager는 새로운 MatchmakingManager를 생성한다.
func NewManager(rdb *redis.Client) *MatchmakingManager {
	return &MatchmakingManager{
		rdb:          rdb,
		stopCh:       make(chan struct{}),
		tickInterval: 2 * time.Second,
		queueTimeout: 120 * time.Second,
	}
}

// Start는 백그라운드 고루틴으로 매치메이킹 루프를 시작한다.
func (m *MatchmakingManager) Start() {
	go func() {
		ticker := time.NewTicker(m.tickInterval)
		defer ticker.Stop()

		log.Printf("matchmaking: manager started (tick=%s, timeout=%s)", m.tickInterval, m.queueTimeout)

		for {
			select {
			case <-m.stopCh:
				log.Printf("matchmaking: manager stopped")
				return
			case <-ticker.C:
				m.tick()
			}
		}
	}()
}

// Stop은 매치메이킹 루프를 종료한다.
func (m *MatchmakingManager) Stop() {
	close(m.stopCh)
}

// tick은 큐 상태를 확인하고 조건이 충족되면 매치를 생성한다.
func (m *MatchmakingManager) tick() {
	queueSize, err := GetQueueSize(m.rdb)
	if err != nil {
		log.Printf("matchmaking: failed to get queue size: %v", err)
		return
	}

	if queueSize == 0 {
		return
	}

	if queueSize >= 6 {
		// 6명 이상이면 최대 9명까지 팝
		popCount := int(queueSize)
		if popCount > 9 {
			popCount = 9
		}

		playerIDs, err := PopPlayers(m.rdb, popCount)
		if err != nil {
			log.Printf("matchmaking: failed to pop players: %v", err)
			return
		}
		if len(playerIDs) == 0 {
			return
		}

		log.Printf("matchmaking: creating match with %d players", len(playerIDs))
		if err := m.createMatch(playerIDs); err != nil {
			log.Printf("matchmaking: failed to create match: %v", err)
		}
		return
	}

	// 1~5명: 가장 오래 대기한 플레이어의 시간 확인
	oldestTime, err := GetOldestJoinTime(m.rdb)
	if err != nil {
		log.Printf("matchmaking: failed to get oldest join time: %v", err)
		return
	}

	elapsed := time.Since(time.Unix(int64(oldestTime), 0))
	if elapsed > m.queueTimeout {
		// 타임아웃 초과: 전원 팝 + 룰봇으로 채움
		playerIDs, err := PopPlayers(m.rdb, int(queueSize))
		if err != nil {
			log.Printf("matchmaking: failed to pop players: %v", err)
			return
		}
		if len(playerIDs) == 0 {
			return
		}

		log.Printf("matchmaking: timeout exceeded, creating match with %d players + rulebots", len(playerIDs))
		if err := m.createMatch(playerIDs); err != nil {
			log.Printf("matchmaking: failed to create match: %v", err)
		}
	}
	// 아직 타임아웃 이전이면 대기
}

// createMatch는 플레이어 목록으로 방을 생성하고 게임을 시작한다.
func (m *MatchmakingManager) createMatch(playerIDs []string) error {
	roomID := uuid.New().String()

	room := models.Room{
		ID:          roomID,
		Name:        "Quick Match",
		HostID:      playerIDs[0],
		Status:      "waiting",
		MaxPlayers:  12,
		IsQuickMatch: true,
		PlayerCount: len(playerIDs),
	}
	if err := db.DB.Create(&room).Error; err != nil {
		RequeuePlayers(m.rdb, playerIDs)
		return fmt.Errorf("failed to create room: %w", err)
	}

	// 각 인간 플레이어의 RoomMember 생성
	now := time.Now()
	for _, userID := range playerIDs {
		member := models.RoomMember{
			RoomID:   roomID,
			UserID:   userID,
			JoinedAt: now,
		}
		if err := db.DB.Create(&member).Error; err != nil {
			m.rollback(playerIDs, roomID)
			return fmt.Errorf("failed to create room member: %w", err)
		}
	}

	// 룰봇 수 계산: 최소 6명이 되도록 채움
	ruleBotCount := 6 - len(playerIDs)
	if ruleBotCount < 0 {
		ruleBotCount = 0
	}

	for i := 0; i < ruleBotCount; i++ {
		botID := fmt.Sprintf("rulebot_%s", uuid.New().String())
		botName := fmt.Sprintf("Bot %d", i+1)

		botMember := models.RoomMember{
			RoomID:      roomID,
			UserID:      playerIDs[0], // 호스트를 봇 소유자로 설정
			BotID:       botID,
			RuleBotName: botName,
			JoinedAt:    now,
		}
		if err := db.DB.Create(&botMember).Error; err != nil {
			m.rollback(playerIDs, roomID)
			return fmt.Errorf("failed to create rulebot member: %w", err)
		}
		room.BotCount++
	}

	// 방 상태를 playing으로 업데이트
	room.PlayerCount = len(playerIDs) + ruleBotCount
	if err := db.DB.Model(&models.Room{}).Where("id = ?", roomID).Updates(map[string]any{
		"status":       "playing",
		"player_count": room.PlayerCount,
		"bot_count":    room.BotCount,
	}).Error; err != nil {
		m.rollback(playerIDs, roomID)
		return fmt.Errorf("failed to update room status: %w", err)
	}

	// 게임 시작
	state, events, err := game.StartGame(roomID)
	if err != nil {
		m.rollback(playerIDs, roomID)
		return fmt.Errorf("failed to start game: %w", err)
	}

	// game_start 브로드캐스트
	hub.H.BroadcastJSON(roomID, map[string]any{
		"type":   "game_start",
		"gameId": state.GameID,
	})

	// 초기 이벤트 브로드캐스트
	for _, e := range events {
		hub.H.BroadcastJSON(roomID, e)
	}

	// 첫 턴 타이머 또는 봇 턴 시작
	firstPlayer := state.FindPlayer(state.CurrentPlayerID())
	if firstPlayer != nil && firstPlayer.IsRuleBot {
		game.ScheduleRuleBotTurn(state, roomID, 1500*time.Millisecond)
	} else if firstPlayer != nil && firstPlayer.IsLLMPlayer {
		game.ScheduleLLMPlayerTurn(state, roomID, 1500*time.Millisecond)
	} else {
		game.TM.StartTimer(state.GameID, roomID, state.TurnDeadline)
	}

	// 각 플레이어에게 match_found 이벤트 발행
	ctx := context.Background()
	for _, userID := range playerIDs {
		payload, _ := json.Marshal(map[string]string{
			"type":   "match_found",
			"roomId": roomID,
			"gameId": state.GameID,
		})
		channel := fmt.Sprintf("matchmaking:events:%s", userID)
		if err := m.rdb.Publish(ctx, channel, payload).Err(); err != nil {
			log.Printf("matchmaking: failed to publish match_found to %s: %v", userID, err)
		}
	}

	log.Printf("matchmaking: match created room=%s game=%s players=%d bots=%d", roomID, state.GameID, len(playerIDs), ruleBotCount)
	return nil
}

// rollback은 매치 생성 실패 시 플레이어를 큐에 재등록하고 방을 삭제한다.
func (m *MatchmakingManager) rollback(playerIDs []string, roomID string) {
	if err := RequeuePlayers(m.rdb, playerIDs); err != nil {
		log.Printf("matchmaking: failed to requeue players: %v", err)
	}
	db.DB.Where("room_id = ?", roomID).Delete(&models.RoomMember{})
	db.DB.Where("id = ?", roomID).Delete(&models.Room{})
}
