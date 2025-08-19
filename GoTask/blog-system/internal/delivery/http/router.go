package http

import (
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/delivery/http/handler"
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/delivery/http/middleware"
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/infrastructure/auth"
    "github.com/gin-gonic/gin"
)

// SetupRouter 设置路由
func SetupRouter(
    userHandler *handler.UserHandler,
    postHandler *handler.PostHandler,
    commentHandler *handler.CommentHandler,
    jwtService auth.JWTService,
) *gin.Engine {
    router := gin.Default()

    // 健康检查
    router.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{
            "status": "ok",
        })
    })

    // 用户相关路由
    userRoutes := router.Group("/api/users")
    {
        userRoutes.POST("/register", userHandler.Register)
        userRoutes.POST("/login", userHandler.Login)
        
        // 需要认证的路由
        authUserRoutes := userRoutes.Group("/")
        authUserRoutes.Use(middleware.AuthMiddleware(jwtService))
        {
            authUserRoutes.GET("/profile", userHandler.GetProfile)
            authUserRoutes.PUT("/profile", userHandler.UpdateProfile)
            authUserRoutes.DELETE("/:id", userHandler.DeleteUser)
        }
    }

    // 文章相关路由
    postRoutes := router.Group("/api/posts")
    {
        postRoutes.GET("", postHandler.GetAll)
        postRoutes.GET("/:id", postHandler.GetByID)
        postRoutes.GET("/user/:user_id", postHandler.GetByUserID)
        
        // 需要认证的路由
        authPostRoutes := postRoutes.Group("/")
        authPostRoutes.Use(middleware.AuthMiddleware(jwtService))
        {
            authPostRoutes.POST("", postHandler.Create)
            authPostRoutes.PUT("/:id", postHandler.Update)
            authPostRoutes.DELETE("/:id", postHandler.Delete)
        }
    }

    // 评论相关路由
    commentRoutes := router.Group("/api/comments")
    {
        commentRoutes.GET("/post/:post_id", commentHandler.GetByPostID)
        
        // 需要认证的路由
        authCommentRoutes := commentRoutes.Group("/")
        authCommentRoutes.Use(middleware.AuthMiddleware(jwtService))
        {
            authCommentRoutes.POST("/post/:post_id", commentHandler.Create)
            authCommentRoutes.DELETE("/:id", commentHandler.Delete)
        }
    }

    return router
}