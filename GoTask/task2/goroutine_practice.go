package task2

import (
	"fmt"
	"sync"
	"time"
)

// 1.编写一个程序，使用 go 关键字启动两个协程，一个协程打印从1到10的奇数，另一个协程打印从2到10的偶数。
func PrintNumbersBothOddAndEven() {
	var wg sync.WaitGroup

	// 启动两个goroutine，所以WaitGroup计数器设为2
	wg.Add(2)

	go func() {
		defer wg.Done() // 当goroutine完成时，计数器减1
		// 打印奇数
		for i := 1; i <= 10; i += 2 {
			fmt.Println("奇数:", i)
			time.Sleep(100 * time.Millisecond) // 添加小延迟，让输出更清晰
		}
	}()

	go func() {
		defer wg.Done() // 当goroutine完成时，计数器减1
		// 打印偶数
		for i := 2; i <= 10; i += 2 {
			fmt.Println("偶数:", i)
			time.Sleep(100 * time.Millisecond) // 添加小延迟，让输出更清晰
		}
	}()

	// 等待所有goroutine完成
	wg.Wait()
	fmt.Println("所有数字打印完成!")
}

// 2.设计一个任务调度器，接收一组任务（可以用函数表示），并使用协程并发执行这些任务，同时统计每个任务的执行时间。
// 任务结构体
type Task struct {
	TaskName      string        // 任务名称
	Func          func()        // 任务函数
	StartTime     time.Time     // 开始时间
	EndTime       time.Time     // 结束时间
	ExecutionTime time.Duration // 执行时间
}

// TaskScheduler 任务调度器结构体
type TaskScheduler struct {
	tasks []*Task        // 任务列表
	wg    sync.WaitGroup // 等待组
}

// AddTask 添加任务到调度器
func (ts *TaskScheduler) AddTask(name string, taskFunc func()) {
	task := &Task{
		TaskName: name,
		Func:     taskFunc,
		// StartTime 将在任务实际执行时记录
	}
	ts.tasks = append(ts.tasks, task)
}

// NewTaskScheduler 创建一个新的任务调度器
func NewTaskScheduler(tasks ...func()) *TaskScheduler {
	scheduler := &TaskScheduler{}
	for i, task := range tasks {
		scheduler.AddTask(fmt.Sprintf("Task%d", i+1), task)
	}
	return scheduler
}

// Run 执行所有任务并统计执行时间
func (ts *TaskScheduler) Run() {
	for _, task := range ts.tasks {
		ts.wg.Add(1) // 每添加一个任务，计数器加1
		go func(task *Task) {
			defer ts.wg.Done()                                    // 当goroutine完成时，计数器减1
			task.StartTime = time.Now()                           // 在任务开始执行时记录开始时间
			task.Func()                                           // 执行任务函数
			task.EndTime = time.Now()                             // 记录结束时间
			task.ExecutionTime = task.EndTime.Sub(task.StartTime) // 计算执行时间
		}(task)
	}
	ts.wg.Wait() // 等v待所有goroutine完成
	fmt.Println("所有任务执行完成!")
}

// 打印每个任务的执行时间
func (ts *TaskScheduler) PrintExecutionTimes() {
	for _, task := range ts.tasks {
		fmt.Printf("任务: %s, 执行时间: %v\n", task.TaskName, task.ExecutionTime)
	}
}
