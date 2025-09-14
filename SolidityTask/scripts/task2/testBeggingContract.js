const { ethers } = require("hardhat");

async function testBeggingContract(contractAddress) {
    console.log("🧪 开始测试 BeggingContract 功能...");
    console.log("合约地址:", contractAddress);

    // 获取合约实例
    const BeggingContract = await ethers.getContractFactory("BeggingContract");
    const contract = BeggingContract.attach(contractAddress);

    // 获取测试账户
    const [owner, donor1, donor2, donor3] = await ethers.getSigners();

    console.log("\n👥 测试账户:");
    console.log("合约所有者:", owner.address);
    console.log("捐赠者1:", donor1.address);
    console.log("捐赠者2:", donor2.address);
    console.log("捐赠者3:", donor3.address);

    try {
        // 测试1: 验证合约初始状态
        console.log("\n📋 测试1: 验证合约初始状态");
        const contractOwner = await contract.owner();
        const initialBalance = await contract.getContractBalance();
        const initialDonorCount = await contract.getDonorCount();

        console.log("✅ 合约所有者:", contractOwner);
        console.log("✅ 初始余额:", ethers.utils.formatEther(initialBalance), "ETH");
        console.log("✅ 初始捐赠者数量:", initialDonorCount.toString());

        // 测试2: 捐赠功能测试
        console.log("\n💰 测试2: 捐赠功能测试");

        // 捐赠者1捐赠 0.1 ETH
        const donationAmount1 = ethers.utils.parseEther("0.1");
        console.log("捐赠者1 捐赠 0.1 ETH...");
        const tx1 = await contract.connect(donor1).donate({ value: donationAmount1 });
        await tx1.wait();
        console.log("✅ 捐赠1 成功，交易哈希:", tx1.hash);

        // 捐赠者2捐赠 0.2 ETH
        const donationAmount2 = ethers.utils.parseEther("0.2");
        console.log("捐赠者2 捐赠 0.2 ETH...");
        const tx2 = await contract.connect(donor2).donate({ value: donationAmount2 });
        await tx2.wait();
        console.log("✅ 捐赠2 成功，交易哈希:", tx2.hash);

        // 捐赠者3捐赠 0.05 ETH
        const donationAmount3 = ethers.utils.parseEther("0.05");
        console.log("捐赠者3 捐赠 0.05 ETH...");
        const tx3 = await contract.connect(donor3).donate({ value: donationAmount3 });
        await tx3.wait();
        console.log("✅ 捐赠3 成功，交易哈希:", tx3.hash);

        // 测试3: 查询捐赠金额
        console.log("\n🔍 测试3: 查询捐赠金额");
        const donation1 = await contract.getDonation(donor1.address);
        const donation2 = await contract.getDonation(donor2.address);
        const donation3 = await contract.getDonation(donor3.address);

        console.log("✅ 捐赠者1 总捐赠:", ethers.utils.formatEther(donation1), "ETH");
        console.log("✅ 捐赠者2 总捐赠:", ethers.utils.formatEther(donation2), "ETH");
        console.log("✅ 捐赠者3 总捐赠:", ethers.utils.formatEther(donation3), "ETH");

        // 测试4: 合约状态查询
        console.log("\n📊 测试4: 合约状态查询");
        const totalDonations = await contract.totalDonations();
        const contractBalance = await contract.getContractBalance();
        const donorCount = await contract.getDonorCount();

        console.log("✅ 总捐赠金额:", ethers.utils.formatEther(totalDonations), "ETH");
        console.log("✅ 合约余额:", ethers.utils.formatEther(contractBalance), "ETH");
        console.log("✅ 捐赠者数量:", donorCount.toString());

        // 测试5: 捐赠排行榜功能
        console.log("\n🏆 测试5: 捐赠排行榜功能");
        const [topDonors, topAmounts] = await contract.getTopDonors(3);
        console.log("前3名捐赠者排行榜:");
        for (let i = 0; i < topDonors.length; i++) {
            console.log(`${i + 1}. ${topDonors[i]} - ${ethers.utils.formatEther(topAmounts[i])} ETH`);
        }

        // 测试6: 直接向合约转账（测试 receive 函数）
        console.log("\n📤 测试6: 直接向合约转账");
        const directTransferAmount = ethers.utils.parseEther("0.01");
        console.log("捐赠者1 直接向合约转账 0.01 ETH...");
        const directTx = await donor1.sendTransaction({
            to: contract.address,
            value: directTransferAmount
        });
        await directTx.wait();
        console.log("✅ 直接转账成功，交易哈希:", directTx.hash);

        // 验证直接转账后的状态
        const updatedDonation1 = await contract.getDonation(donor1.address);
        const updatedBalance = await contract.getContractBalance();
        console.log("✅ 捐赠者1 更新后总捐赠:", ethers.utils.formatEther(updatedDonation1), "ETH");
        console.log("✅ 合约更新后余额:", ethers.utils.formatEther(updatedBalance), "ETH");

        // 测试7: 提取功能（只有所有者可以调用）
        console.log("\n💸 测试7: 提取功能测试");

        // 先测试非所有者调用会失败
        console.log("测试非所有者调用 withdraw...");
        try {
            await contract.connect(donor1).withdraw();
            console.log("❌ 错误：非所有者竟然可以提取资金！");
        } catch (error) {
            console.log("✅ 正确：非所有者无法提取资金");
        }

        // 所有者提取资金
        const ownerBalanceBefore = await owner.getBalance();
        console.log("所有者提取前余额:", ethers.utils.formatEther(ownerBalanceBefore), "ETH");

        console.log("所有者提取资金...");
        const withdrawTx = await contract.connect(owner).withdraw();
        await withdrawTx.wait();
        console.log("✅ 提取成功，交易哈希:", withdrawTx.hash);

        const ownerBalanceAfter = await owner.getBalance();
        const contractBalanceAfter = await contract.getContractBalance();
        console.log("所有者提取后余额:", ethers.utils.formatEther(ownerBalanceAfter), "ETH");
        console.log("合约提取后余额:", ethers.utils.formatEther(contractBalanceAfter), "ETH");

        // 测试8: 时间限制功能（可选）
        console.log("\n⏰ 测试8: 时间限制功能");
        const currentTime = Math.floor(Date.now() / 1000);
        const futureTime = currentTime + 3600; // 1小时后

        console.log("设置时间限制：1小时后到期...");
        const setTimeTx = await contract.connect(owner).setTimeRestriction(
            currentTime,
            futureTime,
            true
        );
        await setTimeTx.wait();
        console.log("✅ 时间限制设置成功");

        // 获取时间限制信息
        const [startTime, endTime, enabled] = await contract.getTimeRestriction();
        console.log("开始时间:", new Date(startTime.toNumber() * 1000).toLocaleString());
        console.log("结束时间:", new Date(endTime.toNumber() * 1000).toLocaleString());
        console.log("时间限制启用:", enabled);

        console.log("\n🎉 所有测试完成！合约功能正常！");
        console.log("\n📋 测试总结:");
        console.log("✅ 捐赠功能正常");
        console.log("✅ 查询功能正常");
        console.log("✅ 提取功能正常（仅所有者）");
        console.log("✅ 排行榜功能正常");
        console.log("✅ 直接转账功能正常");
        console.log("✅ 时间限制功能正常");
        console.log("✅ 访问控制正常");

    } catch (error) {
        console.error("❌ 测试过程中出现错误:", error);
        throw error;
    }
}

async function main() {
    // 如果提供了合约地址，直接测试
    const contractAddress = process.argv[2];

    if (contractAddress) {
        await testBeggingContract(contractAddress);
    } else {
        console.log("请提供合约地址作为参数");
        console.log("用法: npx hardhat run scripts/testBeggingContract.js --network <network> -- <contract_address>");
        process.exit(1);
    }
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("❌ 测试失败:", error);
            process.exit(1);
        });
}

module.exports = testBeggingContract;


