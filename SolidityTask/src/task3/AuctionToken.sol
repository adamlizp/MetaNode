// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title AuctionToken
 * @dev 可升级的ERC20代币合约，用于拍卖市场出价
 *
 * 功能特性:
 * - 符合ERC20标准
 * - 可升级合约(UUPS模式)
 * - 支持铸造和销毁
 * - 拍卖授权管理
 */
contract AuctionToken is
    Initializable,
    ERC20Upgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    // 拍卖合约地址映射，用于授权拍卖操作
    mapping(address => bool) public authorizedAuctions;

    // 事件定义
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    event AuctionAuthorized(address indexed auction, bool authorized);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数，替代构造函数
     * @param name 代币名称
     * @param symbol 代币符号
     * @param initialOwner 初始所有者地址
     */
    function initialize(
        string memory name,
        string memory symbol,
        address initialOwner
    ) public initializer {
        __ERC20_init(name, symbol);
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
    }

    /**
     * @dev 铸造代币
     * @param to 接收者地址
     * @param amount 铸造数量
     */
    function mint(address to, uint256 amount) public onlyOwner {
        require(to != address(0), "AuctionToken: mint to zero address");
        require(amount > 0, "AuctionToken: amount must be greater than 0");

        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev 销毁代币
     * @param from 销毁地址
     * @param amount 销毁数量
     */
    function burn(address from, uint256 amount) public onlyOwner {
        require(from != address(0), "AuctionToken: burn from zero address");
        require(amount > 0, "AuctionToken: amount must be greater than 0");
        require(
            balanceOf(from) >= amount,
            "AuctionToken: burn amount exceeds balance"
        );

        _burn(from, amount);
        emit TokensBurned(from, amount);
    }

    /**
     * @dev 授权拍卖合约操作代币
     * @param auction 拍卖合约地址
     * @param authorized 是否授权
     */
    function setAuctionAuthorization(
        address auction,
        bool authorized
    ) external onlyOwner {
        require(
            auction != address(0),
            "AuctionToken: auction cannot be zero address"
        );
        authorizedAuctions[auction] = authorized;
        emit AuctionAuthorized(auction, authorized);
    }

    /**
     * @dev 拍卖合约专用的转移函数
     * @param from 发送者地址
     * @param to 接收者地址
     * @param amount 转移数量
     */
    function auctionTransfer(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        require(
            authorizedAuctions[msg.sender],
            "AuctionToken: caller not authorized auction"
        );
        require(from != address(0), "AuctionToken: transfer from zero address");
        require(to != address(0), "AuctionToken: transfer to zero address");
        require(
            balanceOf(from) >= amount,
            "AuctionToken: transfer amount exceeds balance"
        );

        _transfer(from, to, amount);
        return true;
    }

    /**
     * @dev 必需的UUPS升级授权函数
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
