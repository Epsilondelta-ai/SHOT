package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// LLMBot 은 유저가 저장한 LLM Player 설정이다.
// 운영측 제공 모델 + 유저가 지어준 이름 + 유저 커스텀 프롬프트로 구성된다.
type LLMBot struct {
	ID              string         `gorm:"primaryKey;type:varchar(36)"`
	UserID          string         `gorm:"type:varchar(36);not null;index"`
	Name            string         `gorm:"size:100;not null"`           // 유저가 지어준 이름 (예: "베어")
	ProvidedModelID string         `gorm:"type:varchar(36);not null"`   // 운영측 모델 참조
	UserPrompt      string         `gorm:"type:text"`                   // 유저 커스텀 프롬프트
	CreatedAt       time.Time
	UpdatedAt       time.Time
	DeletedAt       gorm.DeletedAt `gorm:"index"`
}

func (b *LLMBot) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.New().String()
	}
	return nil
}
