package main

import (
	"log"
	"os"
	"time"

	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/game"
	"github.com/epsilondelta/shot/handlers"
	"github.com/epsilondelta/shot/hub"
	"github.com/epsilondelta/shot/models"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	if os.Getenv("JWT_SECRET") == "" {
		log.Fatal("JWT_SECRET environment variable is required (generate with: openssl rand -hex 32)")
	}

	if err := db.Connect(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	if err := db.ConnectRedis(); err != nil {
		log.Fatal("Failed to connect to Redis:", err)
	}

	db.SeedData()

	// Clean up rooms left over from previous server session.
	// Only delete rooms that are NOT playing — active games are preserved
	// and their state is recovered from Redis by the TimerManager.
	db.DB.Exec("DELETE FROM room_members WHERE room_id IN (SELECT id FROM rooms WHERE status != 'playing')")
	db.DB.Exec("DELETE FROM rooms WHERE status != 'playing'")

	// For rooms still marked "playing", check whether the game state survived in Redis.
	// If Redis was also wiped (e.g. full server + cache restart), the game cannot be
	// recovered. Mark it finished (draw) and reset the room to "waiting" so that
	// players and bots can leave normally instead of being stuck forever.
	var orphanRooms []models.Room
	db.DB.Where("status = ?", "playing").Find(&orphanRooms)
	for _, room := range orphanRooms {
		var g models.Game
		if err := db.DB.Where("room_id = ? AND status = ?", room.ID, "playing").First(&g).Error; err != nil {
			// Playing room with no matching game row — reset the room.
			db.DB.Model(&models.Room{}).Where("id = ?", room.ID).Update("status", "waiting")
			log.Printf("startup: reset room %s (no active game in DB)", room.ID)
			continue
		}
		if _, err := game.LoadState(db.RDB, g.ID); err != nil {
			// Game exists in DB but state is gone from Redis — close it as a draw.
			now := time.Now()
			draw := "draw"
			db.DB.Model(&models.Game{}).Where("id = ?", g.ID).Updates(map[string]any{
				"status":      "finished",
				"result":      draw,
				"finished_at": now,
			})
			db.DB.Model(&models.Room{}).Where("id = ?", room.ID).Update("status", "waiting")
			log.Printf("startup: closed orphan game %s (Redis state missing), room %s reset to waiting", g.ID, room.ID)
		}
		// Redis state exists — RecoverTimers() will restore the timer below.
	}

	hub.H = hub.NewHub(db.RDB)
	hub.H.Start()
	hub.SH = hub.NewSessionHub(db.RDB)
	hub.SH.Start()

	game.GL = game.NewGameLockManager()
	game.TM = game.NewTimerManager(db.RDB)
	game.TM.RecoverTimers()

	app := fiber.New()
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     os.Getenv("FRONTEND_URL"),
		AllowHeaders:     "Origin, Content-Type, Authorization",
		AllowCredentials: true,
	}))

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	api := app.Group("/api")
	api.Get("/stats", handlers.GetStats)
	api.Get("/session/sse", handlers.SessionSSE)
	api.Get("/me", handlers.Me)
	api.Get("/me/room", handlers.GetMyRoom)
	api.Patch("/me", handlers.UpdateMe)
	api.Get("/rooms", handlers.ListRooms)
	api.Post("/rooms", handlers.CreateRoom)
	api.Get("/rooms/:id", handlers.GetRoom)
	api.Post("/rooms/:id/join", handlers.JoinRoom)
	api.Get("/rooms/:id/members", handlers.GetRoomMembers)
	api.Post("/rooms/:id/spectate", handlers.SpectateRoom)
	api.Post("/rooms/:id/invite-bot", handlers.InviteBot)
	api.Post("/rooms/:id/invite-rulebot", handlers.InviteRuleBot)
	api.Post("/rooms/:id/invite-llm", handlers.InviteLLMPlayer)
	api.Delete("/rooms/:id/kick-llm/:memberId", handlers.KickLLMPlayer)
	api.Patch("/rooms/:id/members/:userId/permissions", handlers.SetMemberPermission)
	api.Post("/rooms/:id/transfer-host", handlers.TransferHost)
	api.Post("/rooms/:id/kick", handlers.KickFromRoom)
	api.Patch("/rooms/:id", handlers.UpdateRoom)
	api.Get("/rooms/:id/sse", handlers.RoomSSE)
	api.Post("/rooms/:id/leave", handlers.LeaveRoom)
	api.Post("/rooms/:id/chat", handlers.SendChat)
	api.Post("/rooms/:id/start", handlers.StartGame)
	api.Post("/games/:id/play-card", handlers.GamePlayCard)
	api.Post("/games/:id/end-turn", handlers.GameEndTurn)
	api.Post("/games/:id/reveal", handlers.GameReveal)
	api.Post("/games/:id/chat", handlers.GameChat)
	api.Get("/games/:id/state", handlers.GetGameState)
	api.Post("/games/:id/leave", handlers.GameLeave)
	api.Get("/replays", handlers.ListReplays)
	api.Get("/replays/favorites", handlers.ListFavoriteReplays)
	api.Get("/replays/:gameId", handlers.GetReplay)
	api.Get("/replays/:gameId/actions", handlers.GetReplayActions)
	api.Post("/replays/:gameId/view", handlers.ReplayView)
	api.Post("/replays/:gameId/like", handlers.ReplayLike)
	api.Delete("/replays/:gameId/like", handlers.ReplayUnlike)
	api.Post("/replays/:gameId/favorite", handlers.ReplayFavorite)
	api.Delete("/replays/:gameId/favorite", handlers.ReplayUnfavorite)
	api.Post("/favorites/users/:userId", handlers.FavoriteUser)
	api.Delete("/favorites/users/:userId", handlers.UnfavoriteUser)
	api.Post("/favorites/bots/:botId", handlers.FavoriteBot)
	api.Delete("/favorites/bots/:botId", handlers.UnfavoriteBot)
	api.Get("/favorites", handlers.ListUserFavorites)
	api.Get("/favorites/check", handlers.CheckUserFavorites)
	bot := api.Group("/bot")
	bot.Get("/sse", handlers.BotSSE)
	bot.Get("/game/state", handlers.BotGetGameState)
	bot.Get("/game/actions", handlers.BotGetGameActions)
	bot.Post("/game/play-card", handlers.BotPlayCard)
	bot.Post("/game/end-turn", handlers.BotEndTurn)
	bot.Post("/game/reveal", handlers.BotReveal)
	bot.Post("/game/chat", handlers.BotChat)
	api.Get("/llm-bots", handlers.ListLLMBots)
	api.Post("/llm-bots", handlers.CreateLLMBot)
	api.Patch("/llm-bots/:id", handlers.UpdateLLMBot)
	api.Delete("/llm-bots/:id", handlers.DeleteLLMBot)
	api.Get("/bots", handlers.ListBots)
	api.Post("/bots", handlers.CreateBot)
	api.Patch("/bots/:id", handlers.UpdateBot)
	api.Post("/bots/:id/regenerate-key", handlers.RegenerateAPIKey)
	api.Delete("/bots/:id", handlers.DeleteBot)
	api.Get("/players/:userId", handlers.GetPlayerProfile)
	api.Get("/bots/:botId/profile", handlers.GetBotProfile)
	auth := api.Group("/auth")
	auth.Post("/signup", handlers.Signup)
	auth.Post("/login", handlers.Login)
	auth.Post("/exchange", handlers.ExchangeOAuthCode)
	auth.Get("/google", handlers.GoogleRedirect)
	auth.Get("/google/callback", handlers.GoogleCallback)

	// Shop & Credits
	api.Get("/shop/packs", handlers.ListCreditPacks)
	api.Get("/provided-models", handlers.ListProvidedModels)
	api.Get("/credits", handlers.GetMyCredits)
	api.Get("/credits/history", handlers.GetCreditHistory)
	api.Post("/shop/checkout", handlers.CreateCheckout)

	// Admin
	admin := api.Group("/admin")
	admin.Get("/stats", handlers.AdminGetStats)
	admin.Get("/users", handlers.AdminListUsers)
	admin.Get("/users/:id", handlers.AdminGetUser)
	admin.Post("/users/:id/credits", handlers.AdminUpdateUserCredits)
	admin.Patch("/users/:id/ban", handlers.AdminSetBan)
	admin.Patch("/users/:id/admin", handlers.AdminSetAdmin)
	admin.Get("/provided-models", handlers.AdminListProvidedModels)
	admin.Post("/provided-models", handlers.AdminCreateProvidedModel)
	admin.Patch("/provided-models/:id", handlers.AdminUpdateProvidedModel)
	admin.Delete("/provided-models/:id", handlers.AdminDeleteProvidedModel)
	admin.Get("/credit-packs", handlers.AdminListCreditPacks)
	admin.Post("/credit-packs", handlers.AdminCreateCreditPack)
	admin.Patch("/credit-packs/:id", handlers.AdminUpdateCreditPack)
	admin.Delete("/credit-packs/:id", handlers.AdminDeleteCreditPack)
	admin.Get("/games", handlers.AdminListGames)
	admin.Post("/games/:id/force-end", handlers.AdminForceEndGame)
	admin.Get("/bots", handlers.AdminListBots)
	admin.Patch("/bots/:id/disable", handlers.AdminDisableBot)
	admin.Get("/paddle-settings", handlers.AdminGetPaddleSettings)
	admin.Put("/paddle-settings", handlers.AdminUpdatePaddleSettings)
	admin.Get("/provider-keys", handlers.AdminListProviderKeys)
	admin.Post("/provider-keys", handlers.AdminCreateProviderKey)
	admin.Patch("/provider-keys/:id", handlers.AdminUpdateProviderKey)
	admin.Delete("/provider-keys/:id", handlers.AdminDeleteProviderKey)
	admin.Get("/transactions", handlers.AdminListTransactions)
	admin.Get("/replays", handlers.AdminListReplays)
	admin.Delete("/replays/:id", handlers.AdminDeleteReplay)

	// Paddle webhook (JWT 없이 Paddle에서 직접 호출)
	app.Post("/api/paddle/webhook", handlers.HandleWebhook)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Fatal(app.Listen(":" + port))
}
