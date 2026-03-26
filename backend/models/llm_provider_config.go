package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// LLMProviderKey 는 LLM 프로바이더별 API Key를 저장한다.
type LLMProviderKey struct {
	ID        string `gorm:"primaryKey;type:varchar(36)"`
	Provider  string `gorm:"type:varchar(50);uniqueIndex;not null"` // "openai", "anthropic", "google", "xai"
	APIKey    string `gorm:"type:text;not null"`
	BaseURL   string `gorm:"type:text"` // 커스텀 엔드포인트 (선택)
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (k *LLMProviderKey) BeforeCreate(tx *gorm.DB) error {
	if k.ID == "" {
		k.ID = uuid.New().String()
	}
	return nil
}
