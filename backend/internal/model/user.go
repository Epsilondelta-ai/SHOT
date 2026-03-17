package model

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Email     string    `gorm:"uniqueIndex;not null"`
	Name      string    `gorm:"not null"`
	Password  string    `gorm:"not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
}
