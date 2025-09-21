package main

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"math/big"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

// SendTransaction 发送以太坊交易
// client: 以太坊客户端连接
// privateKeyHex: 发送方私钥（十六进制格式，不含0x前缀）
// toAddressHex: 接收方地址
// amountEth: 转账金额（以ETH为单位）
func SendTransaction(client *ethclient.Client, privateKeyHex, toAddressHex string, amountEth float64) error {
	ctx := context.Background()

	// 解析私钥
	privateKey, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		return fmt.Errorf("解析私钥失败: %v", err)
	}

	// 从私钥获取公钥
	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return fmt.Errorf("转换公钥为ECDSA格式失败")
	}

	// 获取发送方地址
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)
	toAddress := common.HexToAddress(toAddressHex)

	// 获取账户的nonce值（交易序号）
	nonce, err := client.PendingNonceAt(ctx, fromAddress)
	if err != nil {
		return fmt.Errorf("获取nonce失败: %v", err)
	}

	// 设置gas限制（标准转账为21000）
	gasLimit := uint64(21000)

	// 获取建议的gas价格
	gasPrice, err := client.SuggestGasPrice(ctx)
	if err != nil {
		return fmt.Errorf("获取gas价格失败: %v", err)
	}

	// 将ETH转换为Wei（1 ETH = 10^18 Wei）
	amount := new(big.Int)
	amount.SetString(fmt.Sprintf("%.0f", amountEth*1e18), 10)

	// 创建交易
	tx := types.NewTransaction(nonce, toAddress, amount, gasLimit, gasPrice, nil)

	// 获取链ID
	chainID, err := client.NetworkID(ctx)
	if err != nil {
		return fmt.Errorf("获取链ID失败: %v", err)
	}

	// 签署交易
	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(chainID), privateKey)
	if err != nil {
		return fmt.Errorf("签署交易失败: %v", err)
	}

	fmt.Printf("=== 交易信息 ===\n")
	fmt.Printf("发送方: %s\n", fromAddress.Hex())
	fmt.Printf("接收方: %s\n", toAddress.Hex())
	fmt.Printf("转账金额: %.6f ETH\n", amountEth)
	fmt.Printf("Gas 限制: %d\n", gasLimit)
	fmt.Printf("Gas 价格: %s wei\n", gasPrice.String())
	fmt.Printf("Nonce: %d\n", nonce)
	fmt.Printf("链 ID: %s\n", chainID.String())

	// 发送交易
	err = client.SendTransaction(ctx, signedTx)
	if err != nil {
		return fmt.Errorf("发送交易失败: %v", err)
	}

	fmt.Printf("交易发送成功！\n")
	fmt.Printf("交易哈希: %s\n", signedTx.Hash().Hex())
	fmt.Printf("===============================\n\n")

	return nil
}
