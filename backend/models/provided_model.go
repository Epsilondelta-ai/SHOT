package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ProvidedModel struct {
	ID          string `gorm:"primarykey"`
	Name        string // 표시 이름, 예: "Grok 4.1 Fast"
	ModelID     string // API 모델 ID, 예: "grok-4.1-fast"
	Provider    string // "xai", "openai", "anthropic", "google"
	Description string
	CreditCost  int    // 게임 당 크레딧
	Tier        string // "free", "basic", "standard", "advanced", "premium"
	IsActive    bool   `gorm:"default:true"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func (p *ProvidedModel) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	return nil
}
