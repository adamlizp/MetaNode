package main

import (
	"context"
	"fmt"
	"math/big"

	"github.com/ethereum/go-ethereum/ethclient"
)

// QueryBlock 查询并显示区块信息
// client: 以太坊客户端连接
// blockNumber: 要查询的区块号，nil 表示最新区块
func QueryBlock(client *ethclient.Client, blockNumber *big.Int) error {
	ctx := context.Background()

	// 获取区块信息
	block, err := client.BlockByNumber(ctx, blockNumber)
	if err != nil {
		return fmt.Errorf("获取区块失败: %v", err)
	}

	fmt.Printf("=== 区块信息 ===\n")
	fmt.Printf("区块号: %s\n", block.Number().String())
	fmt.Printf("区块哈希: %s\n", block.Hash().Hex())
	fmt.Printf("时间戳: %d\n", block.Time())
	fmt.Printf("交易数量: %d\n", len(block.Transactions()))
	fmt.Printf("Gas 使用量: %d\n", block.GasUsed())
	fmt.Printf("Gas 上限: %d\n", block.GasLimit())
	fmt.Printf("矿工地址: %s\n", block.Coinbase().Hex())
	fmt.Printf("父区块哈希: %s\n", block.ParentHash().Hex())
	fmt.Printf("区块大小: %d 字节\n", block.Size())
	fmt.Printf("========================\n\n")

	return nil
}
