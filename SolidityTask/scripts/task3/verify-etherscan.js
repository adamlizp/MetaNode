const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * 合约源码验证脚本
 * 自动在Etherscan等区块链浏览器上验证已部署的合约
 */

async function verifyContract(contractAddress, constructorArgs = [], contractName = "") {
    try {
        console.log(`验证合约: ${contractName} at ${contractAddress}`);
        
        await hre.run("verify:verify", {
            address: contractAddress,
            constructorArguments: constructorArgs,
        });
        
        console.log(`✅ ${contractName} 验证成功`);
        return true;
        
    } catch (error) {
        if (error.message.includes("Already Verified")) {
            console.log(`ℹ️  ${contractName} 已经验证过了`);
            return true;
        } else {
            console.error(`❌ ${contractName} 验证失败:`, error.message);
            return false;
        }
    }
}

async function main() {
    const networkName = hre.network.name;
    console.log(`🔍 开始在 ${networkName} 网络验证合约...`);
    
    // 从部署文件中读取合约地址
    const deploymentDir = path.join(__dirname, "../deployments");
    
    if (!fs.existsSync(deploymentDir)) {
        throw new Error("未找到部署目录，请先运行部署脚本");
    }
    
    // 查找最新的部署文件
    const deploymentFiles = fs.readdirSync(deploymentDir)
        .filter(file => file.startsWith(networkName) && file.endsWith('.json'))
        .sort()
        .reverse();
    
    if (deploymentFiles.length === 0) {
        throw new Error(`未找到 ${networkName} 网络的部署文件`);
    }
    
    const latestDeployment = deploymentFiles[0];
    const deploymentPath = path.join(deploymentDir, latestDeployment);
    
    console.log(`📄 读取部署文件: ${latestDeployment}`);
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    if (!deployment.contracts) {
        throw new Error("部署文件中未找到合约信息");
    }
    
    const results = [];
    
    // 验证Mock价格预言机（如果是本地网络则跳过）
    if (networkName !== "localhost" && networkName !== "hardhat") {
        console.log("\n📊 验证价格预言机...");
        
        if (deployment.contracts.ethPriceFeedMock) {
            const result = await verifyContract(
                deployment.contracts.ethPriceFeedMock.address,
                [8, 200000000000], // decimals, initialAnswer
                "ETH价格预言机Mock"
            );
            results.push({ name: "ETH价格预言机Mock", success: result });
        }
        
        if (deployment.contracts.usdcPriceFeedMock) {
            const result = await verifyContract(
                deployment.contracts.usdcPriceFeedMock.address,
                [8, 100000000], // decimals, initialAnswer  
                "USDC价格预言机Mock"
            );
            results.push({ name: "USDC价格预言机Mock", success: result });
        }
    }
    
    // 验证合约实现
    console.log("\n🏗️  验证合约实现...");
    
    if (deployment.contracts.implementations) {
        const impls = deployment.contracts.implementations;
        
        // 验证拍卖合约实现
        if (impls.auction) {
            const result = await verifyContract(
                impls.auction.address,
                [], // 实现合约无构造参数
                "NFTAuction实现"
            );
            results.push({ name: "NFTAuction实现", success: result });
        }
        
        // 验证NFT合约实现
        if (impls.nft) {
            const result = await verifyContract(
                impls.nft.address,
                [],
                "AuctionNFT实现"
            );
            results.push({ name: "AuctionNFT实现", success: result });
        }
        
        // 验证代币合约实现
        if (impls.token) {
            const result = await verifyContract(
                impls.token.address,
                [],
                "AuctionToken实现"
            );
            results.push({ name: "AuctionToken实现", success: result });
        }
    }
    
    // 验证工厂合约 (代理合约较复杂，可能需要特殊处理)
    console.log("\n🏭 验证工厂合约...");
    if (deployment.contracts.auctionFactory) {
        try {
            // 对于UUPS代理，我们需要验证实现合约
            const factoryImpl = deployment.contracts.auctionFactory.implementation;
            if (factoryImpl) {
                const result = await verifyContract(
                    factoryImpl,
                    [],
                    "AuctionFactory实现"
                );
                results.push({ name: "AuctionFactory实现", success: result });
            }
        } catch (error) {
            console.log("⚠️  工厂合约验证需要手动处理代理合约");
        }
    }
    
    // 总结验证结果
    console.log("\n📊 验证结果总结:");
    console.log("=" * 50);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const result of results) {
        const status = result.success ? "✅ 成功" : "❌ 失败";
        console.log(`  ${result.name}: ${status}`);
        
        if (result.success) {
            successCount++;
        } else {
            failCount++;
        }
    }
    
    console.log("=" * 50);
    console.log(`总计: ${results.length} 个合约`);
    console.log(`成功: ${successCount} 个`);
    console.log(`失败: ${failCount} 个`);
    
    if (failCount > 0) {
        console.log("\n⚠️  注意事项:");
        console.log("- 代理合约的验证可能需要特殊工具");
        console.log("- 某些网络可能还不支持自动验证");
        console.log("- 可以稍后手动在区块链浏览器上验证");
    }
    
    // 保存验证结果
    const verificationResult = {
        network: networkName,
        timestamp: new Date().toISOString(),
        deploymentFile: latestDeployment,
        results,
        summary: {
            total: results.length,
            success: successCount,
            failed: failCount
        }
    };
    
    const verificationFile = path.join(deploymentDir, `verification_${networkName}_${Date.now()}.json`);
    fs.writeFileSync(verificationFile, JSON.stringify(verificationResult, null, 2));
    console.log(`\n📄 验证结果已保存: ${path.basename(verificationFile)}`);
}

main()
    .then(() => {
        console.log("\n✅ 合约验证完成");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ 合约验证失败:", error);
        process.exit(1);
    });