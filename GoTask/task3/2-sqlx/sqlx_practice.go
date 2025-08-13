package main

import (
	"database/sql/driver"
	"fmt"
	"strings"

	_ "github.com/go-sql-driver/mysql" // 导入数据库驱动
	"github.com/jmoiron/sqlx"
)

var db *sqlx.DB

func initDB() (err error) {
	dsn := "root:123456@tcp(127.0.0.1:3306)/gorm?charset=utf8mb4&parseTime=True"

	// 也可以MustConnect 连接不成功就panic
	db, err = sqlx.Connect("mysql", dsn)
	if err != nil {
		fmt.Printf("connect DB failed, err:%v\n", err)
		return
	}

	db.SetMaxOpenConns(20) // 设置最大连接数
	db.SetMaxIdleConns(10) // 设置最大空闲连接数
	return
}

/*
*
题目1：使用SQL扩展库进行查询
假设你已经使用Sqlx连接到一个数据库，并且有一个 employees 表，包含字段 id 、 name 、 department 、 salary 。
要求 ：
编写Go代码，使用Sqlx查询 employees 表中所有部门为 "技术部" 的员工信息，并将结果映射到一个自定义的 Employee 结构体切片中。
编写Go代码，使用Sqlx查询 employees 表中工资最高的员工信息，并将结果映射到一个 Employee 结构体中。
题目2：实现类型安全映射
假设有一个 books 表，包含字段 id 、 title 、 author 、 price 。
要求 ：
定义一个 Book 结构体，包含与 books 表对应的字段。
编写Go代码，使用Sqlx执行一个复杂的查询，例如查询价格大于 50 元的书籍，并将结果映射到 Book 结构体切片中，确保类型安全。
*
*/

// 定义一个 Employee 结构体，和表字段映射
type Employee struct {
	ID         int    `db:"id,autoincr"`
	Name       string `db:"name"`
	Department string `db:"department"`
	Salary     int    `db:"salary"`
}

// 定义 Book 结构体，和表字段映射
type Book struct {
	ID     int     `db:"id,autoincr"`
	Title  string  `db:"title"`
	Author string  `db:"author"`
	Price  float64 `db:"price"`
}

// BatchInsertEmployees 自行构造批量插入的语句
func BatchInsertEmployees(employees []*Employee) error {
	// 存放(?, ?, ?)的切片
	valueStrings := make([]string, 0, len(employees))
	// 存放对应的参数切片
	valueArgs := make([]interface{}, 0, len(employees)*3)
	// 遍历每个员工，构造对应的插入语句
	for _, emp := range employees {
		valueStrings = append(valueStrings, "(?, ?, ?)")
		valueArgs = append(valueArgs, emp.Name, emp.Department, emp.Salary)
	}
	// 构造最终的SQL语句
	sql := fmt.Sprintf("INSERT INTO employees (name, department, salary) VALUES %s",
		strings.Join(valueStrings, ","))
	// 执行批量插入
	_, err := db.Exec(sql, valueArgs...)
	return err
}

// 使用sqlx.In来构造批量插入的SQL语句
// 需要我们结构体实现driver.Valuer接口
func (e Employee) Value() (driver.Value, error) {
	return []interface{}{e.Name, e.Department, e.Salary}, nil
}

// BatchInsertEmployeesByIn 使用sqlx.In帮我们拼接语句和参数, 注意传入的参数是[]interface{}
func BatchInsertEmployeesByIn(employees []interface{}) error {
	query, args, _ := sqlx.In(
		"INSERT INTO employees (name, department, salary) VALUES (?), (?), (?), (?)",
		employees..., // 如果arg实现了 driver.Valuer, sqlx.In 会通过调用 Value()来展开它
	)
	fmt.Println(query) // 查看生成的querystring
	fmt.Println(args)  // 查看生成的args
	_, err := db.Exec(query, args...)
	return err
}

// 使用NamedExec实现批量插入
func BatchInsertEmployeesByNameExec(employees []*Employee) error {
	_, err := db.NamedExec("INSERT INTO employees (name, department, salary) VALUES (:name, :department, :salary)", employees)
	return err
}

