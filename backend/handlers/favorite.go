package handlers

import (
	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// FavoriteUser POST /api/favorites/users/:userId
func FavoriteUser(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	targetID := c.Params("userId")
	if userID == targetID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cannot favorite yourself"})
	}

	fav := models.UserFavorite{UserID: userID, TargetType: "user", TargetID: targetID}
	if err := db.DB.Create(&fav).Error; err != nil {
		return c.JSON(fiber.Map{"ok": true}) // already favorited
	}
	db.DB.Model(&models.User{}).Where("id = ?", targetID).UpdateColumn("favorite_count", gorm.Expr("favorite_count + 1"))
	return c.JSON(fiber.Map{"ok": true})
}

// UnfavoriteUser DELETE /api/favorites/users/:userId
func UnfavoriteUser(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	targetID := c.Params("userId")

	result := db.DB.Where("user_id = ? AND target_type = ? AND target_id = ?", userID, "user", targetID).Delete(&models.UserFavorite{})
	if result.RowsAffected > 0 {
		db.DB.Model(&models.User{}).Where("id = ? AND favorite_count > 0", targetID).UpdateColumn("favorite_count", gorm.Expr("favorite_count - 1"))
	}
	return c.JSON(fiber.Map{"ok": true})
}

// FavoriteBot POST /api/favorites/bots/:botId
func FavoriteBot(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	targetID := c.Params("botId")

	fav := models.UserFavorite{UserID: userID, TargetType: "bot", TargetID: targetID}
	if err := db.DB.Create(&fav).Error; err != nil {
		return c.JSON(fiber.Map{"ok": true}) // already favorited
	}
	db.DB.Model(&models.Bot{}).Where("id = ?", targetID).UpdateColumn("favorite_count", gorm.Expr("favorite_count + 1"))
	return c.JSON(fiber.Map{"ok": true})
}

// UnfavoriteBot DELETE /api/favorites/bots/:botId
func UnfavoriteBot(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	targetID := c.Params("botId")

	result := db.DB.Where("user_id = ? AND target_type = ? AND target_id = ?", userID, "bot", targetID).Delete(&models.UserFavorite{})
	if result.RowsAffected > 0 {
		db.DB.Model(&models.Bot{}).Where("id = ? AND favorite_count > 0", targetID).UpdateColumn("favorite_count", gorm.Expr("favorite_count - 1"))
	}
	return c.JSON(fiber.Map{"ok": true})
}

// ListUserFavorites GET /api/favorites
func ListUserFavorites(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var favs []models.UserFavorite
	db.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&favs)

	result := make([]fiber.Map, 0, len(favs))
	for _, f := range favs {
		if f.TargetType == "user" {
			var user models.User
			if err := db.DB.First(&user, "id = ?", f.TargetID).Error; err != nil {
				continue
			}
			var totalGames, wins int64
			db.DB.Raw(`SELECT COUNT(*) FROM game_players gp JOIN games g ON g.id = gp.game_id WHERE gp.user_id = ? AND gp.bot_id = '' AND g.status = 'finished'`, f.TargetID).Scan(&totalGames)
			db.DB.Raw(`SELECT COUNT(*) FROM game_players gp JOIN games g ON g.id = gp.game_id WHERE gp.user_id = ? AND gp.bot_id = '' AND g.status = 'finished' AND ((gp.role = 'agent' AND g.result = 'agent_win') OR (gp.role = 'spy' AND g.result = 'spy_win'))`, f.TargetID).Scan(&wins)
			result = append(result, fiber.Map{
				"targetType":    "user",
				"targetId":      user.ID,
				"username":      user.Username,
				"avatarUrl":     user.AvatarURL,
				"favoriteCount": user.FavoriteCount,
				"totalGames":    totalGames,
				"winRate":       winRate(wins, totalGames),
				"favoritedAt":   f.CreatedAt,
			})
		} else if f.TargetType == "bot" {
			var bot models.Bot
			if err := db.DB.Unscoped().First(&bot, "id = ?", f.TargetID).Error; err != nil {
				continue
			}
			var owner models.User
			ownerUsername := ""
			if err := db.DB.First(&owner, "id = ?", bot.UserID).Error; err == nil {
				ownerUsername = owner.Username
			}
			var totalGames, wins int64
			db.DB.Raw(`SELECT COUNT(*) FROM game_players gp JOIN games g ON g.id = gp.game_id WHERE gp.bot_id = ? AND g.status = 'finished'`, f.TargetID).Scan(&totalGames)
			db.DB.Raw(`SELECT COUNT(*) FROM game_players gp JOIN games g ON g.id = gp.game_id WHERE gp.bot_id = ? AND g.status = 'finished' AND ((gp.role = 'agent' AND g.result = 'agent_win') OR (gp.role = 'spy' AND g.result = 'spy_win'))`, f.TargetID).Scan(&wins)
			result = append(result, fiber.Map{
				"targetType":    "bot",
				"targetId":      bot.ID,
				"username":      bot.Name,
				"avatarUrl":     bot.AvatarURL,
				"favoriteCount": bot.FavoriteCount,
				"ownerUsername": ownerUsername,
				"totalGames":    totalGames,
				"winRate":       winRate(wins, totalGames),
				"favoritedAt":   f.CreatedAt,
			})
		}
	}

	return c.JSON(result)
}

// CheckUserFavorites GET /api/favorites/check?userId=...&botId=...
func CheckUserFavorites(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	targetUserID := c.Query("userId")
	targetBotID := c.Query("botId")

	resp := fiber.Map{}
	if targetUserID != "" {
		var count int64
		db.DB.Model(&models.UserFavorite{}).Where("user_id = ? AND target_type = ? AND target_id = ?", userID, "user", targetUserID).Count(&count)
		resp["isFavorited"] = count > 0
	} else if targetBotID != "" {
		var count int64
		db.DB.Model(&models.UserFavorite{}).Where("user_id = ? AND target_type = ? AND target_id = ?", userID, "bot", targetBotID).Count(&count)
		resp["isFavorited"] = count > 0
	}

	return c.JSON(resp)
}
