# MetaNode 质押系统

一个功能完善的区块链质押系统，支持多种代币质押并获得 MetaNode 代币奖励。系统提供多个独立的质押池，每个池可以独立配置质押代币、奖励计算和锁定期等参数。

## 🌟 核心特性

- **多池支持**: 为不同代币创建多个独立的质押池
- **原生币质押**: 支持 ETH 等原生币质押
- **ERC20代币质押**: 支持任何 ERC20 代币质押
- **灵活的奖励系统**: 基于质押数量和时间计算 MetaNode 代币奖励
- **锁定期管理**: 每个池可配置独立的解质押锁定期
- **可升级架构**: 使用 OpenZeppelin 的代理升级模式
- **暂停控制**: 独立控制不同操作的暂停状态
- **权限控制**: 基于角色的访问控制管理
- **紧急功能**: 紧急提现和代币恢复功能

## 📋 系统要求

- Node.js v16+ 
- Hardhat
- OpenZeppelin Contracts v5.0+
- Ethers.js v6+

## 🚀 快速开始

### 1. 安装依赖

```bash
cd stake
npm install
```

### 2. 环境配置

```bash
cp .env.example .env
# 编辑 .env 文件配置你的参数
```

必需的环境变量：
- `SEPOLIA_RPC_URL`: Sepolia 测试网 RPC URL
- `PRIVATE_KEY`: 你的钱包私钥（不需要 0x 前缀）
- `ETHERSCAN_API_KEY`: 用于合约验证的 API Key

### 3. 编译合约

```bash
npm run compile
```

### 4. 运行测试

```bash
# 运行所有测试
npm run test

# 运行测试并生成 gas 报告
npm run test:gas

# 生成测试覆盖率报告
npm run coverage
```

### 5. 部署到 Sepolia 测试网

```bash
npm run deploy:sepolia
```

部署过程将会：
- 部署 MetaNodeToken（奖励代币）
- 部署 TestToken（用于测试 ERC20 质押）
- 部署可升级的 StakePool 代理合约
- 设置初始代币分配
- 创建两个初始池（ETH 池和 TestToken 池）
- 保存部署信息到 `deployments/` 文件夹

### 6. 与已部署合约交互

```bash
# 首先在 .env 中设置合约地址
npm run interact:sepolia
```

## 📊 合约架构

### 核心合约

1. **StakePool.sol**: 主质押合约，包含所有核心功能
2. **MetaNodeToken.sol**: ERC20 奖励代币合约
3. **TestToken.sol**: 用于测试的示例 ERC20 代币
4. **StakePoolV2.sol**: 带有奖励倍数功能的升级版本

### 数据结构

#### Pool（质押池）
```solidity
struct Pool {
    address stTokenAddress;      // 质押代币地址（address(0) 表示 ETH）
    uint256 poolWeight;          // 池权重，用于奖励分配
    uint256 lastRewardBlock;     // 上次奖励计算区块号
    uint256 accMetaNodePerST;    // 每个质押代币累积的 MetaNode 奖励
    uint256 stTokenAmount;       // 池中总质押数量
    uint256 minDepositAmount;    // 最小质押数量
    uint256 unstakeLockedBlocks; // 解质押锁定区块数
    bool isActive;               // 池激活状态
}
```

#### User（用户信息）
```solidity
struct User {
    uint256 stAmount;           // 用户质押数量
    uint256 finishedMetaNode;   // 已分配的奖励
    uint256 pendingMetaNode;    // 待领取的奖励
    UnstakeRequest[] requests;  // 解质押请求列表（带锁定期）
}
```

## 🔧 核心功能

### 用户功能

#### 质押
```solidity
// 质押 ETH（池 0）
function stake(uint256 _pid, uint256 _amount) payable

// 质押 ERC20 代币（需要先授权）
testToken.approve(stakePoolAddress, amount)
stakePool.stake(_pid, _amount)
```

#### 解质押
```solidity
function unstake(uint256 _pid, uint256 _amount)  // 发起解质押请求
function withdraw(uint256 _pid)  // 锁定期后提取
```

