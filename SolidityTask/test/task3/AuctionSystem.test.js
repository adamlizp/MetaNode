const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("NFT Auction System", function () {
    let owner, seller, bidder1, bidder2, bidder3;
    let auctionFactory, auctionNFT, auctionToken, nftAuction;
    let mockEthPriceFeed, mockTokenPriceFeed;

    // Mock价格数据
    const ETH_PRICE_USD = ethers.parseUnits("2000", 8); // $2000, 8位小数
    const TOKEN_PRICE_USD = ethers.parseUnits("100", 8);  // $100, 8位小数

    beforeEach(async function () {
        [owner, seller, bidder1, bidder2, bidder3] = await ethers.getSigners();

        // 部署Mock价格预言机
        const MockAggregator = await ethers.getContractFactory("MockV3Aggregator");
        mockEthPriceFeed = await MockAggregator.deploy(8, ETH_PRICE_USD);
        mockTokenPriceFeed = await MockAggregator.deploy(8, TOKEN_PRICE_USD);

        // 部署实现合约
        const AuctionNFT = await ethers.getContractFactory("AuctionNFT");
        const AuctionToken = await ethers.getContractFactory("AuctionToken");
        const NFTAuction = await ethers.getContractFactory("NFTAuction");
        const AuctionFactory = await ethers.getContractFactory("AuctionFactory");

        const auctionNFTImpl = await AuctionNFT.deploy();
        const auctionTokenImpl = await AuctionToken.deploy();
        const nftAuctionImpl = await NFTAuction.deploy();

        // 部署工厂合约
        auctionFactory = await upgrades.deployProxy(
            AuctionFactory,
            [
                owner.address,
                await mockEthPriceFeed.getAddress(),
                await nftAuctionImpl.getAddress(),
                await auctionNFTImpl.getAddress(),
                await auctionTokenImpl.getAddress()
            ],
            { initializer: 'initialize' }
        );

        // 创建NFT合约
        const createNFTTx = await auctionFactory.createNFTContract("Test NFT", "TNFT");
        const receipt = await createNFTTx.wait();
        const nftCreatedEvent = receipt.logs.find(log => {
            try {
                return auctionFactory.interface.parseLog(log).name === "NFTContractCreated";
            } catch {
                return false;
            }
        });
        const nftAddress = auctionFactory.interface.parseLog(nftCreatedEvent).args.nftContract;
        auctionNFT = await ethers.getContractAt("AuctionNFT", nftAddress);

        // 创建代币合约
        const createTokenTx = await auctionFactory.createTokenContract("Test Token", "TTK");
        const tokenReceipt = await createTokenTx.wait();
        const tokenCreatedEvent = tokenReceipt.logs.find(log => {
            try {
                return auctionFactory.interface.parseLog(log).name === "TokenContractCreated";
            } catch {
                return false;
            }
        });
        const tokenAddress = auctionFactory.interface.parseLog(tokenCreatedEvent).args.tokenContract;
        auctionToken = await ethers.getContractAt("AuctionToken", tokenAddress);

        // 设置支持的代币和价格预言机
        await auctionFactory.setSupportedToken(await auctionToken.getAddress(), true);
        await auctionFactory.setTokenPriceFeed(
            await auctionToken.getAddress(),
            await mockTokenPriceFeed.getAddress()
        );

        // 创建拍卖合约
        const createAuctionTx = await auctionFactory.connect(seller).createAuctionContract(
            "Test Auction",
            "Test auction description",
            { value: ethers.parseEther("0.01") }
        );
        const auctionReceipt = await createAuctionTx.wait();
        const auctionCreatedEvent = auctionReceipt.logs.find(log => {
            try {
                return auctionFactory.interface.parseLog(log).name === "AuctionContractCreated";
            } catch {
                return false;
            }
        });
        const auctionAddress = auctionFactory.interface.parseLog(auctionCreatedEvent).args.auctionContract;
        nftAuction = await ethers.getContractAt("NFTAuction", auctionAddress);

        // 铸造NFT给卖家
        await auctionNFT.mintNFT(seller.address, "https://example.com/metadata/1");

        // 铸造代币给出价者
        await auctionToken.mint(bidder1.address, ethers.parseEther("1000"));
        await auctionToken.mint(bidder2.address, ethers.parseEther("2000"));

        // 授权拍卖合约操作NFT和代币
        await auctionNFT.setAuctionAuthorization(await nftAuction.getAddress(), true);
        await auctionToken.setAuctionAuthorization(await nftAuction.getAddress(), true);
    });

    describe("Factory Contract", function () {
        it("Should deploy factory with correct initial settings", async function () {
            expect(await auctionFactory.owner()).to.equal(owner.address);
            expect(await auctionFactory.ethUsdPriceFeed()).to.equal(await mockEthPriceFeed.getAddress());
            expect(await auctionFactory.creationFee()).to.equal(ethers.parseEther("0.01"));
            expect(await auctionFactory.platformFeeRate()).to.equal(50);
        });

        it("Should create auction contract successfully", async function () {
            const contractInfo = await auctionFactory.getAuctionContractInfo(1);
            expect(contractInfo.creator).to.equal(seller.address);
            expect(contractInfo.name).to.equal("Test Auction");
            expect(contractInfo.isActive).to.be.true;
        });

        it("Should create NFT contract successfully", async function () {
            expect(await auctionNFT.name()).to.equal("Test NFT");
            expect(await auctionNFT.symbol()).to.equal("TNFT");
            expect(await auctionNFT.owner()).to.equal(seller.address);
        });

        it("Should create token contract successfully", async function () {
            expect(await auctionToken.name()).to.equal("Test Token");
            expect(await auctionToken.symbol()).to.equal("TTK");
            expect(await auctionToken.owner()).to.equal(seller.address);
        });
    });

    describe("NFT Contract", function () {
        it("Should mint NFT correctly", async function () {
            const tokenId = await auctionNFT.getNextTokenId();
            await auctionNFT.connect(seller).mintNFT(seller.address, "https://example.com/metadata/2");

            expect(await auctionNFT.ownerOf(tokenId)).to.equal(seller.address);
            expect(await auctionNFT.tokenURI(tokenId)).to.equal("https://example.com/metadata/2");
            expect(await auctionNFT.getTotalSupply()).to.equal(2);
        });

        it("Should batch mint NFTs correctly", async function () {
            const uris = [
                "https://example.com/metadata/3",
                "https://example.com/metadata/4",
                "https://example.com/metadata/5"
            ];

            const tokenIds = await auctionNFT.connect(seller).batchMintNFT.staticCall(seller.address, uris);
            await auctionNFT.connect(seller).batchMintNFT(seller.address, uris);

            expect(tokenIds.length).to.equal(3);
            for (let i = 0; i < tokenIds.length; i++) {
                expect(await auctionNFT.ownerOf(tokenIds[i])).to.equal(seller.address);
                expect(await auctionNFT.tokenURI(tokenIds[i])).to.equal(uris[i]);
            }
        });

        it("Should return tokens of owner correctly", async function () {
            const uris = ["https://example.com/metadata/6", "https://example.com/metadata/7"];
            await auctionNFT.connect(seller).batchMintNFT(seller.address, uris);

            const tokens = await auctionNFT.tokensOfOwner(seller.address);
            expect(tokens.length).to.equal(3); // 1 from beforeEach + 2 from this test
        });
    });

    describe("Auction Contract", function () {
        let tokenId = 1;
        let auctionId;

        beforeEach(async function () {
            // 授权拍卖合约操作NFT
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), tokenId);

            // 创建拍卖
            const startPrice = ethers.parseEther("1000"); // $1000 USD
            const duration = 3600; // 1 hour

            const tx = await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                tokenId,
                startPrice,
                duration
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return nftAuction.interface.parseLog(log).name === "AuctionCreated";
                } catch {
                    return false;
                }
            });
            auctionId = nftAuction.interface.parseLog(event).args.auctionId;
        });

        it("Should create auction correctly", async function () {
            const auction = await nftAuction.getAuctionInfo(auctionId);
            expect(auction.tokenId).to.equal(tokenId);
            expect(auction.seller).to.equal(seller.address);
            expect(auction.startPrice).to.equal(ethers.parseEther("1000"));
            expect(auction.status).to.equal(0); // Active

            // NFT应该被转移到拍卖合约
            expect(await auctionNFT.ownerOf(tokenId)).to.equal(await nftAuction.getAddress());
        });

        it("Should accept ETH bids correctly", async function () {
            const bidAmount = ethers.parseEther("1"); // 1 ETH = $2000 USD (根据mock价格)

            await nftAuction.connect(bidder1).bidWithETH(auctionId, { value: bidAmount });

            const auction = await nftAuction.getAuctionInfo(auctionId);
            expect(auction.highestBidder).to.equal(bidder1.address);
            expect(auction.highestBidAmount).to.equal(ethers.parseEther("2000")); // $2000 USD
            expect(auction.highestBidType).to.equal(0); // ETH
            expect(auction.highestBidOriginalAmount).to.equal(bidAmount);
        });

        it("Should accept ERC20 token bids correctly", async function () {
            const bidAmount = ethers.parseEther("15"); // 15 tokens = $1500 USD

            // 授权拍卖合约使用代币
            await auctionToken.connect(bidder1).approve(await nftAuction.getAddress(), bidAmount);

            await nftAuction.connect(bidder1).bidWithERC20(
                auctionId,
                await auctionToken.getAddress(),
                bidAmount
            );

            const auction = await nftAuction.getAuctionInfo(auctionId);
            expect(auction.highestBidder).to.equal(bidder1.address);
            expect(auction.highestBidAmount).to.equal(ethers.parseEther("1500")); // $1500 USD
            expect(auction.highestBidType).to.equal(1); // ERC20
            expect(auction.highestBidOriginalAmount).to.equal(bidAmount);
            expect(auction.highestBidToken).to.equal(await auctionToken.getAddress());
        });

        it("Should handle multiple bids and refunds correctly", async function () {
            // 第一次出价 (ETH)
            const bid1 = ethers.parseEther("0.75"); // 0.75 ETH = $1500
            await nftAuction.connect(bidder1).bidWithETH(auctionId, { value: bid1 });

            // 第二次出价 (ERC20)
            const bid2 = ethers.parseEther("20"); // 20 tokens = $2000
            await auctionToken.connect(bidder2).approve(await nftAuction.getAddress(), bid2);
            await nftAuction.connect(bidder2).bidWithERC20(
                auctionId,
                await auctionToken.getAddress(),
                bid2
            );

            // 检查最高出价
            const auction = await nftAuction.getAuctionInfo(auctionId);
            expect(auction.highestBidder).to.equal(bidder2.address);
            expect(auction.highestBidAmount).to.equal(ethers.parseEther("2000"));

            // 检查退款
            const refund = await nftAuction.bidderRefunds(auctionId, bidder1.address);
            expect(refund).to.equal(bid1);
        });

        it("Should end auction correctly with ETH winner", async function () {
            // 出价
            const bidAmount = ethers.parseEther("1"); // 1 ETH = $2000
            await nftAuction.connect(bidder1).bidWithETH(auctionId, { value: bidAmount });

            // 快进时间到拍卖结束
            await time.increase(3601);

            // 记录卖家余额
            const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);

            // 结束拍卖
            await nftAuction.endAuction(auctionId);

            // 检查拍卖状态
            const auction = await nftAuction.getAuctionInfo(auctionId);
            expect(auction.status).to.equal(1); // Ended

            // 检查NFT转移
            expect(await auctionNFT.ownerOf(tokenId)).to.equal(bidder1.address);

            // 检查卖家收到资金（扣除手续费）
            const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
            expect(sellerBalanceAfter).to.be.gt(sellerBalanceBefore);
        });

        it("Should end auction correctly with ERC20 winner", async function () {
            // 出价
            const bidAmount = ethers.parseEther("15"); // 15 tokens = $1500
            await auctionToken.connect(bidder1).approve(await nftAuction.getAddress(), bidAmount);
            await nftAuction.connect(bidder1).bidWithERC20(
                auctionId,
                await auctionToken.getAddress(),
                bidAmount
            );

            // 快进时间到拍卖结束
            await time.increase(3601);

            // 记录卖家代币余额
            const sellerBalanceBefore = await auctionToken.balanceOf(seller.address);

            // 结束拍卖
            await nftAuction.endAuction(auctionId);

            // 检查拍卖状态
            const auction = await nftAuction.getAuctionInfo(auctionId);
            expect(auction.status).to.equal(1); // Ended

            // 检查NFT转移
            expect(await auctionNFT.ownerOf(tokenId)).to.equal(bidder1.address);

            // 检查卖家收到代币（扣除手续费）
            const sellerBalanceAfter = await auctionToken.balanceOf(seller.address);
            expect(sellerBalanceAfter).to.be.gt(sellerBalanceBefore);
        });

        it("Should cancel auction when no bids", async function () {
            // 取消拍卖
            await nftAuction.connect(seller).cancelAuction(auctionId);

            // 检查拍卖状态
            const auction = await nftAuction.getAuctionInfo(auctionId);
            expect(auction.status).to.equal(2); // Cancelled

            // 检查NFT退回给卖家
            expect(await auctionNFT.ownerOf(tokenId)).to.equal(seller.address);
        });

        it("Should process refunds correctly", async function () {
            // 两次出价
            const bid1 = ethers.parseEther("0.75"); // $1500
            await nftAuction.connect(bidder1).bidWithETH(auctionId, { value: bid1 });

            const bid2 = ethers.parseEther("1"); // $2000
            await nftAuction.connect(bidder2).bidWithETH(auctionId, { value: bid2 });

            // 结束拍卖
            await time.increase(3601);
            await nftAuction.endAuction(auctionId);

            // 记录bidder1余额
            const balanceBefore = await ethers.provider.getBalance(bidder1.address);

            // 处理退款
            const tx = await nftAuction.connect(bidder1).processRefund(auctionId);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            // 检查余额增加（扣除gas费）
            const balanceAfter = await ethers.provider.getBalance(bidder1.address);
            expect(balanceAfter).to.equal(balanceBefore + bid1 - gasUsed);
        });
    });

    describe("Price Oracle Integration", function () {
        it("Should get correct ETH price", async function () {
            const price = await nftAuction.getETHPriceInUSD();
            expect(price).to.equal(ethers.parseEther("2000")); // $2000 with 18 decimals
        });

        it("Should get correct token price", async function () {
            const price = await nftAuction.getTokenPriceInUSD(await auctionToken.getAddress());
            expect(price).to.equal(ethers.parseEther("100")); // $100 with 18 decimals
        });

        it("Should calculate dynamic fees correctly", async function () {
            // 测试低于阈值的费用
            const lowValue = ethers.parseEther("5000"); // $5000
            const lowFee = await nftAuction.calculateFee(lowValue);
            const expectedLowFee = (lowValue * 250n) / 10000n; // 2.5%
            expect(lowFee).to.equal(expectedLowFee);

            // 测试高于阈值的费用
            const highValue = ethers.parseEther("15000"); // $15000
            const highFee = await nftAuction.calculateFee(highValue);
            const baseFee = (ethers.parseEther("10000") * 250n) / 10000n; // 2.5% of $10000
            const excessFee = (ethers.parseEther("5000") * 1000n) / 10000n; // 10% of $5000
            const expectedHighFee = baseFee + excessFee;
            expect(highFee).to.equal(expectedHighFee);
        });
    });

    describe("Access Control", function () {
        it("Should only allow owner to mint NFTs", async function () {
            await expect(
                auctionNFT.connect(bidder1).mintNFT(bidder1.address, "https://example.com/test")
            ).to.be.revertedWithCustomError(auctionNFT, "OwnableUnauthorizedAccount");
        });

        it("Should only allow owner to mint tokens", async function () {
            await expect(
                auctionToken.connect(bidder1).mint(bidder1.address, ethers.parseEther("100"))
            ).to.be.revertedWithCustomError(auctionToken, "OwnableUnauthorizedAccount");
        });

        it("Should only allow seller to cancel auction", async function () {
            // 创建拍卖
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            const tx = await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                ethers.parseEther("1000"),
                3600
            );
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return nftAuction.interface.parseLog(log).name === "AuctionCreated";
                } catch {
                    return false;
                }
            });
            const auctionId = nftAuction.interface.parseLog(event).args.auctionId;

            await expect(
                nftAuction.connect(bidder1).cancelAuction(auctionId)
            ).to.be.revertedWith("NFTAuction: only seller can cancel");
        });
    });

    describe("Edge Cases", function () {
        it("Should reject bids below start price", async function () {
            // 创建拍卖
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            const tx = await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                ethers.parseEther("3000"), // $3000 start price
                3600
            );
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return nftAuction.interface.parseLog(log).name === "AuctionCreated";
                } catch {
                    return false;
                }
            });
            const auctionId = nftAuction.interface.parseLog(event).args.auctionId;

            // 尝试低价出价
            const lowBid = ethers.parseEther("1"); // 1 ETH = $2000, 低于起始价格
            await expect(
                nftAuction.connect(bidder1).bidWithETH(auctionId, { value: lowBid })
            ).to.be.revertedWith("NFTAuction: bid below start price");
        });

        it("Should reject bids after auction ends", async function () {
            // 创建拍卖
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            const tx = await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                ethers.parseEther("1000"),
                3600
            );
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return nftAuction.interface.parseLog(log).name === "AuctionCreated";
                } catch {
                    return false;
                }
            });
            const auctionId = nftAuction.interface.parseLog(event).args.auctionId;

            // 快进时间
            await time.increase(3601);

            // 尝试出价
            await expect(
                nftAuction.connect(bidder1).bidWithETH(auctionId, { value: ethers.parseEther("1") })
            ).to.be.revertedWith("NFTAuction: auction ended");
        });

        it("Should handle auction with no bids", async function () {
            // 创建拍卖
            await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
            const tx = await nftAuction.connect(seller).createAuction(
                await auctionNFT.getAddress(),
                1,
                ethers.parseEther("1000"),
                3600
            );
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return nftAuction.interface.parseLog(log).name === "AuctionCreated";
                } catch {
                    return false;
                }
            });
            const auctionId = nftAuction.interface.parseLog(event).args.auctionId;

            // 快进时间
            await time.increase(3601);

            // 结束拍卖
            await nftAuction.endAuction(auctionId);

            // 检查NFT退回给卖家
            expect(await auctionNFT.ownerOf(1)).to.equal(seller.address);

            const auction = await nftAuction.getAuctionInfo(auctionId);
            expect(auction.status).to.equal(1); // Ended
        });
    });
});
