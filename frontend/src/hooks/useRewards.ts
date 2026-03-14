import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';
import { StakingPoolABI } from '../abis/StakingPool';
import { getContractAddresses } from '../utils/contracts';

const ADDRESSES = getContractAddresses();

// 收益类型
export type RewardType = 'all' | 'staking' | 'referral' | 'dividend';

// 收益记录
export interface RewardRecord {
  id: string;
  date: Date;
  type: 'staking' | 'referral' | 'dividend';
  typeLabel: string;
  amount: string;
  amountUSD: string;
  description?: string;
}

// 收益统计
export interface RewardStats {
  totalEarned: string;
  totalEarnedUSD: string;
  todayEarned: string;
  todayEarnedUSD: string;
  pendingRewards: string;
  pendingRewardsUSD: string;
  stakingPercent: number;
  referralPercent: number;
  dividendPercent: number;
}

/**
 * 收益相关 Hook
 */
export const useRewards = () => {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 读取待领取收益
  const { data: pendingRewardsData, refetch: refetchPendingRewards } = useReadContract({
    address: ADDRESSES.StakingPool as `0x${string}`,
    abi: StakingPoolABI,
    functionName: 'calculatePendingRewards',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // 读取推荐收益
  const { data: referralRewardsData } = useReadContract({
    address: ADDRESSES.StakingPool as `0x${string}`,
    abi: StakingPoolABI,
    functionName: 'getReferralRewards',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // 领取收益合约写入
  const { writeContract: writeClaim, data: claimHash } = useWriteContract();
  const { isLoading: isClaimPending, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
    hash: claimHash,
  });

  // 收益统计 (模拟数据，实际应从合约事件或后端获取)
  const rewardStats: RewardStats = {
    totalEarned: '2500.00',
    totalEarnedUSD: '$625.00',
    todayEarned: '22.50',
    todayEarnedUSD: '$5.63',
    pendingRewards: pendingRewardsData ? formatUnits(pendingRewardsData, 18) : '0',
    pendingRewardsUSD: pendingRewardsData 
      ? `$${(Number(formatUnits(pendingRewardsData, 18)) * 0.25).toFixed(2)}` 
      : '$0.00',
    stakingPercent: 70,
    referralPercent: 20,
    dividendPercent: 10,
  };

  // 模拟收益明细数据
  const generateMockRewards = useCallback((): RewardRecord[] => {
    const records: RewardRecord[] = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // 质押收益 (每天)
      records.push({
        id: `staking-${i}`,
        date,
        type: 'staking',
        typeLabel: '质押收益',
        amount: (15 + Math.random() * 2).toFixed(2),
        amountUSD: `$${(3.75 + Math.random() * 0.5).toFixed(2)}`,
      });
      
      // 推荐收益 (隔天)
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
      
      // 分红收益 (每3天)
      if (i % 3 === 0) {
        records.push({
          id: `dividend-${i}`,
          date,
          type: 'dividend',
          typeLabel: '分红收益',
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

  // 领取收益
  const claimRewards = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      writeClaim({
        address: ADDRESSES.StakingPool as `0x${string}`,
        abi: StakingPoolABI,
        functionName: 'claimRewards',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '领取收益失败');
      setIsLoading(false);
    }
  }, [writeClaim]);

  // 刷新数据
  const refresh = useCallback(async () => {
    await refetchPendingRewards();
  }, [refetchPendingRewards]);

  // 监听交易成功
  useEffect(() => {
    if (isClaimSuccess) {
      refresh();
      setIsLoading(false);
    }
  }, [isClaimSuccess, refresh]);

  // 获取推荐收益明细
  const referralRewards = referralRewardsData ? {
    direct: formatUnits(referralRewardsData[0], 18),
    indirect: formatUnits(referralRewardsData[1], 18),
    deep: formatUnits(referralRewardsData[2], 18),
  } : {
    direct: '0',
    indirect: '0',
    deep: '0',
  };

  return {
    // 数据
    rewardStats,
    rewardRecords,
    referralRewards,
    isLoading: isLoading || isClaimPending,
    error,
    
    // 方法
    claimRewards,
    filterRewards,
    refresh,
    
    // 状态
    isClaimSuccess,
  };
};

export default useRewards;
