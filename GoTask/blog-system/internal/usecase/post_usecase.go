package usecase

import (
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/domain/model"
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/domain/repository"
    "errors"
)

// PostUseCase 文章用例接口
type PostUseCase interface {
    Create(title, content string, userID uint) error
    GetByID(id uint) (*model.Post, error)
    GetAll(page, limit int) ([]*model.Post, int64, error)
    GetByUserID(userID uint, page, limit int) ([]*model.Post, int64, error)
    Update(id, userID uint, title, content string) error
    Delete(id, userID uint) error
}

type postUseCase struct {
    postRepo repository.PostRepository
    userRepo repository.UserRepository
}

// NewPostUseCase 创建文章用例
func NewPostUseCase(postRepo repository.PostRepository, userRepo repository.UserRepository) PostUseCase {
    return &postUseCase{
        postRepo: postRepo,
        userRepo: userRepo,
    }
}

// Create 创建文章
func (uc *postUseCase) Create(title, content string, userID uint) error {
    // 检查用户是否存在
    _, err := uc.userRepo.GetByID(userID)
    if err != nil {
        return errors.New("用户不存在")
    }

    post := &model.Post{
        Title:   title,
        Content: content,
        UserID:  userID,
    }

    return uc.postRepo.Create(post)
}

// GetByID 根据ID获取文章
func (uc *postUseCase) GetByID(id uint) (*model.Post, error) {
    return uc.postRepo.GetByID(id)
}

// GetAll 获取所有文章（分页）
func (uc *postUseCase) GetAll(page, limit int) ([]*model.Post, int64, error) {
    return uc.postRepo.GetAll(page, limit)
}

// GetByUserID 获取指定用户的所有文章（分页）
func (uc *postUseCase) GetByUserID(userID uint, page, limit int) ([]*model.Post, int64, error) {
    // 检查用户是否存在
    _, err := uc.userRepo.GetByID(userID)
    if err != nil {
        return nil, 0, errors.New("用户不存在")
    }

    return uc.postRepo.GetByUserID(userID, page, limit)
}

// Update 更新文章
func (uc *postUseCase) Update(id, userID uint, title, content string) error {
    post, err := uc.postRepo.GetByID(id)
    if err != nil {
        return err
    }

    // 检查是否是文章作者
    if post.UserID != userID {
        return errors.New("没有权限修改此文章")
    }

    post.Title = title
    post.Content = content

    return uc.postRepo.Update(post)
}

// Delete 删除文章
func (uc *postUseCase) Delete(id, userID uint) error {
    post, err := uc.postRepo.GetByID(id)
    if err != nil {
        return err
    }

    // 检查是否是文章作者
    if post.UserID != userID {
        return errors.New("没有权限删除此文章")
    }

    return uc.postRepo.Delete(id)
}