# NFT 项目完整指南

## 🎯 项目概述

这个项目实现了一个完整的ERC721 NFT合约，包含以下功能：

### ✅ 合约功能
- **ERC721标准**: 完全符合ERC721标准
- **元数据存储**: 支持IPFS元数据链接
- **铸造功能**: 单个和批量铸造NFT
- **权限控制**: 只有合约所有者可以铸造
- **查询功能**: 丰富的查询接口

### 📁 项目结构
```
src/task2/
├── MyNFT.sol              # NFT合约主文件
├── metadata-example.json  # 元数据示例
└── NFT_GUIDE.md           # 本指南文件

scripts/
├── deployNFT.js          # 部署脚本
└── mintNFT.js            # 铸造脚本
```

## 🚀 快速开始

### 1. 环境准备

确保你已经：
- ✅ 安装了Node.js和npm
- ✅ 配置了.env文件（私钥、RPC URL等）
- ✅ 获取了测试网ETH

### 2. 编译合约

```bash
npx hardhat compile
```

### 3. 部署合约

```bash
# 部署到Sepolia测试网
npx hardhat run scripts/deployNFT.js --network sepolia
```

部署成功后会显示：
```
✅ MyNFT 合约部署成功!
📄 合约地址: 0x...
🏷️  NFT名称: MyAwesomeNFT
🔤 NFT符号: MANFT
```

### 4. 准备元数据

#### 步骤1: 准备图片
1. 选择一张图片（推荐尺寸：1000x1000像素）
2. 上传到IPFS（推荐使用Pinata）
3. 获取IPFS哈希，如：`QmYourImageHashHere`

#### 步骤2: 创建JSON元数据
使用 `metadata-example.json` 作为模板：

```json
{
  "name": "My Awesome NFT #1",
  "description": "这是我的第一个NFT...",
  "image": "https://gateway.pinata.cloud/ipfs/QmYourImageHashHere",
  "attributes": [
    {
      "trait_type": "Background",
      "value": "Blue Gradient"
    }
  ]
}
```

#### 步骤3: 上传元数据到IPFS
1. 将JSON文件上传到IPFS
2. 获取元数据IPFS链接，如：`https://gateway.pinata.cloud/ipfs/QmMetadataHash`

### 5. 铸造NFT

```bash
npx hardhat run scripts/mintNFT.js --network sepolia -- <合约地址> <元数据URI>
```

示例：
```bash
npx hardhat run scripts/mintNFT.js --network sepolia -- 0x1234567890123456789012345678901234567890 https://gateway.pinata.cloud/ipfs/QmYourMetadataHash
```

## 📋 详细步骤

### 使用Pinata上传到IPFS

