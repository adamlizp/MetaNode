package repository

import (
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/domain/model"
)

// CommentRepository 评论仓储接口
type CommentRepository interface {
    Create(comment *model.Comment) error
    GetByID(id uint) (*model.Comment, error)
    GetByPostID(postID uint, page, limit int) ([]*model.Comment, int64, error)
    Delete(id uint) error
}