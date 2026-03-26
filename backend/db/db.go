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

	// 기존 official_bots 테이블을 provided_models로 이름 변경
	DB.Exec("ALTER TABLE IF EXISTS official_bots RENAME TO provided_models")

	return DB.AutoMigrate(&models.User{}, &models.Bot{}, &models.Room{}, &models.RoomMember{}, &models.Game{}, &models.GamePlayer{}, &models.GameAction{}, &models.ReplayLike{}, &models.ReplayFavorite{}, &models.UserFavorite{}, &models.CreditPack{}, &models.ProvidedModel{}, &models.CreditTransaction{}, &models.LLMProviderKey{}, &models.AppSetting{})
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// GetSetting 은 DB에서 설정값을 조회하고, 없으면 환경변수, 그것도 없으면 fallback을 반환한다.
func GetSetting(key, envKey, fallback string) string {
	var s models.AppSetting
	if err := DB.First(&s, "key = ?", key).Error; err == nil && s.Value != "" {
		return s.Value
	}
	if envKey != "" {
		if v := os.Getenv(envKey); v != "" {
			return v
		}
	}
	return fallback
}
