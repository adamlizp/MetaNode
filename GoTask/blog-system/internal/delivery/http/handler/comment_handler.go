package handler

import (
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/usecase"
    "github.com/adamlizp/MetaNode/GoTask/blog-system/pkg/utils"
    "github.com/gin-gonic/gin"
    "net/http"
    "strconv"
)

// CommentHandler 评论处理器
type CommentHandler struct {
    commentUsecase usecase.CommentUseCase
}

// NewCommentHandler 创建评论处理器
func NewCommentHandler(commentUsecase usecase.CommentUseCase) *CommentHandler {
    return &CommentHandler{commentUsecase: commentUsecase}
}

// Create 创建评论
func (h *CommentHandler) Create(c *gin.Context) {
    userID, exists := c.Get("userID")
    if !exists {
        utils.RespondWithError(c, http.StatusUnauthorized, "未授权")
        return
    }

    postID, err := strconv.ParseUint(c.Param("post_id"), 10, 32)
    if err != nil {
        utils.RespondWithError(c, http.StatusBadRequest, "无效的文章ID")
        return
    }

    var req struct {
        Content string `json:"content" binding:"required"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        utils.RespondWithError(c, http.StatusBadRequest, err.Error())
        return
    }

    err = h.commentUsecase.Create(req.Content, userID.(uint), uint(postID))
    if err != nil {
        utils.RespondWithError(c, http.StatusInternalServerError, err.Error())
        return
    }

    utils.RespondWithSuccess(c, http.StatusCreated, "评论成功")
}

// GetByPostID 获取指定文章的所有评论
func (h *CommentHandler) GetByPostID(c *gin.Context) {
    postID, err := strconv.ParseUint(c.Param("post_id"), 10, 32)
    if err != nil {
        utils.RespondWithError(c, http.StatusBadRequest, "无效的文章ID")
        return
    }

    page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
    limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

    comments, total, err := h.commentUsecase.GetByPostID(uint(postID), page, limit)
    if err != nil {
        utils.RespondWithError(c, http.StatusInternalServerError, err.Error())
        return
    }

    utils.RespondWithSuccess(c, http.StatusOK, gin.H{
        "comments": comments,
        "total":    total,
        "page":     page,
        "limit":    limit,
    })
}

// Delete 删除评论
func (h *CommentHandler) Delete(c *gin.Context) {
    userID, exists := c.Get("userID")
    if !exists {
        utils.RespondWithError(c, http.StatusUnauthorized, "未授权")
        return
    }

    id, err := strconv.ParseUint(c.Param("id"), 10, 32)
    if err != nil {
        utils.RespondWithError(c, http.StatusBadRequest, "无效的ID")
        return
    }

    err = h.commentUsecase.Delete(uint(id), userID.(uint))
    if err != nil {
        utils.RespondWithError(c, http.StatusInternalServerError, err.Error())
        return
    }

    utils.RespondWithSuccess(c, http.StatusOK, "删除成功")
}