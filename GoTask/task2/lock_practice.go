package task2

import (
	"fmt"
	"sync"
	"sync/atomic"
)

// 1.编写一个程序，使用 sync.Mutex 来保护一个共享的计数器。启动10个协程，每个协程对计数器进行1000次递增操作，最后输出计数器的值。
type Counter struct {
	sync.Mutex
	value int // 共享计数器
}

func (c *Counter) Increment() {
	c.Lock()         // 锁定互斥锁
	defer c.Unlock() // 确保在函数结束时解锁
	c.value++        // 递增计数器
}

func IncrementThousandsCounter() {
	count := &Counter{}       // 创建计数器对象
	var wg sync.WaitGroup     // 创建等待组
	for i := 0; i < 10; i++ { // 启动10个协程
		wg.Add(1) // 增加等待组计数
		go func() {
			defer wg.Done() // 协程结束时减少等待组计数
			for j := 0; j < 1000; j++ {
				count.Increment() // 对计数器进行递增操作
			}
		}()
	}
	wg.Wait() // 等待所有协程完成
	fmt.Println("计数器最终值:", count.value)

}

// 2.使用原子操作（ sync/atomic 包）实现一个无锁的计数器。启动10个协程，每个协程对计数器进行1000次递增操作，最后输出计数器的值。
type AtomicCounter struct {
	value int64 // 原子计数器
}

func (c *AtomicCounter) AtomicIncrement() {
	atomic.AddInt64(&c.value, 1) // 使用原子操作递增计数器
}

func IncrementThousandsAtomicCounter() {
	count := &AtomicCounter{} // 创建原子计数器对象
	var wg sync.WaitGroup     // 创建等待组
	for i := 0; i < 10; i++ {
		wg.Add(1) // 增加等待组计数
		go func() {
			defer wg.Done() // 协程结束时减少等待组计数
			for j := 0; j < 1000; j++ {
				count.AtomicIncrement() // 对原子计数器进行递增操作
			}
		}()
	}
	wg.Wait() // 等待所有协程完成
	fmt.Println("原子计数器最终值:", count.value)
}
