// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ICompoundPool
 * @dev 复利池接口
 */
interface ICompoundPool {
    function depositReward(address user, uint256 amount) external;
}

/**
 * @title IReferralSystem
 * @dev 推荐系统接口
 */
interface IReferralSystem {
    function distributeReferralReward(address staker, uint256 baseReward) external returns (uint256);
    function bindReferrer(address user, address referrer) external;
    function getReferrer(address user) external view returns (address);
}

/**
 * @title StakingPoolV2
 * @dev USDT 质押挖矿合约 V2
 * - 质押 USDT 代币
 * - 赚取 ETR 代币收益
 * - 50 天锁仓机制
 * - 每日解锁 2% 本金
 * - 日化收益 0.3%-0.6%（可配置）
 * - 每 24 小时结算收益
 * - 持仓<$100 时收益归 0
 */
contract StakingPoolV2 is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ 常量定义 ============
    uint256 public constant BPS_DENOMINATOR = 10000;      // 基点分母
    uint256 public constant SECONDS_PER_DAY = 86400;      // 每天秒数
    
    // 默认配置
    uint256 public constant DEFAULT_LOCK_PERIOD = 50 days;   // 锁仓周期 50 天
    uint256 public constant DEFAULT_DAILY_UNLOCK_RATE = 200;  // 每日解锁 2% (基点)
    uint256 public constant DEFAULT_MIN_YIELD_RATE = 30;      // 最低日化 0.3% (基点)
    uint256 public constant DEFAULT_MAX_YIELD_RATE = 60;      // 最高日化 0.6% (基点)
    uint256 public constant DEFAULT_MIN_STAKE_VALUE_USD = 100 * 1e18; // 最低持仓$100
    
    // ============ 结构体定义 ============
    
    // 质押记录
    struct StakeRecord {
        uint256 stakeId;              // 质押记录 ID
        address owner;                // 质押者地址
        uint256 stakedUSDT;           // 质押的 USDT 数量 (18 位)
        uint256 principal;            // ETR 本金（用于计算解锁）
        uint256 originalPrincipal;    // 原始 ETR 本金
        uint256 startTime;            // 质押开始时间
        uint256 unlockTime;           // 完全解锁时间
        uint256 lastClaimTime;        // 上次领取收益时间
        uint256 totalClaimed;         // 累计已领取收益 (ETR)
        uint256 dailyYieldRate;       // 当前日化收益率（基点）
        bool active;                  // 是否有效
    }
    
    // 用户账户信息
    struct UserAccount {
        uint256[] stakeIds;           // 用户所有质押 ID
        uint256 totalStakedUSDT;      // 总质押 USDT 金额
        uint256 totalClaimed;         // 总领取收益 (ETR)
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
    
    uint256 public nextStakeId;           // 下一个质押 ID
    uint256 public totalStakedUSDT;       // 池子总质押 USDT 量
    uint256 public totalRewardsDistributed; // 总已分发收益 (ETR)
    uint256 public currentYieldRate;      // 当前日化收益率（基点）
    uint256 public lastYieldUpdateTime;   // 上次收益率更新时间
    uint256 public etrPriceUSD;           // ETR 价格 (18 位小数，如$0.25 = 0.25e18)
    
    // 质押记录映射
    mapping(uint256 => StakeRecord) public stakes;
    mapping(address => UserAccount) public userAccounts;
    mapping(address => bool) public validAccounts;
    
    // 合约引用
    IERC20 public etrToken;
    IERC20 public usdtToken;
    address public referralSystem;
    address public priceOracle;
    address public dividendPool;
    address public compoundPool;
    
    // 奖励池机制
    uint256 public rewardPoolBalance;         // 奖励池余额 (ETR)
    uint256 public totalRewardsPaid;          // 总已支付奖励 (ETR)
    uint256 public constant REWARD_POOL_MIN_RESERVE = 10000 * 10**18; // 最小储备 10000 ETR
    
    // ============ 事件定义 ============
    
    event Staked(
        address indexed user,
        uint256 indexed stakeId,
        uint256 usdtAmount,
        uint256 etrAmount,
        uint256 unlockTime,
        uint256 timestamp
    );
    event Unstaked(
        address indexed user,
        uint256 indexed stakeId,
        uint256 usdtAmount,
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
    event ETRPriceUpdated(
        uint256 oldPrice,
        uint256 newPrice,
        uint256 timestamp
    );
    event ReferrerBound(
        address indexed user,
        address indexed referrer
    );
    
    // ============ 修饰符 ============
    
    modifier validStake(uint256 stakeId) {
        require(stakes[stakeId].active, "StakingPoolV2: stake not active");
        _;
    }
    
    modifier onlyReferralSystem() {
        require(msg.sender == referralSystem, "StakingPoolV2: only referral system");
        _;
    }
    
    // ============ 构造函数 ============
    
    constructor(
        address _etrToken,
        address _usdtToken,
        address _priceOracle,
        uint256 _initialEtrPriceUSD
    ) {
        require(_etrToken != address(0), "StakingPoolV2: ETR token is zero address");
        require(_usdtToken != address(0), "StakingPoolV2: USDT token is zero address");
        require(_priceOracle != address(0), "StakingPoolV2: price oracle is zero address");
        require(_initialEtrPriceUSD > 0, "StakingPoolV2: initial ETR price must be > 0");
        
        etrToken = IERC20(_etrToken);
        usdtToken = IERC20(_usdtToken);
        priceOracle = _priceOracle;
        etrPriceUSD = _initialEtrPriceUSD;
        
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
     * @dev 质押 USDT 代币
     * @param usdtAmount 质押 USDT 数量
     * @param referrer 推荐人地址（可选，address(0) 表示无推荐人）
     * @return stakeId 质押记录 ID
     */
    function stake(uint256 usdtAmount, address referrer) external whenNotPaused nonReentrant returns (uint256) {
        require(usdtAmount > 0, "StakingPoolV2: amount must be greater than 0");
        
        // 计算应得 ETR 份额（按当前价格）
        uint256 etrAmount = usdtAmount * 1e18 / etrPriceUSD;
        
        // 转移 USDT 到合约
        usdtToken.safeTransferFrom(msg.sender, address(this), usdtAmount);
        
        // 创建质押记录
        uint256 stakeId = nextStakeId++;
        uint256 unlockTime = block.timestamp + config.lockPeriod;
        
        stakes[stakeId] = StakeRecord({
            stakeId: stakeId,
            owner: msg.sender,
            stakedUSDT: usdtAmount,
            principal: etrAmount,
            originalPrincipal: etrAmount,
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
        account.totalStakedUSDT += usdtAmount;
        
        // 更新全局统计
        totalStakedUSDT += usdtAmount;
        
        // 更新账户有效性
        _updateAccountValidity(msg.sender);
        
        // 绑定推荐关系（如果是首次质押且有推荐人）
        if (account.stakeIds.length == 1 && referrer != address(0) && referralSystem != address(0)) {
            _bindReferrer(msg.sender, referrer);
        }
        
        emit Staked(msg.sender, stakeId, usdtAmount, etrAmount, unlockTime, block.timestamp);
        
        return stakeId;
    }
    
    /**
     * @dev 绑定推荐人（质押前调用）
     */
    function _bindReferrer(address user, address referrer) internal {
        if (referrer == address(0)) {
            return;
        }
        
        // 使用低级调用避免 revert
        (bool success, ) = referralSystem.call(
            abi.encodeWithSignature("bindReferrer(address,address)", user, referrer)
        );
        
        if (success) {
            emit ReferrerBound(user, referrer);
        }
        // 失败不影响质押
    }
    
    /**
     * @dev 解押 USDT（只能解押已解锁部分）
     * @param stakeId 质押记录 ID
     * @return usdtAmount 解押 USDT 数量
     */
    function unstake(uint256 stakeId) 
        external 
        whenNotPaused 
        nonReentrant 
        validStake(stakeId) 
        returns (uint256 usdtAmount)
    {
        StakeRecord storage record = stakes[stakeId];
        require(record.owner == msg.sender, "StakingPoolV2: not owner");
        
        // 计算可解押 USDT 金额（按解锁比例）
        uint256 unstakableUSDT = getUnstakableUSDT(stakeId);
        require(unstakableUSDT > 0, "StakingPoolV2: nothing to unstake");
        
        // 先领取该质押记录的收益
        uint256 pendingReward = _calculatePendingReward(stakeId);
        if (pendingReward > 0) {
            _claimReward(stakeId);
        }
        
        // 计算解锁比例
        uint256 unlockRatio = _getUnlockRatio(stakeId);
        uint256 usdtToReturn = record.stakedUSDT * unlockRatio / BPS_DENOMINATOR;
        
        // 更新质押记录
        record.stakedUSDT -= usdtToReturn;
        record.principal = record.stakedUSDT * 1e18 / etrPriceUSD;
        record.originalPrincipal = record.principal;
        
        if (record.stakedUSDT == 0) {
            record.active = false;
        }
        
        // 更新用户账户
        UserAccount storage account = userAccounts[msg.sender];
        account.totalStakedUSDT -= usdtToReturn;
        
        // 更新全局统计
        totalStakedUSDT -= usdtToReturn;
        
        // 更新账户有效性
        _updateAccountValidity(msg.sender);
        
        // 转 USDT 给用户
        usdtToken.safeTransfer(msg.sender, usdtToReturn);
        
        emit Unstaked(msg.sender, stakeId, usdtToReturn, block.timestamp);
        
        return usdtToReturn;
    }
    
    /**
     * @dev 领取指定质押记录的收益
     * @param stakeId 质押记录 ID
     * @return reward 领取的收益金额 (ETR)
     */
    function claimReward(uint256 stakeId) 
        external 
        whenNotPaused 
        nonReentrant 
        validStake(stakeId) 
        returns (uint256 reward) 
    {
        StakeRecord storage record = stakes[stakeId];
        require(record.owner == msg.sender, "StakingPoolV2: not owner");
        
        return _claimReward(stakeId);
    }
    
    /**
     * @dev 领取所有质押记录的收益
     * @return totalReward 总领取收益 (ETR)
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
            record.lastClaimTime = block.timestamp;
            emit StakeRecordUpdated(stakeId, record.principal, record.lastClaimTime);
            return 0;
        }
        
        reward = _calculatePendingReward(stakeId);
        if (reward == 0) {
            return 0;
        }
        
        // 检查奖励池余额是否充足
        require(rewardPoolBalance >= reward, "StakingPoolV2: insufficient reward pool");
        
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
        
        // 分发推荐奖励
        _distributeReferralRewards(record.owner, reward);
        
        // 将收益转入复利池
        if (compoundPool != address(0)) {
            ICompoundPool(compoundPool).depositReward(record.owner, reward);
        } else {
            // 如果复利池未设置，则直接转账给用户
            etrToken.safeTransfer(record.owner, reward);
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
     */
    function calculatePendingReward(uint256 stakeId) external view validStake(stakeId) returns (uint256) {
        StakeRecord storage record = stakes[stakeId];
        
        if (!isValidAccount(record.owner)) {
            return 0;
        }
        
        return _calculatePendingReward(stakeId);
    }
    
    /**
     * @dev 内部函数：计算待领取收益 (ETR)
     * 收益 = 质押 USDT 价值 × 日化率 × 天数
     */
    function _calculatePendingReward(uint256 stakeId) internal view returns (uint256) {
        StakeRecord storage record = stakes[stakeId];
        
        uint256 timeElapsed = block.timestamp - record.lastClaimTime;
        if (timeElapsed < config.settlementInterval) {
            return 0;
        }
        
        uint256 daysElapsed = timeElapsed / config.settlementInterval;
        
        // 计算 USDT 价值的收益（USDT 计）
        uint256 rewardUSDT = record.stakedUSDT * record.dailyYieldRate * daysElapsed / BPS_DENOMINATOR;
        
        // 转换为 ETR
        uint256 rewardETR = rewardUSDT * 1e18 / etrPriceUSD;
        
        return rewardETR;
    }
    
    /**
     * @dev 计算可解押 USDT 金额（已解锁部分）
     */
    function getUnstakableUSDT(uint256 stakeId) public view validStake(stakeId) returns (uint256) {
        StakeRecord storage record = stakes[stakeId];
        
        uint256 unlockRatio = _getUnlockRatio(stakeId);
        return record.stakedUSDT * unlockRatio / BPS_DENOMINATOR;
    }
    
    /**
     * @dev 获取解锁比例（基点）
     */
    function _getUnlockRatio(uint256 stakeId) internal view returns (uint256) {
        StakeRecord storage record = stakes[stakeId];
        
        if (block.timestamp < record.startTime) {
            return 0;
        }
        
        // 如果已经完全解锁，返回 100%
        if (block.timestamp >= record.unlockTime) {
            return BPS_DENOMINATOR;
        }
        
        uint256 timeElapsed = block.timestamp - record.startTime;
        uint256 daysElapsed = timeElapsed / SECONDS_PER_DAY;
        uint256 unlockedPercent = daysElapsed * config.dailyUnlockRate;
        
        if (unlockedPercent > BPS_DENOMINATOR) {
            unlockedPercent = BPS_DENOMINATOR;
        }
        
        // 计算已解押比例
        uint256 alreadyUnstakedRatio = 0;
        if (record.originalPrincipal > 0) {
            alreadyUnstakedRatio = (record.originalPrincipal - record.principal) * BPS_DENOMINATOR / record.originalPrincipal;
        }
        
        if (unlockedPercent <= alreadyUnstakedRatio) {
            return 0;
        }
        
        return unlockedPercent - alreadyUnstakedRatio;
    }
    
    /**
     * @dev 计算用户总质押价值（USD）
     */
    function getUserPortfolioValue(address user) public view returns (uint256) {
        UserAccount storage account = userAccounts[user];
        return account.totalStakedUSDT;
    }
    
    /**
     * @dev 检查账户是否有效（持仓>=$100）
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
     * @dev 刷新账户有效性
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
        
        // 使用低级调用避免 revert
        (bool success, bytes memory data) = referralSystem.call(
            abi.encodeWithSignature("distributeReferralReward(address,uint256)", staker, baseReward)
        );
        
        if (success && data.length >= 32) {
            uint256 referralReward = abi.decode(data, (uint256));
            if (referralReward > 0) {
                address referrer = IReferralSystem(referralSystem).getReferrer(staker);
                emit ReferralRewardDistributed(staker, referrer, referralReward, 1);
            }
        }
        // 失败不影响主流程
    }
    
    // ============ 管理员函数 ============
    
    /**
     * @dev 设置合约引用
     */
    function setContracts(
        address _referralSystem,
        address _dividendPool,
        address _compoundPool
    ) external onlyOwner {
        referralSystem = _referralSystem;
        dividendPool = _dividendPool;
        compoundPool = _compoundPool;
    }
    
    /**
     * @dev 设置复利池地址
     */
    function setCompoundPool(address _compoundPool) external onlyOwner {
        require(_compoundPool != address(0), "StakingPoolV2: compound pool is zero address");
        compoundPool = _compoundPool;
        emit CompoundPoolSet(_compoundPool);
    }
    
    /**
     * @dev 更新 ETR 价格
     */
    function updateETRPrice(uint256 _newPrice) external onlyOwner {
        require(_newPrice > 0, "StakingPoolV2: price must be > 0");
        uint256 oldPrice = etrPriceUSD;
        etrPriceUSD = _newPrice;
        emit ETRPriceUpdated(oldPrice, _newPrice, block.timestamp);
    }
    
    /**
     * @dev 更新收益率
     */
    function updateYieldRate(uint256 newRate) external onlyOwner {
        require(newRate >= config.minYieldRate && newRate <= config.maxYieldRate, 
            "StakingPoolV2: rate out of range");
        
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
     * @dev 紧急提取 USDT（仅限紧急情况）
     */
    function emergencyWithdrawUSDT(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "StakingPoolV2: zero address");
        usdtToken.safeTransfer(to, amount);
    }
    
    /**
     * @dev 紧急提取 ETR（仅限紧急情况）
     */
    function emergencyWithdrawETR(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "StakingPoolV2: zero address");
        etrToken.safeTransfer(to, amount);
    }
    
    // ============ 查询函数 ============
    
    /**
     * @dev 获取用户所有质押记录
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
     */
    function getStake(uint256 stakeId) external view returns (StakeRecord memory) {
        return stakes[stakeId];
    }
    
    /**
     * @dev 获取池子统计信息
     */
    function getPoolStats() external view returns (
        uint256 _totalStakedUSDT,
        uint256 _totalRewardsDistributed,
        uint256 _activeStakers,
        uint256 _currentYieldRate,
        uint256 _etrPriceUSD
    ) {
        uint256 activeStakers = 0;
        // 简化实现，实际需要遍历或维护计数器
        
        return (
            totalStakedUSDT,
            totalRewardsDistributed,
            activeStakers,
            currentYieldRate,
            etrPriceUSD
        );
    }
    
    /**
     * @dev 获取用户账户信息
     */
    function getUserAccount(address user) external view returns (UserAccount memory) {
        return userAccounts[user];
    }

    // ============ 奖励池管理函数 ============

    /**
     * @dev 充值奖励池 (ETR)
     */
    function fundRewardPool(uint256 amount) external nonReentrant {
        require(amount > 0, "StakingPoolV2: amount must be greater than 0");
        
        etrToken.safeTransferFrom(msg.sender, address(this), amount);
        
        rewardPoolBalance += amount;
        
        emit RewardPoolFunded(msg.sender, amount, rewardPoolBalance);
    }

    /**
     * @dev 查看奖励池余额
     */
    function getRewardPoolBalance() external view returns (uint256) {
        return rewardPoolBalance;
    }

    /**
     * @dev 检查奖励池是否充足
     */
    function isRewardPoolSufficient() external view returns (bool) {
        return rewardPoolBalance >= REWARD_POOL_MIN_RESERVE;
    }

    /**
     * @dev 计算整个池子的每日预估奖励支出 (ETR)
     */
    function estimateDailyRewardExpense() external view returns (uint256) {
        // USDT 总质押 × 日化率 / 10000 → USDT 收益 → 转换为 ETR
        uint256 rewardUSDT = totalStakedUSDT * currentYieldRate / BPS_DENOMINATOR;
        return rewardUSDT * 1e18 / etrPriceUSD;
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
     */
    function emergencyFundRewardPool(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "StakingPoolV2: amount must be greater than 0");
        
        etrToken.safeTransferFrom(msg.sender, address(this), amount);
        
        rewardPoolBalance += amount;
        
        emit RewardPoolFunded(msg.sender, amount, rewardPoolBalance);
    }
}
