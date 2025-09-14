const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("🔬 NFT拍卖系统 - 全面边界测试", function () {
    // 测试常量
    const INITIAL_ETH_PRICE = 2000 * 10 ** 8; // $2000, 8位小数
    const INITIAL_TOKEN_PRICE = 1 * 10 ** 8; // $1, 8位小数
    const START_PRICE_USD = ethers.parseEther("100"); // $100 USD
    const AUCTION_DURATION = 3600; // 1小时
    const CREATION_FEE = ethers.parseEther("0.001"); // 0.001 ETH
    const BASE_FEE_RATE = 250; // 2.5%
    const MAX_FEE_RATE = 1000; // 10%
    const FEE_THRESHOLD = ethers.parseEther("10000"); // $10,000

    async function deploySystemFixture() {
        const [owner, seller, bidder1, bidder2, bidder3, attacker, feeRecipient] = await ethers.getSigners();

        // 部署Mock价格预言机
        const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
        const ethPriceFeed = await MockV3Aggregator.deploy(8, INITIAL_ETH_PRICE);
        const tokenPriceFeed = await MockV3Aggregator.deploy(8, INITIAL_TOKEN_PRICE);

        // 部署合约实现
        const NFTAuction = await ethers.getContractFactory("NFTAuction");
        const AuctionNFT = await ethers.getContractFactory("AuctionNFT");
        const AuctionToken = await ethers.getContractFactory("AuctionToken");

        const auctionImplementation = await NFTAuction.deploy();
        const nftImplementation = await AuctionNFT.deploy();
        const tokenImplementation = await AuctionToken.deploy();

        // 部署工厂合约
        const AuctionFactory = await ethers.getContractFactory("AuctionFactory");
        const auctionFactory = await upgrades.deployProxy(
            AuctionFactory,
            [
                owner.address,
                await ethPriceFeed.getAddress(),
                await auctionImplementation.getAddress(),
                await nftImplementation.getAddress(),
                await tokenImplementation.getAddress()
            ],
            { initializer: 'initialize', kind: 'uups' }
        );

        // 创建NFT和代币合约
        await auctionFactory.createNFTContract("Test NFT", "TNFT", { value: CREATION_FEE });
        await auctionFactory.createTokenContract("Test Token", "TT", { value: CREATION_FEE });

        const contractInfo = await auctionFactory.auctionContracts(1);
        const auctionNFT = await ethers.getContractAt("AuctionNFT", contractInfo.auctionContract);
        const tokenContractInfo = await auctionFactory.auctionContracts(2);
        const auctionToken = await ethers.getContractAt("AuctionToken", tokenContractInfo.auctionContract);

        // 配置代币支持
        await auctionFactory.setSupportedToken(await auctionToken.getAddress(), true);
        await auctionFactory.setTokenPriceFeed(await auctionToken.getAddress(), await tokenPriceFeed.getAddress());

        // 创建拍卖合约
        await auctionFactory.createAuctionContract("Test Auction", "测试拍卖", { value: CREATION_FEE });
        const auctionContractInfo = await auctionFactory.auctionContracts(3);
        const nftAuction = await ethers.getContractAt("NFTAuction", auctionContractInfo.auctionContract);

        // 铸造NFT和代币
        await auctionNFT.mintNFT(seller.address, "https://test-metadata.json");
        await auctionToken.mint(bidder1.address, ethers.parseEther("10000"));
        await auctionToken.mint(bidder2.address, ethers.parseEther("20000"));
        await auctionToken.mint(bidder3.address, ethers.parseEther("30000"));

        return {
            owner, seller, bidder1, bidder2, bidder3, attacker, feeRecipient,
            auctionFactory, nftAuction, auctionNFT, auctionToken,
            ethPriceFeed, tokenPriceFeed,
            auctionImplementation, nftImplementation, tokenImplementation
        };
    }

    describe("🛡️ 安全性边界测试", function () {
        it("应该防止重入攻击", async function () {
            const { nftAuction, auctionNFT, seller, attacker } = await loadFixture(deploySystemFixture);

            // 创建一个恶意合约尝试重入攻击
            const MaliciousContract = await ethers.getContractFactory("MaliciousReentrancy");
            const malicious = await MaliciousContract.deploy();

            // 设置拍卖
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                START_PRICE_USD,
                AUCTION_DURATION
            );

            // 尝试重入攻击应该失败
            await expect(
                malicious.connect(attacker).attack(await nftAuction.getAddress(), 1, {
                    value: ethers.parseEther("1")
                })
            ).to.be.revertedWith("ReentrancyGuard: reentrant call");
        });

        it("应该防止未授权的升级", async function () {
            const { auctionFactory, attacker } = await loadFixture(deploySystemFixture);

            const NewImplementation = await ethers.getContractFactory("AuctionFactory");
            const newImpl = await NewImplementation.deploy();

            // 非所有者尝试升级应该失败
            await expect(
                upgrades.upgradeProxy(await auctionFactory.getAddress(), NewImplementation, {
                    from: attacker.address
                })
            ).to.be.reverted;
        });

        it("应该防止价格操纵", async function () {
            const { nftAuction, ethPriceFeed, tokenPriceFeed, attacker } = await loadFixture(deploySystemFixture);

            // 非所有者尝试更新价格应该失败
            await expect(
                ethPriceFeed.connect(attacker).updateAnswer(1 * 10 ** 8) // 尝试将ETH价格设为$1
            ).to.be.reverted;

            await expect(
                tokenPriceFeed.connect(attacker).updateAnswer(1000 * 10 ** 8) // 尝试将代币价格设为$1000
            ).to.be.reverted;
        });

        it("应该防止空地址参数", async function () {
            const { auctionFactory, nftAuction, seller } = await loadFixture(deploySystemFixture);

            // 尝试用零地址创建拍卖
            await expect(
                nftAuction.connect(seller).createAuction(
                    ethers.ZeroAddress, // 空地址
                    1,
                    START_PRICE_USD,
                    AUCTION_DURATION
                )
            ).to.be.revertedWith("NFTAuction: invalid NFT contract");

            // 尝试设置空地址的价格预言机
            await expect(
                auctionFactory.setTokenPriceFeed(ethers.ZeroAddress, ethers.ZeroAddress)
            ).to.be.revertedWith("AuctionFactory: invalid addresses");
        });
    });

    describe("📊 价格计算边界测试", function () {
        it("应该正确处理极端价格值", async function () {
            const { nftAuction, ethPriceFeed, tokenPriceFeed } = await loadFixture(deploySystemFixture);

            // 测试极高价格
            await ethPriceFeed.updateAnswer(100000 * 10 ** 8); // $100,000 ETH
            const highEthPrice = await nftAuction.getETHPriceInUSD();
            expect(highEthPrice).to.equal(ethers.parseEther("100000"));

            // 测试极低价格
            await ethPriceFeed.updateAnswer(1); // 最小正价格
            const lowEthPrice = await nftAuction.getETHPriceInUSD();
            expect(lowEthPrice).to.equal(10n); // 1 * 10^10 wei

            // 测试零价格应该失败
            await ethPriceFeed.updateAnswer(0);
            await expect(
                nftAuction.getETHPriceInUSD()
            ).to.be.revertedWith("NFTAuction: invalid ETH price");

            // 测试负价格应该失败
            await ethPriceFeed.updateAnswer(-1000 * 10 ** 8);
            await expect(
                nftAuction.getETHPriceInUSD()
            ).to.be.revertedWith("NFTAuction: invalid ETH price");
        });

        it("应该正确计算动态手续费", async function () {
            const { nftAuction } = await loadFixture(deploySystemFixture);

            // 测试低于阈值的拍卖（2.5%费率）
            const lowValueAuction = ethers.parseEther("5000"); // $5,000
            const lowValueFee = await nftAuction.calculateFee(lowValueAuction);
            const expectedLowFee = (lowValueAuction * BigInt(BASE_FEE_RATE)) / 10000n;
            expect(lowValueFee).to.equal(expectedLowFee);

            // 测试高于阈值的拍卖（阶梯费率）
            const highValueAuction = ethers.parseEther("20000"); // $20,000
            const highValueFee = await nftAuction.calculateFee(highValueAuction);
            
            const baseFee = (FEE_THRESHOLD * BigInt(BASE_FEE_RATE)) / 10000n;
            const excessAmount = highValueAuction - FEE_THRESHOLD;
            const excessFee = (excessAmount * BigInt(MAX_FEE_RATE)) / 10000n;
            const expectedHighFee = baseFee + excessFee;
            
            expect(highValueFee).to.equal(expectedHighFee);

            // 测试边界值
            const thresholdFee = await nftAuction.calculateFee(FEE_THRESHOLD);
            const expectedThresholdFee = (FEE_THRESHOLD * BigInt(BASE_FEE_RATE)) / 10000n;
            expect(thresholdFee).to.equal(expectedThresholdFee);
        });

        it("应该处理价格精度转换", async function () {
            const { nftAuction, ethPriceFeed } = await loadFixture(deploySystemFixture);

            // 测试不同精度的价格
            const testPrices = [
                { chainlinkPrice: 2000 * 10 ** 8, expectedPrice: ethers.parseEther("2000") },
                { chainlinkPrice: 2000.5 * 10 ** 8, expectedPrice: ethers.parseEther("2000.5") },
                { chainlinkPrice: 2000.123456 * 10 ** 8, expectedPrice: ethers.parseEther("2000.123456") }
            ];

            for (const test of testPrices) {
                await ethPriceFeed.updateAnswer(test.chainlinkPrice);
                const actualPrice = await nftAuction.getETHPriceInUSD();
                expect(actualPrice).to.equal(test.expectedPrice);
            }
        });
    });

    describe("⏰ 时间相关边界测试", function () {
        it("应该处理极短的拍卖时间", async function () {
            const { nftAuction, auctionNFT, seller } = await loadFixture(deploySystemFixture);

            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            
            // 创建1秒的拍卖
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                START_PRICE_USD,
                1 // 1秒
            );

            const auctionInfo = await nftAuction.auctions(1);
            expect(auctionInfo.status).to.equal(0); // Active

            // 等待拍卖结束
            await time.increase(2);

            // 应该能够结束拍卖
            await nftAuction.endAuction(1);
            const endedAuction = await nftAuction.auctions(1);
            expect(endedAuction.status).to.equal(1); // Ended
        });

        it("应该处理极长的拍卖时间", async function () {
            const { nftAuction, auctionNFT, seller } = await loadFixture(deploySystemFixture);

            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            
            const longDuration = 365 * 24 * 3600; // 1年
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                START_PRICE_USD,
                longDuration
            );

            const auctionInfo = await nftAuction.auctions(1);
            expect(auctionInfo.endTime).to.be.greaterThan(
                (await time.latest()) + longDuration - 10
            );
        });

        it("应该防止在拍卖结束后出价", async function () {
            const { nftAuction, auctionNFT, seller, bidder1 } = await loadFixture(deploySystemFixture);

            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                START_PRICE_USD,
                60 // 1分钟
            );

            // 等待拍卖结束
            await time.increase(61);

            // 尝试在结束后出价应该失败
            await expect(
                nftAuction.connect(bidder1).bidWithETH(1, { value: ethers.parseEther("0.1") })
            ).to.be.revertedWith("NFTAuction: auction ended");
        });
    });

    describe("💰 资金处理边界测试", function () {
        it("应该处理极小的出价金额", async function () {
            const { nftAuction, auctionNFT, seller, bidder1 } = await loadFixture(deploySystemFixture);

            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                1, // 1 wei USD
                AUCTION_DURATION
            );

            // 出价1 wei ETH
            await nftAuction.connect(bidder1).bidWithETH(1, { value: 1 });
            
            const auctionInfo = await nftAuction.auctions(1);
            expect(auctionInfo.highestBidder).to.equal(bidder1.address);
        });

        it("应该处理整数溢出保护", async function () {
            const { nftAuction, auctionNFT, seller, ethPriceFeed } = await loadFixture(deploySystemFixture);

            // 设置极高的ETH价格
            await ethPriceFeed.updateAnswer(2 ** 63 - 1); // 接近int256最大值

            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                START_PRICE_USD,
                AUCTION_DURATION
            );

            // 应该能够正确计算价格而不溢出
            const ethPrice = await nftAuction.getETHPriceInUSD();
            expect(ethPrice).to.be.greaterThan(0);
        });

        it("应该正确处理退款", async function () {
            const { nftAuction, auctionNFT, auctionToken, seller, bidder1, bidder2 } = await loadFixture(deploySystemFixture);

            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                START_PRICE_USD,
                AUCTION_DURATION
            );

            // Bidder1用ETH出价
            const ethBidAmount = ethers.parseEther("0.1");
            await nftAuction.connect(bidder1).bidWithETH(1, { value: ethBidAmount });

            // Bidder2用ERC20出价更高价格
            const tokenBidAmount = ethers.parseEther("300"); // $300
            await auctionToken.connect(bidder2).approve(await nftAuction.getAddress(), tokenBidAmount);
            await nftAuction.connect(bidder2).bidWithERC20(1, await auctionToken.getAddress(), tokenBidAmount);

            // 检查bidder1的退款
            const refundAmount = await nftAuction.bidderRefunds(1, bidder1.address);
            expect(refundAmount).to.equal(ethBidAmount);

            // Bidder1应该能够提取退款
            const balanceBefore = await ethers.provider.getBalance(bidder1.address);
            const tx = await nftAuction.connect(bidder1).withdrawRefund(1);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;
            const balanceAfter = await ethers.provider.getBalance(bidder1.address);

            expect(balanceAfter).to.equal(balanceBefore + ethBidAmount - gasUsed);
        });
    });

    describe("🔄 合约升级边界测试", function () {
        it("应该支持安全升级", async function () {
            const { auctionFactory, owner } = await loadFixture(deploySystemFixture);

            // 部署新的实现合约
            const AuctionFactoryV2 = await ethers.getContractFactory("AuctionFactory");
            const newImpl = await AuctionFactoryV2.deploy();

            // 升级合约
            const upgradedFactory = await upgrades.upgradeProxy(
                await auctionFactory.getAddress(),
                AuctionFactoryV2
            );

            // 验证升级后状态保持
            expect(await upgradedFactory.owner()).to.equal(owner.address);
        });

        it("应该保持存储布局兼容性", async function () {
            const { auctionFactory } = await loadFixture(deploySystemFixture);

            // 获取升级前的状态
            const ownerBefore = await auctionFactory.owner();
            const ethPriceFeedBefore = await auctionFactory.ethUsdPriceFeed();
            const nextIdBefore = await auctionFactory.getNextContractId();

            // 升级合约
            const AuctionFactoryV2 = await ethers.getContractFactory("AuctionFactory");
            const upgradedFactory = await upgrades.upgradeProxy(
                await auctionFactory.getAddress(),
                AuctionFactoryV2
            );

            // 验证状态保持不变
            expect(await upgradedFactory.owner()).to.equal(ownerBefore);
            expect(await upgradedFactory.ethUsdPriceFeed()).to.equal(ethPriceFeedBefore);
            expect(await upgradedFactory.getNextContractId()).to.equal(nextIdBefore);
        });
    });

    describe("🎯 复杂场景集成测试", function () {
        it("应该处理多轮出价竞争", async function () {
            const { nftAuction, auctionNFT, auctionToken, seller, bidder1, bidder2, bidder3 } = await loadFixture(deploySystemFixture);

            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                START_PRICE_USD,
                AUCTION_DURATION
            );

            // 第一轮：ETH出价
            await nftAuction.connect(bidder1).bidWithETH(1, { value: ethers.parseEther("0.1") });

            // 第二轮：ERC20出价
            await auctionToken.connect(bidder2).approve(await nftAuction.getAddress(), ethers.parseEther("300"));
            await nftAuction.connect(bidder2).bidWithERC20(1, await auctionToken.getAddress(), ethers.parseEther("300"));

            // 第三轮：更高的ETH出价
            await nftAuction.connect(bidder3).bidWithETH(1, { value: ethers.parseEther("0.2") });

            // 第四轮：最高的ERC20出价
            await auctionToken.connect(bidder1).approve(await nftAuction.getAddress(), ethers.parseEther("500"));
            await nftAuction.connect(bidder1).bidWithERC20(1, await auctionToken.getAddress(), ethers.parseEther("500"));

            const finalAuction = await nftAuction.auctions(1);
            expect(finalAuction.highestBidder).to.equal(bidder1.address);
            expect(finalAuction.highestBidAmount).to.equal(ethers.parseEther("500"));
        });

        it("应该处理同时进行的多个拍卖", async function () {
            const { nftAuction, auctionNFT, seller, bidder1, bidder2 } = await loadFixture(deploySystemFixture);

            // 铸造多个NFT
            await auctionNFT.mintNFT(seller.address, "https://test-metadata-2.json");
            await auctionNFT.mintNFT(seller.address, "https://test-metadata-3.json");

            // 创建多个拍卖
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 2);
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 3);

            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(), 1, START_PRICE_USD, AUCTION_DURATION
            );
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(), 2, ethers.parseEther("200"), AUCTION_DURATION
            );
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(), 3, ethers.parseEther("300"), AUCTION_DURATION
            );

            // 在不同拍卖中出价
            await nftAuction.connect(bidder1).bidWithETH(1, { value: ethers.parseEther("0.1") });
            await nftAuction.connect(bidder2).bidWithETH(2, { value: ethers.parseEther("0.15") });
            await nftAuction.connect(bidder1).bidWithETH(3, { value: ethers.parseEther("0.2") });

            // 验证每个拍卖的状态
            const auction1 = await nftAuction.auctions(1);
            const auction2 = await nftAuction.auctions(2);
            const auction3 = await nftAuction.auctions(3);

            expect(auction1.highestBidder).to.equal(bidder1.address);
            expect(auction2.highestBidder).to.equal(bidder2.address);
            expect(auction3.highestBidder).to.equal(bidder1.address);
        });

        it("应该处理价格波动期间的出价", async function () {
            const { nftAuction, auctionNFT, ethPriceFeed, seller, bidder1, bidder2 } = await loadFixture(deploySystemFixture);

            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                START_PRICE_USD,
                AUCTION_DURATION
            );

            // 在当前价格下出价
            await nftAuction.connect(bidder1).bidWithETH(1, { value: ethers.parseEther("0.1") });

            // 模拟ETH价格上涨
            await ethPriceFeed.updateAnswer(4000 * 10 ** 8); // ETH价格翻倍

            // 在新价格下出价
            await nftAuction.connect(bidder2).bidWithETH(1, { value: ethers.parseEther("0.075") }); // 应该价值$300

            const auction = await nftAuction.auctions(1);
            expect(auction.highestBidder).to.equal(bidder2.address);
        });
    });

    describe("📈 Gas优化验证", function () {
        it("应该在合理的Gas限制内完成操作", async function () {
            const { nftAuction, auctionNFT, seller, bidder1 } = await loadFixture(deploySystemFixture);

            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            
            // 创建拍卖的Gas消耗
            const createTx = await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                START_PRICE_USD,
                AUCTION_DURATION
            );
            const createReceipt = await createTx.wait();
            expect(createReceipt.gasUsed).to.be.lessThan(300000); // 30万Gas限制

            // 出价的Gas消耗
            const bidTx = await nftAuction.connect(bidder1).bidWithETH(1, { 
                value: ethers.parseEther("0.1") 
            });
            const bidReceipt = await bidTx.wait();
            expect(bidReceipt.gasUsed).to.be.lessThan(200000); // 20万Gas限制

            // 结束拍卖的Gas消耗
            await time.increase(AUCTION_DURATION + 1);
            const endTx = await nftAuction.endAuction(1);
            const endReceipt = await endTx.wait();
            expect(endReceipt.gasUsed).to.be.lessThan(150000); // 15万Gas限制
        });
    });
});

// 恶意重入攻击合约（用于测试）
// 注意：这个合约仅用于测试防护机制，不应在实际环境中使用
contract MaliciousReentrancy {
    function attack(address target, uint256 auctionId) external payable {
        // 尝试重入攻击
        (bool success,) = target.call{value: msg.value}(
            abi.encodeWithSignature("bidWithETH(uint256)", auctionId)
        );
        if (success) {
            // 如果第一次调用成功，尝试再次调用（这应该被阻止）
            target.call{value: 0}(
                abi.encodeWithSignature("bidWithETH(uint256)", auctionId)
            );
        }
    }
    
    receive() external payable {
        // 当收到ETH时，尝试重入攻击
        if (msg.sender != tx.origin) {
            (bool success,) = msg.sender.call(
                abi.encodeWithSignature("withdrawRefund(uint256)", 1)
            );
            require(success, "Reentrancy failed");
        }
    }
}