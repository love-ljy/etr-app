import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CompoundPoolABI } from '../abis/CompoundPool';
import { getContractAddresses } from '../utils/contracts';

const ADDRESSES = getContractAddresses();

// 复利记录接口
export interface CompoundRecord {
  id: string;
  timestamp: Date;
  amount: string;
  amountUSD: string;
  cumulativeBalance: string;
  cumulativeBalanceUSD: string;
  dailyRate: number;
}

// 复利统计接口
export interface CompoundStats {
  balance: string;
  balanceUSD: string;
  totalDeposited: string;
  totalDepositedUSD: string;
  totalClaimed: string;
  totalClaimedUSD: string;
  totalTransferred: string;
  totalTransferredUSD: string;
  totalEarned: string;
  totalEarnedUSD: string;
  todayEarned: string;
  todayEarnedUSD: string;
  dailyRate: number;
}

// 复利余额信息
export interface CompoundBalance {
  principal: string;
  principalUSD: string;
  totalEarned: string;
  totalEarnedUSD: string;
  total: string;
  totalUSD: string;
}

/**
 * 复利池相关 Hook
 */
export const useCompound = () => {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 读取复利统计信息
  const { data: compoundStatsData, refetch: refetchStats } = useReadContract({
    address: ADDRESSES.CompoundPool as `0x${string}`,
    abi: CompoundPoolABI,
    functionName: 'getCompoundStats',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // 读取复利池总额
  const { data: totalCompoundData, refetch: refetchTotal } = useReadContract({
    address: ADDRESSES.CompoundPool as `0x${string}`,
    abi: CompoundPoolABI,
    functionName: 'getTotalCompound',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // 读取日化收益率
  const { data: dailyRateData } = useReadContract({
    address: ADDRESSES.CompoundPool as `0x${string}`,
    abi: CompoundPoolABI,
    functionName: 'dailyRate',
    query: {
      enabled: isConnected,
    },
  });

  // 计算当日复利
  const { data: dailyCompoundData } = useReadContract({
    address: ADDRESSES.CompoundPool as `0x${string}`,
    abi: CompoundPoolABI,
    functionName: 'calculateDailyCompound',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // 提取复利合约写入
  const { writeContract: writeClaim, data: claimHash } = useWriteContract();
  const { isLoading: isClaimPending, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
    hash: claimHash,
  });

  // 划转至余额合约写入
  const { writeContract: writeTransfer, data: transferHash } = useWriteContract();
  const { isLoading: isTransferPending, isSuccess: isTransferSuccess } = useWaitForTransactionReceipt({
    hash: transferHash,
  });

  // 格式化复利统计
  const compoundStats: CompoundStats = {
    balance: compoundStatsData 
      ? formatUnits((compoundStatsData as unknown as { balance: bigint }).balance, 18) 
      : '0',
    balanceUSD: compoundStatsData 
      ? `$${(Number(formatUnits((compoundStatsData as unknown as { balance: bigint }).balance, 18)) * 0.25).toFixed(2)}` 
      : '$0.00',
    totalDeposited: compoundStatsData 
      ? formatUnits((compoundStatsData as unknown as { totalDeposited: bigint }).totalDeposited, 18) 
      : '0',
    totalDepositedUSD: compoundStatsData 
      ? `$${(Number(formatUnits((compoundStatsData as unknown as { totalDeposited: bigint }).totalDeposited, 18)) * 0.25).toFixed(2)}` 
      : '$0.00',
    totalClaimed: compoundStatsData 
      ? formatUnits((compoundStatsData as unknown as { totalClaimed: bigint }).totalClaimed, 18) 
      : '0',
    totalClaimedUSD: compoundStatsData 
      ? `$${(Number(formatUnits((compoundStatsData as unknown as { totalClaimed: bigint }).totalClaimed, 18)) * 0.25).toFixed(2)}` 
      : '$0.00',
    totalTransferred: compoundStatsData 
      ? formatUnits((compoundStatsData as unknown as { totalTransferred: bigint }).totalTransferred, 18) 
      : '0',
    totalTransferredUSD: compoundStatsData 
      ? `$${(Number(formatUnits((compoundStatsData as unknown as { totalTransferred: bigint }).totalTransferred, 18)) * 0.25).toFixed(2)}` 
      : '$0.00',
    totalEarned: compoundStatsData 
      ? formatUnits((compoundStatsData as unknown as { totalEarned: bigint }).totalEarned, 18) 
      : '0',
    totalEarnedUSD: compoundStatsData 
      ? `$${(Number(formatUnits((compoundStatsData as unknown as { totalEarned: bigint }).totalEarned, 18)) * 0.25).toFixed(2)}` 
      : '$0.00',
    todayEarned: compoundStatsData 
      ? formatUnits((compoundStatsData as unknown as { todayEarned: bigint }).todayEarned, 18) 
      : '0',
    todayEarnedUSD: compoundStatsData 
      ? `$${(Number(formatUnits((compoundStatsData as unknown as { todayEarned: bigint }).todayEarned, 18)) * 0.25).toFixed(2)}` 
      : '$0.00',
    dailyRate: dailyRateData ? Number(dailyRateData) / 100 : 0.45,
  };

  // 格式化复利余额
  const compoundBalance: CompoundBalance = totalCompoundData ? {
    principal: formatUnits((totalCompoundData as unknown as { principal: bigint }).principal, 18),
    principalUSD: `$${(Number(formatUnits((totalCompoundData as unknown as { principal: bigint }).principal, 18)) * 0.25).toFixed(2)}`,
    totalEarned: formatUnits((totalCompoundData as unknown as { totalEarned: bigint }).totalEarned, 18),
    totalEarnedUSD: `$${(Number(formatUnits((totalCompoundData as unknown as { totalEarned: bigint }).totalEarned, 18)) * 0.25).toFixed(2)}`,
    total: formatUnits((totalCompoundData as unknown as { total: bigint }).total, 18),
    totalUSD: `$${(Number(formatUnits((totalCompoundData as unknown as { total: bigint }).total, 18)) * 0.25).toFixed(2)}`,
  } : {
    principal: '0',
    principalUSD: '$0.00',
    totalEarned: '0',
    totalEarnedUSD: '$0.00',
    total: '0',
    totalUSD: '$0.00',
  };

  // 当日复利收益
  const todayCompound = dailyCompoundData 
    ? formatUnits(dailyCompoundData, 18) 
    : '0';

  // 生成模拟复利历史记录
  const generateMockHistory = useCallback((): CompoundRecord[] => {
    const records: CompoundRecord[] = [];
    const today = new Date();
    let cumulativeBalance = 100; // 初始本金
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // 模拟每日复利收益 (0.3% - 0.6%)
      const dailyRate = 0.3 + Math.random() * 0.3;
      const dailyEarning = cumulativeBalance * (dailyRate / 100);
      cumulativeBalance += dailyEarning;
      
      records.push({
        id: `compound-${i}`,
        timestamp: date,
        amount: dailyEarning.toFixed(4),
        amountUSD: `$${(dailyEarning * 0.25).toFixed(2)}`,
        cumulativeBalance: cumulativeBalance.toFixed(4),
        cumulativeBalanceUSD: `$${(cumulativeBalance * 0.25).toFixed(2)}`,
        dailyRate: Number(dailyRate.toFixed(2)),
      });
    }
    
    return records.reverse();
  }, []);

  // 复利历史记录
  const [compoundHistory] = useState<CompoundRecord[]>(generateMockHistory());

  // 查询复利历史
  const getCompoundHistory = useCallback((page: number = 1, pageSize: number = 10): {
    records: CompoundRecord[];
    total: number;
  } => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      records: compoundHistory.slice(start, end),
      total: compoundHistory.length,
    };
  }, [compoundHistory]);

  // 提取复利
  const claimCompound = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      writeClaim({
        address: ADDRESSES.CompoundPool as `0x${string}`,
        abi: CompoundPoolABI,
        functionName: 'claimCompound',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '提取复利失败');
      setIsLoading(false);
    }
  }, [writeClaim]);

  // 划转到余额
  const transferToBalance = useCallback(async (amount: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const amountBigInt = parseUnits(amount, 18);

      writeTransfer({
        address: ADDRESSES.CompoundPool as `0x${string}`,
        abi: CompoundPoolABI,
        functionName: 'transferToBalance',
        args: [amountBigInt],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '划转失败');
      setIsLoading(false);
    }
  }, [writeTransfer]);

  // 计算预期复利收益
  const calculateCompound = useCallback((principal: string, days: number): {
    totalAmount: string;
    totalEarnings: string;
    dailyBreakdown: Array<{ day: number; balance: string; earning: string }>;
  } => {
    const principalNum = parseFloat(principal);
    if (isNaN(principalNum) || principalNum <= 0 || days <= 0) {
      return {
        totalAmount: '0',
        totalEarnings: '0',
        dailyBreakdown: [],
      };
    }

    const rate = compoundStats.dailyRate / 100;
    let balance = principalNum;
    const dailyBreakdown = [];

    for (let i = 1; i <= days; i++) {
      const dailyEarning = balance * rate;
      balance += dailyEarning;
      dailyBreakdown.push({
        day: i,
        balance: balance.toFixed(4),
        earning: dailyEarning.toFixed(4),
      });
    }

    return {
      totalAmount: balance.toFixed(4),
      totalEarnings: (balance - principalNum).toFixed(4),
      dailyBreakdown,
    };
  }, [compoundStats.dailyRate]);

  // 刷新数据
  const refresh = useCallback(async () => {
    await refetchStats();
    await refetchTotal();
  }, [refetchStats, refetchTotal]);

  // 监听交易成功
  useEffect(() => {
    if (isClaimSuccess || isTransferSuccess) {
      refresh();
      setIsLoading(false);
    }
  }, [isClaimSuccess, isTransferSuccess, refresh]);

  return {
    // 数据
    compoundStats,
    compoundBalance,
    compoundHistory,
    todayCompound,
    isLoading: isLoading || isClaimPending || isTransferPending,
    error,
    
    // 方法
    claimCompound,
    transferToBalance,
    getCompoundHistory,
    calculateCompound,
    refresh,
    
    // 状态
    isClaimSuccess,
    isTransferSuccess,
  };
};

export default useCompound;
