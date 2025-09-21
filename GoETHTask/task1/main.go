package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/ethereum/go-ethereum/ethclient"
)


func main() {
	fmt.Println("=== Go Ethereum Task 1: 区块链读写 ===")
	fmt.Println("连接到 Sepolia 测试网络...")

	// 使用配置文件中的 RPC URL
	rpcURL := GetInfuraURL()
	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		log.Fatalf("连接以太坊客户端失败: %v", err)
	}
	defer client.Close()

	fmt.Println("连接成功!")
	fmt.Println()

	reader := bufio.NewReader(os.Stdin)

	for {
		fmt.Println("请选择操作:")
		fmt.Println("1. 查询区块信息")
		fmt.Println("2. 发送交易")
		fmt.Println("3. 退出")
		fmt.Print("请输入选择 (1-3): ")

		choice, _ := reader.ReadString('\n')
		choice = strings.TrimSpace(choice)

		switch choice {
		case "1":
			handleBlockQuery(client, reader)
		case "2":
			handleTransactionSend(client, reader)
		case "3":
			fmt.Println("程序退出")
			return
		default:
			fmt.Println("无效选择，请重新输入")
		}
		fmt.Println()
	}
}

func handleBlockQuery(client *ethclient.Client, reader *bufio.Reader) {
	input := readUserInput(reader, "请输入要查询的区块号 (输入 'latest' 查询最新区块): ")

	blockNumber, err := parseBlockNumber(input)
	if err != nil {
		fmt.Printf("错误: %v\n", err)
		return
	}

	if err := QueryBlock(client, blockNumber); err != nil {
		fmt.Printf("查询区块失败: %v\n", err)
	}
}

func handleTransactionSend(client *ethclient.Client, reader *bufio.Reader) {
	fmt.Println("注意: 这是 Sepolia 测试网络，确保使用测试账户和测试 ETH")
	fmt.Println()

	// 获取并验证私钥
	privateKey := readUserInput(reader, "请输入发送方私钥 (不包含 0x 前缀): ")
	if err := validatePrivateKey(privateKey); err != nil {
		fmt.Printf("错误: %v\n", err)
		return
	}

	// 获取并验证接收地址
	toAddress := readUserInput(reader, "请输入接收方地址: ")
	if err := validateAddress(toAddress); err != nil {
		fmt.Printf("错误: %v\n", err)
		return
	}

	// 获取并验证转账金额
	amountStr := readUserInput(reader, "请输入转账金额 (ETH): ")
	amount, err := parseAmount(amountStr)
	if err != nil {
		fmt.Printf("错误: %v\n", err)
		return
	}

	// 确认交易
	message := fmt.Sprintf("确认发送 %.6f ETH 到 %s?", amount, toAddress)
	if !confirmAction(reader, message) {
		fmt.Println("交易已取消")
		return
	}

	// 发送交易
	if err := SendTransaction(client, privateKey, toAddress, amount); err != nil {
		fmt.Printf("发送交易失败: %v\n", err)
	}
}
