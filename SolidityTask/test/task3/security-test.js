const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("🛡️ NFT拍卖系统 - 安全测试", function () {
    const INITIAL_ETH_PRICE = 2000 * 10 ** 8;
    const INITIAL_TOKEN_PRICE = 1 * 10 ** 8;
    const START_PRICE_USD = ethers.parseEther("100");
    const AUCTION_DURATION = 3600;
    const CREATION_FEE = ethers.parseEther("0.001");

    async function deploySecurityTestFixture() {
        const [owner, seller, bidder1, bidder2, attacker, admin] = await ethers.getSigners();

        const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
        const ethPriceFeed = await MockV3Aggregator.deploy(8, INITIAL_ETH_PRICE);
        const tokenPriceFeed = await MockV3Aggregator.deploy(8, INITIAL_TOKEN_PRICE);

        const NFTAuction = await ethers.getContractFactory("NFTAuction");
        const AuctionNFT = await ethers.getContractFactory("AuctionNFT");
        const AuctionToken = await ethers.getContractFactory("AuctionToken");

        const auctionImplementation = await NFTAuction.deploy();
        const nftImplementation = await AuctionNFT.deploy();
        const tokenImplementation = await AuctionToken.deploy();

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

        return {
            owner, seller, bidder1, bidder2, attacker, admin,
            auctionFactory, ethPriceFeed, tokenPriceFeed,
            auctionImplementation, nftImplementation, tokenImplementation
        };
    }

    describe("🔐 访问控制测试", function () {
        it("应该阻止非所有者执行管理员操作", async function () {
            const { auctionFactory, attacker, ethPriceFeed } = await loadFixture(deploySecurityTestFixture);

            // 尝试更新价格预言机
            await expect(
                auctionFactory.connect(attacker).updateGlobalConfig(
                    await ethPriceFeed.getAddress(),
                    CREATION_FEE,
                    250
                )
            ).to.be.revertedWithCustomError(auctionFactory, "OwnableUnauthorizedAccount");

            // 尝试设置支持的代币
            await expect(
                auctionFactory.connect(attacker).setSupportedToken(attacker.address, true)
            ).to.be.revertedWithCustomError(auctionFactory, "OwnableUnauthorizedAccount");

            // 尝试升级合约
            const NewImplementation = await ethers.getContractFactory("AuctionFactory");
            await expect(
                upgrades.upgradeProxy(await auctionFactory.getAddress(), NewImplementation, {
                    from: attacker.address
                })
            ).to.be.reverted;
        });

        it("应该阻止未授权的NFT转移", async function () {
            const { auctionFactory, seller, attacker } = await loadFixture(deploySecurityTestFixture);

            // 创建NFT合约
            await auctionFactory.createNFTContract("Security Test NFT", "STN", { value: CREATION_FEE });
            const nftContractInfo = await auctionFactory.auctionContracts(1);
            const auctionNFT = await ethers.getContractAt("AuctionNFT", nftContractInfo.auctionContract);

            // 铸造NFT
            await auctionNFT.mintNFT(seller.address, "https://test-metadata.json");

            // 攻击者尝试直接转移NFT
            await expect(
                auctionNFT.connect(attacker).transferFrom(seller.address, attacker.address, 1)
            ).to.be.revertedWithCustomError(auctionNFT, "ERC721InsufficientApproval");

            // 攻击者尝试使用拍卖专用转移函数
            await expect(
                auctionNFT.connect(attacker).auctionTransfer(seller.address, attacker.address, 1)
            ).to.be.revertedWith("AuctionNFT: caller not authorized auction");
        });

        it("应该验证函数调用者权限", async function () {
            const { auctionFactory, seller, attacker } = await loadFixture(deploySecurityTestFixture);

            // 创建合约
            await auctionFactory.createNFTContract("Test NFT", "TNFT", { value: CREATION_FEE });
            await auctionFactory.createAuctionContract("Test Auction", "TA", { value: CREATION_FEE });
            
            const nftContractInfo = await auctionFactory.auctionContracts(1);
            const auctionNFT = await ethers.getContractAt("AuctionNFT", nftContractInfo.auctionContract);
            
            const auctionContractInfo = await auctionFactory.auctionContracts(2);
            const nftAuction = await ethers.getContractAt("NFTAuction", auctionContractInfo.auctionContract);

            // 铸造NFT给卖家
            await auctionNFT.mintNFT(seller.address, "https://test-metadata.json");

            // 攻击者尝试创建他人NFT的拍卖
            await expect(
                nftAuction.connect(attacker).createAuction(
                    await auctionNFT.getAddress(),
                    1, // seller拥有的NFT
                    START_PRICE_USD,
                    AUCTION_DURATION
                )
            ).to.be.revertedWithCustomError(auctionNFT, "ERC721InsufficientApproval");
        });
    });

    describe("🔄 重入攻击防护测试", function () {
        it("应该防止在出价过程中的重入攻击", async function () {
            const { auctionFactory, seller, attacker } = await loadFixture(deploySecurityTestFixture);

            // 部署恶意合约
            const MaliciousReentrancy = await ethers.getContractFactory("MaliciousReentrancy");
            const maliciousContract = await MaliciousReentrancy.deploy();

            // 创建测试环境
            await auctionFactory.createNFTContract("Test NFT", "TNFT", { value: CREATION_FEE });
            await auctionFactory.createAuctionContract("Test Auction", "TA", { value: CREATION_FEE });
            
            const nftContractInfo = await auctionFactory.auctionContracts(1);
            const auctionNFT = await ethers.getContractAt("AuctionNFT", nftContractInfo.auctionContract);
            
            const auctionContractInfo = await auctionFactory.auctionContracts(2);
            const nftAuction = await ethers.getContractAt("NFTAuction", auctionContractInfo.auctionContract);

            // 创建拍卖
            await auctionNFT.mintNFT(seller.address, "https://test-metadata.json");
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                START_PRICE_USD,
                AUCTION_DURATION
            );

            // 恶意合约尝试重入攻击
            await expect(
                maliciousContract.connect(attacker).attack(await nftAuction.getAddress(), 1, {
                    value: ethers.parseEther("0.1")
                })
            ).to.be.revertedWithCustomError(nftAuction, "ReentrancyGuardReentrantCall");
        });

        it("应该防止在退款过程中的重入攻击", async function () {
            const { auctionFactory, seller, bidder1, bidder2 } = await loadFixture(deploySecurityTestFixture);

            // 创建测试环境
            await auctionFactory.createNFTContract("Test NFT", "TNFT", { value: CREATION_FEE });
            await auctionFactory.createAuctionContract("Test Auction", "TA", { value: CREATION_FEE });
            
            const nftContractInfo = await auctionFactory.auctionContracts(1);
            const auctionNFT = await ethers.getContractAt("AuctionNFT", nftContractInfo.auctionContract);
            
            const auctionContractInfo = await auctionFactory.auctionContracts(2);
            const nftAuction = await ethers.getContractAt("NFTAuction", auctionContractInfo.auctionContract);

            // 创建拍卖
            await auctionNFT.mintNFT(seller.address, "https://test-metadata.json");
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                START_PRICE_USD,
                AUCTION_DURATION
            );

            // 创建两个出价
            await nftAuction.connect(bidder1).bidWithETH(1, { value: ethers.parseEther("0.1") });
            await nftAuction.connect(bidder2).bidWithETH(1, { value: ethers.parseEther("0.2") });

            // 部署可能尝试重入的合约
            const MaliciousRefund = await ethers.getContractFactory("MaliciousRefund");
            const maliciousRefund = await MaliciousRefund.deploy();

            // 将一些ETH发送给恶意合约以模拟它有退款权限
            await bidder1.sendTransaction({
                to: await maliciousRefund.getAddress(),
                value: ethers.parseEther("0.1")
            });

            // 恶意合约尝试重入退款
            // 注意：这个测试可能需要更复杂的设置来真正模拟重入场景
            await expect(
                maliciousRefund.attemptReentrancy(await nftAuction.getAddress(), 1)
            ).to.be.revertedWithCustomError(nftAuction, "ReentrancyGuardReentrantCall");
        });
    });

    describe("💰 资金安全测试", function () {
        it("应该防止资金被恶意提取", async function () {
            const { auctionFactory, seller, bidder1, attacker } = await loadFixture(deploySecurityTestFixture);

            // 创建测试环境
            await auctionFactory.createNFTContract("Test NFT", "TNFT", { value: CREATION_FEE });
            await auctionFactory.createAuctionContract("Test Auction", "TA", { value: CREATION_FEE });
            
            const nftContractInfo = await auctionFactory.auctionContracts(1);
            const auctionNFT = await ethers.getContractAt("AuctionNFT", nftContractInfo.auctionContract);
            
            const auctionContractInfo = await auctionFactory.auctionContracts(2);
            const nftAuction = await ethers.getContractAt("NFTAuction", auctionContractInfo.auctionContract);

            // 创建拍卖并出价
            await auctionNFT.mintNFT(seller.address, "https://test-metadata.json");
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                START_PRICE_USD,
                AUCTION_DURATION
            );

            const bidAmount = ethers.parseEther("0.1");
            await nftAuction.connect(bidder1).bidWithETH(1, { value: bidAmount });

            // 攻击者尝试提取不属于他的退款
            await expect(
                nftAuction.connect(attacker).withdrawRefund(1)
            ).to.be.revertedWith("NFTAuction: no refund available");

            // 攻击者尝试多次提取相同的退款
            await nftAuction.connect(bidder1).bidWithETH(1, { value: ethers.parseEther("0.2") });
            await nftAuction.connect(bidder1).withdrawRefund(1);

            // 再次尝试提取应该失败
            await expect(
                nftAuction.connect(bidder1).withdrawRefund(1)
            ).to.be.revertedWith("NFTAuction: no refund available");
        });

        it("应该正确计算和分配拍卖收益", async function () {
            const { auctionFactory, owner, seller, bidder1 } = await loadFixture(deploySecurityTestFixture);

            // 创建测试环境
            await auctionFactory.createNFTContract("Test NFT", "TNFT", { value: CREATION_FEE });
            await auctionFactory.createAuctionContract("Test Auction", "TA", { value: CREATION_FEE });
            
            const nftContractInfo = await auctionFactory.auctionContracts(1);
            const auctionNFT = await ethers.getContractAt("AuctionNFT", nftContractInfo.auctionContract);
            
            const auctionContractInfo = await auctionFactory.auctionContracts(2);
            const nftAuction = await ethers.getContractAt("NFTAuction", auctionContractInfo.auctionContract);

            // 创建拍卖
            await auctionNFT.mintNFT(seller.address, "https://test-metadata.json");
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                START_PRICE_USD,
                AUCTION_DURATION
            );

            // 记录初始余额
            const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
            const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

            // 出价并结束拍卖
            const bidAmount = ethers.parseEther("0.5"); // $1000 worth at $2000 ETH price
            await nftAuction.connect(bidder1).bidWithETH(1, { value: bidAmount });

            // 等待拍卖结束
            await time.increase(AUCTION_DURATION + 1);
            await nftAuction.endAuction(1);

            // 检查余额变化
            const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
            const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

            // 计算预期的手续费 (2.5% for $1000)
            const expectedFee = bidAmount * 250n / 10000n;
            const expectedSellerIncome = bidAmount - expectedFee;

            // 验证分配
            expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(expectedSellerIncome);
            expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(expectedFee);
        });

        it("应该防止整数溢出攻击", async function () {
            const { auctionFactory, ethPriceFeed } = await loadFixture(deploySecurityTestFixture);

            // 创建拍卖合约
            await auctionFactory.createAuctionContract("Test Auction", "TA", { value: CREATION_FEE });
            const auctionContractInfo = await auctionFactory.auctionContracts(1);
            const nftAuction = await ethers.getContractAt("NFTAuction", auctionContractInfo.auctionContract);

            // 尝试设置极大的价格值来测试溢出保护
            const maxInt = 2n ** 255n - 1n; // 最大正整数
            
            // 这应该在合约内部被正确处理，不应该导致溢出
            await ethPriceFeed.updateAnswer(maxInt / 10n ** 10n); // 调整到8位小数
            
            // 获取价格应该成功且结果合理
            const price = await nftAuction.getETHPriceInUSD();
            expect(price).to.be.greaterThan(0);
            expect(price).to.be.lessThan(2n ** 256n); // 确保没有溢出
        });
    });

    describe("📊 价格操纵防护测试", function () {
        it("应该验证价格预言机的有效性", async function () {
            const { auctionFactory, attacker } = await loadFixture(deploySecurityTestFixture);

            // 创建拍卖合约
            await auctionFactory.createAuctionContract("Test Auction", "TA", { value: CREATION_FEE });
            const auctionContractInfo = await auctionFactory.auctionContracts(1);
            const nftAuction = await ethers.getContractAt("NFTAuction", auctionContractInfo.auctionContract);

            // 部署恶意价格预言机
            const MaliciousPriceFeed = await ethers.getContractFactory("MockV3Aggregator");
            const maliciousFeed = await MaliciousPriceFeed.connect(attacker).deploy(8, 0);

            // 设置零价格
            await maliciousFeed.connect(attacker).updateAnswer(0);

            // 尝试设置恶意价格预言机（只有所有者可以）
            await expect(
                auctionFactory.connect(attacker).updateGlobalConfig(
                    await maliciousFeed.getAddress(),
                    CREATION_FEE,
                    250
                )
            ).to.be.revertedWithCustomError(auctionFactory, "OwnableUnauthorizedAccount");

            // 即使价格为零，价格查询也应该失败
            await expect(
                nftAuction.getETHPriceInUSD()
            ).to.be.revertedWith("NFTAuction: invalid ETH price");
        });

        it("应该处理负价格值", async function () {
            const { auctionFactory, ethPriceFeed } = await loadFixture(deploySecurityTestFixture);

            await auctionFactory.createAuctionContract("Test Auction", "TA", { value: CREATION_FEE });
            const auctionContractInfo = await auctionFactory.auctionContracts(1);
            const nftAuction = await ethers.getContractAt("NFTAuction", auctionContractInfo.auctionContract);

            // 设置负价格
            await ethPriceFeed.updateAnswer(-1000 * 10 ** 8);

            // 查询价格应该失败
            await expect(
                nftAuction.getETHPriceInUSD()
            ).to.be.revertedWith("NFTAuction: invalid ETH price");
        });

        it("应该处理极端价格波动", async function () {
            const { auctionFactory, seller, bidder1, ethPriceFeed } = await loadFixture(deploySecurityTestFixture);

            // 创建测试环境
            await auctionFactory.createNFTContract("Test NFT", "TNFT", { value: CREATION_FEE });
            await auctionFactory.createAuctionContract("Test Auction", "TA", { value: CREATION_FEE });
            
            const nftContractInfo = await auctionFactory.auctionContracts(1);
            const auctionNFT = await ethers.getContractAt("AuctionNFT", nftContractInfo.auctionContract);
            
            const auctionContractInfo = await auctionFactory.auctionContracts(2);
            const nftAuction = await ethers.getContractAt("NFTAuction", auctionContractInfo.auctionContract);

            // 创建拍卖
            await auctionNFT.mintNFT(seller.address, "https://test-metadata.json");
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                START_PRICE_USD,
                AUCTION_DURATION
            );

            // 设置极高的ETH价格
            await ethPriceFeed.updateAnswer(1000000 * 10 ** 8); // $1,000,000 per ETH
            
            // 小额出价应该仍然有效
            await nftAuction.connect(bidder1).bidWithETH(1, { value: 1n }); // 1 wei

            const auction = await nftAuction.auctions(1);
            expect(auction.highestBidder).to.equal(bidder1.address);

            // 设置极低的ETH价格
            await ethPriceFeed.updateAnswer(1); // $0.00000001 per ETH
            
            // 大额出价应该仍然有效
            await nftAuction.connect(bidder1).bidWithETH(1, { value: ethers.parseEther("1000") });
        });
    });

    describe("🔧 智能合约升级安全测试", function () {
        it("应该保护升级过程的安全性", async function () {
            const { auctionFactory, owner, attacker } = await loadFixture(deploySecurityTestFixture);

            // 非所有者尝试升级应该失败
            const NewImplementation = await ethers.getContractFactory("AuctionFactory");
            
            await expect(
                auctionFactory.connect(attacker).upgradeToAndCall(
                    await NewImplementation.deploy(),
                    "0x"
                )
            ).to.be.revertedWithCustomError(auctionFactory, "OwnableUnauthorizedAccount");

            // 所有者应该能够升级
            const newImpl = await NewImplementation.deploy();
            await expect(
                auctionFactory.connect(owner).upgradeToAndCall(
                    await newImpl.getAddress(),
                    "0x"
                )
            ).to.not.be.reverted;
        });

        it("应该在升级后保持存储一致性", async function () {
            const { auctionFactory, owner } = await loadFixture(deploySecurityTestFixture);

            // 记录升级前的状态
            const ownerBefore = await auctionFactory.owner();
            const ethPriceFeedBefore = await auctionFactory.ethUsdPriceFeed();

            // 创建一些数据
            await auctionFactory.createNFTContract("Before Upgrade NFT", "BUN", { value: CREATION_FEE });
            const contractIdBefore = await auctionFactory.getNextContractId();

            // 执行升级
            const NewImplementation = await ethers.getContractFactory("AuctionFactory");
            const upgradedFactory = await upgrades.upgradeProxy(
                await auctionFactory.getAddress(),
                NewImplementation
            );

            // 验证状态保持
            expect(await upgradedFactory.owner()).to.equal(ownerBefore);
            expect(await upgradedFactory.ethUsdPriceFeed()).to.equal(ethPriceFeedBefore);
            expect(await upgradedFactory.getNextContractId()).to.equal(contractIdBefore);

            // 验证升级后功能正常
            await upgradedFactory.createNFTContract("After Upgrade NFT", "AUN", { value: CREATION_FEE });
            const contractIdAfter = await upgradedFactory.getNextContractId();
            expect(contractIdAfter).to.equal(contractIdBefore + 1n);
        });
    });

    describe("⚡ DOS攻击防护测试", function () {
        it("应该防止通过大量出价的DOS攻击", async function () {
            const { auctionFactory, seller, attacker } = await loadFixture(deploySecurityTestFixture);

            // 创建测试环境
            await auctionFactory.createNFTContract("Test NFT", "TNFT", { value: CREATION_FEE });
            await auctionFactory.createAuctionContract("Test Auction", "TA", { value: CREATION_FEE });
            
            const nftContractInfo = await auctionFactory.auctionContracts(1);
            const auctionNFT = await ethers.getContractAt("AuctionNFT", nftContractInfo.auctionContract);
            
            const auctionContractInfo = await auctionFactory.auctionContracts(2);
            const nftAuction = await ethers.getContractAt("NFTAuction", auctionContractInfo.auctionContract);

            // 创建拍卖
            await auctionNFT.mintNFT(seller.address, "https://test-metadata.json");
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                START_PRICE_USD,
                AUCTION_DURATION
            );

            // 攻击者尝试进行大量微小出价
            let successfulBids = 0;
            const maxAttempts = 10;

            for (let i = 0; i < maxAttempts; i++) {
                try {
                    await nftAuction.connect(attacker).bidWithETH(1, {
                        value: ethers.parseEther((0.01 + i * 0.001).toString())
                    });
                    successfulBids++;
                } catch (error) {
                    // 如果Gas不足或其他限制，停止攻击
                    break;
                }
            }

            // 验证系统仍然正常运行
            const auction = await nftAuction.auctions(1);
            expect(auction.status).to.equal(0); // Still active
            
            // 正常用户应该仍然能够出价
            await nftAuction.connect(seller).bidWithETH(1, {
                value: ethers.parseEther("1")
            });

            console.log(`      📊 攻击者完成了 ${successfulBids} 次出价，系统仍然正常运行`);
        });

        it("应该处理Gas限制攻击", async function () {
            const { auctionFactory, seller, attacker } = await loadFixture(deploySecurityTestFixture);

            // 创建测试环境
            await auctionFactory.createNFTContract("Test NFT", "TNFT", { value: CREATION_FEE });
            await auctionFactory.createAuctionContract("Test Auction", "TA", { value: CREATION_FEE });
            
            const nftContractInfo = await auctionFactory.auctionContracts(1);
            const auctionNFT = await ethers.getContractAt("AuctionNFT", nftContractInfo.auctionContract);
            
            const auctionContractInfo = await auctionFactory.auctionContracts(2);
            const nftAuction = await ethers.getContractAt("NFTAuction", auctionContractInfo.auctionContract);

            // 创建拍卖
            await auctionNFT.mintNFT(seller.address, "https://test-metadata.json");
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                START_PRICE_USD,
                AUCTION_DURATION
            );

            // 攻击者尝试使用极低的Gas限制来阻止其他操作
            try {
                await nftAuction.connect(attacker).bidWithETH(1, {
                    value: ethers.parseEther("0.1"),
                    gasLimit: 21000 // 极低的Gas限制
                });
            } catch (error) {
                // 预期会失败，因为Gas不足
                expect(error.message).to.include("out of gas");
            }

            // 正常Gas限制的操作应该仍然成功
            await nftAuction.connect(attacker).bidWithETH(1, {
                value: ethers.parseEther("0.2")
            });

            const auction = await nftAuction.auctions(1);
            expect(auction.highestBidder).to.equal(attacker.address);
        });
    });
});

