// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDT
 * @dev 测试用的USDT合约，仅用于测试网
 * 任何人都可以免费铸造，方便测试
 */
contract MockUSDT is ERC20, Ownable {
    // 每次免费铸造的数量：10,000 USDT
    uint256 public constant FAUCET_AMOUNT = 10000 * 10**18;

    // 铸造冷却时间：1小时
    uint256 public constant COOLDOWN_TIME = 1 hours;

    // 记录每个地址上次铸造时间
    mapping(address => uint256) public lastMintTime;

    constructor() ERC20("Mock USDT", "USDT") {
        // 给部署者铸造初始供应量：1,000,000 USDT
        _mint(msg.sender, 1_000_000 * 10**18);
    }

    /**
     * @dev 任何人都可以免费领取测试USDT（有冷却时间限制）
     */
    function faucet() external {
        require(
            block.timestamp >= lastMintTime[msg.sender] + COOLDOWN_TIME,
            "MockUSDT: Please wait for cooldown"
        );

        lastMintTime[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    /**
     * @dev Owner可以给任何地址铸造USDT
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev 检查地址距离下次可领取的剩余时间
     */
    function timeUntilNextMint(address account) external view returns (uint256) {
        uint256 nextMintTime = lastMintTime[account] + COOLDOWN_TIME;
        if (block.timestamp >= nextMintTime) {
            return 0;
        }
        return nextMintTime - block.timestamp;
    }
}
