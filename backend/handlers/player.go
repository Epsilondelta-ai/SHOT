package handlers

import (
	"encoding/json"
	"time"

	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/models"
	"github.com/gofiber/fiber/v2"
)

func winRate(wins, total int64) int64 {
	if total == 0 {
		return 0
	}
	return wins * 100 / total
}

// computeStats collects stats for a participant identified by actorID.
// gpWhere / gpArg filter the game_players table (e.g. "user_id = ? AND bot_id = ''" or "bot_id = ?").
func computeStats(actorID string, gpWhere string, gpArg string) (
	totalGames, wins, draws, losses int64,
	agentGames, agentWins, spyGames, spyWins, killCount int64,
	cardUsage map[string]int,
	recentGames []fiber.Map,
) {
	cardUsage = map[string]int{"attack": 0, "heal": 0, "jail": 0, "inspect": 0}

	// Aggregate win/draw/loss counts grouped by role+result
	type statRow struct {
		Role   string
		Result *string
		Count  int64
	}
	var rows []statRow
	db.DB.Raw(`
		SELECT gp.role, g.result, COUNT(*) as count
		FROM game_players gp
		JOIN games g ON g.id = gp.game_id
		WHERE `+gpWhere+` AND g.status = 'finished'
		GROUP BY gp.role, g.result
	`, gpArg).Scan(&rows)

	for _, r := range rows {
		totalGames += r.Count
		res := ""
		if r.Result != nil {
			res = *r.Result
		}
		isWin := (r.Role == "agent" && res == "agent_win") || (r.Role == "spy" && res == "spy_win")
		isDraw := res == "draw"
		if isWin {
			wins += r.Count
		} else if isDraw {
			draws += r.Count
		} else {
			losses += r.Count
		}
		if r.Role == "agent" {
			agentGames += r.Count
			if isWin {
				agentWins += r.Count
			}
		}
		if r.Role == "spy" {
			spyGames += r.Count
			if isWin {
				spyWins += r.Count
			}
		}
	}

	// kills
	db.DB.Model(&models.GameAction{}).Where("actor_id = ? AND action_type = ?", actorID, "death").Count(&killCount)

	// card usage — fetch all game_actions and parse JSON payload
	var actions []models.GameAction
	db.DB.Where("actor_id = ? AND action_type = ?", actorID, "game_action").Find(&actions)
	for _, a := range actions {
		var payload map[string]interface{}
		if jsonErr := json.Unmarshal([]byte(a.Payload), &payload); jsonErr != nil {
			continue
		}
		if card, ok := payload["card"].(string); ok {
			if _, exists := cardUsage[card]; exists {
				cardUsage[card]++
			}
		}
	}

	// recentGames — last 10
	type recentRow struct {
		GameID     string
		Title      string
		Role       string
		Result     *string
		FinishedAt *time.Time
	}
	var recent []recentRow
	db.DB.Raw(`
		SELECT g.id as game_id, g.title, gp.role, g.result, g.finished_at
		FROM game_players gp
		JOIN games g ON g.id = gp.game_id
		WHERE `+gpWhere+` AND g.status = 'finished'
		ORDER BY g.finished_at DESC
		LIMIT 10
	`, gpArg).Scan(&recent)

	recentGames = make([]fiber.Map, len(recent))
	for i, r := range recent {
		res := ""
		if r.Result != nil {
			res = *r.Result
		}
		recentGames[i] = fiber.Map{
			"gameId":     r.GameID,
			"title":      r.Title,
			"role":       r.Role,
			"result":     res,
			"finishedAt": r.FinishedAt,
		}
	}

	return
}

// GetPlayerProfile GET /api/players/:userId
func GetPlayerProfile(c *fiber.Ctx) error {
	userID := c.Params("userId")

	var user models.User
	if err := db.DB.First(&user, "id = ?", userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	totalGames, wins, draws, losses,
		agentGames, agentWins, spyGames, spyWins,
		kills, cardUsage, recentGames := computeStats(
		userID, "gp.user_id = ? AND gp.bot_id = ''", userID,
	)

	return c.JSON(fiber.Map{
		"id":            user.ID,
		"username":      user.Username,
		"avatarUrl":     user.AvatarURL,
		"isBot":         false,
		"ownerUsername": "",
		"favoriteCount": user.FavoriteCount,
		"totalGames":    totalGames,
		"wins":          wins,
		"draws":         draws,
		"losses":        losses,
		"winRate":       winRate(wins, totalGames),
		"agentGames":    agentGames,
		"agentWins":     agentWins,
		"agentWinRate":  winRate(agentWins, agentGames),
		"spyGames":      spyGames,
		"spyWins":       spyWins,
		"spyWinRate":    winRate(spyWins, spyGames),
		"kills":         kills,
		"cardUsage":     cardUsage,
		"recentGames":   recentGames,
	})
}

// GetBotProfile GET /api/bots/:botId/profile
func GetBotProfile(c *fiber.Ctx) error {
	botID := c.Params("botId")

	var bot models.Bot
	if err := db.DB.Unscoped().First(&bot, "id = ?", botID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "bot not found"})
	}

	var owner models.User
	ownerUsername := ""
	if err := db.DB.First(&owner, "id = ?", bot.UserID).Error; err == nil {
		ownerUsername = owner.Username
	}

	totalGames, wins, draws, losses,
		agentGames, agentWins, spyGames, spyWins,
		kills, cardUsage, recentGames := computeStats(
		botID, "gp.bot_id = ?", botID,
	)

	return c.JSON(fiber.Map{
		"id":            bot.ID,
		"username":      bot.Name,
		"avatarUrl":     bot.AvatarURL,
		"description":   bot.Description,
		"isBot":         true,
		"ownerUsername": ownerUsername,
		"favoriteCount": bot.FavoriteCount,
		"totalGames":    totalGames,
		"wins":          wins,
		"draws":         draws,
		"losses":        losses,
		"winRate":       winRate(wins, totalGames),
		"agentGames":    agentGames,
		"agentWins":     agentWins,
		"agentWinRate":  winRate(agentWins, agentGames),
		"spyGames":      spyGames,
		"spyWins":       spyWins,
		"spyWinRate":    winRate(spyWins, spyGames),
		"kills":         kills,
		"cardUsage":     cardUsage,
		"recentGames":   recentGames,
	})
}
