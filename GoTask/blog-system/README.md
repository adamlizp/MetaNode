# Blog System

一个基于 **Go 语言** 开发的博客系统 API，采用 **Clean Architecture（干净架构）** 设计模式，提供了用户管理、博客文章管理等核心功能。

---

## 📂 项目结构

```
blog-system/
├── cmd/
│   └── main.go          # 应用程序入口点
├── config/
│   └── config.go        # 配置管理
├── internal/
│   ├── domain/          # 领域模型和接口
│   ├── usecase/         # 业务逻辑层
│   ├── delivery/        # 控制器和路由
│   └── infrastructure/  # 数据库和外部服务实现
├── pkg/                 # 公共工具包
├── migrations/          # 数据库迁移文件
├── app.env              # 环境配置文件
├── go.mod               # Go 模块定义
└── docker-compose.yml   # Docker 配置
```

---

## ⚙️ 运行环境

- Go 1.18 或更高版本  
- MySQL 5.7 或更高版本  
- Docker 和 Docker Compose （可选，用于容器化部署）  

---

## 📦 安装依赖

### 克隆项目
```bash
git clone https://github.com/adamlizp/MetaNode.git
cd MetaNode/GoTask/blog-system
```

### 安装依赖
```bash
go mod download
```

---

## 🔧 配置

在项目根目录下创建 `.env` 文件（示例内容如下）：

```env
SERVER_PORT=8080
LOG_LEVEL=debug
JWT_SECRET=your-secret-key
JWT_EXPIRATION_HOURS=24

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=blog_db
```

---

## 🗄️ 数据库设置

创建 MySQL 数据库：
```sql
CREATE DATABASE blog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

> 项目首次运行时会自动创建所需表结构。

---

## 🚀 启动方式

### 直接运行
```bash
go run cmd/main.go
```

### 构建并运行
```bash
go build -o blog-system ./cmd
./blog-system
```

### 使用 Docker Compose
```bash
docker-compose up -d
```

服务将在： [http://localhost:8080](http://localhost:8080) 启动。

---

## ✨ 主要功能

- 用户注册和登录，以及用户更新和删除  
- JWT 认证  
- 文章的创建、读取、更新和删除  
- 评论的创建、读取、更新和删除    
- 用户权限管理  

---

## 📖 API 文档

- 参考：`docs/api.md`



---

## 📄 许可证

本项目采用 **MIT License** - 详情请参阅 [LICENSE](LICENSE) 文件。

---
