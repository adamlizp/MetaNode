const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🎭 NFT拍卖系统演示开始...");

    const [owner, seller, bidder1, bidder2, bidder3] = await ethers.getSigners();
    console.log("演示账户:");
    console.log("- 系统所有者:", owner.address);
    console.log("- NFT卖家:", seller.address);
    console.log("- 出价者1:", bidder1.address);
    console.log("- 出价者2:", bidder2.address);
    console.log("- 出价者3:", bidder3.address);

    const networkName = (await ethers.provider.getNetwork()).name;

    // 读取部署配置
    const configFile = `deployments/frontend-config-${networkName}.json`;
    if (!fs.existsSync(configFile)) {
        throw new Error(`未找到配置文件: ${configFile}`);
    }

    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    console.log("\n📋 使用已部署的合约:");
    console.log("- 工厂合约:", config.contracts.AuctionFactory.address);
    console.log("- 示例NFT:", config.contracts.SampleNFT.address);
    console.log("- 示例代币:", config.contracts.SampleToken.address);
    console.log("- 示例拍卖:", config.contracts.SampleAuction.address);

    // 获取合约实例
    const auctionFactory = await ethers.getContractAt("AuctionFactory", config.contracts.AuctionFactory.address);
    const sampleNFT = await ethers.getContractAt("AuctionNFT", config.contracts.SampleNFT.address);
    const sampleToken = await ethers.getContractAt("AuctionToken", config.contracts.SampleToken.address);
    const sampleAuction = await ethers.getContractAt("NFTAuction", config.contracts.SampleAuction.address);

    try {
        // 1. 准备演示数据
        console.log("\n🎨 准备演示NFT...");

        // 铸造NFT给卖家
        const nftMetadataURIs = [
            "https://ipfs.io/ipfs/QmYourHashHere1/metadata.json",
            "https://ipfs.io/ipfs/QmYourHashHere2/metadata.json",
            "https://ipfs.io/ipfs/QmYourHashHere3/metadata.json"
        ];

        for (let i = 0; i < nftMetadataURIs.length; i++) {
            await sampleNFT.mintNFT(seller.address, nftMetadataURIs[i]);
            console.log(`✅ NFT ${i + 1} 已铸造给卖家`);
        }

        const sellerNFTs = await sampleNFT.tokensOfOwner(seller.address);
        console.log("卖家拥有的NFT:", sellerNFTs.map(id => id.toString()));

        // 2. 给出价者铸造代币
        console.log("\n🪙 为出价者铸造代币...");
        await sampleToken.mint(bidder1.address, ethers.parseEther("1000"));
        await sampleToken.mint(bidder2.address, ethers.parseEther("2000"));
        await sampleToken.mint(bidder3.address, ethers.parseEther("3000"));

        console.log("出价者1代币余额:", ethers.formatEther(await sampleToken.balanceOf(bidder1.address)));
        console.log("出价者2代币余额:", ethers.formatEther(await sampleToken.balanceOf(bidder2.address)));
        console.log("出价者3代币余额:", ethers.formatEther(await sampleToken.balanceOf(bidder3.address)));

        // 3. 创建拍卖
        console.log("\n🎯 创建NFT拍卖...");

        const tokenId = sellerNFTs[0];
        const startPriceUSD = ethers.parseEther("100"); // $100
        const auctionDuration = 3600; // 1小时

        // 授权拍卖合约操作NFT
        await sampleNFT.connect(seller).approve(config.contracts.SampleAuction.address, tokenId);
        console.log("✅ NFT已授权给拍卖合约");

        // 创建拍卖
        const createTx = await sampleAuction.connect(seller).createAuction(
            config.contracts.SampleNFT.address,
            tokenId,
            startPriceUSD,
            auctionDuration
        );
        const createReceipt = await createTx.wait();

        let auctionId;
        for (const log of createReceipt.logs) {
            try {
                const parsed = sampleAuction.interface.parseLog(log);
                if (parsed.name === "AuctionCreated") {
                    auctionId = parsed.args.auctionId;
                    break;
                }
            } catch (e) {
                // 忽略解析错误
            }
        }

        console.log("✅ 拍卖创建成功，拍卖ID:", auctionId.toString());

        const auctionInfo = await sampleAuction.getAuctionInfo(auctionId);
        console.log("拍卖信息:");
        console.log("- NFT合约:", auctionInfo.nftContract);
        console.log("- Token ID:", auctionInfo.tokenId.toString());
        console.log("- 卖家:", auctionInfo.seller);
        console.log("- 起始价格:", ethers.formatEther(auctionInfo.startPrice), "USD");
        console.log("- 结束时间:", new Date(Number(auctionInfo.endTime) * 1000).toLocaleString());

        // 4. 模拟出价过程
        console.log("\n💰 开始出价演示...");

        // 获取当前ETH价格
        const ethPriceUSD = await sampleAuction.getETHPriceInUSD();
        console.log("当前ETH价格:", ethers.formatEther(ethPriceUSD), "USD");

        // 出价者1使用ETH出价 ($150)
        const bid1ETH = ethers.parseEther("0.075"); // 0.075 ETH = $150 (假设ETH=$2000)
        console.log("\n出价者1使用ETH出价:", ethers.formatEther(bid1ETH), "ETH");
        await sampleAuction.connect(bidder1).bidWithETH(auctionId, { value: bid1ETH });
        console.log("✅ 出价者1出价成功");

        // 检查拍卖状态
        let currentAuction = await sampleAuction.getAuctionInfo(auctionId);
        console.log("当前最高出价:", ethers.formatEther(currentAuction.highestBidAmount), "USD");
        console.log("最高出价者:", currentAuction.highestBidder);

        // 出价者2使用ERC20代币出价 ($200)
        const bid2Token = ethers.parseEther("200"); // 200 tokens = $200
        console.log("\n出价者2使用代币出价:", ethers.formatEther(bid2Token), "tokens");
        await sampleToken.connect(bidder2).approve(config.contracts.SampleAuction.address, bid2Token);
        await sampleAuction.connect(bidder2).bidWithERC20(auctionId, config.contracts.SampleToken.address, bid2Token);
        console.log("✅ 出价者2出价成功");

        // 检查拍卖状态
        currentAuction = await sampleAuction.getAuctionInfo(auctionId);
        console.log("当前最高出价:", ethers.formatEther(currentAuction.highestBidAmount), "USD");
        console.log("最高出价者:", currentAuction.highestBidder);

        // 出价者3使用ETH出价更高价格 ($300)
        const bid3ETH = ethers.parseEther("0.15"); // 0.15 ETH = $300
        console.log("\n出价者3使用ETH出价:", ethers.formatEther(bid3ETH), "ETH");
        await sampleAuction.connect(bidder3).bidWithETH(auctionId, { value: bid3ETH });
        console.log("✅ 出价者3出价成功");

        // 最终拍卖状态
        currentAuction = await sampleAuction.getAuctionInfo(auctionId);
        console.log("最终最高出价:", ethers.formatEther(currentAuction.highestBidAmount), "USD");
        console.log("最终最高出价者:", currentAuction.highestBidder);

        // 5. 查看出价历史
        console.log("\n📊 出价历史:");
        const bidHistory = await sampleAuction.getAuctionBids(auctionId);
        for (let i = 0; i < bidHistory.length; i++) {
            const bid = bidHistory[i];
            console.log(`出价 ${i + 1}:`);
            console.log("- 出价者:", bid.bidder);
            console.log("- 金额(USD):", ethers.formatEther(bid.amount));
            console.log("- 原始金额:", ethers.formatEther(bid.originalAmount));
            console.log("- 类型:", bid.bidType === 0 ? "ETH" : "ERC20");
            console.log("- 时间:", new Date(Number(bid.timestamp) * 1000).toLocaleString());
            console.log("---");
        }

        // 6. 计算手续费
        console.log("\n💸 手续费计算:");
        const finalBidAmount = currentAuction.highestBidAmount;
        const calculatedFee = await sampleAuction.calculateFee(finalBidAmount);
        console.log("拍卖价值:", ethers.formatEther(finalBidAmount), "USD");
        console.log("手续费:", ethers.formatEther(calculatedFee), "USD");
        console.log("手续费率:", (Number(calculatedFee) * 100 / Number(finalBidAmount)).toFixed(2), "%");

        // 7. 模拟拍卖结束（注意：在真实环境中需要等待时间到期）
        console.log("\n⏰ 模拟拍卖结束...");
        console.log("注意：在真实环境中，需要等待拍卖时间到期才能结束拍卖");
        console.log("当前时间:", new Date().toLocaleString());
        console.log("拍卖结束时间:", new Date(Number(currentAuction.endTime) * 1000).toLocaleString());

        // 获取卖家和获胜者的余额（用于后续比较）
        const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
        const winnerBalanceBefore = await ethers.provider.getBalance(currentAuction.highestBidder);

        console.log("卖家余额（结束前）:", ethers.formatEther(sellerBalanceBefore), "ETH");

        // 8. 展示系统统计
        console.log("\n📈 系统统计:");
        const nextContractId = await auctionFactory.getNextContractId();
        const supportedTokens = await auctionFactory.getSupportedTokens();
        const creationFee = await auctionFactory.creationFee();
        const platformFeeRate = await auctionFactory.platformFeeRate();

        console.log("已创建合约数量:", (nextContractId - 1n).toString());
        console.log("支持的代币数量:", supportedTokens.length);
        console.log("创建拍卖费用:", ethers.formatEther(creationFee), "ETH");
        console.log("平台手续费率:", (Number(platformFeeRate) / 100).toString(), "%");

        // 9. 展示价格预言机功能
        console.log("\n📊 价格预言机信息:");
        const ethPrice = await sampleAuction.getETHPriceInUSD();
        const tokenPrice = await sampleAuction.getTokenPriceInUSD(config.contracts.SampleToken.address);
        console.log("ETH/USD价格:", ethers.formatEther(ethPrice), "USD");
        console.log("代币/USD价格:", ethers.formatEther(tokenPrice), "USD");

        console.log("\n🎉 演示完成!");
        console.log("=" * 60);
        console.log("📋 演示总结:");
        console.log("✅ 成功创建了NFT拍卖");
        console.log("✅ 演示了ETH和ERC20代币出价");
        console.log("✅ 展示了价格预言机功能");
        console.log("✅ 计算了动态手续费");
        console.log("✅ 查看了出价历史记录");
        console.log("✅ 展示了系统统计信息");
        console.log("=" * 60);

        // 保存演示结果
        const demoResult = {
            timestamp: new Date().toISOString(),
            network: networkName,
            auctionId: auctionId.toString(),
            totalBids: bidHistory.length,
            finalPrice: ethers.formatEther(currentAuction.highestBidAmount),
            winner: currentAuction.highestBidder,
            fee: ethers.formatEther(calculatedFee),
            contracts: config.contracts
        };

        const demoFile = `deployments/demo_result_${networkName}_${Date.now()}.json`;
        fs.writeFileSync(demoFile, JSON.stringify(demoResult, null, 2));
        console.log("📄 演示结果已保存到:", demoFile);

    } catch (error) {
        console.error("❌ 演示过程中发生错误:", error);
        throw error;
    }
}

// 运行演示脚本
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
