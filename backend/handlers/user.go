package handlers

import (
	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/models"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// UpdateMe PATCH /api/me
func UpdateMe(c *fiber.Ctx) error {
	authHeader := c.Get("Authorization")
	if len(authHeader) < 8 || authHeader[:7] != "Bearer " {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing token"})
	}
	tokenStr := authHeader[7:]

	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		return getJWTSecret(), nil
	})
	if err != nil || !token.Valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid token"})
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid claims"})
	}

	userID, _ := claims["sub"].(string)
	var user models.User
	if result := db.DB.First(&user, "id = ?", userID); result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	var body struct {
		Username  *string `json:"username"`
		AvatarURL *string `json:"avatarUrl"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	updates := map[string]interface{}{}
	if body.Username != nil && *body.Username != "" {
		updates["username"] = *body.Username
	}
	if body.AvatarURL != nil {
		updates["avatar_url"] = *body.AvatarURL
	}

	if len(updates) > 0 {
		db.DB.Model(&user).Updates(updates)
	}

	return c.JSON(fiber.Map{
		"id":        user.ID,
		"username":  user.Username,
		"email":     user.Email,
		"avatarUrl": user.AvatarURL,
	})
}
