const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * 合约升级脚本
 * 支持UUPS代理模式的安全升级
 */

async function upgradeContract(proxyAddress, newImplementationName, validateUpgrade = true) {
    console.log(`\n🔄 升级合约: ${newImplementationName}`);
    console.log(`代理地址: ${proxyAddress}`);
    
    try {
        // 获取新的实现合约工厂
        const NewImplementation = await ethers.getContractFactory(newImplementationName);
        
        // 验证升级兼容性
        if (validateUpgrade) {
            console.log("  验证升级兼容性...");
            try {
                await upgrades.validateUpgrade(proxyAddress, NewImplementation);
                console.log("  ✅ 升级兼容性验证通过");
            } catch (error) {
                console.error("  ❌ 升级兼容性验证失败:", error.message);
                throw new Error(`升级验证失败: ${error.message}`);
            }
        }
        
        // 执行升级
        console.log("  执行合约升级...");
        const upgraded = await upgrades.upgradeProxy(proxyAddress, NewImplementation);
        
        // 等待升级交易确认
        const receipt = await upgraded.deploymentTransaction().wait();
        console.log(`  ✅ 升级成功，交易哈希: ${receipt.hash}`);
        
        // 获取新的实现地址
        const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
        console.log(`  新实现地址: ${newImplementationAddress}`);
        
        return {
            success: true,
            proxyAddress,
            newImplementationAddress,
            transactionHash: receipt.hash,
            gasUsed: receipt.gasUsed.toString()
        };
        
    } catch (error) {
        console.error(`  ❌ 升级失败:`, error.message);
        return {
            success: false,
            proxyAddress,
            error: error.message
        };
    }
}

