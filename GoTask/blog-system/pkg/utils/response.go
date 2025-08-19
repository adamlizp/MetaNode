package utils

import (
    "github.com/gin-gonic/gin"
)

// Response 标准响应结构
type Response struct {
    Success bool        `json:"success"`
    Message string      `json:"message,omitempty"`
    Data    interface{} `json:"data,omitempty"`
    Error   string      `json:"error,omitempty"`
}

// RespondWithSuccess 返回成功响应
func RespondWithSuccess(c *gin.Context, statusCode int, data interface{}) {
    var message string
    
    // 根据状态码设置默认消息
    switch statusCode {
    case 200:
        message = "操作成功"
    case 201:
        message = "创建成功"
    default:
        message = "操作成功"
    }
    
    // 如果data是字符串，则将其作为消息
    if msg, ok := data.(string); ok {
        message = msg
        data = nil
    }
    
    c.JSON(statusCode, Response{
        Success: true,
        Message: message,
        Data:    data,
    })
}

// RespondWithError 返回错误响应
func RespondWithError(c *gin.Context, statusCode int, errorMsg string) {
    c.JSON(statusCode, Response{
        Success: false,
        Error:   errorMsg,
    })
}

// RespondWithPagination 返回分页响应
func RespondWithPagination(c *gin.Context, statusCode int, data interface{}, total int64, page, limit int) {
    c.JSON(statusCode, gin.H{
        "success": true,
        "data": data,
        "pagination": gin.H{
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + int64(limit) - 1) / int64(limit),
        },
    })
}

// RespondWithValidationError 返回验证错误响应
func RespondWithValidationError(c *gin.Context, field, message string) {
    c.JSON(400, gin.H{
        "success": false,
        "error": "验证错误",
        "validationErrors": []gin.H{
            {
                "field": field,
                "message": message,
            },
        },
    })
}

// RespondWithUnauthorized 返回未授权响应
func RespondWithUnauthorized(c *gin.Context) {
    c.JSON(401, Response{
        Success: false,
        Error:   "未授权访问",
    })
}

// RespondWithForbidden 返回禁止访问响应
func RespondWithForbidden(c *gin.Context) {
    c.JSON(403, Response{
        Success: false,
        Error:   "禁止访问",
    })
}

// RespondWithNotFound 返回资源未找到响应
func RespondWithNotFound(c *gin.Context, resourceType string) {
    c.JSON(404, Response{
        Success: false,
        Error:   resourceType + "不存在",
    })
}

// RespondWithServerError 返回服务器错误响应
func RespondWithServerError(c *gin.Context, err error) {
    errorMsg := "服务器内部错误"
    if err != nil {
        errorMsg = err.Error()
    }
    
    c.JSON(500, Response{
        Success: false,
        Error:   errorMsg,
    })
}