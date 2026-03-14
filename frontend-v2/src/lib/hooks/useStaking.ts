'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  useAccount, 
  useWriteContract, 
  useReadContract, 
  useWaitForTransactionReceipt 
} from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { StakingPoolABI, ETRTokenABI } from '@/lib/abis';
import { getContractAddresses } from '@/lib/web3/contracts';

const ADDRESSES = getContractAddresses();

// 质押记录接口
export interface StakeRecord {
  id: number;
  principal: string;          // 当前本金
  originalPrincipal: string;  // 原始本金
  startTime: Date;
  unlockTime: Date;
  lastClaimTime: Date;
  totalClaimed: string;
  dailyYieldRate: number;     // 日化收益率 (基点)
  active: boolean;
  pendingReward: string;      // 待领取收益
}

// 用户质押统计
export interface StakeStats {
  totalStaked: string;
  totalStakedUSD: string;
  totalClaimed: string;
  totalClaimedUSD: string;
  isValid: boolean;
  portfolioValue: string;
  portfolioValueUSD: string;
}

// 池子统计
export interface PoolStats {
  totalStaked: string;
  totalRewardsDistributed: string;
  activeStakers: number;
  currentYieldRate: number;
}

export function useStaking() {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== 读取合约数据 =====
  
  // 用户账户信息
  const { data: userAccountData, refetch: refetchUserAccount } = useReadContract({
    address: ADDRESSES.StakingPool as `0x${string}`,
    abi: StakingPoolABI,
    functionName: 'getUserAccount',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected },
  });

  // 用户资产总值
  const { data: portfolioValueData, refetch: refetchPortfolioValue } = useReadContract({
    address: ADDRESSES.StakingPool as `0x${string}`,
    abi: StakingPoolABI,
    functionName: 'getUserPortfolioValue',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected },
  });

  // 用户所有质押
  const { data: userStakesData, refetch: refetchUserStakes } = useReadContract({
    address: ADDRESSES.StakingPool as `0x${string}`,
    abi: StakingPoolABI,
    functionName: 'getUserStakes',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected },
  });

  // 池子统计
  const { data: poolStatsData, refetch: refetchPoolStats } = useReadContract({
    address: ADDRESSES.StakingPool as `0x${string}`,
    abi: StakingPoolABI,
    functionName: 'getPoolStats',
    query: { enabled: isConnected },
  });

  // 当前收益率
  const { data: yieldRateData } = useReadContract({
    address: ADDRESSES.StakingPool as `0x${string}`,
    abi: StakingPoolABI,
    functionName: 'currentYieldRate',
    query: { enabled: isConnected },
  });

  // 配置信息
  const { data: configData } = useReadContract({
    address: ADDRESSES.StakingPool as `0x${string}`,
    abi: StakingPoolABI,
    functionName: 'config',
    query: { enabled: isConnected },
  });

  // ETR授权额度
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: ADDRESSES.ETRToken as `0x${string}`,
    abi: ETRTokenABI,
    functionName: 'allowance',
    args: address && ADDRESSES.StakingPool ? [address, ADDRESSES.StakingPool as `0x${string}`] : undefined,
    query: { enabled: !!address && isConnected },
  });

  // ===== 写入合约 =====
  
  // 质押
  const { writeContract: writeStake, data: stakeHash, error: stakeError } = useWriteContract();
  const { isLoading: isStakePending, isSuccess: isStakeSuccess } = useWaitForTransactionReceipt({
    hash: stakeHash,
  });

  // 解押
  const { writeContract: writeUnstake, data: unstakeHash, error: unstakeError } = useWriteContract();
  const { isLoading: isUnstakePending, isSuccess: isUnstakeSuccess } = useWaitForTransactionReceipt({
    hash: unstakeHash,
  });

  // 领取单个收益
  const { writeContract: writeClaimReward, data: claimRewardHash, error: claimRewardError } = useWriteContract();
  const { isLoading: isClaimRewardPending, isSuccess: isClaimRewardSuccess } = useWaitForTransactionReceipt({
    hash: claimRewardHash,
  });

  // 领取所有收益
  const { writeContract: writeClaimAll, data: claimAllHash, error: claimAllError } = useWriteContract();
  const { isLoading: isClaimAllPending, isSuccess: isClaimAllSuccess } = useWaitForTransactionReceipt({
    hash: claimAllHash,
  });

  // 授权ETR
  const { writeContract: writeApprove, data: approveHash, error: approveError } = useWriteContract();
  const { isLoading: isApprovePending, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // ===== 格式化数据 =====

  // 用户质押统计
  const stakeStats: StakeStats = useMemo(() => {
    const totalStaked = userAccountData ? (userAccountData as unknown as [bigint, bigint, boolean, bigint])[0] : BigInt(0);
    const totalClaimed = userAccountData ? (userAccountData as unknown as [bigint, bigint, boolean, bigint])[1] : BigInt(0);
    const isValid = userAccountData ? (userAccountData as unknown as [bigint, bigint, boolean, bigint])[2] : false;
    const portfolioValue = portfolioValueData || BigInt(0);

    return {
      totalStaked: formatUnits(totalStaked, 18),
      totalStakedUSD: `$${(Number(formatUnits(totalStaked, 18)) * 0.25).toFixed(2)}`,
      totalClaimed: formatUnits(totalClaimed, 18),
      totalClaimedUSD: `$${(Number(formatUnits(totalClaimed, 18)) * 0.25).toFixed(2)}`,
      isValid,
      portfolioValue: formatUnits(portfolioValue, 18),
      portfolioValueUSD: `$${(Number(formatUnits(portfolioValue, 18)) * 0.25).toFixed(2)}`,
    };
  }, [userAccountData, portfolioValueData]);

  // 池子统计
  const poolStats: PoolStats = useMemo(() => {
    if (!poolStatsData) {
      return {
        totalStaked: '0',
        totalRewardsDistributed: '0',
        activeStakers: 0,
        currentYieldRate: 0.45,
      };
    }
    const [_totalStaked, _totalRewards, _activeStakers, _yieldRate] = poolStatsData as unknown as [bigint, bigint, bigint, bigint];
    return {
      totalStaked: formatUnits(_totalStaked, 18),
      totalRewardsDistributed: formatUnits(_totalRewards, 18),
      activeStakers: Number(_activeStakers),
      currentYieldRate: Number(_yieldRate) / 10000, // 基点转百分比
    };
  }, [poolStatsData]);

  // 当前日化收益率
  const dailyYieldRate = useMemo(() => {
    if (!yieldRateData) return 0.45;
    return Number(yieldRateData) / 10000; // 基点转百分比
  }, [yieldRateData]);

  // 锁仓周期（秒）
  const lockPeriod = useMemo(() => {
    if (!configData) return 50 * 24 * 3600; // 默认50天
    return Number((configData as unknown as [bigint, bigint, bigint, bigint, bigint, bigint])[0]);
  }, [configData]);

  // 每日解锁比例（基点）
  const dailyUnlockRate = useMemo(() => {
    if (!configData) return 200; // 默认2%
    return Number((configData as unknown as [bigint, bigint, bigint, bigint, bigint, bigint])[1]);
  }, [configData]);

  // 质押记录列表 - 包含待领取收益计算
  const stakeRecords: StakeRecord[] = useMemo(() => {
    if (!userStakesData || !Array.isArray(userStakesData)) return [];
    
    return (userStakesData as unknown as Array<{
      stakeId: bigint;
      principal: bigint;
      originalPrincipal: bigint;
      startTime: bigint;
      unlockTime: bigint;
      lastClaimTime: bigint;
      totalClaimed: bigint;
      dailyYieldRate: bigint;
      active: boolean;
    }>).map(stake => {
      // 计算待领取收益：本金 * 日化收益率 * 天数
      const principal = Number(formatUnits(stake.principal, 18));
      const dailyRate = Number(stake.dailyYieldRate) / 10000; // 基点转百分比
      const startTimeMs = Number(stake.startTime) * 1000;
      const lastClaimTimeMs = Number(stake.lastClaimTime) * 1000;
      
      // 计算从上次领取到现在的天数
      const now = Date.now();
      const daysSinceLastClaim = Math.max(0, (now - Math.max(startTimeMs, lastClaimTimeMs)) / (24 * 3600 * 1000));
      
      // 预估待领取收益
      const pendingReward = stake.active ? (principal * dailyRate * daysSinceLastClaim).toFixed(4) : '0';
      
      return {
        id: Number(stake.stakeId),
        principal: formatUnits(stake.principal, 18),
        originalPrincipal: formatUnits(stake.originalPrincipal, 18),
        startTime: new Date(startTimeMs),
        unlockTime: new Date(Number(stake.unlockTime) * 1000),
        lastClaimTime: new Date(lastClaimTimeMs),
        totalClaimed: formatUnits(stake.totalClaimed, 18),
        dailyYieldRate: dailyRate,
        active: stake.active,
        pendingReward,
      };
    });
  }, [userStakesData]);

  // ===== 操作方法 =====

  // 检查授权
  const checkAllowance = useCallback((amount: string): boolean => {
    if (!allowanceData) return false;
    try {
      const requiredAmount = parseUnits(amount, 18);
      return allowanceData >= requiredAmount;
    } catch {
      return false;
    }
  }, [allowanceData]);

  // 授权ETR
  const approveETR = useCallback(async (amount: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const amountBigInt = parseUnits(amount, 18);
      
      writeApprove({
        address: ADDRESSES.ETRToken as `0x${string}`,
        abi: ETRTokenABI,
        functionName: 'approve',
        args: [ADDRESSES.StakingPool as `0x${string}`, amountBigInt],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '授权失败');
      setIsLoading(false);
    }
  }, [writeApprove]);

  // 质押
  const stakeETR = useCallback(async (amount: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const amountBigInt = parseUnits(amount, 18);

      writeStake({
        address: ADDRESSES.StakingPool as `0x${string}`,
        abi: StakingPoolABI,
        functionName: 'stake',
        args: [amountBigInt],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '质押失败');
      setIsLoading(false);
    }
  }, [writeStake]);

  // 解押
  const unstakeETR = useCallback(async (stakeId: number, amount: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const amountBigInt = parseUnits(amount, 18);

      writeUnstake({
        address: ADDRESSES.StakingPool as `0x${string}`,
        abi: StakingPoolABI,
        functionName: 'unstake',
        args: [BigInt(stakeId), amountBigInt],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '解押失败');
      setIsLoading(false);
    }
  }, [writeUnstake]);

  // 领取单个质押收益
  const claimReward = useCallback(async (stakeId: number) => {
    try {
      setIsLoading(true);
      setError(null);

      writeClaimReward({
        address: ADDRESSES.StakingPool as `0x${string}`,
        abi: StakingPoolABI,
        functionName: 'claimReward',
        args: [BigInt(stakeId)],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '领取收益失败');
      setIsLoading(false);
    }
  }, [writeClaimReward]);

  // 领取所有收益
  const claimAllRewards = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      writeClaimAll({
        address: ADDRESSES.StakingPool as `0x${string}`,
        abi: StakingPoolABI,
        functionName: 'claimAllRewards',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '领取收益失败');
      setIsLoading(false);
    }
  }, [writeClaimAll]);

  // 计算预估日收益
  const calculateEstimatedReward = useCallback((amount: string): string => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return '0';
    return (numAmount * dailyYieldRate).toFixed(4);
  }, [dailyYieldRate]);

  // 刷新数据
  const refresh = useCallback(async () => {
    await refetchUserAccount();
    await refetchPortfolioValue();
    await refetchUserStakes();
    await refetchPoolStats();
    await refetchAllowance();
  }, [refetchUserAccount, refetchPortfolioValue, refetchUserStakes, refetchPoolStats, refetchAllowance]);

  // 监听交易成功
  useEffect(() => {
    if (isStakeSuccess || isUnstakeSuccess || isApproveSuccess || isClaimRewardSuccess || isClaimAllSuccess) {
      refresh();
      setIsLoading(false);
    }
  }, [isStakeSuccess, isUnstakeSuccess, isApproveSuccess, isClaimRewardSuccess, isClaimAllSuccess, refresh]);

  // 监听错误
  useEffect(() => {
    const err = stakeError || unstakeError || approveError || claimRewardError || claimAllError;
    if (err) {
      setError(err.message);
      setIsLoading(false);
    }
  }, [stakeError, unstakeError, approveError, claimRewardError, claimAllError]);

  return {
    // 数据
    stakeStats,
    poolStats,
    stakeRecords,
    dailyYieldRate,
    lockPeriod,
    dailyUnlockRate,
    
    // 状态
    isLoading: isLoading || isStakePending || isUnstakePending || isApprovePending || isClaimRewardPending || isClaimAllPending,
    error,
    
    // 操作
    approveETR,
    stakeETR,
    unstakeETR,
    claimReward,
    claimAllRewards,
    checkAllowance,
    calculateEstimatedReward,
    refresh,
    
    // 成功状态
    isApproveSuccess,
    isStakeSuccess,
    isUnstakeSuccess,
    isClaimRewardSuccess,
    isClaimAllSuccess,
  };
}

export default useStaking;
