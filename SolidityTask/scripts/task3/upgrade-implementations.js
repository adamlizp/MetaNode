const { ethers, upgrades } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🔄 开始升级NFT拍卖系统合约...");

    const [deployer] = await ethers.getSigners();
    console.log("升级账户:", deployer.address);
    console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

    const networkName = (await ethers.provider.getNetwork()).name;
    console.log("网络:", networkName);

    // 读取部署配置
    const configFiles = fs.readdirSync('deployments').filter(f =>
        f.startsWith(`${networkName}_`) && f.endsWith('.json') && !f.includes('error')
    );

    if (configFiles.length === 0) {
        throw new Error(`未找到${networkName}网络的部署配置文件`);
    }

    // 使用最新的配置文件
    const latestConfig = configFiles.sort().reverse()[0];
    const deploymentConfig = JSON.parse(fs.readFileSync(`deployments/${latestConfig}`, 'utf8'));

    console.log("使用配置文件:", latestConfig);

    const upgradeResult = {
        network: networkName,
        upgrader: deployer.address,
        timestamp: new Date().toISOString(),
        upgrades: {}
    };

    try {
        // 1. 升级工厂合约
        console.log("\n🏭 升级拍卖工厂合约...");
        const factoryAddress = deploymentConfig.contracts.auctionFactory.address;

        const AuctionFactoryV2 = await ethers.getContractFactory("AuctionFactory");
        const upgradedFactory = await upgrades.upgradeProxy(factoryAddress, AuctionFactoryV2);
        await upgradedFactory.waitForDeployment();

        console.log("✅ 工厂合约升级完成:", factoryAddress);
        upgradeResult.upgrades.auctionFactory = {
            address: factoryAddress,
            status: "success",
            timestamp: new Date().toISOString()
        };

        // 2. 升级拍卖合约实现
        console.log("\n🎯 升级拍卖合约实现...");
        const NFTAuctionV2 = await ethers.getContractFactory("NFTAuction");
        const newAuctionImpl = await NFTAuctionV2.deploy();
        await newAuctionImpl.waitForDeployment();
        const newAuctionImplAddress = await newAuctionImpl.getAddress();

        // 更新工厂合约中的实现地址
        await upgradedFactory.updateAuctionImplementation(newAuctionImplAddress);
        console.log("✅ 拍卖合约实现升级完成:", newAuctionImplAddress);

        upgradeResult.upgrades.auctionImplementation = {
            oldAddress: deploymentConfig.contracts.auctionImplementation.address,
            newAddress: newAuctionImplAddress,
            status: "success",
            timestamp: new Date().toISOString()
        };

        // 3. 升级NFT合约实现
        console.log("\n🎨 升级NFT合约实现...");
        const AuctionNFTV2 = await ethers.getContractFactory("AuctionNFT");
        const newNFTImpl = await AuctionNFTV2.deploy();
        await newNFTImpl.waitForDeployment();
        const newNFTImplAddress = await newNFTImpl.getAddress();

        await upgradedFactory.updateNFTImplementation(newNFTImplAddress);
        console.log("✅ NFT合约实现升级完成:", newNFTImplAddress);

        upgradeResult.upgrades.nftImplementation = {
            oldAddress: deploymentConfig.contracts.nftImplementation.address,
            newAddress: newNFTImplAddress,
            status: "success",
            timestamp: new Date().toISOString()
        };

        // 4. 升级代币合约实现
        console.log("\n🪙 升级代币合约实现...");
        const AuctionTokenV2 = await ethers.getContractFactory("AuctionToken");
        const newTokenImpl = await AuctionTokenV2.deploy();
        await newTokenImpl.waitForDeployment();
        const newTokenImplAddress = await newTokenImpl.getAddress();

        await upgradedFactory.updateTokenImplementation(newTokenImplAddress);
        console.log("✅ 代币合约实现升级完成:", newTokenImplAddress);

        upgradeResult.upgrades.tokenImplementation = {
            oldAddress: deploymentConfig.contracts.tokenImplementation.address,
            newAddress: newTokenImplAddress,
            status: "success",
            timestamp: new Date().toISOString()
        };

        // 5. 验证升级
        console.log("\n✅ 验证升级...");
        const factoryOwner = await upgradedFactory.owner();
        const currentAuctionImpl = await upgradedFactory.auctionImplementation();
        const currentNFTImpl = await upgradedFactory.nftImplementation();
        const currentTokenImpl = await upgradedFactory.tokenImplementation();

        console.log("工厂合约所有者:", factoryOwner);
        console.log("当前拍卖实现:", currentAuctionImpl);
        console.log("当前NFT实现:", currentNFTImpl);
        console.log("当前代币实现:", currentTokenImpl);

        // 验证实现地址是否正确更新
        if (currentAuctionImpl !== newAuctionImplAddress) {
            throw new Error("拍卖合约实现地址未正确更新");
        }
        if (currentNFTImpl !== newNFTImplAddress) {
            throw new Error("NFT合约实现地址未正确更新");
        }
        if (currentTokenImpl !== newTokenImplAddress) {
            throw new Error("代币合约实现地址未正确更新");
        }

        // 6. 保存升级结果
        const upgradeFile = `deployments/upgrade_${networkName}_${Date.now()}.json`;
        fs.writeFileSync(upgradeFile, JSON.stringify(upgradeResult, null, 2));
        console.log("📄 升级结果已保存到:", upgradeFile);

        // 7. 更新前端配置
        const frontendConfigFile = `deployments/frontend-config-${networkName}.json`;
        if (fs.existsSync(frontendConfigFile)) {
            const frontendConfig = JSON.parse(fs.readFileSync(frontendConfigFile, 'utf8'));

            // 更新实现地址（如果前端需要）
            frontendConfig.implementations = {
                auction: newAuctionImplAddress,
                nft: newNFTImplAddress,
                token: newTokenImplAddress
            };
            frontendConfig.lastUpgrade = new Date().toISOString();

            fs.writeFileSync(frontendConfigFile, JSON.stringify(frontendConfig, null, 2));
            console.log("🖥️  前端配置已更新");
        }

        console.log("\n🎉 合约升级完成!");
        console.log("=" * 50);
        console.log("📋 升级摘要:");
        console.log("工厂合约地址:", factoryAddress);
        console.log("新拍卖实现:", newAuctionImplAddress);
        console.log("新NFT实现:", newNFTImplAddress);
        console.log("新代币实现:", newTokenImplAddress);
        console.log("=" * 50);

    } catch (error) {
        console.error("❌ 升级失败:", error);

        upgradeResult.error = {
            message: error.message,
            stack: error.stack
        };

        const errorFile = `deployments/upgrade_error_${networkName}_${Date.now()}.json`;
        fs.writeFileSync(errorFile, JSON.stringify(upgradeResult, null, 2));
        console.log("错误日志已保存到:", errorFile);

        throw error;
    }
}

// 运行升级脚本
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
