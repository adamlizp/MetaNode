package models

import (
	"gorm.io/gorm"
)

// 状态码常量定义
const (
	// 评论状态
	CommentStatusNone  = 0 // 无评论
	CommentStatusExist = 1 // 有评论

	// 可扩展：文章状态
	PostStatusDraft   = 0 // 草稿
	PostStatusPublished = 1 // 已发布
)


// User 模型定义
type User struct {
	gorm.Model
	Username     string //用户名
	Email        string //邮箱
	ArticleCount int    //文章数量统计
	Posts        []Post // 一对多关联; 一个用户有多篇文章
}


// Post 模型定义
type Post struct {
	gorm.Model
	Title         string    //文章标题
	Content       string    //文章内容
	UserID        uint      //外键：关联用户
	User          User      //反向关联：属于某个用户
	CommentCount  int       //评论数量
	CommentStatus int       // 评论状态（存储码值：0=无评论，1=有评论）
	Status        int       // 文章状态（扩展字段）
	Comments      []Comment // 一对多关联
}

// Comment 模型定义
type Comment struct {
	gorm.Model
	Content string // 评论内容
	PostID  uint   // 外键
	Post    Post   // 反向关联
}

// 状态文本转换方法
func (p *Post) CommentStatusText() string {
	switch p.CommentStatus {
	case CommentStatusNone:
		return "无评论"
	case CommentStatusExist:
		return "有评论"
	default:
		return "未知状态"
	}
}

func (p *Post) StatusText() string {
	switch p.Status {
	case PostStatusDraft:
		return "草稿"
	case PostStatusPublished:
		return "已发布"
	default:
		return "未知状态"
	}
}



// Post的AfterCreate钩子：创建文章后更新用户的文章数量
func (p *Post) AfterCreate(tx *gorm.DB) error {
	return tx.Model(&User{}).
		Where("id = ?", p.UserID).
		Update("article_count", gorm.Expr("article_count + ?", 1)).Error
}


// Comment的AfterCreate钩子：创建评论后更新文章状态
func (c *Comment) AfterCreate(tx *gorm.DB) error {
	return tx.Model(&Post{}).
		Where("id = ?", c.PostID).
		Updates(map[string]interface{}{
			"comment_status": CommentStatusExist,
			"comment_count":  gorm.Expr("comment_count + ?", 1),
		}).Error
}

// Comment的AfterDelete钩子：删除评论后更新文章状态
func (c *Comment) AfterDelete(tx *gorm.DB) error {
	var count int64
	if err := tx.Model(&Comment{}).Where("post_id = ?", c.PostID).Count(&count).Error; err != nil {
		return err
	}

	status := CommentStatusExist
	if count == 0 {
		status = CommentStatusNone
	}

	return tx.Model(&Post{}).
		Where("id = ?", c.PostID).
		Updates(map[string]interface{}{
			"comment_status": status,
			"comment_count":  count,
		}).Error
}