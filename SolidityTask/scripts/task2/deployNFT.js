const hre = require("hardhat");

async function main() {
    console.log("🚀 开始部署 MyNFT 合约...");

    // 获取部署者账户
    const [deployer] = await hre.ethers.getSigners();
    console.log("部署者账户:", deployer.address);

    // 检查部署者余额
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("部署者余额:", hre.ethers.formatEther(balance), "ETH");

    if (balance < hre.ethers.parseEther("0.01")) {
        console.warn("⚠️  警告: 账户余额可能不足以支付部署费用");
    }

    console.log("正在部署合约...");

    // 部署合约
    const MyNFT = await hre.ethers.getContractFactory("MyNFT");
    const nft = await MyNFT.deploy("MyAwesomeNFT", "MANFT");

    // 等待部署完成
    await nft.waitForDeployment();
    const nftAddress = await nft.getAddress();

    console.log("✅ MyNFT 合约部署成功!");
    console.log("📄 合约地址:", nftAddress);
    console.log("🏷️  NFT名称:", await nft.name());
    console.log("🔤 NFT符号:", await nft.symbol());
    console.log("👤 合约所有者:", await nft.owner());
    console.log("🆔 下一个Token ID:", (await nft.getNextTokenId()).toString());

    // 如果是测试网，提供一些有用的链接
    const network = hre.network.name;
    if (network === "sepolia") {
        console.log("\n🔗 有用的链接:");
        console.log(`📊 Etherscan: https://sepolia.etherscan.io/address/${nftAddress}`);
        console.log(`🖼️  OpenSea: https://testnets.opensea.io/assets/sepolia/${nftAddress}`);
    }

    // 保存合约地址到文件
    const fs = require('fs');
    const contractInfo = {
        address: nftAddress,
        name: await nft.name(),
        symbol: await nft.symbol(),
        network: network,
        deployedAt: new Date().toISOString()
    };

    fs.writeFileSync('deployed-nft-contract.json', JSON.stringify(contractInfo, null, 2));
    console.log("📝 合约信息已保存到 deployed-nft-contract.json");

    // 返回合约地址供其他脚本使用
    return {
        nftAddress: nftAddress,
        nftContract: nft
    };
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