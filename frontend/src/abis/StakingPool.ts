/**
 * StakingPool 质押合约 ABI
 * 基于质押挖矿系统需求
 */
export const StakingPoolABI = [
  // 质押
  {
    "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "name": "stake",
    "outputs": [{ "internalType": "uint256", "name": "stakeId", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // 解押
  {
    "inputs": [
      { "internalType": "uint256", "name": "stakeId", "type": "uint256" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "unstake",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // 领取收益
  {
    "inputs": [],
    "name": "claimRewards",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // 查询用户质押信息
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getStakeInfo",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "totalStaked", "type": "uint256" },
          { "internalType": "uint256", "name": "totalUnlocked", "type": "uint256" },
          { "internalType": "uint256", "name": "totalLocked", "type": "uint256" },
          { "internalType": "uint256", "name": "pendingRewards", "type": "uint256" },
          { "internalType": "uint256", "name": "stakeCount", "type": "uint256" }
        ],
        "internalType": "struct StakingPool.StakeInfo",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // 查询质押记录
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" },
      { "internalType": "uint256", "name": "stakeId", "type": "uint256" }
    ],
    "name": "getStakeRecord",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "internalType": "uint256", "name": "stakeTime", "type": "uint256" },
          { "internalType": "uint256", "name": "unlockTime", "type": "uint256" },
          { "internalType": "uint256", "name": "unlockedAmount", "type": "uint256" },
          { "internalType": "uint256", "name": "lockedAmount", "type": "uint256" },
          { "internalType": "bool", "name": "active", "type": "bool" }
        ],
        "internalType": "struct StakingPool.StakeRecord",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // 获取用户所有质押记录ID
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getUserStakeIds",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  // 计算待领取收益
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "calculatePendingRewards",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  // 检查账户是否有效
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "isValidAccount",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  // 获取当前日化收益率
  {
    "inputs": [],
    "name": "dailyROI",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  // 常量
  {
    "inputs": [],
    "name": "LOCK_PERIOD",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DAILY_UNLOCK_RATE",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  // 推荐相关
  {
    "inputs": [{ "internalType": "address", "name": "referrer", "type": "address" }],
    "name": "bindReferrer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getReferrer",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getReferralRewards",
    "outputs": [
      { "internalType": "uint256", "name": "directRewards", "type": "uint256" },
      { "internalType": "uint256", "name": "indirectRewards", "type": "uint256" },
      { "internalType": "uint256", "name": "deepRewards", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // 事件
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "stakeId", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "Staked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "stakeId", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "Unstaked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "RewardsClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "referrer", "type": "address" }
    ],
    "name": "ReferrerBound",
    "type": "event"
  }
] as const;

export default StakingPoolABI;
