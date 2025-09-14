# ERC20 代币合约部署指南

## 📋 项目概述

这个项目实现了一个完整的 ERC20 代币合约 `MyToken`，包含以下功能：

### ✅ 已实现功能
- **标准 ERC20 功能**：`balanceOf`、`transfer`、`approve`、`transferFrom`
- **事件记录**：`Transfer` 和 `Approval` 事件
- **增发功能**：`mint` 函数（仅合约所有者）
- **销毁功能**：`burn` 函数
- **所有权管理**：`transferOwnership` 函数
- **安全检查**：零地址保护、余额检查、权限控制

### 📁 文件结构
```
src/task2/
├── MyToken.sol          # ERC20 代币合约
└── README.md           # 合约详细说明

test/
└── MyToken.t.sol       # 合约测试文件

scripts/
└── deploy.js           # 部署脚本

hardhat.config.js       # Hardhat 配置
env.template           # 环境变量模板
```

## 🚀 快速开始

### 1. 环境准备

#### 安装依赖
```bash
npm install
```

#### 配置环境变量
```bash
# 复制环境变量模板
cp env.template .env

# 编辑 .env 文件，填入真实值
```

需要配置的环境变量：
- `PRIVATE_KEY`: 部署者钱包私钥
- `SEPOLIA_RPC_URL`: Sepolia 测试网 RPC URL
- `ETHERSCAN_API_KEY`: Etherscan API 密钥（可选，用于验证）

### 2. 获取测试网 ETH

访问以下水龙头获取 Sepolia 测试网 ETH：
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Faucet](https://sepoliafaucet.com/)
- [QuickNode Faucet](https://faucet.quicknode.com/ethereum/sepolia)

### 3. 编译合约

```bash
npx hardhat compile
```

### 4. 部署合约

```bash
# 部署到 Sepolia 测试网
npx hardhat run scripts/deploy.js --network sepolia
```

部署成功后，你会看到类似输出：
```
开始部署 MyToken 合约...
部署者账户: 0x...
部署者余额: 0.1 ETH
正在部署合约...
✅ MyToken 合约部署成功!
合约地址: 0x...
代币名称: MyToken
代币符号: MTK
小数位数: 18
总供应量: 1000000.0 MTK
```

### 5. 验证合约（可选）

```bash
npx hardhat verify --network sepolia <合约地址> 1000000
```

## 💰 钱包导入指南

### MetaMask 导入步骤

1. **打开 MetaMask**
2. **切换到 Sepolia 测试网**
   - 点击网络下拉菜单
   - 选择 "Sepolia 测试网络"
3. **导入代币**
   - 点击 "导入代币"
   - 选择 "自定义代币"
   - 输入合约地址：`[部署后获得的地址]`
   - 代币符号：`MTK`
   - 小数精度：`18`
4. **确认导入**

### 其他钱包导入

#### Trust Wallet
1. 进入钱包首页
2. 点击右上角 "+" 
3. 选择 "添加自定义代币"
4. 输入合约地址和代币信息

#### imToken
1. 进入 "资产" 页面
2. 点击 "+" 
3. 搜索或输入合约地址
4. 添加代币

## 🧪 测试合约

### 运行测试
```bash
# 如果有 Foundry
forge test --match-contract MyTokenTest -vv

# 使用 Hardhat（需要创建 Hardhat 测试文件）
npx hardhat test
```

### 手动测试
```bash
# 启动 Hardhat 控制台
npx hardhat console --network sepolia
```

在控制台中：
```javascript
// 连接到已部署的合约
const MyToken = await ethers.getContractFactory("MyToken");
const token = await MyToken.attach("合约地址");

// 查询基本信息
await token.name();        // "MyToken"
await token.symbol();      // "MTK"
await token.decimals();    // 18
await token.totalSupply(); // 1000000000000000000000000

// 查询余额
const balance = await token.balanceOf("地址");
console.log(ethers.formatEther(balance));

// 转账
await token.transfer("接收地址", ethers.parseEther("100"));

// 授权
await token.approve("被授权地址", ethers.parseEther("500"));

// 增发（仅所有者）
await token.mint("接收地址", ethers.parseEther("1000"));
```

## 🔧 合约交互

### 基本操作

#### 查询余额
```solidity
function balanceOf(address account) public view returns (uint256)
```

#### 转账
```solidity
function transfer(address to, uint256 amount) public returns (bool)
```

#### 授权
```solidity
function approve(address spender, uint256 amount) public returns (bool)
```

#### 代扣转账
```solidity
function transferFrom(address from, address to, uint256 amount) public returns (bool)
```

#### 增发（仅所有者）
```solidity
function mint(address to, uint256 amount) public onlyOwner returns (bool)
```

#### 销毁
```solidity
function burn(uint256 amount) public returns (bool)
```

### 事件监听

合约会触发以下事件：
```solidity
event Transfer(address indexed from, address indexed to, uint256 value);
event Approval(address indexed owner, address indexed spender, uint256 value);
event Mint(address indexed to, uint256 value);
```

## 🔒 安全注意事项

### 私钥安全
- ❌ 永远不要在代码中硬编码私钥
- ✅ 使用环境变量存储敏感信息
- ✅ 确保 `.env` 文件在 `.gitignore` 中
- ✅ 测试网和主网私钥分开管理

### 合约安全
- ✅ 零地址检查已实现
- ✅ 权限控制已实现（mint 仅所有者）
- ✅ 溢出保护（Solidity 0.8+）
- ✅ 事件记录完整

### 部署安全
- ✅ 先在测试网充分测试
- ✅ 验证合约源码
- ✅ 检查初始参数

## 🛠️ 故障排除

### 常见错误

#### 编译错误
```bash
# 确保 Solidity 版本正确
npx hardhat compile
```

#### 部署失败
- 检查网络配置
- 确保有足够的 ETH 支付 gas
- 验证私钥格式

#### 交易失败
- `Insufficient balance`: 余额不足
- `Insufficient allowance`: 授权额度不足
- `Only owner can call this function`: 非所有者调用受限函数

### Gas 优化建议
- 合理设置 Gas Price
- 批量操作时考虑 Gas 限制
- 在测试网测试 Gas 消耗

## 📊 合约信息

### 代币详情
- **名称**: MyToken
- **符号**: MTK
- **小数位数**: 18
- **初始供应量**: 1,000,000 MTK
- **合约标准**: ERC20

### 网络信息
- **Sepolia 测试网**
  - Chain ID: 11155111
  - 区块浏览器: https://sepolia.etherscan.io/
  - 水龙头: https://sepoliafaucet.com/

## 📚 相关资源

### 文档
- [ERC20 标准](https://eips.ethereum.org/EIPS/eip-20)
- [Hardhat 文档](https://hardhat.org/docs)
- [MetaMask 使用指南](https://metamask.io/learn/)

### 工具
- [Sepolia Etherscan](https://sepolia.etherscan.io/)
- [Remix IDE](https://remix.ethereum.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

## 📞 支持

如果遇到问题：
1. 检查环境变量配置
2. 确保网络连接正常
3. 查看 Hardhat 文档
4. 检查 Etherscan 上的交易状态

---

🎉 **恭喜！你已经成功实现并部署了一个完整的 ERC20 代币合约！**




