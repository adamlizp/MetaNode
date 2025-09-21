// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Counter
 * @dev 简单的计数器合约，用于演示
 */
contract Counter {
    // 状态变量：存储计数器的值
    uint256 private count;

    // 事件：计数器递增时触发
    event Increment(uint256 newValue);

    // 事件：计数器递减时触发
    event Decrement(uint256 newValue);

    // 事件：计数器重置时触发
    event Reset();

    /**
     * @dev 构造函数：设置计数器的初始值
     */
    constructor() {
        count = 0;
    }

    /**
     * @dev 获取当前计数器的值
     * @return 返回当前计数器的值
     */
    function getCount() public view returns (uint256) {
        return count;
    }

    /**
     * @dev 将计数器的值递增1
     */
    function increment() public {
        count += 1;
        emit Increment(count);
    }

    /**
     * @dev 将计数器的值递减1
     * @notice 如果计数器已经为0，将回滚交易
     */
    function decrement() public {
        require(count > 0, "Counter: 不能递减到负数");
        count -= 1;
        emit Decrement(count);
    }

    /**
     * @dev 将计数器递增指定的值
     * @param value 递增的数量
     */
    function incrementBy(uint256 value) public {
        count += value;
        emit Increment(count);
    }

    /**
     * @dev 将计数器重置为0
     */
    function reset() public {
        count = 0;
        emit Reset();
    }
}
