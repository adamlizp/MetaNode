package task2

//1.编写一个程序，使用通道实现两个协程之间的通信。一个协程生成从1到10的整数，并将这些整数发送到通道中，另一个协程从通道中接收这些整数并打印出来。
import (
	"fmt"
	"time"
)

func PassNumbersToChannel(ch chan int) {
	for i := 1; i <= 10; i++ {
		ch <- i
		time.Sleep(100 * time.Millisecond) // 模拟处理时间
	}
	close(ch) // 关闭通道
}

func PrintNumbersFromChannel() {
	ch := make(chan int)
	go PassNumbersToChannel(ch)
	for num := range ch {
		fmt.Println("接收到的数字:", num)
	}
}

// 2.实现一个带有缓冲的通道，生产者协程向通道中发送100个整数，消费者协程从通道中接收这些整数并打印。
func PassNumbersToBufferedChannel(ch chan int) {
	for i := 1; i <= 100; i++ {
		ch <- i
		time.Sleep(50 * time.Millisecond) // 模拟处理时间
	}
	close(ch) // 关闭通道
}

func PrintNumbersFromBufferedChannel() {
	ch := make(chan int, 10) // 创建一个缓冲通道，容量为10
	go PassNumbersToBufferedChannel(ch)
	for num := range ch {
		fmt.Println("接收到的数字:", num)
	}
}
