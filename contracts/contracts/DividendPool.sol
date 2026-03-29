// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DividendPool
 * @dev 分红池合约 - 按贡献度加权分红
 * - V1/V2/V3等级体系
 * - 小区业绩计算
 * - 加权分红机制
 */
contract DividendPool is Ownable, Pausable, ReentrancyGuard {
    
    // ============ 常量定义 ============
    uint256 public constant BPS_DENOMINATOR = 10000;      // 基点分母
    uint256 public constant PRICE_PRECISION = 1e18;       // 价格精度
    
    // 分红等级配置
    uint256 public constant V1_DIRECT_REFERRALS = 10;     // V1直推要求
    uint256 public constant V2_DIRECT_REFERRALS = 20;     // V2直推要求
    uint256 public constant V3_DIRECT_REFERRALS = 30;     // V3直推要求
    
    uint256 public constant V1_MIN_STAKE = 1000 * 1e18;   // V1最低持仓 $1000
    uint256 public constant V2_MIN_STAKE = 2000 * 1e18;   // V2最低持仓 $2000
    uint256 public constant V3_MIN_STAKE = 5000 * 1e18;   // V3最低持仓 $5000
    
    uint256 public constant V1_SMALL_ZONE_MIN = 20000 * 1e18;   // V1小区业绩 $20,000
    uint256 public constant V2_SMALL_ZONE_MIN = 100000 * 1e18;  // V2小区业绩 $100,000
    uint256 public constant V3_SMALL_ZONE_MIN = 500000 * 1e18;  // V3小区业绩 $500,000
    
    // 分红比例（瓜分70%的分红池）
    uint256 public constant V1_SHARE_PERCENT = 5000;      // V1分红比例 50%
    uint256 public constant V2_SHARE_PERCENT = 3000;      // V2分红比例 30%
    uint256 public constant V3_SHARE_PERCENT = 2000;      // V3分红比例 20%
    
    // 小区业绩计算深度配置
    uint256 public constant DEFAULT_TEAM_DEPTH = 10;  // 默认10层
    
    // ============ 枚举定义 ============
    
    enum DividendLevel { None, V1, V2, V3 }
    
    // ============ 结构体定义 ============
    
    // 用户分红信息
    struct UserDividendInfo {
        DividendLevel level;              // 分红等级
        uint256 personalStake;            // 个人持仓价值
        uint256 smallZonePerformance;     // 小区业绩
        uint256 totalTeamPerformance;     // 总团队业绩
        uint256 maxDirectPerformance;     // 最大直推团队业绩
        uint256 lastClaimTime;            // 上次分红时间
        uint256 totalDividendClaimed;     // 累计分红
        bool isQualified;                 // 是否有分红资格
    }
    
    // 等级统计
    struct LevelStats {
        uint256 userCount;                // 该等级用户数
        uint256 totalWeight;              // 该等级总权重（持仓总和）
        uint256 dividendPool;             // 该等级分红池
    }
    
    // 分红池状态
    struct PoolStatus {
        uint256 totalBalance;             // 总余额
        uint256 availableForDistribution; // 可分配金额
        uint256 lastDistributionTime;     // 上次分配时间
        uint256 totalDistributed;         // 累计分配
    }
    
    // ============ 状态变量 ============
    
    IERC20 public etrToken;               // ETR代币合约
    address public stakingPool;           // 质押池合约地址
    address public referralSystem;        // 推荐系统合约地址
    
    // 用户分红信息
    mapping(address => UserDividendInfo) public userInfos;
    
    // 小区业绩计算深度限制
    uint256 public teamDepthLimit = DEFAULT_TEAM_DEPTH;
    
    // 等级统计
    mapping(DividendLevel => LevelStats) public levelStats;
    
    // 分红池状态
    PoolStatus public poolStatus;
    
    // 滑点费用分配
    uint256 public constant GOVERNANCE_SHARE = 1000;      // 社区治理 10%
    uint256 public constant PRESALE_SHARE = 2000;         // 预售分配 20%
    uint256 public constant DIVIDEND_SHARE = 7000;        // 分红池 70%
    
    address public governanceAddress;     // 社区治理地址
    address public presaleAddress;        // 预售分配地址
    
    // 分红周期
    uint256 public constant DISTRIBUTION_INTERVAL = 1 days; // 每日分红
    
    // ============ 事件定义 ============
    
    event DividendDeposited(
        address indexed from,
        uint256 amount,
        uint256 governanceAmount,
        uint256 presaleAmount,
        uint256 dividendAmount
    );
    event DividendDistributed(
        uint256 timestamp,
        uint256 totalAmount,
        uint256 v1Amount,
        uint256 v2Amount,
        uint256 v3Amount
    );
    event DividendClaimed(
        address indexed user,
        uint256 amount,
        DividendLevel level
    );
    event UserLevelUpdated(
        address indexed user,
        DividendLevel oldLevel,
        DividendLevel newLevel
    );
    event LevelStatsUpdated(
        DividendLevel level,
        uint256 userCount,
        uint256 totalWeight
    );
    event UserQualified(
        address indexed user,
        DividendLevel level,
        uint256 smallZonePerformance
    );
    event TeamDepthLimitUpdated(uint256 oldLimit, uint256 newLimit);
    
    // ============ 修饰符 ============
    
    modifier onlyStakingPool() {
        require(msg.sender == stakingPool, "DividendPool: only staking pool");
        _;
    }
    
    // ============ 构造函数 ============
    
    constructor(
        address _etrToken,
        address _governanceAddress,
        address _presaleAddress
    ) {
        require(_etrToken != address(0), "DividendPool: ETR token is zero address");
        require(_governanceAddress != address(0), "DividendPool: governance is zero address");
        require(_presaleAddress != address(0), "DividendPool: presale is zero address");
        
        etrToken = IERC20(_etrToken);
        governanceAddress = _governanceAddress;
        presaleAddress = _presaleAddress;
        
        poolStatus = PoolStatus({
            totalBalance: 0,
            availableForDistribution: 0,
            lastDistributionTime: block.timestamp,
            totalDistributed: 0
        });
    }
    
    // ============ 核心函数 ============
    
    /**
     * @dev 接收滑点费用并进行分配
     * @param amount 滑点费用总额
     */
    function depositSlippageFee(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "DividendPool: amount must be greater than 0");
        
        // 转账ETR到本合约
        require(
            etrToken.transferFrom(msg.sender, address(this), amount),
            "DividendPool: transfer failed"
        );
        
        // 计算分配
        uint256 governanceAmount = amount * GOVERNANCE_SHARE / BPS_DENOMINATOR;
        uint256 presaleAmount = amount * PRESALE_SHARE / BPS_DENOMINATOR;
        uint256 dividendAmount = amount * DIVIDEND_SHARE / BPS_DENOMINATOR;
        
        // 转账给治理地址（黑洞或治理合约）
        if (governanceAmount > 0) {
            require(etrToken.transfer(governanceAddress, governanceAmount), "DividendPool: governance transfer failed");
        }
        
        // 转账给预售地址
        if (presaleAmount > 0) {
            require(etrToken.transfer(presaleAddress, presaleAmount), "DividendPool: presale transfer failed");
        }
        
        // 分红池增加
        poolStatus.totalBalance += dividendAmount;
        poolStatus.availableForDistribution += dividendAmount;
        
        emit DividendDeposited(
            msg.sender,
            amount,
            governanceAmount,
            presaleAmount,
            dividendAmount
        );
    }
    
    /**
     * @dev 更新用户分红等级（任何人可调用，用于刷新状态）
     * @param user 用户地址
     */
    function updateUserLevel(address user) external whenNotPaused {
        _updateUserLevel(user);
    }
    
    /**
     * @dev 批量更新用户等级
     * @param users 用户地址列表
     */
    function batchUpdateUserLevels(address[] calldata users) external whenNotPaused {
        for (uint256 i = 0; i < users.length; i++) {
            _updateUserLevel(users[i]);
        }
    }
    
    /**
     * @dev 内部函数：更新用户分红等级
     */
    function _updateUserLevel(address user) internal {
        UserDividendInfo storage info = userInfos[user];
        DividendLevel oldLevel = info.level;
        
        // 获取用户数据
        uint256 personalStake = _getUserStakeValue(user);
        uint256 directCount = _getDirectReferralCount(user);
        
        // 计算小区业绩
        (uint256 smallZone, uint256 totalTeam, uint256 maxDirect) = _calculateSmallZone(user);
        
        // 更新用户信息
        info.personalStake = personalStake;
        info.smallZonePerformance = smallZone;
        info.totalTeamPerformance = totalTeam;
        info.maxDirectPerformance = maxDirect;
        
        // 判断等级
        DividendLevel newLevel = DividendLevel.None;
        bool qualified = false;
        
        // V3判断
        if (directCount >= V3_DIRECT_REFERRALS && 
            personalStake >= V3_MIN_STAKE && 
            smallZone >= V3_SMALL_ZONE_MIN) {
            newLevel = DividendLevel.V3;
            qualified = true;
        }
        // V2判断
        else if (directCount >= V2_DIRECT_REFERRALS && 
                 personalStake >= V2_MIN_STAKE && 
                 smallZone >= V2_SMALL_ZONE_MIN) {
            newLevel = DividendLevel.V2;
            qualified = true;
        }
        // V1判断
        else if (directCount >= V1_DIRECT_REFERRALS && 
                  personalStake >= V1_MIN_STAKE && 
                  smallZone >= V1_SMALL_ZONE_MIN) {
            newLevel = DividendLevel.V1;
            qualified = true;
        }
        
        // 更新等级
        if (newLevel != oldLevel) {
            // 更新旧等级的统计
            if (oldLevel != DividendLevel.None) {
                levelStats[oldLevel].userCount--;
                levelStats[oldLevel].totalWeight -= info.personalStake;
            }
            
            // 更新新等级的统计
            if (newLevel != DividendLevel.None) {
                levelStats[newLevel].userCount++;
                levelStats[newLevel].totalWeight += personalStake;
            }
            
            info.level = newLevel;
            emit UserLevelUpdated(user, oldLevel, newLevel);
        }
        
        info.isQualified = qualified;
        
        if (qualified) {
            emit UserQualified(user, newLevel, smallZone);
        }
    }
    
    /**
     * @dev 计算小区业绩
     * 小区业绩 = 总团队业绩 - 最大直推团队业绩
     */
    function _calculateSmallZone(address user) internal view returns (
        uint256 smallZone,
        uint256 totalTeam,
        uint256 maxDirect
    ) {
        // 获取用户的直推列表
        address[] memory directReferrals = _getDirectReferrals(user);
        
        uint256 teamTotal = 0;
        uint256 maxTeam = 0;
        
        for (uint256 i = 0; i < directReferrals.length; i++) {
            // 计算每个直推团队的业绩
            uint256 teamPerformance = _calculateTeamPerformanceSimple(directReferrals[i]);
            teamTotal += teamPerformance;
            
            if (teamPerformance > maxTeam) {
                maxTeam = teamPerformance;
            }
        }
        
        // 加上用户本人的质押
        uint256 personalStake = _getUserStakeValue(user);
        teamTotal += personalStake;
        
        // 小区业绩 = 总业绩 - 最大团队业绩
        uint256 small = 0;
        if (teamTotal > maxTeam) {
            small = teamTotal - maxTeam;
        }
        
        return (small, teamTotal, maxTeam);
    }
    
    /**
     * @dev 计算某个团队的总业绩（递归计算，限制深度）
     * @param user 用户地址
     * @param depth 当前递归深度
     * @param maxDepth 最大递归深度（由teamDepthLimit控制）
     */
    function _calculateTeamPerformance(address user, uint256 depth, uint256 maxDepth) 
        internal 
        view 
        returns (uint256) 
    {
        if (depth >= maxDepth) return 0; // 达到深度限制，返回0
        
        uint256 total = _getUserStakeValue(user);
        
        address[] memory directs = _getDirectReferrals(user);
        for (uint256 i = 0; i < directs.length; i++) {
            total += _calculateTeamPerformance(directs[i], depth + 1, maxDepth);
        }
        
        return total;
    }
    
    /**
     * @dev 计算某个团队的总业绩（对外接口，使用默认深度）
     */
    function _calculateTeamPerformanceSimple(address user) internal view returns (uint256) {
        return _calculateTeamPerformance(user, 0, teamDepthLimit);
    }
    
    /**
     * @dev 领取分红
     */
    function claimDividend() external nonReentrant whenNotPaused returns (uint256) {
        UserDividendInfo storage info = userInfos[msg.sender];
        
        require(info.isQualified, "DividendPool: not qualified");
        require(info.level != DividendLevel.None, "DividendPool: no level");
        require(
            block.timestamp >= info.lastClaimTime + DISTRIBUTION_INTERVAL,
            "DividendPool: claim interval not met"
        );
        
        // 计算分红金额
        uint256 dividend = _calculateUserDividend(msg.sender);
        require(dividend > 0, "DividendPool: no dividend available");
        require(dividend <= poolStatus.availableForDistribution, "DividendPool: insufficient pool");
        
        // 更新状态
        info.totalDividendClaimed += dividend;
        info.lastClaimTime = block.timestamp;
        poolStatus.availableForDistribution -= dividend;
        poolStatus.totalDistributed += dividend;
        
        // 转账
        require(etrToken.transfer(msg.sender, dividend), "DividendPool: transfer failed");
        
        emit DividendClaimed(msg.sender, dividend, info.level);
        
        return dividend;
    }
    
    /**
     * @dev 计算用户可领取的分红
     */
    function _calculateUserDividend(address user) internal view returns (uint256) {
        UserDividendInfo storage info = userInfos[user];
        
        if (!info.isQualified || info.level == DividendLevel.None) {
            return 0;
        }
        
        LevelStats storage stats = levelStats[info.level];
        if (stats.totalWeight == 0) {
            return 0;
        }
        
        // 该等级的分红池
        uint256 levelPool = poolStatus.availableForDistribution * _getLevelSharePercent(info.level) / BPS_DENOMINATOR;
        
        // 按权重计算个人分红
        uint256 dividend = levelPool * info.personalStake / stats.totalWeight;
        
        return dividend;
    }
    
    /**
     * @dev 获取等级的分红比例
     */
    function _getLevelSharePercent(DividendLevel level) internal pure returns (uint256) {
        if (level == DividendLevel.V1) return V1_SHARE_PERCENT;
        if (level == DividendLevel.V2) return V2_SHARE_PERCENT;
        if (level == DividendLevel.V3) return V3_SHARE_PERCENT;
        return 0;
    }
    
    /**
     * @dev 手动触发分红分配（管理员）
     */
    function distributeDividend() external onlyOwner whenNotPaused {
        require(
            block.timestamp >= poolStatus.lastDistributionTime + DISTRIBUTION_INTERVAL,
            "DividendPool: distribution interval not met"
        );
        
        _updateAllLevelsStats();
        
        poolStatus.lastDistributionTime = block.timestamp;
        
        emit DividendDistributed(
            block.timestamp,
            poolStatus.availableForDistribution,
            levelStats[DividendLevel.V1].dividendPool,
            levelStats[DividendLevel.V2].dividendPool,
            levelStats[DividendLevel.V3].dividendPool
        );
    }
    
    /**
     * @dev 更新所有等级统计
     */
    function _updateAllLevelsStats() internal {
        // V1分红池
        levelStats[DividendLevel.V1].dividendPool = poolStatus.availableForDistribution * V1_SHARE_PERCENT / BPS_DENOMINATOR;
        
        // V2分红池
        levelStats[DividendLevel.V2].dividendPool = poolStatus.availableForDistribution * V2_SHARE_PERCENT / BPS_DENOMINATOR;
        
        // V3分红池
        levelStats[DividendLevel.V3].dividendPool = poolStatus.availableForDistribution * V3_SHARE_PERCENT / BPS_DENOMINATOR;
    }
    
    // ============ 查询函数 ============
    
    /**
     * @dev 获取用户分红信息
     */
    function getUserDividendInfo(address user) external view returns (UserDividendInfo memory) {
        return userInfos[user];
    }
    
    /**
     * @dev 获取等级统计
     */
    function getLevelStats(DividendLevel level) external view returns (LevelStats memory) {
        return levelStats[level];
    }
    
    /**
     * @dev 获取分红池状态
     */
    function getPoolStatus() external view returns (PoolStatus memory) {
        return poolStatus;
    }
    
    /**
     * @dev 预估用户分红
     */
    function estimateUserDividend(address user) external view returns (uint256) {
        return _calculateUserDividend(user);
    }
    
    /**
     * @dev 获取等级要求
     */
    function getLevelRequirements() external pure returns (
        uint256[3] memory directReqs,
        uint256[3] memory stakeReqs,
        uint256[3] memory zoneReqs
    ) {
        directReqs = [V1_DIRECT_REFERRALS, V2_DIRECT_REFERRALS, V3_DIRECT_REFERRALS];
        stakeReqs = [V1_MIN_STAKE, V2_MIN_STAKE, V3_MIN_STAKE];
        zoneReqs = [V1_SMALL_ZONE_MIN, V2_SMALL_ZONE_MIN, V3_SMALL_ZONE_MIN];
    }
    
    // ============ 外部接口调用 ============
    
    /**
     * @dev 获取用户质押价值
     */
    function _getUserStakeValue(address user) internal view returns (uint256) {
        if (stakingPool == address(0)) return 0;
        return IStakingPool(stakingPool).getUserPortfolioValue(user);
    }
    
    /**
     * @dev 获取直推人数
     */
    function _getDirectReferralCount(address user) internal view returns (uint256) {
        if (referralSystem == address(0)) return 0;
        return IReferralSystem(referralSystem).getDirectReferrals(user).length;
    }
    
    /**
     * @dev 获取直推列表
     */
    function _getDirectReferrals(address user) internal view returns (address[] memory) {
        if (referralSystem == address(0)) return new address[](0);
        return IReferralSystem(referralSystem).getDirectReferrals(user);
    }
    
    // ============ 管理员函数 ============
    
    /**
     * @dev 设置合约引用
     */
    function setContracts(address _stakingPool, address _referralSystem) external onlyOwner {
        stakingPool = _stakingPool;
        referralSystem = _referralSystem;
    }
    
    /**
     * @dev 设置地址
     */
    function setAddresses(address _governance, address _presale) external onlyOwner {
        governanceAddress = _governance;
        presaleAddress = _presale;
    }
    
    /**
     * @dev 紧急提取（仅限紧急情况）
     */
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "DividendPool: zero address");
        require(etrToken.transfer(to, amount), "DividendPool: transfer failed");
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
     * @dev 设置小区业绩计算深度限制
     * @param depth 深度层数（默认10层）
     */
    function setTeamDepthLimit(uint256 depth) external onlyOwner {
        require(depth >= 1 && depth <= 20, "Depth out of range (1-20)");
        
        uint256 oldLimit = teamDepthLimit;
        teamDepthLimit = depth;
        
        emit TeamDepthLimitUpdated(oldLimit, depth);
    }
    
    /**
     * @dev 获取当前小区业绩计算深度
     */
    function getTeamDepthLimit() external view returns (uint256) {
        return teamDepthLimit;
    }
}

// ============ 外部接口 ============

interface IStakingPool {
    function getUserPortfolioValue(address user) external view returns (uint256);
}

interface IReferralSystem {
    function getDirectReferrals(address referrer) external view returns (address[] memory);
}