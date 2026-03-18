package main

import (
	"log"
	"os"

	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/handlers"
	fws "github.com/gofiber/contrib/websocket"
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
	api.Get("/me", handlers.Me)
	api.Patch("/me", handlers.UpdateMe)
	api.Get("/rooms", handlers.ListRooms)
	api.Post("/rooms", handlers.CreateRoom)
	api.Post("/rooms/:id/join", handlers.JoinRoom)
	api.Get("/rooms/:id/members", handlers.GetRoomMembers)
	api.Post("/rooms/:id/spectate", handlers.SpectateRoom)
	api.Post("/rooms/:id/invite-bot", handlers.InviteBot)
	api.Patch("/rooms/:id/members/:userId/permissions", handlers.SetMemberPermission)
	api.Post("/rooms/:id/transfer-host", handlers.TransferHost)
	api.Post("/rooms/:id/kick", handlers.KickFromRoom)
	api.Patch("/rooms/:id", handlers.UpdateRoom)
	api.Use("/rooms/:id/ws", func(c *fiber.Ctx) error {
		if fws.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})
	api.Get("/rooms/:id/ws", fws.New(handlers.RoomWS))
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
