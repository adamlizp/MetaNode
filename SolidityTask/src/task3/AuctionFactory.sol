// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./NFTAuction.sol";
import "./AuctionNFT.sol";
import "./AuctionToken.sol";

/**
 * @title AuctionFactory
 * @dev 拍卖工厂合约，类似于Uniswap V2的工厂模式，管理拍卖合约实例
 *
 * 功能特性:
 * - 创建和管理拍卖合约实例
 * - 部署可升级的代理合约
 * - 统一管理拍卖参数
 * - 可升级合约(UUPS模式)
 * - 费用分配管理
 */
contract AuctionFactory is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    // 拍卖合约信息结构
    struct AuctionContractInfo {
        address auctionContract; // 拍卖合约地址
        address creator; // 创建者地址
        uint256 createdAt; // 创建时间
        bool isActive; // 是否活跃
        string name; // 拍卖合约名称
        string description; // 描述
    }

    // 状态变量
    address public auctionImplementation; // 拍卖合约实现地址
    address public nftImplementation; // NFT合约实现地址
    address public tokenImplementation; // 代币合约实现地址

    uint256 private _nextContractId;
    mapping(uint256 => AuctionContractInfo) public auctionContracts;
    mapping(address => uint256[]) public creatorContracts; // 创建者 => 合约ID数组
    mapping(address => uint256) public contractToId; // 合约地址 => ID

    // 全局配置
    address public ethUsdPriceFeed; // ETH/USD价格预言机
    mapping(address => address) public tokenPriceFeeds; // 代币价格预言机映射
    mapping(address => bool) public supportedTokens; // 支持的代币
    address[] public supportedTokenList;

    // 费用配置
    uint256 public creationFee; // 创建拍卖合约的费用
    uint256 public platformFeeRate; // 平台手续费率 (basis points)
    address public feeRecipient; // 费用接收者

    // 事件定义
    event AuctionContractCreated(
        uint256 indexed contractId,
        address indexed auctionContract,
        address indexed creator,
        string name
    );

    event NFTContractCreated(
        address indexed nftContract,
        address indexed creator,
        string name,
        string symbol
    );

    event TokenContractCreated(
        address indexed tokenContract,
        address indexed creator,
        string name,
        string symbol
    );

    event ImplementationUpdated(
        string contractType,
        address oldImplementation,
        address newImplementation
    );

    event GlobalConfigUpdated(
        address ethUsdPriceFeed,
        uint256 creationFee,
        uint256 platformFeeRate
    );

    event TokenSupportUpdated(address indexed token, bool supported);
    event PriceFeedUpdated(address indexed token, address priceFeed);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数
     * @param initialOwner 初始所有者
     * @param _ethUsdPriceFeed ETH/USD价格预言机地址
     * @param _auctionImplementation 拍卖合约实现地址
     * @param _nftImplementation NFT合约实现地址
     * @param _tokenImplementation 代币合约实现地址
     */
    function initialize(
        address initialOwner,
        address _ethUsdPriceFeed,
        address _auctionImplementation,
        address _nftImplementation,
        address _tokenImplementation
    ) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();

        _nextContractId = 1;
        ethUsdPriceFeed = _ethUsdPriceFeed;
        auctionImplementation = _auctionImplementation;
        nftImplementation = _nftImplementation;
        tokenImplementation = _tokenImplementation;

        // 默认配置
        creationFee = 0.01 ether; // 0.01 ETH
        platformFeeRate = 50; // 0.5%
        feeRecipient = initialOwner;
    }

    /**
     * @dev 创建拍卖合约
     * @param name 拍卖合约名称
     * @param description 描述
     * @return contractId 合约ID
     * @return auctionContract 拍卖合约地址
     */
    function createAuctionContract(
        string memory name,
        string memory description
    ) external payable returns (uint256 contractId, address auctionContract) {
        require(
            msg.value >= creationFee,
            "AuctionFactory: insufficient creation fee"
        );
        require(bytes(name).length > 0, "AuctionFactory: name cannot be empty");

        contractId = _nextContractId;
        _nextContractId++;

        // 创建代理合约
        bytes memory initData = abi.encodeWithSelector(
            NFTAuction.initialize.selector,
            msg.sender,
            ethUsdPriceFeed
        );

        ERC1967Proxy proxy = new ERC1967Proxy(auctionImplementation, initData);
        auctionContract = address(proxy);

        // 记录合约信息
        auctionContracts[contractId] = AuctionContractInfo({
            auctionContract: auctionContract,
            creator: msg.sender,
            createdAt: block.timestamp,
            isActive: true,
            name: name,
            description: description
        });

        creatorContracts[msg.sender].push(contractId);
        contractToId[auctionContract] = contractId;

        // 配置新创建的拍卖合约
        NFTAuction auction = NFTAuction(payable(auctionContract));

        // 设置支持的代币
        for (uint i = 0; i < supportedTokenList.length; i++) {
            address token = supportedTokenList[i];
            auction.setSupportedToken(token, true);

            if (tokenPriceFeeds[token] != address(0)) {
                auction.setTokenPriceFeed(token, tokenPriceFeeds[token]);
            }
        }

        // 转移手续费给费用接收者
        if (msg.value > 0) {
            payable(feeRecipient).transfer(msg.value);
        }

        emit AuctionContractCreated(
            contractId,
            auctionContract,
            msg.sender,
            name
        );

        return (contractId, auctionContract);
    }

    /**
     * @dev 创建NFT合约
     * @param name NFT名称
     * @param symbol NFT符号
     * @return nftContract NFT合约地址
     */
    function createNFTContract(
        string memory name,
        string memory symbol
    ) external payable returns (address nftContract) {
        require(
            msg.value >= creationFee,
            "AuctionFactory: insufficient creation fee"
        );
        require(bytes(name).length > 0, "AuctionFactory: name cannot be empty");
        require(
            bytes(symbol).length > 0,
            "AuctionFactory: symbol cannot be empty"
        );

        // 创建代理合约
        bytes memory initData = abi.encodeWithSelector(
            AuctionNFT.initialize.selector,
            name,
            symbol,
            msg.sender
        );

        ERC1967Proxy proxy = new ERC1967Proxy(nftImplementation, initData);
        nftContract = address(proxy);

        emit NFTContractCreated(nftContract, msg.sender, name, symbol);

        return nftContract;
    }

    /**
     * @dev 创建代币合约
     * @param name 代币名称
     * @param symbol 代币符号
     * @return tokenContract 代币合约地址
     */
    function createTokenContract(
        string memory name,
        string memory symbol
    ) external payable returns (address tokenContract) {
        require(
            msg.value >= creationFee,
            "AuctionFactory: insufficient creation fee"
        );
        require(bytes(name).length > 0, "AuctionFactory: name cannot be empty");
        require(
            bytes(symbol).length > 0,
            "AuctionFactory: symbol cannot be empty"
        );

        // 创建代理合约
        bytes memory initData = abi.encodeWithSelector(
            AuctionToken.initialize.selector,
            name,
            symbol,
            msg.sender
        );

        ERC1967Proxy proxy = new ERC1967Proxy(tokenImplementation, initData);
        tokenContract = address(proxy);

        emit TokenContractCreated(tokenContract, msg.sender, name, symbol);

        return tokenContract;
    }

    /**
     * @dev 停用拍卖合约
     * @param contractId 合约ID
     */
    function deactivateAuctionContract(uint256 contractId) external {
        AuctionContractInfo storage info = auctionContracts[contractId];
        require(
            info.auctionContract != address(0),
            "AuctionFactory: contract not found"
        );
        require(
            info.creator == msg.sender || msg.sender == owner(),
            "AuctionFactory: not authorized"
        );

        info.isActive = false;
    }

    /**
     * @dev 激活拍卖合约
     * @param contractId 合约ID
     */
    function activateAuctionContract(uint256 contractId) external {
        AuctionContractInfo storage info = auctionContracts[contractId];
        require(
            info.auctionContract != address(0),
            "AuctionFactory: contract not found"
        );
        require(
            info.creator == msg.sender || msg.sender == owner(),
            "AuctionFactory: not authorized"
        );

        info.isActive = true;
    }

    /**
     * @dev 更新拍卖合约实现
     * @param newImplementation 新实现地址
     */
    function updateAuctionImplementation(
        address newImplementation
    ) external onlyOwner {
        require(
            newImplementation != address(0),
            "AuctionFactory: invalid implementation"
        );

        address oldImplementation = auctionImplementation;
        auctionImplementation = newImplementation;

        emit ImplementationUpdated(
            "auction",
            oldImplementation,
            newImplementation
        );
    }

    /**
     * @dev 更新NFT合约实现
     * @param newImplementation 新实现地址
     */
    function updateNFTImplementation(
        address newImplementation
    ) external onlyOwner {
        require(
            newImplementation != address(0),
            "AuctionFactory: invalid implementation"
        );

        address oldImplementation = nftImplementation;
        nftImplementation = newImplementation;

        emit ImplementationUpdated("nft", oldImplementation, newImplementation);
    }

    /**
     * @dev 更新代币合约实现
     * @param newImplementation 新实现地址
     */
    function updateTokenImplementation(
        address newImplementation
    ) external onlyOwner {
        require(
            newImplementation != address(0),
            "AuctionFactory: invalid implementation"
        );

        address oldImplementation = tokenImplementation;
        tokenImplementation = newImplementation;

        emit ImplementationUpdated(
            "token",
            oldImplementation,
            newImplementation
        );
    }

    /**
     * @dev 设置全局配置
     * @param _ethUsdPriceFeed ETH/USD价格预言机地址
     * @param _creationFee 创建费用
     * @param _platformFeeRate 平台手续费率
     * @param _feeRecipient 费用接收者
     */
    function setGlobalConfig(
        address _ethUsdPriceFeed,
        uint256 _creationFee,
        uint256 _platformFeeRate,
        address _feeRecipient
    ) external onlyOwner {
        require(
            _ethUsdPriceFeed != address(0),
            "AuctionFactory: invalid price feed"
        );
        require(_platformFeeRate <= 1000, "AuctionFactory: fee rate too high"); // 最大10%
        require(
            _feeRecipient != address(0),
            "AuctionFactory: invalid fee recipient"
        );

        ethUsdPriceFeed = _ethUsdPriceFeed;
        creationFee = _creationFee;
        platformFeeRate = _platformFeeRate;
        feeRecipient = _feeRecipient;

        emit GlobalConfigUpdated(
            _ethUsdPriceFeed,
            _creationFee,
            _platformFeeRate
        );
    }

    /**
     * @dev 设置支持的代币
     * @param tokenAddress 代币地址
     * @param supported 是否支持
     */
    function setSupportedToken(
        address tokenAddress,
        bool supported
    ) external onlyOwner {
        require(
            tokenAddress != address(0),
            "AuctionFactory: invalid token address"
        );

        if (supported && !supportedTokens[tokenAddress]) {
            supportedTokenList.push(tokenAddress);
        } else if (!supported && supportedTokens[tokenAddress]) {
            // 从数组中移除
            for (uint i = 0; i < supportedTokenList.length; i++) {
                if (supportedTokenList[i] == tokenAddress) {
                    supportedTokenList[i] = supportedTokenList[
                        supportedTokenList.length - 1
                    ];
                    supportedTokenList.pop();
                    break;
                }
            }
        }

        supportedTokens[tokenAddress] = supported;
        emit TokenSupportUpdated(tokenAddress, supported);
    }

    /**
     * @dev 设置代币价格预言机
     * @param tokenAddress 代币地址
     * @param priceFeed 价格预言机地址
     */
    function setTokenPriceFeed(
        address tokenAddress,
        address priceFeed
    ) external onlyOwner {
        require(
            tokenAddress != address(0),
            "AuctionFactory: invalid token address"
        );
        require(priceFeed != address(0), "AuctionFactory: invalid price feed");

        tokenPriceFeeds[tokenAddress] = priceFeed;
        emit PriceFeedUpdated(tokenAddress, priceFeed);
    }

    /**
     * @dev 批量更新现有拍卖合约配置
     * @param contractIds 合约ID数组
     */
    function batchUpdateAuctionConfigs(
        uint256[] calldata contractIds
    ) external onlyOwner {
        for (uint i = 0; i < contractIds.length; i++) {
            uint256 contractId = contractIds[i];
            AuctionContractInfo storage info = auctionContracts[contractId];

            if (info.auctionContract != address(0) && info.isActive) {
                NFTAuction auction = NFTAuction(payable(info.auctionContract));

                try auction.owner() returns (address auctionOwner) {
                    if (auctionOwner == info.creator) {
                        // 更新支持的代币
                        for (uint j = 0; j < supportedTokenList.length; j++) {
                            address token = supportedTokenList[j];
                            auction.setSupportedToken(token, true);

                            if (tokenPriceFeeds[token] != address(0)) {
                                auction.setTokenPriceFeed(
                                    token,
                                    tokenPriceFeeds[token]
                                );
                            }
                        }
                    }
                } catch {
                    // 忽略失败的更新
                }
            }
        }
    }

    /**
     * @dev 获取拍卖合约信息
     * @param contractId 合约ID
     */
    function getAuctionContractInfo(
        uint256 contractId
    ) external view returns (AuctionContractInfo memory) {
        return auctionContracts[contractId];
    }

    /**
     * @dev 获取创建者的所有合约
     * @param creator 创建者地址
     */
    function getCreatorContracts(
        address creator
    ) external view returns (uint256[] memory) {
        return creatorContracts[creator];
    }

    /**
     * @dev 获取所有活跃的拍卖合约
     * @param offset 偏移量
     * @param limit 限制数量
     */
    function getActiveContracts(
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (
            uint256[] memory contractIds,
            AuctionContractInfo[] memory contractInfos
        )
    {
        require(limit > 0 && limit <= 100, "AuctionFactory: invalid limit");

        // 计算活跃合约数量
        uint256 activeCount = 0;
        for (uint256 i = 1; i < _nextContractId; i++) {
            if (auctionContracts[i].isActive) {
                activeCount++;
            }
        }

        if (offset >= activeCount) {
            return (new uint256[](0), new AuctionContractInfo[](0));
        }

        uint256 returnCount = activeCount - offset;
        if (returnCount > limit) {
            returnCount = limit;
        }

        contractIds = new uint256[](returnCount);
        contractInfos = new AuctionContractInfo[](returnCount);

        uint256 found = 0;
        uint256 skipped = 0;

        for (uint256 i = 1; i < _nextContractId && found < returnCount; i++) {
            if (auctionContracts[i].isActive) {
                if (skipped >= offset) {
                    contractIds[found] = i;
                    contractInfos[found] = auctionContracts[i];
                    found++;
                } else {
                    skipped++;
                }
            }
        }

        return (contractIds, contractInfos);
    }

    /**
     * @dev 获取支持的代币列表
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokenList;
    }

    /**
     * @dev 获取下一个合约ID
     */
    function getNextContractId() external view returns (uint256) {
        return _nextContractId;
    }

    /**
     * @dev 提取平台费用
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(feeRecipient).transfer(balance);
        }
    }

    /**
     * @dev 必需的UUPS升级授权函数
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    // 接收ETH
    receive() external payable {}
}
