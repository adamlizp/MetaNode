// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./NFTAuction.sol";

/**
 * @title CrossChainAuction
 * @dev 跨链NFT拍卖合约，使用Chainlink CCIP实现跨链功能
 *
 * 功能特性:
 * - 支持跨链NFT拍卖
 * - 使用Chainlink CCIP进行跨链消息传递
 * - 跨链出价同步
 * - 跨链拍卖结算
 * - 可升级合约(UUPS模式)
 */
contract CrossChainAuction is
    Initializable,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    // CCIP Router
    IRouterClient private ccipRouter;
    uint64 public ccipChainSelector; // 当前链的链选择器

    // 支持的目标链
    mapping(uint64 => bool) public supportedChains;
    mapping(uint64 => address) public destinationContracts;

    // 跨链拍卖信息
    struct CrossChainAuctionInfo {
        uint256 localAuctionId;
        address localAuctionContract;
        uint64 sourceChainSelector;
        uint256 sourceAuctionId;
        bool isActive;
        uint256 lastSyncBlock;
    }

    mapping(uint256 => CrossChainAuctionInfo) public crossChainAuctions;
    mapping(bytes32 => bool) public processedMessages;

    // 本地拍卖合约
    NFTAuction public localAuctionContract;

    // 跨链消息类型
    enum MessageType {
        BID_PLACED,
        AUCTION_ENDED,
        SYNC_REQUEST,
        REFUND_PROCESSED
    }

    // 跨链出价信息
    struct CrossChainBid {
        address bidder;
        uint256 amount; // USD amount with 18 decimals
        uint64 sourceChain;
        uint256 timestamp;
        MessageType msgType;
    }

    // 事件定义
    event CrossChainAuctionCreated(
        uint256 indexed localAuctionId,
        uint64 indexed sourceChain,
        uint256 indexed sourceAuctionId
    );

    event CrossChainBidReceived(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount,
        uint64 indexed sourceChain
    );

    event CrossChainMessageSent(
        bytes32 indexed messageId,
        uint64 indexed destinationChain,
        MessageType msgType
    );

    event CrossChainMessageReceived(
        bytes32 indexed messageId,
        uint64 indexed sourceChain,
        MessageType msgType
    );

    event CrossChainBidProcessed(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount,
        uint64 sourceChain,
        bool success
    );

    event CrossChainBidError(
        uint256 indexed auctionId,
        address indexed bidder,
        string reason
    );

    event CrossChainAuctionEnded(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 finalPrice
    );

    event CrossChainAuctionError(
        uint256 indexed auctionId,
        string reason
    );

    event CrossChainRefundSent(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount,
        uint64 indexed destinationChain,
        bytes32 messageId
    );

    event CrossChainRefundReceived(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount,
        uint64 indexed sourceChain
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数
     * @param _ccipRouter CCIP路由器地址
     * @param _localAuctionContract 本地拍卖合约地址
     * @param initialOwner 初始所有者
     */
    function initialize(
        address _ccipRouter,
        uint64 _ccipChainSelector,
        address _localAuctionContract,
        address initialOwner
    ) public initializer {
        __ReentrancyGuard_init();
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();

        ccipRouter = IRouterClient(_ccipRouter);
        ccipChainSelector = _ccipChainSelector;
        localAuctionContract = NFTAuction(payable(_localAuctionContract));
    }

    /**
     * @dev 添加支持的目标链
     * @param chainSelector 目标链选择器
     * @param destinationContract 目标合约地址
     */
    function addSupportedChain(
        uint64 chainSelector,
        address destinationContract
    ) external onlyOwner {
        supportedChains[chainSelector] = true;
        destinationContracts[chainSelector] = destinationContract;
    }

    /**
     * @dev 移除支持的目标链
     * @param chainSelector 目标链选择器
     */
    function removeSupportedChain(uint64 chainSelector) external onlyOwner {
        supportedChains[chainSelector] = false;
        delete destinationContracts[chainSelector];
    }

    /**
     * @dev 创建跨链拍卖
     * @param sourceChain 源链选择器
     * @param sourceAuctionId 源链拍卖ID
     * @param nftContract NFT合约地址
     * @param tokenId Token ID
     * @param startPrice 起始价格(USD)
     * @param duration 拍卖持续时间
     */
    function createCrossChainAuction(
        uint64 sourceChain,
        uint256 sourceAuctionId,
        address nftContract,
        uint256 tokenId,
        uint256 startPrice,
        uint256 duration
    ) external onlyOwner returns (uint256) {
        // 创建本地拍卖
        uint256 localAuctionId = localAuctionContract.createAuction(
            nftContract,
            tokenId,
            startPrice,
            duration
        );

        // 记录跨链信息
        crossChainAuctions[localAuctionId] = CrossChainAuctionInfo({
            localAuctionId: localAuctionId,
            localAuctionContract: address(localAuctionContract),
            sourceChainSelector: sourceChain,
            sourceAuctionId: sourceAuctionId,
            isActive: true,
            lastSyncBlock: block.number
        });

        emit CrossChainAuctionCreated(
            localAuctionId,
            sourceChain,
            sourceAuctionId
        );

        return localAuctionId;
    }

    /**
     * @dev 发送跨链出价消息
     * @param destinationChain 目标链
     * @param auctionId 拍卖ID
     * @param bidAmount 出价金额(USD)
     */
    function sendCrossChainBid(
        uint64 destinationChain,
        uint256 auctionId,
        uint256 bidAmount
    ) external payable nonReentrant {
        require(
            supportedChains[destinationChain],
            "CrossChainAuction: unsupported chain"
        );
        require(
            destinationContracts[destinationChain] != address(0),
            "CrossChainAuction: no destination contract"
        );

        // 构建跨链消息
        CrossChainBid memory bid = CrossChainBid({
            bidder: msg.sender,
            amount: bidAmount,
            sourceChain: _getCurrentChainSelector(),
            timestamp: block.timestamp,
            msgType: MessageType.BID_PLACED
        });

        bytes memory data = abi.encode(auctionId, bid);

        // 构建CCIP消息
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(destinationContracts[destinationChain]),
            data: data,
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: 300000, strict: false})
            ),
            feeToken: address(0) // 使用ETH支付费用
        });

        // 计算费用
        uint256 fee = ccipRouter.getFee(destinationChain, message);
        require(msg.value >= fee, "CrossChainAuction: insufficient fee");

        // 发送消息
        bytes32 messageId = ccipRouter.ccipSend{value: fee}(
            destinationChain,
            message
        );

        // 退还多余的ETH
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }

        emit CrossChainMessageSent(
            messageId,
            destinationChain,
            MessageType.BID_PLACED
        );
    }

    /**
     * @dev 接收跨链消息
     * @param message CCIP消息
     */
    function ccipReceive(Client.Any2EVMMessage memory message) external {
        require(
            msg.sender == address(ccipRouter),
            "CrossChainAuction: only router"
        );

        bytes32 messageId = message.messageId;
        require(
            !processedMessages[messageId],
            "CrossChainAuction: message already processed"
        );

        processedMessages[messageId] = true;

        // 解码消息
        (uint256 auctionId, CrossChainBid memory bid) = abi.decode(
            message.data,
            (uint256, CrossChainBid)
        );

        if (bid.msgType == MessageType.BID_PLACED) {
            _processCrossChainBid(auctionId, bid, message.sourceChainSelector);
        } else if (bid.msgType == MessageType.AUCTION_ENDED) {
            _processCrossChainAuctionEnd(auctionId, bid);
        } else if (bid.msgType == MessageType.REFUND_PROCESSED) {
            _processCrossChainRefund(auctionId, bid, message.sourceChainSelector);
        }

        emit CrossChainMessageReceived(
            messageId,
            message.sourceChainSelector,
            bid.msgType
        );
    }

    /**
     * @dev 处理跨链出价
     * @param auctionId 拍卖ID
     * @param bid 出价信息
     * @param sourceChain 源链选择器
     */
    function _processCrossChainBid(
        uint256 auctionId,
        CrossChainBid memory bid,
        uint64 sourceChain
    ) internal {
        require(
            crossChainAuctions[auctionId].isActive,
            "CrossChainAuction: auction not active"
        );

        // 获取拍卖合约地址
        address auctionContract = crossChainAuctions[auctionId].localAuctionContract;
        require(auctionContract != address(0), "CrossChainAuction: invalid auction contract");

        try NFTAuction(payable(auctionContract)).processCrossChainBid(
            auctionId,
            bid.bidder,
            bid.amount,
            uint256(sourceChain)
        ) {
            // 成功处理跨链出价
            emit CrossChainBidProcessed(auctionId, bid.bidder, bid.amount, sourceChain, true);
        } catch Error(string memory reason) {
            // 处理失败，记录错误
            emit CrossChainBidProcessed(auctionId, bid.bidder, bid.amount, sourceChain, false);
            emit CrossChainBidError(auctionId, bid.bidder, reason);
        }

        emit CrossChainBidReceived(
            auctionId,
            bid.bidder,
            bid.amount,
            sourceChain
        );
    }

    /**
     * @dev 处理跨链拍卖结束
     * @param auctionId 拍卖ID
     */
    function _processCrossChainAuctionEnd(
        uint256 auctionId,
        CrossChainBid memory bid
    ) internal {
        CrossChainAuctionInfo storage auctionInfo = crossChainAuctions[auctionId];
        require(auctionInfo.isActive, "CrossChainAuction: auction not active");

        auctionInfo.isActive = false;

        // 获取本地拍卖合约
        address auctionContract = auctionInfo.localAuctionContract;
        require(auctionContract != address(0), "CrossChainAuction: invalid auction contract");

        try NFTAuction(payable(auctionContract)).endAuction(auctionId) {
            emit CrossChainAuctionEnded(auctionId, bid.bidder, bid.amount);
        } catch Error(string memory reason) {
            emit CrossChainAuctionError(auctionId, reason);
        }
    }

    /**
     * @dev 处理跨链退款请求
     * @param auctionId 拍卖ID
     * @param bidder 出价者地址
     * @param amount 退款金额
     * @param destinationChain 目标链
     */
    function processCrossChainRefund(
        uint256 auctionId,
        address bidder,
        uint256 amount,
        uint64 destinationChain
    ) external onlyOwner {
        require(supportedChains[destinationChain], "CrossChainAuction: unsupported chain");
        require(destinationContracts[destinationChain] != address(0), "CrossChainAuction: no destination contract");

        // 构建退款消息
        CrossChainBid memory refundBid = CrossChainBid({
            bidder: bidder,
            amount: amount,
            sourceChain: ccipChainSelector,
            timestamp: block.timestamp,
            msgType: MessageType.REFUND_PROCESSED
        });

        bytes memory data = abi.encode(auctionId, refundBid);

        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(destinationContracts[destinationChain]),
            data: data,
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: Client._argsToBytes(Client.EVMExtraArgsV1({gasLimit: 500_000, strict: false})),
            feeToken: address(0) // 使用ETH支付费用
        });

        uint256 fee = IRouterClient(ccipRouter).getFee(destinationChain, message);
        require(address(this).balance >= fee, "CrossChainAuction: insufficient balance for fees");

        bytes32 messageId = IRouterClient(ccipRouter).ccipSend{value: fee}(destinationChain, message);

        emit CrossChainRefundSent(auctionId, bidder, amount, destinationChain, messageId);
    }

    /**
     * @dev 处理接收到的跨链退款消息
     * @param auctionId 拍卖ID
     * @param bid 退款信息
     * @param sourceChain 源链选择器
     */
    function _processCrossChainRefund(
        uint256 auctionId,
        CrossChainBid memory bid,
        uint64 sourceChain
    ) internal {
        // 这里可以执行实际的退款逻辑
        // 例如：将ETH或代币转给出价者
        // 注意：这需要合约预先持有相应的资金

        emit CrossChainRefundReceived(auctionId, bid.bidder, bid.amount, sourceChain);
    }

    /**
     * @dev 获取当前链选择器
     * @return 当前链选择器
     */
    function _getCurrentChainSelector() internal view returns (uint64) {
        // 这里需要根据实际网络返回对应的链选择器
        // Ethereum Sepolia: 16015286601757825753
        // Polygon Mumbai: 12532609583862916517
        if (block.chainid == 11155111) return 16015286601757825753; // Sepolia
        if (block.chainid == 80001) return 12532609583862916517; // Mumbai
        return 0;
    }

    /**
     * @dev 估算跨链消息费用
     * @param destinationChain 目标链
     * @param auctionId 拍卖ID
     * @param bidAmount 出价金额
     */
    function estimateCrossChainFee(
        uint64 destinationChain,
        uint256 auctionId,
        uint256 bidAmount
    ) external view returns (uint256) {
        require(
            supportedChains[destinationChain],
            "CrossChainAuction: unsupported chain"
        );

        CrossChainBid memory bid = CrossChainBid({
            bidder: msg.sender,
            amount: bidAmount,
            sourceChain: _getCurrentChainSelector(),
            timestamp: block.timestamp,
            msgType: MessageType.BID_PLACED
        });

        bytes memory data = abi.encode(auctionId, bid);

        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(destinationContracts[destinationChain]),
            data: data,
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: 300000, strict: false})
            ),
            feeToken: address(0)
        });

        return ccipRouter.getFee(destinationChain, message);
    }

    /**
     * @dev 获取跨链拍卖信息
     * @param auctionId 拍卖ID
     */
    function getCrossChainAuctionInfo(
        uint256 auctionId
    ) external view returns (CrossChainAuctionInfo memory) {
        return crossChainAuctions[auctionId];
    }

    /**
     * @dev 紧急暂停跨链功能
     * @param auctionId 拍卖ID
     */
    function emergencyPauseCrossChainAuction(
        uint256 auctionId
    ) external onlyOwner {
        crossChainAuctions[auctionId].isActive = false;
    }

    /**
     * @dev 升级授权
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    /**
     * @dev 接收ETH
     */
    receive() external payable {}

    /**
     * @dev 提取合约中的ETH
     */
    function withdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
