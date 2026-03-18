package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Room struct {
	ID          string    `gorm:"primaryKey;type:varchar(36)"`
	Name        string    `gorm:"size:100;not null"`
	HostID      string    `gorm:"type:varchar(36);not null;index"`
	Status      string    `gorm:"size:20;not null;default:'waiting'"`
	MaxPlayers  int       `gorm:"not null;default:8"`
	PlayerCount int       `gorm:"not null;default:1"`
	IsPrivate   bool      `gorm:"not null;default:false"`
	Password    string    `gorm:"size:100"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func (r *Room) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.New().String()
	}
	return nil
}
