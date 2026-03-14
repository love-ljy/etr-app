// StakingPool 事件处理器
import {
  Staked,
  Unstaked,
  RewardClaimed,
  AllRewardsClaimed,
  StakeRecordUpdated,
  AccountStatusChanged,
  YieldRateUpdated,
} from '../../generated/StakingPool/StakingPool';
import {
  User,
  StakeRecord,
  RewardClaim,
  YieldRateUpdate,
  SystemStats,
  DailyStats,
} from '../../generated/schema';
import { BigInt, Bytes, Address } from '@graphprotocol/graph-ts';

// 获取或创建用户
function getOrCreateUser(address: Address): User {
  let user = User.load(address.toHex());
  if (!user) {
    user = new User(address.toHex());
    user.address = address;
    user.totalStaked = BigInt.zero();
    user.totalClaimed = BigInt.zero();
    user.stakeCount = 0;
    user.totalCompoundDeposited = BigInt.zero();
    user.totalCompoundClaimed = BigInt.zero();
    user.totalCompoundTransferred = BigInt.zero();
    user.currentCompoundBalance = BigInt.zero();
    user.referralCount = 0;
    user.directCount = 0;
    user.indirectCount = 0;
    user.deepCount = 0;
    user.totalReferralRewards = BigInt.zero();
    user.totalDividendClaimed = BigInt.zero();
    user.currentDividendLevel = 0;
    user.createdAt = BigInt.zero();
    user.updatedAt = BigInt.zero();
    user.createdAt = BigInt.zero();
  }
  return user;
}

// 获取系统统计
function getOrCreateSystemStats(): SystemStats {
  let stats = SystemStats.load('SYSTEM');
  if (!stats) {
    stats = new SystemStats('SYSTEM');
    stats.totalStaked = BigInt.zero();
    stats.totalRewardsDistributed = BigInt.zero();
    stats.activeStakers = 0;
    stats.currentYieldRate = BigInt.zero();
    stats.totalCompoundPool = BigInt.zero();
    stats.totalDividendDistributed = BigInt.zero();
    stats.totalReferrals = 0;
    stats.totalReferralRewards = BigInt.zero();
    stats.updatedAt = BigInt.zero();
  }
  return stats;
}

// 获取日期字符串
function getDateString(timestamp: BigInt): string {
  let date = new Date(timestamp.toI64() * 1000);
  return date.toISOString().split('T')[0];
}

// 获取或创建每日统计
function getOrCreateDailyStats(date: string, timestamp: BigInt): DailyStats {
  let stats = DailyStats.load(date);
  if (!stats) {
    stats = new DailyStats(date);
    stats.date = date;
    stats.timestamp = timestamp;
    stats.newStakes = 0;
    stats.totalStakedAmount = BigInt.zero();
    stats.newCompoundDeposits = 0;
    stats.totalCompoundAmount = BigInt.zero();
    stats.newReferrals = 0;
    stats.totalReferralRewards = BigInt.zero();
    stats.rewardClaims = 0;
    stats.totalRewardAmount = BigInt.zero();
  }
  return stats;
}

// 处理质押事件
export function handleStaked(event: Staked): void {
  let user = getOrCreateUser(event.params.user);
  let stakeId = event.params.stakeId;
  let stakeRecordId = stakeId.toString();
  
  // 创建质押记录
  let stakeRecord = new StakeRecord(stakeRecordId);
  stakeRecord.stakeId = stakeId;
  stakeRecord.user = user.id;
  stakeRecord.amount = event.params.amount;
  stakeRecord.originalAmount = event.params.amount;
  stakeRecord.startTime = event.params.timestamp;
  stakeRecord.unlockTime = event.params.unlockTime;
  stakeRecord.status = 'ACTIVE';
  stakeRecord.totalClaimed = BigInt.zero();
  stakeRecord.createdAt = event.block.timestamp;
  stakeRecord.updatedAt = event.block.timestamp;
  stakeRecord.save();
  
  // 更新用户统计
  user.totalStaked = user.totalStaked.plus(event.params.amount);
  user.stakeCount += 1;
  user.updatedAt = event.block.timestamp;
  user.save();
  
  // 更新系统统计
  let systemStats = getOrCreateSystemStats();
  systemStats.totalStaked = systemStats.totalStaked.plus(event.params.amount);
  systemStats.activeStakers += 1;
  systemStats.updatedAt = event.block.timestamp;
  systemStats.save();
  
  // 更新每日统计
  let dateStr = getDateString(event.block.timestamp);
  let dailyStats = getOrCreateDailyStats(dateStr, event.block.timestamp);
  dailyStats.newStakes += 1;
  dailyStats.totalStakedAmount = dailyStats.totalStakedAmount.plus(event.params.amount);
  dailyStats.save();
}

