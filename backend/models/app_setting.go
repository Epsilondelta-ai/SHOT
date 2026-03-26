package models

import "time"

// AppSetting 은 런타임에 변경 가능한 애플리케이션 설정을 저장한다.
type AppSetting struct {
	Key       string    `gorm:"primaryKey;type:varchar(100)"`
	Value     string    `gorm:"type:text;not null;default:''"`
	UpdatedAt time.Time `gorm:"autoUpdateTime"`
}
