'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  useAccount, 
  useWriteContract, 
  useReadContract, 
  useWaitForTransactionReceipt 
} from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CompoundPoolABI } from '@/lib/abis';
import { getContractAddresses } from '@/lib/web3/contracts';

const ADDRESSES = getContractAddresses();

export interface CompoundRecord {
  id: string;
  timestamp: Date;
  amount: string;
  amountUSD: string;
  cumulativeBalance: string;
  dailyRate: number;
}

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

export interface CompoundBalance {
  principal: string;
  principalUSD: string;
  totalEarned: string;
  totalEarnedUSD: string;
  total: string;
  totalUSD: string;
}

export function useCompound() {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 读取复利统计信息 - 使用 getCompoundInfo
  const { data: compoundInfoData, refetch: refetchInfo } = useReadContract({
    address: ADDRESSES.CompoundPool as `0x${string}`,
    abi: CompoundPoolABI,
    functionName: 'getCompoundInfo',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && ADDRESSES.CompoundPool !== '0x...',
    },
  });

  // 读取复利池余额 - 使用 getCompoundBalance
  const { data: compoundBalanceData, refetch: refetchBalance } = useReadContract({
    address: ADDRESSES.CompoundPool as `0x${string}`,
    abi: CompoundPoolABI,
    functionName: 'getCompoundBalance',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && ADDRESSES.CompoundPool !== '0x...',
    },
  });

  // 读取用户累计存入
  const { data: totalDepositedData } = useReadContract({
    address: ADDRESSES.CompoundPool as `0x${string}`,
    abi: CompoundPoolABI,
    functionName: 'totalDeposited',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && ADDRESSES.CompoundPool !== '0x...',
    },
  });

  // 读取用户累计提取
  const { data: totalClaimedData } = useReadContract({
    address: ADDRESSES.CompoundPool as `0x${string}`,
    abi: CompoundPoolABI,
    functionName: 'totalClaimed',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && ADDRESSES.CompoundPool !== '0x...',
    },
  });

  // 读取用户累计划转
  const { data: totalTransferredData } = useReadContract({
    address: ADDRESSES.CompoundPool as `0x${string}`,
    abi: CompoundPoolABI,
    functionName: 'totalTransferred',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && ADDRESSES.CompoundPool !== '0x...',
    },
  });

  // 读取日化收益率
  const { data: dailyRateData } = useReadContract({
    address: ADDRESSES.CompoundPool as `0x${string}`,
    abi: CompoundPoolABI,
    functionName: 'currentYieldRate',
    query: {
      enabled: isConnected && ADDRESSES.CompoundPool !== '0x...',
    },
  });

  // 计算当日复利
  const { data: dailyCompoundData } = useReadContract({
    address: ADDRESSES.CompoundPool as `0x${string}`,
    abi: CompoundPoolABI,
    functionName: 'calculateDailyCompound',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && ADDRESSES.CompoundPool !== '0x...',
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
  // getCompoundInfo 返回: [balance, totalDepositedAmount, totalClaimedAmount, totalTransferredAmount, lastCompound, estimatedDaily]
  const compoundStats: CompoundStats = useCallback(() => {
    if (!compoundInfoData) {
      return {
        balance: '0',
        balanceUSD: '$0.00',
        totalDeposited: '0',
        totalDepositedUSD: '$0.00',
        totalClaimed: '0',
        totalClaimedUSD: '$0.00',
        totalTransferred: '0',
        totalTransferredUSD: '$0.00',
        totalEarned: '0',
        totalEarnedUSD: '$0.00',
        todayEarned: '0',
        todayEarnedUSD: '$0.00',
        dailyRate: dailyRateData ? Number(dailyRateData) / 100 : 0.45,
      };
    }
    
    const data = compoundInfoData as unknown as [bigint, bigint, bigint, bigint, bigint, bigint];
    const balance = formatUnits(data[0], 18);
    const totalDeposited = formatUnits(data[1], 18);
    const totalClaimed = formatUnits(data[2], 18);
    const totalTransferred = formatUnits(data[3], 18);
    const estimatedDaily = formatUnits(data[5], 18);
    const totalEarned = (parseFloat(balance) - parseFloat(totalDeposited) + parseFloat(totalClaimed)).toFixed(4);
    
    return {
      balance,
      balanceUSD: `$${(parseFloat(balance) * 0.25).toFixed(2)}`,
      totalDeposited,
      totalDepositedUSD: `$${(parseFloat(totalDeposited) * 0.25).toFixed(2)}`,
      totalClaimed,
      totalClaimedUSD: `$${(parseFloat(totalClaimed) * 0.25).toFixed(2)}`,
      totalTransferred,
      totalTransferredUSD: `$${(parseFloat(totalTransferred) * 0.25).toFixed(2)}`,
      totalEarned,
      totalEarnedUSD: `$${(parseFloat(totalEarned) * 0.25).toFixed(2)}`,
      todayEarned: estimatedDaily,
      todayEarnedUSD: `$${(parseFloat(estimatedDaily) * 0.25).toFixed(2)}`,
      dailyRate: dailyRateData ? Number(dailyRateData) / 100 : 0.45,
    };
  }, [compoundInfoData, dailyRateData])();

  // 格式化复利余额
  const compoundBalance: CompoundBalance = useMemo(() => {
    const balance = compoundBalanceData ? formatUnits(compoundBalanceData as bigint, 18) : '0';
    const deposited = totalDepositedData ? formatUnits(totalDepositedData as bigint, 18) : '0';
    const claimed = totalClaimedData ? formatUnits(totalClaimedData as bigint, 18) : '0';
    const transferred = totalTransferredData ? formatUnits(totalTransferredData as bigint, 18) : '0';
    
    // 计算总收益
    const earned = (parseFloat(balance) - parseFloat(deposited) + parseFloat(claimed)).toFixed(4);
    
    return {
      principal: deposited,
      principalUSD: `$${(parseFloat(deposited) * 0.25).toFixed(2)}`,
      totalEarned: earned,
      totalEarnedUSD: `$${(parseFloat(earned) * 0.25).toFixed(2)}`,
      total: balance,
      totalUSD: `$${(parseFloat(balance) * 0.25).toFixed(2)}`,
    };
  }, [compoundBalanceData, totalDepositedData, totalClaimedData, totalTransferredData]);

  // 当日复利收益
  const todayCompound = dailyCompoundData 
    ? formatUnits(dailyCompoundData, 18) 
    : '0';

  // 生成模拟复利历史记录
  const generateMockHistory = useCallback((): CompoundRecord[] => {
    const records: CompoundRecord[] = [];
    const today = new Date();
    let cumulativeBalance = parseFloat(compoundBalance.total) || 100;
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const dailyRate = 0.3 + Math.random() * 0.3;
      const dailyEarning = cumulativeBalance * (dailyRate / 100);
      cumulativeBalance += dailyEarning;
      
      records.push({
        id: `compound-${i}`,
        timestamp: date,
        amount: dailyEarning.toFixed(4),
        amountUSD: `$${(dailyEarning * 0.25).toFixed(2)}`,
        cumulativeBalance: cumulativeBalance.toFixed(4),
        dailyRate: Number(dailyRate.toFixed(2)),
      });
    }
    
    return records.reverse();
  }, [compoundBalance.total]);

  // 复利历史记录
  const [compoundHistory, setCompoundHistory] = useState<CompoundRecord[]>([]);

  useEffect(() => {
    setCompoundHistory(generateMockHistory());
  }, [generateMockHistory]);

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
    await refetchInfo();
    await refetchBalance();
  }, [refetchInfo, refetchBalance]);

  // 监听交易成功
  useEffect(() => {
    if (isClaimSuccess || isTransferSuccess) {
      refresh();
      setIsLoading(false);
    }
  }, [isClaimSuccess, isTransferSuccess, refresh]);

  return {
    compoundStats,
    compoundBalance,
    compoundHistory,
    todayCompound,
    isLoading: isLoading || isClaimPending || isTransferPending,
    error,
    claimCompound,
    transferToBalance,
    calculateCompound,
    refresh,
    isClaimSuccess,
    isTransferSuccess,
  };
}

export default useCompound;
