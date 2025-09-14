const { ethers } = require("hardhat");

async function main() {
    console.log("开始部署 BeggingContract...");

    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    console.log("账户余额:", ethers.utils.formatEther(await deployer.getBalance()), "ETH");

    // 获取合约工厂
    const BeggingContract = await ethers.getContractFactory("BeggingContract");

    // 部署合约
    console.log("正在部署合约...");
    const beggingContract = await BeggingContract.deploy();
    await beggingContract.deployed();

    console.log("✅ BeggingContract 部署成功!");
    console.log("合约地址:", beggingContract.address);
    console.log("交易哈希:", beggingContract.deployTransaction.hash);
    console.log("Gas 使用量:", beggingContract.deployTransaction.gasLimit.toString());

    // 验证合约所有者
    const owner = await beggingContract.owner();
    console.log("合约所有者:", owner);

    // 获取初始状态
    const totalDonations = await beggingContract.totalDonations();
    const contractBalance = await beggingContract.getContractBalance();
    const donorCount = await beggingContract.getDonorCount();

    console.log("\n📊 合约初始状态:");
    console.log("总捐赠金额:", ethers.utils.formatEther(totalDonations), "ETH");
    console.log("合约余额:", ethers.utils.formatEther(contractBalance), "ETH");
    console.log("捐赠者数量:", donorCount.toString());

    // 获取时间限制信息
    const [startTime, endTime, enabled] = await beggingContract.getTimeRestriction();
    console.log("\n⏰ 时间限制设置:");
    console.log("开始时间:", new Date(startTime.toNumber() * 1000).toLocaleString());
    console.log("结束时间:", new Date(endTime.toNumber() * 1000).toLocaleString());
    console.log("时间限制启用:", enabled);

    console.log("\n🎉 部署完成! 你现在可以:");
    console.log("1. 在 Etherscan 上验证合约");
    console.log("2. 使用 MetaMask 向合约地址发送 ETH 进行测试");
    console.log("3. 调用合约的各种函数进行功能测试");

    // 返回合约地址供其他脚本使用
    return beggingContract.address;
}

// 如果直接运行此脚本
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("❌ 部署失败:", error);
            process.exit(1);
        });
}

module.exports = main;