func main() {
	if err := initDB(); err != nil {
		fmt.Printf("initDB failed, err:%v\n", err)
		return
	}
	defer db.Close()
	fmt.Println("连接成功")

	//先根据结构体创建表，再向表里插入测试数据
	createTableSQL := `CREATE TABLE IF NOT EXISTS employees (
		id INT AUTO_INCREMENT PRIMARY KEY,
		name VARCHAR(50) NOT NULL,
		department VARCHAR(50) NOT NULL,
		salary INT NOT NULL
	);`
	_, err := db.Exec(createTableSQL)
	if err != nil {
		fmt.Printf("create table failed, err:%v\n", err)
		return
	}
	fmt.Println("employees 表创建成功")
	// 插入测试数据
	employees := []*Employee{
		{Name: "Alice", Department: "技术部", Salary: 8000},
		{Name: "Bob", Department: "技术部", Salary: 9000},
		{Name: "Charlie", Department: "市场部", Salary: 7000},
		{Name: "David", Department: "技术部", Salary: 9500},
	}
	// 1.使用自定义的BatchInsertEmployees方法批量插入数据
	if err := BatchInsertEmployees(employees); err != nil {
		fmt.Printf("BatchInsertEmployees failed, err:%v\n", err)
		return
	}
	fmt.Println("员工数据使用自定义方法批量插入成功")

	// 2. 使用sqlx.In 的BatchInsertEmployeesByIn方法批量插入数据
	// 这里需要新的员工数据employees
	newEmployees := []*Employee{
		{Name: "Eve", Department: "技术部", Salary: 8500},
		{Name: "Frank", Department: "市场部", Salary: 7500},
		{Name: "Grace", Department: "技术部", Salary: 9200},
		{Name: "Hank", Department: "技术部", Salary: 8800},
	}

	//将新的员工数据转换为 interface{} 类型
	newEmployeesInterface := make([]interface{}, len(newEmployees))
	for i, emp := range newEmployees {
		newEmployeesInterface[i] = emp // 正确的索引赋值
	}
	if err := BatchInsertEmployeesByIn(newEmployeesInterface); err != nil {
		fmt.Printf("BatchInsertEmployeesByIn failed, err:%v\n", err)
		return
	}
	fmt.Println("新员工数据使用sqlx.In批量插入成功")

	// 查询所有技术部员工，并将结果映射到一个自定义的 Employee 结构体切片中。
	var techEmployees []Employee
	err = db.Select(&techEmployees, "SELECT * FROM employees WHERE department = ?", "技术部")
	if err != nil {
		fmt.Printf("查询技术部员工失败, err:%v\n", err)
		return
	}
	fmt.Println("技术部员工信息:")
	for _, emp := range techEmployees {
		fmt.Printf("ID: %d, Name: %s, Department: %s, Salary: %d\n", emp.ID, emp.Name, emp.Department, emp.Salary)
	}

	// 查询工资最高的员工信息，并将结果映射到一个 Employee 结构体中。
	var highestSalaryEmployee Employee
	err = db.Get(&highestSalaryEmployee, "SELECT * FROM employees ORDER BY salary DESC LIMIT 1")
	if err != nil {
		fmt.Printf("查询工资最高的员工失败, err:%v\n", err)
		return
	}
	fmt.Println("工资最高的员工信息:")
	fmt.Printf("ID: %d, Name: %s, Department: %s, Salary: %d\n", highestSalaryEmployee.ID, highestSalaryEmployee.Name, highestSalaryEmployee.Department, highestSalaryEmployee.Salary)

	// 创建 books 表
	createBooksTableSQL := `CREATE TABLE IF NOT EXISTS books (
		id INT AUTO_INCREMENT PRIMARY KEY,
		title VARCHAR(50) NOT NULL,
		author VARCHAR(100) NOT NULL,
		price DECIMAL(10,2) NOT NULL
	);`
	_, err = db.Exec(createBooksTableSQL)
	if err != nil {
		fmt.Printf("create books table failed, err:%v\n", err)
		return
	}
	fmt.Println("books 表创建成功")

	// 插入测试数据
	books := []Book{
		{Title: "Go语言编程", Author: "Alice Smith", Price: 45.99},
		{Title: "Python编程", Author: "Bob Johnson", Price: 55.99},
		{Title: "Java编程", Author: "Charlie Brown", Price: 65.99},
		{Title: "C++编程", Author: "David Lee", Price: 75.99},
	}

	// 3.使用 NamedExec 批量插入图书数据
	for _, book := range books {
		_, err = db.NamedExec("INSERT INTO books (title, author, price) VALUES (:title, :author, :price)", book)
		if err != nil {
			fmt.Printf("插入图书失败, err:%v\n", err)
			return
		}
	}

	fmt.Println("图书数据使用NamedExec批量插入成功")
	// 查询所有图书，并将结果映射到一个 Book 结构体切片中。
	var querybooks []Book
	err = db.Select(&querybooks, "SELECT id, title, author, price FROM books")
	if err != nil {
		fmt.Printf("查询图书失败, err:%v\n", err)
		return
	}
	fmt.Println("所有图书信息:")
	for _, book := range querybooks {
		fmt.Printf("ID: %d, Title: %s, Author: %s, Price: %.2f\n", book.ID, book.Title, book.Author, book.Price)
	}

	// 查询价格大于 50 元的书籍，并将结果映射到 Book 结构体切片中，确保类型安全。
	var expensiveBooks []Book
	err = db.Select(&expensiveBooks, "SELECT id, title, author, price FROM books WHERE price > ?", 50.0)
	if err != nil {
		fmt.Printf("查询价格大于50元的书籍失败, err:%v\n", err)
		return
	}
	fmt.Println("价格大于50元的书籍信息:")
	for _, book := range expensiveBooks {
		fmt.Printf("ID: %d, Title: %s, Author: %s, Price: %.2f\n", book.ID, book.Title, book.Author, book.Price)
	}

}
