"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStaking } from "@/lib/hooks/useStaking";
import { useWallet } from "@/lib/hooks/useWallet";
import { formatCurrency } from "@/lib/utils";
import { 
  Wallet, 
  Clock, 
  TrendingUp, 
  Lock, 
  Unlock,
  Info,
  ArrowRight,
  Zap,
  Loader2,
  AlertCircle
} from "lucide-react";

export default function StakePage() {
  const [stakeAmount, setStakeAmount] = React.useState("");
  const { wallet } = useWallet();
  const { 
    stakeStats, 
    poolStats, 
    stakeRecords, 
    dailyYieldRate,
    lockPeriod,
    isLoading,
    error,
    stakeUSDT,
    unstakeETR,
    claimReward,
    checkAllowance,
    approveUSDT,
    isApproveSuccess,
    isStakeSuccess,
  } = useStaking();

  // 计算锁仓天数
  const lockDays = React.useMemo(() => {
    return Math.ceil(lockPeriod / (24 * 3600));
  }, [lockPeriod]);
  
  // 计算预期收益
  const expectedReward = React.useMemo(() => {
    const amount = parseFloat(stakeAmount) || 0;
    if (amount <= 0) return '0';
    // 日化收益率 * 锁仓天数
    return (amount * dailyYieldRate * lockDays).toFixed(4);
  }, [stakeAmount, dailyYieldRate, lockDays]);

  // 计算待解锁金额（未解锁的质押）
  const pendingUnlockAmount = React.useMemo(() => {
    if (!stakeRecords) return '0';
    const now = Date.now();
    return stakeRecords
      .filter(record => record.active && new Date(record.unlockTime).getTime() > now)
      .reduce((sum, record) => sum + parseFloat(record.principal), 0)
      .toFixed(4);
  }, [stakeRecords]);

  // 质押统计 - 使用真实数据
  const stats = [
    {
      label: "已质押",
      value: formatCurrency(parseFloat(stakeStats.totalStaked), 2),
      subValue: "USDT",
      icon: <Lock size={20} />,
    },
    {
      label: "待解锁",
      value: formatCurrency(parseFloat(pendingUnlockAmount), 2),
      subValue: "USDT",
      icon: <Unlock size={20} />,
    },
    {
      label: "累计收益",
      value: formatCurrency(parseFloat(stakeStats.totalClaimed), 2),
      subValue: "ETR",
      trend: "up" as const,
      trendValue: "+180%",
      icon: <TrendingUp size={20} />,
    },
  ];

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) return;
    
    // 检查授权
    const hasAllowance = checkAllowance(stakeAmount);
    if (!hasAllowance) {
      await approveUSDT(stakeAmount);
      return;
    }
    
    await stakeUSDT(stakeAmount);
  };

  const handleMaxClick = () => {
    setStakeAmount(wallet.usdtBalance);
  };

  // 计算解锁进度
  const getUnlockProgress = (record: typeof stakeRecords[0]) => {
    const now = Date.now();
    const startTime = new Date(record.startTime).getTime();
    const unlockTime = new Date(record.unlockTime).getTime();
    const totalDuration = unlockTime - startTime;
    const elapsed = now - startTime;
    
    if (elapsed >= totalDuration) return 100;
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  };

  // 获取记录状态
  const getRecordStatus = (record: typeof stakeRecords[0]) => {
    const now = Date.now();
    const unlockTime = new Date(record.unlockTime).getTime();
    
    if (!record.active) return { status: 'claimed', label: '已提取' };
    if (now >= unlockTime) return { status: 'unlocked', label: '可提取' };
    return { status: 'locked', label: '锁定中' };
  };

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-6xl mx-auto space-y-8"
      >
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">质押挖矿</h1>
            <p className="text-white/50">锁定ETR获取高收益，{lockDays}天解锁周期</p>
          </div>
          <Badge variant="cyan" className="text-sm">年化收益率 {(dailyYieldRate * 365).toFixed(0)}%</Badge>
        </motion.div>

        {/* 统计卡片 */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <StatCard {...stat} />
            </motion.div>
          ))}
        </motion.div>

        {/* 质押操作区 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 质押表单 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card variant="neon" className="h-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#00f5ff]/10 flex items-center justify-center text-[#00f5ff]">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">质押ETR</h2>
                    <p className="text-sm text-white/50">可用余额: {formatCurrency(parseFloat(wallet.etrBalance), 2)} ETR</p>
                  </div>
                </div>

                {/* 错误提示 */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2"
                  >
                    <AlertCircle size={16} className="text-red-400" />
                    <span className="text-red-400 text-sm">{error}</span>
                  </motion.div>
                )}

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-white/70 mb-2">质押数量</label>
                    <Input
                      type="number"
                      placeholder="输入质押数量"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      rightElement={
                        <button 
                          className="px-3 py-1 text-xs bg-[#00f5ff]/20 text-[#00f5ff] rounded-lg hover:bg-[#00f5ff]/30 transition-colors"
                          onClick={handleMaxClick}
                        >
                          最大
                        </button>
                      }
                    />
                  </div>

                  {/* 收益预览 */}
                  {stakeAmount && parseFloat(stakeAmount) > 0 && (
                    <motion.div
                      className="p-4 rounded-xl bg-[rgba(0,245,255,0.05)] border border-[#00f5ff]/20"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white/60">{lockDays}天预期收益</span>
                        <span className="text-lg font-bold text-[#00f5ff] font-mono">+{expectedReward} ETR</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/60">到期总价值</span>
                        <span className="text-white font-mono">
                          {(parseFloat(stakeAmount || "0") + parseFloat(expectedReward)).toFixed(4)} ETR
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                        <span className="text-sm text-white/60">日化收益率</span>
                        <span className="text-[#00ff88] font-mono">{dailyYieldRate}%</span>
                      </div>
                    </motion.div>
                  )}

                  <div className="flex items-start gap-2 p-3 rounded-lg bg-white/5">
                    <Info size={16} className="text-white/40 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-white/50">
                      质押后资金将锁定{lockDays}天，期间无法提取。到期后可选择提取或继续质押。日化收益率为 {dailyYieldRate}%。
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    isLoading={isLoading}
                    leftIcon={isLoading ? undefined : <Lock size={18} />}
                    onClick={handleStake}
                    disabled={!stakeAmount || parseFloat(stakeAmount) <= 0 || parseFloat(stakeAmount) > parseFloat(wallet.etrBalance)}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin mr-2" />
                        处理中...
                      </>
                    ) : (
                      checkAllowance(stakeAmount) ? '确认质押' : '授权并质押'
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* 质押记录 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="h-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">质押记录</h2>
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight size={16} />}>
                    查看全部
                  </Button>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-[#00f5ff]" />
                    </div>
                  ) : stakeRecords && stakeRecords.length > 0 ? (
                    stakeRecords.map((record, index) => {
                      const { status, label } = getRecordStatus(record);
                      const progress = getUnlockProgress(record);
                      const daysLeft = Math.max(0, Math.ceil((new Date(record.unlockTime).getTime() - Date.now()) / (24 * 3600 * 1000)));
                      
                      return (
                        <motion.div
                          key={record.id}
                          className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-mono font-medium text-white">{formatCurrency(parseFloat(record.principal), 2)} USDT</span>
                            <Badge 
                              variant={status === "claimed" ? "default" : status === "unlocked" ? "green" : "cyan"}
                              className="text-xs"
                            >
                              {label}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-white/40">解锁进度</span>
                              <span className="text-white/60 font-mono">
                                {status === 'claimed' ? '已完成' : `${Math.round(progress)}%`}
                              </span>
                            </div>
                            
                            <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                              <motion.div
                                className={`absolute inset-y-0 left-0 rounded-full ${
                                  status === "claimed" 
                                    ? "bg-white/20" 
                                    : "bg-gradient-to-r from-[#00f5ff] to-[#ff00ff]"
                                }`}
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1, delay: 0.6 + index * 0.1 }}
                              />
                            </div>
                            
                            {status === 'locked' && daysLeft > 0 && (
                              <div className="text-xs text-white/40">
                                预计 {daysLeft} 天后解锁
                              </div>
                            )}
                          </div>
                          
                          {status === "unlocked" && (
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="w-full mt-3"
                              leftIcon={<Unlock size={14} />}
                              onClick={() => claimReward(record.id)}
                            >
                              提取收益
                            </Button>
                          )}
                          
                          {record.pendingReward && parseFloat(record.pendingReward) > 0 && status !== 'claimed' && (
                            <div className="mt-2 text-xs text-[#00ff88]">
                              待领取: {formatCurrency(parseFloat(record.pendingReward), 4)} ETR
                            </div>
                          )}
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <Lock size={24} className="text-white/30" />
                      </div>
                      <p className="text-white/50">暂无质押记录</p>
                      <p className="text-white/30 text-sm mt-1">开始质押获取收益吧</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* 池子统计 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">池子统计</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-sm text-white/50 mb-1">总质押量</p>
                  <p className="text-xl font-mono text-white">{formatCurrency(parseFloat(poolStats.totalStaked), 2)} USDT</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-sm text-white/50 mb-1">活跃质押者</p>
                  <p className="text-xl font-mono text-white">{poolStats.activeStakers}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-sm text-white/50 mb-1">日化收益率</p>
                  <p className="text-xl font-mono text-[#00ff88]">{dailyYieldRate}%</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-sm text-white/50 mb-1">已分发奖励</p>
                  <p className="text-xl font-mono text-white">{formatCurrency(parseFloat(poolStats.totalRewardsDistributed), 2)} ETR</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </MainLayout>
  );
}
