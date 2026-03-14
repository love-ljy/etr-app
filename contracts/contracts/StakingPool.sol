// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ICompoundPool
 * @dev 复利池接口
 */
interface ICompoundPool {
    function depositReward(address user, uint256 amount) external;
}

/**
 * @title StakingPool
 * @dev 质押挖矿合约
 * - 质押ETR代币
 * - 50天锁仓机制
 * - 每日解锁2%本金
 * - 日化收益0.3%-0.6%（可配置）
 * - 每24小时结算收益
 * - 持仓<$100时收益归0
 */
contract StakingPool is Ownable, Pausable, ReentrancyGuard {
    
    // ============ 常量定义 ============
    uint256 public constant BPS_DENOMINATOR = 10000;      // 基点分母
    uint256 public constant SECONDS_PER_DAY = 86400;      // 每天秒数
    
    // 默认配置
    uint256 public constant DEFAULT_LOCK_PERIOD = 50 days;   // 锁仓周期50天
    uint256 public constant DEFAULT_DAILY_UNLOCK_RATE = 200;  // 每日解锁2% (基点)
    uint256 public constant DEFAULT_MIN_YIELD_RATE = 30;      // 最低日化0.3% (基点)
    uint256 public constant DEFAULT_MAX_YIELD_RATE = 60;      // 最高日化0.6% (基点)
    uint256 public constant DEFAULT_MIN_STAKE_VALUE_USD = 100 * 1e18; // 最低持仓$100
    
    // ============ 结构体定义 ============
    
    // 质押记录
    struct StakeRecord {
        uint256 stakeId;              // 质押记录ID
        address owner;                // 质押者地址
        uint256 principal;            // 质押本金（剩余）
        uint256 originalPrincipal;    // 原始质押本金
        uint256 startTime;            // 质押开始时间
        uint256 unlockTime;           // 完全解锁时间
        uint256 lastClaimTime;        // 上次领取收益时间
        uint256 totalClaimed;         // 累计已领取收益
        uint256 dailyYieldRate;       // 当前日化收益率（基点）
        bool active;                  // 是否有效
    }
    
    // 用户账户信息
    struct UserAccount {
        uint256[] stakeIds;           // 用户所有质押ID
        uint256 totalStaked;          // 总质押金额
        uint256 totalClaimed;         // 总领取收益
        bool isValid;                 // 账户是否有效
        uint256 lastValidityCheck;    // 上次有效性检查时间
    }
    
    // 池子配置
    struct PoolConfig {
        uint256 lockPeriod;           // 锁仓周期
        uint256 dailyUnlockRate;      // 每日解锁比例（基点）
        uint256 minYieldRate;         // 最低日化（基点）
        uint256 maxYieldRate;         // 最高日化（基点）
        uint256 minStakeValueUSD;     // 最低有效持仓（USD）
        uint256 settlementInterval;   // 结算间隔（秒）
    }
    
    // ============ 状态变量 ============
    
    PoolConfig public config;
    
    uint256 public nextStakeId;           // 下一个质押ID
    uint256 public totalStaked;           // 池子总质押量
    uint256 public totalRewardsDistributed; // 总已分发收益
    uint256 public currentYieldRate;      // 当前日化收益率（基点）
    uint256 public lastYieldUpdateTime;   // 上次收益率更新时间
    
    // 质押记录映射
    mapping(uint256 => StakeRecord) public stakes;
    mapping(address => UserAccount) public userAccounts;
    mapping(address => bool) public validAccounts;
    
    // 合约引用
    IERC20 public etrToken;
    address public referralSystem;
    address public priceOracle;
    address public dividendPool;
    address public compoundPool;
    
    // 奖励池机制
    uint256 public rewardPoolBalance;         // 奖励池余额
    uint256 public totalRewardsPaid;          // 总已支付奖励
    uint256 public constant REWARD_POOL_MIN_RESERVE = 10000 * 10**18; // 最小储备 10000 ETR
    
    // ============ 事件定义 ============
    
    event Staked(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount,
        uint256 unlockTime,
        uint256 timestamp
    );
    event Unstaked(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount,
        uint256 timestamp
    );
    event RewardClaimed(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount,
        uint256 timestamp
    );
    event AllRewardsClaimed(
        address indexed user,
        uint256 totalAmount,
        uint256 timestamp
    );
    event YieldRateUpdated(
        uint256 oldRate,
        uint256 newRate,
        uint256 timestamp
    );
    event AccountStatusChanged(
        address indexed user,
        bool isValid,
        uint256 portfolioValue,
        uint256 timestamp
    );
    event StakeRecordUpdated(
        uint256 indexed stakeId,
        uint256 remainingPrincipal,
        uint256 lastClaimTime
    );
    event ReferralRewardDistributed(
        address indexed user,
        address indexed referrer,
        uint256 rewardAmount,
        uint256 generation
    );
    event RewardPoolFunded(
        address indexed funder,
        uint256 amount,
        uint256 newBalance
    );
    event RewardPaid(
        address indexed user,
        uint256 amount,
        uint256 rewardPoolRemaining
    );
    event RewardPoolLow(
        uint256 currentBalance,
        uint256 minRequired
    );
    event CompoundPoolSet(
        address compoundPool
    );
    
    // ============ 修饰符 ============
    
    modifier validStake(uint256 stakeId) {
        require(stakes[stakeId].active, "StakingPool: stake not active");
        _;
    }
    
    modifier onlyReferralSystem() {
        require(msg.sender == referralSystem, "StakingPool: only referral system");
        _;
    }
    
    // ============ 构造函数 ============
    
    constructor(
        address _etrToken,
        address _priceOracle
    ) {
        require(_etrToken != address(0), "StakingPool: ETR token is zero address");
        require(_priceOracle != address(0), "StakingPool: price oracle is zero address");
        
        etrToken = IERC20(_etrToken);
        priceOracle = _priceOracle;
        
        // 初始化配置
        config = PoolConfig({
            lockPeriod: DEFAULT_LOCK_PERIOD,
            dailyUnlockRate: DEFAULT_DAILY_UNLOCK_RATE,
            minYieldRate: DEFAULT_MIN_YIELD_RATE,
            maxYieldRate: DEFAULT_MAX_YIELD_RATE,
            minStakeValueUSD: DEFAULT_MIN_STAKE_VALUE_USD,
            settlementInterval: SECONDS_PER_DAY
        });
        
        // 初始收益率设为中间值 0.45%
        currentYieldRate = 45;
        lastYieldUpdateTime = block.timestamp;
        nextStakeId = 1;
    }
    
    // ============ 核心函数 ============
    
    /**
     * @dev 质押ETR代币
     * @param amount 质押数量
     * @return stakeId 质押记录ID
     */
    function stake(uint256 amount) external whenNotPaused nonReentrant returns (uint256) {
        require(amount > 0, "StakingPool: amount must be greater than 0");
        
        // 获取当前价格计算质押价值
        uint256 etrPrice = _getETRPrice();
        uint256 stakeValueUSD = amount * etrPrice / 1e18;
        
        // 转ETR到合约
        require(
            etrToken.transferFrom(msg.sender, address(this), amount),
            "StakingPool: transfer failed"
        );
        
        // 创建质押记录
        uint256 stakeId = nextStakeId++;
        uint256 unlockTime = block.timestamp + config.lockPeriod;
        
        stakes[stakeId] = StakeRecord({
            stakeId: stakeId,
            owner: msg.sender,
            principal: amount,
            originalPrincipal: amount,
            startTime: block.timestamp,
            unlockTime: unlockTime,
            lastClaimTime: block.timestamp,
            totalClaimed: 0,
            dailyYieldRate: currentYieldRate,
            active: true
        });
        
        // 更新用户账户
        UserAccount storage account = userAccounts[msg.sender];
        account.stakeIds.push(stakeId);
        account.totalStaked += amount;
        
        // 更新全局统计
        totalStaked += amount;
        
        // 更新账户有效性
        _updateAccountValidity(msg.sender);
        
        // 如果是首次质押且有推荐人，绑定推荐关系
        if (account.stakeIds.length == 1 && referralSystem != address(0)) {
            // 尝试从调用数据中解析推荐人，这里简化处理
            // 实际项目中可能需要通过前端传入或单独的绑定函数
        }
        
        emit Staked(msg.sender, stakeId, amount, unlockTime, block.timestamp);
        
        return stakeId;
    }
    
    /**
     * @dev 解押ETR（只能解押已解锁部分）
     * @param stakeId 质押记录ID
     * @param amount 解押数量
     */
    function unstake(uint256 stakeId, uint256 amount) 
        external 
        whenNotPaused 
        nonReentrant 
        validStake(stakeId) 
    {
        StakeRecord storage record = stakes[stakeId];
        require(record.owner == msg.sender, "StakingPool: not owner");
        require(amount > 0, "StakingPool: amount must be greater than 0");
        
        // 计算可解押金额
        uint256 unstakableAmount = getUnstakableAmount(stakeId);
        require(amount <= unstakableAmount, "StakingPool: exceeds unstakable amount");
        require(amount <= record.principal, "StakingPool: exceeds principal");
        
        // 先领取该质押记录的收益
        uint256 pendingReward = _calculatePendingReward(stakeId);
        if (pendingReward > 0) {
            _claimReward(stakeId);
        }
        
        // 更新质押记录
        record.principal -= amount;
        if (record.principal == 0) {
            record.active = false;
        }
        
        // 更新用户账户
        UserAccount storage account = userAccounts[msg.sender];
        account.totalStaked -= amount;
        
        // 更新全局统计
        totalStaked -= amount;
        
        // 更新账户有效性
        _updateAccountValidity(msg.sender);
        
        // 转ETR给用户
        require(etrToken.transfer(msg.sender, amount), "StakingPool: transfer failed");
        
        emit Unstaked(msg.sender, stakeId, amount, block.timestamp);
    }
    
    /**
     * @dev 领取指定质押记录的收益
     * @param stakeId 质押记录ID
     * @return reward 领取的收益金额
     */
    function claimReward(uint256 stakeId) 
        external 
        whenNotPaused 
        nonReentrant 
        validStake(stakeId) 
        returns (uint256 reward) 
    {
        StakeRecord storage record = stakes[stakeId];
        require(record.owner == msg.sender, "StakingPool: not owner");
        
        return _claimReward(stakeId);
    }
    
    /**
     * @dev 领取所有质押记录的收益
     * @return totalReward 总领取收益
     */
    function claimAllRewards() external whenNotPaused nonReentrant returns (uint256 totalReward) {
        UserAccount storage account = userAccounts[msg.sender];
        uint256[] storage stakeIds = account.stakeIds;
        
        for (uint256 i = 0; i < stakeIds.length; i++) {
            uint256 stakeId = stakeIds[i];
            StakeRecord storage record = stakes[stakeId];
            
            if (record.active && record.owner == msg.sender) {
                uint256 reward = _calculatePendingReward(stakeId);
                if (reward > 0) {
                    _claimReward(stakeId);
                    totalReward += reward;
                }
            }
        }
        
        if (totalReward > 0) {
            emit AllRewardsClaimed(msg.sender, totalReward, block.timestamp);
        }
        
        return totalReward;
    }
    
    /**
     * @dev 内部函数：领取指定质押记录的收益
     */
    function _claimReward(uint256 stakeId) internal validStake(stakeId) returns (uint256 reward) {
        StakeRecord storage record = stakes[stakeId];
        
        // 检查账户有效性
        if (!isValidAccount(record.owner)) {
            // 账户无效，收益归0
            record.lastClaimTime = block.timestamp;
            emit StakeRecordUpdated(stakeId, record.principal, record.lastClaimTime);
            return 0;
        }
        
        reward = _calculatePendingReward(stakeId);
        if (reward == 0) {
            return 0;
        }
        
        // 检查奖励池余额是否充足
        require(rewardPoolBalance >= reward, "StakingPool: insufficient reward pool");
        
        // 更新记录
        record.totalClaimed += reward;
        record.lastClaimTime = block.timestamp;
        
        // 更新用户账户
        UserAccount storage account = userAccounts[record.owner];
        account.totalClaimed += reward;
        
        // 更新全局统计
        totalRewardsDistributed += reward;
        totalRewardsPaid += reward;
        rewardPoolBalance -= reward;
        
        // 分发推荐奖励（复利池不参与推荐奖励计算）
        _distributeReferralRewards(record.owner, reward);
        
        // 将收益转入复利池（而非直接给用户）
        if (compoundPool != address(0)) {
            ICompoundPool(compoundPool).depositReward(record.owner, reward);
        } else {
            // 如果复利池未设置，则直接转账给用户（向后兼容）
            require(etrToken.transfer(record.owner, reward), "StakingPool: reward transfer failed");
        }
        
        emit RewardClaimed(record.owner, stakeId, reward, block.timestamp);
        emit StakeRecordUpdated(stakeId, record.principal, record.lastClaimTime);
        emit RewardPaid(record.owner, reward, rewardPoolBalance);
        
        // 检查奖励池是否过低
        if (rewardPoolBalance < REWARD_POOL_MIN_RESERVE) {
            emit RewardPoolLow(rewardPoolBalance, REWARD_POOL_MIN_RESERVE);
        }
        
        return reward;
    }
    
    /**
     * @dev 计算指定质押记录的待领取收益
     * @param stakeId 质押记录ID
     * @return reward 待领取收益
     */
    function calculatePendingReward(uint256 stakeId) external view validStake(stakeId) returns (uint256) {
        StakeRecord storage record = stakes[stakeId];
        
        // 检查账户有效性
        if (!isValidAccount(record.owner)) {
            return 0;
        }
        
        return _calculatePendingReward(stakeId);
    }
    
    /**
     * @dev 内部函数：计算待领取收益
     */
    function _calculatePendingReward(uint256 stakeId) internal view returns (uint256) {
        StakeRecord storage record = stakes[stakeId];
        
        uint256 timeElapsed = block.timestamp - record.lastClaimTime;
        if (timeElapsed < config.settlementInterval) {
            return 0;
        }
        
        uint256 daysElapsed = timeElapsed / config.settlementInterval;
        
        // 收益 = 本金 * 日化率 * 天数 / 10000
        uint256 reward = record.principal * record.dailyYieldRate * daysElapsed / BPS_DENOMINATOR;
        
        return reward;
    }
    
    /**
     * @dev 计算可解押金额（已解锁部分）
     * @param stakeId 质押记录ID
     * @return amount 可解押金额
     */
    function getUnstakableAmount(uint256 stakeId) public view validStake(stakeId) returns (uint256) {
        StakeRecord storage record = stakes[stakeId];
        
        if (block.timestamp < record.startTime) {
            return 0;
        }
        
        uint256 timeElapsed = block.timestamp - record.startTime;
        
        // 如果已经超过完全解锁时间，可以解押全部剩余本金
        if (block.timestamp >= record.unlockTime) {
            return record.principal;
        }
        
        // 计算已解锁比例
        uint256 daysElapsed = timeElapsed / SECONDS_PER_DAY;
        uint256 unlockedPercent = daysElapsed * config.dailyUnlockRate;
        
        if (unlockedPercent > BPS_DENOMINATOR) {
            unlockedPercent = BPS_DENOMINATOR;
        }
        
        uint256 totalUnlocked = record.originalPrincipal * unlockedPercent / BPS_DENOMINATOR;
        uint256 alreadyUnstaked = record.originalPrincipal - record.principal;
        
        if (totalUnlocked <= alreadyUnstaked) {
            return 0;
        }
        
        return totalUnlocked - alreadyUnstaked;
    }
    
    /**
     * @dev 计算用户总质押价值（USD）
     * @param user 用户地址
     * @return valueUSD USD价值（18位小数）
     */
    function getUserPortfolioValue(address user) public view returns (uint256) {
        UserAccount storage account = userAccounts[user];
        if (account.totalStaked == 0) {
            return 0;
        }
        
        uint256 etrPrice = _getETRPrice();
        return account.totalStaked * etrPrice / 1e18;
    }
    
    /**
     * @dev 检查账户是否有效（持仓>=$100）
     * @param user 用户地址
     * @return isValid 是否有效
     */
    function isValidAccount(address user) public view returns (bool) {
        return validAccounts[user];
    }
    
    /**
     * @dev 更新账户有效性状态
     */
    function _updateAccountValidity(address user) internal {
        uint256 portfolioValue = getUserPortfolioValue(user);
        bool isValid = portfolioValue >= config.minStakeValueUSD;
        
        UserAccount storage account = userAccounts[user];
        
        if (account.isValid != isValid) {
            account.isValid = isValid;
            account.lastValidityCheck = block.timestamp;
            validAccounts[user] = isValid;
            
            emit AccountStatusChanged(user, isValid, portfolioValue, block.timestamp);
        }
    }
    
    /**
     * @dev 刷新账户有效性（可由外部调用）
     * @param user 用户地址
     */
    function refreshAccountStatus(address user) external {
        _updateAccountValidity(user);
    }
    
    /**
     * @dev 分发推荐奖励
     */
    function _distributeReferralRewards(address staker, uint256 baseReward) internal {
        if (referralSystem == address(0)) {
            return;
        }
        
        // 通过调用ReferralSystem合约来计算和分发推荐奖励
        // 这里简化处理，实际应该调用ReferralSystem的distributeReferralReward函数
        // 由于ReferralSystem还未部署，先预留接口
        
        // IReferralSystem(referralSystem).distributeReferralReward(staker, baseReward);
    }
    
    /**
     * @dev 获取ETR价格（从PriceOracle）
     */
    function _getETRPrice() internal view returns (uint256) {
        // 调用PriceOracle获取价格
        // 这里简化处理，返回固定价格用于测试
        // 实际应该调用: IPriceOracle(priceOracle).getETRPriceInUSD();
        
        // 临时返回 $1.00 (1e18)
        return 1e18;
    }
    
    // ============ 管理员函数 ============
    
    /**
     * @dev 设置合约引用
     */
    function setContracts(
        address _referralSystem,
        address _dividendPool
    ) external onlyOwner {
        referralSystem = _referralSystem;
        dividendPool = _dividendPool;
    }
    
    /**
     * @dev 设置复利池地址
     * @param _compoundPool 复利池合约地址
     */
    function setCompoundPool(address _compoundPool) external onlyOwner {
        require(_compoundPool != address(0), "StakingPool: compound pool is zero address");
        compoundPool = _compoundPool;
        
        emit CompoundPoolSet(_compoundPool);
    }
    
    /**
     * @dev 更新收益率
     * @param newRate 新的收益率（基点）
     */
    function updateYieldRate(uint256 newRate) external onlyOwner {
        require(newRate >= config.minYieldRate && newRate <= config.maxYieldRate, 
            "StakingPool: rate out of range");
        
        emit YieldRateUpdated(currentYieldRate, newRate, block.timestamp);
        currentYieldRate = newRate;
        lastYieldUpdateTime = block.timestamp;
    }
    
    /**
     * @dev 更新池子配置
     */
    function updateConfig(
        uint256 _lockPeriod,
        uint256 _dailyUnlockRate,
        uint256 _minYieldRate,
        uint256 _maxYieldRate,
        uint256 _minStakeValueUSD
    ) external onlyOwner {
        config.lockPeriod = _lockPeriod;
        config.dailyUnlockRate = _dailyUnlockRate;
        config.minYieldRate = _minYieldRate;
        config.maxYieldRate = _maxYieldRate;
        config.minStakeValueUSD = _minStakeValueUSD;
    }
    
    /**
     * @dev 紧急解押（仅限紧急情况）
     * @param stakeId 质押记录ID
     */
    function emergencyUnstake(uint256 stakeId) external nonReentrant validStake(stakeId) {
        StakeRecord storage record = stakes[stakeId];
        require(record.owner == msg.sender, "StakingPool: not owner");
        require(paused(), "StakingPool: not in emergency mode");
        
        uint256 amount = record.principal;
        record.principal = 0;
        record.active = false;
        
        UserAccount storage account = userAccounts[msg.sender];
        account.totalStaked -= amount;
        totalStaked -= amount;
        
        _updateAccountValidity(msg.sender);
        
        require(etrToken.transfer(msg.sender, amount), "StakingPool: transfer failed");
        
        emit Unstaked(msg.sender, stakeId, amount, block.timestamp);
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
        require(to != address(0), "StakingPool: zero address");
        require(etrToken.transfer(to, amount), "StakingPool: transfer failed");
    }
    
    // ============ 查询函数 ============
    
    /**
     * @dev 获取用户所有质押记录
     * @param user 用户地址
     * @return userStakes 质押记录数组
     */
    function getUserStakes(address user) external view returns (StakeRecord[] memory) {
        UserAccount storage account = userAccounts[user];
        uint256[] storage stakeIds = account.stakeIds;
        
        StakeRecord[] memory userStakes = new StakeRecord[](stakeIds.length);
        for (uint256 i = 0; i < stakeIds.length; i++) {
            userStakes[i] = stakes[stakeIds[i]];
        }
        
        return userStakes;
    }
    
    /**
     * @dev 获取质押记录详情
     * @param stakeId 质押记录ID
     * @return 质押记录
     */
    function getStake(uint256 stakeId) external view returns (StakeRecord memory) {
        return stakes[stakeId];
    }
    
    /**
     * @dev 获取池子统计信息
     */
    function getPoolStats() external view returns (
        uint256 _totalStaked,
        uint256 _totalRewardsDistributed,
        uint256 _activeStakers,
        uint256 _currentYieldRate
    ) {
        // 计算活跃质押者数量（简化版）
        uint256 activeStakers = 0;
        // 实际实现可能需要遍历或维护单独计数器
        
        return (
            totalStaked,
            totalRewardsDistributed,
            activeStakers,
            currentYieldRate
        );
    }
    
    /**
     * @dev 获取当前日化收益率
     */
    function getCurrentYieldRate() external view returns (uint256) {
        return currentYieldRate;
    }
    
    /**
     * @dev 获取用户账户信息
     */
    function getUserAccount(address user) external view returns (UserAccount memory) {
        return userAccounts[user];
    }

    // ============ 奖励池管理函数 ============

    /**
     * @dev 充值奖励池
     * @param amount 充值金额
     */
    function fundRewardPool(uint256 amount) external nonReentrant {
        require(amount > 0, "StakingPool: amount must be greater than 0");
        
        // 转账ETR到合约
        require(
            etrToken.transferFrom(msg.sender, address(this), amount),
            "StakingPool: transfer failed"
        );
        
        rewardPoolBalance += amount;
        
        emit RewardPoolFunded(msg.sender, amount, rewardPoolBalance);
    }

    /**
     * @dev 查看奖励池余额
     * @return 奖励池当前余额
     */
    function getRewardPoolBalance() external view returns (uint256) {
        return rewardPoolBalance;
    }

    /**
     * @dev 检查奖励池是否充足（可以支付至少30天的收益）
     * @return 是否充足
     */
    function isRewardPoolSufficient() external view returns (bool) {
        return rewardPoolBalance >= REWARD_POOL_MIN_RESERVE;
    }

    /**
     * @dev 计算整个池子的每日预估奖励支出
     * @return 每日预估奖励
     */
    function estimateDailyRewardExpense() external view returns (uint256) {
        return totalStaked * currentYieldRate / BPS_DENOMINATOR;
    }

    /**
     * @dev 获取奖励池统计信息
     */
    function getRewardPoolStats() external view returns (
        uint256 poolBalance,
        uint256 totalPaid,
        uint256 minReserve,
        uint256 estimatedDailyExpense
    ) {
        return (
            rewardPoolBalance,
            totalRewardsPaid,
            REWARD_POOL_MIN_RESERVE,
            this.estimateDailyRewardExpense()
        );
    }

    /**
     * @dev 紧急补充奖励池（仅管理员）
     * @param amount 补充金额
     */
    function emergencyFundRewardPool(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "StakingPool: amount must be greater than 0");
        
        require(
            etrToken.transferFrom(msg.sender, address(this), amount),
            "StakingPool: transfer failed"
        );
        
        rewardPoolBalance += amount;
        
        emit RewardPoolFunded(msg.sender, amount, rewardPoolBalance);
    }
}