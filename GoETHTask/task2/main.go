package main

import (
	"bufio"
	"fmt"
	"log"
	"math/big"
	"os"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

// 使用配置文件中的常量
// 如果需要修改配置，请编辑 config.go 文件
const (
	// 从配置文件获取链 ID
	SEPOLIA_CHAIN_ID = CONFIGURED_SEPOLIA_CHAIN_ID
)

func main() {
	fmt.Println("=== Go Ethereum Task 2: 合约代码生成和交互 ===")
	fmt.Println("连接到 Sepolia 测试网络...")

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
		fmt.Println("1. 部署计数器合约")
		fmt.Println("2. 与现有合约交互")
		fmt.Println("3. 退出")
		fmt.Print("请输入选择 (1-3): ")

		choice, _ := reader.ReadString('\n')
		choice = strings.TrimSpace(choice)

		switch choice {
		case "1":
			handleContractDeployment(client, reader)
		case "2":
			handleContractInteraction(client, reader)
		case "3":
			fmt.Println("程序退出")
			return
		default:
			fmt.Println("无效选择，请重新输入")
		}
		fmt.Println()
	}
}

func handleContractDeployment(client *ethclient.Client, reader *bufio.Reader) {
	displayInfo("部署计数器合约")

	// 获取并验证私钥
	privateKeyHex := readUserInput(reader, "请输入部署者私钥 (不包含 0x 前缀): ")
	if err := validatePrivateKey(privateKeyHex); err != nil {
		displayError(err.Error())
		return
	}

	// 创建交易授权器
	auth, err := createTransactor(client, privateKeyHex)
	if err != nil {
		displayError(fmt.Sprintf("创建交易授权失败: %v", err))
		return
	}

	// 设置部署特定的 Gas 限制
	auth.GasLimit = DEFAULT_DEPLOY_GAS_LIMIT

	displayInfo("正在部署合约...")
	address, tx, instance, err := DeployCounter(auth, client)
	if err != nil {
		displayError(fmt.Sprintf("部署合约失败: %v", err))
		return
	}

	displaySuccess("合约部署成功!")
	fmt.Printf("合约地址: %s\n", address.Hex())
	fmt.Printf("交易哈希: %s\n", tx.Hash().Hex())

	displayInfo("等待交易确认...")
	if err := waitForTransaction(client, tx); err != nil {
		displayError(fmt.Sprintf("等待交易确认失败: %v", err))
		return
	}

	// 验证合约部署
	count, err := instance.GetCount(nil)
	if err != nil {
		displayError(fmt.Sprintf("读取初始计数失败: %v", err))
		return
	}
	fmt.Printf("初始计数值: %s\n", count.String())
}

func handleContractInteraction(client *ethclient.Client, reader *bufio.Reader) {
	displayInfo("与合约交互")

	// 获取并验证合约地址
	contractAddressHex := readUserInput(reader, "请输入合约地址: ")
	if err := validateContractAddress(contractAddressHex); err != nil {
		displayError(err.Error())
		return
	}

	contractAddress := common.HexToAddress(contractAddressHex)
	instance, err := NewCounter(contractAddress, client)
	if err != nil {
		displayError(fmt.Sprintf("连接合约失败: %v", err))
		return
	}

	// 显示合约信息
	if err := displayContractInfo(instance, contractAddressHex); err != nil {
		displayError(fmt.Sprintf("获取合约信息失败: %v", err))
		return
	}

	for {
		fmt.Println("\n请选择操作:")
		fmt.Println("1. 查看当前计数")
		fmt.Println("2. 增加计数 (+1)")
		fmt.Println("3. 减少计数 (-1)")
		fmt.Println("4. 增加指定数值")
		fmt.Println("5. 重置计数")
		fmt.Println("6. 返回主菜单")
		fmt.Print("请输入选择 (1-6): ")

		choice, _ := reader.ReadString('\n')
		choice = strings.TrimSpace(choice)

		switch choice {
		case "1":
			handleGetCount(instance)
		case "2":
			handleContractMethod(client, instance, reader, "increment", nil)
		case "3":
			handleContractMethod(client, instance, reader, "decrement", nil)
		case "4":
			value := readUserInput(reader, "请输入要增加的数值: ")
			valueInt, err := parsePositiveInt(value)
			if err != nil {
				displayError(err.Error())
				continue
			}
			handleContractMethod(client, instance, reader, "incrementBy", valueInt)
		case "5":
			handleContractMethod(client, instance, reader, "reset", nil)
		case "6":
			return
		default:
			fmt.Println("无效选择，请重新输入")
		}
	}
}

func handleGetCount(instance *Counter) {
	count, err := instance.GetCount(nil)
	if err != nil {
		displayError(fmt.Sprintf("读取计数失败: %v", err))
		return
	}
	fmt.Printf("当前计数: %s\n", count.String())
}

func handleContractMethod(client *ethclient.Client, instance *Counter, reader *bufio.Reader, method string, value *big.Int) {
	// 获取并验证私钥
	privateKeyHex := readUserInput(reader, "请输入私钥 (不包含 0x 前缀): ")
	if err := validatePrivateKey(privateKeyHex); err != nil {
		displayError(err.Error())
		return
	}

	// 创建交易授权器
	auth, err := createTransactor(client, privateKeyHex)
	if err != nil {
		displayError(fmt.Sprintf("创建交易授权失败: %v", err))
		return
	}

	displayInfo(fmt.Sprintf("正在执行 %s 操作...", method))

	var tx *types.Transaction
	switch method {
	case "increment":
		tx, err = instance.Increment(auth)
	case "decrement":
		tx, err = instance.Decrement(auth)
	case "incrementBy":
		tx, err = instance.IncrementBy(auth, value)
	case "reset":
		tx, err = instance.Reset(auth)
	default:
		displayError(fmt.Sprintf("未知的方法: %s", method))
		return
	}

	if err != nil {
		displayError(fmt.Sprintf("执行 %s 失败: %v", method, err))
		return
	}

	fmt.Printf("交易已发送，哈希: %s\n", tx.Hash().Hex())

	if err := waitForTransaction(client, tx); err != nil {
		displayError(fmt.Sprintf("等待交易确认失败: %v", err))
		return
	}

	displaySuccess(fmt.Sprintf("%s 操作已完成!", method))
	// 显示新的计数值
	handleGetCount(instance)
}

// createTransactor 函数已移至 helper.go 文件
