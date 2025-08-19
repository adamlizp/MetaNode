package handler

import (
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/usecase"
    "github.com/adamlizp/MetaNode/GoTask/blog-system/pkg/utils"
    "github.com/gin-gonic/gin"
    "net/http"
    "strconv"
)

// UserHandler 用户处理器
type UserHandler struct {
    userUsecase usecase.UserUseCase
}

// NewUserHandler 创建用户处理器
func NewUserHandler(userUsecase usecase.UserUseCase) *UserHandler {
    return &UserHandler{userUsecase: userUsecase}
}

// Register 用户注册
func (h *UserHandler) Register(c *gin.Context) {
    var req struct {
        Username string `json:"username" binding:"required"`
        Password string `json:"password" binding:"required"`
        Email    string `json:"email" binding:"required,email"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        utils.RespondWithError(c, http.StatusBadRequest, err.Error())
        return
    }

    err := h.userUsecase.Register(req.Username, req.Password, req.Email)
    if err != nil {
        utils.RespondWithError(c, http.StatusInternalServerError, err.Error())
        return
    }

    utils.RespondWithSuccess(c, http.StatusCreated, "注册成功")
}

// Login 用户登录
func (h *UserHandler) Login(c *gin.Context) {
    var req struct {
        Username string `json:"username" binding:"required"`
        Password string `json:"password" binding:"required"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        utils.RespondWithError(c, http.StatusBadRequest, err.Error())
        return
    }

    token, err := h.userUsecase.Login(req.Username, req.Password)
    if err != nil {
        utils.RespondWithError(c, http.StatusUnauthorized, err.Error())
        return
    }

    utils.RespondWithSuccess(c, http.StatusOK, gin.H{"token": token})
}

// GetProfile 获取用户资料
func (h *UserHandler) GetProfile(c *gin.Context) {
    userID, exists := c.Get("userID")
    if !exists {
        utils.RespondWithError(c, http.StatusUnauthorized, "未授权")
        return
    }

    user, err := h.userUsecase.GetProfile(userID.(uint))
    if err != nil {
        utils.RespondWithError(c, http.StatusInternalServerError, err.Error())
        return
    }

    utils.RespondWithSuccess(c, http.StatusOK, user)
}

// UpdateProfile 更新用户资料
func (h *UserHandler) UpdateProfile(c *gin.Context) {
    userID, exists := c.Get("userID")
    if !exists {
        utils.RespondWithError(c, http.StatusUnauthorized, "未授权")
        return
    }

    var req struct {
        Username string `json:"username" binding:"required"`
        Email    string `json:"email" binding:"required,email"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        utils.RespondWithError(c, http.StatusBadRequest, err.Error())
        return
    }

    err := h.userUsecase.UpdateProfile(userID.(uint), req.Username, req.Email)
    if err != nil {
        utils.RespondWithError(c, http.StatusInternalServerError, err.Error())
        return
    }

    utils.RespondWithSuccess(c, http.StatusOK, "更新成功")
}

// DeleteUser 删除用户账号
func (h *UserHandler) DeleteUser(c *gin.Context) {
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
    
    // 确保只能删除自己的账号
    if userID.(uint) != uint(id) {
        utils.RespondWithError(c, http.StatusForbidden, "没有权限删除其他用户")
        return
    }
    
    err = h.userUsecase.DeleteUser(uint(id))
    if err != nil {
        utils.RespondWithError(c, http.StatusInternalServerError, err.Error())
        return
    }
    
    utils.RespondWithSuccess(c, http.StatusOK, "账号已删除")
}