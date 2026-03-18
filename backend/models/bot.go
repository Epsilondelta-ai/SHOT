package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Bot struct {
	ID        string    `gorm:"primaryKey;type:varchar(36)"`
	UserID    string    `gorm:"type:varchar(36);not null;index"`
	Name      string    `gorm:"size:100;not null"`
	AvatarURL string    `gorm:"type:text"`
	APIKey    string    `gorm:"uniqueIndex;size:64;not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (b *Bot) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.New().String()
	}
	return nil
}
