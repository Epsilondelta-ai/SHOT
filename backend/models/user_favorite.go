package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserFavorite struct {
	ID         string    `gorm:"primaryKey;type:varchar(36)"`
	UserID     string    `gorm:"type:varchar(36);not null;uniqueIndex:idx_user_fav"`
	TargetType string    `gorm:"type:varchar(10);not null;uniqueIndex:idx_user_fav"` // "user" or "bot"
	TargetID   string    `gorm:"type:varchar(36);not null;uniqueIndex:idx_user_fav"`
	CreatedAt  time.Time
}

func (uf *UserFavorite) BeforeCreate(tx *gorm.DB) error {
	if uf.ID == "" {
		uf.ID = uuid.New().String()
	}
	return nil
}
