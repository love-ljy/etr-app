/**
 * 合约地址配置
 */
export const CONTRACT_ADDRESSES = {
  // BSC 主网
  bsc: {
    ETRToken: '0x...', // 待部署
    StakingPool: '0x...', // 待部署
    CompoundPool: '0x...', // 待部署
    DividendPool: '0x...', // 待部署
    ReferralSystem: '0x...', // 待部署
    PriceOracle: '0x...', // 待部署
    Router: '0x10ED43C718714eb63d5aA57B78B54704E256024E', // PancakeSwap V2 Router
  },
  // BSC 测试网
  bscTestnet: {
    ETRToken: '0x...', // 待部署
    StakingPool: '0x...', // 待部署
    CompoundPool: '0x...', // 待部署
    DividendPool: '0x...', // 待部署
    ReferralSystem: '0x...', // 待部署
    PriceOracle: '0x...', // 待部署
    Router: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1', // PancakeSwap V2 Router Testnet
  },
} as const;

// 默认使用测试网
export const DEFAULT_CHAIN: keyof typeof CONTRACT_ADDRESSES = 'bscTestnet';

// ETR代币精度
export const ETR_DECIMALS = 18;

// USDT合约地址 (BSC主网)
export const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';

// USDT合约地址 (BSC测试网)
export const USDT_ADDRESS_TESTNET = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd';

// 获取当前链的合约地址
export const getContractAddresses = (chain: keyof typeof CONTRACT_ADDRESSES = DEFAULT_CHAIN) => {
  return CONTRACT_ADDRESSES[chain];
};

export default CONTRACT_ADDRESSES;
