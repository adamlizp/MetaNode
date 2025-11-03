// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./MetaNodeToken.sol";

contract StakePool is AccessControl, Pausable, Initializable {
    using SafeERC20 for IERC20;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    struct Pool {
        address stTokenAddress;      // Stake token address (address(0) for native currency)
        uint256 poolWeight;          // Pool weight for reward allocation
        uint256 lastRewardBlock;     // Last reward calculation block
        uint256 accMetaNodePerST;    // Accumulated MetaNode per stake token
        uint256 stTokenAmount;       // Total staked token amount in pool
        uint256 minDepositAmount;    // Minimum deposit amount
        uint256 unstakeLockedBlocks; // Locked blocks for unstaking
        bool isActive;               // Pool active status
    }
    
    struct UnstakeRequest {
        uint256 amount;
        uint256 unlockBlock;
    }
    
    struct User {
        uint256 stAmount;           // User staked amount
        uint256 finishedMetaNode;   // Already distributed MetaNode
        uint256 pendingMetaNode;    // Pending MetaNode to claim
        UnstakeRequest[] requests;  // Unstake requests
    }
    
    MetaNodeToken public metaNodeToken;
    uint256 public metaNodePerBlock;
    uint256 public totalPoolWeight;
    uint256 public startBlock;
    
    Pool[] public pools;
    mapping(uint256 => mapping(address => User)) public users; // poolId => user => User
    
    // Pause states for different operations
    bool public stakePaused;
    bool public unstakePaused;
    bool public claimPaused;
    
    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event Unstake(address indexed user, uint256 indexed pid, uint256 amount);
    event Claim(address indexed user, uint256 indexed pid, uint256 amount);
    event PoolAdded(uint256 indexed pid, address stTokenAddress, uint256 poolWeight, uint256 minDepositAmount, uint256 unstakeLockedBlocks);
    event PoolUpdated(uint256 indexed pid, uint256 poolWeight, uint256 minDepositAmount, uint256 unstakeLockedBlocks);
    
    modifier validPool(uint256 _pid) {
        require(_pid < pools.length, "Invalid pool ID");
        require(pools[_pid].isActive, "Pool is not active");
        _;
    }
    
    modifier whenStakeNotPaused() {
        require(!stakePaused, "Stake is paused");
        _;
    }
    
    modifier whenUnstakeNotPaused() {
        require(!unstakePaused, "Unstake is paused");
        _;
    }
    
    modifier whenClaimNotPaused() {
        require(!claimPaused, "Claim is paused");
        _;
    }
    
    function initialize(
        MetaNodeToken _metaNodeToken,
        uint256 _metaNodePerBlock,
        uint256 _startBlock
    ) public initializer {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        
        metaNodeToken = _metaNodeToken;
        metaNodePerBlock = _metaNodePerBlock;
        startBlock = _startBlock > 0 ? _startBlock : block.number;
    }
    
    function addPool(
        address _stTokenAddress,
        uint256 _poolWeight,
        uint256 _minDepositAmount,
        uint256 _unstakeLockedBlocks
    ) external onlyRole(ADMIN_ROLE) {
        massUpdatePools();
        
        totalPoolWeight += _poolWeight;
        
        pools.push(Pool({
            stTokenAddress: _stTokenAddress,
            poolWeight: _poolWeight,
            lastRewardBlock: block.number > startBlock ? block.number : startBlock,
            accMetaNodePerST: 0,
            stTokenAmount: 0,
            minDepositAmount: _minDepositAmount,
            unstakeLockedBlocks: _unstakeLockedBlocks,
            isActive: true
        }));
        
        emit PoolAdded(pools.length - 1, _stTokenAddress, _poolWeight, _minDepositAmount, _unstakeLockedBlocks);
    }
    
    function updatePool(
        uint256 _pid,
        uint256 _poolWeight,
        uint256 _minDepositAmount,
        uint256 _unstakeLockedBlocks
    ) external onlyRole(ADMIN_ROLE) validPool(_pid) {
        massUpdatePools();
        
        Pool storage pool = pools[_pid];
        totalPoolWeight = totalPoolWeight - pool.poolWeight + _poolWeight;
        pool.poolWeight = _poolWeight;
        pool.minDepositAmount = _minDepositAmount;
        pool.unstakeLockedBlocks = _unstakeLockedBlocks;
        
        emit PoolUpdated(_pid, _poolWeight, _minDepositAmount, _unstakeLockedBlocks);
    }
    
    function updatePoolReward(uint256 _pid) public validPool(_pid) {
        Pool storage pool = pools[_pid];
        
        if (block.number <= pool.lastRewardBlock) {
            return;
        }
        
        if (pool.stTokenAmount == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        
        uint256 multiplier = block.number - pool.lastRewardBlock;
        uint256 metaNodeReward = (multiplier * metaNodePerBlock * pool.poolWeight) / totalPoolWeight;
        
        pool.accMetaNodePerST += (metaNodeReward * 1e12) / pool.stTokenAmount;
        pool.lastRewardBlock = block.number;
    }
    
    function massUpdatePools() public {
        for (uint256 pid = 0; pid < pools.length; pid++) {
            if (pools[pid].isActive) {
                updatePoolReward(pid);
            }
        }
    }
    
    function pendingMetaNode(uint256 _pid, address _user) external view validPool(_pid) returns (uint256) {
        Pool memory pool = pools[_pid];
        User memory user = users[_pid][_user];
        
        uint256 accMetaNodePerST = pool.accMetaNodePerST;
        
        if (block.number > pool.lastRewardBlock && pool.stTokenAmount != 0) {
            uint256 multiplier = block.number - pool.lastRewardBlock;
            uint256 metaNodeReward = (multiplier * metaNodePerBlock * pool.poolWeight) / totalPoolWeight;
            accMetaNodePerST += (metaNodeReward * 1e12) / pool.stTokenAmount;
        }
        
        return ((user.stAmount * accMetaNodePerST) / 1e12) - user.finishedMetaNode + user.pendingMetaNode;
    }
    
    function stake(uint256 _pid, uint256 _amount) external payable whenStakeNotPaused whenNotPaused validPool(_pid) {
        Pool storage pool = pools[_pid];
        User storage user = users[_pid][msg.sender];
        
        require(_amount >= pool.minDepositAmount, "Amount below minimum deposit");
        
        updatePoolReward(_pid);
        
        if (user.stAmount > 0) {
            uint256 pending = ((user.stAmount * pool.accMetaNodePerST) / 1e12) - user.finishedMetaNode;
            if (pending > 0) {
                user.pendingMetaNode += pending;
            }
        }
        
        if (pool.stTokenAddress == address(0)) {
            require(msg.value == _amount, "Invalid ETH amount");
        } else {
            require(msg.value == 0, "Should not send ETH for ERC20 token");
            IERC20(pool.stTokenAddress).safeTransferFrom(msg.sender, address(this), _amount);
        }
        
        user.stAmount += _amount;
        pool.stTokenAmount += _amount;
        user.finishedMetaNode = (user.stAmount * pool.accMetaNodePerST) / 1e12;
        
        emit Deposit(msg.sender, _pid, _amount);
    }
    
    function unstake(uint256 _pid, uint256 _amount) external whenUnstakeNotPaused whenNotPaused validPool(_pid) {
        Pool storage pool = pools[_pid];
        User storage user = users[_pid][msg.sender];
        
        require(user.stAmount >= _amount, "Insufficient staked amount");
        require(_amount > 0, "Amount must be greater than 0");
        
        updatePoolReward(_pid);
        
        uint256 pending = ((user.stAmount * pool.accMetaNodePerST) / 1e12) - user.finishedMetaNode;
        if (pending > 0) {
            user.pendingMetaNode += pending;
        }
        
        user.stAmount -= _amount;
        pool.stTokenAmount -= _amount;
        user.finishedMetaNode = (user.stAmount * pool.accMetaNodePerST) / 1e12;
        
        user.requests.push(UnstakeRequest({
            amount: _amount,
            unlockBlock: block.number + pool.unstakeLockedBlocks
        }));
        
        emit Unstake(msg.sender, _pid, _amount);
    }
    
    function withdraw(uint256 _pid) external whenNotPaused validPool(_pid) {
        Pool storage pool = pools[_pid];
        User storage user = users[_pid][msg.sender];
        
        uint256 totalWithdrawable = 0;
        uint256 requestCount = user.requests.length;
        
        for (uint256 i = 0; i < requestCount; i++) {
            if (user.requests[i].unlockBlock <= block.number) {
                totalWithdrawable += user.requests[i].amount;
            }
        }
        
        require(totalWithdrawable > 0, "No withdrawable amount");
        
        // Remove processed requests
        uint256 writeIndex = 0;
        for (uint256 i = 0; i < requestCount; i++) {
            if (user.requests[i].unlockBlock > block.number) {
                user.requests[writeIndex] = user.requests[i];
                writeIndex++;
            }
        }
        
        // Reduce array length
        while (user.requests.length > writeIndex) {
            user.requests.pop();
        }
        
        if (pool.stTokenAddress == address(0)) {
            payable(msg.sender).transfer(totalWithdrawable);
        } else {
            IERC20(pool.stTokenAddress).safeTransfer(msg.sender, totalWithdrawable);
        }
        
        emit Withdraw(msg.sender, _pid, totalWithdrawable);
    }
    
    function claim(uint256 _pid) external whenClaimNotPaused whenNotPaused validPool(_pid) {
        Pool storage pool = pools[_pid];
        User storage user = users[_pid][msg.sender];
        
        updatePoolReward(_pid);
        
        uint256 pending = ((user.stAmount * pool.accMetaNodePerST) / 1e12) - user.finishedMetaNode;
        uint256 totalPending = pending + user.pendingMetaNode;
        
        require(totalPending > 0, "No pending rewards");
        
        user.finishedMetaNode = (user.stAmount * pool.accMetaNodePerST) / 1e12;
        user.pendingMetaNode = 0;
        
        metaNodeToken.transfer(msg.sender, totalPending);
        
        emit Claim(msg.sender, _pid, totalPending);
    }
    
    function emergencyWithdraw(uint256 _pid) external whenNotPaused validPool(_pid) {
        Pool storage pool = pools[_pid];
        User storage user = users[_pid][msg.sender];
        
        uint256 amount = user.stAmount;
        require(amount > 0, "No staked amount");
        
        user.stAmount = 0;
        user.finishedMetaNode = 0;
        user.pendingMetaNode = 0;
        delete user.requests;
        
        pool.stTokenAmount -= amount;
        
        if (pool.stTokenAddress == address(0)) {
            payable(msg.sender).transfer(amount);
        } else {
            IERC20(pool.stTokenAddress).safeTransfer(msg.sender, amount);
        }
        
        emit Withdraw(msg.sender, _pid, amount);
    }
    
    // Admin functions
    function setMetaNodePerBlock(uint256 _metaNodePerBlock) external onlyRole(ADMIN_ROLE) {
        massUpdatePools();
        metaNodePerBlock = _metaNodePerBlock;
    }
    
    function setPoolActive(uint256 _pid, bool _isActive) external onlyRole(ADMIN_ROLE) {
        require(_pid < pools.length, "Invalid pool ID");
        pools[_pid].isActive = _isActive;
    }
    
    // Pause control functions
    function setStakePaused(bool _paused) external onlyRole(OPERATOR_ROLE) {
        stakePaused = _paused;
    }
    
    function setUnstakePaused(bool _paused) external onlyRole(OPERATOR_ROLE) {
        unstakePaused = _paused;
    }
    
    function setClaimPaused(bool _paused) external onlyRole(OPERATOR_ROLE) {
        claimPaused = _paused;
    }
    
    function pause() external onlyRole(OPERATOR_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(OPERATOR_ROLE) {
        _unpause();
    }
    
    // View functions
    function getPoolLength() external view returns (uint256) {
        return pools.length;
    }
    
    function getUserInfo(uint256 _pid, address _user) external view returns (
        uint256 stAmount,
        uint256 pendingReward,
        UnstakeRequest[] memory requests
    ) {
        User memory user = users[_pid][_user];
        stAmount = user.stAmount;
        pendingReward = this.pendingMetaNode(_pid, _user);
        requests = user.requests;
    }
    
    function getWithdrawableAmount(uint256 _pid, address _user) external view returns (uint256) {
        User memory user = users[_pid][_user];
        uint256 withdrawable = 0;
        
        for (uint256 i = 0; i < user.requests.length; i++) {
            if (user.requests[i].unlockBlock <= block.number) {
                withdrawable += user.requests[i].amount;
            }
        }
        
        return withdrawable;
    }
    
    // Emergency functions
    function emergencyRecoverToken(address _token, uint256 _amount) external onlyRole(ADMIN_ROLE) {
        require(_token != address(metaNodeToken), "Cannot recover reward token");
        
        // Check if token is used in any pool
        for (uint256 i = 0; i < pools.length; i++) {
            require(pools[i].stTokenAddress != _token, "Cannot recover staked token");
        }
        
        if (_token == address(0)) {
            payable(msg.sender).transfer(_amount);
        } else {
            IERC20(_token).safeTransfer(msg.sender, _amount);
        }
    }
    
    receive() external payable {}
}