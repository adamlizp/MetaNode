const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Chainlink价格预言机地址配置
const CHAINLINK_PRICE_FEEDS = {
    mainnet: {
        ETH_USD: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
        USDC_USD: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
        USDT_USD: "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
        DAI_USD: "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9"
    },
    sepolia: {
        ETH_USD: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
        USDC_USD: "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E",
        LINK_USD: "0xc59E3633BAAC79493d908e63626716e204A45EdF"
    },
    goerli: {
        ETH_USD: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
        USDC_USD: "0xAb5c49580294Aff77670F839ea425f5b78ab3Ae7"
    },
    polygon: {
        ETH_USD: "0xF9680D99D6C9589e2a93a78A04A279e509205945",
        MATIC_USD: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0",
        USDC_USD: "0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7"
    },
    arbitrum: {
        ETH_USD: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
        USDC_USD: "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3"
    }
};

// 部署配置
const DEPLOYMENT_CONFIG = {
    // 默认费用配置
    creationFee: ethers.parseEther("0.0001"), // 0.0001 ETH 降低费用
    baseFeeRate: 250, // 2.5%
    maxFeeRate: 1000, // 10%
    feeThreshold: ethers.parseUnits("10000", 18), // $10,000
    
    // Gas配置
    gasMultiplier: 1.2,
    
    // 确认数配置
    confirmations: {
        localhost: 1,
        hardhat: 1,
        sepolia: 2,
        goerli: 2,
        mainnet: 3,
        polygon: 3,
        arbitrum: 3
    }
};

async function deployWithRetry(contractFactory, args = [], options = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`  尝试部署 ${contractFactory.contractName} (第${i + 1}次)...`);
            const contract = await contractFactory.deploy(...args, options);
            await contract.waitForDeployment();
            return contract;
        } catch (error) {
            console.log(`  部署失败: ${error.message}`);
            if (i === retries - 1) throw error;
            
            // 等待一段时间后重试
            console.log(`  等待 ${(i + 1) * 5} 秒后重试...`);
            await new Promise(resolve => setTimeout(resolve, (i + 1) * 5000));
        }
    }
}

