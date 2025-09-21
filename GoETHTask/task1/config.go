package main

import (
	"os"
)

// 网络配置常量
const (
	// Sepolia 测试网链 ID
	SEPOLIA_CHAIN_ID = 11155111

	// 示例接收地址
	EXAMPLE_TO_ADDRESS = "0x7D06d07AA1f115dC4Ad50Ad18AF6D60b316f7eAA"
)

// GetInfuraURL 获取 Infura RPC URL
// 优先从环境变量读取，如果没有则使用默认值
func GetInfuraURL() string {
	apiKey := os.Getenv("INFURA_API_KEY")
	if apiKey == "" {
		apiKey = "3bbd17e943844442bd02357af9292ebe" // 请替换为您的 API Key
	}
	return "https://sepolia.infura.io/v3/" + apiKey
}

// GetExamplePrivateKey 获取示例私钥
// 优先从环境变量读取
func GetExamplePrivateKey() string {
	privateKey := os.Getenv("TEST_PRIVATE_KEY")
	if privateKey == "" {
		privateKey = "c7aadbcabaedf693ba210dae6ee9148bc2a27f702b405b48bdc1b74c5fd6acd7" // 请替换为您的测试私钥
	}
	return privateKey
}
