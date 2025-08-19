package main

import (
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/delivery/http"
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/delivery/http/handler"
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/infrastructure/auth"
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/infrastructure/persistence"
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/usecase"
    "github.com/adamlizp/MetaNode/GoTask/blog-system/config"
    "github.com/adamlizp/MetaNode/GoTask/blog-system/pkg/logger"
    "log"
)

func main() {
    // 加载配置
    cfg, err := config.LoadConfig()
    if err != nil {
        log.Fatalf("无法加载配置: %v", err)
    }

    // 初始化日志
    logger.InitLogger(cfg.LogLevel)

    // 初始化数据库
    db, err := persistence.NewMySQLConnection(cfg)
    if err != nil {
        logger.Error("无法连接数据库", err)
        return
    }

    // 初始化仓库
    userRepo := persistence.NewUserRepository(db)
    postRepo := persistence.NewPostRepository(db)
    commentRepo := persistence.NewCommentRepository(db)

    // 初始化JWT服务
    jwtService := auth.NewJWTService(cfg)

    // 初始化用例
    userUseCase := usecase.NewUserUseCase(userRepo, jwtService)
    postUseCase := usecase.NewPostUseCase(postRepo, userRepo)
    commentUseCase := usecase.NewCommentUseCase(commentRepo, postRepo, userRepo)

    // 初始化处理器
    userHandler := handler.NewUserHandler(userUseCase)
    postHandler := handler.NewPostHandler(postUseCase)
    commentHandler := handler.NewCommentHandler(commentUseCase)

    // 设置路由
    router := http.SetupRouter(userHandler, postHandler, commentHandler, jwtService)

    // 启动服务器
    logger.Info("服务器启动在端口" + cfg.ServerPort)
    if err := router.Run(":" + cfg.ServerPort); err != nil {
        logger.Error("服务器启动失败", err)
    }
}