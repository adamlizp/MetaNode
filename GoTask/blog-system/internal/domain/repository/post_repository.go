package repository

import (
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/domain/model"
)

// PostRepository 文章仓储接口
type PostRepository interface {
    Create(post *model.Post) error
    GetByID(id uint) (*model.Post, error)
    GetAll(page, limit int) ([]*model.Post, int64, error)
    GetByUserID(userID uint, page, limit int) ([]*model.Post, int64, error)
    Update(post *model.Post) error
    Delete(id uint) error
}