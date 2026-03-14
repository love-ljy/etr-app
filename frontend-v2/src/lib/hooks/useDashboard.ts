'use client';

import { useMemo } from 'react';
import { useWallet } from './useWallet';
import { useStaking } from './useStaking';
import { useCompound } from './useCompound';
import { useReferral } from './useReferral';

export interface DashboardData {
  // 钱包数据
  etrBalance: string;           // ETR余额
  etrBalanceUSD: string;        // ETR余额(USD)
  
  // 质押数据 (from StakingPool)
  totalStaked: string;          // 总质押
  totalStakedUSD: string;       // 总质押(USD)
  pendingRewards: string;       // 待领取收益
  activeStakes: number;         // 活跃质押数
  
  // 复利数据 (from CompoundPool)
  compoundBalance: string;      // 复利池余额
  compoundBalanceUSD: string;   // 复利池余额(USD)
  
  // 推荐数据 (from ReferralSystem)
  referralCount: number;        // 推荐人数
  referralRewards: string;      // 推荐收益
  
  // 汇总
  totalAssets: string;          // 总资产 (ETR)
  totalAssetsUSD: string;       // 总资产 (USD)
}

export function useDashboard() {
  // 获取各个模块的数据
  const { wallet } = useWallet();
  const { stakeStats, stakeRecords, poolStats } = useStaking();
  const { compoundBalance } = useCompound();
  const { referralStats } = useReferral();

  // 计算待领取收益
  const pendingRewards = useMemo(() => {
    if (!stakeRecords || stakeRecords.length === 0) return '0';
    return stakeRecords
      .reduce((sum, record) => sum + parseFloat(record.pendingReward || '0'), 0)
      .toFixed(4);
  }, [stakeRecords]);

  // 计算活跃质押数
  const activeStakes = useMemo(() => {
    if (!stakeRecords) return 0;
    return stakeRecords.filter(record => record.active).length;
  }, [stakeRecords]);

  // 总资产计算
  const dashboardData: DashboardData = useMemo(() => {
    const etrBalance = parseFloat(wallet.etrBalance) || 0;
    const totalStaked = parseFloat(stakeStats.totalStaked) || 0;
    const compoundBal = parseFloat(compoundBalance.total) || 0;
    
    const totalAssets = etrBalance + totalStaked + compoundBal;
    const etrPrice = 0.25; // ETR 价格 $0.25
    
    return {
      // 钱包数据
      etrBalance: wallet.etrBalance,
      etrBalanceUSD: `$${(etrBalance * etrPrice).toFixed(2)}`,
      
      // 质押数据
      totalStaked: stakeStats.totalStaked,
      totalStakedUSD: stakeStats.totalStakedUSD,
      pendingRewards,
      activeStakes,
      
      // 复利数据
      compoundBalance: compoundBalance.total,
      compoundBalanceUSD: compoundBalance.totalUSD,
      
      // 推荐数据
      referralCount: referralStats.totalCount,
      referralRewards: referralStats.totalRewards,
      
      // 汇总
      totalAssets: totalAssets.toFixed(4),
      totalAssetsUSD: `$${(totalAssets * etrPrice).toFixed(2)}`,
    };
  }, [
    wallet.etrBalance,
    stakeStats,
    compoundBalance,
    referralStats,
    pendingRewards,
    activeStakes,
  ]);

  // 数据加载状态
  const isLoading = useMemo(() => {
    return !wallet.isConnected;
  }, [wallet.isConnected]);

  return {
    data: dashboardData,
    isLoading,
    isConnected: wallet.isConnected,
  };
}

export default useDashboard;
