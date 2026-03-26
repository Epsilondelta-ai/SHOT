package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RoomMember struct {
	ID            string    `gorm:"primaryKey;type:varchar(36)"`
	RoomID        string    `gorm:"type:varchar(36);not null;index"`
	UserID        string    `gorm:"type:varchar(36);not null"` // for bots, this is the bot owner's ID
	BotID         string    `gorm:"type:varchar(50);default:''"`   // non-empty if bot (rulebot_ prefix + UUID = 44 chars)
	RuleBotName     string `gorm:"type:varchar(100);default:''"` // display name for rule-based bots
	ProvidedModelID string `gorm:"type:varchar(36);default:''"` // LLM Player인 경우 제공 모델 ID
	IsSpectator     bool   `gorm:"not null;default:false"`
	CanInviteBots bool      `gorm:"not null;default:false"`
	JoinedAt      time.Time
}

func (m *RoomMember) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	return nil
}
