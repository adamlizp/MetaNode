package config

import (
    "fmt"
    "github.com/spf13/viper"
)

// DB 数据库配置
type DB struct {
    Host     string `mapstructure:"DB_HOST"`
    Port     string `mapstructure:"DB_PORT"`
    User     string `mapstructure:"DB_USER"`
    Password string `mapstructure:"DB_PASSWORD"`
    Name     string `mapstructure:"DB_NAME"`
}

// Config 应用配置
type Config struct {
    ServerPort         string `mapstructure:"SERVER_PORT"`
    LogLevel           string `mapstructure:"LOG_LEVEL"`
    JWTSecret          string `mapstructure:"JWT_SECRET"`
    JWTExpirationHours int    `mapstructure:"JWT_EXPIRATION_HOURS"`
    DBConfig           DB
}

// LoadConfig 从环境变量或配置文件加载配置
func LoadConfig() (*Config, error) {
    viper.SetConfigName("app")
    viper.SetConfigType("env")
    viper.AddConfigPath("./blog-system/config")
    viper.AddConfigPath("./config")  // 如果从blog-system目录运行
    viper.AddConfigPath(".")
    viper.AutomaticEnv()

    // 设置默认值
    viper.SetDefault("SERVER_PORT", "8080")
    viper.SetDefault("LOG_LEVEL", "info")
    viper.SetDefault("JWT_SECRET", "your-secret-key")
    viper.SetDefault("JWT_EXPIRATION_HOURS", 24)
    viper.SetDefault("DB_HOST", "localhost")
    viper.SetDefault("DB_PORT", "3306")
    viper.SetDefault("DB_USER", "root")
    viper.SetDefault("DB_PASSWORD", "123456")
    viper.SetDefault("DB_NAME", "blog_system")

    if err := viper.ReadInConfig(); err != nil {
        // 如果找不到配置文件，使用默认值和环境变量
        if _, ok := err.(viper.ConfigFileNotFoundError); ok {
            fmt.Println("警告: 未找到配置文件，使用默认值和环境变量")
        } else {
            return nil, fmt.Errorf("读取配置文件失败: %w", err)
        }
    } else {
        fmt.Printf("成功加载配置文件: %s\n", viper.ConfigFileUsed())
    }

    var config Config
    config.DBConfig = DB{
        Host:     viper.GetString("DB_HOST"),
        Port:     viper.GetString("DB_PORT"),
        User:     viper.GetString("DB_USER"),
        Password: viper.GetString("DB_PASSWORD"),
        Name:     viper.GetString("DB_NAME"),
    }

    config.ServerPort = viper.GetString("SERVER_PORT")
    config.LogLevel = viper.GetString("LOG_LEVEL")
    config.JWTSecret = viper.GetString("JWT_SECRET")
    config.JWTExpirationHours = viper.GetInt("JWT_EXPIRATION_HOURS")

    return &config, nil
}
