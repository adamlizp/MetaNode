// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


/**
     3.用 solidity 实现整数转罗马数字
     罗马数字包含以下七种字符: I， V， X， L，C，D 和 M。

     字符          数值
     I             1
     V             5
     X             10
     L             50
     C             100
     D             500
     M             1000 
    例如， 罗马数字 2 写做 II ，即为两个并列的 1 。12 写做 XII ，即为 X + II 。 27 写做  XXVII, 即为 XX + V + II 。 
    通常情况下，罗马数字中小的数字在大的数字的右边。但也存在特例，例如 4 不写做 IIII，而是 IV。数字 1 在数字 5 的左边，所表示的数等于大数 5 减小数 1 得到的数值 4 。同样地，数字 9 表示为 IX。这个特殊的规则只适用于以下六种情况：
    I 可以放在 V (5) 和 X (10) 的左边，来表示 4 和 9。
    X 可以放在 L (50) 和 C (100) 的左边，来表示 40 和 90。 
    C 可以放在 D (500) 和 M (1000) 的左边，来表示 400 和 900。
    给定一个整数，将其转换成罗马数字。
    */

/**
 * @title IntToRoman
 * @dev 整数转罗马数字
 * @author liyuan
 */
contract IntToRoman {
    /// @notice 将整数(1..3999)转换为罗马数字
    function intToRoman(uint256 num) external pure returns (string memory) {
        require(num > 0 && num <= 3999, "range 1..3999");

        // 13 个面额，已包含所有“减法规则”的特殊写法
        uint16[13] memory v = [uint16(1000),900,500,400,100,90,50,40,10,9,5,4,1];
        string[13] memory s = [
            "M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"
        ];

        string memory out = "";
        unchecked {
            for (uint256 i = 0; num > 0; ++i) {
                while (num >= v[i]) {
                    out = string(abi.encodePacked(out, s[i])); // 连接字符串
                    num -= v[i];
                }
            }
        }
        return out;
    }

}
