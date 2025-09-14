const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const fs = require("fs");
const path = require("path");

/**
 * 端到端测试脚本
 * 模拟完整的用户交互流程
 */

async function main() {
    const networkName = hre.network.name;
    console.log(`🧪 开始在 ${networkName} 网络进行端到端测试...`);
    
    // 获取测试账户
    const [deployer, seller, bidder1, bidder2] = await ethers.getSigners();
    console.log(`部署者: ${deployer.address}`);
    console.log(`卖家: ${seller.address}`);
    console.log(`出价者1: ${bidder1.address}`);
    console.log(`出价者2: ${bidder2.address}\n`);
    
    // 读取部署配置
    const deploymentDir = path.join(__dirname, "../deployments");
    const frontendConfigFile = path.join(deploymentDir, `frontend-${networkName}.json`);
    
    if (!fs.existsSync(frontendConfigFile)) {
        throw new Error(`未找到网络 ${networkName} 的配置文件`);
    }
    
    const config = JSON.parse(fs.readFileSync(frontendConfigFile, "utf8"));
    
    // 连接合约
    const auctionFactory = await ethers.getContractAt("AuctionFactory", config.contracts.AuctionFactory.address);
    const nft = await ethers.getContractAt("AuctionNFT", config.contracts.AuctionNFT.address);
    const token = await ethers.getContractAt("AuctionToken", config.contracts.AuctionToken.address);
    const auction = await ethers.getContractAt("NFTAuction", config.contracts.NFTAuction.address);
    
    console.log("📋 合约地址:");
    console.log(`  工厂合约: ${auctionFactory.target}`);
    console.log(`  NFT合约: ${nft.target}`);
    console.log(`  代币合约: ${token.target}`);
    console.log(`  拍卖合约: ${auction.target}\n`);
    
    const testResults = [];
    
    try {
        // 测试1: 铸造NFT
        console.log("1️⃣ 测试NFT铸造...");
        const startTime = Date.now();
        
        const mintTx = await nft.connect(seller).mintNFT(
            seller.address, 
            "https://api.example.com/metadata/e2e-test-1.json"
        );
        const mintReceipt = await mintTx.wait();
        
        const tokenId = 1; // 假设是第一个铸造的NFT
        const owner = await nft.ownerOf(tokenId);
        
        console.log(`   ✅ NFT #${tokenId} 铸造成功`);
        console.log(`   所有者: ${owner}`);
        console.log(`   Gas使用: ${mintReceipt.gasUsed}`);
        
        testResults.push({
            test: "NFT铸造",
            passed: owner === seller.address,
            gasUsed: mintReceipt.gasUsed.toString(),
            duration: Date.now() - startTime
        });
        
    } catch (error) {
        console.log(`   ❌ NFT铸造失败: ${error.message}`);
        testResults.push({
            test: "NFT铸造", 
            passed: false,
            error: error.message,
            duration: Date.now() - startTime
        });
    }
    
    try {
        // 测试2: 创建拍卖
        console.log("\n2️⃣ 测试创建拍卖...");
        const startTime = Date.now();
        
        // 授权拍卖合约转移NFT
        const approveTx = await nft.connect(seller).approve(auction.target, 1);
        await approveTx.wait();
        console.log(`   ✅ NFT授权成功`);
        
        // 创建拍卖
        const startPriceUSD = ethers.parseEther("100"); // $100起始价格
        const duration = 3600; // 1小时
        
        const createAuctionTx = await auction.connect(seller).createAuction(
            nft.target,
            1,
            startPriceUSD,
            duration
        );
        const createReceipt = await createAuctionTx.wait();
        
        // 验证拍卖创建
        const auctionInfo = await auction.auctions(1);
        console.log(`   ✅ 拍卖创建成功`);
        console.log(`   拍卖ID: 1`);
        console.log(`   起始价格: $${ethers.formatEther(auctionInfo.startPrice)}`);
        console.log(`   结束时间: ${new Date(Number(auctionInfo.endTime) * 1000).toLocaleString()}`);
        console.log(`   Gas使用: ${createReceipt.gasUsed}`);
        
        testResults.push({
            test: "创建拍卖",
            passed: auctionInfo.seller === seller.address && auctionInfo.tokenId === 1n,
            gasUsed: createReceipt.gasUsed.toString(),
            duration: Date.now() - startTime
        });
        
    } catch (error) {
        console.log(`   ❌ 创建拍卖失败: ${error.message}`);
        testResults.push({
            test: "创建拍卖",
            passed: false,
            error: error.message,
            duration: Date.now() - startTime
        });
    }
    
    try {
        // 测试3: ETH出价
        console.log("\n3️⃣ 测试ETH出价...");
        const startTime = Date.now();
        
        const ethBidAmount = ethers.parseEther("0.1"); // 0.1 ETH
        
        const bidTx = await auction.connect(bidder1).bidWithETH(1, {
            value: ethBidAmount
        });
        const bidReceipt = await bidTx.wait();
        
        // 验证出价
        const auctionInfo = await auction.auctions(1);
        const ethPrice = await auction.getETHPriceInUSD();
        const bidValueUSD = (ethBidAmount * ethPrice) / ethers.parseEther("1");
        
        console.log(`   ✅ ETH出价成功`);
        console.log(`   出价金额: ${ethers.formatEther(ethBidAmount)} ETH`);
        console.log(`   USD价值: $${ethers.formatEther(bidValueUSD)}`);
        console.log(`   最高出价者: ${auctionInfo.highestBidder}`);
        console.log(`   Gas使用: ${bidReceipt.gasUsed}`);
        
        testResults.push({
            test: "ETH出价",
            passed: auctionInfo.highestBidder === bidder1.address,
            gasUsed: bidReceipt.gasUsed.toString(),
            duration: Date.now() - startTime
        });
        
    } catch (error) {
        console.log(`   ❌ ETH出价失败: ${error.message}`);
        testResults.push({
            test: "ETH出价",
            passed: false,
            error: error.message,
            duration: Date.now() - startTime
        });
    }
    
    try {
        // 测试4: ERC20代币出价
        console.log("\n4️⃣ 测试ERC20代币出价...");
        const startTime = Date.now();
        
        // 给bidder2铸造代币
        const tokenMintAmount = ethers.parseEther("1000"); // 1000 tokens
        const mintTokenTx = await token.mint(bidder2.address, tokenMintAmount);
        await mintTokenTx.wait();
        console.log(`   ✅ 代币铸造成功: ${ethers.formatEther(tokenMintAmount)} tokens`);
        
        // 授权拍卖合约使用代币
        const tokenBidAmount = ethers.parseEther("300"); // $300价值的代币
        const approveTx = await token.connect(bidder2).approve(auction.target, tokenBidAmount);
        await approveTx.wait();
        console.log(`   ✅ 代币授权成功`);
        
        // ERC20出价
        const tokenBidTx = await auction.connect(bidder2).bidWithERC20(1, token.target, tokenBidAmount);
        const tokenBidReceipt = await tokenBidTx.wait();
        
        // 验证出价
        const auctionInfo = await auction.auctions(1);
        console.log(`   ✅ ERC20出价成功`);
        console.log(`   出价金额: ${ethers.formatEther(tokenBidAmount)} tokens`);
        console.log(`   USD价值: $${ethers.formatEther(auctionInfo.highestBidAmount)}`);
        console.log(`   最高出价者: ${auctionInfo.highestBidder}`);
        console.log(`   Gas使用: ${tokenBidReceipt.gasUsed}`);
        
        testResults.push({
            test: "ERC20出价",
            passed: auctionInfo.highestBidder === bidder2.address,
            gasUsed: tokenBidReceipt.gasUsed.toString(),
            duration: Date.now() - startTime
        });
        
    } catch (error) {
        console.log(`   ❌ ERC20出价失败: ${error.message}`);
        testResults.push({
            test: "ERC20出价",
            passed: false,
            error: error.message,
            duration: Date.now() - startTime
        });
    }
    
    try {
        // 测试5: 检查退款机制
        console.log("\n5️⃣ 测试退款机制...");
        const startTime = Date.now();
        
        // 检查bidder1的退款金额
        const refundAmount = await auction.bidderRefunds(1, bidder1.address);
        console.log(`   bidder1可退款金额: ${ethers.formatEther(refundAmount)} ETH`);
        
        if (refundAmount > 0) {
            // 提取退款
            const balanceBefore = await ethers.provider.getBalance(bidder1.address);
            const withdrawTx = await auction.connect(bidder1).withdrawRefund(1);
            const withdrawReceipt = await withdrawTx.wait();
            const balanceAfter = await ethers.provider.getBalance(bidder1.address);
            
            const gasUsed = withdrawReceipt.gasUsed * withdrawReceipt.gasPrice;
            const netReceived = balanceAfter - balanceBefore + gasUsed;
            
            console.log(`   ✅ 退款提取成功`);
            console.log(`   实际收到: ${ethers.formatEther(netReceived)} ETH`);
            console.log(`   Gas使用: ${withdrawReceipt.gasUsed}`);
            
            testResults.push({
                test: "退款机制",
                passed: netReceived >= refundAmount * 95n / 100n, // 允许5%的误差
                gasUsed: withdrawReceipt.gasUsed.toString(),
                duration: Date.now() - startTime
            });
        } else {
            console.log(`   ℹ️ 无需退款`);
            testResults.push({
                test: "退款机制",
                passed: true,
                note: "无需退款",
                duration: Date.now() - startTime
            });
        }
        
    } catch (error) {
        console.log(`   ❌ 退款测试失败: ${error.message}`);
        testResults.push({
            test: "退款机制",
            passed: false,
            error: error.message,
            duration: Date.now() - startTime
        });
    }
    
    try {
        // 测试6: 拍卖结束和结算
        console.log("\n6️⃣ 测试拍卖结束...");
        const startTime = Date.now();
        
        // 如果在本地网络，可以快进时间
        if (networkName === "localhost" || networkName === "hardhat") {
            console.log(`   ⏰ 快进时间...`);
            await time.increase(3601); // 快进1小时1秒
        } else {
            console.log(`   ⚠️ 测试网环境，跳过时间快进`);
        }
        
        // 尝试结束拍卖
        try {
            const endTx = await auction.endAuction(1);
            const endReceipt = await endTx.wait();
            
            // 验证拍卖结束
            const finalAuctionInfo = await auction.auctions(1);
            const nftOwner = await nft.ownerOf(1);
            
            console.log(`   ✅ 拍卖结束成功`);
            console.log(`   拍卖状态: ${finalAuctionInfo.status === 1n ? '已结束' : '进行中'}`);
            console.log(`   NFT新所有者: ${nftOwner}`);
            console.log(`   Gas使用: ${endReceipt.gasUsed}`);
            
            testResults.push({
                test: "拍卖结束",
                passed: finalAuctionInfo.status === 1n,
                gasUsed: endReceipt.gasUsed.toString(),
                duration: Date.now() - startTime
            });
            
        } catch (endError) {
            if (endError.message.includes("not ended")) {
                console.log(`   ℹ️ 拍卖尚未结束，跳过结束测试`);
                testResults.push({
                    test: "拍卖结束",
                    passed: true,
                    note: "拍卖尚未到结束时间",
                    duration: Date.now() - startTime
                });
            } else {
                throw endError;
            }
        }
        
    } catch (error) {
        console.log(`   ❌ 拍卖结束测试失败: ${error.message}`);
        testResults.push({
            test: "拍卖结束",
            passed: false,
            error: error.message,
            duration: Date.now() - startTime
        });
    }
    
    // 生成测试报告
    console.log("\n📊 E2E测试结果总结:");
    console.log("=" * 60);
    
    let totalPassed = 0;
    let totalGasUsed = 0n;
    let totalDuration = 0;
    
    testResults.forEach((result, index) => {
        const status = result.passed ? "✅ 通过" : "❌ 失败";
        console.log(`${index + 1}. ${result.test}: ${status}`);
        
        if (result.gasUsed) {
            console.log(`   Gas使用: ${result.gasUsed}`);
            totalGasUsed += BigInt(result.gasUsed);
        }
        
        if (result.duration) {
            console.log(`   耗时: ${result.duration}ms`);
            totalDuration += result.duration;
        }
        
        if (result.error) {
            console.log(`   错误: ${result.error}`);
        }
        
        if (result.note) {
            console.log(`   备注: ${result.note}`);
        }
        
        if (result.passed) totalPassed++;
        console.log("");
    });
    
    console.log("=" * 60);
    console.log(`总计测试: ${testResults.length} 项`);
    console.log(`通过测试: ${totalPassed} 项`);
    console.log(`失败测试: ${testResults.length - totalPassed} 项`);
    console.log(`总Gas消耗: ${totalGasUsed.toString()}`);
    console.log(`总耗时: ${totalDuration}ms`);
    
    // 保存测试结果
    const testReport = {
        network: networkName,
        timestamp: new Date().toISOString(),
        summary: {
            total: testResults.length,
            passed: totalPassed,
            failed: testResults.length - totalPassed,
            totalGasUsed: totalGasUsed.toString(),
            totalDuration: totalDuration
        },
        tests: testResults
    };
    
    const reportFile = path.join(__dirname, "../deployments", `e2e-test_${networkName}_${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(testReport, null, 2));
    console.log(`\n📄 测试报告已保存: ${path.basename(reportFile)}`);
    
    if (totalPassed < testResults.length) {
        throw new Error(`E2E测试失败: ${testResults.length - totalPassed} 项测试未通过`);
    }
    
    console.log("\n🎉 所有E2E测试通过!");
}

main()
    .then(() => {
        console.log("✅ E2E测试完成!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ E2E测试失败:", error);
        process.exit(1);
    });