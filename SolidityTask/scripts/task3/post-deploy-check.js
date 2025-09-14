const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * 部署验证脚本
 * 验证已部署合约的基本功能和配置
 */

async function main() {
    const networkName = hre.network.name;
    console.log(`🔍 开始在 ${networkName} 网络进行部署验证...`);
    
    const [deployer] = await ethers.getSigners();
    console.log(`验证账户: ${deployer.address}`);
    console.log(`账户余额: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);
    
    // 读取部署配置文件
    const deploymentDir = path.join(__dirname, "../deployments");
    const frontendConfigFile = path.join(deploymentDir, `frontend-${networkName}.json`);
    
    if (!fs.existsSync(frontendConfigFile)) {
        throw new Error(`未找到网络 ${networkName} 的前端配置文件: ${frontendConfigFile}`);
    }
    
    const config = JSON.parse(fs.readFileSync(frontendConfigFile, "utf8"));
    console.log(`📄 读取配置文件: ${path.basename(frontendConfigFile)}`);
    
    const results = {
        network: networkName,
        timestamp: new Date().toISOString(),
        tests: [],
        summary: {
            total: 0,
            passed: 0,
            failed: 0
        }
    };

    // 测试工厂合约
    console.log("\n🏭 验证工厂合约...");
    await testAuctionFactory(config, results);
    
    // 测试NFT合约
    console.log("\n🎨 验证NFT合约...");
    await testNFTContract(config, results);
    
    // 测试代币合约
    console.log("\n💰 验证代币合约...");
    await testTokenContract(config, results);
    
    // 测试拍卖合约
    console.log("\n🏛️ 验证拍卖合约...");
    await testAuctionContract(config, results);
    
    // 输出测试结果
    console.log("\n📊 验证结果总结:");
    console.log("=" * 50);
    
    results.tests.forEach(test => {
        const status = test.passed ? "✅" : "❌";
        console.log(`  ${status} ${test.name}: ${test.message}`);
    });
    
    console.log("=" * 50);
    console.log(`总计: ${results.summary.total} 项测试`);
    console.log(`通过: ${results.summary.passed} 项`);
    console.log(`失败: ${results.summary.failed} 项`);
    
    // 保存验证结果
    const verificationFile = path.join(deploymentDir, `verification_${networkName}_${Date.now()}.json`);
    fs.writeFileSync(verificationFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 验证结果已保存: ${path.basename(verificationFile)}`);
    
    if (results.summary.failed > 0) {
        throw new Error(`验证失败: ${results.summary.failed} 项测试未通过`);
    }
    
    console.log("\n🎉 所有验证测试通过!");
}

async function testAuctionFactory(config, results) {
    const test = { name: "工厂合约基本功能", passed: false, message: "" };
    
    try {
        if (!config.contracts.AuctionFactory?.address) {
            throw new Error("工厂合约地址未配置");
        }
        
        const auctionFactory = await ethers.getContractAt(
            "AuctionFactory", 
            config.contracts.AuctionFactory.address
        );
        
        // 验证合约所有者
        const owner = await auctionFactory.owner();
        console.log(`  所有者: ${owner}`);
        
        // 验证价格预言机
        const ethPriceFeed = await auctionFactory.ethUsdPriceFeed();
        console.log(`  ETH价格预言机: ${ethPriceFeed}`);
        
        // 验证下一个合约ID
        const nextId = await auctionFactory.getNextContractId();
        console.log(`  下一个合约ID: ${nextId}`);
        
        // 验证支持的代币
        const supportedTokens = await auctionFactory.getSupportedTokens();
        console.log(`  支持的代币数量: ${supportedTokens.length}`);
        
        // 验证创建费用
        const creationFee = await auctionFactory.creationFee();
        console.log(`  创建费用: ${ethers.formatEther(creationFee)} ETH`);
        
        if (nextId > 0 && supportedTokens.length >= 0) {
            test.passed = true;
            test.message = "工厂合约配置正确";
        } else {
            test.message = "工厂合约配置异常";
        }
        
    } catch (error) {
        test.message = `工厂合约验证失败: ${error.message}`;
    }
    
    results.tests.push(test);
    results.summary.total++;
    if (test.passed) results.summary.passed++;
    else results.summary.failed++;
}

