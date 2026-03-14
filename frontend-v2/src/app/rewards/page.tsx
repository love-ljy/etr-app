'use client';

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRewards, useWallet, useStaking, useReferral } from "@/lib/hooks";
import { formatCurrency } from "@/lib/utils";
import { 
  Wallet, 
  TrendingUp, 
  Gift,
  Users,
  Clock,
  Download,
  Filter,
  AlertCircle,
  Check,
  ChevronDown,
  Zap,
  Percent
} from "lucide-react";

// 收益类型配置
const typeConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  staking: { label: "质押", color: "#00f5ff", bgColor: "rgba(0, 245, 255, 0.1)", icon: Wallet },
  compound: { label: "复利", color: "#ff00ff", bgColor: "rgba(255, 0, 255, 0.1)", icon: TrendingUp },
  referral: { label: "推荐", color: "#00ff88", bgColor: "rgba(0, 255, 136, 0.1)", icon: Users },
  dividend: { label: "分红", color: "#ffa500", bgColor: "rgba(255, 165, 0, 0.1)", icon: Gift },
  withdraw: { label: "提取", color: "#ff3366", bgColor: "rgba(255, 51, 102, 0.1)", icon: Wallet },
  all: { label: "全部", color: "#ffffff", bgColor: "rgba(255, 255, 255, 0.1)", icon: Wallet },
};

// 筛选类型
const types = [
  { key: 'all', label: '全部' },
  { key: 'staking', label: '质押' },
  { key: 'compound', label: '复利' },
  { key: 'referral', label: '推荐' },
  { key: 'dividend', label: '分红' },
];

