package usecase

import (
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/domain/model"
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/domain/repository"
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/infrastructure/auth"
    "errors"
    "golang.org/x/crypto/bcrypt"
)

// UserUseCase 用户用例接口
type UserUseCase interface {
    Register(username, password, email string) error
    Login(username, password string) (string, error)
    GetProfile(userID uint) (*model.User, error)
    UpdateProfile(userID uint, username, email string) error
    DeleteUser(userID uint) error
}

type userUseCase struct {
    userRepo   repository.UserRepository
    jwtService auth.JWTService
}

// NewUserUseCase 创建用户用例
func NewUserUseCase(userRepo repository.UserRepository, jwtService auth.JWTService) UserUseCase {
    return &userUseCase{
        userRepo:   userRepo,
        jwtService: jwtService,
    }
}

// Register 用户注册
func (uc *userUseCase) Register(username, password, email string) error {
    // 检查用户名是否已存在
    existingUser, _ := uc.userRepo.GetByUsername(username)
    if existingUser != nil {
        return errors.New("用户名已存在")
    }

    // 检查邮箱是否已存在
    existingUser, _ = uc.userRepo.GetByEmail(email)
    if existingUser != nil {
        return errors.New("邮箱已存在")
    }

    // 密码加密
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    if err != nil {
        return err
    }

    user := &model.User{
        Username: username,
        Password: string(hashedPassword),
        Email:    email,
    }

    return uc.userRepo.Create(user)
}

// Login 用户登录
func (uc *userUseCase) Login(username, password string) (string, error) {
    user, err := uc.userRepo.GetByUsername(username)
    if err != nil {
        return "", errors.New("用户名或密码错误")
    }

    // 验证密码
    err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))
    if err != nil {
        return "", errors.New("用户名或密码错误")
    }

    // 生成JWT令牌
    token, err := uc.jwtService.GenerateToken(user)
    if err != nil {
        return "", err
    }

    return token, nil
}

// GetProfile 获取用户资料
func (uc *userUseCase) GetProfile(userID uint) (*model.User, error) {
    user, err := uc.userRepo.GetByID(userID)
    if err != nil {
        return nil, err
    }
    
    // 不返回密码
    user.Password = ""
    return user, nil
}

// UpdateProfile 更新用户资料
func (uc *userUseCase) UpdateProfile(userID uint, username, email string) error {
    // 获取当前用户
    user, err := uc.userRepo.GetByID(userID)
    if err != nil {
        return err
    }
    
    // 检查新用户名是否已被其他用户使用
    if username != user.Username {
        existingUser, _ := uc.userRepo.GetByUsername(username)
        if existingUser != nil && existingUser.ID != userID {
            return errors.New("用户名已存在")
        }
    }
    
    // 检查新邮箱是否已被其他用户使用
    if email != user.Email {
        existingUser, _ := uc.userRepo.GetByEmail(email)
        if existingUser != nil && existingUser.ID != userID {
            return errors.New("邮箱已存在")
        }
    }
    
    // 更新用户信息
    user.Username = username
    user.Email = email
    
    return uc.userRepo.Update(user)
}

// DeleteUser 删除用户
func (uc *userUseCase) DeleteUser(userID uint) error {
    return uc.userRepo.Delete(userID)
}