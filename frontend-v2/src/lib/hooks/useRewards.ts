'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  useAccount, 
  useWriteContract, 
  useReadContract, 
  useWaitForTransactionReceipt 
} from 'wagmi';
import { formatUnits } from 'viem';
import { StakingPoolABI, DividendPoolABI, ReferralSystemABI } from '@/lib/abis';
import { getContractAddresses } from '@/lib/web3/contracts';

const ADDRESSES = getContractAddresses();

export type RewardType = 'all' | 'staking' | 'referral' | 'dividend' | 'compound';

export interface RewardRecord {
  id: string;
  date: Date;
  type: RewardType;
  typeLabel: string;
  amount: string;
  amountUSD: string;
  description?: string;
}

export interface RewardStats {
  totalEarned: string;
  totalEarnedUSD: string;
  todayEarned: string;
  todayEarnedUSD: string;
  pendingRewards: string;
  pendingRewardsUSD: string;
  stakingRewards: string;
  stakingRewardsUSD: string;
  referralRewards: string;
  referralRewardsUSD: string;
  compoundRewards: string;
  compoundRewardsUSD: string;
}

export interface ReferralRewardDetail {
  direct: string;
  indirect: string;
  deep: string;
  total: string;
}

export interface UserDividendInfo {
  level: number;
  personalStake: string;
  smallZonePerformance: string;
  totalTeamPerformance: string;
  maxDirectPerformance: string;
  lastClaimTime: Date;
  totalDividendClaimed: string;
  isQualified: boolean;
}

