package task1

//以数组 intervals 表示若干个区间的集合，其中单个区间为 intervals[i] = [starti, endi] 。
//请你合并所有重叠的区间，并返回 一个不重叠的区间数组，该数组需恰好覆盖输入中的所有区间 。

func MergeIntervals(intervals [][]int) [][]int {
	//可以先对区间数组按照区间的起始位置进行排序，然后使用一个切片来存储合并后的区间，
	// 遍历排序后的区间数组，将当前区间与切片中最后一个区间进行比较，
	// 如果有重叠，则合并区间；如果没有重叠，则将当前区间添加到切片中。
	n := len(intervals)
	if n == 0 {
		return [][]int{}
	}
	//先对区间数组按照区间的起始位置进行排序
	for i := 0; i < n-1; i++ {
		for j := i + 1; j < n; j++ {
			//如果当前区间的起始位置大于下一个区间的起始位置，则交换两个区间的位置
			if intervals[i][0] > intervals[j][0] {
				intervals[i], intervals[j] = intervals[j], intervals[i]
			}
		}
	}
	//然后使用一个切片来存储合并后的区间，由于区间数组已经按照起始位置排序，所以可以直接从第一个区间开始合并
	merged := [][]int{intervals[0]}

	for i := 1; i < n; i++ {
		//如果当前区间的起始位置小于或等于上一个区间的结束位置，有重叠，合并两个区间
		if intervals[i][0] <= merged[len(merged)-1][1] {
			merged[len(merged)-1][1] = max(intervals[i][1], merged[len(merged)-1][1])
		} else {
			//如果没有重叠，则将当前区间添加到切片中
			//为什么要将没有重叠的假如切片中呢？因为有重叠的区间已经合并过了，没有重叠的区间可以直接添加到切片中
			merged = append(merged, intervals[i])
		}
	}
	return merged
}
