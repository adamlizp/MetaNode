// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
     5.合并两个有序数组 (Merge Sorted Array)
     题目描述：将两个有序数组合并为一个有序数组。
    */


contract MergeSortedArray {
    /// @notice 合并两个升序的 uint 数组，返回升序新数组
    /// @dev 使用从后往前填充的 O(m+n) 算法
    function merge(
        uint256[] memory arr1,
        uint256[] memory arr2
    ) public pure returns (uint256[] memory c) {
        uint256 m = arr1.length;
        uint256 n = arr2.length;
        // 分配结果数组
        c = new uint256[](m + n);

        // 三个指针：从尾部开始写
        uint256 i = m;     // a 的尾索引+1
        uint256 j = n;     // b 的尾索引+1
        uint256 k = m + n; // c 的尾索引+1

        // 从大到小比较写入结果数组末尾
        while (i > 0 && j > 0) {
            uint256 ai = arr1[i - 1];
            uint256 bj = arr2[j - 1];
            if (ai > bj) {
                unchecked { --i; --k; }
                c[k] = ai;
            } else {
                unchecked { --j; --k; }
                c[k] = bj;
            }
        }

        // 如果 a 还有剩余，复制过来
        while (i > 0) {
            unchecked { --i; --k; }
            c[k] = arr1[i];
        }

        // 如果 b 还有剩余，复制过来
        while (j > 0) {
            unchecked { --j; --k; }
            c[k] = arr2[j];
        }
        
    }

}
