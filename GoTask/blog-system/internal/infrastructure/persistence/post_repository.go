package persistence

import (
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/domain/model"
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/domain/repository"
    "errors"

    "gorm.io/gorm"
)

// postRepository 文章仓储实现
type postRepository struct {
    db *gorm.DB
}

// NewPostRepository 创建文章仓储
func NewPostRepository(db *gorm.DB) repository.PostRepository {
    return &postRepository{db: db}
}

// Create 创建文章
func (r *postRepository) Create(post *model.Post) error {
    return r.db.Create(post).Error
}

// GetByID 根据ID获取文章
func (r *postRepository) GetByID(id uint) (*model.Post, error) {
    var post model.Post
    if err := r.db.Preload("User").First(&post, id).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, errors.New("文章不存在")
        }
        return nil, err
    }
    return &post, nil
}

// GetAll 获取所有文章（分页）
func (r *postRepository) GetAll(page, limit int) ([]*model.Post, int64, error) {
    var posts []*model.Post
    var total int64

    offset := (page - 1) * limit

    // 获取总数
    if err := r.db.Model(&model.Post{}).Count(&total).Error; err != nil {
        return nil, 0, err
    }

    // 获取分页数据
    if err := r.db.Preload("User").Offset(offset).Limit(limit).Order("created_at desc").Find(&posts).Error; err != nil {
        return nil, 0, err
    }

    return posts, total, nil
}

// GetByUserID 获取指定用户的所有文章（分页）
func (r *postRepository) GetByUserID(userID uint, page, limit int) ([]*model.Post, int64, error) {
    var posts []*model.Post
    var total int64

    offset := (page - 1) * limit

    // 获取总数
    if err := r.db.Model(&model.Post{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
        return nil, 0, err
    }

    // 获取分页数据
    if err := r.db.Preload("User").Where("user_id = ?", userID).Offset(offset).Limit(limit).Order("created_at desc").Find(&posts).Error; err != nil {
        return nil, 0, err
    }

    return posts, total, nil
}

// Update 更新文章
func (r *postRepository) Update(post *model.Post) error {
    return r.db.Save(post).Error
}

// Delete 删除文章
func (r *postRepository) Delete(id uint) error {
    // 删除文章时同时删除相关评论
    tx := r.db.Begin()
    if err := tx.Where("post_id = ?", id).Delete(&model.Comment{}).Error; err != nil {
        tx.Rollback()
        return err
    }
    if err := tx.Delete(&model.Post{}, id).Error; err != nil {
        tx.Rollback()
        return err
    }
    return tx.Commit().Error
}