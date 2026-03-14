// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title CompoundPool
 * @dev 复利池合约
 * - 接收来自StakingPool的收益入账
 * - 每日按日化收益率计算复利
 * - 用户可随时提取或划转到余额
 */
contract CompoundPool is Ownable, Pausable, ReentrancyGuard {
    
    // ============ 常量定义 ============
    uint256 public constant BPS_DENOMINATOR = 10000;      // 基点分母
    uint256 public constant SECONDS_PER_DAY = 86400;      // 每天秒数
    
    // 默认配置
    uint256 public constant DEFAULT_MIN_YIELD_RATE = 30;      // 最低日化0.3% (基点)
    uint256 public constant DEFAULT_MAX_YIELD_RATE = 60;      // 最高日化0.6% (基点)
    uint256 public constant DEFAULT_YIELD_RATE = 45;          // 默认日化0.45% (基点)
    
    // ============ 状态变量 ============
    
    IERC20 public etrToken;
    address public stakingPool;
    uint256 public currentYieldRate;  // 当前日化率（基点）
    
    // 用户复利数据
    mapping(address => uint256) public compoundBalances;     // 用户复利余额
    mapping(address => uint256) public lastCompoundTime;     // 上次复利计算时间
    mapping(address => uint256) public totalDeposited;       // 累计入账金额
    mapping(address => uint256) public totalClaimed;         // 累计提取金额
    mapping(address => uint256) public totalTransferred;     // 累计划转到余额金额
    
    uint256 public totalCompoundPool;  // 复利池总余额
    
    // ============ 事件定义 ============
    
    event RewardDeposited(
        address indexed user,
        uint256 amount,
        uint256 newBalance,
        uint256 timestamp
    );
    event CompoundCalculated(
        address indexed user,
        uint256 compoundAmount,
        uint256 newBalance,
        uint256 timestamp
    );
    event CompoundClaimed(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    event CompoundTransferredToBalance(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    event YieldRateUpdated(
        uint256 oldRate,
        uint256 newRate,
        uint256 timestamp
    );
    event StakingPoolSet(
        address oldStakingPool,
        address newStakingPool
    );
    
    // ============ 修饰符 ============
    
    modifier onlyStakingPool() {
        require(msg.sender == stakingPool, "CompoundPool: only staking pool");
        _;
    }
    
    // ============ 构造函数 ============
    
    constructor(address _etrToken) {
        require(_etrToken != address(0), "CompoundPool: ETR token is zero address");
        
        etrToken = IERC20(_etrToken);
        currentYieldRate = DEFAULT_YIELD_RATE;
    }
    
    // ============ 核心函数 ============
    
    /**
     * @dev 存入奖励（由StakingPool调用）
     * @param user 用户地址
     * @param amount 奖励金额
     */
    function depositReward(address user, uint256 amount) 
        external 
        onlyStakingPool 
        whenNotPaused 
        nonReentrant 
    {
        require(user != address(0), "CompoundPool: user is zero address");
        require(amount > 0, "CompoundPool: amount must be greater than 0");
        
        // 先计算复利（如果有余额）
        _calculateCompound(user);
        
        // 更新用户数据
        compoundBalances[user] += amount;
        totalDeposited[user] += amount;
        lastCompoundTime[user] = block.timestamp;
        
        // 更新全局统计
        totalCompoundPool += amount;
        
        emit RewardDeposited(user, amount, compoundBalances[user], block.timestamp);
    }
    
    /**
     * @dev 提取复利到钱包
     * @return amount 提取金额
     */
    function claimCompound() external whenNotPaused nonReentrant returns (uint256 amount) {
        // 先计算复利
        _calculateCompound(msg.sender);
        
        amount = compoundBalances[msg.sender];
        require(amount > 0, "CompoundPool: no compound to claim");
        
        // 更新数据
        compoundBalances[msg.sender] = 0;
        lastCompoundTime[msg.sender] = block.timestamp;
        totalClaimed[msg.sender] += amount;
        
        // 更新全局统计
        totalCompoundPool -= amount;
        
        // 转账给用户
        require(etrToken.transfer(msg.sender, amount), "CompoundPool: transfer failed");
        
        emit CompoundClaimed(msg.sender, amount, block.timestamp);
        
        return amount;
    }
    
    /**
     * @dev 将复利划转到余额（单向：复利池 -> 余额）
     * @param amount 划转金额
     */
    function transferToBalance(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "CompoundPool: amount must be greater than 0");
        
        // 先计算复利
        _calculateCompound(msg.sender);
        
        require(compoundBalances[msg.sender] >= amount, "CompoundPool: insufficient compound balance");
        
        // 更新数据
        compoundBalances[msg.sender] -= amount;
        lastCompoundTime[msg.sender] = block.timestamp;
        totalTransferred[msg.sender] += amount;
        
        // 更新全局统计
        totalCompoundPool -= amount;
        
        // 转账给用户（到钱包余额）
        require(etrToken.transfer(msg.sender, amount), "CompoundPool: transfer failed");
        
        emit CompoundTransferredToBalance(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev 内部函数：计算复利
     * @param user 用户地址
     */
    function _calculateCompound(address user) internal {
        uint256 balance = compoundBalances[user];
        if (balance == 0) {
            lastCompoundTime[user] = block.timestamp;
            return;
        }
        
        uint256 lastTime = lastCompoundTime[user];
        if (lastTime == 0) {
            lastTime = block.timestamp;
        }
        
        uint256 timeElapsed = block.timestamp - lastTime;
        if (timeElapsed < SECONDS_PER_DAY) {
            return;
        }
        
        uint256 daysElapsed = timeElapsed / SECONDS_PER_DAY;
        
        // 复利计算：复利 = 余额 × 日化率 × 天数 / 10000
        uint256 compoundAmount = balance * currentYieldRate * daysElapsed / BPS_DENOMINATOR;
        
        if (compoundAmount > 0) {
            // 更新用户复利余额
            compoundBalances[user] += compoundAmount;
            
            // 更新全局统计
            totalCompoundPool += compoundAmount;
            
            emit CompoundCalculated(user, compoundAmount, compoundBalances[user], block.timestamp);
        }
        
        // 更新上次计算时间
        lastCompoundTime[user] = block.timestamp;
    }
    
    /**
     * @dev 查询用户复利余额（不触发计算）
     * @param user 用户地址
     * @return 复利余额
     */
    function getCompoundBalance(address user) external view returns (uint256) {
        return compoundBalances[user];
    }
    
    /**
     * @dev 查询复利池总额（本金+累计收益，触发计算）
     * @param user 用户地址
     * @return 复利池总额
     */
    function getTotalCompound(address user) external returns (uint256) {
        _calculateCompound(user);
        return compoundBalances[user];
    }
    
    /**
     * @dev 计算当日复利收益（预览，不更新状态）
     * @param user 用户地址
     * @return 当日复利收益
     */
    function calculateDailyCompound(address user) external view returns (uint256) {
        uint256 balance = compoundBalances[user];
        if (balance == 0) {
            return 0;
        }
        
        // 当日复利 = 余额 × 日化率 / 10000
        return balance * currentYieldRate / BPS_DENOMINATOR;
    }
    
    /**
     * @dev 查询用户的完整复利信息
     * @param user 用户地址
     * @return balance 当前复利余额
     * @return totalDepositedAmount 累计入账金额
     * @return totalClaimedAmount 累计提取金额
     * @return totalTransferredAmount 累计划转到余额金额
     * @return lastCompound 上次复利计算时间
     * @return estimatedDaily 预估每日复利
     */
    function getCompoundInfo(address user) external view returns (
        uint256 balance,
        uint256 totalDepositedAmount,
        uint256 totalClaimedAmount,
        uint256 totalTransferredAmount,
        uint256 lastCompound,
        uint256 estimatedDaily
    ) {
        balance = compoundBalances[user];
        totalDepositedAmount = totalDeposited[user];
        totalClaimedAmount = totalClaimed[user];
        totalTransferredAmount = totalTransferred[user];
        lastCompound = lastCompoundTime[user];
        estimatedDaily = balance * currentYieldRate / BPS_DENOMINATOR;
    }
    
    // ============ 管理员函数 ============
    
    /**
     * @dev 设置StakingPool地址
     * @param _stakingPool StakingPool合约地址
     */
    function setStakingPool(address _stakingPool) external onlyOwner {
        require(_stakingPool != address(0), "CompoundPool: staking pool is zero address");
        
        address oldStakingPool = stakingPool;
        stakingPool = _stakingPool;
        
        emit StakingPoolSet(oldStakingPool, _stakingPool);
    }
    
    /**
     * @dev 更新日化收益率
     * @param newRate 新的收益率（基点）
     */
    function updateYieldRate(uint256 newRate) external onlyOwner {
        require(newRate >= DEFAULT_MIN_YIELD_RATE && newRate <= DEFAULT_MAX_YIELD_RATE, 
            "CompoundPool: rate out of range");
        
        emit YieldRateUpdated(currentYieldRate, newRate, block.timestamp);
        currentYieldRate = newRate;
    }
    
    /**
     * @dev 紧急暂停
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev 解除暂停
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev 紧急提取（仅限紧急情况）
     */
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "CompoundPool: zero address");
        require(etrToken.transfer(to, amount), "CompoundPool: transfer failed");
    }
    
    // ============ 查询函数 ============
    
    /**
     * @dev 获取当前日化收益率
     */
    function getCurrentYieldRate() external view returns (uint256) {
        return currentYieldRate;
    }
    
    /**
     * @dev 获取复利池统计信息
     */
    function getPoolStats() external view returns (
        uint256 _totalCompoundPool,
        uint256 _currentYieldRate,
        address _stakingPool
    ) {
        return (
            totalCompoundPool,
            currentYieldRate,
            stakingPool
        );
    }
}