package usecase

import (
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/domain/model"
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/domain/repository"
    "errors"
)

// CommentUseCase 评论用例接口
type CommentUseCase interface {
    Create(content string, userID, postID uint) error
    GetByID(id uint) (*model.Comment, error)
    GetByPostID(postID uint, page, limit int) ([]*model.Comment, int64, error)
    Delete(id, userID uint) error
}

type commentUseCase struct {
    commentRepo repository.CommentRepository
    postRepo    repository.PostRepository
    userRepo    repository.UserRepository
}

// NewCommentUseCase 创建评论用例
func NewCommentUseCase(commentRepo repository.CommentRepository, postRepo repository.PostRepository, userRepo repository.UserRepository) CommentUseCase {
    return &commentUseCase{
        commentRepo: commentRepo,
        postRepo:    postRepo,
        userRepo:    userRepo,
    }
}

// Create 创建评论
func (uc *commentUseCase) Create(content string, userID, postID uint) error {
    // 检查用户是否存在
    _, err := uc.userRepo.GetByID(userID)
    if err != nil {
        return errors.New("用户不存在")
    }

    // 检查文章是否存在
    _, err = uc.postRepo.GetByID(postID)
    if err != nil {
        return errors.New("文章不存在")
    }

    comment := &model.Comment{
        Content: content,
        UserID:  userID,
        PostID:  postID,
    }

    return uc.commentRepo.Create(comment)
}

// GetByID 根据ID获取评论
func (uc *commentUseCase) GetByID(id uint) (*model.Comment, error) {
    return uc.commentRepo.GetByID(id)
}

// GetByPostID 获取指定文章的所有评论（分页）
func (uc *commentUseCase) GetByPostID(postID uint, page, limit int) ([]*model.Comment, int64, error) {
    // 检查文章是否存在
    _, err := uc.postRepo.GetByID(postID)
    if err != nil {
        return nil, 0, errors.New("文章不存在")
    }

    return uc.commentRepo.GetByPostID(postID, page, limit)
}

// Delete 删除评论
func (uc *commentUseCase) Delete(id, userID uint) error {
    comment, err := uc.commentRepo.GetByID(id)
    if err != nil {
        return err
    }

    // 检查是否是评论作者
    if comment.UserID != userID {
        return errors.New("没有权限删除此评论")
    }

    return uc.commentRepo.Delete(id)
}