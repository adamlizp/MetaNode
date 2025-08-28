// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
     4.用 solidity 实现罗马数字转数整数
     七个不同的符号代表罗马数字，其值如下：

     字符          数值
     I             1
     V             5
     X             10
     L             50
     C             100
     D             500
     M             1000 
     罗马数字是通过添加从最高到最低的小数位值的转换而形成的。将小数位值转换为罗马数字有以下规则：
     如果该值不是以 4 或 9 开头，请选择可以从输入中减去的最大值的符号，将该符号附加到结果，减去其值，然后将其余部分转换为罗马数字。
     如果该值以 4 或 9 开头，使用 减法形式，表示从以下符号中减去一个符号，例如 4 是 5 (V) 减 1 (I): IV ，9 是 10 (X) 减 1 (I)：IX。仅使用以下减法形式：4 (IV)，9 (IX)，40 (XL)，90 (XC)，400 (CD) 和 900 (CM)。
     只有 10 的次方（I, X, C, M）最多可以连续附加 3 次以代表 10 的倍数。你不能多次附加 5 (V)，50 (L) 或 500 (D)。如果需要将符号附加4次，请使用 减法形式。
     给定一个罗马数字，将其转换为整数。
    */
contract RomanToInt {
    /// @notice
    /// @dev 将罗马数字转换为整数
    function romanToInt(string memory roman) external pure returns (uint256) {
        bytes memory s = bytes(roman);
        uint256 n = s.length;
        require(n > 0, "empty string");
        
        uint256 res = 0;
        uint256 i = 0;

        while(i < n) { 
            uint256 v1 = _val(s[i]);

            // 看右侧是否存在更大的值（处理IV/IX/XL/CD/CM 等减法对）
            if (i + 1 < n) {
                uint256 v2 = _val(s[i + 1]);    
                if (v1 < v2) {
                    //减法对，累加插值并跳过两个字符
                    res += v2 - v1;
                    i += 2;
                    continue;
                } 
            }

            // 普通情况
            res += v1;
            //unchecked 会忽略溢出
            unchecked {
              ++i;  
            } 

        }
        return res;
    }

    /// @dev 单个字符映射到数值： 遇到非法字符直接revert
    function _val(bytes1 c) internal pure returns (uint256) {
        if (c == "I") return 1;
        if (c == "V") return 5;
        if (c == "X") return 10;
        if (c == "L") return 50;
        if (c == "C") return 100;
        if (c == "D") return 500;
        if (c == "M") return 1000;
        revert("invalid roman char");
    }

}