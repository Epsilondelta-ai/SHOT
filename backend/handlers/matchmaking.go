package handlers

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/matchmaking"
	"github.com/epsilondelta/shot/models"
	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

// broadcastQueueUpdate는 큐에 있는 모든 멤버에게 queue_update 이벤트를 Redis Pub/Sub으로 전송한다.
func broadcastQueueUpdate(rdb *redis.Client) {
	members, _ := matchmaking.GetQueueMembers(rdb)
	size := len(members)
	for i, userID := range members {
		event, _ := json.Marshal(fiber.Map{
			"type":      "queue_update",
			"queueSize": size,
			"position":  i,
		})
		rdb.Publish(context.Background(), "matchmaking:events:"+userID, string(event))
	}
}

// JoinMatchmaking POST /api/matchmaking/join
func JoinMatchmaking(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	// 이미 큐에 있는지 확인
	inQueue, err := matchmaking.IsInQueue(db.RDB, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to check queue"})
	}
	if inQueue {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "already in queue"})
	}

	// 이미 활성 방에 있는지 확인
	var existingMember models.RoomMember
	result := db.DB.
		Joins("JOIN rooms ON rooms.id = room_members.room_id").
		Where("rooms.status != ? AND room_members.user_id = ? AND room_members.bot_id = ''", "finished", userID).
		Limit(1).
		Find(&existingMember)
	if result.Error == nil && existingMember.RoomID != "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "already in a room"})
	}

	// 큐에 추가
	if err := matchmaking.JoinQueue(db.RDB, userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to join queue"})
	}

	// 큐 크기 및 위치 조회
	queueSize, err := matchmaking.GetQueueSize(db.RDB)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get queue size"})
	}
	position, err := matchmaking.GetQueuePosition(db.RDB, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get queue position"})
	}

	// 큐 멤버 전체에 업데이트 브로드캐스트
	go broadcastQueueUpdate(db.RDB)

	return c.JSON(fiber.Map{
		"ok":        true,
		"queueSize": queueSize,
		"position":  position,
	})
}

// LeaveMatchmaking POST /api/matchmaking/leave
func LeaveMatchmaking(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	if err := matchmaking.LeaveQueue(db.RDB, userID); err != nil {
		if strings.Contains(err.Error(), "matched") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "already matched"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to leave queue"})
	}

	// 남은 멤버에게 브로드캐스트
	go broadcastQueueUpdate(db.RDB)

	return c.JSON(fiber.Map{"ok": true})
}

// MatchmakingStatus GET /api/matchmaking/status
func MatchmakingStatus(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	queueSize, err := matchmaking.GetQueueSize(db.RDB)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get queue size"})
	}

	inQueue, err := matchmaking.IsInQueue(db.RDB, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to check queue"})
	}

	position := int64(-1)
	if inQueue {
		position, err = matchmaking.GetQueuePosition(db.RDB, userID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get queue position"})
		}
	}

	return c.JSON(fiber.Map{
		"queueSize": queueSize,
		"inQueue":   inQueue,
		"position":  position,
	})
}
