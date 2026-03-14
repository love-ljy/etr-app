"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useReferral, useWallet } from "@/lib/hooks";
import { shortenAddress, formatCurrency } from "@/lib/utils";
import { BindReferrerModal } from "@/components/bind-referrer-modal";
import { 
  Users, 
  Copy, 
  Share2, 
  Gift,
  Crown,
  UserPlus,
  TrendingUp,
  Check,
  UserCheck,
  AlertCircle
} from "lucide-react";

// 时间格式化
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
}

export default function ReferralPage() {
  const { wallet } = useWallet();
  const { 
    referralStats, 
    referralCode, 
    referralLink, 
    referralLevels,
    referralRecords,
    hasReferrer,
    referrer,
    copyReferralLink,
    isLoading 
  } = useReferral();
  
  const [copied, setCopied] = React.useState(false);
  const [showBindModal, setShowBindModal] = React.useState(false);

  // 处理复制
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 推荐统计数据
  const statsData = [
    {
      label: "直接推荐",
      value: referralStats.directCount.toString(),
      subValue: "人",
      icon: <UserPlus size={20} />,
    },
    {
      label: "团队人数",
      value: referralStats.totalCount.toString(),
      subValue: "人",
      trend: "up" as const,
      trendValue: "+" + referralStats.indirectCount.toString(),
      icon: <Users size={20} />,
    },
    {
      label: "推荐收益",
      value: formatCurrency(parseFloat(referralStats.totalRewards), 2),
      subValue: "ETR",
      trend: "up" as const,
      trendValue: "累计",
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
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">推荐奖励</h1>
            <p className="text-white/50">邀请好友加入，获得多级推荐奖励</p>
          </div>
          
          {/* 绑定推荐人按钮 - 未绑定时显示 */}
          {wallet.isConnected && !hasReferrer && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<UserPlus size={16} />}
              onClick={() => setShowBindModal(true)}
            >
              绑定推荐人
            </Button>
          )}
          
          {/* 已绑定提示 */}
          {wallet.isConnected && hasReferrer && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30">
              <UserCheck size={16} className="text-[#00ff88]" />
              <span className="text-sm text-[#00ff88]">
                已绑定: {shortenAddress(referrer, 4)}
              </span>
            </div>
          )}
        </motion.div>

        {/* 统计卡片 */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {statsData.map((stat, index) => (
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

        {/* 推荐链接卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card variant="gradient">
            <div className="p-6 lg:p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00f5ff] to-[#ff00ff] flex items-center justify-center">
                  <Crown size={28} className="text-black" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">成为推荐人</h2>
                  <p className="text-white/50">分享您的专属链接，开始赚取推荐奖励</p>
                </div>
              </div>

              {wallet.isConnected ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 推荐链接 */}
                  <div>
                    <label className="block text-sm text-white/70 mb-2">推荐链接</label>
                    <div className="flex gap-2">
                      <div className="flex-1 px-4 py-3 bg-black/30 rounded-xl border border-white/10 text-white/80 font-mono text-sm truncate">
                        {referralLink}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={copied ? <Check size={16} /> : <Copy size={16} />}
                        onClick={() => handleCopy(referralLink)}
                      >
                        {copied ? "已复制" : "复制"}
                      </Button>
                    </div>
                  </div>

                  {/* 推荐码 */}
                  <div>
                    <label className="block text-sm text-white/70 mb-2">推荐码</label>
                    <div className="flex gap-2">
                      <div className="flex-1 px-4 py-3 bg-black/30 rounded-xl border border-white/10 text-[#00f5ff] font-mono text-lg text-center tracking-wider">
                        {referralCode || wallet.address?.slice(0, 8) || '请先连接钱包'}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Share2 size={16} />}
                        onClick={() => handleCopy(referralCode || wallet.address?.slice(0, 8) || '')}
                      >
                        分享
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
                  <AlertCircle size={32} className="mx-auto mb-3 text-white/40" />
                  <p className="text-white/60">连接钱包后即可获取您的专属推荐链接</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* 推荐等级和记录 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 推荐等级 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-6">推荐等级奖励</h3>
                
                <div className="space-y-4">
                  {referralLevels.map((level, index) => (
                    <motion.div
                      key={level.level}
                      className="relative p-4 rounded-xl bg-white/5 border border-white/5 overflow-hidden"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                    >
                      {/* 等级指示器 */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                        level.level === 1 
                          ? "bg-gradient-to-b from-[#00f5ff] to-[#00f5ff]/50"
                          : level.level === 2
                          ? "bg-gradient-to-b from-[#ff00ff] to-[#ff00ff]/50"
                          : "bg-gradient-to-b from-[#bd00ff] to-[#bd00ff]/50"
                      }`} />
                      
                      <div className="flex items-center justify-between pl-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${
                              level.level === 1 
                                ? "text-[#00f5ff]"
                                : level.level === 2
                                ? "text-[#ff00ff]"
                                : "text-[#bd00ff]"
                            }`}>
                              {level.level}级推荐
                            </span>
                            <Badge variant="default" className="text-xs">
                              {level.rewardRate} 奖励
                            </Badge>
                          </div>
                          <p className="text-sm text-white/40 mt-1">{level.count} 人</p>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-mono font-medium text-white">
                            {formatCurrency(parseFloat(level.totalRewards), 2)} ETR
                          </p>
                          <p className="text-xs text-white/40">累计奖励</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-xl bg-[#00f5ff]/5 border border-[#00f5ff]/20">
                  <p className="text-sm text-white/60 text-center">
                    总推荐收益: <span className="text-[#00f5ff] font-mono font-bold">
                      {formatCurrency(parseFloat(referralStats.totalRewards), 2)} ETR
                    </span>
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* 推荐记录 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="h-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-6">最新推荐</h3>
                
                <div className="space-y-3 max-h-[320px] overflow-y-auto">
                  {referralRecords.length > 0 ? (
                    referralRecords.map((record, index) => (
                      <motion.div
                        key={record.address + index}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                            record.level === 1 
                              ? "bg-[#00f5ff]/20 text-[#00f5ff]"
                              : record.level === 2
                              ? "bg-[#ff00ff]/20 text-[#ff00ff]"
                              : "bg-[#bd00ff]/20 text-[#bd00ff]"
                          }`}>
                            {record.level}
                          </div>
                          <div>
                            <p className="text-sm text-white font-mono">{record.shortAddress}</p>
                            <p className="text-xs text-white/40">{formatTimeAgo(record.joinedAt)}</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-[#00ff88] font-mono font-medium">
                            +{formatCurrency(parseFloat(record.totalStaked), 0)}
                          </p>
                          <p className="text-xs text-white/40">质押</p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-white/40">
                      <Users size={48} className="mx-auto mb-4 opacity-30" />
                      <p>暂无推荐记录</p>
                      <p className="text-sm mt-2">分享您的推荐链接开始邀请好友</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* 绑定推荐人弹窗 */}
        <BindReferrerModal
          isOpen={showBindModal}
          onClose={() => setShowBindModal(false)}
        />
      </motion.div>
    </MainLayout>
  );
}
