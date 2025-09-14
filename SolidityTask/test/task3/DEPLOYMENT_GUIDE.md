# 🚀 NFT拍卖系统部署验证指南

本指南将带您完成从本地开发到测试网部署的完整流程，包括合约部署、验证、前端配置和功能测试。

## 📋 部署前检查清单

### 1. 环境准备
- [ ] Node.js >= 16.0.0
- [ ] NPM 或 Yarn
- [ ] Git
- [ ] MetaMask 或其他以太坊钱包

### 2. 网络准备
- [ ] 获取测试网ETH (Sepolia/Goerli)
- [ ] 配置RPC节点 (Infura/Alchemy)
- [ ] 获取Etherscan API密钥

### 3. 项目准备
- [ ] 克隆项目代码
- [ ] 安装依赖包
- [ ] 配置环境变量

## 🔧 环境配置

### 1. 克隆项目

```bash
git clone <your-repository-url>
cd SolidityTask
npm install
```

### 2. 环境变量配置

创建 `.env` 文件:

```bash
# 复制模板
cp env.template .env
```

配置 `.env` 文件:

```bash
# 私钥配置 (不要提交到git!)
PRIVATE_KEY=your_64_character_private_key_without_0x_prefix
MAINNET_PRIVATE_KEY=your_mainnet_private_key_for_mainnet_deployment

# RPC节点配置
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
GOERLI_RPC_URL=https://goerli.infura.io/v3/YOUR_INFURA_PROJECT_ID
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID

# 区块链浏览器API密钥
ETHERSCAN_API_KEY=your_etherscan_api_key_for_contract_verification
POLYGONSCAN_API_KEY=your_polygonscan_api_key
ARBISCAN_API_KEY=your_arbiscan_api_key

# 可选配置
COINMARKETCAP_API_KEY=your_cmc_api_key_for_gas_reporting
REPORT_GAS=true
```

### 3. 获取测试网ETH

