'use client';

import { useState, useCallback, useEffect } from 'react';
import { 
  useAccount, 
  useWriteContract, 
  useReadContract, 
  useWaitForTransactionReceipt 
} from 'wagmi';
import { formatUnits } from 'viem';
import { ReferralSystemABI } from '@/lib/abis';
import { getContractAddresses } from '@/lib/web3/contracts';

const ADDRESSES = getContractAddresses();

export interface ReferralStats {
  directCount: number;
  indirectCount: number;
  deepCount: number;
  totalCount: number;
  directRewards: string;
  indirectRewards: string;
  deepRewards: string;
  totalRewards: string;
}

export interface ReferralRecord {
  address: string;
  shortAddress: string;
  level: number;
  joinedAt: Date;
  totalStaked: string;
}

export interface ReferralLevel {
  level: number;
  count: number;
  rewardRate: string;
  totalRewards: string;
}

export function useReferral() {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 读取推荐统计
  const { data: referralStatsData, refetch: refetchStats } = useReadContract({
    address: ADDRESSES.ReferralSystem as `0x${string}`,
    abi: ReferralSystemABI,
    functionName: 'getReferralStats',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && !!ADDRESSES.ReferralSystem,
    },
  });

  // 读取推荐码
  const { data: referralCodeData } = useReadContract({
    address: ADDRESSES.ReferralSystem as `0x${string}`,
    abi: ReferralSystemABI,
    functionName: 'getReferralCode',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && !!ADDRESSES.ReferralSystem,
    },
  });

  // 读取推荐人
  const { data: referrerData } = useReadContract({
    address: ADDRESSES.ReferralSystem as `0x${string}`,
    abi: ReferralSystemABI,
    functionName: 'getReferrer',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && !!ADDRESSES.ReferralSystem,
    },
  });

  // 读取是否已绑定推荐人
  const { data: hasReferrerData, refetch: refetchHasReferrer } = useReadContract({
    address: ADDRESSES.ReferralSystem as `0x${string}`,
    abi: ReferralSystemABI,
    functionName: 'hasReferrer',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && !!ADDRESSES.ReferralSystem,
    },
  });

  // 读取推荐奖励比例
  const { data: directRateData } = useReadContract({
    address: ADDRESSES.ReferralSystem as `0x${string}`,
    abi: ReferralSystemABI,
    functionName: 'DIRECT_REWARD_RATE',
    query: {
      enabled: isConnected && !!ADDRESSES.ReferralSystem,
    },
  });

  const { data: indirectRateData } = useReadContract({
    address: ADDRESSES.ReferralSystem as `0x${string}`,
    abi: ReferralSystemABI,
    functionName: 'INDIRECT_REWARD_RATE',
    query: {
      enabled: isConnected && !!ADDRESSES.ReferralSystem,
    },
  });

  const { data: deepRateData } = useReadContract({
    address: ADDRESSES.ReferralSystem as `0x${string}`,
    abi: ReferralSystemABI,
    functionName: 'DEEP_REWARD_RATE',
    query: {
      enabled: isConnected && !!ADDRESSES.ReferralSystem,
    },
  });

  // 绑定推荐人合约写入
  const { writeContract: writeBindReferrer, data: bindHash } = useWriteContract();
  const { isLoading: isBindPending, isSuccess: isBindSuccess } = useWaitForTransactionReceipt({
    hash: bindHash,
  });

  // 格式化推荐统计
  const referralStats: ReferralStats = referralStatsData ? {
    directCount: Number((referralStatsData as { directCount: bigint }).directCount),
    indirectCount: Number((referralStatsData as { indirectCount: bigint }).indirectCount),
    deepCount: Number((referralStatsData as { deepCount: bigint }).deepCount),
    totalCount: Number((referralStatsData as { totalCount: bigint }).totalCount),
    directRewards: formatUnits((referralStatsData as { directRewards: bigint }).directRewards, 18),
    indirectRewards: formatUnits((referralStatsData as { indirectRewards: bigint }).indirectRewards, 18),
    deepRewards: formatUnits((referralStatsData as { deepRewards: bigint }).deepRewards, 18),
    totalRewards: formatUnits((referralStatsData as { totalRewards: bigint }).totalRewards, 18),
  } : {
    directCount: 0,
    indirectCount: 0,
    deepCount: 0,
    totalCount: 0,
    directRewards: '0',
    indirectRewards: '0',
    deepRewards: '0',
    totalRewards: '0',
  };

  // 推荐码
  const referralCode = referralCodeData as string || '';

  // 推荐链接
  const referralLink = address 
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://etr.finance'}/?ref=${referralCode || address.slice(0, 8)}`
    : '';

  // 推荐人地址
  const referrer = (referrerData as string) || '';

  // 是否已绑定推荐人
  const hasReferrer = hasReferrerData as boolean || false;

  // 推荐等级配置
  const referralLevels: ReferralLevel[] = [
    {
      level: 1,
      count: referralStats.directCount,
      rewardRate: directRateData ? `${Number(directRateData) / 100}%` : '10%',
      totalRewards: referralStats.directRewards,
    },
    {
      level: 2,
      count: referralStats.indirectCount,
      rewardRate: indirectRateData ? `${Number(indirectRateData) / 100}%` : '5%',
      totalRewards: referralStats.indirectRewards,
    },
    {
      level: 3,
      count: referralStats.deepCount,
      rewardRate: deepRateData ? `${Number(deepRateData) / 100}%` : '3%',
      totalRewards: referralStats.deepRewards,
    },
  ];

  // 生成模拟推荐记录
  const generateMockReferrals = useCallback((): ReferralRecord[] => {
    const records: ReferralRecord[] = [];
    const today = new Date();
    
    for (let i = 0; i < 10; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i * 2);
      
      const addr = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      
      records.push({
        address: addr,
        shortAddress: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
        level: (i % 3) + 1,
        joinedAt: date,
        totalStaked: (1000 + Math.random() * 9000).toFixed(2),
      });
    }
    
    return records;
  }, []);

  const [referralRecords] = useState<ReferralRecord[]>(generateMockReferrals());

  // 绑定推荐人
  const bindReferrer = useCallback(async (referrerAddress: string) => {
    try {
      setIsLoading(true);
      setError(null);

      writeBindReferrer({
        address: ADDRESSES.ReferralSystem as `0x${string}`,
        abi: ReferralSystemABI,
        functionName: 'bindReferrer',
        args: [referrerAddress as `0x${string}`],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '绑定推荐人失败');
      setIsLoading(false);
    }
  }, [writeBindReferrer]);

  // 复制推荐链接
  const copyReferralLink = useCallback(async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(referralLink);
      return true;
    } catch {
      return false;
    }
  }, [referralLink]);

  // 刷新数据
  const refresh = useCallback(async () => {
    await refetchStats();
    await refetchHasReferrer();
  }, [refetchStats, refetchHasReferrer]);

  // 监听交易成功
  useEffect(() => {
    if (isBindSuccess) {
      refresh();
      setIsLoading(false);
    }
  }, [isBindSuccess, refresh]);

  return {
    referralStats,
    referralCode,
    referralLink,
    referralLevels,
    referralRecords,
    referrer,
    hasReferrer,
    isLoading: isLoading || isBindPending,
    error,
    bindReferrer,
    copyReferralLink,
    refresh,
    isBindSuccess,
  };
}

export default useReferral;
