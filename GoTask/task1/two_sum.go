package task1

/**
给定一个整数数组 nums 和一个整数目标值 target，请你在该数组中找出 和为目标值 target  的那两个 整数，并返回它们的数组下标。
你可以假设每种输入只会对应一个答案，并且你不能使用两次相同的元素。
**/
func TwoSum(nums []int, target int) []int {
	//使用哈希表来存储数组中的元素及其对应的下标
	hastable := make(map[int]int, len(nums))
	//遍历数组，对于每个元素，计算出需要的另一个元素的值
	for i, num := range nums {
		// 计算出需要的另一个元素的值
		if j, ok := hastable[target-num]; ok {
			// 如果哈希表中存在这个值，则返回当前元素的下标和这个值的下标
			// 注意这里的 j 是之前存入哈希表的下标
			// i 是当前元素的下标
			return []int{j, i}
		}
		//如果不存在，则将当前元素及其下标存入哈希表中
		hastable[num] = i
	}
	return []int{}
}
