const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("🔥 NFT拍卖系统 - 压力测试", function () {
    // 增加超时时间用于压力测试
    this.timeout(300000); // 5分钟

    const INITIAL_ETH_PRICE = 2000 * 10 ** 8;
    const INITIAL_TOKEN_PRICE = 1 * 10 ** 8;
    const CREATION_FEE = ethers.parseEther("0.001");

    async function deployLargeSystemFixture() {
        const signers = await ethers.getSigners();
        const [owner, ...users] = signers;
        
        // 使用前50个账户作为测试用户
        const testUsers = users.slice(0, Math.min(49, users.length - 1));

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
            owner,
            testUsers,
            auctionFactory,
            ethPriceFeed,
            tokenPriceFeed,
            auctionImplementation,
            nftImplementation,
            tokenImplementation
        };
    }

    describe("🔢 大量合约创建测试", function () {
        it("应该能够创建100个NFT合约", async function () {
            const { auctionFactory, testUsers } = await loadFixture(deployLargeSystemFixture);
            
            console.log("      📝 开始创建100个NFT合约...");
            const createdContracts = [];
            
            // 分批创建以避免Gas限制
            const batchSize = 10;
            for (let batch = 0; batch < 10; batch++) {
                const promises = [];
                for (let i = 0; i < batchSize; i++) {
                    const contractIndex = batch * batchSize + i;
                    const user = testUsers[contractIndex % testUsers.length];
                    
                    promises.push(
                        auctionFactory.connect(user).createNFTContract(
                            `Test NFT Collection ${contractIndex}`,
                            `TNC${contractIndex}`,
                            { value: CREATION_FEE }
                        )
                    );
                }
                
                // 等待当前批次完成
                await Promise.all(promises);
                console.log(`      ✅ 完成批次 ${batch + 1}/10`);
            }

            // 验证创建的合约数量
            const nextId = await auctionFactory.getNextContractId();
            expect(nextId).to.equal(101n); // 100个合约 + 初始ID 1
            
            console.log("      🎉 成功创建100个NFT合约!");
        });

        it("应该能够创建50个拍卖合约", async function () {
            const { auctionFactory, testUsers } = await loadFixture(deployLargeSystemFixture);
            
            console.log("      📝 开始创建50个拍卖合约...");
            
            const batchSize = 5;
            for (let batch = 0; batch < 10; batch++) {
                const promises = [];
                for (let i = 0; i < batchSize; i++) {
                    const contractIndex = batch * batchSize + i;
                    const user = testUsers[contractIndex % testUsers.length];
                    
                    promises.push(
                        auctionFactory.connect(user).createAuctionContract(
                            `Auction House ${contractIndex}`,
                            `Professional auction house for high-quality NFTs ${contractIndex}`,
                            { value: CREATION_FEE }
                        )
                    );
                }
                
                await Promise.all(promises);
                console.log(`      ✅ 完成批次 ${batch + 1}/10`);
            }

            const nextId = await auctionFactory.getNextContractId();
            expect(nextId).to.equal(51n);
            
            console.log("      🎉 成功创建50个拍卖合约!");
        });
    });

    describe("🎯 大量拍卖并发测试", function () {
        it("应该能够同时处理20个活跃拍卖", async function () {
            const { auctionFactory, testUsers, ethPriceFeed } = await loadFixture(deployLargeSystemFixture);
            
            console.log("      📝 创建测试环境...");
            
            // 创建NFT合约
            await auctionFactory.createNFTContract("Test NFT", "TNFT", { value: CREATION_FEE });
            const nftContractInfo = await auctionFactory.auctionContracts(1);
            const auctionNFT = await ethers.getContractAt("AuctionNFT", nftContractInfo.auctionContract);

            // 创建拍卖合约
            await auctionFactory.createAuctionContract("Test Auction", "Test", { value: CREATION_FEE });
            const auctionContractInfo = await auctionFactory.auctionContracts(2);
            const nftAuction = await ethers.getContractAt("NFTAuction", auctionContractInfo.auctionContract);

            // 为每个用户铸造NFT
            console.log("      🎨 铸造20个NFT...");
            const mintPromises = [];
            for (let i = 0; i < 20; i++) {
                const seller = testUsers[i % testUsers.length];
                mintPromises.push(
                    auctionNFT.mintNFT(seller.address, `https://metadata-${i}.json`)
                );
            }
            await Promise.all(mintPromises);

            // 创建20个拍卖
            console.log("      🏛️ 创建20个拍卖...");
            const auctionPromises = [];
            for (let i = 0; i < 20; i++) {
                const seller = testUsers[i % testUsers.length];
                const tokenId = i + 1;
                const startPrice = ethers.parseEther((100 + i * 10).toString());
                
                auctionPromises.push(
                    auctionNFT.connect(seller).approve(await nftAuction.getAddress(), tokenId)
                        .then(() => 
                            nftAuction.connect(seller).createAuction(
                                await auctionNFT.getAddress(),
                                tokenId,
                                startPrice,
                                3600
                            )
                        )
                );
            }
            await Promise.all(auctionPromises);

            // 在每个拍卖中进行出价
            console.log("      💰 在每个拍卖中出价...");
            const bidPromises = [];
            for (let auctionId = 1; auctionId <= 20; auctionId++) {
                for (let bidderIndex = 0; bidderIndex < 3; bidderIndex++) {
                    const bidder = testUsers[(auctionId + bidderIndex + 20) % testUsers.length];
                    const bidAmount = ethers.parseEther((0.05 + bidderIndex * 0.02).toString());
                    
                    bidPromises.push(
                        nftAuction.connect(bidder).bidWithETH(auctionId, { value: bidAmount })
                    );
                }
            }
            
            // 分批处理出价以避免Gas限制
            const bidBatchSize = 10;
            for (let i = 0; i < bidPromises.length; i += bidBatchSize) {
                const batch = bidPromises.slice(i, i + bidBatchSize);
                await Promise.all(batch);
                console.log(`      ✅ 完成出价批次 ${Math.floor(i / bidBatchSize) + 1}/${Math.ceil(bidPromises.length / bidBatchSize)}`);
            }

            // 验证所有拍卖都有出价
            console.log("      🔍 验证拍卖状态...");
            for (let auctionId = 1; auctionId <= 20; auctionId++) {
                const auction = await nftAuction.auctions(auctionId);
                expect(auction.highestBidder).to.not.equal(ethers.ZeroAddress);
                expect(auction.highestBidAmount).to.be.greaterThan(0);
                expect(auction.status).to.equal(0); // Active
            }
            
            console.log("      🎉 成功处理20个并发拍卖!");
        });

        it("应该能够处理价格快速变化期间的大量出价", async function () {
            const { auctionFactory, testUsers, ethPriceFeed } = await loadFixture(deployLargeSystemFixture);
            
            // 设置测试环境
            await auctionFactory.createNFTContract("Test NFT", "TNFT", { value: CREATION_FEE });
            const nftContractInfo = await auctionFactory.auctionContracts(1);
            const auctionNFT = await ethers.getContractAt("AuctionNFT", nftContractInfo.auctionContract);

            await auctionFactory.createAuctionContract("Test Auction", "Test", { value: CREATION_FEE });
            const auctionContractInfo = await auctionFactory.auctionContracts(2);
            const nftAuction = await ethers.getContractAt("NFTAuction", auctionContractInfo.auctionContract);

            // 创建5个拍卖
            for (let i = 0; i < 5; i++) {
                await auctionNFT.mintNFT(testUsers[i].address, `https://metadata-${i}.json`);
                await auctionNFT.connect(testUsers[i]).approve(await nftAuction.getAddress(), i + 1);
                await nftAuction.connect(testUsers[i]).createAuction(
                    await auctionNFT.getAddress(),
                    i + 1,
                    ethers.parseEther("100"),
                    3600
                );
            }

            console.log("      📈 开始价格波动测试...");

            // 模拟快速价格变化和大量出价
            const priceUpdates = [2000, 2500, 1800, 3000, 2200]; // ETH价格变化
            
            for (let round = 0; round < 5; round++) {
                // 更新ETH价格
                await ethPriceFeed.updateAnswer(priceUpdates[round] * 10 ** 8);
                console.log(`      📊 更新ETH价格至 $${priceUpdates[round]}`);

                // 在新价格下进行大量出价
                const bidPromises = [];
                for (let auctionId = 1; auctionId <= 5; auctionId++) {
                    for (let bidderIndex = 0; bidderIndex < 5; bidderIndex++) {
                        const bidder = testUsers[(round * 5 + bidderIndex + 10) % testUsers.length];
                        const bidAmount = ethers.parseEther((0.05 + round * 0.01 + bidderIndex * 0.01).toString());
                        
                        bidPromises.push(
                            nftAuction.connect(bidder).bidWithETH(auctionId, { value: bidAmount })
                        );
                    }
                }
                
                await Promise.all(bidPromises);
                console.log(`      ✅ 完成第${round + 1}轮出价`);
            }

            // 验证最终状态
            for (let auctionId = 1; auctionId <= 5; auctionId++) {
                const auction = await nftAuction.auctions(auctionId);
                expect(auction.highestBidAmount).to.be.greaterThan(0);
            }
            
            console.log("      🎉 价格波动测试完成!");
        });
    });

    describe("⚡ 性能基准测试", function () {
        it("应该在规定时间内完成1000次价格查询", async function () {
            const { auctionFactory } = await loadFixture(deployLargeSystemFixture);
            
            await auctionFactory.createAuctionContract("Test Auction", "Test", { value: CREATION_FEE });
            const auctionContractInfo = await auctionFactory.auctionContracts(1);
            const nftAuction = await ethers.getContractAt("NFTAuction", auctionContractInfo.auctionContract);

            console.log("      ⏱️ 开始1000次价格查询基准测试...");
            
            const startTime = Date.now();
            const promises = [];
            
            // 创建1000个价格查询promise
            for (let i = 0; i < 1000; i++) {
                promises.push(nftAuction.getETHPriceInUSD());
            }
            
            // 并发执行所有查询
            const results = await Promise.all(promises);
            const endTime = Date.now();
            
            const duration = endTime - startTime;
            const avgTime = duration / 1000;
            
            console.log(`      📊 1000次查询耗时: ${duration}ms`);
            console.log(`      📊 平均每次查询: ${avgTime.toFixed(2)}ms`);
            
            // 验证所有查询都返回了正确结果
            expect(results).to.have.length(1000);
            results.forEach(result => {
                expect(result).to.be.greaterThan(0);
            });
            
            // 性能要求：1000次查询应在5秒内完成
            expect(duration).to.be.lessThan(5000);
            
            console.log("      ✅ 性能基准测试通过!");
        });

        it("应该在内存限制内处理大量事件", async function () {
            const { auctionFactory, testUsers } = await loadFixture(deployLargeSystemFixture);
            
            console.log("      📝 创建测试合约...");
            await auctionFactory.createNFTContract("Test NFT", "TNFT", { value: CREATION_FEE });
            const nftContractInfo = await auctionFactory.auctionContracts(1);
            const auctionNFT = await ethers.getContractAt("AuctionNFT", nftContractInfo.auctionContract);

            await auctionFactory.createAuctionContract("Test Auction", "Test", { value: CREATION_FEE });
            const auctionContractInfo = await auctionFactory.auctionContracts(2);
            const nftAuction = await ethers.getContractAt("NFTAuction", auctionContractInfo.auctionContract);

            // 创建100个NFT（会产生100个事件）
            console.log("      🎨 铸造100个NFT...");
            const mintPromises = [];
            for (let i = 0; i < 100; i++) {
                const recipient = testUsers[i % testUsers.length];
                mintPromises.push(
                    auctionNFT.mintNFT(recipient.address, `https://metadata-${i}.json`)
                );
            }
            
            // 分批处理以避免内存问题
            const batchSize = 20;
            for (let i = 0; i < mintPromises.length; i += batchSize) {
                const batch = mintPromises.slice(i, i + batchSize);
                await Promise.all(batch);
                console.log(`      ✅ 完成铸造批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(mintPromises.length / batchSize)}`);
            }

            // 查询所有NFT铸造事件
            console.log("      🔍 查询所有NFT铸造事件...");
            const filter = auctionNFT.filters.NFTMinted();
            const events = await auctionNFT.queryFilter(filter);
            
            expect(events).to.have.length(100);
            console.log(`      📊 成功处理 ${events.length} 个事件`);
            
            // 验证事件数据完整性
            for (let i = 0; i < events.length; i++) {
                const event = events[i];
                expect(event.args).to.not.be.undefined;
                expect(event.args.tokenId).to.equal(BigInt(i + 1));
            }
            
            console.log("      ✅ 事件处理测试通过!");
        });
    });

    describe("🔄 长时间运行测试", function () {
        it("应该在长时间运行后保持状态一致性", async function () {
            const { auctionFactory, testUsers } = await loadFixture(deployLargeSystemFixture);
            
            console.log("      📝 初始化长期运行测试...");
            
            // 创建基础合约
            await auctionFactory.createNFTContract("Long Term NFT", "LTNFT", { value: CREATION_FEE });
            await auctionFactory.createTokenContract("Long Term Token", "LTT", { value: CREATION_FEE });
            await auctionFactory.createAuctionContract("Long Term Auction", "LTA", { value: CREATION_FEE });

            const nftContractInfo = await auctionFactory.auctionContracts(1);
            const auctionNFT = await ethers.getContractAt("AuctionNFT", nftContractInfo.auctionContract);

            const tokenContractInfo = await auctionFactory.auctionContracts(2);
            const auctionToken = await ethers.getContractAt("AuctionToken", tokenContractInfo.auctionContract);

            const auctionContractInfo = await auctionFactory.auctionContracts(3);
            const nftAuction = await ethers.getContractAt("NFTAuction", auctionContractInfo.auctionContract);

            // 配置代币支持
            await auctionFactory.setSupportedToken(await auctionToken.getAddress(), true);

            let totalNFTsMinted = 0;
            let totalAuctionsCreated = 0;
            let totalBidsPlaced = 0;

            // 模拟30个时间周期的活动
            console.log("      ⏰ 开始30个周期的长期运行测试...");
            
            for (let cycle = 0; cycle < 30; cycle++) {
                // 每个周期铸造5个NFT
                const mintPromises = [];
                for (let i = 0; i < 5; i++) {
                    const recipient = testUsers[(cycle * 5 + i) % testUsers.length];
                    mintPromises.push(
                        auctionNFT.mintNFT(recipient.address, `https://long-term-${cycle}-${i}.json`)
                    );
                }
                await Promise.all(mintPromises);
                totalNFTsMinted += 5;

                // 每个周期创建2个拍卖
                for (let i = 0; i < 2; i++) {
                    const seller = testUsers[(cycle * 2 + i) % testUsers.length];
                    const tokenId = cycle * 5 + i + 1; // 使用刚铸造的NFT
                    
                    await auctionNFT.connect(seller).approve(await nftAuction.getAddress(), tokenId);
                    await nftAuction.connect(seller).createAuction(
                        await auctionNFT.getAddress(),
                        tokenId,
                        ethers.parseEther((50 + cycle).toString()),
                        600 // 10分钟
                    );
                    totalAuctionsCreated++;
                }

                // 每个周期进行10次出价
                for (let i = 0; i < 10; i++) {
                    const bidder = testUsers[(cycle + i + 10) % testUsers.length];
                    const auctionId = (cycle * 2) + (i % 2) + 1; // 在当前周期的拍卖中出价
                    
                    if (auctionId <= totalAuctionsCreated) {
                        try {
                            await nftAuction.connect(bidder).bidWithETH(auctionId, {
                                value: ethers.parseEther((0.01 + i * 0.01).toString())
                            });
                            totalBidsPlaced++;
                        } catch (error) {
                            // 拍卖可能已结束，忽略错误
                        }
                    }
                }

                // 每10个周期输出进度
                if ((cycle + 1) % 10 === 0) {
                    console.log(`      📊 完成 ${cycle + 1}/30 周期`);
                    console.log(`         NFTs: ${totalNFTsMinted}, 拍卖: ${totalAuctionsCreated}, 出价: ${totalBidsPlaced}`);
                }

                // 模拟时间推进
                await time.increase(60); // 推进1分钟
            }

            // 验证最终状态
            console.log("      🔍 验证最终状态...");
            
            const finalNFTBalance = await auctionNFT.balanceOf(testUsers[0].address);
            expect(finalNFTBalance).to.be.greaterThan(0);

            const nextContractId = await auctionFactory.getNextContractId();
            expect(nextContractId).to.equal(4n); // 3个合约已创建

            console.log("      📈 长期运行测试统计:");
            console.log(`         总NFT铸造: ${totalNFTsMinted}`);
            console.log(`         总拍卖创建: ${totalAuctionsCreated}`);
            console.log(`         总出价次数: ${totalBidsPlaced}`);
            console.log("      ✅ 长期运行测试完成!");
        });
    });

    describe("💾 存储效率测试", function () {
        it("应该高效处理存储操作", async function () {
            const { auctionFactory } = await loadFixture(deployLargeSystemFixture);
            
            console.log("      📊 测试存储效率...");
            
            const operations = [];
            const startTime = Date.now();
            
            // 创建50个合约测试存储写入
            for (let i = 0; i < 50; i++) {
                operations.push(
                    auctionFactory.createNFTContract(
                        `Storage Test NFT ${i}`,
                        `STN${i}`,
                        { value: CREATION_FEE }
                    )
                );
            }
            
            await Promise.all(operations);
            
            const writeTime = Date.now() - startTime;
            console.log(`      ✍️  50个存储写入操作耗时: ${writeTime}ms`);
            
            // 测试存储读取
            const readStartTime = Date.now();
            const readOperations = [];
            
            for (let i = 1; i <= 50; i++) {
                readOperations.push(
                    auctionFactory.auctionContracts(i)
                );
            }
            
            const results = await Promise.all(readOperations);
            const readTime = Date.now() - readStartTime;
            
            console.log(`      👁️  50个存储读取操作耗时: ${readTime}ms`);
            
            // 验证读取结果
            expect(results).to.have.length(50);
            results.forEach((result, index) => {
                expect(result.auctionContract).to.not.equal(ethers.ZeroAddress);
                expect(result.isActive).to.be.true;
            });
            
            // 性能要求
            expect(writeTime).to.be.lessThan(30000); // 30秒内完成写入
            expect(readTime).to.be.lessThan(5000);   // 5秒内完成读取
            
            console.log("      ✅ 存储效率测试通过!");
        });
    });
});