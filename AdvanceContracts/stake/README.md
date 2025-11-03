# MetaNode Stake System

A comprehensive blockchain-based staking system that supports multiple token staking with MetaNode token rewards. The system provides multiple staking pools with independent configuration for stake tokens, reward calculations, and lock periods.

## 🌟 Features

- **Multi-Pool Support**: Create multiple staking pools for different tokens
- **Native Currency Staking**: Support for ETH staking in the first pool
- **ERC20 Token Staking**: Support for any ERC20 token staking
- **Flexible Reward System**: MetaNode token rewards based on stake amount and time
- **Lock Period Management**: Configurable unstaking lock periods per pool
- **Upgradeable Architecture**: Using OpenZeppelin's proxy pattern
- **Pause Controls**: Independent pause controls for different operations
- **Access Control**: Role-based access control for admin functions
- **Emergency Functions**: Emergency withdrawal and token recovery

## 📋 System Requirements

- Node.js v16+ 
- Hardhat
- OpenZeppelin Contracts v5.0+
- Ethers.js v6+

## 🚀 Quick Start

### 1. Installation

```bash
cd stake
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:
- `SEPOLIA_RPC_URL`: Sepolia network RPC URL
- `PRIVATE_KEY`: Your wallet private key (without 0x prefix)
- `ETHERSCAN_API_KEY`: For contract verification

### 3. Compile Contracts

```bash
npm run compile
```

### 4. Run Tests

```bash
# Run all tests
npm run test

# Run tests with gas reporting
npm run test:gas

# Generate coverage report
npm run coverage
```

### 5. Deploy to Sepolia

```bash
npm run deploy:sepolia
```

This will:
- Deploy MetaNodeToken (reward token)
- Deploy TestToken (for testing ERC20 staking)
- Deploy StakePool as upgradeable proxy
- Set up initial token distribution
- Create two initial pools (ETH and TestToken)
- Save deployment info to `deployments/` folder

### 6. Interact with Deployed Contracts

```bash
# Set contract addresses in .env first
npm run interact:sepolia
```

## 📊 Contract Architecture

### Core Contracts

1. **StakePool.sol**: Main staking contract with all core functionality
2. **MetaNodeToken.sol**: ERC20 reward token
3. **TestToken.sol**: Sample ERC20 token for testing
4. **StakePoolV2.sol**: Upgraded version with bonus features

### Data Structures

#### Pool
```solidity
struct Pool {
    address stTokenAddress;      // Stake token address (address(0) for ETH)
    uint256 poolWeight;          // Pool weight for reward allocation
    uint256 lastRewardBlock;     // Last reward calculation block
    uint256 accMetaNodePerST;    // Accumulated MetaNode per stake token
    uint256 stTokenAmount;       // Total staked amount in pool
    uint256 minDepositAmount;    // Minimum deposit amount
    uint256 unstakeLockedBlocks; // Lock period in blocks
    bool isActive;               // Pool active status
}
```

#### User
```solidity
struct User {
    uint256 stAmount;           // User staked amount
    uint256 finishedMetaNode;   // Already distributed rewards
    uint256 pendingMetaNode;    // Pending rewards to claim
    UnstakeRequest[] requests;  // Unstake requests with lock periods
}
```

## 🔧 Core Functions

### For Users

#### Staking
```solidity
// Stake ETH (Pool 0)
function stake(uint256 _pid, uint256 _amount) payable

// Stake ERC20 tokens (approve first)
testToken.approve(stakePoolAddress, amount)
stakePool.stake(_pid, _amount)
```

#### Unstaking
```solidity
function unstake(uint256 _pid, uint256 _amount)
function withdraw(uint256 _pid)  // After lock period
```

#### Rewards
```solidity
function claim(uint256 _pid)
function pendingMetaNode(uint256 _pid, address _user) view returns (uint256)
```

#### Emergency
```solidity
function emergencyWithdraw(uint256 _pid)  // Forfeit rewards
```

### For Admins

#### Pool Management
```solidity
function addPool(address _stTokenAddress, uint256 _poolWeight, uint256 _minDepositAmount, uint256 _unstakeLockedBlocks)
function updatePool(uint256 _pid, uint256 _poolWeight, uint256 _minDepositAmount, uint256 _unstakeLockedBlocks)
function setPoolActive(uint256 _pid, bool _isActive)
```

#### System Control
```solidity
function setMetaNodePerBlock(uint256 _metaNodePerBlock)
function pause() / unpause()
function setStakePaused(bool _paused)
function setUnstakePaused(bool _paused) 
function setClaimPaused(bool _paused)
```

## 🧪 Testing

The test suite includes:

- **StakePool.test.js**: Comprehensive functionality tests
- **Security.test.js**: Security and edge case tests

Test coverage includes:
- Pool management
- Staking/unstaking for both ETH and ERC20
- Reward calculations and distribution
- Lock period mechanics
- Pause functionality
- Access control
- Edge cases and security scenarios

## 🔄 Upgrades

The system uses OpenZeppelin's upgradeable proxy pattern:

```bash
# Set STAKE_POOL_PROXY_ADDRESS in .env
npm run upgrade:sepolia
```

## 📋 Default Pool Configuration

After deployment, two pools are automatically created:

**Pool 0 (ETH Staking)**
- Token: Native ETH
- Weight: 100
- Min Deposit: 0.01 ETH
- Lock Period: ~24 hours (6500 blocks)

**Pool 1 (TestToken Staking)**
- Token: TestToken (TST)
- Weight: 200  
- Min Deposit: 100 TST
- Lock Period: ~48 hours (13000 blocks)

## 🛡️ Security Features

- Reentrancy protection
- Integer overflow/underflow protection (Solidity 0.8+)
- Role-based access control
- Emergency pause mechanisms
- Comprehensive input validation
- Safe math operations using OpenZeppelin

## 🔍 Contract Verification

After deployment, verify contracts on Etherscan:

```bash
npx hardhat verify --network sepolia CONTRACT_ADDRESS [CONSTRUCTOR_ARGS]
```

## 📁 Project Structure

```
stake/
├── contracts/
│   ├── StakePool.sol          # Main staking contract
│   ├── StakePoolV2.sol        # Upgraded version
│   ├── MetaNodeToken.sol      # Reward token
│   └── TestToken.sol          # Test ERC20 token
├── test/
│   ├── StakePool.test.js      # Main tests
│   └── Security.test.js       # Security tests
├── scripts/
│   ├── deploy.js              # Deployment script
│   ├── upgrade.js             # Upgrade script
│   └── interact.js            # Interaction script
├── deployments/               # Deployment artifacts
├── hardhat.config.js          # Hardhat configuration
├── package.json
└── README.md
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Write tests for new functionality
4. Run the test suite
5. Submit a pull request

## ⚠️ Important Notes

1. **Testing First**: Always test on Sepolia before mainnet deployment
2. **Private Keys**: Never commit private keys or sensitive data
3. **Gas Estimation**: Test gas costs with large datasets
4. **Upgrade Safety**: Test upgrades thoroughly on testnet
5. **Admin Keys**: Use multi-sig wallets for admin functions in production

## 📄 License

MIT License - see LICENSE file for details

---

Built with ❤️ by MetaNode Academy