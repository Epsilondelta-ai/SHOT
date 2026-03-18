package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RoomMember struct {
	ID       string    `gorm:"primaryKey;type:varchar(36)"`
	RoomID   string    `gorm:"type:varchar(36);not null;index"`
	UserID   string    `gorm:"type:varchar(36);not null"`
	JoinedAt time.Time
}

func (m *RoomMember) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	return nil
}