1. **注册Pinata账户**
   - 访问 [pinata.cloud](https://pinata.cloud)
   - 创建免费账户

2. **上传图片**
   - 点击"Upload"按钮
   - 选择你的图片文件
   - 复制返回的IPFS哈希

3. **创建元数据文件**
   - 复制 `metadata-example.json`
   - 修改其中的内容：
     - `name`: NFT名称
     - `description`: NFT描述
     - `image`: 替换为你的图片IPFS链接
     - `attributes`: 修改属性

4. **上传元数据**
   - 将修改好的JSON文件上传到Pinata
   - 复制元数据的IPFS链接

### 查看和验证NFT

⚠️ **重要提醒**: OpenSea 已不再支持测试网。以下是查看测试网NFT的替代方案：

1. **使用区块链浏览器 (推荐)**
   - 访问 [Sepolia Etherscan](https://sepolia.etherscan.io/)
   - 搜索你的合约地址查看NFT信息
   - 可以看到所有者、转账历史等基本信息

2. **直接访问IPFS元数据**
   - 复制NFT的tokenURI链接
   - 在浏览器中打开查看完整的元数据和图片
   - 验证元数据格式是否正确

3. **使用Hardhat脚本查询**
   - 创建查询脚本获取NFT的详细信息
   - 可以验证所有合约功能是否正常

## 🔧 高级功能

### 批量铸造

```javascript
// 在mintNFT.js中添加批量铸造功能
const tokenURIs = [
  "https://gateway.pinata.cloud/ipfs/QmHash1",
  "https://gateway.pinata.cloud/ipfs/QmHash2",
  "https://gateway.pinata.cloud/ipfs/QmHash3"
];

const tokenIds = await nft.batchMintNFT(recipient, tokenURIs);
```

### 查询用户NFT

```javascript
// 获取用户拥有的所有NFT
const userTokens = await nft.tokensOfOwner(userAddress);
console.log("用户拥有的Token IDs:", userTokens);
```

### 检查NFT存在性

```javascript
const exists = await nft.exists(tokenId);
console.log(`Token ${tokenId} 是否存在:`, exists);
```

## 🎨 元数据标准

### NFT元数据标准

```json
{
  "name": "NFT名称",
  "description": "NFT描述",
  "image": "图片IPFS链接",
  "external_url": "外部链接",
  "attributes": [
    {
      "trait_type": "属性名",
      "value": "属性值"
    },
    {
      "display_type": "boost_number",
      "trait_type": "数值属性",
      "value": 95
    },
    {
      "display_type": "date",
      "trait_type": "日期属性",
      "value": 1703808000
    }
  ],
  "animation_url": "动画文件链接",
  "youtube_url": "YouTube视频链接"
}
```

### 属性类型说明

| display_type | 说明 | 示例 |
|-------------|------|------|
| `boost_number` | 数值加成 | Power Level: 95 |
| `boost_percentage` | 百分比加成 | Speed Boost: +15% |
| `number` | 普通数字 | Generation: 1 |
| `date` | 日期时间戳 | Created: 2024-01-01 |

## 🔗 有用链接

### 测试网工具
- [Sepolia Faucet](https://sepoliafaucet.com/) - 获取测试ETH
- [Sepolia Etherscan](https://sepolia.etherscan.io/) - 区块浏览器
- ~~OpenSea Testnet~~ - 已不再支持测试网

### IPFS服务
- [Pinata](https://pinata.cloud/) - IPFS固定服务
- [NFT.Storage](https://nft.storage/) - 免费NFT存储
- [IPFS Gateway](https://ipfs.io/ipfs/) - IPFS网关

### 开发工具
- [OpenZeppelin](https://docs.openzeppelin.com/) - 智能合约库
- [Hardhat](https://hardhat.org/) - 开发框架
- [MetaMask](https://metamask.io/) - 钱包

## ❓ 常见问题

### Q: 如何验证我的NFT是否正确创建？
A: 由于OpenSea不再支持测试网，可以通过以下方式验证：
1. 在Sepolia Etherscan上查看合约和交易
2. 直接访问IPFS链接查看元数据
3. 使用Hardhat脚本查询NFT信息
4. 检查元数据格式是否符合标准

### Q: 如何更新NFT的元数据？
A: NFT的元数据一旦设置就无法更改，这是区块链不可篡改的特性。如果需要更新，只能铸造新的NFT。

### Q: 如何设置版税？
A: 当前合约没有内置版税功能。对于主网部署，可以：
1. 使用支持EIP-2981的版税标准合约
2. 在各个NFT市场平台上单独设置版税
3. 考虑使用OpenZeppelin的版税扩展

### Q: 可以转让NFT的所有权吗？
A: 是的，NFT的所有权可以通过标准的ERC721转账功能转移，但合约的所有权（铸造权限）需要调用`transferOwnership`函数。

## 🎉 项目完成检查清单

- [ ] 合约编译成功
- [ ] 合约部署到测试网
- [ ] 图片上传到IPFS
- [ ] 元数据创建并上传到IPFS
- [ ] 成功铸造NFT
- [ ] 在Etherscan上验证交易
- [ ] 在区块链浏览器上验证NFT
- [ ] 测试NFT转账功能

恭喜！你已经成功创建并部署了你的第一个NFT！🎊

