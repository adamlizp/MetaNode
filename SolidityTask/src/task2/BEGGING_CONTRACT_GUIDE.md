# BeggingContract 讨饭合约完整指南

## 项目概述

BeggingContract 是一个基于以太坊的智能合约，允许用户向合约捐赠以太币，合约所有者可以提取所有捐赠的资金。合约包含了完整的捐赠记录、排行榜功能和可选的时间限制功能。

## 合约功能特性

### 基本功能 ✅
- ✅ **捐赠功能**: 用户可以向合约发送 ETH
- ✅ **提取功能**: 只有合约所有者可以提取所有资金
- ✅ **查询功能**: 查询任意地址的捐赠金额
- ✅ **余额查询**: 查看合约当前余额
- ✅ **访问控制**: 使用 onlyOwner 修饰符保护敏感功能

### 额外功能 🚀
- 🎯 **捐赠事件**: 每次捐赠都会触发事件记录
- 🏆 **排行榜**: 显示捐赠金额最多的前N名用户
- ⏰ **时间限制**: 可选的捐赠时间窗口控制
- 📊 **统计信息**: 总捐赠金额、捐赠者数量等
- 🔄 **所有权转移**: 支持转移合约所有权

## 快速开始

### 1. 环境准备

确保你已安装：
- Node.js (v16+)
- npm 或 yarn
- MetaMask 浏览器扩展

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env` 文件：
```
PRIVATE_KEY=你的私钥
ALCHEMY_API_KEY=你的Alchemy API密钥
ETHERSCAN_API_KEY=你的Etherscan API密钥
```

### 4. 编译合约

```bash
npx hardhat compile
```

## 部署指南

### 部署到测试网

#### Sepolia 测试网部署
```bash
npx hardhat run scripts/deployBeggingContract.js --network sepolia
```

#### Goerli 测试网部署
```bash
npx hardhat run scripts/deployBeggingContract.js --network goerli
```

部署成功后，你会看到：
```
✅ BeggingContract 部署成功!
合约地址: 0x...
交易哈希: 0x...
合约所有者: 0x...
```

### 验证合约（可选）

```bash
npx hardhat verify --network sepolia <合约地址>
```

## 功能测试指南

### 自动化测试

使用提供的测试脚本：
```bash
npx hardhat run scripts/testBeggingContract.js --network sepolia -- <合约地址>
```

### 手动测试步骤

#### 1. 捐赠测试
- 在 MetaMask 中切换到对应测试网
- 向合约地址发送 ETH
- 或者调用合约的 `donate()` 函数

#### 2. 查询测试
- 调用 `getDonation(address)` 查询特定地址捐赠金额
- 调用 `getContractBalance()` 查看合约余额
- 调用 `getDonorCount()` 查看捐赠者数量

#### 3. 排行榜测试
- 调用 `getTopDonors(3)` 查看前3名捐赠者

#### 4. 提取测试（仅所有者）
- 使用所有者账户调用 `withdraw()` 函数
- 验证资金转移到所有者账户

## 合约接口说明

### 主要函数

#### `donate()` - 捐赠函数
```solidity
function donate() external payable withinTimeLimit
```
- **功能**: 向合约捐赠 ETH
- **权限**: 任何人
- **要求**: 发送的 ETH 数量 > 0

#### `withdraw()` - 提取函数
```solidity
function withdraw() external onlyOwner
```
- **功能**: 提取合约中的所有 ETH
- **权限**: 仅合约所有者
- **要求**: 合约余额 > 0

#### `getDonation(address)` - 查询捐赠
```solidity
function getDonation(address donor) external view returns (uint256)
```
- **功能**: 查询指定地址的总捐赠金额
- **权限**: 任何人
- **返回**: 该地址的总捐赠金额（wei）

#### `getTopDonors(uint256)` - 获取排行榜
```solidity
function getTopDonors(uint256 topN) external view returns (address[], uint256[])
```
- **功能**: 获取捐赠排行榜前N名
- **权限**: 任何人
- **返回**: 地址数组和对应的捐赠金额数组

### 管理员函数

#### `setTimeRestriction()` - 设置时间限制
```solidity
function setTimeRestriction(uint256 startTime, uint256 endTime, bool enabled) external onlyOwner
```
- **功能**: 设置捐赠时间窗口
- **权限**: 仅合约所有者

#### `transferOwnership()` - 转移所有权
```solidity
function transferOwnership(address newOwner) external onlyOwner
```
- **功能**: 转移合约所有权
- **权限**: 仅合约所有者

### 事件

#### `Donation` 事件
```solidity
event Donation(address indexed donor, uint256 amount, uint256 timestamp);
```
- 每次捐赠时触发
- 记录捐赠者地址、金额和时间戳

#### `Withdrawal` 事件
```solidity
event Withdrawal(address indexed owner, uint256 amount, uint256 timestamp);
```
- 每次提取时触发
- 记录所有者地址、提取金额和时间戳

## 安全特性

### 访问控制
- 使用 `onlyOwner` 修饰符保护敏感函数
- 防止非授权用户提取资金

### 重入攻击防护
- 使用 `call` 方法安全转账
- 检查转账结果并处理失败情况

### 输入验证
- 验证捐赠金额 > 0
- 验证时间参数的合理性
- 验证地址不为零地址

## 常见问题解答

### Q: 为什么我的捐赠失败了？
A: 检查以下几点：
- 确保发送的 ETH 数量 > 0
- 如果启用了时间限制，确保在允许的时间窗口内
- 确保有足够的 gas

### Q: 如何查看我的捐赠记录？
A: 调用 `getDonation(你的地址)` 函数，或在区块链浏览器中查看 `Donation` 事件。

### Q: 合约所有者可以随时提取资金吗？
A: 是的，合约所有者可以随时调用 `withdraw()` 函数提取所有资金。

### Q: 如何查看捐赠排行榜？
A: 调用 `getTopDonors(N)` 函数，其中 N 是你想查看的排名数量。

## 部署示例

### 成功部署示例输出：
```
开始部署 BeggingContract...
部署账户: 0x1234...
账户余额: 0.5 ETH
正在部署合约...
✅ BeggingContract 部署成功!
合约地址: 0xabcd...
交易哈希: 0x5678...
合约所有者: 0x1234...

📊 合约初始状态:
总捐赠金额: 0.0 ETH
合约余额: 0.0 ETH
捐赠者数量: 0
```

## 测试网络信息

### Sepolia 测试网
- 网络名称: Sepolia
- RPC URL: https://sepolia.infura.io/v3/YOUR-PROJECT-ID
- Chain ID: 11155111
- 区块浏览器: https://sepolia.etherscan.io/

### Goerli 测试网
- 网络名称: Goerli
- RPC URL: https://goerli.infura.io/v3/YOUR-PROJECT-ID
- Chain ID: 5
- 区块浏览器: https://goerli.etherscan.io/

## 获取测试 ETH

- Sepolia Faucet: https://sepoliafaucet.com/
- Goerli Faucet: https://goerlifaucet.com/

## 技术支持

如果遇到问题，请检查：
1. 网络连接和配置
2. 账户余额是否充足
3. 合约地址是否正确
4. Gas 限制设置

## 许可证

MIT License - 详见 LICENSE 文件


