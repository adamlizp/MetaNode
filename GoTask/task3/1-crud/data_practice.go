package main

import (
	"database/sql"
	"fmt"

	_ "github.com/go-sql-driver/mysql"
)

func main() {
	dsn := "root:123456@tcp(localhost:3306)/gorm"

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		panic(err)
	}
	defer db.Close()

	//测试连接
	if err := db.Ping(); err != nil {
		panic(err)
	}

	fmt.Println("连接成功")

	/**题目1：基本CRUD操作
	假设有一个名为 students 的表，包含字段 id （主键，自增）、 name （学生姓名，字符串类型）、 age （学生年龄，整数类型）、 grade （学生年级，字符串类型）。
	要求 ：
	编写SQL语句向 students 表中插入一条新记录，学生姓名为 "张三"，年龄为 20，年级为 "三年级"。
	编写SQL语句查询 students 表中所有年龄大于 18 岁的学生信息。
	编写SQL语句将 students 表中姓名为 "张三" 的学生年级更新为 "四年级"。
	编写SQL语句删除 students 表中年龄小于 15 岁的学生记录。
	**/
	// 创建表
	createTableSQL := `create table if not exists students (
		id int auto_increment primary key,
		name varchar(30) not null,
		age int not null,
		grade varchar(15) not null)`
	_, err = db.Exec(createTableSQL)
	if err != nil {
		panic(err)
	}

	// 插入数据
	insertSQL := `insert into students (name, age, grade) values (?, ?, ?)`
	_, err = db.Exec(insertSQL, "张三", 20, "三年级")
	if err != nil {
		panic(err)
	}

	// 查询数据
	querySQL := `select * from students where age > ?`
	rows, err := db.Query(querySQL, 18)
	if err != nil {
		panic(err)
	}
	defer rows.Close()
	for rows.Next() {
		var id int
		var name string
		var age int
		var grade string
		if err := rows.Scan(&id, &name, &age, &grade); err != nil {
			panic(err)
		}
		fmt.Printf("ID: %d, Name: %s, Age: %d, Grade: %s\n", id, name, age, grade)
	}

	// 更新数据
	updateSQL := `update students set grade = ? where name = ?`
	_, err = db.Exec(updateSQL, "四年级", "张三")
	if err != nil {
		panic(err)
	}
	// 删除数据
	deleteSQL := `delete from students where age < ?`
	_, err = db.Exec(deleteSQL, 15)
	if err != nil {
		panic(err)
	}
	fmt.Println("基本CRUD操作完成")
	/**题目2：事务语句
	    假设有两个表： accounts 表（包含字段 id 主键， balance 账户余额）
		和 transactions 表（包含字段 id 主键， from_account_id 转出账户ID， to_account_id 转入账户ID， amount 转账金额）。
	    要求 ：
	    编写一个事务，实现从账户 A 向账户 B 转账 100 元的操作。
		在事务中，需要先检查账户 A 的余额是否足够，如果足够则从账户 A 扣除 100 元，向账户 B 增加 100 元，并在 transactions 表中记录该笔转账信息。如果余额不足，则回滚事务。
	**/

	// 创建表
	createAccountsTableSQL := `create table if not exists accounts (
		id int auto_increment primary key,
		balance decimal(12,2) not null)`
	_, err = db.Exec(createAccountsTableSQL)
	if err != nil {
		panic(err)
	}

	createTransactionsTableSQL := `create table if not exists transactions (
		id int auto_increment primary key,
		from_account_id int not null,	
		to_account_id int not null,
		amount decimal(12,2) not null)`
	_, err = db.Exec(createTransactionsTableSQL)
	if err != nil {
		panic(err)
	}

	// 开始事务
	tx, err := db.Begin()
	if err != nil {
		panic(err)
	}
	// 假设账户 A 和 B 的 ID 分别为 1 和 2
	// 但是在实际应用中，你需要先插入账户数据
	insertAccountSQL := `insert into accounts (id, balance) values (?, ?)`
	_, err = tx.Exec(insertAccountSQL, 1, 500.00)
	if err != nil {
		tx.Rollback()
		panic(err)
	}
	_, err = tx.Exec(insertAccountSQL, 2, 500.00)
	if err != nil {
		tx.Rollback()
		panic(err)
	}
	fmt.Println("账户表和交易表创建成功，开始转账操作")

	// 假设账户 A 和 B 的 ID 分别为 1 和 2，转账金额为 100.00
	accountAID := 1
	accountBID := 2
	transferAmount := 100.00
	// 查询账户 A 的余额
	var accountABalance float64
	queryBalanceSQL := `select balance from accounts where id = ?`
	err = tx.QueryRow(queryBalanceSQL, accountAID).Scan(&accountABalance)
	if err != nil {
		tx.Rollback()
		panic(err)
	}
	if accountABalance < transferAmount {
		fmt.Println("账户 A 余额不足，回滚事务")
		tx.Rollback()
		return
	}
	// 扣除账户 A 的余额
	updateBalanceSQL := `update accounts set balance = balance - ? where id = ?`
	_, err = tx.Exec(updateBalanceSQL, transferAmount, accountAID)
	if err != nil {
		tx.Rollback()
		panic(err)
	}
	// 增加账户 B 的余额
	updateBalanceSQL = `update accounts set balance = balance + ? where id = ?`
	_, err = tx.Exec(updateBalanceSQL, transferAmount, accountBID)
	if err != nil {
		tx.Rollback()
		panic(err)
	}
	// 添加转账记录
	insertTransactionSQL := `insert into transactions (from_account_id, to_account_id, amount) values (?, ?, ?)`
	_, err = tx.Exec(insertTransactionSQL, accountAID, accountBID, transferAmount)
	if err != nil {
		tx.Rollback()
		panic(err)
	}
	// 提交事务
	if err := tx.Commit(); err != nil {
		tx.Rollback()
		panic(err)
	}

	fmt.Println("事务操作完成")
	// 关闭数据库连接
	if err := db.Close(); err != nil {
		panic(err)
	}
	fmt.Println("数据库连接已关闭")
	fmt.Println("所有操作完成，程序结束")
}
