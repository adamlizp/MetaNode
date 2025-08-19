package middleware

import (
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/infrastructure/auth"
    "github.com/adamlizp/MetaNode/GoTask/blog-system/pkg/utils"
    "github.com/gin-gonic/gin"
    "net/http"
    "strings"
)

// AuthMiddleware 认证中间件
func AuthMiddleware(jwtService auth.JWTService) gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            utils.RespondWithError(c, http.StatusUnauthorized, "未提供认证令牌")
            c.Abort()
            return
        }

        // 检查Bearer前缀
        parts := strings.Split(authHeader, " ")
        if len(parts) != 2 || parts[0] != "Bearer" {
            utils.RespondWithError(c, http.StatusUnauthorized, "认证格式无效")
            c.Abort()
            return
        }

        // 验证令牌
        claims, err := jwtService.ValidateToken(parts[1])
        if err != nil {
            utils.RespondWithError(c, http.StatusUnauthorized, "无效的令牌")
            c.Abort()
            return
        }

        // 将用户ID存储在上下文中
        c.Set("userID", claims.UserID)
        c.Next()
    }
}