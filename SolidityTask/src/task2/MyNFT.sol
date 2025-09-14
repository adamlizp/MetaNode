// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MyNFT
 * @dev 符合ERC721标准的NFT合约
 * 
 * 功能特性:
 * - 符合ERC721标准
 * - 支持元数据URI存储
 * - 自动递增的Token ID
 * - 只有合约所有者可以铸造
 * - 支持批量铸造
 * - 完整的事件记录
 */
contract MyNFT is ERC721, ERC721URIStorage, Ownable {
    // Token ID 计数器
    uint256 private _nextTokenId;

    // 事件定义
    event NFTMinted(address indexed to, uint256 indexed tokenId, string tokenURI);
    event BatchMinted(address indexed to, uint256 startTokenId, uint256 quantity);

    /**
     * @dev 构造函数
     * @param name NFT集合名称
     * @param symbol NFT集合符号
     */
    constructor(string memory name, string memory symbol) 
        ERC721(name, symbol) 
        Ownable(msg.sender)
    {
        // 从Token ID 1开始计数
        _nextTokenId = 1;
    }

    /**
     * @dev 铸造单个NFT
     * @param to 接收者地址
     * @param _tokenURI 元数据URI（IPFS链接）
     * @return tokenId 新铸造的Token ID
     */
    function mintNFT(address to, string memory _tokenURI)
        public
        onlyOwner
        returns (uint256)
    {
        require(to != address(0), "MyNFT: mint to zero address");
        require(bytes(_tokenURI).length > 0, "MyNFT: tokenURI cannot be empty");

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
    function batchMintNFT(address to, string[] memory tokenURIs) 
        public 
        onlyOwner 
        returns (uint256[] memory) 
    {
        require(to != address(0), "MyNFT: mint to zero address");
        require(tokenURIs.length > 0, "MyNFT: tokenURIs array cannot be empty");
        require(tokenURIs.length <= 50, "MyNFT: cannot mint more than 50 NFTs at once");

        uint256[] memory tokenIds = new uint256[](tokenURIs.length);
        uint256 startTokenId = _nextTokenId;

        for (uint256 i = 0; i < tokenURIs.length; i++) {
            require(bytes(tokenURIs[i]).length > 0, "MyNFT: tokenURI cannot be empty");
            
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
    function tokensOfOwner(address owner) public view returns (uint256[] memory) {
        require(owner != address(0), "MyNFT: query for zero address");
        
        uint256 tokenCount = balanceOf(owner);
        if (tokenCount == 0) {
            return new uint256[](0);
        }

        uint256[] memory tokenIds = new uint256[](tokenCount);
        uint256 index = 0;
        uint256 totalSupply = getTotalSupply();

        for (uint256 tokenId = 1; tokenId <= totalSupply && index < tokenCount; tokenId++) {
            if (_ownerOf(tokenId) == owner) {
                tokenIds[index] = tokenId;
                index++;
            }
        }

        return tokenIds;
    }

    // 以下函数是必需的重写

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}