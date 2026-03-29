// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SlippageController
 * @dev 滑点控制合约
 * - 动态滑点计算（基于价格跌幅）
 * - 价格跌幅检测
 * - 滑点恢复机制（每日恢复5%）
 * - 与ETRToken集成
 */
contract SlippageController is Ownable, Pausable {
    using SafeERC20 for IERC20;
    
    // ============ 常量定义 ============
    uint256 public constant BPS_DENOMINATOR = 10000;      // 基点分母
    uint256 public constant PRICE_PRECISION = 1e18;       // 价格精度
    
    // 黑洞地址
    address public constant BLACKHOLE = 0x000000000000000000000000000000000000dEaD;
    
    // 滑点配置
    uint256 public constant BASE_BUY_FEE = 300;           // 基础买入滑点 3%
    uint256 public constant BASE_SELL_FEE = 300;          // 基础卖出滑点 3%
    uint256 public constant MAX_SELL_FEE = 5000;          // 最大卖出滑点 50%
    uint256 public constant DAILY_RECOVERY_RATE = 500;    // 每日恢复 5%
    uint256 public constant RECOVERY_INTERVAL = 1 days;   // 恢复间隔
    
    // 价格跌幅阈值
    uint256 public constant DROP_10_PERCENT = 1000;       // 10%跌幅
    uint256 public constant DROP_20_PERCENT = 2000;       // 20%跌幅
    uint256 public constant DROP_30_PERCENT = 3000;       // 30%跌幅
    uint256 public constant DROP_40_PERCENT = 4000;       // 40%跌幅
    
    // 对应滑点
    uint256 public constant SLIPPAGE_10_PERCENT = 1000;   // 10%滑点
    uint256 public constant SLIPPAGE_20_PERCENT = 2000;   // 20%滑点
    uint256 public constant SLIPPAGE_30_PERCENT = 3000;   // 30%滑点
    uint256 public constant SLIPPAGE_40_PERCENT = 4000;   // 40%滑点
    
    // ============ 结构体定义 ============
    
    // 价格信息
    struct PriceInfo {
        uint256 openPrice;            // 当日开盘价
        uint256 currentPrice;         // 当前价格
        uint256 lowestPrice;          // 当日最低价
        uint256 highestPrice;         // 当日最高价
        uint256 lastUpdateTime;       // 上次更新时间
        uint256 todayOpenTime;        // 今日开盘时间
    }
    
    // 滑点状态
    struct SlippageState {
        uint256 currentBuyFee;        // 当前买入滑点
        uint256 currentSellFee;       // 当前卖出滑点
        uint256 priceDropPercent;     // 当前价格跌幅
        uint256 lastRecoveryTime;     // 上次恢复时间
        uint256 recoveryCount;        // 已恢复次数
    }
    
    // 价格观测配置
    struct ObservationConfig {
        uint256 observationInterval;  // 观测间隔
        uint256 priceValidityPeriod;  // 价格有效期
    }
    
    // ============ 状态变量 ============
    
    address public etrToken;              // ETR代币合约
    address public priceOracle;           // 价格预言机
    address public lpPool;                // 流动性池地址
    
    // 价格信息
    PriceInfo public priceInfo;
    
    // 滑点状态
    SlippageState public slippageState;
    
    // 观测配置
    ObservationConfig public config;
    
    // 历史开盘价（按天存储）
    mapping(uint256 => uint256) public historicalOpenPrices;
    
    // 每日价格极值
    struct DailyPrice {
        uint256 high;
        uint256 low;
        uint256 open;
        uint256 close;
        uint256 timestamp;
    }
    mapping(uint256 => DailyPrice) public dailyPrices;
    
    // 白名单地址（不受滑点限制）
    mapping(address => bool) public whitelisted;
    
    // ============ 事件定义 ============
    
    event PriceUpdated(
        uint256 oldPrice,
        uint256 newPrice,
        uint256 timestamp
    );
    event SlippageAdjusted(
        uint256 oldSellFee,
        uint256 newSellFee,
        uint256 priceDrop,
        string reason
    );
    event SlippageRecovered(
        uint256 oldSellFee,
        uint256 newSellFee,
        uint256 recoveryCount
    );
    event NewDayStarted(
        uint256 dayTimestamp,
        uint256 openPrice
    );
    event PriceDropDetected(
        uint256 openPrice,
        uint256 currentPrice,
        uint256 dropPercent
    );
    event WhitelistUpdated(address indexed account, bool status);
    event DailyPriceRecorded(
        uint256 day,
        uint256 high,
        uint256 low,
        uint256 open,
        uint256 close
    );
    event WithdrawStuckTokens(address token, address to, uint256 amount);
    
    // ============ 修饰符 ============
    
    modifier onlyETRToken() {
        require(msg.sender == etrToken, "SlippageController: only ETR token");
        _;
    }
    
    // ============ 构造函数 ============
    
    constructor(
        address _etrToken,
        address _priceOracle,
        address _lpPool
    ) {
        require(_etrToken != address(0), "SlippageController: ETR token is zero address");
        require(_priceOracle != address(0), "SlippageController: price oracle is zero address");
        require(_lpPool != address(0), "SlippageController: LP pool is zero address");
        
        etrToken = _etrToken;
        priceOracle = _priceOracle;
        lpPool = _lpPool;
        
        // 初始化滑点状态
        slippageState = SlippageState({
            currentBuyFee: BASE_BUY_FEE,
            currentSellFee: BASE_SELL_FEE,
            priceDropPercent: 0,
            lastRecoveryTime: block.timestamp,
            recoveryCount: 0
        });
        
        // 初始化配置
        config = ObservationConfig({
            observationInterval: 1 hours,
            priceValidityPeriod: 5 minutes
        });
        
        // 设置初始价格
        priceInfo = PriceInfo({
            openPrice: PRICE_PRECISION,  // 默认 $1.00
            currentPrice: PRICE_PRECISION,
            lowestPrice: PRICE_PRECISION,
            highestPrice: PRICE_PRECISION,
            lastUpdateTime: block.timestamp,
            todayOpenTime: block.timestamp
        });
        
        // 白名单添加重要地址
        whitelisted[_lpPool] = true;
        whitelisted[_etrToken] = true;
    }
    
    // ============ 核心函数 ============
    
    /**
     * @dev 更新价格（由预言机或外部调用）
     * @param newPrice 新价格
     */
    function updatePrice(uint256 newPrice) external whenNotPaused {
        require(newPrice > 0, "SlippageController: invalid price");
        
        uint256 oldPrice = priceInfo.currentPrice;
        
        // 检查是否新的一天
        _checkNewDay();
        
        // 更新价格
        priceInfo.currentPrice = newPrice;
        priceInfo.lastUpdateTime = block.timestamp;
        
        // 更新高低价
        if (newPrice < priceInfo.lowestPrice) {
            priceInfo.lowestPrice = newPrice;
        }
        if (newPrice > priceInfo.highestPrice) {
            priceInfo.highestPrice = newPrice;
        }
        
        // 计算价格跌幅
        _calculateAndAdjustSlippage();
        
        emit PriceUpdated(oldPrice, newPrice, block.timestamp);
    }
    
    /**
     * @dev 检查并处理新的一天
     */
    function _checkNewDay() internal {
        uint256 dayStart = (block.timestamp / 1 days) * 1 days;
        
        if (dayStart > priceInfo.todayOpenTime) {
            // 记录昨日价格数据
            uint256 yesterday = dayStart - 1 days;
            dailyPrices[yesterday] = DailyPrice({
                high: priceInfo.highestPrice,
                low: priceInfo.lowestPrice,
                open: priceInfo.openPrice,
                close: priceInfo.currentPrice,
                timestamp: yesterday
            });
            
            emit DailyPriceRecorded(
                yesterday,
                priceInfo.highestPrice,
                priceInfo.lowestPrice,
                priceInfo.openPrice,
                priceInfo.currentPrice
            );
            
            // 设置新的开盘价
            priceInfo.openPrice = priceInfo.currentPrice;
            priceInfo.todayOpenTime = dayStart;
            priceInfo.lowestPrice = priceInfo.currentPrice;
            priceInfo.highestPrice = priceInfo.currentPrice;
            
            // 存储历史开盘价
            historicalOpenPrices[dayStart] = priceInfo.currentPrice;
            
            // 尝试恢复滑点
            _tryRecoverSlippage();
            
            emit NewDayStarted(dayStart, priceInfo.openPrice);
        }
    }
    
    /**
     * @dev 计算价格跌幅并调整滑点
     */
    function _calculateAndAdjustSlippage() internal {
        uint256 openPrice = priceInfo.openPrice;
        uint256 currentPrice = priceInfo.currentPrice;
        
        if (openPrice == 0 || currentPrice >= openPrice) {
            // 价格未下跌，不调整
            slippageState.priceDropPercent = 0;
            return;
        }
        
        // 计算跌幅
        uint256 drop = ((openPrice - currentPrice) * BPS_DENOMINATOR) / openPrice;
        slippageState.priceDropPercent = drop;
        
        // 检测价格跌幅并调整滑点
        uint256 newSellFee = BASE_SELL_FEE;
        bool shouldAdjust = false;
        string memory reason = "";
        
        if (drop >= DROP_40_PERCENT) {
            newSellFee = SLIPPAGE_40_PERCENT;
            shouldAdjust = true;
            reason = "Price drop >= 40%";
        } else if (drop >= DROP_30_PERCENT) {
            newSellFee = SLIPPAGE_30_PERCENT;
            shouldAdjust = true;
            reason = "Price drop >= 30%";
        } else if (drop >= DROP_20_PERCENT) {
            newSellFee = SLIPPAGE_20_PERCENT;
            shouldAdjust = true;
            reason = "Price drop >= 20%";
        } else if (drop >= DROP_10_PERCENT) {
            newSellFee = SLIPPAGE_10_PERCENT;
            shouldAdjust = true;
            reason = "Price drop >= 10%";
        }
        
        // 如果当前滑点已高于新计算的滑点，保持当前滑点（只增不减）
        if (newSellFee > slippageState.currentSellFee) {
            uint256 oldFee = slippageState.currentSellFee;
            slippageState.currentSellFee = newSellFee;
            
            emit SlippageAdjusted(oldFee, newSellFee, drop, reason);
            emit PriceDropDetected(openPrice, currentPrice, drop);
            
            // 更新ETRToken的卖出手续费
            _updateETRSellFee(newSellFee);
        }
    }
    
    /**
     * @dev 尝试恢复滑点
     */
    function _tryRecoverSlippage() internal {
        if (slippageState.currentSellFee <= BASE_SELL_FEE) {
            return;
        }
        
        // 检查是否到了恢复时间
        if (block.timestamp < slippageState.lastRecoveryTime + RECOVERY_INTERVAL) {
            return;
        }
        
        uint256 oldFee = slippageState.currentSellFee;
        uint256 newFee = oldFee;
        
        // 每日恢复5%
        if (oldFee > BASE_SELL_FEE + DAILY_RECOVERY_RATE) {
            newFee = oldFee - DAILY_RECOVERY_RATE;
        } else {
            newFee = BASE_SELL_FEE;
        }
        
        slippageState.currentSellFee = newFee;
        slippageState.lastRecoveryTime = block.timestamp;
        slippageState.recoveryCount++;
        
        emit SlippageRecovered(oldFee, newFee, slippageState.recoveryCount);
        
        // 更新ETRToken的卖出手续费
        _updateETRSellFee(newFee);
    }
    
    /**
     * @dev 手动触发滑点恢复
     */
    function recoverSlippage() external whenNotPaused {
        require(
            block.timestamp >= slippageState.lastRecoveryTime + RECOVERY_INTERVAL,
            "SlippageController: recovery interval not met"
        );
        
        _tryRecoverSlippage();
    }
    
    /**
     * @dev 更新ETRToken的卖出手续费
     */
    function _updateETRSellFee(uint256 newFee) internal {
        if (etrToken != address(0)) {
            // 调用ETRToken的setSellFee函数
            // 需要ETRToken实现此功能
            IETRToken(etrToken).setSellFee(newFee);
        }
    }
    
    /**
     * @dev 获取当前卖出滑点（供ETRToken调用）
     * @return 当前卖出滑点（基点）
     */
    function getCurrentSellFee() external view returns (uint256) {
        return slippageState.currentSellFee;
    }
    
    /**
     * @dev 计算交易的实际滑点
     * @param amount 交易金额
     * @param isBuy 是否为买入
     * @return feeAmount 手续费金额
     */
    function calculateSlippage(uint256 amount, bool isBuy) external view returns (uint256 feeAmount) {
        uint256 feeRate = isBuy ? slippageState.currentBuyFee : slippageState.currentSellFee;
        feeAmount = amount * feeRate / BPS_DENOMINATOR;
        return feeAmount;
    }
    
    /**
     * @dev 检查账户是否在白名单
     */
    function isWhitelisted(address account) external view returns (bool) {
        return whitelisted[account];
    }
    
    // ============ 查询函数 ============
    
    /**
     * @dev 获取当前价格信息
     */
    function getPriceInfo() external view returns (PriceInfo memory) {
        return priceInfo;
    }
    
    /**
     * @dev 获取滑点状态
     */
    function getSlippageState() external view returns (SlippageState memory) {
        return slippageState;
    }
    
    /**
     * @dev 获取当前价格跌幅
     */
    function getCurrentPriceDrop() external view returns (uint256) {
        return slippageState.priceDropPercent;
    }
    
    /**
     * @dev 获取预估的恢复时间
     */
    function getNextRecoveryTime() external view returns (uint256) {
        return slippageState.lastRecoveryTime + RECOVERY_INTERVAL;
    }
    
    /**
     * @dev 获取历史每日价格
     */
    function getDailyPrice(uint256 dayTimestamp) external view returns (DailyPrice memory) {
        return dailyPrices[dayTimestamp];
    }
    
    /**
     * @dev 计算价格跌幅对应的滑点
     * @param dropPercent 跌幅（基点）
     * @return 建议的滑点
     */
    function calculateSlippageForDrop(uint256 dropPercent) external pure returns (uint256) {
        if (dropPercent >= 4000) return SLIPPAGE_40_PERCENT;
        if (dropPercent >= 3000) return SLIPPAGE_30_PERCENT;
        if (dropPercent >= 2000) return SLIPPAGE_20_PERCENT;
        if (dropPercent >= 1000) return SLIPPAGE_10_PERCENT;
        return BASE_SELL_FEE;
    }
    
    /**
     * @dev 获取达到完全恢复所需天数
     */
    function getDaysToFullRecovery() external view returns (uint256) {
        if (slippageState.currentSellFee <= BASE_SELL_FEE) {
            return 0;
        }
        
        uint256 excessSlippage = slippageState.currentSellFee - BASE_SELL_FEE;
        uint256 daysNeeded = (excessSlippage + DAILY_RECOVERY_RATE - 1) / DAILY_RECOVERY_RATE;
        return daysNeeded;
    }
    
    // ============ 管理员函数 ============
    
    /**
     * @dev 设置合约地址
     */
    function setContracts(address _etrToken, address _priceOracle, address _lpPool) external onlyOwner {
        etrToken = _etrToken;
        priceOracle = _priceOracle;
        lpPool = _lpPool;
    }
    
    /**
     * @dev 更新白名单
     */
    function setWhitelist(address account, bool status) external onlyOwner {
        whitelisted[account] = status;
        emit WhitelistUpdated(account, status);
    }
    
    /**
     * @dev 手动设置价格（紧急情况）
     */
    function emergencySetPrice(uint256 price) external onlyOwner {
        require(price > 0, "SlippageController: invalid price");
        priceInfo.currentPrice = price;
        priceInfo.lastUpdateTime = block.timestamp;
        emit PriceUpdated(0, price, block.timestamp);
    }
    
    /**
     * @dev 手动设置滑点（紧急情况）
     */
    function emergencySetSlippage(uint256 sellFee) external onlyOwner {
        require(sellFee <= MAX_SELL_FEE, "SlippageController: fee too high");
        uint256 oldFee = slippageState.currentSellFee;
        slippageState.currentSellFee = sellFee;
        emit SlippageAdjusted(oldFee, sellFee, 0, "Emergency adjustment");
        _updateETRSellFee(sellFee);
    }
    
    /**
     * @dev 更新观测配置
     */
    function updateConfig(
        uint256 _observationInterval,
        uint256 _priceValidityPeriod
    ) external onlyOwner {
        config.observationInterval = _observationInterval;
        config.priceValidityPeriod = _priceValidityPeriod;
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
     * @dev LP权限丢弃 - 将LP代币打入黑洞
     * @param lpTokenAddress LP代币地址
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
        IERC20 erc20Token = IERC20(token);
        uint256 balance = erc20Token.balanceOf(address(this));
        require(balance > 0, "Nothing to withdraw");
        erc20Token.safeTransfer(to, balance);
        emit WithdrawStuckTokens(token, to, balance);
    }
}

// ============ 外部接口 ============

interface IETRToken {
    function setSellFee(uint256 fee) external;
}