package main

import (
	"bufio"
	"fmt"
	"math/big"
	"strconv"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

// readUserInput 从用户输入读取字符串并去除空白
func readUserInput(reader *bufio.Reader, prompt string) string {
	fmt.Print(prompt)
	input, _ := reader.ReadString('\n')
	return strings.TrimSpace(input)
}

// parseBlockNumber 解析区块号输入
func parseBlockNumber(input string) (*big.Int, error) {
	if input == "latest" {
		return nil, nil // nil 代表最新区块
	}

	num, err := strconv.ParseInt(input, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("无效的区块号: %v", err)
	}
	return big.NewInt(num), nil
}

// validatePrivateKey 验证私钥格式
func validatePrivateKey(privateKeyHex string) error {
	if len(privateKeyHex) != 64 {
		return fmt.Errorf("私钥长度必须为64个字符（不包含0x前缀）")
	}

	// 尝试解析私钥
	_, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		return fmt.Errorf("私钥格式无效: %v", err)
	}

	return nil
}

// validateAddress 验证以太坊地址格式
func validateAddress(address string) error {
	if !common.IsHexAddress(address) {
		return fmt.Errorf("无效的以太坊地址格式")
	}
	return nil
}

// parseAmount 解析转账金额
func parseAmount(amountStr string) (float64, error) {
	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		return 0, fmt.Errorf("无效的金额: %v", err)
	}

	if amount <= 0 {
		return 0, fmt.Errorf("转账金额必须大于0")
	}

	return amount, nil
}

// confirmAction 确认用户操作
func confirmAction(reader *bufio.Reader, message string) bool {
	confirm := readUserInput(reader, message+" (y/N): ")
	confirm = strings.ToLower(confirm)
	return confirm == "y" || confirm == "yes"
}