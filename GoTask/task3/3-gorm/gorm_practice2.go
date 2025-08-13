//go:build practice2
// +build practice2

package main

import (
	"fmt"

	"github.com/adamlizp/MetaNode/GoTask/task3/3-gorm/config"
	"github.com/adamlizp/MetaNode/GoTask/task3/3-gorm/models"
)

/**
题目2：关联查询
基于上述博客系统的模型定义。
要求 :
编写Go代码，使用Gorm查询某个用户发布的所有文章及其对应的评论信息。
编写Go代码，使用Gorm查询评论数量最多的文章信息。
**/
// 题目2：关联查询实现
func main() {
	if err := config.InitDB(); err != nil {
		panic(fmt.Sprintf("数据库连接失败: %v", err))
	}

	// 示例1：查询用户的所有文章及评论
	user, err := getUserArticlesWithComments(1)
	if err != nil {
		fmt.Printf("查询用户文章失败: %v\n", err)
	} else {
		fmt.Printf("用户 %s 的文章列表:\n", user.Username)
		for _, post := range user.Posts {
			fmt.Printf("- 文章: %s (状态: %s, 评论数: %d)\n",
				post.Title, post.CommentStatusText(), len(post.Comments))
		}
	}

	// 示例2：查询评论最多的文章
	post, err := getMostCommentedPost()
	if err != nil {
		fmt.Printf("查询评论最多的文章失败: %v\n", err)
	} else {
		fmt.Printf("\n评论最多的文章: %s (评论数: %d, 状态: %s)\n",
			post.Title, post.CommentCount, post.CommentStatusText())
	}
}

// 查询用户的所有文章及评论
func getUserArticlesWithComments(userID uint) (models.User, error) {
	var user models.User
	result := config.DB.Preload("Posts.Comments").First(&user, userID)
	return user, result.Error
}

// 查询评论最多的文章
func getMostCommentedPost() (models.Post, error) {
	var post models.Post
	var commentStats struct {
		PostID uint
		Count  int
	}

	// 查询评论数最多的文章ID
	if err := config.DB.Model(&models.Comment{}).
		Select("post_id, count(*) as count").
		Group("post_id").
		Order("count desc").
		Limit(1).
		Scan(&commentStats).Error; err != nil {
		return post, err
	}

	// 查询完整文章信息
	if err := config.DB.Preload("Comments").First(&post, commentStats.PostID).Error; err != nil {
		return post, err
	}

	return post, nil
}
