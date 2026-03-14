// CompoundPool 事件处理器
import {
  RewardDeposited,
  CompoundClaimed,
  CompoundTransferredToBalance,
  CompoundCalculated,
  YieldRateUpdated,
} from '../../generated/CompoundPool/CompoundPool';
import {
  User,
  CompoundRecord,
  CompoundStats,
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

// 获取或创建复利统计
function getOrCreateCompoundStats(user: User): CompoundStats {
  let stats = CompoundStats.load(user.id);
  if (!stats) {
    stats = new CompoundStats(user.id);
    stats.user = user.id;
    stats.totalDeposited = BigInt.zero();
    stats.totalClaimed = BigInt.zero();
    stats.totalTransferred = BigInt.zero();
    stats.currentBalance = BigInt.zero();
    stats.lastUpdated = BigInt.zero();
  }
  return stats;
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

// 处理收益存入事件（收益自动转入复利池）
export function handleRewardDeposited(event: RewardDeposited): void {
  let user = getOrCreateUser(event.params.user);
  
  // 创建复利记录
  let recordId = event.transaction.hash.toHex() + '-' + event.logIndex.toString();
  let record = new CompoundRecord(recordId);
  record.user = user.id;
  record.type = 'DEPOSIT';
  record.amount = event.params.amount;
  record.newBalance = event.params.newBalance;
  record.timestamp = event.params.timestamp;
  record.blockNumber = event.block.number;
  record.txHash = event.transaction.hash;
  record.save();
  
  // 更新用户统计
  user.totalCompoundDeposited = user.totalCompoundDeposited.plus(event.params.amount);
  user.currentCompoundBalance = event.params.newBalance;
  user.updatedAt = event.block.timestamp;
  user.save();
  
  // 更新复利统计
  let compoundStats = getOrCreateCompoundStats(user);
  compoundStats.totalDeposited = compoundStats.totalDeposited.plus(event.params.amount);
  compoundStats.currentBalance = event.params.newBalance;
  compoundStats.lastUpdated = event.block.timestamp;
  compoundStats.save();
  
  // 更新系统统计
  let systemStats = getOrCreateSystemStats();
  systemStats.totalCompoundPool = systemStats.totalCompoundPool.plus(event.params.amount);
  systemStats.updatedAt = event.block.timestamp;
  systemStats.save();
  
  // 更新每日统计
  let dateStr = getDateString(event.block.timestamp);
  let dailyStats = getOrCreateDailyStats(dateStr, event.block.timestamp);
  dailyStats.newCompoundDeposits += 1;
  dailyStats.totalCompoundAmount = dailyStats.totalCompoundAmount.plus(event.params.amount);
  dailyStats.save();
}

// 处理复利提取事件
export function handleCompoundClaimed(event: CompoundClaimed): void {
  let user = getOrCreateUser(event.params.user);
  
  // 创建复利记录
  let recordId = event.transaction.hash.toHex() + '-' + event.logIndex.toString();
  let record = new CompoundRecord(recordId);
  record.user = user.id;
  record.type = 'CLAIM';
  record.amount = event.params.amount;
  record.newBalance = BigInt.zero(); // 提取后余额
  record.timestamp = event.params.timestamp;
  record.blockNumber = event.block.number;
  record.txHash = event.transaction.hash;
  record.save();
  
  // 更新用户统计
  user.totalCompoundClaimed = user.totalCompoundClaimed.plus(event.params.amount);
  user.currentCompoundBalance = BigInt.zero();
  user.updatedAt = event.block.timestamp;
  user.save();
  
  // 更新复利统计
  let compoundStats = getOrCreateCompoundStats(user);
  compoundStats.totalClaimed = compoundStats.totalClaimed.plus(event.params.amount);
  compoundStats.currentBalance = BigInt.zero();
  compoundStats.lastUpdated = event.block.timestamp;
  compoundStats.save();
  
  // 更新系统统计
  let systemStats = getOrCreateSystemStats();
  systemStats.totalCompoundPool = systemStats.totalCompoundPool.minus(event.params.amount);
  systemStats.updatedAt = event.block.timestamp;
  systemStats.save();
}

// 处理复利划转事件
export function handleCompoundTransferred(event: CompoundTransferredToBalance): void {
  let user = getOrCreateUser(event.params.user);
  
  // 创建复利记录
  let recordId = event.transaction.hash.toHex() + '-' + event.logIndex.toString();
  let record = new CompoundRecord(recordId);
  record.user = user.id;
  record.type = 'TRANSFER';
  record.amount = event.params.amount;
  record.newBalance = BigInt.zero(); // 划转后余额
  record.timestamp = event.params.timestamp;
  record.blockNumber = event.block.number;
  record.txHash = event.transaction.hash;
  record.save();
  
  // 更新用户统计
  user.totalCompoundTransferred = user.totalCompoundTransferred.plus(event.params.amount);
  user.currentCompoundBalance = BigInt.zero();
  user.updatedAt = event.block.timestamp;
  user.save();
  
  // 更新复利统计
  let compoundStats = getOrCreateCompoundStats(user);
  compoundStats.totalTransferred = compoundStats.totalTransferred.plus(event.params.amount);
  compoundStats.currentBalance = BigInt.zero();
  compoundStats.lastUpdated = event.block.timestamp;
  compoundStats.save();
  
  // 更新系统统计
  let systemStats = getOrCreateSystemStats();
  systemStats.totalCompoundPool = systemStats.totalCompoundPool.minus(event.params.amount);
  systemStats.updatedAt = event.block.timestamp;
  systemStats.save();
}

// 处理每日复利计算事件
export function handleCompoundCalculated(event: CompoundCalculated): void {
  let user = getOrCreateUser(event.params.user);
  
  // 创建复利记录
  let recordId = event.transaction.hash.toHex() + '-' + event.logIndex.toString();
  let record = new CompoundRecord(recordId);
  record.user = user.id;
  record.type = 'CALCULATED';
  record.amount = event.params.compoundAmount;
  record.newBalance = event.params.newBalance;
  record.timestamp = event.params.timestamp;
  record.blockNumber = event.block.number;
  record.txHash = event.transaction.hash;
  record.save();
  
  // 更新用户统计
  user.currentCompoundBalance = event.params.newBalance;
  user.updatedAt = event.block.timestamp;
  user.save();
  
  // 更新复利统计
  let compoundStats = getOrCreateCompoundStats(user);
  compoundStats.currentBalance = event.params.newBalance;
  compoundStats.lastUpdated = event.block.timestamp;
  compoundStats.save();
}

// 处理收益率更新
export function handleCompoundYieldRateUpdated(event: YieldRateUpdated): void {
  // 可以在这里记录复利池的收益率历史
}
