package main

import (
	"log"
	"os"

	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/game"
	"github.com/epsilondelta/shot/handlers"
	"github.com/epsilondelta/shot/hub"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	if err := db.Connect(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	if err := db.ConnectRedis(); err != nil {
		log.Fatal("Failed to connect to Redis:", err)
	}

	// Clean up rooms left over from previous server session.
	// Only delete rooms that are NOT playing — active games are preserved
	// and their state is recovered from Redis by the TimerManager.
	db.DB.Exec("DELETE FROM room_members WHERE room_id IN (SELECT id FROM rooms WHERE status != 'playing')")
	db.DB.Exec("DELETE FROM rooms WHERE status != 'playing'")

	hub.H = hub.NewHub(db.RDB)
	hub.H.Start()
	hub.SH = hub.NewSessionHub(db.RDB)
	hub.SH.Start()

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
	api.Get("/replays/:gameId", handlers.GetReplay)
	api.Get("/replays/:gameId/actions", handlers.GetReplayActions)
	bot := api.Group("/bot")
	bot.Get("/sse", handlers.BotSSE)
	bot.Get("/game/state", handlers.BotGetGameState)
	bot.Post("/game/play-card", handlers.BotPlayCard)
	bot.Post("/game/end-turn", handlers.BotEndTurn)
	bot.Post("/game/reveal", handlers.BotReveal)
	bot.Post("/game/chat", handlers.BotChat)
	api.Get("/bots", handlers.ListBots)
	api.Post("/bots", handlers.CreateBot)
	api.Patch("/bots/:id", handlers.UpdateBot)
	api.Delete("/bots/:id", handlers.DeleteBot)
	auth := api.Group("/auth")
	auth.Post("/signup", handlers.Signup)
	auth.Post("/login", handlers.Login)
	auth.Get("/google", handlers.GoogleRedirect)
	auth.Get("/google/callback", handlers.GoogleCallback)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Fatal(app.Listen(":" + port))
}
