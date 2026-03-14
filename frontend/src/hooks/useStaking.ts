import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { StakingPoolABI } from '../abis/StakingPool';
import { ETRTokenABI } from '../abis/ETRToken';
import { getContractAddresses } from '../utils/contracts';

const ADDRESSES = getContractAddresses();

// 质押记录接口
export interface StakeRecord {
  id: number;
  amount: string;
  amountUSD: string;
  stakeTime: Date;
  unlockTime: Date;
  unlockedAmount: string;
  lockedAmount: string;
  progress: number; // 0-100
  active: boolean;
}

// 质押信息接口
export interface StakeInfo {
  totalStaked: string;
  totalStakedUSD: string;
  totalUnlocked: string;
  totalUnlockedUSD: string;
  totalLocked: string;
  totalLockedUSD: string;
  pendingRewards: string;
  pendingRewardsUSD: string;
  stakeCount: number;
  dailyROI: number;
  isValidAccount: boolean;
}

// 收益记录接口
export interface RewardRecord {
  date: Date;
  totalAmount: string;
  stakingReward: string;
  referralReward: string;
  dividendReward: string;
}

/**
 * 质押相关 Hook
 */
export const useStaking = () => {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 读取质押信息
  const { data: stakeInfoData, refetch: refetchStakeInfo } = useReadContract({
    address: ADDRESSES.StakingPool as `0x${string}`,
    abi: StakingPoolABI,
    functionName: 'getStakeInfo',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // 读取日化收益率
  const { data: dailyROIData } = useReadContract({
    address: ADDRESSES.StakingPool as `0x${string}`,
    abi: StakingPoolABI,
    functionName: 'dailyROI',
    query: {
      enabled: isConnected,
    },
  });

  // 读取账户有效性
  const { data: isValidAccountData } = useReadContract({
    address: ADDRESSES.StakingPool as `0x${string}`,
    abi: StakingPoolABI,
    functionName: 'isValidAccount',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // 读取用户质押记录ID列表
  const { data: stakeIdsData, refetch: refetchStakeIds } = useReadContract({
    address: ADDRESSES.StakingPool as `0x${string}`,
    abi: StakingPoolABI,
    functionName: 'getUserStakeIds',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // 质押合约写入
  const { writeContract: writeStake, data: stakeHash } = useWriteContract();
  const { isLoading: isStakePending, isSuccess: isStakeSuccess } = useWaitForTransactionReceipt({
    hash: stakeHash,
  });

  // 解押合约写入
  const { writeContract: writeUnstake, data: unstakeHash } = useWriteContract();
  const { isLoading: isUnstakePending, isSuccess: isUnstakeSuccess } = useWaitForTransactionReceipt({
    hash: unstakeHash,
  });

  // 授权ETR代币
  const { writeContract: writeApprove, data: approveHash } = useWriteContract();
  const { isLoading: isApprovePending, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // 检查授权
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: ADDRESSES.ETRToken as `0x${string}`,
    abi: ETRTokenABI,
    functionName: 'allowance',
    args: address && ADDRESSES.StakingPool ? [address, ADDRESSES.StakingPool as `0x${string}`] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // 格式化质押信息
  const stakeInfo: StakeInfo = {
    totalStaked: stakeInfoData ? formatUnits((stakeInfoData as unknown as { totalStaked: bigint }).totalStaked, 18) : '0',
    totalStakedUSD: stakeInfoData ? `$${(Number(formatUnits((stakeInfoData as unknown as { totalStaked: bigint }).totalStaked, 18)) * 0.25).toFixed(2)}` : '$0.00',
    totalUnlocked: stakeInfoData ? formatUnits((stakeInfoData as unknown as { totalUnlocked: bigint }).totalUnlocked, 18) : '0',
    totalUnlockedUSD: stakeInfoData ? `$${(Number(formatUnits((stakeInfoData as unknown as { totalUnlocked: bigint }).totalUnlocked, 18)) * 0.25).toFixed(2)}` : '$0.00',
    totalLocked: stakeInfoData ? formatUnits((stakeInfoData as unknown as { totalLocked: bigint }).totalLocked, 18) : '0',
    totalLockedUSD: stakeInfoData ? `$${(Number(formatUnits((stakeInfoData as unknown as { totalLocked: bigint }).totalLocked, 18)) * 0.25).toFixed(2)}` : '$0.00',
    pendingRewards: stakeInfoData ? formatUnits((stakeInfoData as unknown as { pendingRewards: bigint }).pendingRewards, 18) : '0',
    pendingRewardsUSD: stakeInfoData ? `$${(Number(formatUnits((stakeInfoData as unknown as { pendingRewards: bigint }).pendingRewards, 18)) * 0.25).toFixed(2)}` : '$0.00',
    stakeCount: stakeInfoData ? Number((stakeInfoData as unknown as { stakeCount: bigint }).stakeCount) : 0,
    dailyROI: dailyROIData ? Number(dailyROIData) / 100 : 0.45, // 默认0.45%
    isValidAccount: isValidAccountData ?? true,
  };

  // 计算预估日收益
  const calculateEstimatedReward = useCallback((amount: string): string => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return '0';
    const roi = stakeInfo.dailyROI / 100;
    return (numAmount * roi).toFixed(4);
  }, [stakeInfo.dailyROI]);

  // 检查是否需要授权
  const checkAllowance = useCallback(async (amount: string): Promise<boolean> => {
    if (!allowanceData) return false;
    const requiredAmount = parseUnits(amount, 18);
    return allowanceData >= requiredAmount;
  }, [allowanceData]);

  // 授权ETR代币
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

  // 质押ETR
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

  // 解押ETR
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

  // 刷新数据
  const refresh = useCallback(async () => {
    await refetchStakeInfo();
    await refetchStakeIds();
    await refetchAllowance();
  }, [refetchStakeInfo, refetchStakeIds, refetchAllowance]);

  // 监听交易成功
  useEffect(() => {
    if (isStakeSuccess || isUnstakeSuccess || isApproveSuccess) {
      refresh();
      setIsLoading(false);
    }
  }, [isStakeSuccess, isUnstakeSuccess, isApproveSuccess, refresh]);

  return {
    // 数据
    stakeInfo,
    stakeIds: stakeIdsData ? stakeIdsData.map(id => Number(id)) : [],
    isLoading: isLoading || isStakePending || isUnstakePending || isApprovePending,
    error,
    
    // 方法
    stakeETR,
    unstakeETR,
    approveETR,
    checkAllowance,
    calculateEstimatedReward,
    refresh,
    
    // 状态
    isApproveSuccess,
    isStakeSuccess,
    isUnstakeSuccess,
  };
};

export default useStaking;
