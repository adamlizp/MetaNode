// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./NFTAuction.sol";
import "./AuctionNFT.sol";
import "./AuctionToken.sol";

/**
 * @title BatchOperations
 * @dev Gas优化的批量操作合约，减少交易成本和提高效率
 *
 * 功能特性:
 * - 批量创建拍卖
 * - 批量出价
 * - 批量结束拍卖
 * - 批量退款处理
 * - Gas优化的数据打包
 * - 可升级合约(UUPS模式)
 */
contract BatchOperations is
    Initializable,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    // 拍卖合约引用
    NFTAuction public auctionContract;
    AuctionNFT public nftContract;
    AuctionToken public tokenContract;
    
    // 批量创建拍卖参数
    struct BatchAuctionParams {
        address nftContract;
        uint256[] tokenIds;
        uint256[] startPrices;
        uint256[] durations;
    }
    
    // 批量出价参数
    struct BatchBidParams {
        uint256[] auctionIds;
        uint256[] bidAmounts;
        address[] tokenAddresses; // ERC20代币地址，address(0)表示ETH
    }
    
    // Gas优化的拍卖数据打包
    struct PackedAuctionData {
        uint128 tokenId;
        uint128 startPrice; // 压缩到128位
        uint64 duration;
        uint64 unused; // 预留字段
    }
    
    // 事件定义
    event BatchAuctionsCreated(
        address indexed creator,
        uint256[] auctionIds,
        uint256 totalCount
    );
    
    event BatchBidsPlaced(
        address indexed bidder,
        uint256[] auctionIds,
        uint256[] amounts,
        uint256 totalGasUsed
    );
    
    event BatchAuctionsEnded(
        uint256[] auctionIds,
        address[] winners,
        uint256 totalProcessed
    );
    
    event GasOptimizationApplied(
        string operation,
        uint256 gasSaved,
        uint256 itemsProcessed
    );
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev 初始化函数
     * @param _auctionContract 拍卖合约地址
     * @param _nftContract NFT合约地址
     * @param _tokenContract 代币合约地址
     * @param initialOwner 初始所有者
     */
    function initialize(
        address _auctionContract,
        address _nftContract,
        address _tokenContract,
        address initialOwner
    ) public initializer {
        __ReentrancyGuard_init();
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        
        auctionContract = NFTAuction(payable(_auctionContract));
        nftContract = AuctionNFT(_nftContract);
        tokenContract = AuctionToken(_tokenContract);
    }
    
    /**
     * @dev 批量创建拍卖（Gas优化版本）
     * @param params 批量拍卖参数
     * @return auctionIds 创建的拍卖ID数组
     */
    function batchCreateAuctions(BatchAuctionParams calldata params)
        external
        nonReentrant
        returns (uint256[] memory auctionIds)
    {
        uint256 length = params.tokenIds.length;
        require(length > 0 && length <= 50, "BatchOperations: invalid batch size");
        require(
            length == params.startPrices.length && 
            length == params.durations.length,
            "BatchOperations: array length mismatch"
        );
        
        uint256 gasBefore = gasleft();
        
        auctionIds = new uint256[](length);
        
        // Gas优化：减少外部调用次数
        IERC721 nft = IERC721(params.nftContract);
        require(
            nft.isApprovedForAll(msg.sender, address(auctionContract)),
            "BatchOperations: not approved for all"
        );
        
        // 批量验证所有权（单次循环）
        for (uint256 i = 0; i < length;) {
            require(
                nft.ownerOf(params.tokenIds[i]) == msg.sender,
                "BatchOperations: not token owner"
            );
            unchecked { ++i; }
        }
        
        // 批量创建拍卖
        for (uint256 i = 0; i < length;) {
            auctionIds[i] = auctionContract.createAuction(
                params.nftContract,
                params.tokenIds[i],
                params.startPrices[i],
                params.durations[i]
            );
            unchecked { ++i; }
        }
        
        uint256 gasUsed = gasBefore - gasleft();
        
        emit BatchAuctionsCreated(msg.sender, auctionIds, length);
        emit GasOptimizationApplied("batchCreateAuctions", gasUsed / length, length);
        
        return auctionIds;
    }
    
    /**
     * @dev 批量出价（Gas优化版本）
     * @param params 批量出价参数
     */
    function batchPlaceBids(BatchBidParams calldata params)
        external
        payable
        nonReentrant
    {
        uint256 length = params.auctionIds.length;
        require(length > 0 && length <= 20, "BatchOperations: invalid batch size");
        require(
            length == params.bidAmounts.length && 
            length == params.tokenAddresses.length,
            "BatchOperations: array length mismatch"
        );
        
        uint256 gasBefore = gasleft();
        uint256 totalETHRequired = 0;
        
        // 预计算ETH需求总量
        for (uint256 i = 0; i < length;) {
            if (params.tokenAddresses[i] == address(0)) {
                totalETHRequired += params.bidAmounts[i];
            }
            unchecked { ++i; }
        }
        
        require(msg.value >= totalETHRequired, "BatchOperations: insufficient ETH");
        
        // 批量出价
        uint256 ethUsed = 0;
        for (uint256 i = 0; i < length;) {
            if (params.tokenAddresses[i] == address(0)) {
                // ETH出价
                uint256 bidAmount = params.bidAmounts[i];
                auctionContract.bidWithETH{value: bidAmount}(params.auctionIds[i]);
                ethUsed += bidAmount;
            } else {
                // ERC20出价
                auctionContract.bidWithERC20(
                    params.auctionIds[i],
                    params.tokenAddresses[i],
                    params.bidAmounts[i]
                );
            }
            unchecked { ++i; }
        }
        
        // 退还多余的ETH
        if (msg.value > ethUsed) {
            payable(msg.sender).transfer(msg.value - ethUsed);
        }
        
        uint256 gasUsed = gasBefore - gasleft();
        
        emit BatchBidsPlaced(msg.sender, params.auctionIds, params.bidAmounts, gasUsed);
        emit GasOptimizationApplied("batchPlaceBids", gasUsed / length, length);
    }
    
    /**
     * @dev 批量结束拍卖
     * @param auctionIds 拍卖ID数组
     */
    function batchEndAuctions(uint256[] calldata auctionIds)
        external
        nonReentrant
    {
        uint256 length = auctionIds.length;
        require(length > 0 && length <= 30, "BatchOperations: invalid batch size");
        
        uint256 gasBefore = gasleft();
        address[] memory winners = new address[](length);
        uint256 processed = 0;
        
        for (uint256 i = 0; i < length;) {
            try auctionContract.endAuction(auctionIds[i]) {
                // 获取获胜者信息
                (, , , , , , address winner, , , ,) = auctionContract.auctions(auctionIds[i]);
                winners[i] = winner;
                processed++;
            } catch {
                // 跳过失败的拍卖
                winners[i] = address(0);
            }
            unchecked { ++i; }
        }
        
        uint256 gasUsed = gasBefore - gasleft();
        
        emit BatchAuctionsEnded(auctionIds, winners, processed);
        emit GasOptimizationApplied("batchEndAuctions", gasUsed / processed, processed);
    }
    
    /**
     * @dev 批量处理退款（Gas优化版本）
     * @param auctionIds 拍卖ID数组
     * @param bidders 出价者地址数组
     */
    function batchProcessRefunds(
        uint256[] calldata auctionIds,
        address[] calldata bidders
    ) external nonReentrant {
        uint256 length = auctionIds.length;
        require(length > 0 && length <= 50, "BatchOperations: invalid batch size");
        require(length == bidders.length, "BatchOperations: array length mismatch");
        
        uint256 gasBefore = gasleft();
        uint256 processed = 0;
        
        for (uint256 i = 0; i < length;) {
            try auctionContract.processRefund(auctionIds[i]) {
                processed++;
            } catch {
                // 跳过失败的退款
            }
            unchecked { ++i; }
        }
        
        uint256 gasUsed = gasBefore - gasleft();
        emit GasOptimizationApplied("batchProcessRefunds", gasUsed / processed, processed);
    }
    
    /**
     * @dev Gas优化的数据打包函数
     * @param tokenIds Token ID数组
     * @param startPrices 起始价格数组
     * @param durations 持续时间数组
     * @return packed 打包后的数据
     */
    function packAuctionData(
        uint256[] calldata tokenIds,
        uint256[] calldata startPrices,
        uint256[] calldata durations
    ) external pure returns (bytes memory packed) {
        uint256 length = tokenIds.length;
        PackedAuctionData[] memory packedData = new PackedAuctionData[](length);
        
        for (uint256 i = 0; i < length;) {
            packedData[i] = PackedAuctionData({
                tokenId: uint128(tokenIds[i]),
                startPrice: uint128(startPrices[i] / 1e18), // 压缩精度
                duration: uint64(durations[i]),
                unused: 0
            });
            unchecked { ++i; }
        }
        
        return abi.encode(packedData);
    }
    
    /**
     * @dev 解包拍卖数据
     * @param packed 打包的数据
     * @return tokenIds Token ID数组
     * @return startPrices 起始价格数组
     * @return durations 持续时间数组
     */
    function unpackAuctionData(bytes calldata packed)
        external
        pure
        returns (
            uint256[] memory tokenIds,
            uint256[] memory startPrices,
            uint256[] memory durations
        )
    {
        PackedAuctionData[] memory packedData = abi.decode(packed, (PackedAuctionData[]));
        uint256 length = packedData.length;
        
        tokenIds = new uint256[](length);
        startPrices = new uint256[](length);
        durations = new uint256[](length);
        
        for (uint256 i = 0; i < length;) {
            tokenIds[i] = uint256(packedData[i].tokenId);
            startPrices[i] = uint256(packedData[i].startPrice) * 1e18; // 恢复精度
            durations[i] = uint256(packedData[i].duration);
            unchecked { ++i; }
        }
    }
    
    /**
     * @dev 估算批量操作Gas费用
     * @param operationType 操作类型
     * @param itemCount 项目数量
     * @return estimatedGas 估算的Gas费用
     */
    function estimateBatchGas(string calldata operationType, uint256 itemCount)
        external
        pure
        returns (uint256 estimatedGas)
    {
        if (keccak256(bytes(operationType)) == keccak256("createAuctions")) {
            return 150000 + (itemCount * 120000); // 基础费用 + 每项费用
        } else if (keccak256(bytes(operationType)) == keccak256("placeBids")) {
            return 100000 + (itemCount * 80000);
        } else if (keccak256(bytes(operationType)) == keccak256("endAuctions")) {
            return 80000 + (itemCount * 60000);
        } else if (keccak256(bytes(operationType)) == keccak256("processRefunds")) {
            return 60000 + (itemCount * 40000);
        }
        return 0;
    }
    
    /**
     * @dev 紧急批量暂停拍卖
     * @param auctionIds 拍卖ID数组
     */
    function emergencyBatchPause(uint256[] calldata auctionIds) external onlyOwner {
        uint256 length = auctionIds.length;
        
        for (uint256 i = 0; i < length;) {
            try auctionContract.cancelAuction(auctionIds[i]) {
                // 成功取消
            } catch {
                // 跳过失败的取消操作
            }
            unchecked { ++i; }
        }
    }
    
    /**
     * @dev 更新合约地址
     * @param _auctionContract 新的拍卖合约地址
     */
    function updateAuctionContract(address _auctionContract) external onlyOwner {
        require(_auctionContract != address(0), "BatchOperations: invalid address");
        auctionContract = NFTAuction(payable(_auctionContract));
    }
    
    /**
     * @dev 升级授权
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
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