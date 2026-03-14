// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockStakingPool
 * @dev Mock StakingPool for ReferralSystem testing
 */
contract MockStakingPool {
    mapping(address => bool) public validAccounts;
    mapping(address => uint256) public portfolioValues;
    
    function setValidAccount(address user, bool valid) external {
        validAccounts[user] = valid;
    }
    
    function setPortfolioValue(address user, uint256 value) external {
        portfolioValues[user] = value;
    }
    
    function isValidAccount(address user) external view returns (bool) {
        return validAccounts[user];
    }
    
    function getUserPortfolioValue(address user) external view returns (uint256) {
        return portfolioValues[user];
    }
    
    function getUserStakes(address user) external pure returns (
        StakeRecord[] memory
    ) {
        // 返回空数组
        return new StakeRecord[](0);
    }
}

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
