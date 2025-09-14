// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title PriceAggregator
 * @dev 多预言机价格聚合器，提供更安全可靠的价格数据
 *
 * 功能特性:
 * - 支持多个价格预言机数据源
 * - 价格偏差检测和异常处理
 * - 加权平均价格计算
 * - 紧急价格更新机制
 * - 可升级合约(UUPS模式)
 * - 历史价格追踪
 */
contract PriceAggregator is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    PausableUpgradeable
{
    // 价格源信息
    struct PriceSource {
        AggregatorV3Interface aggregator;
        uint256 weight; // 权重 (basis points, 10000 = 100%)
        bool isActive;
        uint256 maxDeviationPercentage; // 最大偏差百分比
        uint256 maxStalenessSeconds; // 最大陈旧时间(秒)
        string description;
    }
    
    // 聚合价格信息
    struct AggregatedPrice {
        uint256 price;
        uint256 timestamp;
        uint256 confidence; // 置信度 (0-10000, 10000 = 100%)
        uint8 decimals;
    }
    
    // 价格历史记录
    struct PriceHistory {
        uint256 price;
        uint256 timestamp;
        bytes32 sourceHash; // 价格源哈希
    }
    
    // 状态变量
    mapping(address => mapping(uint256 => PriceSource)) public priceSources; // token => sourceId => PriceSource
    mapping(address => uint256) public sourceCount; // token => source count
    mapping(address => AggregatedPrice) public aggregatedPrices; // token => aggregated price
    mapping(address => uint256) public emergencyPrices; // 紧急价格
    mapping(address => bool) public emergencyMode; // 紧急模式
    
    // 价格历史
    mapping(address => PriceHistory[]) public priceHistory;
    mapping(address => uint256) public maxHistoryLength;
    
    // 全局配置
    uint256 public constant MAX_DEVIATION_PERCENTAGE = 5000; // 50% 最大偏差
    uint256 public constant MIN_SOURCES_REQUIRED = 2; // 最少需要2个价格源
    uint256 public defaultMaxStaleness; // 默认最大陈旧时间
    uint256 public priceValidityDuration; // 价格有效期
    
    // 价格更新者（可以是自动化系统）
    mapping(address => bool) public priceUpdaters;
    
    // 事件定义
    event PriceSourceAdded(
        address indexed token,
        uint256 indexed sourceId,
        address aggregator,
        uint256 weight
    );
    
    event PriceSourceUpdated(
        address indexed token,
        uint256 indexed sourceId,
        uint256 newWeight,
        bool isActive
    );
    
    event PriceSourceRemoved(
        address indexed token,
        uint256 indexed sourceId
    );
    
    event AggregatedPriceUpdated(
        address indexed token,
        uint256 price,
        uint256 confidence,
        uint256 timestamp
    );
    
    event PriceDeviationDetected(
        address indexed token,
        uint256 indexed sourceId,
        uint256 price,
        uint256 expectedPrice,
        uint256 deviation
    );
    
    event EmergencyPriceSet(
        address indexed token,
        uint256 price,
        address setter
    );
    
    event EmergencyModeActivated(address indexed token, string reason);
    event EmergencyModeDeactivated(address indexed token);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev 初始化函数
     * @param initialOwner 初始所有者
     */
    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        __Pausable_init();
        
        defaultMaxStaleness = 3600; // 1小时
        priceValidityDuration = 300; // 5分钟
    }
    
    /**
     * @dev 添加价格源
     * @param token 代币地址
     * @param aggregator 预言机地址
     * @param weight 权重
     * @param maxDeviationPercentage 最大偏差百分比
     * @param maxStalenessSeconds 最大陈旧时间
     * @param description 描述
     */
    function addPriceSource(
        address token,
        address aggregator,
        uint256 weight,
        uint256 maxDeviationPercentage,
        uint256 maxStalenessSeconds,
        string memory description
    ) external onlyOwner {
        require(aggregator != address(0), "PriceAggregator: invalid aggregator");
        require(weight > 0 && weight <= 10000, "PriceAggregator: invalid weight");
        require(maxDeviationPercentage <= MAX_DEVIATION_PERCENTAGE, "PriceAggregator: deviation too high");
        
        uint256 sourceId = sourceCount[token];
        
        priceSources[token][sourceId] = PriceSource({
            aggregator: AggregatorV3Interface(aggregator),
            weight: weight,
            isActive: true,
            maxDeviationPercentage: maxDeviationPercentage,
            maxStalenessSeconds: maxStalenessSeconds > 0 ? maxStalenessSeconds : defaultMaxStaleness,
            description: description
        });
        
        sourceCount[token]++;
        
        // 初始化历史记录长度
        if (maxHistoryLength[token] == 0) {
            maxHistoryLength[token] = 100;
        }
        
        emit PriceSourceAdded(token, sourceId, aggregator, weight);
    }
    
    /**
     * @dev 更新价格源
     * @param token 代币地址
     * @param sourceId 价格源ID
     * @param newWeight 新权重
     * @param isActive 是否激活
     */
    function updatePriceSource(
        address token,
        uint256 sourceId,
        uint256 newWeight,
        bool isActive
    ) external onlyOwner {
        require(sourceId < sourceCount[token], "PriceAggregator: invalid source id");
        require(newWeight <= 10000, "PriceAggregator: invalid weight");
        
        priceSources[token][sourceId].weight = newWeight;
        priceSources[token][sourceId].isActive = isActive;
        
        emit PriceSourceUpdated(token, sourceId, newWeight, isActive);
    }
    
    /**
     * @dev 获取聚合价格
     * @param token 代币地址
     * @return price 价格
     * @return confidence 置信度
     * @return timestamp 时间戳
     */
    function getAggregatedPrice(address token)
        external
        view
        returns (uint256 price, uint256 confidence, uint256 timestamp)
    {
        if (emergencyMode[token]) {
            return (emergencyPrices[token], 10000, block.timestamp);
        }
        
        AggregatedPrice memory aggregated = aggregatedPrices[token];
        
        // 检查价格是否仍然有效
        if (block.timestamp - aggregated.timestamp > priceValidityDuration) {
            // 尝试实时计算
            return _calculateAggregatedPrice(token);
        }
        
        return (aggregated.price, aggregated.confidence, aggregated.timestamp);
    }
    
    /**
     * @dev 更新聚合价格
     * @param token 代币地址
     */
    function updateAggregatedPrice(address token) external whenNotPaused {
        require(
            priceUpdaters[msg.sender] || msg.sender == owner(),
            "PriceAggregator: not authorized"
        );
        
        if (emergencyMode[token]) {
            return; // 紧急模式下不更新
        }
        
        (uint256 price, uint256 confidence, uint256 timestamp) = _calculateAggregatedPrice(token);
        
        if (price > 0) {
            aggregatedPrices[token] = AggregatedPrice({
                price: price,
                timestamp: timestamp,
                confidence: confidence,
                decimals: 18
            });
            
            // 记录价格历史
            _recordPriceHistory(token, price);
            
            emit AggregatedPriceUpdated(token, price, confidence, timestamp);
        }
    }
    
    /**
     * @dev 计算聚合价格
     * @param token 代币地址
     * @return price 聚合价格
     * @return confidence 置信度
     * @return timestamp 时间戳
     */
    function _calculateAggregatedPrice(address token)
        internal
        view
        returns (uint256 price, uint256 confidence, uint256 timestamp)
    {
        uint256 totalWeight = 0;
        uint256 weightedPriceSum = 0;
        uint256 validSources = 0;
        uint256[] memory prices = new uint256[](sourceCount[token]);
        uint256[] memory weights = new uint256[](sourceCount[token]);
        
        // 收集所有有效价格
        for (uint256 i = 0; i < sourceCount[token]; i++) {
            PriceSource storage source = priceSources[token][i];
            
            if (!source.isActive) continue;
            
            try source.aggregator.latestRoundData() returns (
                uint80,
                int256 price_,
                uint256,
                uint256 updatedAt,
                uint80
            ) {
                if (price_ > 0 && block.timestamp - updatedAt <= source.maxStalenessSeconds) {
                    uint256 normalizedPrice = uint256(price_) * 10 ** (18 - source.aggregator.decimals());
                    
                    prices[validSources] = normalizedPrice;
                    weights[validSources] = source.weight;
                    validSources++;
                }
            } catch {
                // 预言机调用失败，跳过
                continue;
            }
        }
        
        require(validSources >= MIN_SOURCES_REQUIRED, "PriceAggregator: insufficient valid sources");
        
        // 检查价格偏差
        uint256 avgPrice = _calculateAverage(prices, validSources);
        for (uint256 i = 0; i < validSources; i++) {
            uint256 deviation = prices[i] > avgPrice 
                ? ((prices[i] - avgPrice) * 10000) / avgPrice
                : ((avgPrice - prices[i]) * 10000) / avgPrice;
            
            if (deviation <= priceSources[token][i].maxDeviationPercentage) {
                totalWeight += weights[i];
                weightedPriceSum += prices[i] * weights[i];
            } else {
                // 价格偏差检测到，但view函数不能发出事件
            }
        }
        
        if (totalWeight == 0) {
            return (0, 0, block.timestamp);
        }
        
        price = weightedPriceSum / totalWeight;
        confidence = (validSources * 10000) / sourceCount[token]; // 基于有效源数量的置信度
        timestamp = block.timestamp;
    }
    
    /**
     * @dev 计算平均价格
     * @param prices 价格数组
     * @param length 有效长度
     * @return 平均价格
     */
    function _calculateAverage(uint256[] memory prices, uint256 length)
        internal
        pure
        returns (uint256)
    {
        if (length == 0) return 0;
        
        uint256 sum = 0;
        for (uint256 i = 0; i < length; i++) {
            sum += prices[i];
        }
        return sum / length;
    }
    
    /**
     * @dev 记录价格历史
     * @param token 代币地址
     * @param price 价格
     */
    function _recordPriceHistory(address token, uint256 price) internal {
        PriceHistory[] storage history = priceHistory[token];
        
        // 如果历史记录已满，移除最旧的记录
        if (history.length >= maxHistoryLength[token]) {
            for (uint256 i = 0; i < history.length - 1; i++) {
                history[i] = history[i + 1];
            }
            history.pop();
        }
        
        history.push(PriceHistory({
            price: price,
            timestamp: block.timestamp,
            sourceHash: keccak256(abi.encodePacked(token, block.timestamp, price))
        }));
    }
    
    /**
     * @dev 设置紧急价格
     * @param token 代币地址
     * @param price 紧急价格
     * @param reason 原因
     */
    function setEmergencyPrice(
        address token,
        uint256 price,
        string memory reason
    ) external onlyOwner {
        emergencyPrices[token] = price;
        emergencyMode[token] = true;
        
        emit EmergencyPriceSet(token, price, msg.sender);
        emit EmergencyModeActivated(token, reason);
    }
    
    /**
     * @dev 退出紧急模式
     * @param token 代币地址
     */
    function exitEmergencyMode(address token) external onlyOwner {
        emergencyMode[token] = false;
        emit EmergencyModeDeactivated(token);
    }
    
    /**
     * @dev 添加价格更新者
     * @param updater 更新者地址
     */
    function addPriceUpdater(address updater) external onlyOwner {
        priceUpdaters[updater] = true;
    }
    
    /**
     * @dev 移除价格更新者
     * @param updater 更新者地址
     */
    function removePriceUpdater(address updater) external onlyOwner {
        priceUpdaters[updater] = false;
    }
    
    /**
     * @dev 获取价格历史
     * @param token 代币地址
     * @param limit 限制数量
     * @return history 价格历史数组
     */
    function getPriceHistory(address token, uint256 limit)
        external
        view
        returns (PriceHistory[] memory history)
    {
        PriceHistory[] storage fullHistory = priceHistory[token];
        uint256 length = fullHistory.length;
        uint256 returnLength = limit > length ? length : limit;
        
        history = new PriceHistory[](returnLength);
        
        for (uint256 i = 0; i < returnLength; i++) {
            history[i] = fullHistory[length - returnLength + i];
        }
    }
    
    /**
     * @dev 暂停合约
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev 恢复合约
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev 升级授权
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}