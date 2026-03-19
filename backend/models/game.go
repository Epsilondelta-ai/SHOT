package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Game struct {
	ID          string     `gorm:"primaryKey;type:varchar(36)"`
	RoomID      string     `gorm:"type:varchar(36);not null;index"`
	Status      string     `gorm:"size:20;not null;default:'playing'"` // playing | finished
	Result      *string    `gorm:"size:20"`                            // agent_win | spy_win | draw
	PlayerCount int        `gorm:"not null"`
	TurnCount   int        `gorm:"not null;default:0"`
	MaxTurns    int        `gorm:"not null"`
	CreatedAt   time.Time
	FinishedAt  *time.Time
}

func (g *Game) BeforeCreate(tx *gorm.DB) error {
	if g.ID == "" {
		g.ID = uuid.New().String()
	}
	return nil
}

type GamePlayer struct {
	ID        string `gorm:"primaryKey;type:varchar(36)"`
	GameID    string `gorm:"type:varchar(36);not null;index"`
	UserID    string `gorm:"type:varchar(36);not null"`
	BotID     string `gorm:"type:varchar(36);default:''"`
	Role      string `gorm:"size:10;not null"` // agent | spy
	StartHP   int    `gorm:"not null;default:3"`
	Username  string `gorm:"size:100;not null"`
	AvatarURL string `gorm:"type:text"`
}

func (p *GamePlayer) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	return nil
}

type GameAction struct {
	ID         string    `gorm:"primaryKey;type:varchar(36)"`
	GameID     string    `gorm:"type:varchar(36);not null;index"`
	Turn       int       `gorm:"not null"`
	Seq        int       `gorm:"not null"`
	ActorID    string    `gorm:"type:varchar(36);not null"`
	ActionType string    `gorm:"size:30;not null"`
	TargetID   string    `gorm:"type:varchar(36)"`
	Payload    string    `gorm:"type:text"` // JSON
	CreatedAt  time.Time
}

func (a *GameAction) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	return nil
}
