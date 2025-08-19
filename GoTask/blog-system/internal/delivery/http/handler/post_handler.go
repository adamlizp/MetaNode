package handler

import (
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/usecase"
    "github.com/adamlizp/MetaNode/GoTask/blog-system/pkg/utils"
    "github.com/gin-gonic/gin"
    "net/http"
    "strconv"
)

// PostHandler 文章处理器
type PostHandler struct {
    postUsecase usecase.PostUseCase
}

// NewPostHandler 创建文章处理器
func NewPostHandler(postUsecase usecase.PostUseCase) *PostHandler {
    return &PostHandler{postUsecase: postUsecase}
}

// Create 创建文章
func (h *PostHandler) Create(c *gin.Context) {
    userID, exists := c.Get("userID")
    if !exists {
        utils.RespondWithError(c, http.StatusUnauthorized, "未授权")
        return
    }

    var req struct {
        Title   string `json:"title" binding:"required"`
        Content string `json:"content" binding:"required"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        utils.RespondWithError(c, http.StatusBadRequest, err.Error())
        return
    }

    err := h.postUsecase.Create(req.Title, req.Content, userID.(uint))
    if err != nil {
        utils.RespondWithError(c, http.StatusInternalServerError, err.Error())
        return
    }

    utils.RespondWithSuccess(c, http.StatusCreated, "创建成功")
}

// GetByID 根据ID获取文章
func (h *PostHandler) GetByID(c *gin.Context) {
    id, err := strconv.ParseUint(c.Param("id"), 10, 32)
    if err != nil {
        utils.RespondWithError(c, http.StatusBadRequest, "无效的ID")
        return
    }

    post, err := h.postUsecase.GetByID(uint(id))
    if err != nil {
        utils.RespondWithError(c, http.StatusNotFound, err.Error())
        return
    }

    utils.RespondWithSuccess(c, http.StatusOK, post)
}

// GetAll 获取所有文章
func (h *PostHandler) GetAll(c *gin.Context) {
    page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
    limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

    posts, total, err := h.postUsecase.GetAll(page, limit)
    if err != nil {
        utils.RespondWithError(c, http.StatusInternalServerError, err.Error())
        return
    }

    utils.RespondWithSuccess(c, http.StatusOK, gin.H{
        "posts": posts,
        "total": total,
        "page":  page,
        "limit": limit,
    })
}

// GetByUserID 获取指定用户的所有文章
func (h *PostHandler) GetByUserID(c *gin.Context) {
    userID, err := strconv.ParseUint(c.Param("user_id"), 10, 32)
    if err != nil {
        utils.RespondWithError(c, http.StatusBadRequest, "无效的用户ID")
        return
    }

    page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
    limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

    posts, total, err := h.postUsecase.GetByUserID(uint(userID), page, limit)
    if err != nil {
        utils.RespondWithError(c, http.StatusInternalServerError, err.Error())
        return
    }

    utils.RespondWithSuccess(c, http.StatusOK, gin.H{
        "posts": posts,
        "total": total,
        "page":  page,
        "limit": limit,
    })
}

// Update 更新文章
func (h *PostHandler) Update(c *gin.Context) {
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

    var req struct {
        Title   string `json:"title" binding:"required"`
        Content string `json:"content" binding:"required"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        utils.RespondWithError(c, http.StatusBadRequest, err.Error())
        return
    }

    err = h.postUsecase.Update(uint(id), userID.(uint), req.Title, req.Content)
    if err != nil {
        utils.RespondWithError(c, http.StatusInternalServerError, err.Error())
        return
    }

    utils.RespondWithSuccess(c, http.StatusOK, "更新成功")
}

// Delete 删除文章
func (h *PostHandler) Delete(c *gin.Context) {
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

    err = h.postUsecase.Delete(uint(id), userID.(uint))
    if err != nil {
        utils.RespondWithError(c, http.StatusInternalServerError, err.Error())
        return
    }

    utils.RespondWithSuccess(c, http.StatusOK, "删除成功")
}
