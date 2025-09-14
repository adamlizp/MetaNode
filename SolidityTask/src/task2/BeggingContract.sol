// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title BeggingContract
 * @dev 讨饭合约 - 允许用户向合约捐赠以太币，合约所有者可以提取资金
 */
contract BeggingContract {
    // 合约所有者
    address public owner;

    // 记录每个捐赠者的总捐赠金额
    mapping(address => uint256) public donations;

    // 记录所有捐赠者地址（用于排行榜功能）
    address[] public donors;

    // 总捐赠金额
    uint256 public totalDonations;

    // 捐赠开始和结束时间（可选的时间限制功能）
    uint256 public donationStartTime;
    uint256 public donationEndTime;

    // 是否启用时间限制
    bool public timeRestrictionEnabled;

    // 事件定义
    event Donation(address indexed donor, uint256 amount, uint256 timestamp);
    event Withdrawal(address indexed owner, uint256 amount, uint256 timestamp);
    event TimeRestrictionUpdated(
        uint256 startTime,
        uint256 endTime,
        bool enabled
    );

    // 修饰符：只有合约所有者可以调用
    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Only the contract owner can call this function"
        );
        _;
    }

    // 修饰符：检查时间限制
    modifier withinTimeLimit() {
        if (timeRestrictionEnabled) {
            require(
                block.timestamp >= donationStartTime &&
                    block.timestamp <= donationEndTime,
                "Donations are not allowed at this time"
            );
        }
        _;
    }

    /**
     * @dev 构造函数，设置合约所有者
     */
    constructor() {
        owner = msg.sender;
        donationStartTime = block.timestamp;
        donationEndTime = block.timestamp + 365 days; // 默认一年
        timeRestrictionEnabled = false; // 默认不启用时间限制
    }

    /**
     * @dev 捐赠函数，允许用户向合约发送以太币
     */
    function donate() external payable withinTimeLimit {
        require(msg.value > 0, "Donation amount must be greater than 0");

        // 如果是新的捐赠者，添加到捐赠者列表
        if (donations[msg.sender] == 0) {
            donors.push(msg.sender);
        }

        // 记录捐赠金额
        donations[msg.sender] += msg.value;
        totalDonations += msg.value;

        // 触发捐赠事件
        emit Donation(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @dev 提取函数，只有合约所有者可以提取所有资金
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        // 将合约中的所有资金转账给所有者
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Withdrawal failed");

        // 触发提取事件
        emit Withdrawal(owner, balance, block.timestamp);
    }

    /**
     * @dev 查询某个地址的捐赠金额
     * @param donor 捐赠者地址
     * @return 该地址的总捐赠金额
     */
    function getDonation(address donor) external view returns (uint256) {
        return donations[donor];
    }

    /**
     * @dev 获取合约当前余额
     * @return 合约余额
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev 获取捐赠者总数
     * @return 捐赠者数量
     */
    function getDonorCount() external view returns (uint256) {
        return donors.length;
    }

    /**
     * @dev 获取捐赠排行榜前N名（额外挑战功能）
     * @param topN 要返回的排行榜数量
     * @return topDonors 前N名捐赠者地址
     * @return topAmounts 前N名捐赠金额
     */
    function getTopDonors(
        uint256 topN
    )
        external
        view
        returns (address[] memory topDonors, uint256[] memory topAmounts)
    {
        require(topN > 0, "topN must be greater than 0");

        uint256 donorCount = donors.length;
        if (donorCount == 0) {
            return (new address[](0), new uint256[](0));
        }

        // 限制返回数量不超过实际捐赠者数量
        uint256 returnCount = topN > donorCount ? donorCount : topN;

        // 创建临时数组用于排序
        address[] memory tempDonors = new address[](donorCount);
        uint256[] memory tempAmounts = new uint256[](donorCount);

        // 复制数据
        for (uint256 i = 0; i < donorCount; i++) {
            tempDonors[i] = donors[i];
            tempAmounts[i] = donations[donors[i]];
        }

        // 简单的冒泡排序（按捐赠金额降序）
        for (uint256 i = 0; i < donorCount - 1; i++) {
            for (uint256 j = 0; j < donorCount - i - 1; j++) {
                if (tempAmounts[j] < tempAmounts[j + 1]) {
                    // 交换金额
                    uint256 tempAmount = tempAmounts[j];
                    tempAmounts[j] = tempAmounts[j + 1];
                    tempAmounts[j + 1] = tempAmount;

                    // 交换地址
                    address tempDonor = tempDonors[j];
                    tempDonors[j] = tempDonors[j + 1];
                    tempDonors[j + 1] = tempDonor;
                }
            }
        }

        // 返回前N名
        topDonors = new address[](returnCount);
        topAmounts = new uint256[](returnCount);

        for (uint256 i = 0; i < returnCount; i++) {
            topDonors[i] = tempDonors[i];
            topAmounts[i] = tempAmounts[i];
        }

        return (topDonors, topAmounts);
    }

    /**
     * @dev 设置时间限制（额外挑战功能）
     * @param startTime 捐赠开始时间
     * @param endTime 捐赠结束时间
     * @param enabled 是否启用时间限制
     */
    function setTimeRestriction(
        uint256 startTime,
        uint256 endTime,
        bool enabled
    ) external onlyOwner {
        require(endTime > startTime, "End time must be after start time");

        donationStartTime = startTime;
        donationEndTime = endTime;
        timeRestrictionEnabled = enabled;

        emit TimeRestrictionUpdated(startTime, endTime, enabled);
    }

    /**
     * @dev 获取时间限制信息
     * @return startTime 开始时间
     * @return endTime 结束时间
     * @return enabled 是否启用
     */
    function getTimeRestriction()
        external
        view
        returns (uint256 startTime, uint256 endTime, bool enabled)
    {
        return (donationStartTime, donationEndTime, timeRestrictionEnabled);
    }

    /**
     * @dev 转移合约所有权
     * @param newOwner 新所有者地址
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be the zero address");
        owner = newOwner;
    }

    /**
     * @dev 允许合约接收以太币（当直接向合约地址转账时）
     */
    receive() external payable {
        // 直接向合约转账也算作捐赠
        if (msg.value > 0) {
            // 检查时间限制
            if (timeRestrictionEnabled) {
                require(
                    block.timestamp >= donationStartTime &&
                        block.timestamp <= donationEndTime,
                    "Donations are not allowed at this time"
                );
            }

            // 如果是新的捐赠者，添加到捐赠者列表
            if (donations[msg.sender] == 0) {
                donors.push(msg.sender);
            }

            // 记录捐赠金额
            donations[msg.sender] += msg.value;
            totalDonations += msg.value;

            // 触发捐赠事件
            emit Donation(msg.sender, msg.value, block.timestamp);
        }
    }

    /**
     * @dev fallback函数
     */
    fallback() external payable {
        // 重定向到receive函数
        if (msg.value > 0) {
            // 检查时间限制
            if (timeRestrictionEnabled) {
                require(
                    block.timestamp >= donationStartTime &&
                        block.timestamp <= donationEndTime,
                    "Donations are not allowed at this time"
                );
            }

            // 如果是新的捐赠者，添加到捐赠者列表
            if (donations[msg.sender] == 0) {
                donors.push(msg.sender);
            }

            // 记录捐赠金额
            donations[msg.sender] += msg.value;
            totalDonations += msg.value;

            // 触发捐赠事件
            emit Donation(msg.sender, msg.value, block.timestamp);
        }
    }
}
