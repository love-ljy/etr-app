// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ReferralSystemV2
 * @dev 三代推荐系统合约 V2 (2026-03-11 修正版)
 * 
 * ✅ 修正机制规则（用户确认）：
 * - 第一代：直推人数 × 3%，最多30人封顶 = 90%
 * - 第二代：间推人数 × 2%，最多30人封顶 = 60%
 * - 第三代：三代人数 × 1%，最多30人封顶 = 30%
 * - 30个封顶：超过30人按最大收益率计算
 * - 后台可手动调整收益比例
 * 
 * 示例（30封顶）：
 * A推广了B, B直推2个账户:
 *   - B获得: 2 × 3% = 6% (第一代，未封顶)
 *   - A获得: 2人 × 3% = 6% (第一代)
 * 
 * A推广了100人:
 *   - A获得: 30人 × 3% = 90% (第一代封顶，固定90%)
 * 
 * 变更历史：
 * - V1: 30个封顶固定比例机制
 * - V2-错误: 无限叠加动态计算机制 (2026-03-11 12:50 - 已废弃)
 * - V2-修正: 恢复30封顶，比例可配置 (2026-03-11 16:14)
 */
contract ReferralSystemV2 is Ownable, Pausable, ReentrancyGuard {
    
    // ============ 常量定义 ============
    uint256 public constant BPS_DENOMINATOR = 10000;      // 基点分母
    
    // 默认推荐奖励比例（基点）- 可随时调整
    uint256 public defaultFirstRate = 300;    // 第一代 3%
    uint256 public defaultSecondRate = 200;   // 第二代 2%
    uint256 public defaultThirdRate = 100;    // 第三代 1%
    
    // ✅ 30个封顶配置（用户确认需求）
    uint256 public constant MAX_COUNT_PER_GEN = 30;  // 每代最多30人
    
    /**
     * @dev 获取某代的最大收益率
     * @param rate 单个人收益率（基点）
     * @return 该代最大收益率（基点）
     */
    function getMaxRewardForGen(uint256 rate) public pure returns (uint256) {
        return rate * MAX_COUNT_PER_GEN;  // 比例 × 30
    }
    
    // ============ 结构体定义 ============
    
    /// @dev 用户自定义比例配置
    struct CustomRate {
        uint256 first;    // 第一代比例
        uint256 second;   // 第二代比例
        uint256 third;    // 第三代比例
        bool active;      // 是否激活
    }
    
    /// @dev 用户团队统计（用于快速计算）
    struct TeamStats {
        uint256 directCount;        // 直推人数
        uint256 secondGenCount;     // 间推人数
        uint256 thirdGenCount;      // 间间推人数
        uint256 teamTotalStake;     // 团队总质押（ETR数量）
        uint256 lastUpdateTime;     // 最后更新时间
    }
    
    /// @dev 单线收益统计（每条直推线独立计算）
    struct LineStats {
        address direct;             // 直推地址
        uint256 directRewards;      // 该线第一代累计收益
        uint256 secondGenRewards;   // 该线第二代累计收益
        uint256 thirdGenRewards;    // 该线第三代累计收益
        uint256 lastCalcTime;       // 最后计算时间
    }
    
    /// @dev 推荐人信息
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
    
    /// @dev 奖励计算结果
    struct RewardCalculation {
        uint256 firstGenReward;       // 第一代奖励
        uint256 secondGenReward;      // 第二代奖励
        uint256 thirdGenReward;       // 第三代奖励
        uint256 totalReward;          // 总奖励
        uint256 burnAmount;           // 烧伤金额
        uint256 lineCount;            // 计算了几条线
    }
    
    /// @dev 单线奖励计算详情
    struct LineRewardDetail {
        address direct;               // 直推地址
        uint256 firstGen;             // 第一代奖励
        uint256 secondGen;            // 第二代奖励
        uint256 thirdGen;             // 第三代奖励
        uint256 lineTotal;            // 该线总计
    }
    
    // ============ 状态变量 ============
    
    /// @dev 用户自定义比例（优先级高于默认比例）
    mapping(address => CustomRate) public customRates;
    
    /// @dev 用户团队统计
    mapping(address => TeamStats) public teamStats;
    
    /// @dev 用户各条直推线的统计（推荐人 => 直推 => 统计）
    mapping(address => mapping(address => LineStats)) public lineStats;
    
    /// @dev 推荐关系映射
    mapping(address => address) public referrers;                           // 用户 => 推荐人
    mapping(address => address[]) public directReferrals;                   // 推荐人 => 直推列表
    mapping(address => mapping(uint256 => uint256)) public genCounts;       // 推荐人 => 代际 => 数量
    mapping(address => uint256) public totalReferralRewards;                // 累计推荐奖励
    mapping(address => bool) public validReferrers;                         // 有效推荐人
    mapping(address => uint256) public referrerStakeValues;                 // 推荐人质押价值
    
    /// @dev 烧伤记录：推荐人 => 被推荐人 => 烧伤金额
    mapping(address => mapping(address => uint256)) public burnedRewards;
    
    /// @dev 用户推荐统计
    mapping(address => ReferrerInfo) public referrerInfos;
    
    /// @dev 用户的每日质押收益快照（用于计算第一代奖励）
    mapping(address => uint256) public lastDailyStakeReward;
    mapping(address => uint256) public lastSnapshotTime;
    
    /// @dev 合约引用
    address public stakingPool;
    address public etrToken;
    address public priceOracle;
    
    /// @dev 最低有效质押价值（USD，用于烧伤计算）
    uint256 public minValidStake = 100 * 1e18;  // $100
    
    /// @dev 记录部署时间戳（新机制从此时间开始生效）
    uint256 public immutable deploymentTime;
    
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
    
    event LineRewardCalculated(
        address indexed referrer,
        address indexed direct,
        uint256 firstGen,
        uint256 secondGen,
        uint256 thirdGen,
        uint256 lineTotal
    );
    
    event ReferrerStatusChanged(
        address indexed referrer,
        bool isValid,
        uint256 stakeValue
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
    
    /// @dev 默认比例更新事件
    event DefaultRatesUpdated(
        uint256 oldFirst,
        uint256 oldSecond,
        uint256 oldThird,
        uint256 newFirst,
        uint256 newSecond,
        uint256 newThird
    );
    
    /// @dev 用户自定义比例设置事件
    event CustomRateSet(
        address indexed user,
        uint256 first,
        uint256 second,
        uint256 third
    );
    
    /// @dev 用户自定义比例取消事件
    event CustomRateRemoved(address indexed user);
    
    // ============ 修饰符 ============
    
    modifier onlyStakingPool() {
        require(msg.sender == stakingPool, "ReferralSystemV2: only staking pool");
        _;
    }
    
    modifier validReferrer(address referrer) {
        require(referrer != address(0), "ReferralSystemV2: invalid referrer");
        require(referrer != msg.sender, "ReferralSystemV2: cannot refer self");
        _;
    }
    
    // ============ 构造函数 ============
    
    constructor(
        address _stakingPool,
        address _priceOracle
    ) {
        require(_stakingPool != address(0), "ReferralSystemV2: staking pool is zero address");
        require(_priceOracle != address(0), "ReferralSystemV2: price oracle is zero address");
        
        stakingPool = _stakingPool;
        priceOracle = _priceOracle;
        deploymentTime = block.timestamp;
    }
    
    // ============ 核心函数：推荐关系绑定 ============
    
    /**
     * @dev 绑定推荐关系（由StakingPool调用）
     * @param user 被推荐用户
     * @param referrer 推荐人地址
     */
    function bindReferrer(address user, address referrer) 
        external 
        onlyStakingPool 
        validReferrer(referrer) 
    {
        require(referrers[user] == address(0), "ReferralSystemV2: already has referrer");
        require(_getStakingPool().isValidAccount(referrer), "ReferralSystemV2: referrer not valid");
        
        // 防止循环推荐
        require(!_isInReferralChain(referrer, user), "ReferralSystemV2: circular referral");
        
        // 绑定推荐关系
        referrers[user] = referrer;
        directReferrals[referrer].push(user);
        
        // 更新推荐统计
        _updateReferralStats(referrer, user);
        
        emit ReferralBound(user, referrer, block.timestamp);
    }
    
    /**
     * @dev 用户自行绑定推荐关系
     * @param referrer 推荐人地址
     */
    function bindReferrerSelf(address referrer) 
        external 
        whenNotPaused
        validReferrer(referrer) 
    {
        require(referrers[msg.sender] == address(0), "ReferralSystemV2: already has referrer");
        require(_getStakingPool().isValidAccount(referrer), "ReferralSystemV2: referrer not valid");
        require(!_isInReferralChain(referrer, msg.sender), "ReferralSystemV2: circular referral");
        
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
    
    // ============ 核心函数：奖励计算（30封顶修正版） ============
    
    /**
     * @dev 计算用户的总推荐奖励（30封顶修正版）
     * @param referrer 推荐人地址
     * @return totalReward 总奖励金额（基点表示，如18000 = 180%）
     * @return firstGenTotal 第一代总收益率（基点）
     * @return secondGenTotal 第二代总收益率（基点）
     * @return thirdGenTotal 第三代总收益率（基点）
     * 
     * 计算规则（用户确认）：
     * - 第一代：直推人数 × firstRate，封顶30人
     * - 第二代：间推人数 × secondRate，封顶30人
     * - 第三代：三代人数 × thirdRate，封顶30人
     */
    function calculateReferralRewards(address referrer) 
        external 
        view 
        returns (
            uint256 totalReward, 
            uint256 firstGenTotal, 
            uint256 secondGenTotal, 
            uint256 thirdGenTotal
        ) 
    {
        // 获取用户的收益比例
        (uint256 fRate, uint256 sRate, uint256 tRate) = _getRates(referrer);
        
        // ===== 第一代：直推人数 × firstRate，封顶30 =====
        uint256 directCount = directReferrals[referrer].length;
        if (directCount > MAX_COUNT_PER_GEN) {
            directCount = MAX_COUNT_PER_GEN;  // 封顶30
        }
        firstGenTotal = directCount * fRate;  // 如：30 × 300 = 9000 (90%)
        
        // ===== 第二代：间推人数 × secondRate，封顶30 =====
        uint256 secondCount = _getSecondGenCount(referrer);
        if (secondCount > MAX_COUNT_PER_GEN) {
            secondCount = MAX_COUNT_PER_GEN;  // 封顶30
        }
        secondGenTotal = secondCount * sRate;  // 如：30 × 200 = 6000 (60%)
        
        // ===== 第三代：三代人数 × thirdRate，封顶30 =====
        uint256 thirdCount = _getThirdGenCount(referrer);
        if (thirdCount > MAX_COUNT_PER_GEN) {
            thirdCount = MAX_COUNT_PER_GEN;  // 封顶30
        }
        thirdGenTotal = thirdCount * tRate;  // 如：30 × 100 = 3000 (30%)
        
        // 总收益率（基点）
        totalReward = firstGenTotal + secondGenTotal + thirdGenTotal;
        
        return (totalReward, firstGenTotal, secondGenTotal, thirdGenTotal);
    }
    
    /**
     * @dev 获取第二代人数（间推）
     * @param referrer 推荐人地址
     * @return count 间推人数
     */
    function _getSecondGenCount(address referrer) internal view returns (uint256 count) {
        address[] memory directs = directReferrals[referrer];
        for (uint i = 0; i < directs.length; i++) {
            count += directReferrals[directs[i]].length;
        }
        return count;
    }
    
    /**
     * @dev 获取第三代人数（间间推）
     * @param referrer 推荐人地址
     * @return count 间间推人数
     */
    function _getThirdGenCount(address referrer) internal view returns (uint256 count) {
        address[] memory directs = directReferrals[referrer];
        for (uint i = 0; i < directs.length; i++) {
            address[] memory secondGen = directReferrals[directs[i]];
            for (uint j = 0; j < secondGen.length; j++) {
                count += directReferrals[secondGen[j]].length;
            }
        }
        return count;
    }
    
    /**
     * @dev 计算单条线奖励（兼容旧版，实际使用新calculateReferralRewards）
     * @notice 此函数保留用于兼容性，实际推荐奖励计算已改为30封顶机制
     */
    function _calculateLineReward(address referrer, address direct) 
        internal 
        view 
        returns (LineRewardDetail memory detail) 
    {
        detail.direct = direct;
        // 新版中不使用此函数计算，返回空
        return detail;
    }
    
    /**
     * @dev 分发推荐奖励（新机制）
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
            uint256 reward = _calculateGenRewardV2(
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
            uint256 reward = _calculateGenRewardV2(
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
            uint256 reward = _calculateGenRewardV2(
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
     * @dev 计算代际奖励 V2（新机制）
     * @param referrer 推荐人
     * @param staker 被推荐人
     * @param baseReward 基础收益
     * @param stakerStakeValue 被推荐人质押价值
     * @param generation 代际（1-3）
     * @return reward 奖励金额
     */
    function _calculateGenRewardV2(
        address referrer,
        address staker,
        uint256 baseReward,
        uint256 stakerStakeValue,
        uint256 generation
    ) internal view returns (uint256 reward) {
        
        // 获取推荐人质押价值（用于烧伤）
        uint256 referrerStakeValue = _getStakingPool().getUserPortfolioValue(referrer);
        
        // 烧伤机制：取推荐人和被推荐人持仓的最小值
        uint256 effectiveBase = referrerStakeValue < stakerStakeValue ? 
            referrerStakeValue : stakerStakeValue;
        
        // 计算有效收益基数
        uint256 effectiveReward = baseReward * effectiveBase / stakerStakeValue;
        
        // 获取代际收益率
        (uint256 fRate, uint256 sRate, uint256 tRate) = _getRates(referrer);
        
        uint256 genRate;
        if (generation == 1) {
            genRate = fRate;
        } else if (generation == 2) {
            genRate = sRate;
        } else {
            genRate = tRate;
        }
        
        // V2新机制：无限叠加，每个账户独立计算
        // 奖励 = 有效收益 × 代际比例
        reward = effectiveReward * genRate / BPS_DENOMINATOR;
        
        return reward;
    }
    
    /**
     * @dev 获取用户的实际收益比例
     * @param user 用户地址
     * @return first 第一代比例
     * @return second 第二代比例
     * @return third 第三代比例
     */
    function _getRates(address user) internal view returns (uint256 first, uint256 second, uint256 third) {
        CustomRate memory custom = customRates[user];
        if (custom.active) {
            return (custom.first, custom.second, custom.third);
        }
        return (defaultFirstRate, defaultSecondRate, defaultThirdRate);
    }
    
    /**
     * @dev 获取团队每日收益
     * @param leader 团队长地址
     * @param genLevel 团队层级（1=直推团队，2=间推团队）
     * @return totalReward 团队总每日收益
     */
    function _getTeamDailyReward(address leader, uint256 genLevel) 
        internal 
        view 
        returns (uint256 totalReward) 
    {
        if (genLevel == 1) {
            // 第一代团队（直推）
            address[] memory directs = directReferrals[leader];
            for (uint i = 0; i < directs.length; i++) {
                uint256 stakeValue = _getStakingPool().getUserPortfolioValue(directs[i]);
                uint256 dailyYieldRate = _getDailyYieldRate();
                totalReward += stakeValue * dailyYieldRate / BPS_DENOMINATOR;
            }
        } else if (genLevel == 2) {
            // 第二代团队（间推）
            address[] memory directs = directReferrals[leader];
            for (uint i = 0; i < directs.length; i++) {
                address[] memory secondGen = directReferrals[directs[i]];
                for (uint j = 0; j < secondGen.length; j++) {
                    uint256 stakeValue = _getStakingPool().getUserPortfolioValue(secondGen[j]);
                    uint256 dailyYieldRate = _getDailyYieldRate();
                    totalReward += stakeValue * dailyYieldRate / BPS_DENOMINATOR;
                }
            }
        }
        return totalReward;
    }
    
    /**
     * @dev 获取当前日化收益率
     * @return 日化收益率（基点）
     */
    function _getDailyYieldRate() internal view returns (uint256) {
        // 从StakingPool获取当前收益率
        // 简化处理，返回默认值 0.45% (45基点)
        return 45;
    }
    
    // ============ 管理员函数：比例配置 ============
    
    /**
     * @dev 设置全局默认收益比例
     * @param _first 第一代比例（基点，如300=3%）
     * @param _second 第二代比例（基点，如200=2%）
     * @param _third 第三代比例（基点，如100=1%）
     */
    function setGenerationRates(
        uint256 _first,
        uint256 _second,
        uint256 _third
    ) external onlyOwner {
        require(_first <= 10000, "ReferralSystemV2: first rate too high");
        require(_second <= 10000, "ReferralSystemV2: second rate too high");
        require(_third <= 10000, "ReferralSystemV2: third rate too high");
        
        uint256 oldFirst = defaultFirstRate;
        uint256 oldSecond = defaultSecondRate;
        uint256 oldThird = defaultThirdRate;
        
        defaultFirstRate = _first;
        defaultSecondRate = _second;
        defaultThirdRate = _third;
        
        emit DefaultRatesUpdated(oldFirst, oldSecond, oldThird, _first, _second, _third);
    }
    
    /**
     * @dev 为特定用户设置自定义收益比例
     * @param user 用户地址
     * @param _first 第一代比例
     * @param _second 第二代比例
     * @param _third 第三代比例
     */
    function setCustomRate(
        address user,
        uint256 _first,
        uint256 _second,
        uint256 _third
    ) external onlyOwner {
        require(user != address(0), "ReferralSystemV2: invalid user address");
        require(_first <= 10000, "ReferralSystemV2: first rate too high");
        require(_second <= 10000, "ReferralSystemV2: second rate too high");
        require(_third <= 10000, "ReferralSystemV2: third rate too high");
        
        customRates[user] = CustomRate({
            first: _first,
            second: _second,
            third: _third,
            active: true
        });
        
        emit CustomRateSet(user, _first, _second, _third);
    }
    
    /**
     * @dev 取消用户的自定义比例（恢复默认）
     * @param user 用户地址
     */
    function removeCustomRate(address user) external onlyOwner {
        require(user != address(0), "ReferralSystemV2: invalid user address");
        
        delete customRates[user];
        
        emit CustomRateRemoved(user);
    }
    
    /**
     * @dev 批量设置自定义比例
     * @param users 用户地址数组
     * @param firstRates 第一代比例数组
     * @param secondRates 第二代比例数组
     * @param thirdRates 第三代比例数组
     */
    function batchSetCustomRates(
        address[] calldata users,
        uint256[] calldata firstRates,
        uint256[] calldata secondRates,
        uint256[] calldata thirdRates
    ) external onlyOwner {
        require(
            users.length == firstRates.length && 
            users.length == secondRates.length && 
            users.length == thirdRates.length,
            "ReferralSystemV2: array length mismatch"
        );
        
        for (uint i = 0; i < users.length; i++) {
            customRates[users[i]] = CustomRate({
                first: firstRates[i],
                second: secondRates[i],
                third: thirdRates[i],
                active: true
            });
            
            emit CustomRateSet(users[i], firstRates[i], secondRates[i], thirdRates[i]);
        }
    }
    
    // ============ 内部辅助函数 ============
    
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
        
        // 记录烧伤金额
        uint256 referrerStake = _getStakingPool().getUserPortfolioValue(referrer);
        uint256 stakerStake = _getStakingPool().getUserPortfolioValue(staker);
        uint256 burnAmount = 0;
        
        if (referrerStake < stakerStake) {
            burnAmount = (stakerStake - referrerStake) * reward / stakerStake;
            burnedRewards[referrer][staker] += burnAmount;
        }
        
        emit ReferralRewardDistributed(referrer, staker, generation, reward, burnAmount);
    }
    
    /**
     * @dev 更新推荐统计
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
    }
    
    /**
     * @dev 更新推荐人质押价值
     */
    function _updateReferrerStakeValue(address referrer) internal {
        uint256 stakeValue = _getStakingPool().getUserPortfolioValue(referrer);
        referrerStakeValues[referrer] = stakeValue;
        referrerInfos[referrer].stakeValue = stakeValue;
        
        // 更新推荐人有效性
        bool isValid = stakeValue >= minValidStake;
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
     */
    function getReferrer(address user) external view returns (address) {
        return referrers[user];
    }
    
    /**
     * @dev 获取用户的三代推荐链
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
     */
    function getDirectReferrals(address referrer) external view returns (address[] memory) {
        return directReferrals[referrer];
    }
    
    /**
     * @dev 获取推荐统计信息
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
     * @dev 获取推荐人的实际收益比例
     */
    function getUserRates(address user) external view returns (
        uint256 first,
        uint256 second,
        uint256 third,
        bool isCustom
    ) {
        CustomRate memory custom = customRates[user];
        if (custom.active) {
            return (custom.first, custom.second, custom.third, true);
        }
        return (defaultFirstRate, defaultSecondRate, defaultThirdRate, false);
    }
    
    /**
     * @dev 获取推荐奖励计算详情（兼容旧接口）
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
            calc.firstGenReward = _calculateGenRewardV2(referrer, staker, baseReward, stakerStakeValue, 1);
        }
        
        // 第二代
        if (chain[1] == referrer && _isValidReferrer(referrer)) {
            calc.secondGenReward = _calculateGenRewardV2(referrer, staker, baseReward, stakerStakeValue, 2);
        }
        
        // 第三代
        if (chain[2] == referrer && _isValidReferrer(referrer)) {
            calc.thirdGenReward = _calculateGenRewardV2(referrer, staker, baseReward, stakerStakeValue, 3);
        }
        
        calc.totalReward = calc.firstGenReward + calc.secondGenReward + calc.thirdGenReward;
        
        // 计算烧伤金额
        uint256 referrerStake = _getStakingPool().getUserPortfolioValue(referrer);
        if (referrerStake < stakerStakeValue) {
            uint256 burnRatio = (stakerStakeValue - referrerStake) * BPS_DENOMINATOR / stakerStakeValue;
            calc.burnAmount = calc.totalReward * burnRatio / BPS_DENOMINATOR;
        }
        
        return calc;
    }
    
    /**
     * @dev 检查推荐人是否有效
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
    
    /**
     * @dev 获取默认比例
     */
    function getDefaultRates() external view returns (uint256 first, uint256 second, uint256 third) {
        return (defaultFirstRate, defaultSecondRate, defaultThirdRate);
    }
    
    /**
     * @dev 获取用户的团队统计
     */
    function getTeamStats(address user) external view returns (TeamStats memory) {
        return teamStats[user];
    }
    
    // ============ 其他管理员函数 ============
    
    /**
     * @dev 更新最低有效质押金额
     */
    function setMinValidStake(uint256 _minValidStake) external onlyOwner {
        minValidStake = _minValidStake;
    }
    
    /**
     * @dev 更新推荐人状态
     */
    function updateReferrerStatus(address referrer) external {
        _updateReferrerStakeValue(referrer);
    }
    
    /**
     * @dev 批量更新推荐状态
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
     * @dev 记录质押并更新推荐统计
     */
    function recordStake(address user, uint256 amount) external onlyStakingPool {
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
     * @dev 记录解押并更新推荐统计
     */
    function recordUnstake(address user, uint256 amount) external onlyStakingPool {
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
    function getUserStakes(address user) external view returns (StakeRecordV2[] memory);
}

/**
 * @dev 质押记录结构体（用于接口）
 */
struct StakeRecordV2 {
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
