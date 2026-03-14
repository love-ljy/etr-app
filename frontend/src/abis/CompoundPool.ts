/**
 * CompoundPool 复利池合约 ABI
 * 基于复利池功能需求文档
 */
export const CompoundPoolABI = [
  // ========== 核心函数 ==========
  
  // 提取复利到钱包
  {
    "inputs": [],
    "name": "claimCompound",
    "outputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // 划转到余额（复投）
  {
    "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "name": "transferToBalance",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // 收益入账（由 StakingPool 调用）
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "depositReward",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // ========== 查询函数 ==========
  
  // 查询用户复利余额
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getCompoundBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  
  // 查询复利池总额（本金+累计收益）
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getTotalCompound",
    "outputs": [
      { "internalType": "uint256", "name": "principal", "type": "uint256" },
      { "internalType": "uint256", "name": "totalEarned", "type": "uint256" },
      { "internalType": "uint256", "name": "total", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  
  // 计算当日复利
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "calculateDailyCompound",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  
  // 获取复利历史记录
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" },
      { "internalType": "uint256", "name": "offset", "type": "uint256" },
      { "internalType": "uint256", "name": "limit", "type": "uint256" }
    ],
    "name": "getCompoundHistory",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
          { "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "internalType": "uint256", "name": "cumulativeBalance", "type": "uint256" },
          { "internalType": "uint256", "name": "dailyRate", "type": "uint256" }
        ],
        "internalType": "struct CompoundPool.CompoundRecord[]",
        "name": "",
        "type": "tuple[]"
      },
      { "internalType": "uint256", "name": "total", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  
  // 获取今日复利收益
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getTodayEarnings",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  
  // 获取累计复利收益
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getTotalEarnings",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  
  // 获取当前日化收益率
  {
    "inputs": [],
    "name": "dailyRate",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  
  // 获取复利池统计信息
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getCompoundStats",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "balance", "type": "uint256" },
          { "internalType": "uint256", "name": "totalDeposited", "type": "uint256" },
          { "internalType": "uint256", "name": "totalClaimed", "type": "uint256" },
          { "internalType": "uint256", "name": "totalTransferred", "type": "uint256" },
          { "internalType": "uint256", "name": "totalEarned", "type": "uint256" },
          { "internalType": "uint256", "name": "todayEarned", "type": "uint256" },
          { "internalType": "uint256", "name": "dailyRate", "type": "uint256" }
        ],
        "internalType": "struct CompoundPool.CompoundStats",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  
  // ========== 常量 ==========
  
  // 最小日化收益率 (0.3%)
  {
    "inputs": [],
    "name": "MIN_DAILY_RATE",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  
  // 最大日化收益率 (0.6%)
  {
    "inputs": [],
    "name": "MAX_DAILY_RATE",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  
  // ========== 事件 ==========
  
  // 收益入账事件
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "newBalance", "type": "uint256" }
    ],
    "name": "RewardDeposited",
    "type": "event"
  },
  
  // 复利提取事件
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "CompoundClaimed",
    "type": "event"
  },
  
  // 划转至余额事件
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "TransferredToBalance",
    "type": "event"
  },
  
  // 复利计算事件
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "rate", "type": "uint256" }
    ],
    "name": "CompoundCalculated",
    "type": "event"
  }
] as const;

export default CompoundPoolABI;
