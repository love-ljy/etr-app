"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWallet, useStaking, useCompound, useReferral } from "@/lib/hooks";
import { BindReferrerModal } from "@/components/bind-referrer-modal";
import { formatCurrency } from "@/lib/utils";
import { 
  Wallet, 
  TrendingUp, 
  Gift, 
  ArrowRight, 
  Zap,
  Users,
  Clock,
  TrendingUp as TrendingUpIcon
} from "lucide-react";

// 动画配置
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0, 0.2, 0.2, 1] as const
    }
  }
};

// 总资产组件
function TotalAssets({ 
  onStake, 
  totalValue, 
  etrAmount,
  changePercent 
}: { 
  onStake: () => void;
  totalValue: string;
  etrAmount: string;
  changePercent: string;
}) {
  return (
    <motion.div
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[rgba(20,20,35,0.9)] to-[rgba(10,10,15,0.95)] border border-[#00f5ff]/20 p-8 lg:p-12"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* 背景光效 */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#00f5ff]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#ff00ff]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <Badge variant="cyan">总资产估值</Badge>
          <span className="text-white/40 text-sm">实时更新</span>
        </div>
        
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h1 className="text-5xl lg:text-7xl font-bold gradient-text-gold font-mono tracking-tight">
            ${totalValue}
          </h1>
        </motion.div>
        
        <div className="flex items-center gap-4 text-white/60">
          <span className="text-lg">≈ {etrAmount} ETR</span>
          <span className="text-[#00ff88] flex items-center gap-1">
            <TrendingUpIcon size={16} />
            {changePercent}
          </span>
        </div>
        
        {/* 快速操作 */}
        <motion.div 
          className="flex flex-wrap gap-4 mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button variant="primary" leftIcon={<Zap size={18} />} onClick={onStake}>
            立即质押
          </Button>
          <Button variant="secondary" leftIcon={<Wallet size={18} />} onClick={onStake}>
            查看详情
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}

// 快速操作按钮
const quickActions = [
  { label: "质押", icon: <Zap size={24} />, href: "/stake" },
  { label: "复利池", icon: <TrendingUp size={24} />, href: "/compound" },
  { label: "提取", icon: <Wallet size={24} />, href: "/rewards" },
  { label: "邀请", icon: <Users size={24} />, href: "/referral" },
];

export default function DashboardPage() {
  return (
    <React.Suspense fallback={null}>
      <DashboardContent />
    </React.Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { wallet } = useWallet();
  
  // 获取真实数据
  const { stakeStats } = useStaking();
  const { compoundBalance } = useCompound();
  const { referralStats, hasReferrer } = useReferral();
  
  // 绑定弹窗状态
  const [showBindModal, setShowBindModal] = React.useState(false);
  const [refCode, setRefCode] = React.useState('');
  
  // 检测 URL 参数和推荐人状态
  React.useEffect(() => {
    // 获取 URL 中的 ref 参数
    const ref = searchParams.get('ref');
    
    // 检查是否需要显示绑定弹窗
    if (wallet.isConnected && !hasReferrer && ref) {
      setRefCode(ref);
      setShowBindModal(true);
    }
  }, [wallet.isConnected, hasReferrer, searchParams]);
  
  const handleStake = () => {
    router.push("/stake");
  };
  
  const handleViewAll = () => {
    router.push("/rewards");
  };

  // 计算总资产
  const totalEtr = React.useMemo(() => {
    const walletBalance = parseFloat(wallet.etrBalance || '0');
    const staked = parseFloat(stakeStats.totalStaked || '0');
    const compound = parseFloat(compoundBalance.total || '0');
    return (walletBalance + staked + compound).toFixed(2);
  }, [wallet.etrBalance, stakeStats.totalStaked, compoundBalance.total]);

  // 计算总资产美元价值
  const totalUSD = React.useMemo(() => {
    return (parseFloat(totalEtr) * 0.25).toFixed(2);
  }, [totalEtr]);

  // 资产卡片数据 - 使用真实数据
  const assetCards = [
    {
      label: "ETR 余额",
      value: formatCurrency(parseFloat(wallet.etrBalance || '0'), 2),
      subValue: `≈ $${(parseFloat(wallet.etrBalance || '0') * 0.25).toFixed(2)}`,
      trend: "neutral" as const,
      trendValue: "可用",
      icon: <Wallet size={20} />,
    },
    {
      label: "质押中",
      value: formatCurrency(parseFloat(stakeStats.totalStaked || '0'), 2),
      subValue: stakeStats.totalStakedUSD || '$0.00',
      trend: "neutral" as const,
      trendValue: "锁定中",
      icon: <Clock size={20} />,
    },
    {
      label: "复利池",
      value: formatCurrency(parseFloat(compoundBalance.total || '0'), 2),
      subValue: compoundBalance.totalUSD || '$0.00',
      trend: "up" as const,
      trendValue: "自动复利",
      icon: <TrendingUp size={20} />,
    },
    {
      label: "累计收益",
      value: formatCurrency(parseFloat(referralStats.totalRewards) + parseFloat(stakeStats.totalClaimed), 2),
      subValue: `$${((parseFloat(referralStats.totalRewards) + parseFloat(stakeStats.totalClaimed)) * 0.25).toFixed(2)}`,
      trend: "up" as const,
      trendValue: "累计",
      icon: <Gift size={20} />,
    },
  ];

  // 最新动态数据 - 使用真实数据
  const recentActivities = [
    { 
      icon: <Zap size={18} />, 
      title: `质押资产: ${formatCurrency(parseFloat(stakeStats.totalStaked), 2)} ETR`, 
      subtitle: "当前质押中",
      value: `+${formatCurrency(parseFloat(stakeStats.totalStaked) * 0.0045, 2)}/天`,
      color: "#00f5ff"
    },
    { 
      icon: <TrendingUp size={18} />, 
      title: `复利池余额: ${formatCurrency(parseFloat(compoundBalance.total), 2)} ETR`, 
      subtitle: "自动复利收益",
      value: `+${formatCurrency(parseFloat(compoundBalance.total) * 0.0045, 2)}/天`,
      color: "#ff00ff"
    },
    { 
      icon: <Gift size={18} />, 
      title: `推荐收益: ${formatCurrency(parseFloat(referralStats.totalRewards), 2)} ETR`, 
      subtitle: `${referralStats.totalCount} 位推荐用户`,
      value: `+${referralStats.directCount} 直推`,
      color: "#00ff88"
    },
  ];

  return (
    <MainLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto space-y-8"
      >
        {/* 总资产展示 */}
        <motion.div variants={itemVariants}>
          <TotalAssets 
            onStake={handleStake} 
            totalValue={totalUSD}
            etrAmount={totalEtr}
            changePercent="+12.5%"
          />
        </motion.div>

        {/* 资产卡片网格 */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          variants={itemVariants}
        >
          {assetCards.map((card, index) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <StatCard {...card} />
            </motion.div>
          ))}
        </motion.div>

        {/* 快速操作 */}
        <motion.div variants={itemVariants}>
          <h2 className="text-xl font-semibold text-white mb-4">快速操作</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <motion.a
                key={action.label}
                href={action.href}
                className="group relative p-6 rounded-2xl bg-[rgba(20,20,35,0.6)] backdrop-blur-xl border border-white/10 overflow-hidden"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ 
                  scale: 1.05, 
                  borderColor: "rgba(0, 245, 255, 0.3)",
                  boxShadow: "0 0 30px rgba(0, 245, 255, 0.2)"
                }}
                whileTap={{ scale: 0.98 }}
              >
                {/* 悬停光效 */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#00f5ff]/0 to-[#ff00ff]/0 group-hover:from-[#00f5ff]/10 group-hover:to-[#ff00ff]/5 transition-all duration-500" />
                
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <motion.div 
                    className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00f5ff]/20 to-[#ff00ff]/20 flex items-center justify-center text-[#00f5ff] group-hover:from-[#00f5ff]/30 group-hover:to-[#ff00ff]/30 transition-all"
                    whileHover={{ rotate: 5 }}
                  >
                    {action.icon}
                  </motion.div>
                  <span className="text-white/80 font-medium group-hover:text-white transition-colors">{action.label}</span>
                </div>
              </motion.a>
            ))}
          </div>
        </motion.div>

        {/* 最新动态 */}
        <motion.div variants={itemVariants} className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">资产概览</h2>
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight size={16} />} onClick={handleViewAll}>
              查看全部
            </Button>
          </div>
          
          <div className="rounded-2xl bg-[rgba(20,20,35,0.6)] backdrop-blur-xl border border-white/10 overflow-hidden">
            {recentActivities.map((activity, index) => (
              <motion.div
                key={index}
                className="flex items-center justify-between p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${activity.color}10`, color: activity.color }}
                  >
                    {activity.icon}
                  </div>
                  <div>
                    <p className="text-white font-medium">{activity.title}</p>
                    <p className="text-sm text-white/40">{activity.subtitle}</p>
                  </div>
                </div>
                <span className="font-mono font-medium" style={{ color: activity.color }}>
                  {activity.value}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
      
      {/* 绑定推荐人弹窗 */}
      <BindReferrerModal
        isOpen={showBindModal}
        onClose={() => setShowBindModal(false)}
        defaultReferrer={refCode}
      />
    </MainLayout>
  );
}