async function main() {
    console.log("🚀 开始增强版NFT拍卖系统部署...");
    console.log("=" * 60);

    const [deployer] = await ethers.getSigners();
    const networkName = network.name;
    const chainId = (await ethers.provider.getNetwork()).chainId;
    
    console.log("📋 部署信息:");
    console.log(`  网络: ${networkName} (Chain ID: ${chainId})`);
    console.log(`  部署账户: ${deployer.address}`);
    console.log(`  账户余额: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
    console.log(`  Gas价格: ${ethers.formatUnits(await ethers.provider.getFeeData().then(d => d.gasPrice), "gwei")} Gwei`);
    console.log("=" * 60);

    // 创建部署目录
    const deploymentDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir, { recursive: true });
    }

    // 部署结果存储
    const deploymentResult = {
        network: networkName,
        chainId: chainId.toString(),
        deployer: deployer.address,
        deployerBalance: ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
        timestamp: new Date().toISOString(),
        gasUsed: 0n,
        totalCost: 0n,
        contracts: {},
        transactions: []
    };

    let totalGasUsed = 0n;

    try {
        // 第一步: 部署或配置价格预言机
        console.log("\n📊 第1步: 配置价格预言机...");
        let ethPriceFeedAddress, usdcPriceFeedAddress;

        if (networkName === "localhost" || networkName === "hardhat") {
            console.log("  部署Mock价格预言机用于本地测试...");
            
            const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
            
            // ETH/USD = $2000
            const ethPriceFeed = await deployWithRetry(MockV3Aggregator, [8, 200000000000]);
            ethPriceFeedAddress = await ethPriceFeed.getAddress();
            
            // USDC/USD = $1
            const usdcPriceFeed = await deployWithRetry(MockV3Aggregator, [8, 100000000]);
            usdcPriceFeedAddress = await usdcPriceFeed.getAddress();
            
            console.log(`  ✅ ETH价格预言机 (Mock): ${ethPriceFeedAddress}`);
            console.log(`  ✅ USDC价格预言机 (Mock): ${usdcPriceFeedAddress}`);

            deploymentResult.contracts.ethPriceFeedMock = {
                address: ethPriceFeedAddress,
                type: "MockV3Aggregator",
                purpose: "ETH/USD价格模拟器"
            };
            deploymentResult.contracts.usdcPriceFeedMock = {
                address: usdcPriceFeedAddress,
                type: "MockV3Aggregator", 
                purpose: "USDC/USD价格模拟器"
            };
        } else {
            console.log("  使用真实Chainlink价格预言机...");
            const feeds = CHAINLINK_PRICE_FEEDS[networkName];
            
            if (!feeds) {
                throw new Error(`不支持的网络: ${networkName}`);
            }
            
            ethPriceFeedAddress = feeds.ETH_USD;
            usdcPriceFeedAddress = feeds.USDC_USD;
            
            if (!ethPriceFeedAddress) {
                throw new Error(`未找到${networkName}网络的ETH/USD价格预言机`);
            }
            
            console.log(`  ✅ ETH/USD预言机: ${ethPriceFeedAddress}`);
            if (usdcPriceFeedAddress) {
                console.log(`  ✅ USDC/USD预言机: ${usdcPriceFeedAddress}`);
            }
        }

        // 第二步: 部署合约实现
        console.log("\n🏗️  第2步: 部署合约实现...");
        
        // NFT拍卖合约实现
        console.log("  部署NFT拍卖合约实现...");
        const NFTAuction = await ethers.getContractFactory("NFTAuction");
        const auctionImplementation = await deployWithRetry(NFTAuction);
        const auctionImplAddress = await auctionImplementation.getAddress();
        console.log(`  ✅ 拍卖合约实现: ${auctionImplAddress}`);

        // NFT合约实现
        console.log("  部署NFT合约实现...");
        const AuctionNFT = await ethers.getContractFactory("AuctionNFT");
        const nftImplementation = await deployWithRetry(AuctionNFT);
        const nftImplAddress = await nftImplementation.getAddress();
        console.log(`  ✅ NFT合约实现: ${nftImplAddress}`);

        // 代币合约实现
        console.log("  部署代币合约实现...");
        const AuctionToken = await ethers.getContractFactory("AuctionToken");
        const tokenImplementation = await deployWithRetry(AuctionToken);
        const tokenImplAddress = await tokenImplementation.getAddress();
        console.log(`  ✅ 代币合约实现: ${tokenImplAddress}`);

        deploymentResult.contracts.implementations = {
            auction: { address: auctionImplAddress, type: "NFTAuction" },
            nft: { address: nftImplAddress, type: "AuctionNFT" },
            token: { address: tokenImplAddress, type: "AuctionToken" }
        };

        // 第三步: 部署工厂合约
        console.log("\n🏭 第3步: 部署拍卖工厂合约...");
        const AuctionFactory = await ethers.getContractFactory("AuctionFactory");
        
        const initArgs = [
            deployer.address,
            ethPriceFeedAddress,
            auctionImplAddress,
            nftImplAddress, 
            tokenImplAddress
        ];

        console.log("  初始化参数:");
        console.log(`    所有者: ${deployer.address}`);
        console.log(`    ETH价格预言机: ${ethPriceFeedAddress}`);
        console.log(`    拍卖实现: ${auctionImplAddress}`);
        console.log(`    NFT实现: ${nftImplAddress}`);
        console.log(`    代币实现: ${tokenImplAddress}`);

        const auctionFactory = await upgrades.deployProxy(
            AuctionFactory,
            initArgs,
            {
                initializer: 'initialize',
                kind: 'uups',
                timeout: 1800000 // 30分钟
            }
        );
        
        await auctionFactory.waitForDeployment();
        const factoryAddress = await auctionFactory.getAddress();
        console.log(`  ✅ 拍卖工厂合约: ${factoryAddress}`);

        deploymentResult.contracts.auctionFactory = {
            address: factoryAddress,
            type: "AuctionFactory",
            proxy: true,
            implementation: await upgrades.erc1967.getImplementationAddress(factoryAddress)
        };

        // 第四步: 系统配置
        console.log("\n⚙️  第4步: 系统配置...");
        
        // 配置费用参数
        console.log("  配置费用参数...");
        const configTx1 = await auctionFactory.setGlobalConfig(
            ethPriceFeedAddress,
            DEPLOYMENT_CONFIG.creationFee,
            DEPLOYMENT_CONFIG.baseFeeRate,
            deployer.address  // 费用接收者
        );
        await configTx1.wait(DEPLOYMENT_CONFIG.confirmations[networkName] || 1);
        console.log("  ✅ 全局配置更新完成");

        // 第五步: 创建示例合约
        console.log("\n🎨 第5步: 创建示例合约...");
        
        // 创建示例NFT合约
        console.log("  创建示例NFT合约...");
        const createNFTTx = await auctionFactory.createNFTContract(
            "Demo Auction NFT",
            "DAN",
            { value: DEPLOYMENT_CONFIG.creationFee }
        );
        const nftReceipt = await createNFTTx.wait(DEPLOYMENT_CONFIG.confirmations[networkName] || 1);
        
        let sampleNFTAddress;
        for (const log of nftReceipt.logs) {
            try {
                const parsed = auctionFactory.interface.parseLog(log);
                if (parsed.name === "NFTContractCreated") {
                    sampleNFTAddress = parsed.args.nftContract;
                    break;
                }
            } catch (e) {
                // 忽略解析错误
            }
        }
        console.log(`  ✅ 示例NFT合约: ${sampleNFTAddress}`);

        // 创建示例代币合约
        console.log("  创建示例代币合约...");
        const createTokenTx = await auctionFactory.createTokenContract(
            "Demo Auction Token", 
            "DAT",
            { value: DEPLOYMENT_CONFIG.creationFee }
        );
        const tokenReceipt = await createTokenTx.wait(DEPLOYMENT_CONFIG.confirmations[networkName] || 1);
        
        let sampleTokenAddress;
        for (const log of tokenReceipt.logs) {
            try {
                const parsed = auctionFactory.interface.parseLog(log);
                if (parsed.name === "TokenContractCreated") {
                    sampleTokenAddress = parsed.args.tokenContract;
                    break;
                }
            } catch (e) {
                // 忽略解析错误
            }
        }
        console.log(`  ✅ 示例代币合约: ${sampleTokenAddress}`);

        // 配置示例代币支持
        if (sampleTokenAddress && usdcPriceFeedAddress) {
            console.log("  配置示例代币支持...");
            const supportTokenTx = await auctionFactory.setSupportedToken(sampleTokenAddress, true);
            await supportTokenTx.wait(DEPLOYMENT_CONFIG.confirmations[networkName] || 1);
            
            const setPriceFeedTx = await auctionFactory.setTokenPriceFeed(sampleTokenAddress, usdcPriceFeedAddress);
            await setPriceFeedTx.wait(DEPLOYMENT_CONFIG.confirmations[networkName] || 1);
            console.log("  ✅ 代币支持配置完成");
        }

        // 创建示例拍卖合约
        console.log("  创建示例拍卖合约...");
        const createAuctionTx = await auctionFactory.createAuctionContract(
            "Demo Auction House",
            "高品质NFT拍卖平台 - 支持多币种出价和实时价格转换",
            { value: DEPLOYMENT_CONFIG.creationFee }
        );
        const auctionReceipt = await createAuctionTx.wait(DEPLOYMENT_CONFIG.confirmations[networkName] || 1);
        
        let sampleAuctionAddress;
        for (const log of auctionReceipt.logs) {
            try {
                const parsed = auctionFactory.interface.parseLog(log);
                if (parsed.name === "AuctionContractCreated") {
                    sampleAuctionAddress = parsed.args.auctionContract;
                    break;
                }
            } catch (e) {
                // 忽略解析错误
            }
        }
        console.log(`  ✅ 示例拍卖合约: ${sampleAuctionAddress}`);

        deploymentResult.contracts.examples = {
            nft: { address: sampleNFTAddress, name: "Demo Auction NFT", symbol: "DAN" },
            token: { address: sampleTokenAddress, name: "Demo Auction Token", symbol: "DAT" },
            auction: { address: sampleAuctionAddress, name: "Demo Auction House" }
        };

        // 第六步: 部署验证
        console.log("\n✅ 第6步: 部署验证...");
        
        const factoryOwner = await auctionFactory.owner();
        const ethPriceFeed = await auctionFactory.ethUsdPriceFeed();
        const creationFee = await auctionFactory.creationFee();
        const supportedTokens = await auctionFactory.getSupportedTokens();
        
        console.log("  验证结果:");
        console.log(`    工厂所有者: ${factoryOwner}`);
        console.log(`    ETH价格预言机: ${ethPriceFeed}`);
        console.log(`    创建费用: ${ethers.formatEther(creationFee)} ETH`);
        console.log(`    支持代币数: ${supportedTokens.length}`);
        
        // 验证升级功能
        if (networkName !== "mainnet") {
            console.log("  测试升级功能...");
            try {
                const implementationAddress = await upgrades.erc1967.getImplementationAddress(factoryAddress);
                console.log(`    实现合约地址: ${implementationAddress}`);
                console.log("    ✅ UUPS升级功能正常");
            } catch (error) {
                console.log(`    ⚠️ 升级功能验证失败: ${error.message}`);
            }
        }

        // 第七步: 生成配置文件
        console.log("\n📄 第7步: 生成配置文件...");
        
        // 保存详细部署结果
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const deploymentFile = path.join(deploymentDir, `${networkName}_${timestamp}.json`);
        // 处理BigInt序列化问题
        const deploymentResultForSave = JSON.parse(JSON.stringify(deploymentResult, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentResultForSave, null, 2));
        console.log(`  ✅ 详细部署结果: ${deploymentFile}`);

        // 生成前端配置
        const frontendConfig = {
            name: "NFT Auction System",
            version: "1.0.0",
            network: {
                name: networkName,
                chainId: chainId.toString(),
                rpcUrl: network.config.url || "http://localhost:8545"
            },
            contracts: {
                AuctionFactory: {
                    address: factoryAddress,
                    abi: "./artifacts/src/task3/AuctionFactory.sol/AuctionFactory.json"
                },
                NFTAuction: {
                    address: sampleAuctionAddress,
                    abi: "./artifacts/src/task3/NFTAuction.sol/NFTAuction.json"
                },
                AuctionNFT: {
                    address: sampleNFTAddress,
                    abi: "./artifacts/src/task3/AuctionNFT.sol/AuctionNFT.json"
                },
                AuctionToken: {
                    address: sampleTokenAddress,
                    abi: "./artifacts/src/task3/AuctionToken.sol/AuctionToken.json"
                }
            },
            features: {
                multiCurrency: true,
                dynamicFees: true,
                upgradeable: true,
                crossChain: false // 可在后续版本启用
            }
        };

        const frontendConfigFile = path.join(deploymentDir, `frontend-${networkName}.json`);
        fs.writeFileSync(frontendConfigFile, JSON.stringify(frontendConfig, null, 2));
        console.log(`  ✅ 前端配置: ${frontendConfigFile}`);

        // 生成环境变量模板
        const envTemplate = `# ${networkName.toUpperCase()} 网络部署结果
${networkName.toUpperCase()}_AUCTION_FACTORY=${factoryAddress}
${networkName.toUpperCase()}_SAMPLE_NFT=${sampleNFTAddress}
${networkName.toUpperCase()}_SAMPLE_TOKEN=${sampleTokenAddress}
${networkName.toUpperCase()}_SAMPLE_AUCTION=${sampleAuctionAddress}
${networkName.toUpperCase()}_ETH_PRICE_FEED=${ethPriceFeedAddress}
${usdcPriceFeedAddress ? `${networkName.toUpperCase()}_USDC_PRICE_FEED=${usdcPriceFeedAddress}` : ''}
`;

        const envFile = path.join(deploymentDir, `${networkName}.env`);
        fs.writeFileSync(envFile, envTemplate);
        console.log(`  ✅ 环境变量: ${envFile}`);

        // 第八步: 部署总结
        console.log("\n🎉 部署成功完成!");
        console.log("=" * 60);
        console.log("📋 部署摘要:");
        console.log(`  网络: ${networkName} (${chainId})`);
        console.log(`  部署者: ${deployer.address}`);
        console.log(`  工厂合约: ${factoryAddress}`);
        console.log(`  示例NFT: ${sampleNFTAddress}`);
        console.log(`  示例代币: ${sampleTokenAddress}`);
        console.log(`  示例拍卖: ${sampleAuctionAddress}`);
        console.log("=" * 60);
        console.log("🔗 重要链接:");
        
        if (networkName === "sepolia") {
            console.log(`  工厂合约: https://sepolia.etherscan.io/address/${factoryAddress}`);
            console.log(`  示例NFT: https://sepolia.etherscan.io/address/${sampleNFTAddress}`);
        } else if (networkName === "mainnet") {
            console.log(`  工厂合约: https://etherscan.io/address/${factoryAddress}`);
            console.log(`  示例NFT: https://etherscan.io/address/${sampleNFTAddress}`);
        }
        
        console.log("=" * 60);
        console.log("📝 后续步骤:");
        console.log("  1. 将合约地址添加到前端应用");
        console.log("  2. 在Etherscan上验证合约源码");
        console.log("  3. 配置监控和告警");
        console.log("  4. 进行完整的集成测试");
        console.log("=" * 60);

        return deploymentResult;

    } catch (error) {
        console.error("\n❌ 部署失败:", error.message);
        
        // 保存错误日志
        const errorLog = {
            timestamp: new Date().toISOString(),
            network: networkName,
            chainId: chainId.toString(),
            deployer: deployer.address,
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            deploymentResult
        };

        const errorFile = path.join(deploymentDir, `error_${networkName}_${Date.now()}.json`);
        const errorLogForSave = JSON.parse(JSON.stringify(errorLog, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));
        fs.writeFileSync(errorFile, JSON.stringify(errorLogForSave, null, 2));
        console.log(`错误日志已保存: ${errorFile}`);
        
        throw error;
    }
}

// 导出部署函数供其他脚本使用
module.exports = { main, CHAINLINK_PRICE_FEEDS, DEPLOYMENT_CONFIG };

// 直接运行时执行部署
if (require.main === module) {
    main()
        .then((result) => {
            console.log("\n✅ 部署脚本执行完成");
            process.exit(0);
        })
        .catch((error) => {
            console.error("\n❌ 部署脚本执行失败:", error);
            process.exit(1);
        });
}