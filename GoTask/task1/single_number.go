package task1

func SingleNumber(nums []int) int {
	singleNum := 0
	for _, v := range nums {
		singleNum ^= v
	}
	return singleNum
}
