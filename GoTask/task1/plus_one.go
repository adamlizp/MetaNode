package task1

func PlusOne(digits []int) []int {
	//给大整数加1，返回对应的整数数组
	//主要就是找出有多少个9，考虑三种情况
	// 一种就是没有9 直接遍历尾部最尾部加1就好
	// 第二种就是后面若干个9，找出最高位的不为零的加1，后面改成0即可
	// 第三种就是后面全是9，则构造一个比原数组长度加1 的最高位为1，后面全部补0即可

	n := len(digits)
	for i := n - 1; i >= 0; i-- {
		//从尾巴往前面找
		//这里实际第一和第二种可以合并为一种，而且后面默认反正也是0，这里题种这个大整数不包含任何前导 0。
		if digits[i] != 9 {
			digits[i]++
			for j := i + 1; j < n; j++ {
				digits[j] = 0
			}
			return digits
		}
	}

	//全为9
	digits = make([]int, n+1)
	digits[0] = 1
	return digits

}