// 处理解押事件
export function handleUnstaked(event: Unstaked): void {
  let stakeRecord = StakeRecord.load(event.params.stakeId.toString());
  if (stakeRecord) {
    stakeRecord.status = 'UNLOCKED';
    stakeRecord.updatedAt = event.block.timestamp;
    stakeRecord.save();
    
    // 更新用户统计
    let user = User.load(stakeRecord.user);
    if (user) {
      user.totalStaked = user.totalStaked.minus(event.params.amount);
      user.updatedAt = event.block.timestamp;
      user.save();
    }
  }
  
  // 更新系统统计
  let systemStats = getOrCreateSystemStats();
  systemStats.totalStaked = systemStats.totalStaked.minus(event.params.amount);
  systemStats.updatedAt = event.block.timestamp;
  systemStats.save();
}

// 处理收益领取事件
export function handleRewardClaimed(event: RewardClaimed): void {
  let user = getOrCreateUser(event.params.user);
  
  // 创建领取记录
  let claimId = event.transaction.hash.toHex() + '-' + event.logIndex.toString();
  let claim = new RewardClaim(claimId);
  claim.stakeRecord = event.params.stakeId.toString();
  claim.user = user.id;
  claim.amount = event.params.amount;
  claim.stakeId = event.params.stakeId;
  claim.timestamp = event.params.timestamp;
  claim.blockNumber = event.block.number;
  claim.txHash = event.transaction.hash;
  claim.save();
  
  // 更新质押记录
  let stakeRecord = StakeRecord.load(event.params.stakeId.toString());
  if (stakeRecord) {
    stakeRecord.totalClaimed = stakeRecord.totalClaimed.plus(event.params.amount);
    stakeRecord.updatedAt = event.block.timestamp;
    stakeRecord.save();
  }
  
  // 更新用户统计
  user.totalClaimed = user.totalClaimed.plus(event.params.amount);
  user.updatedAt = event.block.timestamp;
  user.save();
  
  // 更新系统统计
  let systemStats = getOrCreateSystemStats();
  systemStats.totalRewardsDistributed = systemStats.totalRewardsDistributed.plus(event.params.amount);
  systemStats.updatedAt = event.block.timestamp;
  systemStats.save();
  
  // 更新每日统计
  let dateStr = getDateString(event.block.timestamp);
  let dailyStats = getOrCreateDailyStats(dateStr, event.block.timestamp);
  dailyStats.rewardClaims += 1;
  dailyStats.totalRewardAmount = dailyStats.totalRewardAmount.plus(event.params.amount);
  dailyStats.save();
}

// 处理全部收益领取事件
export function handleAllRewardsClaimed(event: AllRewardsClaimed): void {
  let user = getOrCreateUser(event.params.user);
  user.totalClaimed = user.totalClaimed.plus(event.params.totalAmount);
  user.updatedAt = event.block.timestamp;
  user.save();
  
  // 更新系统统计
  let systemStats = getOrCreateSystemStats();
  systemStats.totalRewardsDistributed = systemStats.totalRewardsDistributed.plus(event.params.totalAmount);
  systemStats.updatedAt = event.block.timestamp;
  systemStats.save();
}

// 处理质押记录更新
export function handleStakeRecordUpdated(event: StakeRecordUpdated): void {
  let stakeRecord = StakeRecord.load(event.params.stakeId.toString());
  if (stakeRecord) {
    stakeRecord.amount = event.params.remainingPrincipal;
    stakeRecord.updatedAt = event.block.timestamp;
    stakeRecord.save();
  }
}

// 处理账户状态变更
export function handleAccountStatusChanged(event: AccountStatusChanged): void {
  let user = getOrCreateUser(event.params.user);
  user.updatedAt = event.block.timestamp;
  user.save();
}

// 处理收益率更新
export function handleYieldRateUpdated(event: YieldRateUpdated): void {
  let update = new YieldRateUpdate(event.block.number.toString() + '-' + event.logIndex.toString());
  update.oldRate = event.params.oldRate;
  update.newRate = event.params.newRate;
  update.timestamp = event.params.timestamp;
  update.save();
  
  // 更新系统统计
  let systemStats = getOrCreateSystemStats();
  systemStats.currentYieldRate = event.params.newRate;
  systemStats.updatedAt = event.block.timestamp;
  systemStats.save();
}
