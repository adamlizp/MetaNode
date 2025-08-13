//go:build practice1
// +build practice1

package main

import (
	"fmt"

	"github.com/adamlizp/MetaNode/GoTask/task3/3-gorm/config"
	"github.com/adamlizp/MetaNode/GoTask/task3/3-gorm/models"
)

/*
*
题目1：模型定义
假设你要开发一个博客系统，有以下几个实体： User （用户）、 Post （文章）、 Comment （评论）。
要求 ：
使用Gorm定义 User 、 Post 和 Comment 模型，其中 User 与 Post 是一对多关系（一个用户可以发布多篇文章）， Post 与 Comment 也是一对多关系（一篇文章可以有多个评论）。
编写Go代码，使用Gorm创建这些模型对应的数据库表。
题目3：钩子函数
继续使用博客系统的模型。
要求 ：
为 Post 模型添加一个钩子函数，在文章创建时自动更新用户的文章数量统计字段。
为 Comment 模型添加一个钩子函数，在评论删除时检查文章的评论数量，如果评论数量为 0，则更新文章的评论状态为 "无评论"。
*
*/
// 题目1：创建数据库表结构
func main() {
	// 初始化数据库连接
	if err := config.InitDB(); err != nil {
		panic(fmt.Sprintf("数据库连接失败: %v", err))
	}

	// 自动迁移创建表
	err := config.DB.AutoMigrate(
		&models.User{},
		&models.Post{},
		&models.Comment{},
	)
	if err != nil {
		panic(fmt.Sprintf("创建表结构失败: %v", err))
	}

	fmt.Println("表结构创建成功")

	// 插入测试数据
	insertTestData(1000)
}

// insertTestData 插入测试数据
func insertTestData(numUsers int) {
	for i := 1; i <= numUsers; i++ {
		user := models.User{
			Username: fmt.Sprintf("user_%d", i),
			Email:    fmt.Sprintf("user_%d@example.com", i),
		}
		config.DB.Create(&user)

		// 每个用户插入10篇文章
		for j := 1; j <= 10; j++ {
			post := models.Post{
				Title:   fmt.Sprintf("文章_%d_%d", i, j),
				Content: fmt.Sprintf("这是用户 %d 的第 %d 篇文章", i, j),
				UserID:  user.ID,
				Status:  models.PostStatusPublished,
			}
			config.DB.Create(&post)

			// 每篇文章插入5条评论
			for k := 1; k <= 5; k++ {
				comment := models.Comment{
					Content: fmt.Sprintf("这是文章 %d_%d 的第 %d 条评论", i, j, k),
					PostID:  post.ID,
				}
				config.DB.Create(&comment)
			}
		}
	}
}
