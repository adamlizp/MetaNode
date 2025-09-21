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

// validateContractAddress 验证合约地址格式
func validateContractAddress(address string) error {
	if !common.IsHexAddress(address) {
		return fmt.Errorf("无效的合约地址格式")
	}
	return nil
}

// parsePositiveInt 解析正整数
func parsePositiveInt(input string) (*big.Int, error) {
	value, err := strconv.ParseInt(input, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("无效的数值: %v", err)
	}

	if value <= 0 {
		return nil, fmt.Errorf("数值必须大于0")
	}

	return big.NewInt(value), nil
}

// confirmAction 确认用户操作
func confirmAction(reader *bufio.Reader, message string) bool {
	confirm := readUserInput(reader, message+" (y/N): ")
	confirm = strings.ToLower(confirm)
	return confirm == "y" || confirm == "yes"
}

// displaySuccess 显示成功消息
func displaySuccess(message string) {
	fmt.Printf("✅ %s\n", message)
}

// displayError 显示错误消息
func displayError(message string) {
	fmt.Printf("❌ %s\n", message)
}

// displayInfo 显示信息消息
func displayInfo(message string) {
	fmt.Printf("ℹ️  %s\n", message)
}