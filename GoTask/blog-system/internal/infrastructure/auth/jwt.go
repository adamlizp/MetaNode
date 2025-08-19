package auth

import (
    "github.com/adamlizp/MetaNode/GoTask/blog-system/config"
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/domain/model"
    "errors"
    "fmt"
    "time"

    "github.com/golang-jwt/jwt/v4"
)

// JWTClaims 自定义JWT声明
type JWTClaims struct {
    UserID   uint   `json:"user_id"`
    Username string `json:"username"`
    jwt.RegisteredClaims
}

// JWTService JWT服务接口
type JWTService interface {
    GenerateToken(user *model.User) (string, error)
    ValidateToken(tokenString string) (*JWTClaims, error)
}

type jwtService struct {
    secretKey string
    expire    int // 过期时间（小时）
}

// NewJWTService 创建JWT服务
func NewJWTService(cfg *config.Config) JWTService {
    return &jwtService{
        secretKey: cfg.JWTSecret,
        expire:    cfg.JWTExpirationHours,
    }
}

// GenerateToken 生成JWT令牌
func (s *jwtService) GenerateToken(user *model.User) (string, error) {
    // 设置JWT声明
    claims := JWTClaims{
        UserID:   user.ID,
        Username: user.Username,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * time.Duration(s.expire))),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
        },
    }

    // 创建令牌
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

    // 签名令牌
    tokenString, err := token.SignedString([]byte(s.secretKey))
    if err != nil {
        return "", err
    }

    return tokenString, nil
}

// ValidateToken 验证JWT令牌
func (s *jwtService) ValidateToken(tokenString string) (*JWTClaims, error) {
    // 解析令牌
    token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
        // 验证签名方法
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("非法的签名方法: %v", token.Header["alg"])
        }
        return []byte(s.secretKey), nil
    })

    if err != nil {
        return nil, err
    }

    // 验证令牌有效性
    if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
        return claims, nil
    }

    return nil, errors.New("无效的令牌")
}