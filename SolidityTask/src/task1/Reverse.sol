// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.0;

contract Reverse {
    /**
     2.反转字符串 (Reverse String)
     题目描述：反转一个字符串。输入 "abcde"，输出 "edcba"
    */
    function reverse(string memory s) public pure returns (string memory) {
        //string 转为 bytes 操控下标
        bytes memory strBytes = bytes(s);
        uint length = strBytes.length;
        //新建一个新字节数组
        bytes memory newStr = new bytes(length);

        // 反转
        for (uint i = 0; i < length; i++) {
            newStr[i] = strBytes[length - i - 1];
        }
        //bytes 转为 string
        return string(newStr);
    }
}