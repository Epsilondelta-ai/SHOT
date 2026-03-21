package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/models"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

func getJWTSecret() []byte {
	s := os.Getenv("JWT_SECRET")
	if s == "" {
		s = "dev-secret-do-not-use-in-prod"
	}
	return []byte(s)
}

func generateToken(userID string) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(7 * 24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getJWTSecret())
}

func googleOAuthConfig() *oauth2.Config {
	backendURL := strings.TrimRight(os.Getenv("BACKEND_URL"), "/")
	if backendURL == "" {
		backendURL = "http://localhost:3000"
	}
	return &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  backendURL + "/api/auth/google/callback",
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}
}

// Signup POST /api/auth/signup
func Signup(c *fiber.Ctx) error {
	var body struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if body.Username == "" || body.Email == "" || body.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "username, email and password are required"})
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to hash password"})
	}

	user := models.User{
		Username:     body.Username,
		Email:        body.Email,
		PasswordHash: string(hash),
	}
	if result := db.DB.Create(&user); result.Error != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "email already in use"})
	}

	token, err := generateToken(user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate token"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"token": token})
}

// Login POST /api/auth/login
func Login(c *fiber.Ctx) error {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	var user models.User
	if result := db.DB.Where("email = ?", body.Email).First(&user); result.Error != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid credentials"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(body.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid credentials"})
	}

	token, err := generateToken(user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate token"})
	}

	return c.JSON(fiber.Map{"token": token})
}

// Me GET /api/me
func Me(c *fiber.Ctx) error {
	authHeader := c.Get("Authorization")
	if len(authHeader) < 8 || authHeader[:7] != "Bearer " {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing token"})
	}
	tokenStr := authHeader[7:]

	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
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

	return c.JSON(fiber.Map{
		"id":        user.ID,
		"username":  user.Username,
		"email":     user.Email,
		"avatarUrl": user.AvatarURL,
	})
}

// GetMyRoom GET /api/me/room
func GetMyRoom(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var member models.RoomMember
	if err := db.DB.Where("user_id = ? AND bot_id = ''", userID).First(&member).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not in any room"})
	}

	var room models.Room
	if err := db.DB.First(&room, "id = ?", member.RoomID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "room not found"})
	}

	result := fiber.Map{
		"id":             room.ID,
		"name":           room.Name,
		"hostId":         room.HostID,
		"status":         room.Status,
		"maxPlayers":     room.MaxPlayers,
		"playerCount":    room.PlayerCount,
		"botCount":       room.BotCount,
		"spectatorCount": room.SpectatorCount,
		"isPrivate":      room.IsPrivate,
		"createdAt":      room.CreatedAt,
	}

	// If room is playing, include gameId for reconnection
	if room.Status == "playing" {
		var activeGame models.Game
		if err := db.DB.Where("room_id = ? AND status = ?", room.ID, "playing").First(&activeGame).Error; err == nil {
			result["gameId"] = activeGame.ID
		}
	}

	return c.JSON(result)
}

// GoogleRedirect GET /api/auth/google
func GoogleRedirect(c *fiber.Ctx) error {
	if os.Getenv("GOOGLE_CLIENT_ID") == "" {
		return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{"error": "Google OAuth not configured"})
	}
	cfg := googleOAuthConfig()
	url := cfg.AuthCodeURL("state", oauth2.AccessTypeOnline)
	return c.Redirect(url)
}

// GoogleCallback GET /api/auth/google/callback
func GoogleCallback(c *fiber.Ctx) error {
	code := c.Query("code")
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing code"})
	}

	cfg := googleOAuthConfig()
	oauthToken, err := cfg.Exchange(context.Background(), code)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "failed to exchange code"})
	}

	client := cfg.Client(context.Background(), oauthToken)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get user info"})
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "google userinfo request failed"})
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to read user info"})
	}

	var googleUser struct {
		ID      string `json:"id"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}
	if err := json.Unmarshal(data, &googleUser); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to parse user info"})
	}

	var user models.User
	// Try find by GoogleID first, then by email
	result := db.DB.Where("google_id = ?", googleUser.ID).First(&user)
	if result.Error != nil {
		result = db.DB.Where("email = ?", googleUser.Email).First(&user)
		if result.Error != nil {
			// Create new user
			user = models.User{
				Email:     googleUser.Email,
				Username:  googleUser.Name,
				GoogleID:  &googleUser.ID,
				AvatarURL: googleUser.Picture,
			}
			if err := db.DB.Create(&user).Error; err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create user"})
			}
		} else {
			// Link Google ID to existing account
			db.DB.Model(&user).Update("google_id", googleUser.ID)
		}
	}

	jwtToken, err := generateToken(user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate token"})
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:4321"
	}

	return c.Redirect(frontendURL + "/en/game?token=" + jwtToken)
}
