package task1

func IsPalindrome(x int) bool {
	//由于是数字考虑可以只反转后半部分的数看是否等于前面位数
	//负数不可能为回文数,而且个位为0 并且不为0 则不为回文数，因为0是回文数，个位为0那么高位也要为0，不太可能
	if x < 0 || x%10 == 0 && x != 0 {
		return false
	}

	revertedNumber := 0
	//比如1221，取模10 得到最后一位1，再除以10 模10 得到倒数第二位2，这个时候需要将倒数第一位*10 加上倒数第二位得到12，完成反转
	// revertedNumber 从最后一位不断变成*10 变成最高位，然后逐步加上前面的位
	for x > revertedNumber {
		revertedNumber = revertedNumber*10 + x%10
		x /= 10
	}

	//x长度为奇数，通过/10去除中间的位数，比如12321，再循环结尾会得到revertedNumber 为 123, x为12
	//中间位3去除不影响判断回文，而且更好比较
	return x == revertedNumber || x == revertedNumber/10
}
