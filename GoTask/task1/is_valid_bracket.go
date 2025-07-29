package task1

func IsValidBracket(s string) bool {
	//判断的字符串一定是偶数长度的，不然直接括号肯定没办法全部闭合
	//可以使用切片模拟栈来实现，左括号先入栈， 后面如果遇到后括号看是否是同一类型，而且如果栈里面没有对应的左括号则无法闭合返回无效
	//还有如果左括号可以入栈优先先匹配对应的右括号，括号匹配可以嵌套但是必须得完整闭合类似与这种  [()]

	n := len(s)
	if n%2 == 1 {
		return false
	}

	//用哈希表存储对应类型的括号快速查找
	pair := map[byte]byte{
		')': '(',
		']': '[',
		'}': '{',
	}

	//模拟stack 的切片数组，先创建一个空的字节切片，字符串看作是字节（byte）的切片（slice）来实现对其标准索引
	stack := []byte{}

	for i := 0; i < n; i++ {
		//代表当前入栈右括号，uft字符序列 > 0
		if pair[s[i]] > 0 {
			//空栈 或者 栈顶没有对应左括号
			if len(stack) == 0 || stack[len(stack)-1] != pair[s[i]] {
				return false
			}
			//模拟出栈，切分掉栈顶
			stack = stack[:len(stack)-1]
		} else {
			//左括号入栈，下次循环先闭合此次入栈的左括号
			stack = append(stack, s[i])
		}
	}
	//最后如果完美闭合的化按理说是都会全部出栈
	return len(stack) == 0
}
