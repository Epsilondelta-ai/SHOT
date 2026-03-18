package handlers

import (
	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/models"
	"github.com/gofiber/fiber/v2"
)

func GetStats(c *fiber.Ctx) error {
	var userCount int64
	var botCount int64

	db.DB.Model(&models.User{}).Count(&userCount)
	db.DB.Model(&models.Bot{}).Count(&botCount)

	return c.JSON(fiber.Map{
		"players":  userCount,
		"aiAgents": botCount,
	})
}
