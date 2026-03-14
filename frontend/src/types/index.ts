export interface StakeInfo {
  id: string;
  amount: string;
  startTime: number;
  unlockTime: number;
  unlockedAmount: string;
  lockedAmount: string;
  progress: number;
}

export interface UserStats {
  etrBalance: string;
  stakedAmount: string;
  pendingRewards: string;
  totalRewards: string;
  todayRewards: string;
  isValidAccount: boolean;
}

export interface RewardInfo {
  stakingRewards: string;
  referralRewards: string;
  dividendRewards: string;
  total: string;
}

export interface ReferralStats {
  directCount: number;
  indirectCount: number;
  thirdLevelCount: number;
  totalTeam: number;
  directRewards: string;
  indirectRewards: string;
  thirdLevelRewards: string;
}

export interface DividendLevel {
  level: 'V1' | 'V2' | 'V3' | null;
  directRequired: number;
  teamRequired: number;
  personalRequired: number;
  percentage: number;
  currentDirect: number;
  currentTeam: number;
  currentPersonal: string;
  isQualified: boolean;
}

export interface DividendHistory {
  date: string;
  level: string;
  amount: string;
  poolAmount: string;
  weightPercentage: number;
}

export interface RewardRecord {
  id: string;
  date: string;
  type: 'staking' | 'referral' | 'dividend';
  amount: string;
  source?: string;
  description: string;
}

export interface ReferralNode {
  address: string;
  level: number;
  isActive: boolean;
  children?: ReferralNode[];
}
