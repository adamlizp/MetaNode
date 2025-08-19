package logger

import (
    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
    "os"
    "strings"
)

var log *zap.Logger

// InitLogger 初始化日志
func InitLogger(level string) {
    // 设置日志级别
    var logLevel zapcore.Level
    switch strings.ToLower(level) {
    case "debug":
        logLevel = zapcore.DebugLevel
    case "info":
        logLevel = zapcore.InfoLevel
    case "warn":
        logLevel = zapcore.WarnLevel
    case "error":
        logLevel = zapcore.ErrorLevel
    default:
        logLevel = zapcore.InfoLevel
    }

    // 配置编码器
    encoderConfig := zap.NewProductionEncoderConfig()
    encoderConfig.TimeKey = "timestamp"
    encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
    encoderConfig.EncodeLevel = zapcore.CapitalLevelEncoder

    // 创建核心
    core := zapcore.NewCore(
        zapcore.NewJSONEncoder(encoderConfig),
        zapcore.AddSync(os.Stdout),
        logLevel,
    )

    // 创建日志记录器
    log = zap.New(core, zap.AddCaller(), zap.AddStacktrace(zapcore.ErrorLevel))
}

// Debug 调试级别日志
func Debug(message string, fields ...zap.Field) {
    if log == nil {
        InitLogger("info")
    }
    log.Debug(message, fields...)
}

// Info 信息级别日志
func Info(message string, fields ...zap.Field) {
    if log == nil {
        InitLogger("info")
    }
    log.Info(message, fields...)
}

// Warn 警告级别日志
func Warn(message string, fields ...zap.Field) {
    if log == nil {
        InitLogger("info")
    }
    log.Warn(message, fields...)
}

// Error 错误级别日志
func Error(message string, err error, fields ...zap.Field) {
    if log == nil {
        InitLogger("info")
    }
    if err != nil {
        fields = append(fields, zap.Error(err))
    }
    log.Error(message, fields...)
}

// Fatal 致命级别日志
func Fatal(message string, err error, fields ...zap.Field) {
    if log == nil {
        InitLogger("info")
    }
    if err != nil {
        fields = append(fields, zap.Error(err))
    }
    log.Fatal(message, fields...)
}