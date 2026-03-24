package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CreditPack struct {
	ID            string  `gorm:"primarykey"`
	Name          string  // "Starter", "Gamer", "Enthusiast", "Champion"
	Credits       int
	PriceUSD      float64
	PaddlePriceID string
	IsActive      bool `gorm:"default:true"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func (c *CreditPack) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}