export function useRewards() {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 读取质押待领取收益 - 从 useStaking 传入 stakeRecords 计算
  // 这里我们假设待领取收益是通过 stakeRecords 的 pendingReward 计算的

  // 读取推荐收益 - 从 ReferralSystem 合约读取
  const { data: referralRewardsData, refetch: refetchReferralRewards } = useReadContract({
    address: ADDRESSES.ReferralSystem as `0x${string}`,
    abi: ReferralSystemABI,
    functionName: 'getReferralStats',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && ADDRESSES.ReferralSystem !== '0x...',
    },
  });

  // 读取分红信息 - 从 DividendPool 合约读取
  const { data: userDividendInfoData, refetch: refetchUserDividendInfo } = useReadContract({
    address: ADDRESSES.DividendPool as `0x${string}`,
    abi: DividendPoolABI,
    functionName: 'getUserDividendInfo',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && ADDRESSES.DividendPool !== '0x...',
    },
  });

  // 读取池子状态
  const { data: poolStatusData, refetch: refetchPoolStatus } = useReadContract({
    address: ADDRESSES.DividendPool as `0x${string}`,
    abi: DividendPoolABI,
    functionName: 'getPoolStatus',
    query: {
      enabled: isConnected && ADDRESSES.DividendPool !== '0x...',
    },
  });

  // 领取收益合约写入
  const { writeContract: writeClaim, data: claimHash } = useWriteContract();
  const { isLoading: isClaimPending, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
    hash: claimHash,
  });

  // 领取分红合约写入
  const { writeContract: writeClaimDividend, data: claimDividendHash } = useWriteContract();
  const { isLoading: isClaimDividendPending, isSuccess: isClaimDividendSuccess } = useWaitForTransactionReceipt({
    hash: claimDividendHash,
  });

  // 格式化分红信息
  const userDividendInfo: UserDividendInfo | null = useMemo(() => {
    if (!userDividendInfoData) return null;
    const data = userDividendInfoData as unknown as {
      level: number;
      personalStake: bigint;
      smallZonePerformance: bigint;
      totalTeamPerformance: bigint;
      maxDirectPerformance: bigint;
      lastClaimTime: bigint;
      totalDividendClaimed: bigint;
      isQualified: boolean;
    };
    return {
      level: data.level,
      personalStake: formatUnits(data.personalStake, 18),
      smallZonePerformance: formatUnits(data.smallZonePerformance, 18),
      totalTeamPerformance: formatUnits(data.totalTeamPerformance, 18),
      maxDirectPerformance: formatUnits(data.maxDirectPerformance, 18),
      lastClaimTime: new Date(Number(data.lastClaimTime) * 1000),
      totalDividendClaimed: formatUnits(data.totalDividendClaimed, 18),
      isQualified: data.isQualified,
    };
  }, [userDividendInfoData]);

  // 计算推荐收益
  const referralRewards: ReferralRewardDetail = useMemo(() => {
    if (!referralRewardsData) {
      return { direct: '0', indirect: '0', deep: '0', total: '0' };
    }
    const data = referralRewardsData as unknown as {
      directRewards: bigint;
      indirectRewards: bigint;
      deepRewards: bigint;
      totalRewards: bigint;
    };
    return {
      direct: formatUnits(data.directRewards, 18),
      indirect: formatUnits(data.indirectRewards, 18),
      deep: formatUnits(data.deepRewards, 18),
      total: formatUnits(data.totalRewards, 18),
    };
  }, [referralRewardsData]);

  // 收益统计
  const rewardStats: RewardStats = useMemo(() => {
    const etrPrice = 0.25;
    const referralTotal = parseFloat(referralRewards.total);
    const dividendClaimed = parseFloat(userDividendInfo?.totalDividendClaimed || '0');
    const totalEarned = referralTotal + dividendClaimed;
    
    return {
      totalEarned: totalEarned.toFixed(4),
      totalEarnedUSD: `$${(totalEarned * etrPrice).toFixed(2)}`,
      todayEarned: '0', // 需要额外计算
      todayEarnedUSD: '$0.00',
      pendingRewards: '0',
      pendingRewardsUSD: '$0.00',
      stakingRewards: '0',
      stakingRewardsUSD: '$0.00',
      referralRewards: referralRewards.total,
      referralRewardsUSD: `$${(referralTotal * etrPrice).toFixed(2)}`,
      compoundRewards: '0',
      compoundRewardsUSD: '$0.00',
    };
  }, [referralRewards, userDividendInfo]);

  // 生成模拟收益明细数据 (TODO: 后续从事件日志读取真实数据)
  const generateMockRewards = useCallback((): RewardRecord[] => {
    const records: RewardRecord[] = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      records.push({
        id: `staking-${i}`,
        date,
        type: 'staking',
        typeLabel: '质押收益',
        amount: (15 + Math.random() * 2).toFixed(2),
        amountUSD: `$${(3.75 + Math.random() * 0.5).toFixed(2)}`,
      });
      
      if (i % 2 === 0) {
        records.push({
          id: `referral-${i}`,
          date,
          type: 'referral',
          typeLabel: '推荐收益',
          amount: (5 + Math.random() * 3).toFixed(2),
          amountUSD: `$${(1.25 + Math.random() * 0.75).toFixed(2)}`,
          description: '来自3位直推用户',
        });
      }
      
      if (i % 3 === 0) {
        records.push({
          id: `compound-${i}`,
          date,
          type: 'compound',
          typeLabel: '复利收益',
          amount: (2 + Math.random() * 1).toFixed(2),
          amountUSD: `$${(0.5 + Math.random() * 0.25).toFixed(2)}`,
        });
      }
    }
    
    return records;
  }, []);

  const [rewardRecords] = useState<RewardRecord[]>(generateMockRewards());

  // 筛选收益记录
  const filterRewards = useCallback((type: RewardType, days: number = 30): RewardRecord[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return rewardRecords
      .filter(record => {
        if (type === 'all') return true;
        return record.type === type;
      })
      .filter(record => record.date >= cutoffDate)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [rewardRecords]);

  // 领取质押收益
  const claimRewards = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      writeClaim({
        address: ADDRESSES.StakingPool as `0x${string}`,
        abi: StakingPoolABI,
        functionName: 'claimAllRewards',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '领取收益失败');
      setIsLoading(false);
    }
  }, [writeClaim]);

  // 领取分红
  const claimDividend = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      writeClaimDividend({
        address: ADDRESSES.DividendPool as `0x${string}`,
        abi: DividendPoolABI,
        functionName: 'claimDividend',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '领取分红失败');
      setIsLoading(false);
    }
  }, [writeClaimDividend]);

  // 刷新数据
  const refresh = useCallback(async () => {
    await refetchReferralRewards();
    await refetchUserDividendInfo();
    await refetchPoolStatus();
  }, [refetchReferralRewards, refetchUserDividendInfo, refetchPoolStatus]);

  // 监听交易成功
  useEffect(() => {
    if (isClaimSuccess || isClaimDividendSuccess) {
      refresh();
      setIsLoading(false);
    }
  }, [isClaimSuccess, isClaimDividendSuccess, refresh]);

  // 获取总待领取收益
  const totalPendingRewards = useCallback((): string => {
    const staking = parseFloat(rewardStats.pendingRewards);
    // 分红池的待领取收益需要从其他方式计算
    return staking.toFixed(4);
  }, [rewardStats.pendingRewards]);

  return {
    rewardStats,
    rewardRecords,
    referralRewards,
    userDividendInfo,
    pendingDividend: '0', // 暂无法直接获取
    totalPendingRewards: totalPendingRewards(),
    isLoading: isLoading || isClaimPending || isClaimDividendPending,
    error,
    claimRewards,
    claimDividend,
    filterRewards,
    refresh,
    isClaimSuccess,
    isClaimDividendSuccess,
  };
}

export default useRewards;
