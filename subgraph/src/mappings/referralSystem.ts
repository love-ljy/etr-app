// ReferralSystemV2 事件处理器
import {
  ReferralBound,
  ReferralRewardDistributed,
  ReferralStatsUpdated,
  LineRewardCalculated,
} from '../../generated/ReferralSystemV2/ReferralSystemV2';
import {
  User,
  ReferrerBinding,
  ReferralRecord,
  ReferralStatsUpdate,
  SystemStats,
  DailyStats,
} from '../../generated/schema';
import { BigInt, Address } from '@graphprotocol/graph-ts';

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

// 处理推荐绑定事件
export function handleReferralBound(event: ReferralBound): void {
  let user = getOrCreateUser(event.params.user);
  let referrer = getOrCreateUser(event.params.referrer);
  
  // 创建绑定记录
  let binding = new ReferrerBinding(user.id);
  binding.user = user.id;
  binding.referrer = referrer.id;
  binding.timestamp = event.params.timestamp;
  binding.blockNumber = event.block.number;
  binding.txHash = event.transaction.hash;
  binding.save();
  
  // 更新推荐人统计
  referrer.referralCount += 1;
  referrer.updatedAt = event.block.timestamp;
  referrer.save();
  
  // 更新用户推荐关系
  user.referrer = binding.id;
  user.updatedAt = event.block.timestamp;
  user.save();
  
  // 更新系统统计
  let systemStats = getOrCreateSystemStats();
  systemStats.totalReferrals += 1;
  systemStats.updatedAt = event.block.timestamp;
  systemStats.save();
  
  // 更新每日统计
  let dateStr = getDateString(event.block.timestamp);
  let dailyStats = getOrCreateDailyStats(dateStr, event.block.timestamp);
  dailyStats.newReferrals += 1;
  dailyStats.save();
}

// 处理推荐奖励分发事件
export function handleReferralRewardDistributed(event: ReferralRewardDistributed): void {
  let referrer = getOrCreateUser(event.params.referrer);
  let referee = getOrCreateUser(event.params.staker);
  
  // 创建推荐记录
  let recordId = event.transaction.hash.toHex() + '-' + event.logIndex.toString();
  let record = new ReferralRecord(recordId);
  record.referrer = referrer.id;
  record.referee = referee.id;
  record.generation = event.params.generation.toI32();
  record.rewardAmount = event.params.rewardAmount;
  record.burnAmount = event.params.burnAmount;
  record.timestamp = event.block.timestamp;
  record.blockNumber = event.block.number;
  record.txHash = event.transaction.hash;
  record.save();
  
  // 更新推荐人统计
  referrer.totalReferralRewards = referrer.totalReferralRewards.plus(event.params.rewardAmount);
  
  // 根据层级更新计数
  if (event.params.generation.equals(BigInt.fromI32(1))) {
    referrer.directCount += 1;
  } else if (event.params.generation.equals(BigInt.fromI32(2))) {
    referrer.indirectCount += 1;
  } else if (event.params.generation.equals(BigInt.fromI32(3))) {
    referrer.deepCount += 1;
  }
  
  referrer.updatedAt = event.block.timestamp;
  referrer.save();
  
  // 更新系统统计
  let systemStats = getOrCreateSystemStats();
  systemStats.totalReferralRewards = systemStats.totalReferralRewards.plus(event.params.rewardAmount);
  systemStats.updatedAt = event.block.timestamp;
  systemStats.save();
  
  // 更新每日统计
  let dateStr = getDateString(event.block.timestamp);
  let dailyStats = getOrCreateDailyStats(dateStr, event.block.timestamp);
  dailyStats.totalReferralRewards = dailyStats.totalReferralRewards.plus(event.params.rewardAmount);
  dailyStats.save();
}

// 处理推荐统计更新事件
export function handleReferralStatsUpdated(event: ReferralStatsUpdated): void {
  let user = getOrCreateUser(event.params.referrer);
  
  // 更新用户统计
  user.directCount = event.params.directCount.toI32();
  user.indirectCount = event.params.secondGenCount.toI32();
  user.deepCount = event.params.thirdGenCount.toI32();
  user.updatedAt = event.block.timestamp;
  user.save();
  
  // 创建统计更新记录
  let updateId = event.transaction.hash.toHex() + '-' + event.logIndex.toString();
  let update = new ReferralStatsUpdate(updateId);
  update.user = user.id;
  update.directCount = event.params.directCount;
  update.secondGenCount = event.params.secondGenCount;
  update.thirdGenCount = event.params.thirdGenCount;
  update.timestamp = event.block.timestamp;
  update.blockNumber = event.block.number;
  update.save();
}

// 处理线路奖励计算事件
export function handleLineRewardCalculated(event: LineRewardCalculated): void {
  // 可以记录线路奖励的详细分布
  let referrer = getOrCreateUser(event.params.referrer);
  referrer.updatedAt = event.block.timestamp;
  referrer.save();
}