#### 奖励
```solidity
function claim(uint256 _pid)  // 领取奖励
function pendingMetaNode(uint256 _pid, address _user) view returns (uint256)  // 查询待领取奖励
```

#### 紧急提现
```solidity
function emergencyWithdraw(uint256 _pid)  // 放弃奖励，立即提取质押代币
```

### 管理员功能

#### 池管理
```solidity
function addPool(address _stTokenAddress, uint256 _poolWeight, uint256 _minDepositAmount, uint256 _unstakeLockedBlocks)  // 添加新池
function updatePool(uint256 _pid, uint256 _poolWeight, uint256 _minDepositAmount, uint256 _unstakeLockedBlocks)  // 更新池参数
function setPoolActive(uint256 _pid, bool _isActive)  // 设置池激活状态
```

#### 系统控制
```solidity
function setMetaNodePerBlock(uint256 _metaNodePerBlock)  // 设置每区块奖励
function pause() / unpause()  // 全局暂停/恢复
function setStakePaused(bool _paused)  // 暂停/恢复质押
function setUnstakePaused(bool _paused)  // 暂停/恢复解质押
function setClaimPaused(bool _paused)  // 暂停/恢复领取奖励
```

## 🧪 Testing

The test suite includes:

- **StakePool.test.js**: Comprehensive functionality tests
- **Security.test.js**: Security and edge case tests

Test coverage includes:
- Pool management
- Staking/unstaking for both ETH and ERC20
- Reward calculations and distribution
- Lock period mechanics
- Pause functionality
- Access control
- Edge cases and security scenarios

## 🔄 Upgrades

The system uses OpenZeppelin's upgradeable proxy pattern:

```bash
# Set STAKE_POOL_PROXY_ADDRESS in .env
npm run upgrade:sepolia
```

## 📋 Default Pool Configuration

After deployment, two pools are automatically created:

**Pool 0 (ETH Staking)**
- Token: Native ETH
- Weight: 100
- Min Deposit: 0.01 ETH
- Lock Period: ~24 hours (6500 blocks)

**Pool 1 (TestToken Staking)**
- Token: TestToken (TST)
- Weight: 200  
- Min Deposit: 100 TST
- Lock Period: ~48 hours (13000 blocks)

## 🛡️ Security Features

- Reentrancy protection
- Integer overflow/underflow protection (Solidity 0.8+)
- Role-based access control
- Emergency pause mechanisms
- Comprehensive input validation
- Safe math operations using OpenZeppelin

## 🔍 Contract Verification

After deployment, verify contracts on Etherscan:

```bash
npx hardhat verify --network sepolia CONTRACT_ADDRESS [CONSTRUCTOR_ARGS]
```

## 📁 Project Structure

```
stake/
├── contracts/
│   ├── StakePool.sol          # Main staking contract
│   ├── StakePoolV2.sol        # Upgraded version
│   ├── MetaNodeToken.sol      # Reward token
│   └── TestToken.sol          # Test ERC20 token
├── test/
│   ├── StakePool.test.js      # Main tests
│   └── Security.test.js       # Security tests
├── scripts/
│   ├── deploy.js              # Deployment script
│   ├── upgrade.js             # Upgrade script
│   └── interact.js            # Interaction script
├── deployments/               # Deployment artifacts
├── hardhat.config.js          # Hardhat configuration
├── package.json
└── README.md
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Write tests for new functionality
4. Run the test suite
5. Submit a pull request

## ⚠️ Important Notes

1. **Testing First**: Always test on Sepolia before mainnet deployment
2. **Private Keys**: Never commit private keys or sensitive data
3. **Gas Estimation**: Test gas costs with large datasets
4. **Upgrade Safety**: Test upgrades thoroughly on testnet
5. **Admin Keys**: Use multi-sig wallets for admin functions in production

## 📄 License

MIT License - see LICENSE file for details

---

Built with ❤️ by MetaNode Academy