export default function RewardsPage() {
  const { wallet } = useWallet();
  const { 
    rewardStats: rewardsHookStats,
    rewardRecords, 
    referralRewards: rewardsHookReferralRewards,
    totalPendingRewards,
    pendingDividend,
    isLoading, 
    error,
    claimRewards,
    claimDividend,
    filterRewards,
    isClaimSuccess 
  } = useRewards();
  
  // 获取质押数据
  const { 
    stakeStats,
    stakeRecords,
    claimAllRewards,
    dailyYieldRate
  } = useStaking();
  
  // 获取推荐数据
  const { referralStats } = useReferral();

  const [selectedType, setSelectedType] = React.useState<string>('all');
  const [showClaimSuccess, setShowClaimSuccess] = React.useState(false);
  const [activeClaimType, setActiveClaimType] = React.useState<'staking' | 'dividend' | null>(null);

  // 计算总待领取收益
  const totalPending = React.useMemo(() => {
    // 质押待领取收益
    const stakingPending = stakeRecords.reduce((sum, record) => {
      return sum + parseFloat(record.pendingReward || '0');
    }, 0);
    
    // 分红待领取
    const dividendPending = parseFloat(pendingDividend || '0');
    
    return (stakingPending + dividendPending).toFixed(4);
  }, [stakeRecords, pendingDividend]);

  // 计算今日收益
  const todayEarnings = React.useMemo(() => {
    const stakingDaily = stakeRecords.reduce((sum, record) => {
      return sum + parseFloat(record.principal || '0') * dailyYieldRate;
    }, 0);
    return stakingDaily.toFixed(4);
  }, [stakeRecords, dailyYieldRate]);

  // 过滤记录
  const filteredRecords = React.useMemo(() => {
    return filterRewards(selectedType as any, 30);
  }, [filterRewards, selectedType]);

  // 收益统计卡片数据 - 使用真实数据
  const rewardStatCards = [
    {
      label: "待领取收益",
      value: totalPending,
      subValue: `$${(parseFloat(totalPending) * 0.25).toFixed(2)}`,
      trend: "up" as const,
      trendValue: "可领取",
      icon: <Wallet size={20} />,
    },
    {
      label: "今日收益",
      value: todayEarnings,
      subValue: `$${(parseFloat(todayEarnings) * 0.25).toFixed(2)}`,
      trend: "up" as const,
      trendValue: `+${dailyYieldRate}%/天`,
      icon: <Zap size={20} />,
    },
    {
      label: "累计收益",
      value: (parseFloat(referralStats.totalRewards) + parseFloat(stakeStats.totalClaimed)).toFixed(2),
      subValue: `$${((parseFloat(referralStats.totalRewards) + parseFloat(stakeStats.totalClaimed)) * 0.25).toFixed(2)}`,
      trend: "up" as const,
      trendValue: "累计",
      icon: <Gift size={20} />,
    },
  ];

  // 处理领取质押收益
  const handleClaimStaking = async () => {
    setActiveClaimType('staking');
    await claimAllRewards();
  };

  // 处理领取分红
  const handleClaimDividend = async () => {
    setActiveClaimType('dividend');
    await claimDividend();
  };

  // 显示成功提示
  React.useEffect(() => {
    if (isClaimSuccess) {
      setShowClaimSuccess(true);
      setTimeout(() => setShowClaimSuccess(false), 3000);
    }
  }, [isClaimSuccess]);

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-6xl mx-auto space-y-8"
      >
        {/* 成功提示 */}
        <AnimatePresence>
          {showClaimSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#00ff88]/20 border border-[#00ff88]/50 text-[#00ff88]">
                <Check size={20} />
                <span>领取成功！收益已发放到您的钱包</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">收益明细</h1>
            <p className="text-white/50">查看和管理您的所有收益</p>
          </div>
          
          {/* 领取按钮组 */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="primary" 
              size="sm"
              leftIcon={<Gift size={16} />}
              onClick={handleClaimStaking}
              isLoading={isLoading && activeClaimType === 'staking'}
              disabled={!wallet.isConnected || parseFloat(totalPending) <= 0}
            >
              领取质押收益
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              leftIcon={<Wallet size={16} />}
              onClick={handleClaimDividend}
              isLoading={isLoading && activeClaimType === 'dividend'}
              disabled={!wallet.isConnected || parseFloat(pendingDividend) <= 0}
            >
              领取分红
            </Button>
          </div>
        </motion.div>

        {/* 统计卡片 */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {rewardStatCards.map((stat, index) => (
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

        {/* 收益详情 - 质押和推荐 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 质押收益详情 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#00f5ff]/10 flex items-center justify-center">
                      <Wallet size={20} className="text-[#00f5ff]" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">质押收益</h3>
                  </div>
                  <Badge variant="cyan">{dailyYieldRate}%/天</Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5">
                    <p className="text-sm text-white/40 mb-1">总质押</p>
                    <p className="text-xl font-bold text-white font-mono">
                      {formatCurrency(parseFloat(stakeStats.totalStaked), 2)}
                    </p>
                    <p className="text-sm text-white/40">{stakeStats.totalStakedUSD}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5">
                    <p className="text-sm text-white/40 mb-1">已领取</p>
                    <p className="text-xl font-bold text-[#00ff88] font-mono">
                      {formatCurrency(parseFloat(stakeStats.totalClaimed), 2)}
                    </p>
                    <p className="text-sm text-white/40">{stakeStats.totalClaimedUSD}</p>
                  </div>
                </div>
                
                {/* 质押记录摘要 */}
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-white/60">活跃质押 ({stakeRecords.filter(r => r.active).length})</p>
                  {stakeRecords.filter(r => r.active).slice(0, 3).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-[#00f5ff]" />
                        <span className="text-sm text-white">质押 #{record.id}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white font-mono">{formatCurrency(parseFloat(record.principal), 2)} ETR</p>
                        <p className="text-xs text-[#00ff88]">+{formatCurrency(parseFloat(record.pendingReward), 4)} 待领取</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* 推荐收益详情 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#00ff88]/10 flex items-center justify-center">
                      <Users size={20} className="text-[#00ff88]" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">推荐收益</h3>
                  </div>
                  <Badge variant="green">{referralStats.totalCount} 人</Badge>
                </div>
                
                <div className="space-y-3">
                  {[
                    { level: '一级推荐', amount: referralStats.directRewards, rate: '10%', color: '#00f5ff', count: referralStats.directCount },
                    { level: '二级推荐', amount: referralStats.indirectRewards, rate: '5%', color: '#ff00ff', count: referralStats.indirectCount },
                    { level: '三级推荐', amount: referralStats.deepRewards, rate: '3%', color: '#bd00ff', count: referralStats.deepCount },
                  ].map((item, index) => (
                    <motion.div
                      key={item.level}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: `${item.color}20`, color: item.color }}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-white">{item.level}</p>
                          <p className="text-xs text-white/40">{item.count} 人 · {item.rate} 奖励</p>
                        </div>
                      </div>
                      
                      <p className="font-mono font-medium" style={{ color: item.color }}>
                        +{formatCurrency(parseFloat(item.amount), 2)} ETR
                      </p>
                    </motion.div>
                  ))}
                </div>
                
                <div className="mt-4 p-4 rounded-xl bg-[#00ff88]/5 border border-[#00ff88]/20">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">推荐收益总计</span>
                    <span className="text-xl font-bold text-[#00ff88] font-mono">
                      {formatCurrency(parseFloat(referralStats.totalRewards), 2)} ETR
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* 分红收益 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#ffa500]/10 flex items-center justify-center">
                    <Percent size={20} className="text-[#ffa500]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">分红收益</h3>
                    <p className="text-sm text-white/40">持有ETR即可参与平台分红</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-white/40">待领取分红</p>
                    <p className="text-2xl font-bold text-[#ffa500] font-mono">
                      {formatCurrency(parseFloat(pendingDividend || '0'), 4)} ETR
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleClaimDividend}
                    isLoading={isLoading && activeClaimType === 'dividend'}
                    disabled={!wallet.isConnected || parseFloat(pendingDividend || '0') <= 0}
                  >
                    领取分红
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* 筛选和记录 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <div className="p-6">
              {/* 筛选栏 */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-white/40" />
                  <span className="text-sm text-white/60">筛选:</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {types.map((type) => (
                    <button
                      key={type.key}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                        selectedType === type.key
                          ? "bg-[#00f5ff]/20 text-[#00f5ff] border border-[#00f5ff]/30"
                          : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                      }`}
                      onClick={() => setSelectedType(type.key)}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 记录列表 */}
              <div className="space-y-2">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record, index) => {
                    const config = typeConfig[record.type];
                    const Icon = config.icon;
                    
                    return (
                      <motion.div
                        key={record.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + index * 0.05 }}
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: config.bgColor, color: config.color }}
                          >
                            <Icon size={20} />
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{record.typeLabel}</span>
                              <Badge 
                                variant="default" 
                                className="text-[10px]"
                                style={{ 
                                  backgroundColor: config.bgColor, 
                                  color: config.color,
                                  borderColor: `${config.color}30`
                                }}
                              >
                                {config.label}
                              </Badge>
                            </div>
                            {record.description && (
                              <p className="text-sm text-white/40 mt-1">{record.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Clock size={12} className="text-white/30" />
                              <span className="text-sm text-white/40">
                                {record.date.toLocaleDateString('zh-CN')}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <span className="text-[#00ff88] font-mono font-bold text-lg">
                          +{record.amount} ETR
                        </span>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-white/40">
                    <Gift size={48} className="mx-auto mb-4 opacity-30" />
                    <p>暂无收益记录</p>
                  </div>
                )}
              </div>

              {/* 加载更多 */}
              {filteredRecords.length > 0 && (
                <div className="mt-6 text-center">
                  <Button variant="ghost">加载更多</Button>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* 未连接钱包提示 */}
        <AnimatePresence>
          {!wallet.isConnected && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40"
            >
              <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-[rgba(20,20,35,0.98)] border border-[#00f5ff]/30 shadow-[0_0_30px_rgba(0,245,255,0.2)]"
              >
                <AlertCircle size={24} className="text-[#00f5ff]" />
                <div>
                  <p className="text-white font-medium">未连接钱包</p>
                  <p className="text-sm text-white/50">连接钱包后可领取收益</p>
                </div>
                <Button variant="primary" size="sm" onClick={() => window.location.href = '/connect'}>
                  连接钱包
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </MainLayout>
  );
}
