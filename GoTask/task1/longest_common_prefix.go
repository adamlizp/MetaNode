package task1

func LongestCommonPrefix(strs []string) string {
	//依次遍历字符串数组中的每个字符串，对于每个遍历到的字符串，更新最长公共前缀，遍历完所有的字符串以后，即可得到字符串数组中的最长公共前缀
	//如果在尚未遍历完所有的字符串时，最长公共前缀已经是空串，则最长公共前缀一定是空串
	if len(strs) == 0 {
		return ""
	}

	prefix := strs[0]
	count := len(strs)
	for i := 0; i < count; i++ {
		prefix = lcp(prefix, strs[i])
		if len(prefix) == 0 {
			break
		}
	}
	return prefix
}

func lcp(str1, str2 string) string {
	length := min(len(str1), len(str2))
	index := 0
	for index < length && str1[index] == str2[index] {
		index++
	}
	//返回0到index 的字符串  比如 str1 = "sfs"  str2 = "sf" index++最后为2 ，切片则是sf  0和1的
	return str1[:index]
}
