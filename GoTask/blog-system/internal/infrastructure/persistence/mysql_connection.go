package persistence

import (
    "github.com/adamlizp/MetaNode/GoTask/blog-system/config"
    "github.com/adamlizp/MetaNode/GoTask/blog-system/internal/domain/model"
    "fmt"
    "log"

    "gorm.io/driver/mysql"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

// NewMySQLConnection 创建MySQL连接
func NewMySQLConnection(cfg *config.Config) (*gorm.DB, error){
    dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
        cfg.DBConfig.User, cfg.DBConfig.Password, cfg.DBConfig.Host, cfg.DBConfig.Port, cfg.DBConfig.Name)
    
    db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
        Logger: logger.Default.LogMode(logger.Info),
    })
    
    if err != nil {
        log.Fatalf("数据库连接失败: %v", err)
        return nil, err
    }
    
    // 自动迁移模型
    err = db.AutoMigrate(&model.User{}, &model.Post{}, &model.Comment{})
    if err != nil {
        log.Fatalf("数据库迁移失败: %v", err)
        return nil, err
    }
    
    return db, nil
}