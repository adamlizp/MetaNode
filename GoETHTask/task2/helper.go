package main

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"math/big"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

// createTransactor 创建交易授权器
// 根据私钥和网络信息创建用于发送交易的授权器
func createTransactor(client *ethclient.Client, privateKeyHex string) (*bind.TransactOpts, error) {
	// 解析私钥
	privateKey, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		return nil, fmt.Errorf("解析私钥失败: %v", err)
	}

	// 获取发送者地址
	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("转换公钥为ECDSA格式失败")
	}
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)

	// 获取nonce值
	nonce, err := client.PendingNonceAt(context.Background(), fromAddress)
	if err != nil {
		return nil, fmt.Errorf("获取nonce失败: %v", err)
	}

	// 获取建议的gas价格
	gasPrice, err := client.SuggestGasPrice(context.Background())
	if err != nil {
		return nil, fmt.Errorf("获取gas价格失败: %v", err)
	}

	// 创建授权器
	chainID := big.NewInt(SEPOLIA_CHAIN_ID)
	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
	if err != nil {
		return nil, fmt.Errorf("创建交易授权失败: %v", err)
	}

	// 设置交易参数
	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)           // 不发送ETH
	auth.GasLimit = DEFAULT_TX_GAS_LIMIT // 使用配置的gas限制
	auth.GasPrice = gasPrice

	return auth, nil
}

// waitForTransaction 等待交易确认并显示进度
func waitForTransaction(client *ethclient.Client, tx *types.Transaction) error {
	fmt.Printf("等待交易确认中")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	// 显示等待进度
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	go func() {
		dots := 0
		for {
			select {
			case <-ticker.C:
				dots = (dots + 1) % 4
				fmt.Printf("\r等待交易确认中%s", []string{"", ".", "..", "..."}[dots])
			case <-ctx.Done():
				return
			}
		}
	}()

	// 等待交易被挖矿
	receipt, err := bind.WaitMined(ctx, client, tx)
	if err != nil {
		fmt.Printf("\n")
		return fmt.Errorf("等待交易确认超时: %v", err)
	}

	fmt.Printf("\n")
	if receipt.Status == 1 {
		fmt.Println("✅ 交易确认成功!")
	} else {
		fmt.Println("❌ 交易执行失败!")
		return fmt.Errorf("交易执行失败")
	}

	return nil
}

// displayContractInfo 显示合约基本信息
func displayContractInfo(instance *Counter, contractAddress string) error {
	fmt.Printf("\n=== 合约信息 ===\n")
	fmt.Printf("合约地址: %s\n", contractAddress)

	// 获取当前计数值
	count, err := instance.GetCount(nil)
	if err != nil {
		return fmt.Errorf("获取计数失败: %v", err)
	}

	fmt.Printf("当前计数: %s\n", count.String())
	fmt.Printf("================\n\n")
	return nil
}
