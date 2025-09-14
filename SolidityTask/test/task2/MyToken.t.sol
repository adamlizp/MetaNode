// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test, console2} from "forge-std/Test.sol";
import {MyToken} from "src/task2/MyToken.sol";

contract MyTokenTest is Test {
    MyToken public myToken;
    address public owner;
    address public user1;
    address public user2;

    uint256 constant INITIAL_SUPPLY = 1000000; // 1,000,000 tokens

    function setUp() public {
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);

        myToken = new MyToken(INITIAL_SUPPLY);
    }

    function testInitialState() public {
        assertEq(myToken.name(), "MyToken");
        assertEq(myToken.symbol(), "MTK");
        assertEq(myToken.decimals(), 18);
        assertEq(myToken.totalSupply(), INITIAL_SUPPLY * 10 ** 18);
        assertEq(myToken.owner(), owner);
        assertEq(myToken.balanceOf(owner), INITIAL_SUPPLY * 10 ** 18);
    }

    function testTransfer() public {
        uint256 transferAmount = 100 * 10 ** 18;

        // 测试正常转账
        bool success = myToken.transfer(user1, transferAmount);
        assertTrue(success);
        assertEq(
            myToken.balanceOf(owner),
            (INITIAL_SUPPLY * 10 ** 18) - transferAmount
        );
        assertEq(myToken.balanceOf(user1), transferAmount);
    }

    function testTransferFailInsufficientBalance() public {
        uint256 transferAmount = (INITIAL_SUPPLY + 1) * 10 ** 18;

        // 测试余额不足的情况
        vm.expectRevert("Insufficient balance");
        myToken.transfer(user1, transferAmount);
    }

    function testTransferFailZeroAddress() public {
        uint256 transferAmount = 100 * 10 ** 18;

        // 测试转账到零地址
        vm.expectRevert("Cannot transfer to zero address");
        myToken.transfer(address(0), transferAmount);
    }

    function testApprove() public {
        uint256 approveAmount = 500 * 10 ** 18;

        // 测试授权
        bool success = myToken.approve(user1, approveAmount);
        assertTrue(success);
        assertEq(myToken.allowance(owner, user1), approveAmount);
    }

    function testApproveFailZeroAddress() public {
        uint256 approveAmount = 500 * 10 ** 18;

        // 测试授权给零地址
        vm.expectRevert("Cannot approve zero address");
        myToken.approve(address(0), approveAmount);
    }

    function testTransferFrom() public {
        uint256 approveAmount = 500 * 10 ** 18;
        uint256 transferAmount = 200 * 10 ** 18;

        // 先授权
        myToken.approve(user1, approveAmount);

        // 模拟 user1 调用 transferFrom
        vm.prank(user1);
        bool success = myToken.transferFrom(owner, user2, transferAmount);

        assertTrue(success);
        assertEq(
            myToken.balanceOf(owner),
            (INITIAL_SUPPLY * 10 ** 18) - transferAmount
        );
        assertEq(myToken.balanceOf(user2), transferAmount);
        assertEq(
            myToken.allowance(owner, user1),
            approveAmount - transferAmount
        );
    }

    function testTransferFromFailInsufficientAllowance() public {
        uint256 approveAmount = 100 * 10 ** 18;
        uint256 transferAmount = 200 * 10 ** 18;

        // 先授权较小金额
        myToken.approve(user1, approveAmount);

        // 尝试转账更大金额
        vm.prank(user1);
        vm.expectRevert("Insufficient allowance");
        myToken.transferFrom(owner, user2, transferAmount);
    }

    function testTransferFromFailInsufficientBalance() public {
        uint256 approveAmount = (INITIAL_SUPPLY + 1) * 10 ** 18;
        uint256 transferAmount = (INITIAL_SUPPLY + 1) * 10 ** 18;

        // 授权超过余额的金额
        myToken.approve(user1, approveAmount);

        // 尝试转账
        vm.prank(user1);
        vm.expectRevert("Insufficient balance");
        myToken.transferFrom(owner, user2, transferAmount);
    }

    function testMint() public {
        uint256 mintAmount = 1000 * 10 ** 18;
        uint256 initialTotalSupply = myToken.totalSupply();
        uint256 initialBalance = myToken.balanceOf(user1);

        // 测试增发
        bool success = myToken.mint(user1, mintAmount);
        assertTrue(success);
        assertEq(myToken.totalSupply(), initialTotalSupply + mintAmount);
        assertEq(myToken.balanceOf(user1), initialBalance + mintAmount);
    }

    function testMintFailNotOwner() public {
        uint256 mintAmount = 1000 * 10 ** 18;

        // 非所有者尝试增发
        vm.prank(user1);
        vm.expectRevert("Only owner can call this function");
        myToken.mint(user2, mintAmount);
    }

    function testMintFailZeroAddress() public {
        uint256 mintAmount = 1000 * 10 ** 18;

        // 增发到零地址
        vm.expectRevert("Cannot mint to zero address");
        myToken.mint(address(0), mintAmount);
    }

    function testMintFailZeroAmount() public {
        // 增发零数量
        vm.expectRevert("Mint value must be greater than 0");
        myToken.mint(user1, 0);
    }

    function testBurn() public {
        uint256 burnAmount = 1000 * 10 ** 18;
        uint256 initialTotalSupply = myToken.totalSupply();
        uint256 initialBalance = myToken.balanceOf(owner);

        // 测试销毁
        bool success = myToken.burn(burnAmount);
        assertTrue(success);
        assertEq(myToken.totalSupply(), initialTotalSupply - burnAmount);
        assertEq(myToken.balanceOf(owner), initialBalance - burnAmount);
    }

    function testBurnFailInsufficientBalance() public {
        uint256 burnAmount = (INITIAL_SUPPLY + 1) * 10 ** 18;

        // 尝试销毁超过余额的代币
        vm.expectRevert("Insufficient balance to burn");
        myToken.burn(burnAmount);
    }

    function testBurnFailZeroAmount() public {
        // 销毁零数量
        vm.expectRevert("Burn value must be greater than 0");
        myToken.burn(0);
    }

    function testTransferOwnership() public {
        // 测试转移所有权
        myToken.transferOwnership(user1);
        assertEq(myToken.owner(), user1);
    }

    function testTransferOwnershipFailNotOwner() public {
        // 非所有者尝试转移所有权
        vm.prank(user1);
        vm.expectRevert("Only owner can call this function");
        myToken.transferOwnership(user2);
    }

    function testTransferOwnershipFailZeroAddress() public {
        // 转移所有权到零地址
        vm.expectRevert("New owner cannot be zero address");
        myToken.transferOwnership(address(0));
    }

    function testEvents() public {
        uint256 transferAmount = 100 * 10 ** 18;
        uint256 approveAmount = 500 * 10 ** 18;
        uint256 mintAmount = 1000 * 10 ** 18;

        // 测试 Transfer 事件
        vm.expectEmit(true, true, false, true);
        emit Transfer(owner, user1, transferAmount);
        myToken.transfer(user1, transferAmount);

        // 测试 Approval 事件
        vm.expectEmit(true, true, false, true);
        emit Approval(owner, user1, approveAmount);
        myToken.approve(user1, approveAmount);

        // 测试 Mint 事件 - 修正顺序
        // 1. _mint() 内部首先触发 Transfer 事件
        vm.expectEmit(true, true, false, true);
        emit Transfer(address(0), user1, mintAmount);

        // 2. mint() 接着触发 Mint 事件
        vm.expectEmit(true, false, false, true);
        emit Mint(user1, mintAmount);

        // 调用函数
        myToken.mint(user1, mintAmount);
    }

    // 事件定义（用于测试）
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
    event Mint(address indexed to, uint256 value);
}
