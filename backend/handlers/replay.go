package handlers

import (
	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// ReplayView POST /api/replays/:gameId/view (public, no auth required)
func ReplayView(c *fiber.Ctx) error {
	gameID := c.Params("gameId")
	db.DB.Model(&models.Game{}).Where("id = ?", gameID).UpdateColumn("view_count", gorm.Expr("view_count + 1"))
	return c.JSON(fiber.Map{"ok": true})
}

// ReplayLike POST /api/replays/:gameId/like (auth required)
func ReplayLike(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	gameID := c.Params("gameId")

	like := models.ReplayLike{GameID: gameID, UserID: userID}
	if err := db.DB.Create(&like).Error; err != nil {
		return c.JSON(fiber.Map{"ok": true}) // already liked
	}
	db.DB.Model(&models.Game{}).Where("id = ?", gameID).UpdateColumn("like_count", gorm.Expr("like_count + 1"))
	return c.JSON(fiber.Map{"ok": true})
}

// ReplayUnlike DELETE /api/replays/:gameId/like (auth required)
func ReplayUnlike(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	gameID := c.Params("gameId")

	result := db.DB.Where("game_id = ? AND user_id = ?", gameID, userID).Delete(&models.ReplayLike{})
	if result.RowsAffected > 0 {
		db.DB.Model(&models.Game{}).Where("id = ? AND like_count > 0", gameID).UpdateColumn("like_count", gorm.Expr("like_count - 1"))
	}
	return c.JSON(fiber.Map{"ok": true})
}

// ReplayFavorite POST /api/replays/:gameId/favorite (auth required)
func ReplayFavorite(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	gameID := c.Params("gameId")

	fav := models.ReplayFavorite{GameID: gameID, UserID: userID}
	if err := db.DB.Create(&fav).Error; err != nil {
		return c.JSON(fiber.Map{"ok": true}) // already favorited
	}
	db.DB.Model(&models.Game{}).Where("id = ?", gameID).UpdateColumn("favorite_count", gorm.Expr("favorite_count + 1"))
	return c.JSON(fiber.Map{"ok": true})
}

// ReplayUnfavorite DELETE /api/replays/:gameId/favorite (auth required)
func ReplayUnfavorite(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	gameID := c.Params("gameId")

	result := db.DB.Where("game_id = ? AND user_id = ?", gameID, userID).Delete(&models.ReplayFavorite{})
	if result.RowsAffected > 0 {
		db.DB.Model(&models.Game{}).Where("id = ? AND favorite_count > 0", gameID).UpdateColumn("favorite_count", gorm.Expr("favorite_count - 1"))
	}
	return c.JSON(fiber.Map{"ok": true})
}

// ListFavoriteReplays GET /api/replays/favorites (auth required)
func ListFavoriteReplays(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var favs []models.ReplayFavorite
	db.DB.Where("user_id = ?", userID).Order("created_at DESC").Limit(100).Find(&favs)

	gameIDs := make([]string, len(favs))
	for i, f := range favs {
		gameIDs[i] = f.GameID
	}

	if len(gameIDs) == 0 {
		return c.JSON([]fiber.Map{})
	}

	var games []models.Game
	db.DB.Where("id IN ? AND status = ?", gameIDs, "finished").Find(&games)

	// Preserve favorite order
	gameMap := make(map[string]models.Game, len(games))
	for _, g := range games {
		gameMap[g.ID] = g
	}

	result := make([]fiber.Map, 0, len(favs))
	for _, f := range favs {
		g, ok := gameMap[f.GameID]
		if !ok {
			continue
		}
		var players []models.GamePlayer
		db.DB.Where("game_id = ?", g.ID).Find(&players)

		playerList := make([]fiber.Map, len(players))
		for j, p := range players {
			playerList[j] = fiber.Map{
				"userId":    p.UserID,
				"botId":     p.BotID,
				"username":  p.Username,
				"avatarUrl": p.AvatarURL,
				"role":      p.Role,
			}
		}

		result = append(result, fiber.Map{
			"id":            g.ID,
			"title":         g.Title,
			"result":        g.Result,
			"playerCount":   g.PlayerCount,
			"turnCount":     g.TurnCount,
			"viewCount":     g.ViewCount,
			"likeCount":     g.LikeCount,
			"favoriteCount": g.FavoriteCount,
			"finishedAt":    g.FinishedAt,
			"players":       playerList,
			"isFavorited":   true,
		})
	}

	return c.JSON(result)
}

// ListReplays GET /api/replays (public, no auth required)
func ListReplays(c *fiber.Ctx) error {
	userID := c.Query("userId")
	botID := c.Query("botId")

	query := db.DB.Where("status = ?", "finished")

	if userID != "" || botID != "" {
		var gameIDs []string
		subQ := db.DB.Model(&models.GamePlayer{}).Select("game_id")
		if botID != "" {
			subQ = subQ.Where("bot_id = ?", botID)
		} else {
			subQ = subQ.Where("user_id = ? AND bot_id = ''", userID)
		}
		subQ.Pluck("game_id", &gameIDs)
		if len(gameIDs) == 0 {
			return c.JSON([]fiber.Map{})
		}
		query = query.Where("id IN ?", gameIDs)
	}

	var games []models.Game
	query.Order("finished_at DESC").Limit(50).Find(&games)

	result := make([]fiber.Map, len(games))
	for i, g := range games {
		var players []models.GamePlayer
		db.DB.Where("game_id = ?", g.ID).Find(&players)

		playerList := make([]fiber.Map, len(players))
		for j, p := range players {
			playerList[j] = fiber.Map{
				"userId":    p.UserID,
				"botId":     p.BotID,
				"username":  p.Username,
				"avatarUrl": p.AvatarURL,
				"role":      p.Role,
			}
		}

		result[i] = fiber.Map{
			"id":            g.ID,
			"title":         g.Title,
			"result":        g.Result,
			"playerCount":   g.PlayerCount,
			"turnCount":     g.TurnCount,
			"viewCount":     g.ViewCount,
			"likeCount":     g.LikeCount,
			"favoriteCount": g.FavoriteCount,
			"finishedAt":    g.FinishedAt,
			"players":       playerList,
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

	resp := fiber.Map{
		"id":            game.ID,
		"title":         game.Title,
		"roomId":        game.RoomID,
		"status":        game.Status,
		"result":        game.Result,
		"playerCount":   game.PlayerCount,
		"turnCount":     game.TurnCount,
		"maxTurns":      game.MaxTurns,
		"viewCount":     game.ViewCount,
		"likeCount":     game.LikeCount,
		"favoriteCount": game.FavoriteCount,
		"createdAt":     game.CreatedAt,
		"finishedAt":    game.FinishedAt,
		"players":       playerList,
		"isLiked":       false,
		"isFavorited":   false,
	}

	// Check if user has liked/favorited (optional auth)
	if userID, err := getUserIDFromToken(c); err == nil && userID != "" {
		var likeCount int64
		db.DB.Model(&models.ReplayLike{}).Where("game_id = ? AND user_id = ?", gameID, userID).Count(&likeCount)
		resp["isLiked"] = likeCount > 0

		var favCount int64
		db.DB.Model(&models.ReplayFavorite{}).Where("game_id = ? AND user_id = ?", gameID, userID).Count(&favCount)
		resp["isFavorited"] = favCount > 0
	}

	return c.JSON(resp)
}

// GetReplayActions GET /api/replays/:gameId/actions (public, no auth required)
func GetReplayActions(c *fiber.Ctx) error {
	gameID := c.Params("gameId")

	var game models.Game
	if err := db.DB.First(&game, "id = ?", gameID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "game not found"})
	}

	var actions []models.GameAction
	db.DB.Where("game_id = ?", gameID).Order("created_at ASC, seq ASC").Find(&actions)

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
