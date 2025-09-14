const hre = require("hardhat");

async function main() {
    // 直接在脚本中设置参数，避免命令行参数解析问题
    const contractAddress = "0xcCfC15E9C87F0fd3A1eA36b6f78Be08752CE96e0";
    const tokenURI = "https://gateway.pinata.cloud/ipfs/bafkreif4j7aus75rqdwazqgidqngmdshzaftip5ccvqvjasrlvdfg5jdie";

    console.log("🎨 开始铸造 NFT...");
    console.log("📄 合约地址:", contractAddress);
    console.log("🔗 元数据URI:", tokenURI);

    // 获取签名者
    const [deployer] = await hre.ethers.getSigners();
    const recipient = deployer.address; // 铸造给部署者

    console.log("👤 铸造者:", deployer.address);
    console.log("🎯 接收者:", recipient);

    // 检查余额
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 铸造者余额:", hre.ethers.formatEther(balance), "ETH");

    try {
        // 连接到已部署的合约
        const MyNFT = await hre.ethers.getContractFactory("MyNFT");
        const nft = MyNFT.attach(contractAddress);

        // 验证合约所有者
        const owner = await nft.owner();
        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            console.error("❌ 错误: 只有合约所有者可以铸造NFT");
            console.log("合约所有者:", owner);
            console.log("当前账户:", deployer.address);
            process.exit(1);
        }

        // 获取下一个Token ID
        const nextTokenId = await nft.getNextTokenId();
        console.log("🆔 即将铸造的Token ID:", nextTokenId.toString());

        // 铸造NFT
        console.log("⏳ 正在铸造NFT...");
        const tx = await nft.mintNFT(recipient, tokenURI);

        console.log("📝 交易哈希:", tx.hash);
        console.log("⏳ 等待交易确认...");

        const receipt = await tx.wait();

        console.log("✅ NFT 铸造成功!");
        console.log("🎉 Gas 使用量:", receipt.gasUsed.toString());
        console.log("💸 Gas 费用:", hre.ethers.formatEther(receipt.gasUsed * receipt.gasPrice), "ETH");

        // 从事件中获取Token ID
        const mintEvent = receipt.logs.find(log => {
            try {
                const parsed = nft.interface.parseLog(log);
                return parsed.name === 'NFTMinted';
            } catch {
                return false;
            }
        });

        if (mintEvent) {
            const parsedEvent = nft.interface.parseLog(mintEvent);
            const tokenId = parsedEvent.args.tokenId;
            console.log("🎨 Token ID:", tokenId.toString());
            console.log("🎯 接收者:", parsedEvent.args.to);
            console.log("🔗 元数据URI:", parsedEvent.args.tokenURI);
        }

        // 验证铸造结果
        const totalSupply = await nft.getTotalSupply();
        console.log("📊 当前总供应量:", totalSupply.toString());

        // 如果是测试网，提供查看链接
        const network = hre.network.name;
        if (network === "sepolia") {
            console.log("\n🔗 查看你的NFT:");
            console.log(`📊 交易详情: https://sepolia.etherscan.io/tx/${tx.hash}`);
            console.log(`📄 合约页面: https://sepolia.etherscan.io/address/${contractAddress}`);
            console.log(`🔗 元数据链接: ${tokenURI}`);
            console.log("\n💡 提示: OpenSea 已不再支持测试网，可通过上述链接查看NFT信息");
        }

    } catch (error) {
        console.error("❌ 铸造失败:", error.message);

        if (error.message.includes("mint to zero address")) {
            console.log("💡 提示: 接收者地址不能为零地址");
        } else if (error.message.includes("tokenURI cannot be empty")) {
            console.log("💡 提示: 元数据URI不能为空");
        } else if (error.message.includes("Ownable: caller is not the owner")) {
            console.log("💡 提示: 只有合约所有者可以铸造NFT");
        } else if (error.message.includes("insufficient funds")) {
            console.log("💡 提示: 账户余额不足，请确保有足够的ETH支付gas费用");
        }

        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("❌ 脚本执行失败:", error);
            process.exit(1);
        });
}

module.exports = main;
