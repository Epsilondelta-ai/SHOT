package db

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/epsilondelta/shot/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() error {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_USER", "shot"),
		getEnv("DB_PASSWORD", "shot"),
		getEnv("DB_NAME", "shot"),
		getEnv("DB_PORT", "5432"),
	)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.New(
			log.Default(),
			logger.Config{
				SlowThreshold:             200 * time.Millisecond,
				LogLevel:                  logger.Warn,
				IgnoreRecordNotFoundError: true,
				Colorful:                  true,
			},
		),
	})
	if err != nil {
		return err
	}

	return DB.AutoMigrate(&models.User{}, &models.Bot{}, &models.Room{}, &models.RoomMember{}, &models.Game{}, &models.GamePlayer{}, &models.GameAction{}, &models.ReplayLike{}, &models.ReplayFavorite{}, &models.UserFavorite{}, &models.CreditPack{}, &models.OfficialBot{}, &models.CreditTransaction{})
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
