package handlers

import (
	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/models"
	"github.com/gofiber/fiber/v2"
)

// ListLLMBots GET /api/llm-bots
func ListLLMBots(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var bots []models.LLMBot
	db.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&bots)

	type item struct {
		ID              string `json:"id"`
		Name            string `json:"name"`
		ProvidedModelID string `json:"providedModelId"`
		ModelName       string `json:"modelName"`
		CreditCost      int    `json:"creditCost"`
		UserPrompt      string `json:"userPrompt"`
	}

	result := make([]item, 0, len(bots))
	for _, b := range bots {
		var pm models.ProvidedModel
		db.DB.First(&pm, "id = ?", b.ProvidedModelID)
		result = append(result, item{
			ID:              b.ID,
			Name:            b.Name,
			ProvidedModelID: b.ProvidedModelID,
			ModelName:       pm.Name,
			CreditCost:      pm.CreditCost,
			UserPrompt:      b.UserPrompt,
		})
	}
	return c.JSON(result)
}

// CreateLLMBot POST /api/llm-bots
func CreateLLMBot(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var body struct {
		Name            string `json:"name"`
		ProvidedModelID string `json:"providedModelId"`
		UserPrompt      string `json:"userPrompt"`
	}
	if err := c.BodyParser(&body); err != nil || body.Name == "" || body.ProvidedModelID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name and providedModelId are required"})
	}

	var pm models.ProvidedModel
	if err := db.DB.First(&pm, "id = ? AND is_active = true", body.ProvidedModelID).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid or inactive model"})
	}
	if pm.Provider == "internal" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "internal models cannot be used as LLM bot"})
	}

	bot := models.LLMBot{
		UserID:          userID,
		Name:            body.Name,
		ProvidedModelID: body.ProvidedModelID,
		UserPrompt:      body.UserPrompt,
	}
	if err := db.DB.Create(&bot).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"id": bot.ID})
}

// UpdateLLMBot PATCH /api/llm-bots/:id
func UpdateLLMBot(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var bot models.LLMBot
	if err := db.DB.First(&bot, "id = ? AND user_id = ?", c.Params("id"), userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
	}

	var body struct {
		Name            *string `json:"name"`
		ProvidedModelID *string `json:"providedModelId"`
		UserPrompt      *string `json:"userPrompt"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	if body.Name != nil {
		bot.Name = *body.Name
	}
	if body.ProvidedModelID != nil {
		var pm models.ProvidedModel
		if err := db.DB.First(&pm, "id = ? AND is_active = true", *body.ProvidedModelID).Error; err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid or inactive model"})
		}
		if pm.Provider == "internal" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "internal models cannot be used as LLM bot"})
		}
		bot.ProvidedModelID = *body.ProvidedModelID
	}
	if body.UserPrompt != nil {
		bot.UserPrompt = *body.UserPrompt
	}

	db.DB.Save(&bot)
	return c.JSON(fiber.Map{"ok": true})
}

// DeleteLLMBot DELETE /api/llm-bots/:id
func DeleteLLMBot(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	if err := db.DB.Where("id = ? AND user_id = ?", c.Params("id"), userID).Delete(&models.LLMBot{}).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
	}
	return c.JSON(fiber.Map{"ok": true})
}
