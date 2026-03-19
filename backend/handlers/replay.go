package handlers

import (
	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/models"
	"github.com/gofiber/fiber/v2"
)

// ListReplays GET /api/replays (public, no auth required)
func ListReplays(c *fiber.Ctx) error {
	var games []models.Game
	db.DB.Where("status = ?", "finished").Order("finished_at DESC").Limit(50).Find(&games)

	result := make([]fiber.Map, len(games))
	for i, g := range games {
		var players []models.GamePlayer
		db.DB.Where("game_id = ?", g.ID).Find(&players)

		playerList := make([]fiber.Map, len(players))
		for j, p := range players {
			playerList[j] = fiber.Map{
				"username":  p.Username,
				"avatarUrl": p.AvatarURL,
				"role":      p.Role,
			}
		}

		result[i] = fiber.Map{
			"id":          g.ID,
			"result":      g.Result,
			"playerCount": g.PlayerCount,
			"turnCount":   g.TurnCount,
			"finishedAt":  g.FinishedAt,
			"players":     playerList,
		}
	}

	return c.JSON(result)
}

// GetReplay GET /api/replays/:gameId (public, no auth required)
func GetReplay(c *fiber.Ctx) error {
	gameID := c.Params("gameId")

	var game models.Game
	if err := db.DB.First(&game, "id = ?", gameID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "game not found"})
	}

	var players []models.GamePlayer
	db.DB.Where("game_id = ?", gameID).Find(&players)

	playerList := make([]fiber.Map, len(players))
	for i, p := range players {
		playerList[i] = fiber.Map{
			"id":        p.ID,
			"userId":    p.UserID,
			"botId":     p.BotID,
			"role":      p.Role,
			"startHP":   p.StartHP,
			"username":  p.Username,
			"avatarUrl": p.AvatarURL,
		}
	}

	return c.JSON(fiber.Map{
		"id":          game.ID,
		"roomId":      game.RoomID,
		"status":      game.Status,
		"result":      game.Result,
		"playerCount": game.PlayerCount,
		"turnCount":   game.TurnCount,
		"maxTurns":    game.MaxTurns,
		"createdAt":   game.CreatedAt,
		"finishedAt":  game.FinishedAt,
		"players":     playerList,
	})
}

// GetReplayActions GET /api/replays/:gameId/actions (public, no auth required)
func GetReplayActions(c *fiber.Ctx) error {
	gameID := c.Params("gameId")

	var game models.Game
	if err := db.DB.First(&game, "id = ?", gameID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "game not found"})
	}

	var actions []models.GameAction
	db.DB.Where("game_id = ?", gameID).Order("turn ASC, seq ASC").Find(&actions)

	result := make([]fiber.Map, len(actions))
	for i, a := range actions {
		result[i] = fiber.Map{
			"id":         a.ID,
			"turn":       a.Turn,
			"seq":        a.Seq,
			"actorId":    a.ActorID,
			"actionType": a.ActionType,
			"targetId":   a.TargetID,
			"payload":    a.Payload,
			"createdAt":  a.CreatedAt,
		}
	}

	return c.JSON(result)
}
