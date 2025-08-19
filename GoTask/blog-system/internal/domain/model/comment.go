package model

import (
	"time"
)

// Comment 评论模型
type Comment struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Content   string    `json:"content" gorm:"not null"`
	UserID    uint      `json:"user_id"`
	User      User      `json:"user" gorm:"foreignKey:UserID"`
	PostID    uint      `json:"post_id"`
	Post      Post      `json:"post" gorm:"foreignKey:PostID"`
	CreatedAt time.Time `json:"created_at"`
}
