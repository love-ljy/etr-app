/**
 * 合约地址配置 - ETR DApp V3
 * 
 * 部署网络：BSC Testnet (ChainId: 97)
 * 部署时间：2026-03-30
 */
export const CONTRACT_ADDRESSES = {
  // BSC 主网
  bsc: {
    ETRToken: '0xaC6557be96B7f661Ab60438bc42194Cd50188Ab8',
    StakingPool: '0x3795ddAfD4E651eD67593490Bfc0037Ae2be34d8',
    CompoundPool: '0xE6F3eC98d05bBe327Fa046fBB6460cE5bDd93e8e',
    DividendPool: '0x77e670EE1D0B4461B7399cf86f8624373FEB6b84',
    ReferralSystem: '0xFC67f6AC14f131a92ee2F03D96292c9DeC224433',
    PriceOracle: '0x4343d520a0e6182d22ec0c0134508571e782a0AB',
    Router: '0x10ED43C718714eb63d5aA57B78B54704E256024E', // PancakeSwap V2 Router
  },
  // BSC 测试网 - 2026-03-30 新部署
  bscTestnet: {
    ETRToken: '0xB58d5fFc11E96af337D6C06b41F2DcD509aFaBcF',
    StakingPool: '0xeEfEb6C343c16410F5Dee200D71fC20DCE6c016e',
    CompoundPool: '0x39140fc1715c5E4aaCC711F2eAA5a00D0A3f3A57',
    ReferralSystem: '0x73bc5e6C363Af763150D7F6803Ed155EE891c97E',
    DividendPool: '0xB26F164ff351F1A3bF62dc6D35123b386Fc6Df4b',
    SlippageController: '0xA17B5F1598d08C1307345335f264eBE45b9977a9',
    PriceOracle: '0x4343d520a0e6182d22ec0c0134508571e782a0AB',
    Router: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1', // PancakeSwap V2 Router Testnet
  },
} as const;

// 默认使用测试网
export const DEFAULT_CHAIN: keyof typeof CONTRACT_ADDRESSES = 'bscTestnet';

// ETR 代币精度
export const ETR_DECIMALS = 18;

// USDT 合约地址 (BSC 主网)
export const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';

// USDT 合约地址 (BSC 测试网)
export const USDT_ADDRESS_TESTNET = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd';

// 获取当前链的合约地址
export const getContractAddresses = (chain: keyof typeof CONTRACT_ADDRESSES = DEFAULT_CHAIN) => {
  return CONTRACT_ADDRESSES[chain];
};

export default CONTRACT_ADDRESSES;
