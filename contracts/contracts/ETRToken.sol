// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ETRToken
 * @dev 赤道ETR代币合约
 * - 总供应量：2亿枚
 * - 95%初始分配至黑洞地址
 * - 5%初始分配至LP池
 * - 支持转账手续费（买入3%，卖出动态3%-50%）
 */
contract ETRToken is ERC20, ERC20Pausable, ERC20Burnable, Ownable, ReentrancyGuard {
    
    // ============ 常量定义 ============
    uint256 public constant TOTAL_SUPPLY = 200_000_000 * 10**18;  // 2亿枚
    uint256 public constant BLACK_HOLE_PERCENT = 9500;            // 95% (基点)
    uint256 public constant LP_PERCENT = 500;                     // 5% (基点)
    uint256 public constant BPS_DENOMINATOR = 10000;              // 基点分母
    
    uint256 public constant BUY_FEE = 300;                        // 买入手续费 3%
    uint256 public constant BASE_SELL_FEE = 300;                  // 卖出基础手续费 3%
    uint256 public constant MAX_SELL_FEE = 5000;                  // 最大卖出手续费 50%
    
    // ============ 状态变量 ============
    address public blackHole;              // 黑洞地址
    address public lpPool;                 // 流动性池地址
    address public feeCollector;           // 手续费收集地址
    address public slippageController;     // 滑点控制器地址
    
    // 手续费配置
    struct FeeConfig {
        uint256 buyFee;                    // 买入手续费
        uint256 sellFee;                   // 卖出基础手续费
        uint256 transferFee;               // 普通转账手续费
        address feeCollector;              // 手续费收集地址
    }
    FeeConfig public feeConfig;
    
    // 白名单和黑名单
    mapping(address => bool) public whitelisted;
    mapping(address => bool) public blacklisted;
    
    // 是否已初始化分配
    bool public initialized;
    
    // ============ 事件定义 ============
    event TokensMinted(address indexed to, uint256 amount, string reason);
    event TokensBurned(address indexed from, uint256 amount, string reason);
    event FeeCharged(address indexed from, uint256 feeAmount, uint256 feeType);
    event FeeDistributed(uint256 dividendAmount, uint256 lpAmount, uint256 burnAmount);
    event BlackHoleAddressSet(address indexed blackHole);
    event LPPoolAddressSet(address indexed lpPool);
    event SlippageControllerSet(address indexed controller);
    event WhitelistUpdated(address indexed account, bool status);
    event BlacklistUpdated(address indexed account, bool status);
    
    // ============ 修饰器 ============
    modifier notBlacklisted(address account) {
        require(!blacklisted[account], "ETRToken: account is blacklisted");
        _;
    }
    
    modifier onlySlippageController() {
        require(msg.sender == slippageController, "ETRToken: only slippage controller");
        _;
    }
    
    // ============ 构造函数 ============
    constructor(
        address _blackHole,
        address _lpPool
    ) ERC20("Equator ETR", "ETR") {
        require(_blackHole != address(0), "ETRToken: blackHole is zero address");
        require(_lpPool != address(0), "ETRToken: lpPool is zero address");
        
        blackHole = _blackHole;
        lpPool = _lpPool;
        feeCollector = _lpPool; // 默认手续费收集到LP池
        
        // 初始化手续费配置
        feeConfig = FeeConfig({
            buyFee: BUY_FEE,
            sellFee: BASE_SELL_FEE,
            transferFee: 0,
            feeCollector: _lpPool
        });
        
        // 初始化代币分配
        _initializeDistribution();
        
        emit BlackHoleAddressSet(_blackHole);
        emit LPPoolAddressSet(_lpPool);
    }
    
    // ============ 核心函数 ============
    
    /**
     * @dev 初始化代币分配
     * - 95% 转黑洞地址
     * - 5% 转LP池
     */
    function _initializeDistribution() internal {
        require(!initialized, "ETRToken: already initialized");
        
        uint256 blackHoleAmount = TOTAL_SUPPLY * BLACK_HOLE_PERCENT / BPS_DENOMINATOR;
        uint256 lpAmount = TOTAL_SUPPLY * LP_PERCENT / BPS_DENOMINATOR;
        
        // 铸造代币给黑洞地址
        _mint(blackHole, blackHoleAmount);
        emit TokensMinted(blackHole, blackHoleAmount, "Black hole allocation");
        
        // 铸造代币给LP池
        _mint(lpPool, lpAmount);
        emit TokensMinted(lpPool, lpAmount, "LP pool allocation");
        
        initialized = true;
    }
    
    /**
     * @dev 重写_transfer函数，实现手续费机制
     */
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override notBlacklisted(from) notBlacklisted(to) {
        require(from != address(0), "ETRToken: transfer from zero address");
        require(to != address(0), "ETRToken: transfer to zero address");
        
        // 如果发送方或接收方在白名单中，不收取手续费
        if (whitelisted[from] || whitelisted[to]) {
            super._transfer(from, to, amount);
            return;
        }
        
        uint256 feeAmount = 0;
        uint256 feeType = 0;
        
        // 判断交易类型并计算手续费
        if (from == lpPool || isLiquidityPool(from)) {
            // 买入：从LP池转出
            feeAmount = amount * feeConfig.buyFee / BPS_DENOMINATOR;
            feeType = 1; // Buy
        } else if (to == lpPool || isLiquidityPool(to)) {
            // 卖出：转入LP池
            // 卖出手续费由SlippageController动态计算
            feeAmount = _getSellFee(amount);
            feeType = 2; // Sell
        } else {
            // 普通转账
            feeAmount = amount * feeConfig.transferFee / BPS_DENOMINATOR;
            feeType = 3; // Transfer
        }
        
        // 转账手续费到收集地址
        if (feeAmount > 0 && feeConfig.feeCollector != address(0)) {
            super._transfer(from, feeConfig.feeCollector, feeAmount);
            emit FeeCharged(from, feeAmount, feeType);
        }
        
        // 转账剩余金额到接收方
        uint256 transferAmount = amount - feeAmount;
        super._transfer(from, to, transferAmount);
    }
    
    /**
     * @dev 获取卖出手续费（可由SlippageController动态设置）
     */
    function _getSellFee(uint256 amount) internal view returns (uint256) {
        // 基础卖出手续费
        uint256 baseFee = amount * feeConfig.sellFee / BPS_DENOMINATOR;
        return baseFee;
    }
    
    /**
     * @dev 检查地址是否为流动性池（可重写）
     */
    function isLiquidityPool(address account) public view returns (bool) {
        // 基础实现：只检查是否是LP池地址
        // 实际部署时可以通过SlippageController扩展
        return account == lpPool;
    }
    
    // ============ 管理员函数 ============
    
    /**
     * @dev 设置滑点控制器
     */
    function setSlippageController(address _controller) external onlyOwner {
        require(_controller != address(0), "ETRToken: zero address");
        slippageController = _controller;
        emit SlippageControllerSet(_controller);
    }
    
    /**
     * @dev 设置手续费收集地址
     */
    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "ETRToken: zero address");
        feeConfig.feeCollector = _feeCollector;
        emit LPPoolAddressSet(_feeCollector);
    }
    
    /**
     * @dev 设置卖出手续费（仅SlippageController可调用）
     */
    function setSellFee(uint256 _sellFee) external onlySlippageController {
        require(_sellFee <= MAX_SELL_FEE, "ETRToken: sell fee too high");
        feeConfig.sellFee = _sellFee;
    }
    
    /**
     * @dev 更新白名单
     */
    function setWhitelist(address account, bool status) external onlyOwner {
        whitelisted[account] = status;
        emit WhitelistUpdated(account, status);
    }
    
    /**
     * @dev 更新黑名单
     */
    function setBlacklist(address account, bool status) external onlyOwner {
        blacklisted[account] = status;
        emit BlacklistUpdated(account, status);
    }
    
    /**
     * @dev 批量转账（Gas优化）
     */
    function batchTransfer(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external returns (bool) {
        require(recipients.length == amounts.length, "ETRToken: length mismatch");
        require(recipients.length <= 100, "ETRToken: batch too large");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _transfer(msg.sender, recipients[i], amounts[i]);
        }
        return true;
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
        require(to != address(0), "ETRToken: zero address");
        _transfer(address(this), to, amount);
    }
    
    // ============ 查询函数 ============
    
    /**
     * @dev 获取代币总供应量（固定2亿）
     */
    function getTotalSupply() external pure returns (uint256) {
        return TOTAL_SUPPLY;
    }
    
    /**
     * @dev 获取当前手续费配置
     */
    function getFeeConfig() external view returns (FeeConfig memory) {
        return feeConfig;
    }
    
    /**
     * @dev 检查地址是否为合约
     */
    function isContract(address account) external view returns (bool) {
        return account.code.length > 0;
    }
    
    // ============ 重写函数 ============
    
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Pausable) {
        super._beforeTokenTransfer(from, to, amount);
    }
    
    /**
     * @dev 拒绝直接接收ETH
     */
    receive() external payable {
        revert("ETRToken: does not accept ETH");
    }
    
    /**
     * @dev 拒绝直接调用fallback
     */
    fallback() external payable {
        revert("ETRToken: does not accept ETH");
    }
}
