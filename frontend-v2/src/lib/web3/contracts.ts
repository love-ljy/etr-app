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
    ETRToken: '0xC163C4DFE7e8bAd2E3d9db64BF5EEf944F4484c5',
    StakingPool: '0x3E08D67Ee44C7385EF57f2c1b0833f2eDe776789',
    CompoundPool: '0xcF1c5E6e94c16a0501eb0fa399D674826B3a4363',
    DividendPool: '0x77e670EE1D0B4461B7399cf86f8624373FEB6b84',
    ReferralSystem: '0x1f990C344d9f72344684F5cF2E4ed18a59F62609', // ReferralSystemV2
    PriceOracle: '0xBF73DB25F5f58d206f1eaE05492ccb5643C08A38',
    SlippageController: '0xF6b61E9a65607198Ababe08c071Ae9eEaEaBee0A',
    Router: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1', // PancakeSwap V2 Router Testnet
  },
} as const;

// 默认使用测试网
export const DEFAULT_CHAIN: keyof typeof CONTRACT_ADDRESSES = 'bscTestnet';

// ETR代币精度
export const ETR_DECIMALS = 18;

// USDT合约地址 (BSC主网)
export const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';

// USDT合约地址 (BSC测试网) - MockUSDT
export const USDT_ADDRESS_TESTNET = '0xEB4a0196124797a7580d2A260EBFF0bd845dc956';

// 获取当前链的合约地址
export const getContractAddresses = (chain: keyof typeof CONTRACT_ADDRESSES = DEFAULT_CHAIN) => {
  return CONTRACT_ADDRESSES[chain];
};

export default CONTRACT_ADDRESSES;
