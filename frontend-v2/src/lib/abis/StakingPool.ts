/**
 * StakingPool 合约 ABI - 修正版
 * 基于实际合约编译后的 ABI
 */
export const StakingPoolABI = [
  // ===== 质押相关 =====
  // 质押ETR (USDT模式 - 旧)
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'stake',
    outputs: [{ internalType: 'uint256', name: 'stakeId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // 质押ETR (直接质押ETR - V3新功能)
  {
    inputs: [
      { internalType: 'uint256', name: 'etrAmount', type: 'uint256' },
      { internalType: 'address', name: 'referrer', type: 'address' },
    ],
    name: 'stakeETR',
    outputs: [{ internalType: 'uint256', name: 'stakeId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // 批量质押ETR
  {
    inputs: [
      { internalType: 'uint256[]', name: 'etrAmounts', type: 'uint256[]' },
      { internalType: 'address', name: 'referrer', type: 'address' },
    ],
    name: 'stakeETRBatch',
    outputs: [{ internalType: 'uint256[]', name: 'stakeIds', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // 解押
  {
    inputs: [
      { internalType: 'uint256', name: 'stakeId', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'unstake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // 紧急解押
  {
    inputs: [{ internalType: 'uint256', name: 'stakeId', type: 'uint256' }],
    name: 'emergencyUnstake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // ===== 收益相关 =====
  // 领取单个质押收益
  {
    inputs: [{ internalType: 'uint256', name: 'stakeId', type: 'uint256' }],
    name: 'claimReward',
    outputs: [{ internalType: 'uint256', name: 'reward', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // 领取所有收益
  {
    inputs: [],
    name: 'claimAllRewards',
    outputs: [{ internalType: 'uint256', name: 'totalReward', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // 计算待领取收益
  {
    inputs: [{ internalType: 'uint256', name: 'stakeId', type: 'uint256' }],
    name: 'calculatePendingReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },

  // ===== 查询相关 =====
  // 获取单个质押详情
  {
    inputs: [{ internalType: 'uint256', name: 'stakeId', type: 'uint256' }],
    name: 'getStake',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'stakeId', type: 'uint256' },
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'uint256', name: 'principal', type: 'uint256' },
          { internalType: 'uint256', name: 'originalPrincipal', type: 'uint256' },
          { internalType: 'uint256', name: 'startTime', type: 'uint256' },
          { internalType: 'uint256', name: 'unlockTime', type: 'uint256' },
          { internalType: 'uint256', name: 'lastClaimTime', type: 'uint256' },
          { internalType: 'uint256', name: 'totalClaimed', type: 'uint256' },
          { internalType: 'uint256', name: 'dailyYieldRate', type: 'uint256' },
          { internalType: 'bool', name: 'active', type: 'bool' },
        ],
        internalType: 'struct StakingPool.StakeInfo',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // 获取用户所有质押
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserStakes',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'stakeId', type: 'uint256' },
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'uint256', name: 'principal', type: 'uint256' },
          { internalType: 'uint256', name: 'originalPrincipal', type: 'uint256' },
          { internalType: 'uint256', name: 'startTime', type: 'uint256' },
          { internalType: 'uint256', name: 'unlockTime', type: 'uint256' },
          { internalType: 'uint256', name: 'lastClaimTime', type: 'uint256' },
          { internalType: 'uint256', name: 'totalClaimed', type: 'uint256' },
          { internalType: 'uint256', name: 'dailyYieldRate', type: 'uint256' },
          { internalType: 'bool', name: 'active', type: 'bool' },
        ],
        internalType: 'struct StakingPool.StakeInfo[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // 获取用户账户信息
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserAccount',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'totalStaked', type: 'uint256' },
          { internalType: 'uint256', name: 'totalClaimed', type: 'uint256' },
          { internalType: 'bool', name: 'isValid', type: 'bool' },
          { internalType: 'uint256', name: 'lastValidityCheck', type: 'uint256' },
        ],
        internalType: 'struct StakingPool.UserAccount',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // 获取用户资产总值
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserPortfolioValue',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // 查询质押记录（通过mapping）
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'stakes',
    outputs: [
      { internalType: 'uint256', name: 'stakeId', type: 'uint256' },
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'uint256', name: 'principal', type: 'uint256' },
      { internalType: 'uint256', name: 'originalPrincipal', type: 'uint256' },
      { internalType: 'uint256', name: 'startTime', type: 'uint256' },
      { internalType: 'uint256', name: 'unlockTime', type: 'uint256' },
      { internalType: 'uint256', name: 'lastClaimTime', type: 'uint256' },
      { internalType: 'uint256', name: 'totalClaimed', type: 'uint256' },
      { internalType: 'uint256', name: 'dailyYieldRate', type: 'uint256' },
      { internalType: 'bool', name: 'active', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // 获取可解押金额
  {
    inputs: [{ internalType: 'uint256', name: 'stakeId', type: 'uint256' }],
    name: 'getUnstakableAmount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },

  // ===== 池子统计 =====
  // 获取池子统计
  {
    inputs: [],
    name: 'getPoolStats',
    outputs: [
      { internalType: 'uint256', name: '_totalStaked', type: 'uint256' },
      { internalType: 'uint256', name: '_totalRewardsDistributed', type: 'uint256' },
      { internalType: 'uint256', name: '_activeStakers', type: 'uint256' },
      { internalType: 'uint256', name: '_currentYieldRate', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // 当前收益率
  {
    inputs: [],
    name: 'currentYieldRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // 获取当前收益率
  {
    inputs: [],
    name: 'getCurrentYieldRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // 总质押量
  {
    inputs: [],
    name: 'totalStaked',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // 下一个质押ID
  {
    inputs: [],
    name: 'nextStakeId',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },

  // ===== 配置相关 =====
  // 获取配置
  {
    inputs: [],
    name: 'config',
    outputs: [
      { internalType: 'uint256', name: 'lockPeriod', type: 'uint256' },
      { internalType: 'uint256', name: 'dailyUnlockRate', type: 'uint256' },
      { internalType: 'uint256', name: 'minYieldRate', type: 'uint256' },
      { internalType: 'uint256', name: 'maxYieldRate', type: 'uint256' },
      { internalType: 'uint256', name: 'minStakeValueUSD', type: 'uint256' },
      { internalType: 'uint256', name: 'settlementInterval', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },

  // ===== 事件 =====
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'stakeId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    name: 'Staked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'stakeId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    name: 'Unstaked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'stakeId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    name: 'RewardClaimed',
    type: 'event',
  },
] as const;

export default StakingPoolABI;
