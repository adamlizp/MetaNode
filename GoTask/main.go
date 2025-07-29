package main

import (
	_ "fmt"
	_ "time"

	_ "github.com/adamlizp/MetaNode/GoTask/task1"
)

func main() {
	// s := []int{2, 7, 11, 15}
	// target := 13
	// //调用task1包中的函数
	// fmt.Println("两数之和:", task1.TwoSum(s, target))
	// fmt.Println("回文数:", task1.IsPalindrome(121))
	// fmt.Println("有效括号:", task1.IsValidBracket("()[]{}"))
	// fmt.Println("最长公共前缀:", task1.LongestCommonPrefix([]string{"flower", "flow", "flight"}))
	// fmt.Println("合并区间:", task1.MergeIntervals([][]int{{1, 3}, {2, 6}, {8, 10}, {15, 18}}))
	// fmt.Println("大整数加1:", task1.PlusOne([]int{9, 9, 9}))
	// fmt.Println("去除重复元素:", task1.RemoveDuplicates([]int{1, 1, 2}))
	// fmt.Println("只出现一次的数字:", task1.SingleNumber([]int{4, 1, 2, 1, 2}))
	// fmt.Println("回文数:", task1.IsPalindrome(121))

	// //调用task2包中的函数
	// p := 5
	// task2.AddNumber(&p)
	// fmt.Println("指针练习1 加10:", p)
	// var slice *[]int = &[]int{1, 2, 3, 4, 5}
	// task2.MultiplySliceElements(slice)
	// fmt.Println("指针练习2 每个元素乘以2:", *slice)

	// //协程分别打印奇数和偶数
	// fmt.Println("=== 测试PrintNumbers函数 ===")
	// task2.PrintNumbersBothOddAndEven()

	// fmt.Println("\n=== 测试任务调度器 ===")
	// // 任务调度器示例
	// taskA := func() {
	// 	time.Sleep(1 * time.Second)
	// 	fmt.Println("任务1完成")
	// }
	// taskB := func() {
	// 	time.Sleep(500 * time.Millisecond)
	// 	fmt.Println("任务2完成")
	// }
	// taskC := func() {
	// 	time.Sleep(800 * time.Millisecond)
	// 	fmt.Println("任务3完成")
	// }

	// tasks := []func(){taskA, taskB, taskC}

	// // 创建任务调度器
	// ts := task2.NewTaskScheduler(tasks...)

	// // 执行任务调度器
	// ts.Run()

	// // 打印每个任务的执行时间
	// ts.PrintExecutionTimes()

	// //调用 task2 包中的对象练习
	// rect := task2.Rectangle{Width: 5, Height: 10}
	// //创建 Circle 实例
	// circ := task2.Circle{Radius: 7}

	// //打印 Rectangle 的面积和周长
	// fmt.Println("Rectangle Area:", rect.Area())
	// fmt.Println("Rectangle Perimeter:", rect.Perimeter())

	// //打印 Circle 的面积和周长
	// fmt.Println("Circle Area:", circ.Area())
	// fmt.Println("Circle Perimeter:", circ.Perimeter())

	// // 创建 Employee 实例
	// emp := task2.Employee{
	// 	Person: task2.Person{
	// 		Name: "Alice",
	// 		Age:  30,
	// 	},
	// 	EmployeeID: 123,
	// }

	// // 调用 PrintInfo 方法
	// emp.PrintInfo()

	// // 调用 task2 包中的通道练习
	// task2.PrintNumbersFromChannel()
	// task2.PrintNumbersFromBufferedChannel()
	// 调用 task2 包中的锁练习
	// task2.IncrementThousandsCounter()
	// task2.IncrementThousandsAtomicCounter()
}