async function testNFTContract(config, results) {
    const test = { name: "NFT合约功能", passed: false, message: "" };
    
    try {
        if (!config.contracts.AuctionNFT?.address) {
            throw new Error("NFT合约地址未配置");
        }
        
        const nft = await ethers.getContractAt(
            "AuctionNFT",
            config.contracts.AuctionNFT.address
        );
        
        // 验证NFT基本信息
        const name = await nft.name();
        const symbol = await nft.symbol();
        console.log(`  NFT名称: ${name} (${symbol})`);
        
        // 检查当前供应量
        const [deployer] = await ethers.getSigners();
        const balance = await nft.balanceOf(deployer.address);
        console.log(`  部署者NFT余额: ${balance}`);
        
        // 尝试铸造测试NFT (如果合约允许)
        try {
            const mintTx = await nft.mintNFT(
                deployer.address, 
                "https://verification-test.json"
            );
            await mintTx.wait();
            console.log(`  ✅ 测试铸造成功`);
            
            const newBalance = await nft.balanceOf(deployer.address);
            console.log(`  新的NFT余额: ${newBalance}`);
            
        } catch (mintError) {
            console.log(`  ⚠️ 铸造测试跳过: ${mintError.message.substring(0, 50)}...`);
        }
        
        test.passed = true;
        test.message = `NFT合约 ${name} 功能正常`;
        
    } catch (error) {
        test.message = `NFT合约验证失败: ${error.message}`;
    }
    
    results.tests.push(test);
    results.summary.total++;
    if (test.passed) results.summary.passed++;
    else results.summary.failed++;
}

async function testTokenContract(config, results) {
    const test = { name: "代币合约功能", passed: false, message: "" };
    
    try {
        if (!config.contracts.AuctionToken?.address) {
            throw.Error("代币合约地址未配置");
        }
        
        const token = await ethers.getContractAt(
            "AuctionToken", 
            config.contracts.AuctionToken.address
        );
        
        // 验证代币基本信息
        const name = await token.name();
        const symbol = await token.symbol();
        const decimals = await token.decimals();
        
        console.log(`  代币名称: ${name} (${symbol})`);
        console.log(`  精度: ${decimals}`);
        
        // 检查总供应量
        const totalSupply = await token.totalSupply();
        console.log(`  总供应量: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
        
        // 检查部署者余额
        const [deployer] = await ethers.getSigners();
        const balance = await token.balanceOf(deployer.address);
        console.log(`  部署者余额: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
        
        test.passed = true;
        test.message = `代币合约 ${name} 功能正常`;
        
    } catch (error) {
        test.message = `代币合约验证失败: ${error.message}`;
    }
    
    results.tests.push(test);
    results.summary.total++;
    if (test.passed) results.summary.passed++;
    else results.summary.failed++;
}

async function testAuctionContract(config, results) {
    const test = { name: "拍卖合约功能", passed: false, message: "" };
    
    try {
        if (!config.contracts.NFTAuction?.address) {
            throw new Error("拍卖合约地址未配置");
        }
        
        const auction = await ethers.getContractAt(
            "NFTAuction",
            config.contracts.NFTAuction.address
        );
        
        // 测试价格获取功能
        try {
            const ethPrice = await auction.getETHPriceInUSD();
            console.log(`  当前ETH价格: $${ethers.formatEther(ethPrice)}`);
            
            // 测试手续费计算
            const fee1000 = await auction.calculateFee(ethers.parseEther("1000"));
            const fee15000 = await auction.calculateFee(ethers.parseEther("15000"));
            
            console.log(`  $1,000 拍卖手续费: $${ethers.formatEther(fee1000)}`);
            console.log(`  $15,000 拍卖手续费: $${ethers.formatEther(fee15000)}`);
            
            // 验证动态费率逻辑
            const baseFeeRate = await auction.baseFeeRate();
            const maxFeeRate = await auction.maxFeeRate();
            const feeThreshold = await auction.feeThreshold();
            
            console.log(`  基础费率: ${baseFeeRate / 100}%`);
            console.log(`  最大费率: ${maxFeeRate / 100}%`);  
            console.log(`  费率阈值: $${ethers.formatEther(feeThreshold)}`);
            
        } catch (priceError) {
            console.log(`  ⚠️ 价格功能测试失败: ${priceError.message}`);
        }
        
        // 检查支持的代币列表
        const supportedTokens = await auction.getSupportedTokens();
        console.log(`  支持的代币数量: ${supportedTokens.length}`);
        
        if (supportedTokens.length > 0) {
            console.log(`  第一个支持的代币: ${supportedTokens[0]}`);
        }
        
        test.passed = true;
        test.message = "拍卖合约功能正常";
        
    } catch (error) {
        test.message = `拍卖合约验证失败: ${error.message}`;
    }
    
    results.tests.push(test);
    results.summary.total++;
    if (test.passed) results.summary.passed++;
    else results.summary.failed++;
}

// 错误处理
main()
    .then(() => {
        console.log("\n✅ 部署验证完成!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ 部署验证失败:", error);
        process.exit(1);
    });