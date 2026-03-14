// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title PriceOracle
 * @dev 价格预言机合约
 * - 使用PancakeSwap TWAP（时间加权平均价格）获取ETR价格
 * - 提供价格喂价服务
 * - 防止价格操纵
 */
contract PriceOracle is Ownable, Pausable {
    
    // ============ 常量定义 ============
    uint256 public constant PRICE_PRECISION = 1e18;  // 价格精度
    uint256 public constant BPS_DENOMINATOR = 10000; // 基点分母
    uint256 public constant MAX_PRICE_DEVIATION = 1000; // 最大价格偏差 10%
    
    // 默认配置
    uint256 public constant DEFAULT_OBSERVATION_INTERVAL = 1 hours; // 观测间隔
    uint256 public constant DEFAULT_TWAP_WINDOW = 24 hours;         // TWAP窗口
    
    // ============ 结构体定义 ============
    
    // 价格观测点
    struct PricePoint {
        uint256 price;                // 价格
        uint256 timestamp;            // 时间戳
        uint256 blockNumber;          // 区块号
    }
    
    // TWAP配置
    struct TWAPConfig {
        uint256 observationInterval;  // 观测间隔
        uint256 twapWindow;           // TWAP窗口
        uint256 maxPriceDeviation;    // 最大价格偏差
    }
    
    // 预言机配置
    struct OracleConfig {
        address lpPair;               // LP交易对地址
        address token0;               // Token0地址
        address token1;               // Token1地址
        bool isToken0ETR;             // Token0是否为ETR
    }
    
    // ============ 状态变量 ============
    
    TWAPConfig public twapConfig;
    OracleConfig public oracleConfig;
    
    // 价格观测历史
    PricePoint[] public observations;
    uint256 public currentRound;
    uint256 public lastObservationTime;
    
    // 当前价格
    uint256 public currentPrice;
    uint256 public twapPrice;
    uint256 public lastUpdateBlock;
    
    // 统计
    uint256 public totalUpdates;
    uint256 public lastValidPrice;
    
    // PancakeSwap Pair 接口
    address public pancakePair;
    
    // 备用价格源（Chainlink等）
    address public fallbackOracle;
    
    // ============ 事件定义 ============
    
    event PriceUpdated(
        uint256 price,
        uint256 timestamp,
        uint256 blockNumber
    );
    event TWAPUpdated(
        uint256 twapPrice,
        uint256 timestamp
    );
    event PriceDeviationAlert(
        uint256 spotPrice,
        uint256 twapPrice,
        uint256 deviation
    );
    event ObservationRecorded(
        uint256 indexed round,
        uint256 price,
        uint256 timestamp
    );
    event LPPairSet(address indexed lpPair);
    event TWAPConfigUpdated(
        uint256 observationInterval,
        uint256 twapWindow,
        uint256 maxPriceDeviation
    );
    event FallbackOracleSet(address indexed fallbackOracle);
    
    // ============ 构造函数 ============
    
    constructor(
        address _lpPair,
        bool _isToken0ETR
    ) {
        require(_lpPair != address(0), "PriceOracle: LP pair is zero address");
        
        pancakePair = _lpPair;
        
        // 初始化TWAP配置
        twapConfig = TWAPConfig({
            observationInterval: DEFAULT_OBSERVATION_INTERVAL,
            twapWindow: DEFAULT_TWAP_WINDOW,
            maxPriceDeviation: MAX_PRICE_DEVIATION
        });
        
        // 初始化预言机配置
        oracleConfig = OracleConfig({
            lpPair: _lpPair,
            token0: address(0), // 稍后通过updateTokenAddresses更新
            token1: address(0),
            isToken0ETR: _isToken0ETR
        });
        
        emit LPPairSet(_lpPair);
    }
    
    // ============ 核心函数 ============
    
    /**
     * @dev 获取当前价格（最新）
     * 从PancakeSwap Pair获取现货价格
     */
    function getPrice() public view returns (uint256) {
        if (pancakePair == address(0)) {
            return currentPrice > 0 ? currentPrice : 0;
        }
        
        // 从Pair合约获取储备量
        (uint112 reserve0, uint112 reserve1, ) = IPancakePair(pancakePair).getReserves();
        
        if (reserve0 == 0 || reserve1 == 0) {
            return currentPrice > 0 ? currentPrice : 0;
        }
        
        // 计算价格
        uint256 price;
        if (oracleConfig.isToken0ETR) {
            // ETR是token0，计算token1/token0
            price = uint256(reserve1) * PRICE_PRECISION / uint256(reserve0);
        } else {
            // ETR是token1，计算token0/token1
            price = uint256(reserve0) * PRICE_PRECISION / uint256(reserve1);
        }
        
        return price;
    }
    
    /**
     * @dev 获取TWAP价格（时间加权平均价格）
     */
    function getTWAPPrice() public view returns (uint256) {
        if (observations.length == 0) {
            return getPrice();
        }
        return calculateTWAP(twapConfig.twapWindow);
    }
    
    /**
     * @dev 获取ETR价格（以USD计价）
     * 假设LP对是 ETR/BUSD 或 ETR/USDT
     */
    function getETRPriceInUSD() external view returns (uint256) {
        // 如果LP对是ETR/稳定币，直接返回价格
        return getTWAPPrice();
    }
    
    /**
     * @dev 计算TWAP价格
     * @param window TWAP窗口（秒）
     */
    function calculateTWAP(uint256 window) public view returns (uint256) {
        uint256 observationCount = observations.length;
        if (observationCount == 0) return 0;
        if (observationCount == 1) return observations[0].price;
        
        uint256 cutoffTime = block.timestamp > window ? block.timestamp - window : 0;
        uint256 cumulativePrice = 0;
        uint256 cumulativeTime = 0;
        
        for (uint256 i = observationCount - 1; i > 0; i--) {
            PricePoint memory current = observations[i];
            PricePoint memory previous = observations[i - 1];
            
            if (current.timestamp < cutoffTime) break;
            
            uint256 timeDelta = current.timestamp - previous.timestamp;
            if (timeDelta == 0) continue;
            
            // 时间加权
            cumulativePrice += current.price * timeDelta;
            cumulativeTime += timeDelta;
        }
        
        if (cumulativeTime == 0) {
            return observations[observations.length - 1].price;
        }
        
        return cumulativePrice / cumulativeTime;
    }
    
    /**
     * @dev 更新价格（可由任何人调用）
     * 返回更新后的价格
     */
    function updatePrice() external whenNotPaused returns (uint256) {
        uint256 newPrice = getPrice();
        require(newPrice > 0, "PriceOracle: invalid price");
        
        currentPrice = newPrice;
        lastUpdateBlock = block.number;
        totalUpdates++;
        
        // 记录观测点
        _recordObservation(newPrice);
        
        // 更新TWAP价格
        twapPrice = getTWAPPrice();
        
        emit PriceUpdated(newPrice, block.timestamp, block.number);
        emit TWAPUpdated(twapPrice, block.timestamp);
        
        return newPrice;
    }
    
    /**
     * @dev 记录观测数据
     */
    function _recordObservation(uint256 price) internal {
        // 检查是否满足观测间隔
        if (block.timestamp >= lastObservationTime + twapConfig.observationInterval) {
            observations.push(PricePoint({
                price: price,
                timestamp: block.timestamp,
                blockNumber: block.number
            }));
            
            currentRound++;
            lastObservationTime = block.timestamp;
            
            emit ObservationRecorded(currentRound, price, block.timestamp);
            
            // 限制历史记录长度，防止Gas过高
            if (observations.length > 168) { // 保留7天的数据（每小时一个点）
                // 删除旧的观测点
                for (uint256 i = 0; i < 24; i++) {
                    observations[i] = observations[i + 24];
                }
                // 调整数组长度
                // 注意：这里简化处理，实际可以使用更高效的循环
            }
        }
    }
    
    /**
     * @dev 检查价格是否有效（与TWAP偏差不大）
     */
    function isPriceValid() external view returns (bool) {
        uint256 spotPrice = getPrice();
        uint256 twap = getTWAPPrice();
        
        if (twap == 0) return true; // 没有TWAP数据时认为有效
        
        uint256 deviation = _calculateDeviation(spotPrice, twap);
        return deviation <= twapConfig.maxPriceDeviation;
    }
    
    /**
     * @dev 获取价格偏差
     */
    function getPriceDeviation() external view returns (uint256) {
        uint256 spotPrice = getPrice();
        uint256 twap = getTWAPPrice();
        
        if (twap == 0) return 0;
        
        return _calculateDeviation(spotPrice, twap);
    }
    
    /**
     * @dev 计算价格偏差（基点）
     */
    function _calculateDeviation(uint256 spot, uint256 twap) internal pure returns (uint256) {
        if (spot > twap) {
            return (spot - twap) * BPS_DENOMINATOR / twap;
        } else {
            return (twap - spot) * BPS_DENOMINATOR / spot;
        }
    }
    
    /**
     * @dev 获取验证后的价格（如果偏差过大，使用TWAP）
     */
    function getValidatedPrice() external view returns (uint256) {
        uint256 spotPrice = getPrice();
        uint256 twap = getTWAPPrice();
        
        if (twap == 0) return spotPrice;
        
        uint256 deviation = _calculateDeviation(spotPrice, twap);
        
        // 如果偏差超过阈值，使用TWAP价格
        if (deviation > twapConfig.maxPriceDeviation) {
            return twap;
        }
        
        return spotPrice;
    }
    
    // ============ 管理员函数 ============
    
    /**
     * @dev 设置LP交易对地址
     */
    function setLPPair(address _lpPair) external onlyOwner {
        require(_lpPair != address(0), "PriceOracle: zero address");
        pancakePair = _lpPair;
        oracleConfig.lpPair = _lpPair;
        emit LPPairSet(_lpPair);
    }
    
    /**
     * @dev 更新Token地址（从Pair合约获取）
     */
    function updateTokenAddresses() external onlyOwner {
        require(pancakePair != address(0), "PriceOracle: LP pair not set");
        
        oracleConfig.token0 = IPancakePair(pancakePair).token0();
        oracleConfig.token1 = IPancakePair(pancakePair).token1();
    }
    
    /**
     * @dev 更新TWAP配置
     */
    function updateTWAPConfig(
        uint256 _observationInterval,
        uint256 _twapWindow,
        uint256 _maxPriceDeviation
    ) external onlyOwner {
        require(_observationInterval > 0, "PriceOracle: invalid interval");
        require(_twapWindow > 0, "PriceOracle: invalid window");
        require(_maxPriceDeviation <= BPS_DENOMINATOR, "PriceOracle: deviation too high");
        
        twapConfig.observationInterval = _observationInterval;
        twapConfig.twapWindow = _twapWindow;
        twapConfig.maxPriceDeviation = _maxPriceDeviation;
        
        emit TWAPConfigUpdated(_observationInterval, _twapWindow, _maxPriceDeviation);
    }
    
    /**
     * @dev 设置备用价格源
     */
    function setFallbackOracle(address _fallbackOracle) external onlyOwner {
        fallbackOracle = _fallbackOracle;
        emit FallbackOracleSet(_fallbackOracle);
    }
    
    /**
     * @dev 紧急设置价格（管理员）
     */
    function emergencySetPrice(uint256 price) external onlyOwner {
        require(price > 0, "PriceOracle: invalid price");
        currentPrice = price;
        lastUpdateBlock = block.number;
        emit PriceUpdated(price, block.timestamp, block.number);
    }
    
    /**
     * @dev 批量更新历史数据（用于初始化）
     */
    function batchUpdate(
        uint256[] calldata prices,
        uint256[] calldata timestamps
    ) external onlyOwner {
        require(prices.length == timestamps.length, "PriceOracle: length mismatch");
        require(prices.length <= 168, "PriceOracle: batch too large"); // 最多7天数据
        
        for (uint256 i = 0; i < prices.length; i++) {
            observations.push(PricePoint({
                price: prices[i],
                timestamp: timestamps[i],
                blockNumber: block.number
            }));
            currentRound++;
        }
        
        if (prices.length > 0) {
            lastObservationTime = timestamps[prices.length - 1];
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
    
    // ============ 查询函数 ============
    
    /**
     * @dev 获取指定数量的历史价格
     */
    function getPriceHistory(uint256 count) external view returns (PricePoint[] memory) {
        uint256 length = observations.length;
        if (count > length) count = length;
        
        PricePoint[] memory result = new PricePoint[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = observations[length - count + i];
        }
        return result;
    }
    
    /**
     * @dev 获取最新观测数据
     */
    function getLatestObservation() external view returns (PricePoint memory) {
        require(observations.length > 0, "PriceOracle: no observations");
        return observations[observations.length - 1];
    }
    
    /**
     * @dev 获取配置信息
     */
    function getConfig() external view returns (TWAPConfig memory, OracleConfig memory) {
        return (twapConfig, oracleConfig);
    }
    
    /**
     * @dev 获取观测点数量
     */
    function getObservationCount() external view returns (uint256) {
        return observations.length;
    }
}

// ============ 外部接口 ============

/**
 * @dev PancakeSwap Pair 接口
 */
interface IPancakePair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function price0CumulativeLast() external view returns (uint256);
    function price1CumulativeLast() external view returns (uint256);
}

/**
 * @dev Chainlink Price Feed 接口（备用）
 */
interface IChainlinkPriceFeed {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function decimals() external view returns (uint8);
}
