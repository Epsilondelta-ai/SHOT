package handlers

import (
	"bufio"
	"fmt"
	"time"

	"github.com/epsilondelta/shot/ws"
	"github.com/gofiber/fiber/v2"
)

// SessionSSE GET /api/session/sse
func SessionSSE(c *fiber.Ctx) error {
	tokenStr := c.Query("token")
	if tokenStr == "" {
		return c.Status(fiber.StatusUnauthorized).SendString("unauthorized")
	}
	userID, err := parseUserIDFromToken(tokenStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).SendString("unauthorized")
	}

	ch := make(chan []byte, 8)
	ws.SH.Register(userID, ch)

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("X-Accel-Buffering", "no")

	c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		defer ws.SH.Unregister(userID, ch)

		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case data, ok := <-ch:
				if !ok {
					return
				}
				fmt.Fprintf(w, "data: %s\n\n", data)
				if err := w.Flush(); err != nil {
					return
				}
			case <-ticker.C:
				fmt.Fprintf(w, ": ping\n\n")
				if err := w.Flush(); err != nil {
					return
				}
			}
		}
	})

	return nil
}
