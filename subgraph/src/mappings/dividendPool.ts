// DividendPool 事件处理器
import {
  DividendClaimed,
  DividendDistributed,
  DividendDeposited,
  UserLevelUpdated,
} from '../../generated/DividendPool/DividendPool';
import {
  User,
  DividendClaim,
  DividendDistribution,
  SystemStats,
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

// 处理分红领取事件
export function handleDividendClaimed(event: DividendClaimed): void {
  let user = getOrCreateUser(event.params.user);
  
  // 创建领取记录
  let claimId = event.transaction.hash.toHex() + '-' + event.logIndex.toString();
  let claim = new DividendClaim(claimId);
  claim.user = user.id;
  claim.amount = event.params.amount;
  claim.level = event.params.level;
  claim.timestamp = event.block.timestamp;
  claim.blockNumber = event.block.number;
  claim.txHash = event.transaction.hash;
  claim.save();
  
  // 更新用户统计
  user.totalDividendClaimed = user.totalDividendClaimed.plus(event.params.amount);
  user.updatedAt = event.block.timestamp;
  user.save();
  
  // 更新系统统计
  let systemStats = getOrCreateSystemStats();
  systemStats.totalDividendDistributed = systemStats.totalDividendDistributed.plus(event.params.amount);
  systemStats.updatedAt = event.block.timestamp;
  systemStats.save();
}

// 处理分红分发事件
export function handleDividendDistributed(event: DividendDistributed): void {
  // 创建分红分发记录
  let distId = event.block.number.toString();
  let dist = new DividendDistribution(distId);
  dist.timestamp = event.params.timestamp;
  dist.totalAmount = event.params.totalAmount;
  dist.v1Amount = event.params.v1Amount;
  dist.v2Amount = event.params.v2Amount;
  dist.v3Amount = event.params.v3Amount;
  dist.participantCount = 0; // 需要在其他地方统计
  dist.save();
}

// 处理分红存入事件
export function handleDividendDeposited(event: DividendDeposited): void {
  // 可以记录分红池的资金流入
}

// 处理用户等级更新事件
export function handleUserLevelUpdated(event: UserLevelUpdated): void {
  let user = getOrCreateUser(event.params.user);
  user.currentDividendLevel = event.params.newLevel;
  user.updatedAt = event.block.timestamp;
  user.save();
}