async function main() {
    const [deployer] = await ethers.getSigners();
    const networkName = hre.network.name;
    
    console.log("🚀 开始合约升级流程...");
    console.log(`网络: ${networkName}`);
    console.log(`升级者: ${deployer.address}`);
    console.log(`余额: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
    
    // 读取最新部署信息
    const deploymentDir = path.join(__dirname, "../deployments");
    
    if (!fs.existsSync(deploymentDir)) {
        throw new Error("未找到部署目录");
    }
    
    const deploymentFiles = fs.readdirSync(deploymentDir)
        .filter(file => file.startsWith(networkName) && file.endsWith('.json'))
        .sort()
        .reverse();
    
    if (deploymentFiles.length === 0) {
        throw new Error(`未找到 ${networkName} 网络的部署文件`);
    }
    
    const latestDeployment = deploymentFiles[0];
    const deploymentPath = path.join(deploymentDir, latestDeployment);
    
    console.log(`\n📄 读取部署信息: ${latestDeployment}`);
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    const upgradeResults = [];
    
    // 升级工厂合约
    if (deployment.contracts.auctionFactory && deployment.contracts.auctionFactory.address) {
        console.log("\n🏭 升级拍卖工厂合约...");
        
        const factoryResult = await upgradeContract(
            deployment.contracts.auctionFactory.address,
            "AuctionFactory",
            true
        );
        upgradeResults.push({
            name: "AuctionFactory",
            ...factoryResult
        });
    }
    
    // 如果有其他需要升级的代理合约，可以在这里添加
    // 注意：实现合约本身不需要升级，只有代理合约需要升级
    
    // 升级示例合约（如果它们是代理合约）
    if (deployment.contracts.examples) {
        const examples = deployment.contracts.examples;
        
        // 检查并升级示例拍卖合约
        if (examples.auction && examples.auction.address) {
            console.log("\n🎯 升级示例拍卖合约...");
            
            try {
                // 检查是否为代理合约
                const implementationAddr = await upgrades.erc1967.getImplementationAddress(examples.auction.address);
                if (implementationAddr) {
                    const auctionResult = await upgradeContract(
                        examples.auction.address,
                        "NFTAuction",
                        true
                    );
                    upgradeResults.push({
                        name: "示例拍卖合约",
                        ...auctionResult
                    });
                }
            } catch (error) {
                console.log("  ℹ️  示例拍卖合约不是代理合约，跳过升级");
            }
        }
        
        // 检查并升级示例NFT合约
        if (examples.nft && examples.nft.address) {
            console.log("\n🎨 升级示例NFT合约...");
            
            try {
                const implementationAddr = await upgrades.erc1967.getImplementationAddress(examples.nft.address);
                if (implementationAddr) {
                    const nftResult = await upgradeContract(
                        examples.nft.address,
                        "AuctionNFT",
                        true
                    );
                    upgradeResults.push({
                        name: "示例NFT合约",
                        ...nftResult
                    });
                }
            } catch (error) {
                console.log("  ℹ️  示例NFT合约不是代理合约，跳过升级");
            }
        }
        
        // 检查并升级示例代币合约
        if (examples.token && examples.token.address) {
            console.log("\n🪙 升级示例代币合约...");
            
            try {
                const implementationAddr = await upgrades.erc1967.getImplementationAddress(examples.token.address);
                if (implementationAddr) {
                    const tokenResult = await upgradeContract(
                        examples.token.address,
                        "AuctionToken",
                        true
                    );
                    upgradeResults.push({
                        name: "示例代币合约",
                        ...tokenResult
                    });
                }
            } catch (error) {
                console.log("  ℹ️  示例代币合约不是代理合约，跳过升级");
            }
        }
    }
    
    // 升级结果总结
    console.log("\n📊 升级结果总结:");
    console.log("=" * 60);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const result of upgradeResults) {
        if (result.success) {
            console.log(`✅ ${result.name}:`);
            console.log(`   代理地址: ${result.proxyAddress}`);
            console.log(`   新实现: ${result.newImplementationAddress}`);
            console.log(`   交易哈希: ${result.transactionHash}`);
            console.log(`   Gas用量: ${result.gasUsed}`);
            successCount++;
        } else {
            console.log(`❌ ${result.name}:`);
            console.log(`   代理地址: ${result.proxyAddress}`);
            console.log(`   错误: ${result.error}`);
            failCount++;
        }
        console.log("");
    }
    
    console.log("=" * 60);
    console.log(`总计: ${upgradeResults.length} 个合约`);
    console.log(`成功: ${successCount} 个`);
    console.log(`失败: ${failCount} 个`);
    
    // 保存升级结果
    const upgradeLog = {
        network: networkName,
        upgrader: deployer.address,
        timestamp: new Date().toISOString(),
        sourceDeployment: latestDeployment,
        results: upgradeResults,
        summary: {
            total: upgradeResults.length,
            success: successCount,
            failed: failCount
        }
    };
    
    const upgradeFile = path.join(deploymentDir, `upgrade_${networkName}_${Date.now()}.json`);
    fs.writeFileSync(upgradeFile, JSON.stringify(upgradeLog, null, 2));
    console.log(`\n📄 升级日志已保存: ${path.basename(upgradeFile)}`);
    
    if (failCount > 0) {
        console.log("\n⚠️  注意:");
        console.log("- 某些升级失败可能是正常的（如非代理合约）");
        console.log("- 请检查错误信息并手动处理必要的升级");
        console.log("- 升级前请确保已充分测试新的合约代码");
    }
    
    if (successCount > 0) {
        console.log("\n🎉 升级完成!");
        console.log("- 请验证新合约功能是否正常");
        console.log("- 建议在测试环境先验证升级效果");
        console.log("- 可以使用验证脚本验证新实现合约");
    }
}

// 导出升级函数
module.exports = { upgradeContract, main };

// 直接运行时执行升级
if (require.main === module) {
    main()
        .then(() => {
            console.log("✅ 升级脚本执行完成");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ 升级脚本执行失败:", error);
            process.exit(1);
        });
}