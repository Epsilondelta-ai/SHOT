package handlers

import (
	"os"
	"strconv"
	"time"

	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// requireAdmin 은 토큰에서 유저를 꺼내고 IsAdmin 여부를 확인한다.
func requireAdmin(c *fiber.Ctx) (*models.User, error) {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return nil, c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	var user models.User
	if err := db.DB.First(&user, "id = ?", userID).Error; err != nil {
		return nil, c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	if !user.IsAdmin {
		return nil, c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
	}
	return &user, nil
}

// AdminGetStats GET /api/admin/stats
func AdminGetStats(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	var totalUsers int64
	db.DB.Model(&models.User{}).Count(&totalUsers)

	var usersToday int64
	today := time.Now().Truncate(24 * time.Hour)
	db.DB.Model(&models.User{}).Where("created_at >= ?", today).Count(&usersToday)

	var activeGames int64
	db.DB.Model(&models.Room{}).Where("status = ?", "playing").Count(&activeGames)

	var gamesToday int64
	db.DB.Model(&models.Game{}).Where("status = ? AND finished_at >= ?", "finished", today).Count(&gamesToday)

	var totalRevenue int64
	db.DB.Model(&models.CreditTransaction{}).Where("type = ?", "purchase").Select("COALESCE(SUM(amount), 0)").Scan(&totalRevenue)

	return c.JSON(fiber.Map{
		"totalUsers":   totalUsers,
		"usersToday":   usersToday,
		"activeGames":  activeGames,
		"gamesToday":   gamesToday,
		"totalRevenue": totalRevenue,
	})
}

// AdminListUsers GET /api/admin/users
func AdminListUsers(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	q := c.Query("q")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	query := db.DB.Model(&models.User{})
	if q != "" {
		like := "%" + q + "%"
		query = query.Where("username ILIKE ? OR email ILIKE ?", like, like)
	}

	var total int64
	query.Count(&total)

	var users []models.User
	query.Order("created_at desc").Offset(offset).Limit(limit).Find(&users)

	result := make([]fiber.Map, len(users))
	for i, u := range users {
		result[i] = fiber.Map{
			"id":            u.ID,
			"email":         u.Email,
			"username":      u.Username,
			"credits":       u.Credits,
			"isAdmin":       u.IsAdmin,
			"isBanned":      u.IsBanned,
			"createdAt":     u.CreatedAt,
			"favoriteCount": u.FavoriteCount,
		}
	}

	return c.JSON(fiber.Map{
		"users": result,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// AdminGetUser GET /api/admin/users/:id
func AdminGetUser(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	id := c.Params("id")
	var user models.User
	if err := db.DB.First(&user, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	var botCount int64
	db.DB.Model(&models.Bot{}).Where("user_id = ?", id).Count(&botCount)

	var gameCount int64
	db.DB.Model(&models.GamePlayer{}).Where("user_id = ?", id).Count(&gameCount)

	return c.JSON(fiber.Map{
		"id":            user.ID,
		"email":         user.Email,
		"username":      user.Username,
		"avatarUrl":     user.AvatarURL,
		"credits":       user.Credits,
		"isAdmin":       user.IsAdmin,
		"isBanned":      user.IsBanned,
		"createdAt":     user.CreatedAt,
		"favoriteCount": user.FavoriteCount,
		"botCount":      botCount,
		"gameCount":     gameCount,
	})
}

// AdminUpdateUserCredits POST /api/admin/users/:id/credits
func AdminUpdateUserCredits(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	id := c.Params("id")
	var body struct {
		Amount int    `json:"amount"`
		Reason string `json:"reason"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if body.Amount == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "amount is required"})
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.User{}).Where("id = ?", id).
			Update("credits", gorm.Expr("credits + ?", body.Amount)).Error; err != nil {
			return err
		}
		txn := models.CreditTransaction{
			UserID:      id,
			Amount:      body.Amount,
			Type:        "bonus",
			Description: body.Reason,
		}
		return tx.Create(&txn).Error
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update credits"})
	}

	return c.JSON(fiber.Map{"ok": true})
}

// AdminSetBan PATCH /api/admin/users/:id/ban
func AdminSetBan(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	id := c.Params("id")
	var body struct {
		Banned bool `json:"banned"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if err := db.DB.Model(&models.User{}).Where("id = ?", id).Update("is_banned", body.Banned).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update ban status"})
	}

	return c.JSON(fiber.Map{"ok": true})
}

// AdminSetAdmin PATCH /api/admin/users/:id/admin
func AdminSetAdmin(c *fiber.Ctx) error {
	admin, err := requireAdmin(c)
	if err != nil {
		return err
	}

	id := c.Params("id")
	if id == admin.ID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cannot change your own admin status"})
	}

	var body struct {
		IsAdmin bool `json:"isAdmin"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if err := db.DB.Model(&models.User{}).Where("id = ?", id).Update("is_admin", body.IsAdmin).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update admin status"})
	}

	return c.JSON(fiber.Map{"ok": true})
}

// AdminListProvidedModels GET /api/admin/provided-models
func AdminListProvidedModels(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	var models_ []models.ProvidedModel
	db.DB.Order("created_at desc").Find(&models_)

	result := make([]fiber.Map, len(models_))
	for i, m := range models_ {
		result[i] = fiber.Map{
			"id":           m.ID,
			"name":         m.Name,
			"modelId":      m.ModelID,
			"provider":     m.Provider,
			"description":  m.Description,
			"systemPrompt": m.SystemPrompt,
			"creditCost":   m.CreditCost,
			"tier":         m.Tier,
			"isActive":     m.IsActive,
			"createdAt":    m.CreatedAt,
		}
	}
	return c.JSON(result)
}

// AdminCreateProvidedModel POST /api/admin/provided-models
func AdminCreateProvidedModel(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	var body struct {
		Name         string `json:"name"`
		ModelID      string `json:"modelId"`
		Provider     string `json:"provider"`
		Description  string `json:"description"`
		SystemPrompt string `json:"systemPrompt"`
		CreditCost   int    `json:"creditCost"`
		Tier         string `json:"tier"`
		IsActive     bool   `json:"isActive"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	pm := models.ProvidedModel{
		Name:         body.Name,
		ModelID:      body.ModelID,
		Provider:     body.Provider,
		Description:  body.Description,
		SystemPrompt: body.SystemPrompt,
		CreditCost:   body.CreditCost,
		Tier:         body.Tier,
		IsActive:     body.IsActive,
	}
	if err := db.DB.Create(&pm).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create provided model"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":   pm.ID,
		"name": pm.Name,
	})
}

// AdminUpdateProvidedModel PATCH /api/admin/provided-models/:id
func AdminUpdateProvidedModel(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	id := c.Params("id")
	var body map[string]interface{}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	allowed := map[string]string{
		"name": "name", "modelId": "model_id", "provider": "provider",
		"description": "description", "systemPrompt": "system_prompt",
		"creditCost": "credit_cost", "tier": "tier", "isActive": "is_active",
	}
	updates := map[string]interface{}{}
	for k, col := range allowed {
		if v, ok := body[k]; ok {
			updates[col] = v
		}
	}
	if len(updates) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "no fields to update"})
	}

	if err := db.DB.Model(&models.ProvidedModel{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update provided model"})
	}

	return c.JSON(fiber.Map{"ok": true})
}

// AdminDeleteProvidedModel DELETE /api/admin/provided-models/:id
func AdminDeleteProvidedModel(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	id := c.Params("id")
	if err := db.DB.Unscoped().Delete(&models.ProvidedModel{}, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete provided model"})
	}

	return c.JSON(fiber.Map{"ok": true})
}

// AdminListCreditPacks GET /api/admin/credit-packs
func AdminListCreditPacks(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	var packs []models.CreditPack
	db.DB.Order("created_at desc").Find(&packs)

	result := make([]fiber.Map, len(packs))
	for i, p := range packs {
		result[i] = fiber.Map{
			"id":            p.ID,
			"name":          p.Name,
			"credits":       p.Credits,
			"priceUSD":      p.PriceUSD,
			"paddlePriceId": p.PaddlePriceID,
			"isActive":      p.IsActive,
			"createdAt":     p.CreatedAt,
		}
	}
	return c.JSON(result)
}

// AdminCreateCreditPack POST /api/admin/credit-packs
func AdminCreateCreditPack(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	var body struct {
		Name          string  `json:"name"`
		Credits       int     `json:"credits"`
		PriceUSD      float64 `json:"priceUSD"`
		PaddlePriceID string  `json:"paddlePriceId"`
		IsActive      bool    `json:"isActive"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	pack := models.CreditPack{
		Name:          body.Name,
		Credits:       body.Credits,
		PriceUSD:      body.PriceUSD,
		PaddlePriceID: body.PaddlePriceID,
		IsActive:      body.IsActive,
	}
	if err := db.DB.Create(&pack).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create credit pack"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":   pack.ID,
		"name": pack.Name,
	})
}

// AdminUpdateCreditPack PATCH /api/admin/credit-packs/:id
func AdminUpdateCreditPack(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	id := c.Params("id")
	var body map[string]interface{}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	allowed := map[string]string{
		"name": "name", "credits": "credits", "priceUSD": "price_usd",
		"paddlePriceId": "paddle_price_id", "isActive": "is_active",
	}
	updates := map[string]interface{}{}
	for k, col := range allowed {
		if v, ok := body[k]; ok {
			updates[col] = v
		}
	}
	if len(updates) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "no fields to update"})
	}

	if err := db.DB.Model(&models.CreditPack{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update credit pack"})
	}

	return c.JSON(fiber.Map{"ok": true})
}

// AdminDeleteCreditPack DELETE /api/admin/credit-packs/:id
func AdminDeleteCreditPack(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	id := c.Params("id")
	if err := db.DB.Unscoped().Delete(&models.CreditPack{}, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete credit pack"})
	}

	return c.JSON(fiber.Map{"ok": true})
}

// AdminListGames GET /api/admin/games
func AdminListGames(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	status := c.Query("status")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	query := db.DB.Model(&models.Game{})
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	query.Count(&total)

	var games []models.Game
	query.Order("created_at desc").Offset(offset).Limit(limit).Find(&games)

	result := make([]fiber.Map, len(games))
	for i, g := range games {
		result[i] = fiber.Map{
			"id":          g.ID,
			"title":       g.Title,
			"status":      g.Status,
			"result":      g.Result,
			"playerCount": g.PlayerCount,
			"createdAt":   g.CreatedAt,
			"finishedAt":  g.FinishedAt,
		}
	}

	return c.JSON(fiber.Map{
		"games": result,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// AdminForceEndGame POST /api/admin/games/:id/force-end
func AdminForceEndGame(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	id := c.Params("id")
	var game models.Game
	if err := db.DB.First(&game, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "game not found"})
	}
	if game.Status != "playing" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "game is not playing"})
	}

	now := time.Now()
	draw := "draw"
	db.DB.Model(&models.Game{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":      "finished",
		"result":      draw,
		"finished_at": now,
	})
	db.DB.Model(&models.Room{}).Where("id = ?", game.RoomID).Update("status", "waiting")

	return c.JSON(fiber.Map{"ok": true})
}

// AdminListBots GET /api/admin/bots
func AdminListBots(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	q := c.Query("q")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	type BotWithOwner struct {
		models.Bot
		OwnerUsername string
		OwnerEmail   string
	}

	query := db.DB.Table("bots").
		Select("bots.*, users.username as owner_username, users.email as owner_email").
		Joins("LEFT JOIN users ON users.id = bots.user_id").
		Where("bots.deleted_at IS NULL")
	if q != "" {
		like := "%" + q + "%"
		query = query.Where("bots.name ILIKE ? OR users.username ILIKE ? OR users.email ILIKE ?", like, like, like)
	}

	var total int64
	query.Count(&total)

	var bots []BotWithOwner
	query.Order("bots.created_at desc").Offset(offset).Limit(limit).Scan(&bots)

	result := make([]fiber.Map, len(bots))
	for i, b := range bots {
		result[i] = fiber.Map{
			"id":         b.ID,
			"name":       b.Name,
			"ownerEmail": b.OwnerEmail,
			"ownerUsername": b.OwnerUsername,
			"isDisabled": b.IsDisabled,
			"createdAt":  b.CreatedAt,
		}
	}

	return c.JSON(fiber.Map{
		"bots":  result,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// AdminDisableBot PATCH /api/admin/bots/:id/disable
func AdminDisableBot(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	id := c.Params("id")
	var body struct {
		Disabled bool `json:"disabled"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if err := db.DB.Model(&models.Bot{}).Where("id = ?", id).Update("is_disabled", body.Disabled).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update bot"})
	}

	return c.JSON(fiber.Map{"ok": true})
}

// AdminListTransactions GET /api/admin/transactions
func AdminListTransactions(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	userID := c.Query("userId")
	txType := c.Query("type")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	type TxWithEmail struct {
		models.CreditTransaction
		UserEmail string
	}

	query := db.DB.Table("credit_transactions").
		Select("credit_transactions.*, users.email as user_email").
		Joins("LEFT JOIN users ON users.id = credit_transactions.user_id")
	if userID != "" {
		query = query.Where("credit_transactions.user_id = ?", userID)
	}
	if txType != "" {
		query = query.Where("credit_transactions.type = ?", txType)
	}

	var total int64
	query.Count(&total)

	var txns []TxWithEmail
	query.Order("credit_transactions.created_at desc").Offset(offset).Limit(limit).Scan(&txns)

	result := make([]fiber.Map, len(txns))
	for i, t := range txns {
		result[i] = fiber.Map{
			"id":          t.ID,
			"userEmail":   t.UserEmail,
			"userId":      t.UserID,
			"amount":      t.Amount,
			"type":        t.Type,
			"description": t.Description,
			"createdAt":   t.CreatedAt,
		}
	}

	return c.JSON(fiber.Map{
		"transactions": result,
		"total":        total,
		"page":         page,
		"limit":        limit,
	})
}

// AdminListReplays GET /api/admin/replays
func AdminListReplays(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var total int64
	db.DB.Model(&models.Game{}).Where("status = ?", "finished").Count(&total)

	var games []models.Game
	db.DB.Where("status = ?", "finished").Order("created_at desc").Offset(offset).Limit(limit).Find(&games)

	result := make([]fiber.Map, len(games))
	for i, g := range games {
		result[i] = fiber.Map{
			"id":          g.ID,
			"title":       g.Title,
			"playerCount": g.PlayerCount,
			"result":      g.Result,
			"viewCount":   g.ViewCount,
			"likeCount":   g.LikeCount,
			"createdAt":   g.CreatedAt,
		}
	}

	return c.JSON(fiber.Map{
		"replays": result,
		"total":   total,
		"page":    page,
		"limit":   limit,
	})
}

// AdminDeleteReplay DELETE /api/admin/replays/:id
func AdminDeleteReplay(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	id := c.Params("id")

	// 게임 액션 먼저 삭제, 그 다음 게임 레코드 삭제
	db.DB.Where("game_id = ?", id).Delete(&models.GameAction{})
	db.DB.Where("game_id = ?", id).Delete(&models.GamePlayer{})
	db.DB.Where("game_id = ?", id).Delete(&models.ReplayLike{})
	db.DB.Where("game_id = ?", id).Delete(&models.ReplayFavorite{})
	db.DB.Delete(&models.Game{}, "id = ?", id)

	return c.JSON(fiber.Map{"ok": true})
}

// ---- LLM Provider Keys ----

// AdminListProviderKeys GET /api/admin/provider-keys
func AdminListProviderKeys(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	var keys []models.LLMProviderKey
	db.DB.Order("provider asc").Find(&keys)

	result := make([]fiber.Map, len(keys))
	for i, k := range keys {
		// API Key 마스킹
		masked := k.APIKey
		if len(masked) > 8 {
			masked = masked[:4] + "..." + masked[len(masked)-4:]
		}
		result[i] = fiber.Map{
			"id":        k.ID,
			"provider":  k.Provider,
			"apiKey":    masked,
			"baseUrl":   k.BaseURL,
			"createdAt": k.CreatedAt,
		}
	}
	return c.JSON(result)
}

// AdminCreateProviderKey POST /api/admin/provider-keys
func AdminCreateProviderKey(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	var body struct {
		Provider string `json:"provider"`
		APIKey   string `json:"apiKey"`
		BaseURL  string `json:"baseUrl"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if body.Provider == "" || body.APIKey == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "provider and apiKey are required"})
	}

	key := models.LLMProviderKey{
		Provider: body.Provider,
		APIKey:   body.APIKey,
		BaseURL:  body.BaseURL,
	}
	if err := db.DB.Create(&key).Error; err != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "provider key already exists"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"id": key.ID, "provider": key.Provider})
}

// AdminUpdateProviderKey PATCH /api/admin/provider-keys/:id
func AdminUpdateProviderKey(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	id := c.Params("id")
	var body struct {
		APIKey  *string `json:"apiKey"`
		BaseURL *string `json:"baseUrl"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	updates := map[string]any{}
	if body.APIKey != nil {
		updates["api_key"] = *body.APIKey
	}
	if body.BaseURL != nil {
		updates["base_url"] = *body.BaseURL
	}
	if len(updates) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "no fields to update"})
	}

	if err := db.DB.Model(&models.LLMProviderKey{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update provider key"})
	}

	return c.JSON(fiber.Map{"ok": true})
}

// ---- Paddle Settings ----

// AdminGetPaddleSettings GET /api/admin/paddle-settings
func AdminGetPaddleSettings(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	keys := []string{"paddle_api_key", "paddle_webhook_secret", "paddle_environment"}
	var settings []models.AppSetting
	db.DB.Where("key IN ?", keys).Find(&settings)

	settingMap := map[string]string{}
	for _, s := range settings {
		settingMap[s.Key] = s.Value
	}

	// API Key 마스킹
	apiKey := settingMap["paddle_api_key"]
	if apiKey == "" {
		apiKey = os.Getenv("PADDLE_API_KEY")
	}
	maskedKey := apiKey
	if len(maskedKey) > 8 {
		maskedKey = maskedKey[:4] + "..." + maskedKey[len(maskedKey)-4:]
	}

	env := settingMap["paddle_environment"]
	if env == "" {
		env = os.Getenv("PADDLE_ENVIRONMENT")
	}
	if env == "" {
		env = "sandbox"
	}

	// Webhook Secret 마스킹
	secret := settingMap["paddle_webhook_secret"]
	if secret == "" {
		secret = os.Getenv("PADDLE_WEBHOOK_SECRET")
	}
	maskedSecret := secret
	if len(maskedSecret) > 8 {
		maskedSecret = maskedSecret[:4] + "..." + maskedSecret[len(maskedSecret)-4:]
	}

	return c.JSON(fiber.Map{
		"apiKey":        maskedKey,
		"webhookSecret": maskedSecret,
		"environment":   env,
		"hasApiKey":     apiKey != "",
		"hasWebhookSecret": secret != "",
	})
}

// AdminUpdatePaddleSettings PUT /api/admin/paddle-settings
func AdminUpdatePaddleSettings(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	var body struct {
		APIKey        *string `json:"apiKey"`
		WebhookSecret *string `json:"webhookSecret"`
		Environment   *string `json:"environment"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	upsert := func(key, value string) {
		var s models.AppSetting
		if err := db.DB.First(&s, "key = ?", key).Error; err != nil {
			db.DB.Create(&models.AppSetting{Key: key, Value: value})
		} else {
			db.DB.Model(&s).Update("value", value)
		}
	}

	if body.APIKey != nil && *body.APIKey != "" {
		upsert("paddle_api_key", *body.APIKey)
	}
	if body.WebhookSecret != nil && *body.WebhookSecret != "" {
		upsert("paddle_webhook_secret", *body.WebhookSecret)
	}
	if body.Environment != nil {
		env := *body.Environment
		if env != "sandbox" && env != "production" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "environment must be 'sandbox' or 'production'"})
		}
		upsert("paddle_environment", env)
	}

	return c.JSON(fiber.Map{"ok": true})
}

// AdminDeleteProviderKey DELETE /api/admin/provider-keys/:id
func AdminDeleteProviderKey(c *fiber.Ctx) error {
	if _, err := requireAdmin(c); err != nil {
		return err
	}

	id := c.Params("id")
	if err := db.DB.Delete(&models.LLMProviderKey{}, "id = ?", id).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete provider key"})
	}

	return c.JSON(fiber.Map{"ok": true})
}
