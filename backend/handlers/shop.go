package handlers

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// ListCreditPacks GET /api/shop/packs
func ListCreditPacks(c *fiber.Ctx) error {
	var packs []models.CreditPack
	db.DB.Where("is_active = ?", true).Find(&packs)

	result := make([]fiber.Map, len(packs))
	for i, p := range packs {
		result[i] = fiber.Map{
			"id":       p.ID,
			"name":     p.Name,
			"credits":  p.Credits,
			"priceUSD": p.PriceUSD,
		}
	}
	return c.JSON(result)
}

// GetMyCredits GET /api/credits
func GetMyCredits(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var user models.User
	if err := db.DB.First(&user, "id = ?", userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	return c.JSON(fiber.Map{"credits": user.Credits})
}

// GetCreditHistory GET /api/credits/history
func GetCreditHistory(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var txns []models.CreditTransaction
	db.DB.Where("user_id = ?", userID).Order("created_at desc").Limit(50).Find(&txns)

	result := make([]fiber.Map, len(txns))
	for i, t := range txns {
		result[i] = fiber.Map{
			"id":          t.ID,
			"amount":      t.Amount,
			"type":        t.Type,
			"description": t.Description,
			"createdAt":   t.CreatedAt,
		}
	}
	return c.JSON(result)
}

// ListOfficialBots GET /api/official-bots
func ListOfficialBots(c *fiber.Ctx) error {
	var bots []models.OfficialBot
	db.DB.Where("is_active = ?", true).Find(&bots)

	result := make([]fiber.Map, len(bots))
	for i, b := range bots {
		result[i] = fiber.Map{
			"id":          b.ID,
			"name":        b.Name,
			"modelId":     b.ModelID,
			"provider":    b.Provider,
			"description": b.Description,
			"creditCost":  b.CreditCost,
			"tier":        b.Tier,
		}
	}
	return c.JSON(result)
}

// CreateCheckout POST /api/shop/checkout
func CreateCheckout(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var body struct {
		PackID string `json:"pack_id"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	var pack models.CreditPack
	if err := db.DB.First(&pack, "id = ?", body.PackID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "pack not found"})
	}

	if pack.PaddlePriceID == "" {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "payment not configured"})
	}

	var user models.User
	if err := db.DB.First(&user, "id = ?", userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	// Paddle API 호출을 위한 요청 본문 구성
	paddleBody := map[string]any{
		"items": []map[string]any{
			{"price_id": pack.PaddlePriceID, "quantity": 1},
		},
		"custom_data": map[string]string{
			"user_id": userID,
			"pack_id": body.PackID,
		},
	}
	if user.PaddleCustomerID != "" {
		paddleBody["customer_id"] = user.PaddleCustomerID
	}

	jsonBody, err := json.Marshal(paddleBody)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create request"})
	}

	paddleURL := "https://api.paddle.com/transactions"
	if os.Getenv("PADDLE_ENVIRONMENT") == "sandbox" {
		paddleURL = "https://sandbox-api.paddle.com/transactions"
	}

	req, err := http.NewRequest("POST", paddleURL, bytes.NewReader(jsonBody))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create request"})
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+os.Getenv("PADDLE_API_KEY"))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "failed to contact payment provider"})
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "failed to read payment response"})
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "payment provider error", "details": string(respBody)})
	}

	var paddleResp struct {
		Data struct {
			Checkout struct {
				URL string `json:"url"`
			} `json:"checkout"`
		} `json:"data"`
	}
	if err := json.Unmarshal(respBody, &paddleResp); err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "invalid payment response"})
	}

	return c.JSON(fiber.Map{"checkout_url": paddleResp.Data.Checkout.URL})
}

// HandleWebhook POST /api/paddle/webhook
func HandleWebhook(c *fiber.Ctx) error {
	// 원본 요청 본문 읽기
	rawBody := c.Body()

	// Paddle 서명 검증
	signature := c.Get("Paddle-Signature")
	if signature == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing signature"})
	}

	webhookSecret := os.Getenv("PADDLE_WEBHOOK_SECRET")
	if webhookSecret == "" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "webhook secret not configured"})
	}

	if !verifyPaddleSignature(signature, rawBody, webhookSecret) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid signature"})
	}

	// 이벤트 파싱
	var event struct {
		EventType string          `json:"event_type"`
		Data      json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(rawBody, &event); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	// transaction.completed 이벤트 처리
	if event.EventType == "transaction.completed" {
		return handleTransactionCompleted(event.Data)
	}

	// 다른 이벤트는 무시
	return c.SendStatus(fiber.StatusOK)
}

func verifyPaddleSignature(signature string, payload []byte, secret string) bool {
	// 헤더 형식: "ts=TIMESTAMP;h1=HASH"
	var ts, h1 string
	for _, part := range strings.Split(signature, ";") {
		kv := strings.SplitN(part, "=", 2)
		if len(kv) != 2 {
			continue
		}
		switch kv[0] {
		case "ts":
			ts = kv[1]
		case "h1":
			h1 = kv[1]
		}
	}

	if ts == "" || h1 == "" {
		return false
	}

	// signed_payload = ts + ":" + rawBody
	signedPayload := ts + ":" + string(payload)

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signedPayload))
	expectedMAC := hex.EncodeToString(mac.Sum(nil))

	return subtle.ConstantTimeCompare([]byte(expectedMAC), []byte(h1)) == 1
}

func handleTransactionCompleted(data json.RawMessage) error {
	var txData struct {
		ID         string `json:"id"`
		CustomerID string `json:"customer_id"`
		CustomData struct {
			UserID string `json:"user_id"`
			PackID string `json:"pack_id"`
		} `json:"custom_data"`
	}
	if err := json.Unmarshal(data, &txData); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid transaction data")
	}

	if txData.CustomData.UserID == "" || txData.CustomData.PackID == "" {
		return fiber.NewError(fiber.StatusBadRequest, "missing custom data")
	}

	var pack models.CreditPack
	if err := db.DB.First(&pack, "id = ?", txData.CustomData.PackID).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "pack not found")
	}

	// 트랜잭션으로 크레딧 추가
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		// 유저 크레딧 추가
		if err := tx.Model(&models.User{}).Where("id = ?", txData.CustomData.UserID).
			Update("credits", gorm.Expr("credits + ?", pack.Credits)).Error; err != nil {
			return err
		}

		// 크레딧 거래 내역 기록
		creditTxn := models.CreditTransaction{
			UserID:              txData.CustomData.UserID,
			Amount:              pack.Credits,
			Type:                "purchase",
			PaddleTransactionID: txData.ID,
			Description:         pack.Name,
		}
		if err := tx.Create(&creditTxn).Error; err != nil {
			return err
		}

		// PaddleCustomerID 업데이트 (없는 경우)
		if txData.CustomerID != "" {
			tx.Model(&models.User{}).
				Where("id = ? AND (paddle_customer_id = '' OR paddle_customer_id IS NULL)", txData.CustomData.UserID).
				Update("paddle_customer_id", txData.CustomerID)
		}

		return nil
	})

	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, fmt.Sprintf("failed to process transaction: %v", err))
	}

	return nil
}
