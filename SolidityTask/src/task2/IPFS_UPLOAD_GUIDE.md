# 📤 IPFS上传详细指南

## 使用Pinata上传文件到IPFS

### 1. 注册Pinata账户
1. 访问 [pinata.cloud](https://pinata.cloud)
2. 点击"Sign Up"注册免费账户
3. 验证邮箱并登录

### 2. 上传图片文件
1. 登录后，点击"Upload"按钮
2. 选择"File"
3. 选择你的图片文件
4. 点击"Upload"
5. 等待上传完成

### 3. 获取图片IPFS链接
上传成功后，你会看到：
```
CID: QmYourImageHashHere123456789
```

你的图片链接就是：
```
https://gateway.pinata.cloud/ipfs/QmYourImageHashHere123456789
```

### 4. 创建元数据JSON文件
复制下面的模板，修改内容：

```json
{
  "name": "我的第一个NFT",
  "description": "这是我创建的第一个NFT，具有特殊意义。",
  "image": "https://gateway.pinata.cloud/ipfs/QmYourImageHashHere123456789",
  "attributes": [
    {
      "trait_type": "颜色",
      "value": "蓝色"
    },
    {
      "trait_type": "稀有度",
      "value": "传奇"
    },
    {
      "trait_type": "创作时间",
      "value": "2024年12月"
    }
  ]
}
```

### 5. 上传元数据JSON
1. 将修改好的JSON保存为文件（如：metadata.json）
2. 在Pinata上再次点击"Upload"
3. 选择你的JSON文件
4. 上传完成后获得元数据IPFS链接

### 6. 铸造NFT
使用元数据链接铸造NFT：
```bash
npx hardhat run scripts/mintNFT.js --network sepolia -- 0xe1a8226eA643764D6199FE21C6521d23B7e00228 https://gateway.pinata.cloud/ipfs/QmYourMetadataHash
```

## 🎯 实际示例

假设你上传了一张龙图片：

### 1. 图片上传结果
```
图片CID: QmCat123456789
图片链接: https://gateway.pinata.cloud/ipfs/bafybeidbnwrgrir54zuvoo4assflbty3rggabb2tv4ou3nmqp4j33gskgy
```

### 2. 创建元数据
```json
{
  "name": "金龙 #1",
  "description": "一只超级帅的金龙",
  "image": "https://gateway.pinata.cloud/ipfs/bafybeidbnwrgrir54zuvoo4assflbty3rggabb2tv4ou3nmqp4j33gskgy",
  "attributes": [
    {
      "trait_type": "品种",
      "value": "龙"
    },
    {
      "trait_type": "眼睛颜色",
      "value": "金色"
    },
    {
      "trait_type": "表情",
      "value": "微笑"
    }
  ]
}
```

### 3. 元数据上传结果
```
元数据CID: bafkreif4j7aus75rqdwazqgidqngmdshzaftip5ccvqvjasrlvdfg5jdie
元数据链接: https://gateway.pinata.cloud/ipfs/bafkreif4j7aus75rqdwazqgidqngmdshzaftip5ccvqvjasrlvdfg5jdie
```

### 4. 铸造命令
```bash
npx hardhat run scripts/mintNFT.js --network sepolia -- 0xcCfC15E9C87F0fd3A1eA36b6f78Be08752CE96e0 https://gateway.pinata.cloud/ipfs/bafkreif4j7aus75rqdwazqgidqngmdshzaftip5ccvqvjasrlvdfg5jdie
```

## 📱 查看结果

铸造成功后，你可以在以下地方看到你的NFT：

1. **OpenSea测试网**
   - 访问：https://testnets.opensea.io
   - 连接MetaMask钱包
   - 查看你的收藏

2. **直接链接**
   - https://testnets.opensea.io/assets/sepolia/0xe1a8226eA643764D6199FE21C6521d23B7e00228/[TokenID]

## ⚠️ 重要提示

1. **免费额度**：Pinata免费账户有1GB存储空间
2. **永久存储**：上传到IPFS的文件是永久的，无法删除
3. **等待时间**：OpenSea可能需要几分钟到几小时来索引新的NFT
4. **刷新元数据**：如果NFT不显示，可以在OpenSea上点击"Refresh metadata"按钮
