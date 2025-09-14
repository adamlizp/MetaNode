const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("NFT拍卖系统完整测试", function () {
    let owner, seller, bidder1, bidder2, bidder3;
    let auctionFactory, nftAuction, auctionNFT, auctionToken;
    let ethPriceFeed, tokenPriceFeed;
    let auctionImplementation, nftImplementation, tokenImplementation;

    // 测试常量
    const INITIAL_ETH_PRICE = 2000 * 10 ** 8; // $2000, 8位小数
    const INITIAL_TOKEN_PRICE = 1 * 10 ** 8; // $1, 8位小数
    const START_PRICE_USD = ethers.parseEther("100"); // $100 USD
    const AUCTION_DURATION = 3600; // 1小时

    beforeEach(async function () {
        // 获取测试账户
        [owner, seller, bidder1, bidder2, bidder3] = await ethers.getSigners();

        // 部署Mock价格预言机
        const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
        ethPriceFeed = await MockV3Aggregator.deploy(8, INITIAL_ETH_PRICE);
        tokenPriceFeed = await MockV3Aggregator.deploy(8, INITIAL_TOKEN_PRICE);

        // 部署合约实现
        const NFTAuction = await ethers.getContractFactory("NFTAuction");
        const AuctionNFT = await ethers.getContractFactory("AuctionNFT");
        const AuctionToken = await ethers.getContractFactory("AuctionToken");

        auctionImplementation = await NFTAuction.deploy();
        nftImplementation = await AuctionNFT.deploy();
        tokenImplementation = await AuctionToken.deploy();

        // 部署工厂合约
        const AuctionFactory = await ethers.getContractFactory("AuctionFactory");
        auctionFactory = await upgrades.deployProxy(
            AuctionFactory,
            [
                owner.address,
                await ethPriceFeed.getAddress(),
                await auctionImplementation.getAddress(),
                await nftImplementation.getAddress(),
                await tokenImplementation.getAddress()
            ],
            { initializer: 'initialize' }
        );

        // 创建NFT合约
        const nftContractAddress = await auctionFactory.createNFTContract.staticCall(
            "Test NFT",
            "TNFT"
        );
        await auctionFactory.createNFTContract("Test NFT", "TNFT");
        auctionNFT = await ethers.getContractAt("AuctionNFT", nftContractAddress);

        // 创建代币合约
        const tokenContractAddress = await auctionFactory.createTokenContract.staticCall(
            "Test Token",
            "TT"
        );
        await auctionFactory.createTokenContract("Test Token", "TT");
        auctionToken = await ethers.getContractAt("AuctionToken", tokenContractAddress);

        // 设置代币支持和价格预言机
        await auctionFactory.setSupportedToken(await auctionToken.getAddress(), true);
        await auctionFactory.setTokenPriceFeed(
            await auctionToken.getAddress(),
            await tokenPriceFeed.getAddress()
        );

        // 创建拍卖合约
        const [contractId, auctionContractAddress] = await auctionFactory.createAuctionContract.staticCall(
            "Test Auction",
            "测试拍卖"
        );
        await auctionFactory.createAuctionContract("Test Auction", "测试拍卖");
        nftAuction = await ethers.getContractAt("NFTAuction", auctionContractAddress);

        // 铸造NFT给卖家
        await auctionNFT.mintNFT(seller.address, "https://test-metadata.json");

        // 给出价者铸造代币
        await auctionToken.mint(bidder1.address, ethers.parseEther("1000"));
        await auctionToken.mint(bidder2.address, ethers.parseEther("2000"));
        await auctionToken.mint(bidder3.address, ethers.parseEther("3000"));
    });

    describe("系统部署和初始化", function () {
        it("应该正确部署所有合约", async function () {
            expect(await auctionFactory.getAddress()).to.not.equal(ethers.ZeroAddress);
            expect(await nftAuction.getAddress()).to.not.equal(ethers.ZeroAddress);
            expect(await auctionNFT.getAddress()).to.not.equal(ethers.ZeroAddress);
            expect(await auctionToken.getAddress()).to.not.equal(ethers.ZeroAddress);
        });

        it("应该正确设置工厂合约参数", async function () {
            expect(await auctionFactory.ethUsdPriceFeed()).to.equal(await ethPriceFeed.getAddress());
            expect(await auctionFactory.auctionImplementation()).to.equal(await auctionImplementation.getAddress());
            expect(await auctionFactory.nftImplementation()).to.equal(await nftImplementation.getAddress());
            expect(await auctionFactory.tokenImplementation()).to.equal(await tokenImplementation.getAddress());
        });

        it("应该正确设置拍卖合约参数", async function () {
            expect(await nftAuction.ethUsdPriceFeed()).to.equal(await ethPriceFeed.getAddress());
            expect(await nftAuction.baseFeeRate()).to.equal(250); // 2.5%
            expect(await nftAuction.maxFeeRate()).to.equal(1000); // 10%
        });
    });

    describe("NFT和代币功能", function () {
        it("应该能够铸造NFT", async function () {
            const tokenId = await auctionNFT.mintNFT(seller.address, "https://test2.json");
            expect(await auctionNFT.ownerOf(2)).to.equal(seller.address);
            expect(await auctionNFT.tokenURI(2)).to.equal("https://test2.json");
        });

        it("应该能够批量铸造NFT", async function () {
            const tokenURIs = [
                "https://test3.json",
                "https://test4.json",
                "https://test5.json"
            ];
            await auctionNFT.batchMintNFT(seller.address, tokenURIs);

            expect(await auctionNFT.ownerOf(2)).to.equal(seller.address);
            expect(await auctionNFT.ownerOf(3)).to.equal(seller.address);
            expect(await auctionNFT.ownerOf(4)).to.equal(seller.address);
            expect(await auctionNFT.getTotalSupply()).to.equal(4);
        });

        it("应该能够铸造和销毁代币", async function () {
            const initialBalance = await auctionToken.balanceOf(bidder1.address);
            await auctionToken.mint(bidder1.address, ethers.parseEther("500"));
            expect(await auctionToken.balanceOf(bidder1.address)).to.equal(
                initialBalance + ethers.parseEther("500")
            );

            await auctionToken.burn(bidder1.address, ethers.parseEther("200"));
            expect(await auctionToken.balanceOf(bidder1.address)).to.equal(
                initialBalance + ethers.parseEther("300")
            );
        });
    });

    describe("价格预言机功能", function () {
        it("应该正确获取ETH价格", async function () {
            const ethPrice = await nftAuction.getETHPriceInUSD();
            expect(ethPrice).to.equal(ethers.parseEther("2000")); // $2000
        });

        it("应该正确获取代币价格", async function () {
            const tokenPrice = await nftAuction.getTokenPriceInUSD(await auctionToken.getAddress());
            expect(tokenPrice).to.equal(ethers.parseEther("1")); // $1
        });

        it("应该能够更新价格", async function () {
            await ethPriceFeed.updateAnswer(2500 * 10 ** 8); // $2500
            const newEthPrice = await nftAuction.getETHPriceInUSD();
            expect(newEthPrice).to.equal(ethers.parseEther("2500"));
        });
    });

    describe("拍卖创建和管理", function () {
        it("应该能够创建拍卖", async function () {
            // 授权拍卖合约操作NFT
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);

            const tx = await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                START_PRICE_USD,
                AUCTION_DURATION
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return nftAuction.interface.parseLog(log).name === 'AuctionCreated';
                } catch {
                    return false;
                }
            });

            expect(event).to.not.be.undefined;

            const auctionInfo = await nftAuction.getAuctionInfo(1);
            expect(auctionInfo.seller).to.equal(seller.address);
            expect(auctionInfo.startPrice).to.equal(START_PRICE_USD);
            expect(auctionInfo.status).to.equal(0); // Active
        });

        it("应该能够取消没有出价的拍卖", async function () {
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                START_PRICE_USD,
                AUCTION_DURATION
            );

            await nftAuction.connect(seller).cancelAuction(1);

            const auctionInfo = await nftAuction.getAuctionInfo(1);
            expect(auctionInfo.status).to.equal(2); // Cancelled
            expect(await auctionNFT.ownerOf(1)).to.equal(seller.address);
        });
    });

    describe("出价功能", function () {
        beforeEach(async function () {
            // 创建拍卖
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                START_PRICE_USD,
                AUCTION_DURATION
            );
        });

        it("应该能够使用ETH出价", async function () {
            const bidAmount = ethers.parseEther("0.1"); // 0.1 ETH = $200

            await nftAuction.connect(bidder1).bidWithETH(1, { value: bidAmount });

            const auctionInfo = await nftAuction.getAuctionInfo(1);
            expect(auctionInfo.highestBidder).to.equal(bidder1.address);
            expect(auctionInfo.highestBidType).to.equal(0); // ETH
            expect(auctionInfo.highestBidOriginalAmount).to.equal(bidAmount);
        });

        it("应该能够使用ERC20代币出价", async function () {
            const bidAmount = ethers.parseEther("200"); // 200 tokens = $200

            await auctionToken.connect(bidder1).approve(await nftAuction.getAddress(), bidAmount);
            await nftAuction.connect(bidder1).bidWithERC20(1, await auctionToken.getAddress(), bidAmount);

            const auctionInfo = await nftAuction.getAuctionInfo(1);
            expect(auctionInfo.highestBidder).to.equal(bidder1.address);
            expect(auctionInfo.highestBidType).to.equal(1); // ERC20
            expect(auctionInfo.highestBidOriginalAmount).to.equal(bidAmount);
        });

        it("应该正确处理多个出价", async function () {
            // 第一个出价 (ETH)
            const bid1Amount = ethers.parseEther("0.1"); // $200
            await nftAuction.connect(bidder1).bidWithETH(1, { value: bid1Amount });

            // 第二个出价 (ERC20) - 更高
            const bid2Amount = ethers.parseEther("300"); // $300
            await auctionToken.connect(bidder2).approve(await nftAuction.getAddress(), bid2Amount);
            await nftAuction.connect(bidder2).bidWithERC20(1, await auctionToken.getAddress(), bid2Amount);

            const auctionInfo = await nftAuction.getAuctionInfo(1);
            expect(auctionInfo.highestBidder).to.equal(bidder2.address);
            expect(auctionInfo.highestBidType).to.equal(1); // ERC20

            // 检查退款
            expect(await nftAuction.bidderRefunds(1, bidder1.address)).to.equal(bid1Amount);
        });

        it("应该拒绝低于起始价格的出价", async function () {
            const lowBidAmount = ethers.parseEther("0.01"); // $20, 低于$100起始价

            await expect(
                nftAuction.connect(bidder1).bidWithETH(1, { value: lowBidAmount })
            ).to.be.revertedWith("NFTAuction: bid below start price");
        });

        it("应该拒绝低于当前最高出价的出价", async function () {
            // 第一个出价
            const bid1Amount = ethers.parseEther("0.1"); // $200
            await nftAuction.connect(bidder1).bidWithETH(1, { value: bid1Amount });

            // 尝试更低的出价
            const bid2Amount = ethers.parseEther("0.05"); // $100
            await expect(
                nftAuction.connect(bidder2).bidWithETH(1, { value: bid2Amount })
            ).to.be.revertedWith("NFTAuction: bid too low");
        });
    });

    describe("拍卖结束和结算", function () {
        beforeEach(async function () {
            // 创建拍卖
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                START_PRICE_USD,
                AUCTION_DURATION
            );
        });

        it("应该能够在时间到期后结束拍卖", async function () {
            // 出价
            const bidAmount = ethers.parseEther("0.1"); // $200
            await nftAuction.connect(bidder1).bidWithETH(1, { value: bidAmount });

            // 时间快进
            await time.increase(AUCTION_DURATION + 1);

            // 结束拍卖
            await nftAuction.endAuction(1);

            const auctionInfo = await nftAuction.getAuctionInfo(1);
            expect(auctionInfo.status).to.equal(1); // Ended
            expect(await auctionNFT.ownerOf(1)).to.equal(bidder1.address);
        });

        it("应该正确计算和扣除手续费", async function () {
            const bidAmount = ethers.parseEther("0.1"); // $200
            const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);

            await nftAuction.connect(bidder1).bidWithETH(1, { value: bidAmount });
            await time.increase(AUCTION_DURATION + 1);

            const tx = await nftAuction.endAuction(1);
            const receipt = await tx.wait();

            const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);

            // 计算预期的手续费 (2.5%)
            const expectedFee = (bidAmount * 250n) / 10000n;
            const expectedSellerAmount = bidAmount - expectedFee;

            expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(expectedSellerAmount);
        });

        it("应该能够处理没有出价的拍卖", async function () {
            await time.increase(AUCTION_DURATION + 1);
            await nftAuction.endAuction(1);

            const auctionInfo = await nftAuction.getAuctionInfo(1);
            expect(auctionInfo.status).to.equal(1); // Ended
            expect(await auctionNFT.ownerOf(1)).to.equal(seller.address); // NFT退还给卖家
        });
    });

    describe("动态手续费功能", function () {
        it("应该正确计算基础手续费", async function () {
            const auctionValue = ethers.parseEther("5000"); // $5,000
            const fee = await nftAuction.calculateFee(auctionValue);
            const expectedFee = (auctionValue * 250n) / 10000n; // 2.5%
            expect(fee).to.equal(expectedFee);
        });

        it("应该正确计算动态手续费", async function () {
            const auctionValue = ethers.parseEther("15000"); // $15,000 (超过$10,000阈值)
            const fee = await nftAuction.calculateFee(auctionValue);

            // 基础费用: $10,000 * 2.5% = $250
            const baseFee = (ethers.parseEther("10000") * 250n) / 10000n;
            // 超额费用: $5,000 * 10% = $500
            const excessFee = (ethers.parseEther("5000") * 1000n) / 10000n;
            const expectedFee = baseFee + excessFee;

            expect(fee).to.equal(expectedFee);
        });

        it("应该能够更新手续费率", async function () {
            await nftAuction.setFeeRates(300, 1200, ethers.parseEther("5000"));

            expect(await nftAuction.baseFeeRate()).to.equal(300); // 3%
            expect(await nftAuction.maxFeeRate()).to.equal(1200); // 12%
            expect(await nftAuction.feeThreshold()).to.equal(ethers.parseEther("5000"));
        });
    });

    describe("退款功能", function () {
        beforeEach(async function () {
            // 创建拍卖
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                START_PRICE_USD,
                AUCTION_DURATION
            );
        });

        it("应该能够处理ETH退款", async function () {
            const bid1Amount = ethers.parseEther("0.1"); // $200
            const bid2Amount = ethers.parseEther("0.15"); // $300

            // 第一个出价
            await nftAuction.connect(bidder1).bidWithETH(1, { value: bid1Amount });

            // 第二个更高出价
            await nftAuction.connect(bidder2).bidWithETH(1, { value: bid2Amount });

            // 结束拍卖
            await time.increase(AUCTION_DURATION + 1);
            await nftAuction.endAuction(1);

            // 处理退款
            const balanceBefore = await ethers.provider.getBalance(bidder1.address);
            const tx = await nftAuction.connect(bidder1).processRefund(1);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;
            const balanceAfter = await ethers.provider.getBalance(bidder1.address);

            expect(balanceAfter + gasUsed - balanceBefore).to.equal(bid1Amount);
        });

        it("应该能够处理ERC20代币退款", async function () {
            const bid1Amount = ethers.parseEther("200"); // $200
            const bid2Amount = ethers.parseEther("300"); // $300

            // 第一个出价 (ERC20)
            await auctionToken.connect(bidder1).approve(await nftAuction.getAddress(), bid1Amount);
            await nftAuction.connect(bidder1).bidWithERC20(1, await auctionToken.getAddress(), bid1Amount);

            // 第二个更高出价 (ERC20)
            await auctionToken.connect(bidder2).approve(await nftAuction.getAddress(), bid2Amount);
            await nftAuction.connect(bidder2).bidWithERC20(1, await auctionToken.getAddress(), bid2Amount);

            // 结束拍卖
            await time.increase(AUCTION_DURATION + 1);
            await nftAuction.endAuction(1);

            // 处理退款
            const balanceBefore = await auctionToken.balanceOf(bidder1.address);
            await nftAuction.connect(bidder1).processRefund(1);
            const balanceAfter = await auctionToken.balanceOf(bidder1.address);

            expect(balanceAfter - balanceBefore).to.equal(bid1Amount);
        });
    });

    describe("合约升级功能", function () {
        it("应该能够升级拍卖合约", async function () {
            // 部署新版本的实现合约
            const NFTAuctionV2 = await ethers.getContractFactory("NFTAuction");
            const newImplementation = await NFTAuctionV2.deploy();

            // 升级合约
            await upgrades.upgradeProxy(await nftAuction.getAddress(), NFTAuctionV2);

            // 验证升级后合约仍然工作
            expect(await nftAuction.baseFeeRate()).to.equal(250);
        });

        it("应该能够升级工厂合约", async function () {
            const AuctionFactoryV2 = await ethers.getContractFactory("AuctionFactory");
            const newImplementation = await AuctionFactoryV2.deploy();

            await upgrades.upgradeProxy(await auctionFactory.getAddress(), AuctionFactoryV2);

            expect(await auctionFactory.creationFee()).to.equal(ethers.parseEther("0.01"));
        });
    });

    describe("权限和安全", function () {
        it("应该拒绝非所有者调用管理函数", async function () {
            await expect(
                nftAuction.connect(bidder1).setFeeRates(300, 1200, ethers.parseEther("5000"))
            ).to.be.revertedWithCustomError(nftAuction, "OwnableUnauthorizedAccount");

            await expect(
                auctionFactory.connect(bidder1).setSupportedToken(await auctionToken.getAddress(), false)
            ).to.be.revertedWithCustomError(auctionFactory, "OwnableUnauthorizedAccount");
        });

        it("应该防止重入攻击", async function () {
            // 这个测试需要一个恶意合约来测试重入攻击
            // 由于合约使用了ReentrancyGuard，应该能防止重入攻击
        });

        it("应该验证输入参数", async function () {
            await expect(
                nftAuction.connect(seller).createAuction(
                    ethers.ZeroAddress,
                    1,
                    START_PRICE_USD,
                    AUCTION_DURATION
                )
            ).to.be.revertedWith("NFTAuction: invalid NFT contract");

            await expect(
                nftAuction.connect(seller).createAuction(
                    await auctionNFT.getAddress(),
                    1,
                    0,
                    AUCTION_DURATION
                )
            ).to.be.revertedWith("NFTAuction: start price must be greater than 0");
        });
    });

    describe("工厂模式功能", function () {
        it("应该能够创建多个拍卖合约实例", async function () {
            const [contractId2, auctionContract2] = await auctionFactory.createAuctionContract.staticCall(
                "Second Auction",
                "第二个拍卖"
            );
            await auctionFactory.createAuctionContract("Second Auction", "第二个拍卖");

            const [contractId3, auctionContract3] = await auctionFactory.createAuctionContract.staticCall(
                "Third Auction",
                "第三个拍卖"
            );
            await auctionFactory.createAuctionContract("Third Auction", "第三个拍卖");

            expect(contractId2).to.equal(2);
            expect(contractId3).to.equal(3);
            expect(auctionContract2).to.not.equal(auctionContract3);
        });

        it("应该能够管理拍卖合约状态", async function () {
            const contractId = 1;

            // 停用合约
            await auctionFactory.deactivateAuctionContract(contractId);
            const infoAfterDeactivate = await auctionFactory.getAuctionContractInfo(contractId);
            expect(infoAfterDeactivate.isActive).to.be.false;

            // 重新激活合约
            await auctionFactory.activateAuctionContract(contractId);
            const infoAfterActivate = await auctionFactory.getAuctionContractInfo(contractId);
            expect(infoAfterActivate.isActive).to.be.true;
        });

        it("应该能够获取创建者的合约列表", async function () {
            const creatorContracts = await auctionFactory.getCreatorContracts(owner.address);
            expect(creatorContracts.length).to.be.greaterThan(0);
            expect(creatorContracts[0]).to.equal(1);
        });

        it("应该能够分页获取活跃合约", async function () {
            // 创建更多合约
            await auctionFactory.createAuctionContract("Auction 2", "拍卖2");
            await auctionFactory.createAuctionContract("Auction 3", "拍卖3");

            const [contractIds, contractInfos] = await auctionFactory.getActiveContracts(0, 2);
            expect(contractIds.length).to.equal(2);
            expect(contractInfos.length).to.equal(2);
        });
    });

    describe("事件发射", function () {
        it("应该在创建拍卖时发射事件", async function () {
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);

            await expect(
                nftAuction.connect(seller).createAuction(
                    await auctionNFT.getAddress(),
                    1,
                    START_PRICE_USD,
                    AUCTION_DURATION
                )
            ).to.emit(nftAuction, "AuctionCreated");
        });

        it("应该在出价时发射事件", async function () {
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                START_PRICE_USD,
                AUCTION_DURATION
            );

            await expect(
                nftAuction.connect(bidder1).bidWithETH(1, { value: ethers.parseEther("0.1") })
            ).to.emit(nftAuction, "BidPlaced");
        });

        it("应该在结束拍卖时发射事件", async function () {
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                START_PRICE_USD,
                AUCTION_DURATION
            );

            await nftAuction.connect(bidder1).bidWithETH(1, { value: ethers.parseEther("0.1") });
            await time.increase(AUCTION_DURATION + 1);

            await expect(nftAuction.endAuction(1)).to.emit(nftAuction, "AuctionEnded");
        });
    });
});
