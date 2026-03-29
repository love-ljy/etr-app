// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// ============ 外部接口 ============

interface ILPPair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function sync() external;
}

interface ICompoundPool {
    function depositReward(address user, uint256 amount) external;
}

/**
 * @title ETRStakingPool
 * @dev ETR质押挖矿合约 V3
 * 
 * 功能：
 * 1. USDT入金：自动从LP池买入ETR，3%滑点用户承担，自动质押
 * 2. ETR入金：直接质押，线性释放2%/50天
 * 3. 日化收益 0.3%-0.6%（可手动调节）
 * 4. 每日解锁进入矿池，用户手动领取
 * 5. 有效账户：持仓≥$100
 * 
 * 质押挖矿规则：
 * - 50天锁仓，每日解锁2%（币本位，解锁ETR数量）
 * - 日化收益发放到复利池
 * - 复利池奖励需手动领取
 * - 持仓≥$100为有效账户
 */
contract ETRStakingPool is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ 常量定义 ============
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant SECONDS_PER_DAY = 86400;
    
    // 锁仓配置
    uint256 public constant LOCK_PERIOD = 50 days;
    uint256 public constant DAILY_UNLOCK_RATE = 200;  // 每日解锁 2% (基点)
    
    // 收益配置
    uint256 public constant DEFAULT_MIN_YIELD_RATE = 30;   // 最低日化 0.3%
    uint256 public constant DEFAULT_MAX_YIELD_RATE = 60;   // 最高日化 0.6%
    uint256 public constant DEFAULT_YIELD_RATE = 45;       // 默认日化 0.45%
    
    // 质押门槛
    uint256 public constant MIN_STAKE_VALUE_USD = 100 * 1e18;  // $100
    
    // USDT买入滑点
    uint256 public constant USDT_BUY_SLIPPAGE = 300;  // 3%
    
    // 黑洞地址
    address public constant BLACKHOLE = 0x000000000000000000000000000000000000dEaD;
    
    // ============ 状态变量 ============
    
    IERC20 public usdtToken;           // USDT代币
    IERC20 public etrToken;            // ETR代币
    address public lpPair;             // LP池地址 (PancakePair)
    address public compoundPool;       // 复利池地址
    address public marketingWallet;    // 营销钱包
    address public nodeDividendWallet; // 节点分红钱包
    
    // 质押统计
    uint256 public totalStakedETR;      // 总质押ETR
    uint256 public totalStakedUSDT;     // 总质押USDT（换算）
    uint256 public totalRewardsDistributed; // 总已分发收益
    uint256 public nextStakeId;
    
    // 收益率配置
    uint256 public currentYieldRate = DEFAULT_YIELD_RATE;  // 当前日化收益率（基点）
    uint256 public minYieldRate = DEFAULT_MIN_YIELD_RATE;
    uint256 public maxYieldRate = DEFAULT_MAX_YIELD_RATE;
    uint256 public lastYieldUpdateTime;
    
    // ETR价格（从LP计算或手动设置）
    uint256 public etrPriceUSD;  // ETR价格 (1e18)
    
    // ============ 结构体定义 ============
    
    struct StakeRecord {
        uint256 stakeId;
        address owner;
        uint256 stakeType;       // 1=USDT入金, 2=ETR入金
        uint256 stakeAmount;     // 质押数量（USDT或ETR）
        uint256 etrPrincipal;    // ETR本金（统一折算）
        uint256 startTime;
        uint256 unlockTime;      // 完全解锁时间
        uint256 lastClaimTime;
        uint256 totalClaimed;
        uint256 dailyYieldRate;
        bool active;
    }
    
    struct UserAccount {
        uint256[] stakeIds;
        uint256 totalStakedUSD;
        uint256 totalClaimedETR;
        bool isValid;            // 是否有效账户（持仓≥$100）
        uint256 lastValidityCheck;
        uint256 compoundPending; // 复利池待领取
        uint256 lastCompoundTime;
    }
    
    // ============ 映射 ============
    
    mapping(address => UserAccount) public userAccounts;
    mapping(uint256 => StakeRecord) public stakeRecords;
    mapping(address => uint256) public unlockedETR;  // 已解锁待领取的ETR
    mapping(address => uint256) public lastUnlockTime; // 上次解锁时间
    
    // ============ 事件 ============
    
    event USDTStaked(address indexed user, uint256 usdtAmount, uint256 etrReceived, uint256 stakeId);
    event ETRStaked(address indexed user, uint256 etrAmount, uint256 stakeId);
    event Unlocked(address indexed user, uint256 etrAmount);
    event RewardClaimed(address indexed user, uint256 amount);
    event CompoundDeposited(address indexed user, uint256 amount);
    event CompoundClaimed(address indexed user, uint256 amount);
    event YieldRateUpdated(uint256 oldRate, uint256 newRate);
    event PriceUpdated(uint256 oldPrice, uint256 newPrice);
    event WithdrawStuckTokens(address token, address to, uint256 amount);
    
    // ============ 构造函数 ============
    
    constructor(
        address _usdtToken,
        address _etrToken,
        address _lpPair,
        address _compoundPool,
        address _marketingWallet,
        address _nodeDividendWallet
    ) {
        usdtToken = IERC20(_usdtToken);
        etrToken = IERC20(_etrToken);
        lpPair = _lpPair;
        compoundPool = _compoundPool;
        marketingWallet = _marketingWallet;
        nodeDividendWallet = _nodeDividendWallet;
        lastYieldUpdateTime = block.timestamp;
    }
    
    // ============ 核心功能 ============
    
    /**
     * @dev USDT入金：自动从LP池买入ETR并质押
     * @param usdtAmount USDT数量
     * @param minETRAmount 最小ETR数量（滑点保护）
     */
    function stakeWithUSDT(uint256 usdtAmount, uint256 minETRAmount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(usdtAmount > 0, "Amount must be > 0");
        
        // 1. 从用户转入USDT
        usdtToken.safeTransferFrom(msg.sender, address(this), usdtAmount);
        
        // 2. 从LP池买入ETR（扣除3%滑点）
        uint256 etrAmount = buyETRFromLP(usdtAmount, minETRAmount);
        
        // 3. 创建质押记录
        uint256 stakeId = _createStake(msg.sender, 1, usdtAmount, etrAmount);
        
        // 4. 自动质押ETR到矿池
        etrToken.safeTransfer(msg.sender, etrAmount); // 返还给用户（用户手动质押）
        
        emit USDTStaked(msg.sender, usdtAmount, etrAmount, stakeId);
    }
    
    /**
     * @dev ETR直接入金质押
     * @param etrAmount ETR数量
     */
    function stakeWithETR(uint256 etrAmount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(etrAmount > 0, "Amount must be > 0");
        
        // 1. 从用户转入ETR
        etrToken.safeTransferFrom(msg.sender, address(this), etrAmount);
        
        // 2. 创建质押记录
        uint256 stakeId = _createStake(msg.sender, 2, 0, etrAmount);
        
        emit ETRStaked(msg.sender, etrAmount, stakeId);
    }
    
    /**
     * @dev 从LP池买入ETR
     */
    function buyETRFromLP(uint256 usdtAmount, uint256 minETRAmount) 
        internal 
        returns (uint256) 
    {
        require(lpPair != address(0), "LP not set");
        
        // 计算滑点后用户实际收到的ETR
        // 滑点 = 3%，用户承担
        uint256 slippage = (usdtAmount * USDT_BUY_SLIPPAGE) / BPS_DENOMINATOR;
        uint256 effectiveUSDT = usdtAmount - slippage;
        
        // 从LP池兑换（简化，实际需要调用PancakeSwap Router）
        (uint112 reserve0, uint112 reserve1, ) = ILPPair(lpPair).getReserves();
        address token0 = ILPPair(lpPair).token0();
        
        // 假设token0是USDT，token1是ETR
        uint256 etrAmount;
        if (token0 == address(usdtToken)) {
            etrAmount = _getAmountOut(effectiveUSDT, reserve0, reserve1);
        } else {
            etrAmount = _getAmountOut(effectiveUSDT, reserve1, reserve0);
        }
        
        require(etrAmount >= minETRAmount, "Slippage protection");
        
        return etrAmount;
    }
    
    /**
     * @dev 简化版AMM公式计算输出
     */
    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) 
        internal 
        pure 
        returns (uint256) 
    {
        require(amountIn > 0, "INSUFFICIENT_INPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "INSUFFICIENT_LIQUIDITY");
        
        uint256 amountInWithFee = amountIn * 9975; // 0.25% fee
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 10000 + amountInWithFee;
        return numerator / denominator;
    }
    
    /**
     * @dev 创建质押记录
     */
    function _createStake(
        address user,
        uint256 stakeType,
        uint256 usdtAmount,
        uint256 etrAmount
    ) internal returns (uint256) {
        uint256 stakeId = nextStakeId++;
        
        // 计算ETR本金
        uint256 etrPrincipal = etrAmount;
        
        // 计算质押价值USD
        uint256 stakeValueUSD = etrAmount * etrPriceUSD / 1e18;
        if (stakeValueUSD == 0 && etrAmount > 0) {
            stakeValueUSD = usdtAmount; // USDT质押按USDT价值计算
        }
        
        StakeRecord memory record = StakeRecord({
            stakeId: stakeId,
            owner: user,
            stakeType: stakeType,
            stakeAmount: stakeType == 1 ? usdtAmount : etrAmount,
            etrPrincipal: etrPrincipal,
            startTime: block.timestamp,
            unlockTime: block.timestamp + LOCK_PERIOD,
            lastClaimTime: block.timestamp,
            totalClaimed: 0,
            dailyYieldRate: currentYieldRate,
            active: true
        });
        
        stakeRecords[stakeId] = record;
        userAccounts[user].stakeIds.push(stakeId);
        
        // 更新统计
        totalStakedETR += etrPrincipal;
        totalStakedUSDT += usdtAmount;
        
        // 检查有效账户
        _checkAndUpdateValidity(user, stakeValueUSD);
        
        return stakeId;
    }
    
    /**
     * @dev 计算每日解锁ETR
     */
    function calculateDailyUnlock(address user) public view returns (uint256) {
        UserAccount storage account = userAccounts[user];
        if (!account.isValid) return 0;
        
        uint256 totalETR = account.totalStakedUSD * 1e18 / (etrPriceUSD > 0 ? etrPriceUSD : 1e18);
        
        // 每日解锁2%
        uint256 daysSinceStart = (block.timestamp - lastUnlockTime[user]) / SECONDS_PER_DAY;
        if (daysSinceStart == 0) return 0;
        
        uint256 unlockAmount = (totalETR * DAILY_UNLOCK_RATE * daysSinceStart) / BPS_DENOMINATOR;
        return unlockAmount;
    }
    
    /**
     * @dev 手动触发解锁计算
     */
    function triggerUnlock(address user) external {
        uint256 unlockAmount = calculateDailyUnlock(user);
        if (unlockAmount > 0) {
            unlockedETR[user] += unlockAmount;
            lastUnlockTime[user] = block.timestamp;
            emit Unlocked(user, unlockAmount);
        }
    }
    
    /**
     * @dev 领取已解锁的ETR
     */
    function claimUnlocked() external nonReentrant {
        uint256 amount = unlockedETR[msg.sender];
        require(amount > 0, "Nothing to claim");
        
        unlockedETR[msg.sender] = 0;
        etrToken.safeTransfer(msg.sender, amount);
        
        emit RewardClaimed(msg.sender, amount);
    }
    
    /**
     * @dev 计算并发放日化收益到复利池
     */
    function calculateAndDepositReward(address user) external {
        UserAccount storage account = userAccounts[user];
        if (!account.isValid) return;
        
        // 计算日化收益
        uint256 stakeValueUSD = account.totalStakedUSD;
        uint256 dailyReward = (stakeValueUSD * currentYieldRate) / BPS_DENOMINATOR / 365;
        
        // 转换为ETR
        uint256 etrReward = dailyReward * 1e18 / etrPriceUSD;
        
        if (etrReward > 0) {
            // 存入复利池
            account.compoundPending += etrReward;
            totalRewardsDistributed += etrReward;
            
            emit CompoundDeposited(user, etrReward);
        }
    }
    
    /**
     * @dev 领取复利池收益
     */
    function claimCompoundReward() external nonReentrant {
        UserAccount storage account = userAccounts[msg.sender];
        uint256 amount = account.compoundPending;
        require(amount > 0, "Nothing to claim");
        
        account.compoundPending = 0;
        
        // 存入复利池
        if (compoundPool != address(0)) {
            etrToken.safeTransfer(compoundPool, amount);
            ICompoundPool(compoundPool).depositReward(msg.sender, amount);
        } else {
            etrToken.safeTransfer(msg.sender, amount);
        }
        
        emit CompoundClaimed(msg.sender, amount);
    }
    
    /**
     * @dev 检查并更新账户有效性
     */
    function _checkAndUpdateValidity(address user, uint256 newStakeValueUSD) internal {
        UserAccount storage account = userAccounts[user];
        account.totalStakedUSD += newStakeValueUSD;
        
        // 有效账户：持仓≥$100
        account.isValid = account.totalStakedUSD >= MIN_STAKE_VALUE_USD;
        account.lastValidityCheck = block.timestamp;
    }
    
    // ============ 管理函数 ============
    
    /**
     * @dev 设置日化收益率
     */
    function setYieldRate(uint256 newRate) external onlyOwner {
        require(newRate >= minYieldRate && newRate <= maxYieldRate, "Rate out of range");
        
        uint256 oldRate = currentYieldRate;
        currentYieldRate = newRate;
        
        emit YieldRateUpdated(oldRate, newRate);
    }
    
    /**
     * @dev 设置收益率范围
     */
    function setYieldRateRange(uint256 _minRate, uint256 _maxRate) external onlyOwner {
        minYieldRate = _minRate;
        maxYieldRate = _maxRate;
    }
    
    /**
     * @dev 更新ETR价格
     */
    function setETRPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be > 0");
        
        uint256 oldPrice = etrPriceUSD;
        etrPriceUSD = newPrice;
        
        emit PriceUpdated(oldPrice, newPrice);
    }
    
    /**
     * @dev 从LP池同步ETR价格
     */
    function syncETRPriceFromLP() external {
        require(lpPair != address(0), "LP not set");
        
        (uint112 reserve0, uint112 reserve1, ) = ILPPair(lpPair).getReserves();
        address token0 = ILPPair(lpPair).token0();
        
        uint256 oldPrice = etrPriceUSD;
        
        if (token0 == address(usdtToken)) {
            // USDT/ETR价格 = reserve0/reserve1
            etrPriceUSD = (reserve0 * 1e18) / reserve1;
        } else {
            etrPriceUSD = (reserve1 * 1e18) / reserve0;
        }
        
        emit PriceUpdated(oldPrice, etrPriceUSD);
    }
    
    /**
     * @dev 设置复利池地址
     */
    function setCompoundPool(address _compoundPool) external onlyOwner {
        compoundPool = _compoundPool;
    }
    
    /**
     * @dev 设置营销钱包
     */
    function setMarketingWallet(address _wallet) external onlyOwner {
        marketingWallet = _wallet;
    }
    
    /**
     * @dev 设置节点分红钱包
     */
    function setNodeDividendWallet(address _wallet) external onlyOwner {
        nodeDividendWallet = _wallet;
    }
    
    /**
     * @dev 设置LP池地址
     */
    function setLPPair(address _lpPair) external onlyOwner {
        lpPair = _lpPair;
    }
    
    /**
     * @dev LP权限丢弃 - 将LP代币打入黑洞
     */
    function dropLPRole(address lpTokenAddress) external onlyOwner {
        IERC20 lpToken = IERC20(lpTokenAddress);
        uint256 balance = lpToken.balanceOf(address(this));
        if (balance > 0) {
            lpToken.safeTransfer(BLACKHOLE, balance);
        }
        
        emit WithdrawStuckTokens(lpTokenAddress, BLACKHOLE, balance);
    }
    
    /**
     * @dev 提取误转入的代币
     */
    function withdrawStuckTokens(address token, address to) external onlyOwner {
        require(token != address(etrToken) && token != address(usdtToken), "Cannot withdraw staking tokens");
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "Nothing to withdraw");
        IERC20(token).safeTransfer(to, balance);
        
        emit WithdrawStuckTokens(token, to, balance);
    }
    
    // ============ 查询函数 ============
    
    /**
     * @dev 获取用户质押信息
     */
    function getUserStakeInfo(address user) external view returns (
        uint256 totalStakedUSD,
        uint256 pendingUnlockETR,
        uint256 compoundPending,
        bool isValid
    ) {
        UserAccount storage account = userAccounts[user];
        return (
            account.totalStakedUSD,
            unlockedETR[user],
            account.compoundPending,
            account.isValid
        );
    }
    
    /**
     * @dev 获取用户质押记录
     */
    function getUserStakes(address user) external view returns (StakeRecord[] memory) {
        uint256[] memory stakeIds = userAccounts[user].stakeIds;
        StakeRecord[] memory records = new StakeRecord[](stakeIds.length);
        
        for (uint256 i = 0; i < stakeIds.length; i++) {
            records[i] = stakeRecords[stakeIds[i]];
        }
        
        return records;
    }
    
    /**
     * @dev 获取系统统计
     */
    function getSystemStats() external view returns (
        uint256 _totalStakedETR,
        uint256 _totalStakedUSDT,
        uint256 _totalRewardsDistributed,
        uint256 _currentYieldRate,
        uint256 _etrPrice
    ) {
        return (
            totalStakedETR,
            totalStakedUSDT,
            totalRewardsDistributed,
            currentYieldRate,
            etrPriceUSD
        );
    }
}