'use client';

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCompound, useWallet } from "@/lib/hooks";
import { 
  TrendingUp, 
  Wallet, 
  ArrowRightLeft,
  Gift,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Check,
  Info
} from "lucide-react";

// 简单的SVG图表组件
function EarningsChart({ data }: { data: number[] }) {
  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d - minValue) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="w-full h-48 relative">
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00f5ff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00f5ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* 填充区域 */}
        <polygon
          points={`0,100 ${points} 100,100`}
          fill="url(#chartGradient)"
        />
        
        {/* 线条 */}
        <motion.polyline
          points={points}
          fill="none"
          stroke="#00f5ff"
          strokeWidth="0.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
        
        {/* 数据点 */}
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * 100;
          const y = 100 - ((d - minValue) / range) * 80 - 10;
          return (
            <motion.circle
              key={i}
              cx={x}
              cy={y}
              r="1.5"
              fill="#00f5ff"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1 + i * 0.1 }}
            />
          );
        })}
      </svg>
      
      {/* X轴标签 */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-white/30 px-2">
        <span>30天前</span>
        <span>今天</span>
      </div>
    </div>
  );
}

export default function CompoundPage() {
  const { wallet } = useWallet();
  const { 
    compoundStats, 
    compoundBalance, 
    compoundHistory,
    todayCompound,
    isLoading, 
    error,
    claimCompound,
    transferToBalance,
    calculateCompound,
    isClaimSuccess,
    isTransferSuccess
  } = useCompound();
  
  const [transferAmount, setTransferAmount] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"overview" | "transfer" | "history">("overview");
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState("");

  // 生成图表数据
  const chartData = React.useMemo(() => {
    return compoundHistory.slice(0, 30).map(r => parseFloat(r.cumulativeBalance)).reverse();
  }, [compoundHistory]);

  // 计算预期收益
  const projection = React.useMemo(() => {
    const principal = parseFloat(compoundBalance.principal) || 0;
    return calculateCompound(principal.toString(), 30);
  }, [compoundBalance.principal, calculateCompound]);

  // 处理提取复利
  const handleClaim = async () => {
    await claimCompound();
    setSuccessMessage("复利已成功提取到钱包");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // 处理划转
  const handleTransfer = async () => {
    if (!transferAmount || parseFloat(transferAmount) <= 0) return;
    await transferToBalance(transferAmount);
    setTransferAmount("");
    setSuccessMessage("划转成功");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // 复利池统计
  const compoundStatsData = [
    {
      label: "复利池总额",
      value: compoundBalance.total,
      subValue: compoundBalance.totalUSD,
      trend: "up" as const,
      trendValue: `+${compoundStats.dailyRate}%/天`,
      icon: <Wallet size={20} />,
    },
    {
      label: "今日收益",
      value: todayCompound,
      subValue: `$${(parseFloat(todayCompound) * 0.25).toFixed(2)}`,
      trend: "up" as const,
      trendValue: "+12%",
      icon: <TrendingUp size={20} />,
    },
    {
      label: "累计复利收益",
      value: compoundBalance.totalEarned,
      subValue: compoundBalance.totalEarnedUSD,
      trend: "up" as const,
      trendValue: "+180%",
      icon: <Gift size={20} />,
    },
  ];

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-6xl mx-auto space-y-8"
      >
        {/* 成功提示 */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#00ff88]/20 border border-[#00ff88]/50 text-[#00ff88]">
                <Check size={20} />
                <span>{successMessage}</span>
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
            <h1 className="text-3xl font-bold text-white mb-2">复利池</h1>
            <p className="text-white/50">自动复利，让收益滚雪球</p>
          </div>
          <Badge variant="magenta" className="text-sm w-fit">复利收益率 {compoundStats.dailyRate}%/天</Badge>
        </motion.div>

        {/* 统计卡片 */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {compoundStatsData.map((stat, index) => (
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

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧 - 收益图表和余额 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* 余额卡片 */}
            <Card variant="gradient">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white/60">复利池余额</span>
                  <Badge variant="cyan">自动复利</Badge>
                </div>
                
                <motion.div
                  className="text-4xl lg:text-5xl font-bold gradient-text-cyber font-mono mb-2"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {parseFloat(compoundBalance.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </motion.div>
                <p className="text-white/50">{compoundBalance.totalUSD}</p>

                {/* 快捷操作 */}
                <div className="flex gap-3 mt-6">
                  <Button 
                    variant="primary" 
                    className="flex-1" 
                    leftIcon={<ArrowDownRight size={18} />}
                    onClick={handleClaim}
                    isLoading={isLoading}
                    disabled={!wallet.isConnected || parseFloat(compoundBalance.total) <= 0}
                  >
                    提取
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="flex-1" 
                    leftIcon={<ArrowUpRight size={18} />}
                    onClick={() => setActiveTab('transfer')}
                    disabled={!wallet.isConnected}
                  >
                    划转
                  </Button>
                </div>
              </div>
            </Card>

            {/* 收益曲线 */}
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">收益增长曲线</h3>
                  <div className="flex gap-2">
                    {["7D", "30D", "90D"].map((period) => (
                      <button
                        key={period}
                        className="px-3 py-1 text-xs rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
                
                {chartData.length > 0 ? (
                  <EarningsChart data={chartData} />
                ) : (
                  <div className="h-48 flex items-center justify-center text-white/30">
                    <TrendingUp size={48} className="opacity-30" />
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                  <div>
                    <p className="text-xs text-white/40">30天预期增长</p>
                    <p className="text-lg font-bold text-[#00ff88]">+{projection.totalEarnings} ETR</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/40">预计30天后</p>
                    <p className="text-lg font-bold text-[#00f5ff]">{projection.totalAmount} ETR</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* 右侧 - 划转和记录 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-6"
          >
            {/* Tab切换 */}
            <div className="flex p-1 rounded-xl bg-white/5">
              {[
                { id: "overview", label: "总览" },
                { id: "transfer", label: "划转" },
                { id: "history", label: "记录" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === tab.id
                      ? "bg-[#00f5ff]/20 text-[#00f5ff]"
                      : "text-white/60 hover:text-white"
                  }`}
                  onClick={() => setActiveTab(tab.id as any)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "transfer" && (
                <motion.div
                  key="transfer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Card variant="neon">
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-white mb-6">划转到复利池</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-white/70 mb-2">划转数量</label>
                          <Input
                            type="number"
                            placeholder="输入数量"
                            value={transferAmount}
                            onChange={(e) => setTransferAmount(e.target.value)}
                            rightElement={
                              <button 
                                className="px-3 py-1 text-xs bg-[#00f5ff]/20 text-[#00f5ff] rounded-lg hover:bg-[#00f5ff]/30 transition-colors"
                                onClick={() => setTransferAmount(wallet.etrBalance)}
                              >
                                最大
                              </button>
                            }
                          />
                          <p className="mt-2 text-xs text-white/40">可用余额: {wallet.etrBalance} ETR</p>
                        </div>

                        <div className="p-4 rounded-xl bg-white/5 flex items-center justify-center gap-4">
                          <div className="text-center">
                            <p className="text-xs text-white/40">钱包</p>
                            <p className="text-white font-mono">{wallet.etrBalance}</p>
                          </div>
                          <ArrowRightLeft className="text-[#00f5ff]" />
                          <div className="text-center">
                            <p className="text-xs text-white/40">复利池</p>
                            <p className="text-white font-mono">{compoundBalance.total}</p>
                          </div>
                        </div>

                        <Button 
                          variant="primary" 
                          className="w-full"
                          onClick={handleTransfer}
                          isLoading={isLoading}
                          disabled={!transferAmount || parseFloat(transferAmount) <= 0}
                        >
                          确认划转
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 复利记录 */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">复利记录</h3>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {compoundHistory.slice(0, 10).map((record, index) => (
                    <motion.div
                      key={record.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#00ff88]/10 flex items-center justify-center text-[#00ff88]">
                          <Gift size={18} />
                        </div>
                        
                        <div>
                          <p className="font-mono font-medium text-[#00ff88]">
                            +{record.amount} ETR
                          </p>
                          <p className="text-xs text-white/40">
                            {record.timestamp.toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-white/50">{record.amountUSD}</p>
                        <p className="text-xs text-[#00f5ff]">{record.dailyRate}%/天</p>
                      </div>
                    </motion.div>
                  ))}
                  
                  {compoundHistory.length === 0 && (
                    <div className="text-center py-8 text-white/40">
                      <Gift size={48} className="mx-auto mb-4 opacity-30" />
                      <p>暂无复利记录</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

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
                  <p className="text-sm text-white/50">连接钱包后可管理复利池</p>
                </div>
                <Link href="/connect">
                  <Button variant="primary" size="sm">连接钱包</Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </MainLayout>
  );
}
