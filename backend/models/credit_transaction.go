package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CreditTransaction struct {
	ID                  string `gorm:"primarykey"`
	UserID              string `gorm:"index"`
	Amount              int    // 양수 = 구매, 음수 = 사용
	Type                string // "purchase", "use_bot", "refund", "bonus"
	PaddleTransactionID string
	Description         string // 예: "Gamer Pack", "Bot: Grok 4.1 Fast"
	CreatedAt           time.Time
}

func (c *CreditTransaction) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}
