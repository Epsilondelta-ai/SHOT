package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID           string    `gorm:"primaryKey;type:varchar(36)"`
	Email        string    `gorm:"uniqueIndex;size:255;not null"`
	Username     string    `gorm:"size:50;not null"`
	PasswordHash string    `gorm:"size:255"`
	GoogleID     string    `gorm:"uniqueIndex;size:255"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	return nil
}