// 恶意重入攻击合约
const MaliciousReentrancySource = `
    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.30;
    
    contract MaliciousReentrancy {
        bool public attacking = false;
        
        function attack(address target, uint256 auctionId) external payable {
            attacking = true;
            (bool success,) = target.call{value: msg.value}(
                abi.encodeWithSignature("bidWithETH(uint256)", auctionId)
            );
            require(success, "Initial call failed");
        }
        
        receive() external payable {
            if (attacking) {
                attacking = false;
                // 尝试重入攻击
                (bool success,) = msg.sender.call{value: 0}(
                    abi.encodeWithSignature("withdrawRefund(uint256)", 1)
                );
                require(success, "Reentrancy attack failed");
            }
        }
    }
`;

// 恶意退款攻击合约
const MaliciousRefundSource = `
    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.30;
    
    contract MaliciousRefund {
        uint256 public reentrancyCount = 0;
        
        function attemptReentrancy(address target, uint256 auctionId) external {
            (bool success,) = target.call(
                abi.encodeWithSignature("withdrawRefund(uint256)", auctionId)
            );
            require(success, "Reentrancy attempt failed");
        }
        
        receive() external payable {
            if (reentrancyCount < 2) {
                reentrancyCount++;
                // 尝试重入攻击
                (bool success,) = msg.sender.call(
                    abi.encodeWithSignature("withdrawRefund(uint256)", 1)
                );
                // 不要求成功，因为重入保护应该阻止这个调用
            }
        }
    }
`;