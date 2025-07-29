package task2

//1.定义一个函数，该函数接收一个整数指针作为参数，在函数内部将该指针指向的值增加10，然后在主函数中调用该函数并输出修改后的值。
func AddNumber(ptr *int) {
	*ptr += 10
}

//2.实现一个函数，接收一个整数切片的指针，将切片中的每个元素乘以2。
func MultiplySliceElements(slicePtr *[]int) {
	for i := range *slicePtr {
		// 使用指针访问切片中的元素并将其乘以2 		
		(*slicePtr)[i] *= 2
	}
}
