package persistence

import (
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/domain/model"
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/domain/repository"
    "errors"

    "gorm.io/gorm"
)

// commentRepository 评论仓储实现
type commentRepository struct {
    db *gorm.DB
}

// NewCommentRepository 创建评论仓储
func NewCommentRepository(db *gorm.DB) repository.CommentRepository {
    return &commentRepository{db: db}
}

// Create 创建评论
func (r *commentRepository) Create(comment *model.Comment) error {
    return r.db.Create(comment).Error
}

// GetByID 根据ID获取评论
func (r *commentRepository) GetByID(id uint) (*model.Comment, error) {
    var comment model.Comment
    if err := r.db.Preload("User").First(&comment, id).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, errors.New("评论不存在")
        }
        return nil, err
    }
    return &comment, nil
}

// GetByPostID 获取指定文章的所有评论（分页）
func (r *commentRepository) GetByPostID(postID uint, page, limit int) ([]*model.Comment, int64, error) {
    var comments []*model.Comment
    var total int64

    offset := (page - 1) * limit

    // 获取总数
    if err := r.db.Model(&model.Comment{}).Where("post_id = ?", postID).Count(&total).Error; err != nil {
        return nil, 0, err
    }

    // 获取分页数据
    if err := r.db.Preload("User").Where("post_id = ?", postID).Offset(offset).Limit(limit).Order("created_at desc").Find(&comments).Error; err != nil {
        return nil, 0, err
    }

    return comments, total, nil
}

// Delete 删除评论
func (r *commentRepository) Delete(id uint) error {
    return r.db.Delete(&model.Comment{}, id).Error
}