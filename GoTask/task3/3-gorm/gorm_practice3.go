//go:build practice3
// +build practice3

package main

import (
	"fmt"

	"github.com/adamlizp/MetaNode/GoTask/task3/3-gorm/config"
	"github.com/adamlizp/MetaNode/GoTask/task3/3-gorm/models"
)

// 题目3：钩子函数测试
func main() {
	if err := config.InitDB(); err != nil {
		panic(fmt.Sprintf("数据库连接失败: %v", err))
	}

	// 测试文章创建钩子
	testPostCreateHook()

	// 测试评论相关钩子
	testCommentHooks()
}

// 测试文章创建钩子（更新用户文章数）
func testPostCreateHook() {
	// 创建测试用户
	user := models.User{Username: "test_user", Email: "test@example.com"}
	config.DB.Create(&user)
	fmt.Printf("创建用户: ID=%d, 初始文章数=%d\n", user.ID, user.ArticleCount)

	// 创建文章（触发AfterCreate钩子）
	post := models.Post{
		Title:   "测试文章",
		Content: "这是一篇测试文章",
		UserID:  user.ID,
		Status:  models.PostStatusPublished,
	}
	config.DB.Create(&post)

	// 验证用户文章数是否更新
	var updatedUser models.User
	config.DB.First(&updatedUser, user.ID)
	fmt.Printf("创建文章后，用户文章数变为: %d\n", updatedUser.ArticleCount)
}

// 测试评论创建/删除钩子（更新文章评论状态）
func testCommentHooks() {
	// 创建测试文章
	post := models.Post{
		Title:   "评论测试文章",
		Content: "这是一篇用于测试评论的文章",
		UserID:  1,
		Status:  models.PostStatusPublished,
	}
	config.DB.Create(&post)

	// 初始状态检查
	var initialPost models.Post
	config.DB.First(&initialPost, post.ID)
	fmt.Printf("\n初始文章状态: 评论数=%d, 状态=%s\n",
		initialPost.CommentCount, initialPost.CommentStatusText())

	// 创建评论（触发AfterCreate钩子）
	comment := models.Comment{Content: "测试评论内容", PostID: post.ID}
	config.DB.Create(&comment)

	// 检查创建评论后的状态
	var postAfterCreate models.Post
	config.DB.First(&postAfterCreate, post.ID)
	fmt.Printf("添加评论后: 评论数=%d, 状态=%s\n",
		postAfterCreate.CommentCount, postAfterCreate.CommentStatusText())

	// 删除评论（触发AfterDelete钩子）
	config.DB.Delete(&comment)

	// 检查删除评论后的状态
	var postAfterDelete models.Post
	config.DB.First(&postAfterDelete, post.ID)
	fmt.Printf("删除评论后: 评论数=%d, 状态=%s\n",
		postAfterDelete.CommentCount, postAfterDelete.CommentStatusText())
}
