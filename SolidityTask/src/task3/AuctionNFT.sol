// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title AuctionNFT
 * @dev 可升级的NFT合约，用于拍卖市场
 *
 * 功能特性:
 * - 符合ERC721标准
 * - 支持元数据URI存储
 * - 可升级合约(UUPS模式)
 * - 自动递增的Token ID
 * - 支持批量铸造
 * - 拍卖授权管理
 */
contract AuctionNFT is
    Initializable,
    ERC721Upgradeable,
    ERC721URIStorageUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    // Token ID 计数器
    uint256 private _nextTokenId;

    // 拍卖合约地址映射，用于授权拍卖操作
    mapping(address => bool) public authorizedAuctions;

    // 事件定义
    event NFTMinted(
        address indexed to,
        uint256 indexed tokenId,
        string tokenURI
    );
    event BatchMinted(
        address indexed to,
        uint256 startTokenId,
        uint256 quantity
    );
    event AuctionAuthorized(address indexed auction, bool authorized);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数，替代构造函数
     * @param name NFT集合名称
     * @param symbol NFT集合符号
     * @param initialOwner 初始所有者地址
     */
    function initialize(
        string memory name,
        string memory symbol,
        address initialOwner
    ) public initializer {
        __ERC721_init(name, symbol);
        __ERC721URIStorage_init();
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();

        // 从Token ID 1开始计数
        _nextTokenId = 1;
    }

    /**
     * @dev 铸造单个NFT
     * @param to 接收者地址
     * @param _tokenURI 元数据URI（IPFS链接）
     * @return tokenId 新铸造的Token ID
     */
    function mintNFT(
        address to,
        string memory _tokenURI
    ) public onlyOwner returns (uint256) {
        require(to != address(0), "AuctionNFT: mint to zero address");
        require(
            bytes(_tokenURI).length > 0,
            "AuctionNFT: tokenURI cannot be empty"
        );

        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        _mint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        emit NFTMinted(to, tokenId, _tokenURI);

        return tokenId;
    }

    /**
     * @dev 批量铸造NFT
     * @param to 接收者地址
     * @param tokenURIs 元数据URI数组
     * @return tokenIds 新铸造的Token ID数组
     */
    function batchMintNFT(
        address to,
        string[] memory tokenURIs
    ) public onlyOwner returns (uint256[] memory) {
        require(to != address(0), "AuctionNFT: mint to zero address");
        require(
            tokenURIs.length > 0,
            "AuctionNFT: tokenURIs array cannot be empty"
        );
        require(
            tokenURIs.length <= 50,
            "AuctionNFT: cannot mint more than 50 NFTs at once"
        );

        uint256[] memory tokenIds = new uint256[](tokenURIs.length);
        uint256 startTokenId = _nextTokenId;

        for (uint256 i = 0; i < tokenURIs.length; i++) {
            require(
                bytes(tokenURIs[i]).length > 0,
                "AuctionNFT: tokenURI cannot be empty"
            );

            uint256 tokenId = _nextTokenId;
            _nextTokenId++;

            _mint(to, tokenId);
            _setTokenURI(tokenId, tokenURIs[i]);
            tokenIds[i] = tokenId;

            emit NFTMinted(to, tokenId, tokenURIs[i]);
        }

        emit BatchMinted(to, startTokenId, tokenURIs.length);

        return tokenIds;
    }

    /**
     * @dev 授权拍卖合约操作NFT
     * @param auction 拍卖合约地址
     * @param authorized 是否授权
     */
    function setAuctionAuthorization(
        address auction,
        bool authorized
    ) external onlyOwner {
        require(
            auction != address(0),
            "AuctionNFT: auction cannot be zero address"
        );
        authorizedAuctions[auction] = authorized;
        emit AuctionAuthorized(auction, authorized);
    }

    /**
     * @dev 拍卖合约专用的转移函数
     * @param from 发送者地址
     * @param to 接收者地址
     * @param tokenId Token ID
     */
    function auctionTransfer(
        address from,
        address to,
        uint256 tokenId
    ) external {
        require(
            authorizedAuctions[msg.sender],
            "AuctionNFT: caller not authorized auction"
        );
        require(ownerOf(tokenId) == from, "AuctionNFT: from is not owner");

        _transfer(from, to, tokenId);
    }

    /**
     * @dev 获取下一个Token ID
     * @return 下一个将要铸造的Token ID
     */
    function getNextTokenId() public view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @dev 获取当前已铸造的NFT总数
     * @return 已铸造的NFT总数
     */
    function getTotalSupply() public view returns (uint256) {
        return _nextTokenId - 1;
    }

    /**
     * @dev 检查Token是否存在
     * @param tokenId Token ID
     * @return 是否存在
     */
    function exists(uint256 tokenId) public view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    /**
     * @dev 获取用户拥有的所有Token ID
     * @param owner 用户地址
     * @return tokenIds Token ID数组
     */
    function tokensOfOwner(
        address owner
    ) public view returns (uint256[] memory) {
        require(owner != address(0), "AuctionNFT: query for zero address");

        uint256 tokenCount = balanceOf(owner);
        if (tokenCount == 0) {
            return new uint256[](0);
        }

        uint256[] memory tokenIds = new uint256[](tokenCount);
        uint256 index = 0;
        uint256 totalSupply = getTotalSupply();

        for (
            uint256 tokenId = 1;
            tokenId <= totalSupply && index < tokenCount;
            tokenId++
        ) {
            if (_ownerOf(tokenId) == owner) {
                tokenIds[index] = tokenId;
                index++;
            }
        }

        return tokenIds;
    }

    /**
     * @dev 必需的UUPS升级授权函数
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    // 以下函数是必需的重写

    function tokenURI(
        uint256 tokenId
    )
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
