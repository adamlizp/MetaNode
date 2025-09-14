// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./AuctionNFT.sol";
import "./AuctionToken.sol";

/**
 * @title NFTAuction
 * @dev NFT拍卖合约，支持ETH和ERC20代币出价，集成Chainlink价格预言机
 *
 * 功能特性:
 * - 创建和管理NFT拍卖
 * - 支持ETH和ERC20代币出价
 * - 集成Chainlink价格预言机进行价格转换
 * - 自动拍卖结束和资金分配
 * - 可升级合约(UUPS模式)
 * - 动态手续费
 */
contract NFTAuction is
    Initializable,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    // 拍卖状态枚举
    enum AuctionStatus {
        Active, // 进行中
        Ended, // 已结束
        Cancelled // 已取消
    }

    // 出价类型枚举
    enum BidType {
        ETH, // 以太坊
        ERC20, // ERC20代币
        CrossChain // 跨链出价
    }

    // 拍卖信息结构
    struct AuctionInfo {
        uint256 tokenId; // NFT Token ID
        address nftContract; // NFT合约地址
        address seller; // 卖家地址
        uint256 startPrice; // 起始价格(USD，18位小数)
        uint256 endTime; // 结束时间
        AuctionStatus status; // 拍卖状态
        address highestBidder; // 最高出价者
        uint256 highestBidAmount; // 最高出价金额(USD，18位小数)
        BidType highestBidType; // 最高出价类型
        uint256 highestBidOriginalAmount; // 最高出价原始金额
        address highestBidToken; // 最高出价代币地址(如果是ERC20)
    }

    // 出价信息结构
    struct BidInfo {
        address bidder; // 出价者
        uint256 amount; // 出价金额(USD，18位小数)
        uint256 originalAmount; // 原始出价金额
        BidType bidType; // 出价类型
        address tokenAddress; // 代币地址(如果是ERC20)
        uint256 timestamp; // 出价时间
    }

    // 状态变量
    uint256 private _nextAuctionId;
    mapping(uint256 => AuctionInfo) public auctions;
    mapping(uint256 => BidInfo[]) public auctionBids;
    mapping(uint256 => mapping(address => uint256)) public bidderRefunds; // 拍卖ID => 出价者 => 退款金额

    // Chainlink价格预言机
    AggregatorV3Interface public ethUsdPriceFeed;
    mapping(address => AggregatorV3Interface) public tokenPriceFeeds;

    // 手续费设置
    uint256 public baseFeeRate; // 基础手续费率 (basis points, 1% = 100)
    uint256 public maxFeeRate; // 最大手续费率
    uint256 public feeThreshold; // 动态手续费阈值(USD)

    // 支持的ERC20代币
    mapping(address => bool) public supportedTokens;
    address[] public supportedTokenList;

    // 事件定义
    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        uint256 startPrice,
        uint256 endTime
    );

    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount,
        uint256 originalAmount,
        BidType bidType,
        address tokenAddress
    );

    event RefundClaimed(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount,
        BidType bidType
    );

    event AuctionEnded(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 finalPrice,
        BidType bidType
    );

    event CrossChainBidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount,
        uint256 sourceChainId
    );

    event CrossChainContractAuthorizationUpdated(
        address indexed crossChainContract,
        bool authorized
    );

    event CrossChainRefundRequired(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount
    );

    event AuctionCancelled(uint256 indexed auctionId);

    event RefundProcessed(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount,
        BidType bidType
    );

    event TokenSupportUpdated(address indexed token, bool supported);
    event PriceFeedUpdated(address indexed token, address priceFeed);
    event FeeRateUpdated(
        uint256 baseFeeRate,
        uint256 maxFeeRate,
        uint256 feeThreshold
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数
     * @param initialOwner 初始所有者
     * @param _ethUsdPriceFeed ETH/USD价格预言机地址
     */
    function initialize(
        address initialOwner,
        address _ethUsdPriceFeed
    ) public initializer {
        __ReentrancyGuard_init();
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();

        _nextAuctionId = 1;
        ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed);

        // 设置默认手续费率
        baseFeeRate = 250; // 2.5%
        maxFeeRate = 1000; // 10%
        feeThreshold = 10000 * 10 ** 18; // $10,000 USD
    }

    /**
     * @dev 创建拍卖
     * @param nftContract NFT合约地址
     * @param tokenId NFT Token ID
     * @param startPrice 起始价格(USD，18位小数)
     * @param duration 拍卖持续时间(秒)
     */
    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 startPrice,
        uint256 duration
    ) external nonReentrant returns (uint256) {
        require(nftContract != address(0), "NFTAuction: invalid NFT contract");
        require(
            startPrice > 0,
            "NFTAuction: start price must be greater than 0"
        );
        require(
            duration >= 3600,
            "NFTAuction: duration must be at least 1 hour"
        );
        require(
            duration <= 30 days,
            "NFTAuction: duration cannot exceed 30 days"
        );

        IERC721 nft = IERC721(nftContract);
        require(
            nft.ownerOf(tokenId) == msg.sender,
            "NFTAuction: not token owner"
        );
        require(
            nft.getApproved(tokenId) == address(this) ||
                nft.isApprovedForAll(msg.sender, address(this)),
            "NFTAuction: not approved"
        );

        uint256 auctionId = _nextAuctionId;
        _nextAuctionId++;

        uint256 endTime = block.timestamp + duration;

        auctions[auctionId] = AuctionInfo({
            tokenId: tokenId,
            nftContract: nftContract,
            seller: msg.sender,
            startPrice: startPrice,
            endTime: endTime,
            status: AuctionStatus.Active,
            highestBidder: address(0),
            highestBidAmount: 0,
            highestBidType: BidType.ETH,
            highestBidOriginalAmount: 0,
            highestBidToken: address(0)
        });

        // 转移NFT到合约
        nft.transferFrom(msg.sender, address(this), tokenId);

        emit AuctionCreated(
            auctionId,
            nftContract,
            tokenId,
            msg.sender,
            startPrice,
            endTime
        );

        return auctionId;
    }

    /**
     * @dev 使用ETH出价
     * @param auctionId 拍卖ID
     */
    function bidWithETH(uint256 auctionId) external payable nonReentrant {
        require(msg.value > 0, "NFTAuction: bid amount must be greater than 0");

        AuctionInfo storage auction = auctions[auctionId];
        require(
            auction.status == AuctionStatus.Active,
            "NFTAuction: auction not active"
        );
        require(block.timestamp < auction.endTime, "NFTAuction: auction ended");
        require(msg.sender != auction.seller, "NFTAuction: seller cannot bid");

        // 获取ETH价格并转换为USD
        uint256 ethPriceUsd = getETHPriceInUSD();
        uint256 bidAmountUsd = (msg.value * ethPriceUsd) / 10 ** 18;

        require(
            bidAmountUsd >= auction.startPrice,
            "NFTAuction: bid below start price"
        );
        require(
            bidAmountUsd > auction.highestBidAmount,
            "NFTAuction: bid too low"
        );

        // 处理之前的最高出价退款
        if (auction.highestBidder != address(0)) {
            bidderRefunds[auctionId][auction.highestBidder] += auction
                .highestBidOriginalAmount;
        }

        // 更新拍卖信息
        auction.highestBidder = msg.sender;
        auction.highestBidAmount = bidAmountUsd;
        auction.highestBidType = BidType.ETH;
        auction.highestBidOriginalAmount = msg.value;
        auction.highestBidToken = address(0);

        // 记录出价
        auctionBids[auctionId].push(
            BidInfo({
                bidder: msg.sender,
                amount: bidAmountUsd,
                originalAmount: msg.value,
                bidType: BidType.ETH,
                tokenAddress: address(0),
                timestamp: block.timestamp
            })
        );

        emit BidPlaced(
            auctionId,
            msg.sender,
            bidAmountUsd,
            msg.value,
            BidType.ETH,
            address(0)
        );
    }

    /**
     * @dev 使用ERC20代币出价
     * @param auctionId 拍卖ID
     * @param tokenAddress 代币合约地址
     * @param amount 出价数量
     */
    function bidWithERC20(
        uint256 auctionId,
        address tokenAddress,
        uint256 amount
    ) external nonReentrant {
        require(amount > 0, "NFTAuction: bid amount must be greater than 0");
        require(
            supportedTokens[tokenAddress],
            "NFTAuction: token not supported"
        );

        AuctionInfo storage auction = auctions[auctionId];
        require(
            auction.status == AuctionStatus.Active,
            "NFTAuction: auction not active"
        );
        require(block.timestamp < auction.endTime, "NFTAuction: auction ended");
        require(msg.sender != auction.seller, "NFTAuction: seller cannot bid");

        IERC20 token = IERC20(tokenAddress);
        require(
            token.balanceOf(msg.sender) >= amount,
            "NFTAuction: insufficient token balance"
        );
        require(
            token.allowance(msg.sender, address(this)) >= amount,
            "NFTAuction: insufficient allowance"
        );

        // 获取代币价格并转换为USD
        uint256 tokenPriceUsd = getTokenPriceInUSD(tokenAddress);
        uint256 bidAmountUsd = (amount * tokenPriceUsd) / 10 ** 18;

        require(
            bidAmountUsd >= auction.startPrice,
            "NFTAuction: bid below start price"
        );
        require(
            bidAmountUsd > auction.highestBidAmount,
            "NFTAuction: bid too low"
        );

        // 处理之前的最高出价退款
        if (auction.highestBidder != address(0)) {
            bidderRefunds[auctionId][auction.highestBidder] += auction
                .highestBidOriginalAmount;
        }

        // 转移代币到合约
        token.transferFrom(msg.sender, address(this), amount);

        // 更新拍卖信息
        auction.highestBidder = msg.sender;
        auction.highestBidAmount = bidAmountUsd;
        auction.highestBidType = BidType.ERC20;
        auction.highestBidOriginalAmount = amount;
        auction.highestBidToken = tokenAddress;

        // 记录出价
        auctionBids[auctionId].push(
            BidInfo({
                bidder: msg.sender,
                amount: bidAmountUsd,
                originalAmount: amount,
                bidType: BidType.ERC20,
                tokenAddress: tokenAddress,
                timestamp: block.timestamp
            })
        );

        emit BidPlaced(
            auctionId,
            msg.sender,
            bidAmountUsd,
            amount,
            BidType.ERC20,
            tokenAddress
        );
    }

    /**
     * @dev 结束拍卖
     * @param auctionId 拍卖ID
     */
    function endAuction(uint256 auctionId) external nonReentrant {
        AuctionInfo storage auction = auctions[auctionId];
        require(
            auction.status == AuctionStatus.Active,
            "NFTAuction: auction not active"
        );
        require(
            block.timestamp >= auction.endTime || msg.sender == auction.seller,
            "NFTAuction: auction not ended and caller not seller"
        );

        auction.status = AuctionStatus.Ended;

        if (auction.highestBidder != address(0)) {
            // 计算手续费
            uint256 fee = calculateFee(auction.highestBidAmount);
            uint256 sellerAmount = auction.highestBidOriginalAmount;

            if (auction.highestBidType == BidType.ETH) {
                // 扣除手续费
                uint256 feeInETH = (auction.highestBidOriginalAmount * fee) /
                    auction.highestBidAmount;
                sellerAmount -= feeInETH;

                // 转账给卖家
                payable(auction.seller).transfer(sellerAmount);
            } else {
                // ERC20代币
                IERC20 token = IERC20(auction.highestBidToken);
                uint256 feeInToken = (auction.highestBidOriginalAmount * fee) /
                    auction.highestBidAmount;
                sellerAmount -= feeInToken;

                // 转账给卖家
                token.transfer(auction.seller, sellerAmount);
            }

            // 转移NFT给获胜者
            IERC721(auction.nftContract).transferFrom(
                address(this),
                auction.highestBidder,
                auction.tokenId
            );

            emit AuctionEnded(
                auctionId,
                auction.highestBidder,
                auction.highestBidAmount,
                auction.highestBidType
            );
        } else {
            // 没有出价者，退还NFT给卖家
            IERC721(auction.nftContract).transferFrom(
                address(this),
                auction.seller,
                auction.tokenId
            );

            emit AuctionEnded(auctionId, address(0), 0, BidType.ETH);
        }
    }

    /**
     * @dev 取消拍卖(只有卖家可以调用，且没有出价时)
     * @param auctionId 拍卖ID
     */
    function cancelAuction(uint256 auctionId) external nonReentrant {
        AuctionInfo storage auction = auctions[auctionId];
        require(
            auction.seller == msg.sender,
            "NFTAuction: only seller can cancel"
        );
        require(
            auction.status == AuctionStatus.Active,
            "NFTAuction: auction not active"
        );
        require(
            auction.highestBidder == address(0),
            "NFTAuction: auction has bids"
        );

        auction.status = AuctionStatus.Cancelled;

        // 退还NFT给卖家
        IERC721(auction.nftContract).transferFrom(
            address(this),
            auction.seller,
            auction.tokenId
        );

        emit AuctionCancelled(auctionId);
    }

    /**
     * @dev 处理退款
     * @param auctionId 拍卖ID
     */
    function processRefund(uint256 auctionId) external nonReentrant {
        uint256 refundAmount = bidderRefunds[auctionId][msg.sender];
        require(refundAmount > 0, "NFTAuction: no refund available");

        AuctionInfo storage auction = auctions[auctionId];
        require(
            auction.status == AuctionStatus.Ended,
            "NFTAuction: auction not ended"
        );

        bidderRefunds[auctionId][msg.sender] = 0;

        // 根据出价类型进行退款
        BidInfo[] storage bids = auctionBids[auctionId];
        BidType refundType = BidType.ETH;
        address refundToken = address(0);

        // 找到对应的出价记录
        for (uint i = bids.length; i > 0; i--) {
            if (
                bids[i - 1].bidder == msg.sender &&
                bids[i - 1].originalAmount == refundAmount
            ) {
                refundType = bids[i - 1].bidType;
                refundToken = bids[i - 1].tokenAddress;
                break;
            }
        }

        if (refundType == BidType.ETH) {
            payable(msg.sender).transfer(refundAmount);
        } else if (refundType == BidType.ERC20) {
            IERC20(refundToken).transfer(msg.sender, refundAmount);
        } else {
            // CrossChain 出价者的退款需要通过跨链消息处理，这里不直接处理
            revert("NFTAuction: cross chain refunds handled separately");
        }

        emit RefundProcessed(auctionId, msg.sender, refundAmount, refundType);
    }

    /**
     * @dev 获取ETH价格(USD)
     */
    function getETHPriceInUSD() public view returns (uint256) {
        (, int256 price, , , ) = ethUsdPriceFeed.latestRoundData();
        require(price > 0, "NFTAuction: invalid ETH price");

        // Chainlink价格是8位小数，转换为18位小数
        return uint256(price) * 10 ** 10;
    }

    /**
     * @dev 获取ERC20代币价格(USD)
     * @param tokenAddress 代币合约地址
     */
    function getTokenPriceInUSD(
        address tokenAddress
    ) public view returns (uint256) {
        require(
            address(tokenPriceFeeds[tokenAddress]) != address(0),
            "NFTAuction: price feed not set"
        );

        (, int256 price, , , ) = tokenPriceFeeds[tokenAddress]
            .latestRoundData();
        require(price > 0, "NFTAuction: invalid token price");

        // Chainlink价格是8位小数，转换为18位小数
        return uint256(price) * 10 ** 10;
    }

    /**
     * @dev 计算动态手续费
     * @param auctionValue 拍卖价值(USD)
     */
    function calculateFee(uint256 auctionValue) public view returns (uint256) {
        if (auctionValue <= feeThreshold) {
            return (auctionValue * baseFeeRate) / 10000;
        } else {
            // 动态手续费：超过阈值的部分使用更高费率
            uint256 baseFee = (feeThreshold * baseFeeRate) / 10000;
            uint256 excessAmount = auctionValue - feeThreshold;
            uint256 excessFee = (excessAmount * maxFeeRate) / 10000;
            return baseFee + excessFee;
        }
    }

    /**
     * @dev 设置支持的ERC20代币
     * @param tokenAddress 代币合约地址
     * @param supported 是否支持
     */
    function setSupportedToken(
        address tokenAddress,
        bool supported
    ) external onlyOwner {
        require(
            tokenAddress != address(0),
            "NFTAuction: invalid token address"
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
     * @param tokenAddress 代币合约地址
     * @param priceFeed 价格预言机地址
     */
    function setTokenPriceFeed(
        address tokenAddress,
        address priceFeed
    ) external onlyOwner {
        require(
            tokenAddress != address(0),
            "NFTAuction: invalid token address"
        );
        require(
            priceFeed != address(0),
            "NFTAuction: invalid price feed address"
        );

        tokenPriceFeeds[tokenAddress] = AggregatorV3Interface(priceFeed);
        emit PriceFeedUpdated(tokenAddress, priceFeed);
    }

    /**
     * @dev 设置手续费率
     * @param _baseFeeRate 基础手续费率
     * @param _maxFeeRate 最大手续费率
     * @param _feeThreshold 动态手续费阈值
     */
    function setFeeRates(
        uint256 _baseFeeRate,
        uint256 _maxFeeRate,
        uint256 _feeThreshold
    ) external onlyOwner {
        require(_baseFeeRate <= 1000, "NFTAuction: base fee rate too high"); // 最大10%
        require(_maxFeeRate <= 2000, "NFTAuction: max fee rate too high"); // 最大20%
        require(
            _maxFeeRate >= _baseFeeRate,
            "NFTAuction: max fee rate must be >= base fee rate"
        );
        require(
            _feeThreshold > 0,
            "NFTAuction: fee threshold must be greater than 0"
        );

        baseFeeRate = _baseFeeRate;
        maxFeeRate = _maxFeeRate;
        feeThreshold = _feeThreshold;

        emit FeeRateUpdated(_baseFeeRate, _maxFeeRate, _feeThreshold);
    }

    /**
     * @dev 获取拍卖信息
     * @param auctionId 拍卖ID
     */
    function getAuctionInfo(
        uint256 auctionId
    ) external view returns (AuctionInfo memory) {
        return auctions[auctionId];
    }

    /**
     * @dev 获取拍卖出价历史
     * @param auctionId 拍卖ID
     */
    function getAuctionBids(
        uint256 auctionId
    ) external view returns (BidInfo[] memory) {
        return auctionBids[auctionId];
    }

    /**
     * @dev 获取支持的代币列表
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokenList;
    }

    /**
     * @dev 提取手续费收入
     */
    function withdrawFees() external onlyOwner {
        uint256 ethBalance = address(this).balance;
        if (ethBalance > 0) {
            payable(owner()).transfer(ethBalance);
        }

        // 提取所有支持的ERC20代币手续费
        for (uint i = 0; i < supportedTokenList.length; i++) {
            IERC20 token = IERC20(supportedTokenList[i]);
            uint256 tokenBalance = token.balanceOf(address(this));
            if (tokenBalance > 0) {
                token.transfer(owner(), tokenBalance);
            }
        }
    }

    // 跨链拍卖管理
    mapping(address => bool) public authorizedCrossChainContracts;

    /**
     * @dev 设置授权的跨链合约
     * @param crossChainContract 跨链合约地址
     * @param authorized 是否授权
     */
    function setAuthorizedCrossChainContract(address crossChainContract, bool authorized) external onlyOwner {
        require(crossChainContract != address(0), "NFTAuction: invalid cross chain contract");
        authorizedCrossChainContracts[crossChainContract] = authorized;
        emit CrossChainContractAuthorizationUpdated(crossChainContract, authorized);
    }

    /**
     * @dev 跨链出价接口 - 只允许授权的跨链合约调用
     * @param auctionId 拍卖ID
     * @param bidder 出价者地址（来自其他链）
     * @param bidAmount 出价金额(USD)
     * @param sourceChainId 源链ID
     */
    function processCrossChainBid(
        uint256 auctionId,
        address bidder,
        uint256 bidAmount,
        uint256 sourceChainId
    ) external nonReentrant {
        require(
            authorizedCrossChainContracts[msg.sender],
            "NFTAuction: not authorized cross chain contract"
        );
        require(auctions[auctionId].seller != address(0), "NFTAuction: auction not exists");
        require(auctions[auctionId].status == AuctionStatus.Active, "NFTAuction: auction not active");
        require(block.timestamp < auctions[auctionId].endTime, "NFTAuction: auction ended");
        require(bidAmount > auctions[auctionId].startPrice, "NFTAuction: bid too low");
        require(bidAmount > auctions[auctionId].highestBidAmount, "NFTAuction: bid not high enough");

        AuctionInfo storage auction = auctions[auctionId];

        // 如果有之前的最高出价者，设置退款（但跨链出价者无法直接退款）
        if (auction.highestBidder != address(0) && auction.highestBidType == BidType.ETH) {
            bidderRefunds[auctionId][auction.highestBidder] += auction.highestBidOriginalAmount;
        } else if (auction.highestBidder != address(0) && auction.highestBidType == BidType.ERC20) {
            // 对于ERC20代币，也需要设置退款
            bidderRefunds[auctionId][auction.highestBidder] += auction.highestBidOriginalAmount;
        }

        // 更新拍卖状态
        auction.highestBidder = bidder;
        auction.highestBidAmount = bidAmount;
        auction.highestBidType = BidType.CrossChain; // 新增跨链出价类型
        auction.highestBidOriginalAmount = bidAmount;

        // 记录跨链出价
        auctionBids[auctionId].push(BidInfo({
            bidder: bidder,
            amount: bidAmount,
            originalAmount: bidAmount,
            bidType: BidType.CrossChain,
            tokenAddress: address(0), // 跨链出价没有具体代币地址
            timestamp: block.timestamp
        }));

        emit CrossChainBidPlaced(auctionId, bidder, bidAmount, sourceChainId);
    }

    /**
     * @dev 必需的UUPS升级授权函数
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    /**
     * @dev 用户主动领取退款
     * @param auctionId 拍卖ID
     */
    function claimRefund(uint256 auctionId) external nonReentrant {
        require(auctions[auctionId].seller != address(0), "NFTAuction: auction not exists");
        require(bidderRefunds[auctionId][msg.sender] > 0, "NFTAuction: no refund available");

        uint256 refundAmount = bidderRefunds[auctionId][msg.sender];
        bidderRefunds[auctionId][msg.sender] = 0;

        // 获取出价历史找到退款的代币类型
        BidInfo[] storage bids = auctionBids[auctionId];
        BidType refundType = BidType.ETH;
        address tokenAddress = address(0);

        // 找到该用户的最后一次出价类型
        for (uint256 i = bids.length; i > 0; i--) {
            if (bids[i - 1].bidder == msg.sender) {
                refundType = bids[i - 1].bidType;
                tokenAddress = bids[i - 1].tokenAddress;
                break;
            }
        }

        if (refundType == BidType.ETH) {
            (bool success, ) = msg.sender.call{value: refundAmount}("");
            require(success, "NFTAuction: ETH transfer failed");
        } else if (refundType == BidType.ERC20) {
            IERC20(tokenAddress).transfer(msg.sender, refundAmount);
        } else {
            // CrossChain 出价者无法直接领取退款，需要通过跨链消息处理
            revert("NFTAuction: cross chain refunds not supported via direct claim");
        }

        emit RefundClaimed(auctionId, msg.sender, refundAmount, refundType);
    }

    /**
     * @dev 批量领取多个拍卖的退款
     * @param auctionIds 拍卖ID数组
     */
    function batchClaimRefunds(uint256[] calldata auctionIds) external nonReentrant {
        require(auctionIds.length > 0, "NFTAuction: empty auction list");
        require(auctionIds.length <= 20, "NFTAuction: too many auctions");

        for (uint256 i = 0; i < auctionIds.length; i++) {
            uint256 auctionId = auctionIds[i];
            if (bidderRefunds[auctionId][msg.sender] > 0) {
                uint256 refundAmount = bidderRefunds[auctionId][msg.sender];
                bidderRefunds[auctionId][msg.sender] = 0;

                // 获取退款类型
                BidInfo[] storage bids = auctionBids[auctionId];
                BidType refundType = BidType.ETH;
                address tokenAddress = address(0);

                for (uint256 j = bids.length; j > 0; j--) {
                    if (bids[j - 1].bidder == msg.sender) {
                        refundType = bids[j - 1].bidType;
                        tokenAddress = bids[j - 1].tokenAddress;
                        break;
                    }
                }

                if (refundType == BidType.ETH) {
                    (bool success, ) = msg.sender.call{value: refundAmount}("");
                    require(success, "NFTAuction: ETH transfer failed");
                } else if (refundType == BidType.ERC20) {
                    IERC20(tokenAddress).transfer(msg.sender, refundAmount);
                } else {
                    // 跨链退款跳过，需要通过跨链消息处理
                    emit CrossChainRefundRequired(auctionId, msg.sender, refundAmount);
                    continue;
                }

                emit RefundClaimed(auctionId, msg.sender, refundAmount, refundType);
            }
        }
    }

    /**
     * @dev 查询用户在指定拍卖的退款金额
     * @param auctionId 拍卖ID
     * @param bidder 出价者地址
     * @return refundAmount 退款金额
     */
    function getRefundAmount(uint256 auctionId, address bidder) external view returns (uint256) {
        return bidderRefunds[auctionId][bidder];
    }

    /**
     * @dev 查询用户在多个拍卖的退款金额
     * @param auctionIds 拍卖ID数组
     * @param bidder 出价者地址
     * @return refundAmounts 退款金额数组
     */
    function batchGetRefundAmounts(
        uint256[] calldata auctionIds,
        address bidder
    ) external view returns (uint256[] memory refundAmounts) {
        refundAmounts = new uint256[](auctionIds.length);
        for (uint256 i = 0; i < auctionIds.length; i++) {
            refundAmounts[i] = bidderRefunds[auctionIds[i]][bidder];
        }
    }

    // 紧急情况下的函数
    receive() external payable {}

    fallback() external payable {}
}
