// ETR DApp V2 - 合约配置
// 最后更新：2026-03-31
// 权威来源：/etr-app/contracts/deployment-v2.json

export const CONTRACTS = {
  ETRToken: process.env.NEXT_PUBLIC_ETR_TOKEN_ADDRESS!,
  StakingPoolV2: process.env.NEXT_PUBLIC_STAKING_POOL_ADDRESS!,
  CompoundPoolV2: process.env.NEXT_PUBLIC_COMPOUND_POOL_ADDRESS!,
  ReferralSystem: process.env.NEXT_PUBLIC_REFERRAL_ADDRESS!,
  USDT: process.env.NEXT_PUBLIC_USDT_ADDRESS!,
  DividendPool: process.env.NEXT_PUBLIC_DIVIDEND_POOL_ADDRESS!,
  SlippageController: process.env.NEXT_PUBLIC_SLIPPAGE_CONTROLLER_ADDRESS!,
} as const;

export const NETWORK = {
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '97'),
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL!,
  blockExplorer: process.env.NEXT_PUBLIC_BLOCK_EXPLORER!,
} as const;

export const CONFIG = {
  ETR_PRICE_USD: parseFloat(process.env.NEXT_PUBLIC_ETR_PRICE_USD || '0.25'),
  LOCK_PERIOD_DAYS: parseInt(process.env.NEXT_PUBLIC_LOCK_PERIOD_DAYS || '50'),
  DAILY_YIELD_RATE: parseFloat(process.env.NEXT_PUBLIC_DAILY_YIELD_RATE || '0.45') / 100, // 0.45% -> 0.0045
  DAILY_UNLOCK_RATE: parseFloat(process.env.NEXT_PUBLIC_DAILY_UNLOCK_RATE || '2') / 100, // 2% -> 0.02
} as const;

// 类型导出
export type ContractName = keyof typeof CONTRACTS;

// 验证配置
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 检查必填的合约地址
  const requiredContracts: (keyof typeof CONTRACTS)[] = [
    'ETRToken',
    'StakingPoolV2',
    'CompoundPoolV2',
    'ReferralSystem',
    'USDT',
  ];
  
  for (const contract of requiredContracts) {
    if (!CONTRACTS[contract]) {
      errors.push(`Missing contract address: ${contract}`);
    } else if (!CONTRACTS[contract].startsWith('0x')) {
      errors.push(`Invalid contract address format: ${contract}`);
    }
  }
  
  // 检查网络配置
  if (NETWORK.chainId !== 97) {
    errors.push(`Expected ChainID 97 (BSC Testnet), got ${NETWORK.chainId}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// 开发环境打印配置
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('[ETR Config] Contract Addresses:', CONTRACTS);
  console.log('[ETR Config] Network:', NETWORK);
  console.log('[ETR Config] Config:', CONFIG);
}
