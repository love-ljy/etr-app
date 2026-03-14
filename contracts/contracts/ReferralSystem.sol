// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ReferralSystem
 * @dev 三代推荐系统合约
 * - 绑定推荐关系（三代）
 * - 烧伤机制：推荐人收益上限 = min(推荐人持仓, 被推荐人持仓)
 * - 三代奖励：第一代3%、第二代2%、第三代1%
 * - 30个账户封顶，第31个起固定90%
 * - 推荐人必须是有效账户（持仓>=$100）
 */
contract ReferralSystem is Ownable, Pausable, ReentrancyGuard {
    
    // ============ 常量定义 ============
    uint256 public constant BPS_DENOMINATOR = 10000;      // 基点分母
    
    // 默认推荐奖励比例（基点）
    uint256 public constant DEFAULT_FIRST_GEN_RATE = 300;   // 第一代 3%
    uint256 public constant DEFAULT_SECOND_GEN_RATE = 200;  // 第二代 2%
    uint256 public constant DEFAULT_THIRD_GEN_RATE = 100;   // 第三代 1%
    uint256 public constant MAX_STACK_COUNT = 30;           // 最大叠加数量
    
    // 最大奖励比例（达到30个后的固定比例）
    uint256 public constant MAX_FIRST_GEN_TOTAL = 9000;     // 第一代最高90%
    uint256 public constant MAX_SECOND_GEN_TOTAL = 6000;    // 第二代最高60%
    uint256 public constant MAX_THIRD_GEN_TOTAL = 3000;     // 第三代最高30%
    
    // ============ 结构体定义 ============
    
    // 推荐配置
    struct ReferralConfig {
        uint256 firstGenRate;         // 第一代收益率（基点）
        uint256 secondGenRate;        // 第二代收益率（基点）
        uint256 thirdGenRate;         // 第三代收益率（基点）
        uint256 maxStackCount;        // 最大叠加数
        uint256 minValidStake;        // 最低有效质押（USD）
    }
    
    // 推荐人信息
    struct ReferrerInfo {
        address referrer;             // 直接推荐人
        address[] directReferrals;    // 直推列表
        uint256 directCount;          // 直推数量
        uint256 secondGenCount;       // 二代数量
        uint256 thirdGenCount;        // 三代数量
        uint256 totalReferralReward;  // 累计推荐奖励
        bool isValid;                 // 推荐人是否有效
        uint256 stakeValue;           // 推荐人质押价值（用于烧伤计算）
    }
    
    // 奖励计算结果
    struct RewardCalculation {
        uint256 firstGenReward;       // 第一代奖励
        uint256 secondGenReward;      // 第二代奖励
        uint256 thirdGenReward;       // 第三代奖励
        uint256 totalReward;          // 总奖励
        uint256 burnAmount;           // 烧伤金额
    }
    
    // ============ 状态变量 ============
    
    ReferralConfig public config;
    
    // 推荐关系映射
    mapping(address => address) public referrers;                           // 用户 => 推荐人
    mapping(address => address[]) public directReferrals;                   // 推荐人 => 直推列表
    mapping(address => mapping(uint256 => uint256)) public genCounts;       // 推荐人 => 代际 => 数量
    mapping(address => uint256) public totalReferralRewards;                // 累计推荐奖励
    mapping(address => bool) public validReferrers;                         // 有效推荐人
    mapping(address => uint256) public referrerStakeValues;                 // 推荐人质押价值
    
    // 烧伤记录：推荐人 => 被推荐人 => 烧伤金额
    mapping(address => mapping(address => uint256)) public burnedRewards;
    
    // 用户推荐统计
    mapping(address => ReferrerInfo) public referrerInfos;
    
    // 合约引用
    address public stakingPool;
    address public etrToken;
    address public priceOracle;
    
    // ============ 事件定义 ============
    
    event ReferralBound(
        address indexed user,
        address indexed referrer,
        uint256 timestamp
    );
    event ReferralRewardDistributed(
        address indexed referrer,
        address indexed staker,
        uint256 generation,
        uint256 rewardAmount,
        uint256 burnAmount
    );
    event ReferrerStatusChanged(
        address indexed referrer,
        bool isValid,
        uint256 stakeValue
    );
    event MaxRewardReached(
        address indexed referrer,
        uint256 generation,
        uint256 stackCount
    );
    event ReferralStatsUpdated(
        address indexed referrer,
        uint256 directCount,
        uint256 secondGenCount,
        uint256 thirdGenCount
    );
    event BurnApplied(
        address indexed referrer,
        address indexed staker,
        uint256 expectedReward,
        uint256 actualReward,
        uint256 burnAmount
    );
    
    // ============ 修饰符 ============
    
    modifier onlyStakingPool() {
        require(msg.sender == stakingPool, "ReferralSystem: only staking pool");
        _;
    }
    
    modifier validReferrer(address referrer) {
        require(referrer != address(0), "ReferralSystem: invalid referrer");
        require(referrer != msg.sender, "ReferralSystem: cannot refer self");
        _;
    }
    
    // ============ 构造函数 ============
    
    constructor(
        address _stakingPool,
        address _priceOracle
    ) {
        require(_stakingPool != address(0), "ReferralSystem: staking pool is zero address");
        require(_priceOracle != address(0), "ReferralSystem: price oracle is zero address");
        
        stakingPool = _stakingPool;
        priceOracle = _priceOracle;
        
        // 初始化配置
        config = ReferralConfig({
            firstGenRate: DEFAULT_FIRST_GEN_RATE,
            secondGenRate: DEFAULT_SECOND_GEN_RATE,
            thirdGenRate: DEFAULT_THIRD_GEN_RATE,
            maxStackCount: MAX_STACK_COUNT,
            minValidStake: 100 * 1e18  // $100
        });
    }
    
    // ============ 核心函数 ============
    
    /**
     * @dev 绑定推荐关系
     * @param user 被推荐用户
     * @param referrer 推荐人地址
     */
    function bindReferrer(address user, address referrer) 
        external 
        onlyStakingPool 
        validReferrer(referrer) 
    {
        require(referrers[user] == address(0), "ReferralSystem: already has referrer");
        require(_getStakingPool().isValidAccount(referrer), "ReferralSystem: referrer not valid");
        
        // 防止循环推荐（检查推荐人的推荐链）
        require(!_isInReferralChain(referrer, user), "ReferralSystem: circular referral");
        
        // 绑定推荐关系
        referrers[user] = referrer;
        directReferrals[referrer].push(user);
        
        // 更新推荐统计
        _updateReferralStats(referrer, user);
        
        emit ReferralBound(user, referrer, block.timestamp);
    }
    
    /**
     * @dev 用户自行绑定推荐关系（首次质押前调用）
     * @param referrer 推荐人地址
     */
    function bindReferrerSelf(address referrer) 
        external 
        whenNotPaused
        validReferrer(referrer) 
    {
        require(referrers[msg.sender] == address(0), "ReferralSystem: already has referrer");
        require(_getStakingPool().isValidAccount(referrer), "ReferralSystem: referrer not valid");
        require(!_isInReferralChain(referrer, msg.sender), "ReferralSystem: circular referral");
        
        // 绑定推荐关系
        referrers[msg.sender] = referrer;
        directReferrals[referrer].push(msg.sender);
        
        // 更新推荐统计
        _updateReferralStats(referrer, msg.sender);
        
        // 更新推荐人状态
        _updateReferrerStakeValue(referrer);
        
        // 更新上两级推荐人状态
        address secondGen = referrers[referrer];
        if (secondGen != address(0)) {
            _updateReferrerStakeValue(secondGen);
            address thirdGen = referrers[secondGen];
            if (thirdGen != address(0)) {
                _updateReferrerStakeValue(thirdGen);
            }
        }
        
        emit ReferralBound(msg.sender, referrer, block.timestamp);
    }
    
    /**
     * @dev 记录质押并更新推荐统计
     * @param user 用户地址
     * @param amount 质押金额
     */
    function recordStake(address user, uint256 amount) external onlyStakingPool {
        // 更新推荐人质押价值（用于烧伤计算）
        address referrer = referrers[user];
        if (referrer != address(0)) {
            _updateReferrerStakeValue(referrer);
        }
        
        // 更新上两级推荐人的统计
        address secondGen = referrers[referrer];
        if (secondGen != address(0)) {
            _updateReferrerStakeValue(secondGen);
        }
        
        address thirdGen = referrers[secondGen];
        if (thirdGen != address(0)) {
            _updateReferrerStakeValue(thirdGen);
        }
    }
    
    /**
     * @dev 记录解押并更新推荐统计
     * @param user 用户地址
     * @param amount 解押金额
     */
    function recordUnstake(address user, uint256 amount) external onlyStakingPool {
        // 更新推荐人质押价值
        address referrer = referrers[user];
        if (referrer != address(0)) {
            _updateReferrerStakeValue(referrer);
        }
        
        address secondGen = referrers[referrer];
        if (secondGen != address(0)) {
            _updateReferrerStakeValue(secondGen);
        }
        
        address thirdGen = referrers[secondGen];
        if (thirdGen != address(0)) {
            _updateReferrerStakeValue(thirdGen);
        }
    }
    
    /**
     * @dev 分发推荐奖励
     * @param staker 质押用户
     * @param baseReward 基础收益
     * @return totalReward 总推荐奖励
     */
    function distributeReferralReward(address staker, uint256 baseReward) 
        external 
        onlyStakingPool 
        nonReentrant 
        returns (uint256 totalReward) 
    {
        if (baseReward == 0) {
            return 0;
        }
        
        // 获取三代推荐链
        address[3] memory refChain = getReferralChain(staker);
        uint256 stakerStakeValue = _getStakingPool().getUserPortfolioValue(staker);
        
        // 第一代奖励
        if (refChain[0] != address(0) && _isValidReferrer(refChain[0])) {
            uint256 reward = _calculateGenReward(
                refChain[0], 
                staker, 
                baseReward, 
                stakerStakeValue, 
                1
            );
            if (reward > 0) {
                _sendReferralReward(refChain[0], staker, reward, 1);
                totalReward += reward;
            }
        }
        
        // 第二代奖励
        if (refChain[1] != address(0) && _isValidReferrer(refChain[1])) {
            uint256 reward = _calculateGenReward(
                refChain[1], 
                staker, 
                baseReward, 
                stakerStakeValue, 
                2
            );
            if (reward > 0) {
                _sendReferralReward(refChain[1], staker, reward, 2);
                totalReward += reward;
            }
        }
        
        // 第三代奖励
        if (refChain[2] != address(0) && _isValidReferrer(refChain[2])) {
            uint256 reward = _calculateGenReward(
                refChain[2], 
                staker, 
                baseReward, 
                stakerStakeValue, 
                3
            );
            if (reward > 0) {
                _sendReferralReward(refChain[2], staker, reward, 3);
                totalReward += reward;
            }
        }
        
        return totalReward;
    }
    
    /**
     * @dev 计算推荐奖励（含烧伤机制）
     * @param referrer 推荐人
     * @param staker 被推荐人
     * @param baseReward 基础收益
     * @param stakerStakeValue 被推荐人质押价值
     * @param generation 代际（1-3）
     * @return reward 奖励金额
     */
    function _calculateGenReward(
        address referrer,
        address staker,
        uint256 baseReward,
        uint256 stakerStakeValue,
        uint256 generation
    ) internal view returns (uint256 reward) {
        // 获取推荐人质押价值
        uint256 referrerStakeValue = _getStakingPool().getUserPortfolioValue(referrer);
        
        // 烧伤机制：取推荐人和被推荐人持仓的最小值
        uint256 effectiveBase = referrerStakeValue < stakerStakeValue ? 
            referrerStakeValue : stakerStakeValue;
        
        // 计算有效收益基数（按比例）
        uint256 effectiveReward = baseReward * effectiveBase / stakerStakeValue;
        
        // 获取代际收益率
        uint256 genRate;
        if (generation == 1) {
            genRate = config.firstGenRate;
        } else if (generation == 2) {
            genRate = config.secondGenRate;
        } else {
            genRate = config.thirdGenRate;
        }
        
        // 应用代际收益率
        reward = effectiveReward * genRate / BPS_DENOMINATOR;
        
        // 应用上限限制
        uint256 effectiveCount = getEffectiveReferralCount(referrer, generation);
        uint256 maxTotal;
        if (generation == 1) {
            maxTotal = MAX_FIRST_GEN_TOTAL;
        } else if (generation == 2) {
            maxTotal = MAX_SECOND_GEN_TOTAL;
        } else {
            maxTotal = MAX_THIRD_GEN_TOTAL;
        }
        
        // 如果超过30个，使用固定比例
        if (effectiveCount >= config.maxStackCount) {
            // 使用最高比例
            reward = effectiveReward * maxTotal / BPS_DENOMINATOR;
        } else {
            // 按比例计算
            reward = reward * effectiveCount / config.maxStackCount;
        }
        
        return reward;
    }
    
    /**
     * @dev 发送推荐奖励
     */
    function _sendReferralReward(
        address referrer, 
        address staker, 
        uint256 reward,
        uint256 generation
    ) internal {
        // 更新累计奖励
        totalReferralRewards[referrer] += reward;
        
        // 更新推荐人信息
        ReferrerInfo storage info = referrerInfos[referrer];
        info.totalReferralReward += reward;
        
        // 从StakingPool获取ETRToken并转账
        // 注意：这里假设奖励从质押池的奖励储备中发放
        // 实际实现可能需要与StakingPool协调
        
        // 记录烧伤金额（如果有）
        uint256 referrerStake = _getStakingPool().getUserPortfolioValue(referrer);
        uint256 stakerStake = _getStakingPool().getUserPortfolioValue(staker);
        uint256 burnAmount = 0;
        
        if (referrerStake < stakerStake) {
            // 计算烧伤金额
            uint256 expectedBase = stakerStake;
            uint256 actualBase = referrerStake;
            uint256 expectedReward = reward * expectedBase / actualBase;
            burnAmount = expectedReward > reward ? expectedReward - reward : 0;
            burnedRewards[referrer][staker] += burnAmount;
        }
        
        emit ReferralRewardDistributed(referrer, staker, generation, reward, burnAmount);
    }
    
    /**
     * @dev 更新推荐统计（修复版）
     * 正确计算代际统计：
     * - 当新用户A绑定推荐人B时，需要更新整个链条的统计
     * - B的直推数 +1
     * - B的推荐人C的间推数 +1（A是C的间推）
     * - C的推荐人D的间间推数 +1（A是D的间间推）
     */
    function _updateReferralStats(address referrer, address newReferral) internal {
        // 第1代：直接推荐人的直推+1
        genCounts[referrer][1]++;
        
        // 获取推荐人的推荐人（第2代视角）
        address secondGenReferrer = referrers[referrer];
        if (secondGenReferrer != address(0)) {
            // 第2代：referrer的推荐人的间推+1
            genCounts[secondGenReferrer][2]++;
            
            // 获取第3代
            address thirdGenReferrer = referrers[secondGenReferrer];
            if (thirdGenReferrer != address(0)) {
                // 第3代：secondGenReferrer的推荐人的间间推+1
                genCounts[thirdGenReferrer][3]++;
            }
        }
        
        // 更新所有相关推荐人的信息
        _updateReferrerInfo(referrer);
        if (secondGenReferrer != address(0)) {
            _updateReferrerInfo(secondGenReferrer);
            address thirdGenReferrer = referrers[secondGenReferrer];
            if (thirdGenReferrer != address(0)) {
                _updateReferrerInfo(thirdGenReferrer);
            }
        }
    }
    
    /**
     * @dev 更新推荐人信息
     */
    function _updateReferrerInfo(address referrer) internal {
        ReferrerInfo storage info = referrerInfos[referrer];
        info.directCount = genCounts[referrer][1];
        info.secondGenCount = genCounts[referrer][2];
        info.thirdGenCount = genCounts[referrer][3];
        
        emit ReferralStatsUpdated(referrer, info.directCount, info.secondGenCount, info.thirdGenCount);
        
        // 检查是否达到上限
        if (info.directCount == config.maxStackCount) {
            emit MaxRewardReached(referrer, 1, config.maxStackCount);
        }
    }
    
    /**
     * @dev 更新推荐人质押价值
     */
    function _updateReferrerStakeValue(address referrer) internal {
        uint256 stakeValue = _getStakingPool().getUserPortfolioValue(referrer);
        referrerStakeValues[referrer] = stakeValue;
        referrerInfos[referrer].stakeValue = stakeValue;
        
        // 更新推荐人有效性
        bool isValid = stakeValue >= config.minValidStake;
        referrerInfos[referrer].isValid = isValid;
        validReferrers[referrer] = isValid;
        
        emit ReferrerStatusChanged(referrer, isValid, stakeValue);
    }
    
    /**
     * @dev 检查用户是否在推荐链中（防止循环）
     */
    function _isInReferralChain(address referrer, address user) internal view returns (bool) {
        address current = referrer;
        for (uint256 i = 0; i < 10; i++) {  // 最多查10层
            if (current == address(0)) {
                return false;
            }
            if (current == user) {
                return true;
            }
            current = referrers[current];
        }
        return false;
    }
    
    /**
     * @dev 检查推荐人是否有效
     */
    function _isValidReferrer(address referrer) internal view returns (bool) {
        if (referrer == address(0)) {
            return false;
        }
        return _getStakingPool().isValidAccount(referrer);
    }
    
    /**
     * @dev 获取StakingPool合约实例
     */
    function _getStakingPool() internal view returns (IStakingPool) {
        return IStakingPool(stakingPool);
    }
    
    // ============ 查询函数 ============
    
    /**
     * @dev 获取用户的推荐人
     * @param user 用户地址
     * @return referrer 推荐人地址
     */
    function getReferrer(address user) external view returns (address) {
        return referrers[user];
    }
    
    /**
     * @dev 获取用户的三代推荐链
     * @param user 用户地址
     * @return chain [第一代, 第二代, 第三代]
     */
    function getReferralChain(address user) public view returns (address[3] memory) {
        address[3] memory chain;
        
        // 第一代
        chain[0] = referrers[user];
        
        // 第二代
        if (chain[0] != address(0)) {
            chain[1] = referrers[chain[0]];
        }
        
        // 第三代
        if (chain[1] != address(0)) {
            chain[2] = referrers[chain[1]];
        }
        
        return chain;
    }
    
    /**
     * @dev 获取用户的直推列表
     * @param referrer 推荐人地址
     * @return 直推地址列表
     */
    function getDirectReferrals(address referrer) external view returns (address[] memory) {
        return directReferrals[referrer];
    }
    
    /**
     * @dev 获取推荐统计信息
     * @param referrer 推荐人地址
     * @return directCount 直推数量
     * @return secondGenCount 二代数量
     * @return thirdGenCount 三代数量
     * @return totalReward 累计奖励
     */
    function getReferralStats(address referrer) external view returns (
        uint256 directCount,
        uint256 secondGenCount,
        uint256 thirdGenCount,
        uint256 totalReward
    ) {
        ReferrerInfo storage info = referrerInfos[referrer];
        return (
            info.directCount,
            info.secondGenCount,
            info.thirdGenCount,
            info.totalReferralReward
        );
    }
    
    /**
     * @dev 获取推荐奖励计算详情
     * @param referrer 推荐人
     * @param staker 被推荐人
     * @param baseReward 基础收益
     * @return 奖励计算结果
     */
    function calculateReferralReward(
        address referrer,
        address staker,
        uint256 baseReward
    ) external view returns (RewardCalculation memory) {
        RewardCalculation memory calc;
        
        if (baseReward == 0 || referrer == address(0)) {
            return calc;
        }
        
        uint256 stakerStakeValue = _getStakingPool().getUserPortfolioValue(staker);
        address[3] memory chain = getReferralChain(staker);
        
        // 第一代
        if (chain[0] == referrer && _isValidReferrer(referrer)) {
            calc.firstGenReward = _calculateGenReward(referrer, staker, baseReward, stakerStakeValue, 1);
        }
        
        // 第二代
        if (chain[1] == referrer && _isValidReferrer(referrer)) {
            calc.secondGenReward = _calculateGenReward(referrer, staker, baseReward, stakerStakeValue, 2);
        }
        
        // 第三代
        if (chain[2] == referrer && _isValidReferrer(referrer)) {
            calc.thirdGenReward = _calculateGenReward(referrer, staker, baseReward, stakerStakeValue, 3);
        }
        
        calc.totalReward = calc.firstGenReward + calc.secondGenReward + calc.thirdGenReward;
        
        // 计算烧伤金额
        uint256 referrerStake = _getStakingPool().getUserPortfolioValue(referrer);
        if (referrerStake < stakerStakeValue) {
            uint256 expectedBase = stakerStakeValue;
            uint256 actualBase = referrerStake;
            uint256 expectedReward = baseReward * expectedBase / actualBase;
            calc.burnAmount = expectedReward > calc.totalReward ? expectedReward - calc.totalReward : 0;
        }
        
        return calc;
    }
    
    /**
     * @dev 获取有效推荐数量（考虑30个上限）
     * @param referrer 推荐人地址
     * @param generation 代际（1-3）
     * @return 有效数量
     */
    function getEffectiveReferralCount(address referrer, uint256 generation) public view returns (uint256) {
        uint256 count = genCounts[referrer][generation];
        return count > config.maxStackCount ? config.maxStackCount : count;
    }
    
    /**
     * @dev 检查推荐人是否有效
     * @param referrer 推荐人地址
     * @return 是否有效
     */
    function isValidReferrer(address referrer) external view returns (bool) {
        return _isValidReferrer(referrer);
    }
    
    /**
     * @dev 获取推荐人信息
     */
    function getReferrerInfo(address referrer) external view returns (ReferrerInfo memory) {
        return referrerInfos[referrer];
    }
    
    // ============ 管理员函数 ============
    
    /**
     * @dev 更新推荐配置
     */
    function updateConfig(
        uint256 _firstGenRate,
        uint256 _secondGenRate,
        uint256 _thirdGenRate,
        uint256 _maxStackCount,
        uint256 _minValidStake
    ) external onlyOwner {
        config.firstGenRate = _firstGenRate;
        config.secondGenRate = _secondGenRate;
        config.thirdGenRate = _thirdGenRate;
        config.maxStackCount = _maxStackCount;
        config.minValidStake = _minValidStake;
    }
    
    /**
     * @dev 更新推荐人状态
     * @param referrer 推荐人地址
     */
    function updateReferrerStatus(address referrer) external {
        _updateReferrerStakeValue(referrer);
    }
    
    /**
     * @dev 批量更新推荐状态
     * @param _referrers 推荐人地址列表
     */
    function batchUpdateStatus(address[] calldata _referrers) external {
        for (uint256 i = 0; i < _referrers.length; i++) {
            _updateReferrerStakeValue(_referrers[i]);
        }
    }
    
    /**
     * @dev 设置合约引用
     */
    function setContracts(address _stakingPool, address _etrToken) external onlyOwner {
        stakingPool = _stakingPool;
        etrToken = _etrToken;
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
}

// ============ 外部接口 ============

/**
 * @dev StakingPool 接口
 */
interface IStakingPool {
    function isValidAccount(address user) external view returns (bool);
    function getUserPortfolioValue(address user) external view returns (uint256);
    function getUserStakes(address user) external view returns (
        StakeRecord[] memory
    );
}

/**
 * @dev 质押记录结构体（用于接口）
 */
struct StakeRecord {
    uint256 stakeId;
    address owner;
    uint256 principal;
    uint256 originalPrincipal;
    uint256 startTime;
    uint256 unlockTime;
    uint256 lastClaimTime;
    uint256 totalClaimed;
    uint256 dailyYieldRate;
    bool active;
}