#### Sepolia测试网
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- [Chainlink Faucet](https://faucets.chain.link/)

#### Goerli测试网  
- [Goerli Faucet](https://goerlifaucet.com/)
- [Paradigm Faucet](https://faucet.paradigm.xyz/)

## 🏗️ 本地部署测试

### 1. 编译合约

```bash
npm run compile
```

### 2. 运行本地测试

```bash
# 运行基础测试
npm run test

# 运行增强测试
npm run test:enhanced

# 运行完整测试套件 (包括边界测试)
npm test test/task3/comprehensive-test.js
npm test test/task3/stress-test.js
npm test test/task3/security-test.js
```

### 3. 启动本地节点

```bash
# 新终端运行
npm run node
```

### 4. 本地部署

```bash
# 新终端执行
npm run deploy:localhost
```

验证部署成功：

```bash
# 运行演示脚本
npm run demo:localhost
```

## 🌐 测试网部署

### 1. Sepolia测试网部署

```bash
# 确保有足够的Sepolia ETH
npm run deploy:sepolia
```

部署输出示例：

```
🚀 开始增强版NFT拍卖系统部署...
============================================================
📋 部署信息:
  网络: sepolia (Chain ID: 11155111)
  部署账户: 0x1234567890123456789012345678901234567890
  账户余额: 1.5 ETH
  Gas价格: 20 Gwei
============================================================

📊 第1步: 配置价格预言机...
  使用Chainlink ETH/USD预言机: 0x694AA1769357215DE4FAC081bf1f309aDC325306
  ✅ ETH/USD预言机: 0x694AA1769357215DE4FAC081bf1f309aDC325306

🏗️  第2步: 部署合约实现...
  部署NFT拍卖合约实现...
  ✅ 拍卖合约实现: 0xAbCdEf...
  部署NFT合约实现...  
  ✅ NFT合约实现: 0x123456...
  部署代币合约实现...
  ✅ 代币合约实现: 0x789ABC...

🏭 第3步: 部署拍卖工厂合约...
  ✅ 拍卖工厂合约: 0xFactory123...

⚙️  第4步: 系统配置...
  ✅ 全局配置更新完成

🎨 第5步: 创建示例合约...
  ✅ 示例NFT合约: 0xNFT123...
  ✅ 示例代币合约: 0xToken123...
  ✅ 示例拍卖合约: 0xAuction123...

✅ 第6步: 部署验证...
  验证结果:
    工厂所有者: 0x1234567890123456789012345678901234567890
    ETH价格预言机: 0x694AA1769357215DE4FAC081bf1f309aDC325306
    创建费用: 0.001 ETH
    支持代币数: 1

📄 第7步: 生成配置文件...
  ✅ 详细部署结果: deployments/sepolia_2024-01-01T12-00-00-000Z.json
  ✅ 前端配置: deployments/frontend-sepolia.json
  ✅ 环境变量: deployments/sepolia.env

🎉 部署成功完成!
```

### 2. 验证合约源码

```bash
npm run verify:sepolia
```

验证输出：

```
🔍 开始在 sepolia 网络验证合约...
📄 读取部署文件: sepolia_2024-01-01T12-00-00-000Z.json

📊 验证价格预言机...
ℹ️  ETH价格预言机Mock 已经验证过了
ℹ️  USDC价格预言机Mock 已经验证过了

🏗️  验证合约实现...
✅ NFTAuction实现 验证成功
✅ AuctionNFT实现 验证成功
✅ AuctionToken实现 验证成功

🏭 验证工厂合约...
✅ AuctionFactory实现 验证成功

📊 验证结果总结:
==================================================
  NFTAuction实现: ✅ 成功
  AuctionNFT实现: ✅ 成功
  AuctionToken实现: ✅ 成功
  AuctionFactory实现: ✅ 成功
==================================================
总计: 4 个合约
成功: 4 个
失败: 0 个

✅ 合约验证完成
```

### 3. 检查部署结果

部署成功后检查生成的文件：

```bash
ls -la deployments/
```

应该看到：
```
sepolia_2024-01-01T12-00-00-000Z.json  # 详细部署记录
frontend-sepolia.json                   # 前端配置文件  
sepolia.env                            # 环境变量文件
verification_sepolia_1704110400000.json # 验证结果
```

## 🔍 部署验证测试

### 1. 基本功能验证

创建验证脚本 `scripts/verify-deployment.js`:

```javascript
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🔍 开始部署验证...");
    
    // 读取部署配置
    const config = JSON.parse(fs.readFileSync("deployments/frontend-sepolia.json", "utf8"));
    
    // 连接合约
    const auctionFactory = await ethers.getContractAt(
        "AuctionFactory", 
        config.contracts.AuctionFactory.address
    );
    
    console.log("📋 基本信息验证:");
    
    // 验证所有者
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
    
    console.log("\n🎨 NFT功能验证:");
    
    if (config.contracts.AuctionNFT) {
        const nft = await ethers.getContractAt(
            "AuctionNFT",
            config.contracts.AuctionNFT.address
        );
        
        const nftName = await nft.name();
        const nftSymbol = await nft.symbol();
        console.log(`  NFT名称: ${nftName} (${nftSymbol})`);
        
        // 尝试铸造测试NFT
        const [deployer] = await ethers.getSigners();
        try {
            const mintTx = await nft.mintNFT(
                deployer.address, 
                "https://test-verification.json"
            );
            await mintTx.wait();
            console.log(`  ✅ 测试NFT铸造成功`);
            
            const balance = await nft.balanceOf(deployer.address);
            console.log(`  NFT余额: ${balance}`);
        } catch (error) {
            console.log(`  ⚠️ NFT铸造测试跳过: ${error.message}`);
        }
    }
    
    console.log("\n💰 代币功能验证:");
    
    if (config.contracts.AuctionToken) {
        const token = await ethers.getContractAt(
            "AuctionToken", 
            config.contracts.AuctionToken.address
        );
        
        const tokenName = await token.name();
        const tokenSymbol = await token.symbol();
        const decimals = await token.decimals();
        
        console.log(`  代币名称: ${tokenName} (${tokenSymbol})`);
        console.log(`  精度: ${decimals}`);
        
        const [deployer] = await ethers.getSigners();
        const balance = await token.balanceOf(deployer.address);
        console.log(`  部署者余额: ${ethers.formatEther(balance)} ${tokenSymbol}`);
    }
    
    console.log("\n🏛️ 拍卖功能验证:");
    
    if (config.contracts.NFTAuction) {
        const auction = await ethers.getContractAt(
            "NFTAuction",
            config.contracts.NFTAuction.address
        );
        
        try {
            // 获取ETH价格
            const ethPrice = await auction.getETHPriceInUSD();
            console.log(`  当前ETH价格: $${ethers.formatEther(ethPrice)}`);
            
            // 计算示例手续费
            const feeFor1000 = await auction.calculateFee(ethers.parseEther("1000"));
            const feeFor15000 = await auction.calculateFee(ethers.parseEther("15000"));
            
            console.log(`  $1000 拍卖手续费: $${ethers.formatEther(feeFor1000)}`);
            console.log(`  $15000 拍卖手续费: $${ethers.formatEther(feeFor15000)}`);
            
        } catch (error) {
            console.log(`  ⚠️ 拍卖功能测试出错: ${error.message}`);
        }
    }
    
    console.log("\n✅ 部署验证完成!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 验证失败:", error);
        process.exit(1);
    });
```

运行验证：

```bash
npx hardhat run scripts/verify-deployment.js --network sepolia
```

### 2. 完整流程测试

创建端到端测试脚本 `scripts/e2e-test.js`:

```javascript
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🧪 开始端到端测试...");
    
    const config = JSON.parse(fs.readFileSync("deployments/frontend-sepolia.json", "utf8"));
    const [deployer, user1, user2] = await ethers.getSigners();
    
    // 连接合约
    const auctionFactory = await ethers.getContractAt("AuctionFactory", config.contracts.AuctionFactory.address);
    const nft = await ethers.getContractAt("AuctionNFT", config.contracts.AuctionNFT.address);
    const token = await ethers.getContractAt("AuctionToken", config.contracts.AuctionToken.address);
    const auction = await ethers.getContractAt("NFTAuction", config.contracts.NFTAuction.address);
    
    console.log("1️⃣ 铸造测试NFT...");
    const mintTx = await nft.connect(user1).mintNFT(user1.address, "https://test-e2e.json");
    await mintTx.wait();
    console.log("   ✅ NFT铸造成功");
    
    console.log("2️⃣ 创建拍卖...");
    await nft.connect(user1).approve(auction.target, 1);
    const createTx = await auction.connect(user1).createAuction(
        nft.target,
        1,
        ethers.parseEther("100"), // $100 起始价格
        3600 // 1小时
    );
    await createTx.wait();
    console.log("   ✅ 拍卖创建成功");
    
    console.log("3️⃣ ETH出价...");
    const bidTx1 = await auction.connect(user2).bidWithETH(1, {
        value: ethers.parseEther("0.1") // 假设ETH价格$2000，出价$200
    });
    await bidTx1.wait();
    console.log("   ✅ ETH出价成功");
    
    console.log("4️⃣ 检查拍卖状态...");
    const auctionInfo = await auction.auctions(1);
    console.log(`   最高出价者: ${auctionInfo.highestBidder}`);
    console.log(`   最高出价金额: $${ethers.formatEther(auctionInfo.highestBidAmount)}`);
    
    console.log("5️⃣ ERC20代币出价...");
    // 给user2铸造代币
    await token.mint(user2.address, ethers.parseEther("1000"));
    await token.connect(user2).approve(auction.target, ethers.parseEther("300"));
    
    const bidTx2 = await auction.connect(user2).bidWithERC20(1, token.target, ethers.parseEther("300"));
    await bidTx2.wait();
    console.log("   ✅ ERC20出价成功");
    
    console.log("6️⃣ 检查最终状态...");
    const finalAuction = await auction.auctions(1);
    console.log(`   最高出价者: ${finalAuction.highestBidder}`);
    console.log(`   最高出价金额: $${ethers.formatEther(finalAuction.highestBidAmount)}`);
    
    // 检查退款
    const refund = await auction.bidderRefunds(1, user2.address);
    if (refund > 0) {
        console.log(`   user2可提取退款: ${ethers.formatEther(refund)} ETH`);
    }
    
    console.log("\n🎉 端到端测试完成!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ E2E测试失败:", error);
        process.exit(1);
    });
```

运行E2E测试：

```bash
npx hardhat run scripts/e2e-test.js --network sepolia
```

## 🖥️ 前端部署配置

### 1. 前端环境配置

进入前端目录：

```bash
cd frontend
```

创建 `.env.local` 文件：

```bash
# 从部署结果中获取合约地址
REACT_APP_SEPOLIA_AUCTION_FACTORY=0xYourFactoryAddress
REACT_APP_SEPOLIA_SAMPLE_NFT=0xYourNFTAddress  
REACT_APP_SEPOLIA_SAMPLE_TOKEN=0xYourTokenAddress
REACT_APP_SEPOLIA_SAMPLE_AUCTION=0xYourAuctionAddress

# 网络配置
REACT_APP_DEFAULT_NETWORK=sepolia
REACT_APP_ENABLE_TESTNET=true

# API配置
REACT_APP_INFURA_PROJECT_ID=your_infura_project_id
```

### 2. 复制合约ABI

```bash
# 复制ABI文件到前端
mkdir -p src/contracts
cp ../artifacts/src/task3/AuctionFactory.sol/AuctionFactory.json src/contracts/
cp ../artifacts/src/task3/NFTAuction.sol/NFTAuction.json src/contracts/
cp ../artifacts/src/task3/AuctionNFT.sol/AuctionNFT.json src/contracts/
cp ../artifacts/src/task3/AuctionToken.sol/AuctionToken.json src/contracts/
```

### 3. 启动前端

```bash
npm install
npm start
```

### 4. 前端功能验证

在浏览器中访问 `http://localhost:3000`，验证：

- [ ] 钱包连接功能
- [ ] 网络切换到Sepolia
- [ ] 合约地址正确显示
- [ ] 拍卖列表加载
- [ ] 创建拍卖功能
- [ ] 出价功能
- [ ] 用户资料页面

## 📊 性能监控

### 1. Gas使用报告

运行带Gas报告的测试：

```bash
REPORT_GAS=true npm test
```

### 2. 合约大小检查

```bash
npm run size
```

### 3. 监控部署成本

检查部署交易的Gas消耗：

```javascript
// 在部署脚本中添加成本跟踪
const deploymentCost = receipt.gasUsed * receipt.gasPrice;
console.log(`部署成本: ${ethers.formatEther(deploymentCost)} ETH`);
```

## 🚨 故障排除

### 常见问题

1. **Gas费不足**
   ```
   Error: insufficient funds for gas * price + value
   ```
   解决：获取更多测试网ETH

2. **私钥格式错误**
   ```
   Error: invalid private key
   ```
   解决：确保私钥是64位十六进制，不包含0x

3. **网络连接问题**
   ```
   Error: could not detect network
   ```
   解决：检查RPC URL配置

4. **合约验证失败**
   ```
   Error: Already Verified
   ```
   解决：合约已验证，无需重复验证

5. **前端连接问题**
   ```
   Error: Contract not deployed on network
   ```
   解决：检查合约地址配置是否正确

### 调试技巧

1. **启用详细日志**
   ```bash
   DEBUG=* npm run deploy:sepolia
   ```

2. **使用Hardhat控制台**
   ```bash
   npx hardhat console --network sepolia
   ```

3. **检查交易状态**
   ```javascript
   const receipt = await provider.getTransactionReceipt("0x...");
   console.log(receipt);
   ```

## 📝 部署清单

完成以下检查表以确保部署成功：

### 合约部署
- [ ] 所有合约成功部署到测试网
- [ ] 合约源码验证通过
- [ ] 工厂合约初始化正确
- [ ] 示例合约创建成功
- [ ] 价格预言机配置正确

### 功能测试  
- [ ] NFT铸造功能正常
- [ ] 拍卖创建功能正常
- [ ] ETH出价功能正常
- [ ] ERC20出价功能正常
- [ ] 价格转换准确
- [ ] 手续费计算正确
- [ ] 退款机制工作正常

### 前端集成
- [ ] 前端成功连接合约
- [ ] 用户界面显示正常
- [ ] 钱包连接功能正常
- [ ] 交易确认流程顺畅
- [ ] 错误处理适当

### 安全检查
- [ ] 权限控制正确
- [ ] 重入攻击防护有效
- [ ] 输入验证完整
- [ ] 资金安全机制正常

## 🎉 部署成功

恭喜！您已成功完成NFT拍卖系统的完整部署。

### 下一步
1. **监控**: 设置合约事件监控
2. **优化**: 根据使用情况优化Gas消耗
3. **扩展**: 添加更多功能特性
4. **安全**: 进行专业安全审计

### 分享您的成果
- 在Etherscan上查看您的合约
- 截图分享您的前端界面
- 记录部署过程中的经验
- 与社区分享您的学习心得

---

**⚠️ 重要提醒**: 
- 这是测试网部署，请勿使用真实资金
- 主网部署前请进行充分测试和安全审计
- 保管好您的私钥和助记词