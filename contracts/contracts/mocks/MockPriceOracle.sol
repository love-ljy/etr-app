// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockPriceOracle
 * @dev Mock PriceOracle for ReferralSystem testing
 */
contract MockPriceOracle {
    uint256 public etrPriceInUSD = 1e18; // $1.00
    
    function setETRPrice(uint256 price) external {
        etrPriceInUSD = price;
    }
    
    function getETRPriceInUSD() external view returns (uint256) {
        return etrPriceInUSD;
    }
}
