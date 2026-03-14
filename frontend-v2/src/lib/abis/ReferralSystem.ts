/**
 * ReferralSystemV2 推荐系统合约 ABI
 */
export const ReferralSystemABI = [
  // 绑定推荐人
  {
    inputs: [{ internalType: 'address', name: 'referrer', type: 'address' }],
    name: 'bindReferrer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // 查询用户的推荐人
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getReferrer',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  // 查询用户推荐统计
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getReferralStats',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'directCount', type: 'uint256' },
          { internalType: 'uint256', name: 'indirectCount', type: 'uint256' },
          { internalType: 'uint256', name: 'deepCount', type: 'uint256' },
          { internalType: 'uint256', name: 'totalCount', type: 'uint256' },
          { internalType: 'uint256', name: 'directRewards', type: 'uint256' },
          { internalType: 'uint256', name: 'indirectRewards', type: 'uint256' },
          { internalType: 'uint256', name: 'deepRewards', type: 'uint256' },
          { internalType: 'uint256', name: 'totalRewards', type: 'uint256' },
        ],
        internalType: 'struct ReferralSystemV2.ReferralStats',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // 查询推荐关系层级
  {
    inputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'uint256', name: 'level', type: 'uint256' },
    ],
    name: 'getReferralsByLevel',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  // 获取推荐链接
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getReferralLink',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  // 查询推荐码
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getReferralCode',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  // 通过推荐码查询地址
  {
    inputs: [{ internalType: 'string', name: 'code', type: 'string' }],
    name: 'getAddressByCode',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  // 查询是否已绑定推荐人
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'hasReferrer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // 常量 - 推荐奖励比例
  {
    inputs: [],
    name: 'DIRECT_REWARD_RATE',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'INDIRECT_REWARD_RATE',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'DEEP_REWARD_RATE',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // 事件
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: true, internalType: 'address', name: 'referrer', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    name: 'ReferrerBound',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'referrer', type: 'address' },
      { indexed: true, internalType: 'address', name: 'referee', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'level', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'reward', type: 'uint256' },
    ],
    name: 'ReferralReward',
    type: 'event',
  },
] as const;

export default ReferralSystemABI;
