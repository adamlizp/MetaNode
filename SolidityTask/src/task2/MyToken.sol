// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title MyToken - 简单的 ERC20 代币合约
 * @dev 实现了标准的 ERC20 功能，包括转账、授权和增发功能
 */
contract MyToken {
    // 代币基本信息
    string public name = "MyToken";
    string public symbol = "MTK";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    
    // 合约所有者
    address public owner;
    
    // 账户余额映射
    mapping(address => uint256) public balanceOf;
    
    // 授权映射：owner => spender => amount
    mapping(address => mapping(address => uint256)) public allowance;
    
    // 事件定义
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 value);
    
    // 修饰符：只有所有者可以调用
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    /**
     * @dev 构造函数
     * @param _initialSupply 初始供应量（不包含小数位）
     */
    constructor(uint256 _initialSupply) {
        owner = msg.sender;
        totalSupply = _initialSupply * 10**decimals;
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    /**
     * @dev 转账功能
     * @param to 接收者地址
     * @param value 转账金额
     * @return success 是否成功
     */
    function transfer(address to, uint256 value) public returns (bool success) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        
        emit Transfer(msg.sender, to, value);
        return true;
    }
    
    /**
     * @dev 授权功能
     * @param spender 被授权者地址
     * @param value 授权金额
     * @return success 是否成功
     */
    function approve(address spender, uint256 value) public returns (bool success) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = value;
        
        emit Approval(msg.sender, spender, value);
        return true;
    }
    
    /**
     * @dev 代扣转账功能
     * @param from 转出者地址
     * @param to 接收者地址
     * @param value 转账金额
     * @return success 是否成功
     */
    function transferFrom(address from, address to, uint256 value) public returns (bool success) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Insufficient allowance");
        
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        
        emit Transfer(from, to, value);
        return true;
    }
    
    /**
     * @dev 增发代币功能（仅所有者）
     * @param to 接收者地址
     * @param value 增发金额
     * @return success 是否成功
     */
    function mint(address to, uint256 value) public onlyOwner returns (bool success) {
        require(to != address(0), "Cannot mint to zero address");
        require(value > 0, "Mint value must be greater than 0");
        
        totalSupply += value;
        balanceOf[to] += value;
        
        emit Transfer(address(0), to, value);
        emit Mint(to, value);
        return true;
    }
    
    /**
     * @dev 销毁代币功能（仅所有者）
     * @param value 销毁金额
     * @return success 是否成功
     */
    function burn(uint256 value) public returns (bool success) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance to burn");
        require(value > 0, "Burn value must be greater than 0");
        
        balanceOf[msg.sender] -= value;
        totalSupply -= value;
        
        emit Transfer(msg.sender, address(0), value);
        return true;
    }
    
    /**
     * @dev 转移所有权
     * @param newOwner 新所有者地址
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
}






