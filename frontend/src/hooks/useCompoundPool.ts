import { useState, useCallback, useEffect } from 'react';

/**
 * 复利池数据接口
 */
export interface CompoundPoolData {
  principal: string;           // 本金
  accumulatedRewards: string;  // 累积收益（进入复利池的部分）
  totalCompounding: string;    // 复利池总额
  dailyROI: string;           // 当前日化收益率
  yesterdayEarnings: string;  // 昨日收益
  totalCompounded: string;    // 累计复利收益
}

/**
 * 复利池历史记录
 */
export interface CompoundHistoryItem {
  id: string;
  timestamp: number;
  amount: string;
  type: 'deposit' | 'compound' | 'withdraw';
  balanceAfter: string;
}

/**
 * 使用复利池 Hook
 * 
 * 复利规则：
 * - 质押产生的收益自动进入复利池
 * - 复利池按日化0.3%-0.6%计算收益
 * - 复利收益自动累加到复利池
 * 
 * @example
 * 本金1000 USDT，日化0.5%
 * Day 1: 收益 = 1000 * 0.5% = 5 USDT → 进入复利池
 * Day 2: 复利池收益 = 5 * 0.5% = 0.025 USDT
 *       复利池总额 = 5 + 0.025 = 5.025 USDT
 * Day 3: 复利池收益 = 5.025 * 0.5% = 0.025125 USDT
 *       复利池总额 = 5.025 + 0.025125 = 5.050125 USDT
 */
export const useCompoundPool = () => {
  // 复利池数据
  const [poolData, setPoolData] = useState<CompoundPoolData>({
    principal: '1000.00',
    accumulatedRewards: '150.50',
    totalCompounding: '150.50',
    dailyROI: '0.50',
    yesterdayEarnings: '0.75',
    totalCompounded: '2.25',
  });

  // 历史记录
  const [history, setHistory] = useState<CompoundHistoryItem[]>([
    {
      id: '1',
      timestamp: Date.now() - 86400000,
      amount: '0.75',
      type: 'compound',
      balanceAfter: '150.50',
    },
    {
      id: '2',
      timestamp: Date.now() - 172800000,
      amount: '0.50',
      type: 'compound',
      balanceAfter: '149.75',
    },
    {
      id: '3',
      timestamp: Date.now() - 259200000,
      amount: '5.00',
      type: 'deposit',
      balanceAfter: '149.25',
    },
  ]);

  // 加载状态
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 计算复利池预估收益
   * @param days 天数
   * @returns 预估收益
   */
  const calculateCompoundEstimate = useCallback((days: number): string => {
    const principal = parseFloat(poolData.totalCompounding);
    const dailyRate = parseFloat(poolData.dailyROI) / 100;
    
    // 复利公式：A = P * (1 + r)^n
    const result = principal * Math.pow(1 + dailyRate, days);
    return result.toFixed(6);
  }, [poolData.totalCompounding, poolData.dailyROI]);

  /**
   * 手动将收益转入复利池
   * @param amount 金额
   */
  const depositToCompoundPool = useCallback(async (amount: string) => {
    setIsLoading(true);
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const depositAmount = parseFloat(amount);
    const currentTotal = parseFloat(poolData.totalCompounding);
    const newTotal = currentTotal + depositAmount;
    
    setPoolData(prev => ({
      ...prev,
      accumulatedRewards: (parseFloat(prev.accumulatedRewards) + depositAmount).toFixed(2),
      totalCompounding: newTotal.toFixed(2),
    }));
    
    // 添加历史记录
    const newHistoryItem: CompoundHistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      amount: amount,
      type: 'deposit',
      balanceAfter: newTotal.toFixed(2),
    };
    
    setHistory(prev => [newHistoryItem, ...prev]);
    setIsLoading(false);
  }, [poolData.totalCompounding, poolData.accumulatedRewards]);

  /**
   * 从复利池提取
   * @param amount 金额
   */
  const withdrawFromCompoundPool = useCallback(async (amount: string) => {
    setIsLoading(true);
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const withdrawAmount = parseFloat(amount);
    const currentTotal = parseFloat(poolData.totalCompounding);
    
    if (withdrawAmount > currentTotal) {
      throw new Error('提取金额超过复利池余额');
    }
    
    const newTotal = currentTotal - withdrawAmount;
    
    setPoolData(prev => ({
      ...prev,
      totalCompounding: newTotal.toFixed(2),
    }));
    
    // 添加历史记录
    const newHistoryItem: CompoundHistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      amount: amount,
      type: 'withdraw',
      balanceAfter: newTotal.toFixed(2),
    };
    
    setHistory(prev => [newHistoryItem, ...prev]);
    setIsLoading(false);
  }, [poolData.totalCompounding]);

  /**
   * 刷新复利池数据
   */
  const refreshPoolData = useCallback(async () => {
    setIsLoading(true);
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 这里应该从合约获取实时数据
    setIsLoading(false);
  }, []);

  // 自动复利效果（演示用）
  useEffect(() => {
    const interval = setInterval(() => {
      // 每30秒模拟一次复利增长
      setPoolData(prev => {
        const currentTotal = parseFloat(prev.totalCompounding);
        const dailyRate = parseFloat(prev.dailyROI) / 100;
        const hourlyRate = dailyRate / 24;
        const minuteRate = hourlyRate / 60;
        const growth = currentTotal * minuteRate * 0.5; // 每30秒增长
        
        return {
          ...prev,
          totalCompounding: (currentTotal + growth).toFixed(6),
          totalCompounded: (parseFloat(prev.totalCompounded) + growth).toFixed(6),
        };
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    poolData,
    history,
    isLoading,
    calculateCompoundEstimate,
    depositToCompoundPool,
    withdrawFromCompoundPool,
    refreshPoolData,
  };
};

export default useCompoundPool;
