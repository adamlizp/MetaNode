// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


/**
     6.二分查找 (Binary Search)
     题目描述：在一个有序数组中查找目标值。
    */

contract BinarySearch {
    /// @notice 在升序的 int 数组中查找 target（可用于需要返回 -1 的语义）
    /// @dev O(log n)，未找到返回 -1
    function searchInt(
        int256[] calldata nums,
        int256 target
    ) external pure returns (int256) {
        if (nums.length == 0) return -1;

        uint256 left = 0;
        uint256 right = nums.length - 1;

        while (left <= right) {
            uint256 mid = left + (right - left) / 2;
            int256 val = nums[mid];

            if (val == target) {
                return int256(mid);
            } else if (val < target) {
                left = mid + 1;
            } else {
                //向左缩小区间要小心下溢：mid==0 时不能做 mid-1，提前 break/return
                if (mid == 0) return -1;
                right = mid - 1;
            }
        }
        return -1;
    }
}
    