const { ethers } = require("hardhat");

async function main() {
    console.log("开始部署 MyToken 合约...");

    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    console.log("部署者账户:", deployer.address);
    console.log("部署者余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

    // 获取合约工厂
    const MyToken = await ethers.getContractFactory("MyToken");

    // 部署合约，初始供应量为 1,000,000 个代币
    console.log("正在部署合约...");
    const initialSupply = 1000000; // 1,000,000 tokens
    const token = await MyToken.deploy(initialSupply);

    // 等待部署完成
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();

    console.log("✅ MyToken 合约部署成功!");
    console.log("合约地址:", tokenAddress);
    console.log("代币名称:", await token.name());
    console.log("代币符号:", await token.symbol());
    console.log("小数位数:", await token.decimals());
    console.log("总供应量:", ethers.formatEther(await token.totalSupply()), "MTK");
    console.log("合约所有者:", await token.owner());

    // 验证部署者的余额
    const ownerBalance = await token.balanceOf(deployer.address);
    console.log("部署者代币余额:", ethers.formatEther(ownerBalance), "MTK");

    console.log("\n📝 部署信息摘要:");
    console.log("==================");
    console.log(`网络: ${(await ethers.provider.getNetwork()).name}`);
    console.log(`链 ID: ${(await ethers.provider.getNetwork()).chainId}`);
    console.log(`合约地址: ${tokenAddress}`);
    console.log(`交易哈希: ${token.deploymentTransaction().hash}`);

    console.log("\n🔗 在区块链浏览器中查看:");
    if ((await ethers.provider.getNetwork()).chainId === 11155111n) {
        console.log(`Sepolia Etherscan: https://sepolia.etherscan.io/address/${tokenAddress}`);
    }

    console.log("\n💰 添加到钱包:");
    console.log("==================");
    console.log("代币合约地址:", tokenAddress);
    console.log("代币符号: MTK");
    console.log("小数位数: 18");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("部署失败:", error);
        process.exit(1);
    });
