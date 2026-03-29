// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockReferralSystem
 * @dev 测试用推荐系统 Mock
 */
contract MockReferralSystem {
    mapping(address => address) public referrers;
    
    function bindReferrer(address user, address referrer) external {
        if (referrers[user] == address(0)) {
            referrers[user] = referrer;
        }
    }
    
    function getReferrer(address user) external view returns (address) {
        return referrers[user];
    }
}