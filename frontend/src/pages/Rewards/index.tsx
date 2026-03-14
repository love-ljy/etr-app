import React, { useState } from 'react';
import {
  Card,
  CardBody,
  Button,
  Chip,
  Progress,
  Avatar,
  AvatarGroup,
} from '@nextui-org/react';
import {
  Gift,
  Wallet,
  TrendingUp,
  Users,
  PieChart,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { useRewards } from '../../hooks/useRewards';

interface RewardsPageProps {
  onSwitchToHistory?: () => void;
}

export const RewardsPage: React.FC<RewardsPageProps> = () => {
  const { rewardStats, claimRewards, isLoading } = useRewards();

  const rewardTypes = [
    { type: 'staking', label: '质押收益', amount: '120.00', percent: 70, color: 'success' },
    { type: 'referral', label: '推荐收益', amount: '25.00', percent: 20, color: 'warning' },
    { type: 'dividend', label: '分红收益', amount: '5.50', percent: 10, color: 'secondary' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 mb-4 animate-glow">
          <Gift className="text-white" size={32} />
        </div>
        <h2 className="text-3xl font-display font-bold gradient-text mb-2">收益中心</h2>
        <p className="text-gray-400">查看您的收益统计并领取奖励</p>
      </div>

      {/* 收益统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
          <CardBody className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
                <Wallet size={20} />
              </div>
              <span className="text-gray-400">累计收益</span>
            </div>
            <p className="text-2xl font-mono font-bold text-green-400">+{rewardStats.totalEarned}</p>
            <p className="text-sm text-gray-500">{rewardStats.totalEarnedUSD}</p>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border-orange-500/30">
          <CardBody className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
                <TrendingUp size={20} />
              </div>
              <span className="text-gray-400">今日收益</span>
            </div>
            <p className="text-2xl font-mono font-bold text-orange-400">+{rewardStats.todayEarned}</p>
            <p className="text-sm text-gray-500">{rewardStats.todayEarnedUSD}</p>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <CardBody className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                <Gift size={20} />
              </div>
              <span className="text-gray-400">待领取</span>
            </div>
            <p className="text-2xl font-mono font-bold text-purple-400">{rewardStats.pendingRewards}</p>
            <p className="text-sm text-gray-500">{rewardStats.pendingRewardsUSD}</p>
          </CardBody>
        </Card>
      </div>

      {/* 待领取收益 */}
      {parseFloat(rewardStats.pendingRewards) > 0 && (
        <Card className="bg-gradient-to-r from-purple-500/10 via-orange-500/10 to-yellow-500/10 border-orange-500/30">
          <CardBody className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center animate-glow">
                  <Gift className="text-white" size={28} />
                </div>
                <div>
                  <p className="text-gray-400">有待领取的收益</p>
                  <p className="text-3xl font-mono font-bold text-orange-400">
                    {rewardStats.pendingRewards} ETR
                  </p>
                  <p className="text-sm text-gray-500">{rewardStats.pendingRewardsUSD}</p>
                </div>
              </div>
              
              <Button
                color="warning"
                size="lg"
                className="font-bold animate-glow"
                isLoading={isLoading}
                onClick={claimRewards}
                startContent={<Zap size={18} />}
              >
                一键领取
              </Button>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="grid grid-cols-3 gap-4">
                {rewardTypes.map((item) => (
                  <div key={item.type} className="text-center">
                    <p className="text-gray-500 text-sm">{item.label}</p>
                    <p className={`text-${item.color} font-bold`}>{item.amount} ETR</p>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 收益来源 */}
        <Card className="bg-white/5 border-white/10">
          <CardBody className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <PieChart className="text-blue-400" size={24} />
              <h3 className="text-lg font-bold text-white">收益来源</h3>
            </div>

            <div className="space-y-4">
              {rewardTypes.map((item) => (
                <div key={item.type}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full bg-${item.color}`}></div>
                      <span className="text-gray-400">{item.label}</span>
                    </div>
                    <span className="text-white font-bold">{item.percent}%</span>
                  </div>
                  <Progress 
                    value={item.percent} 
                    color={item.color as any}
                    size="sm"
                    className="mt-1"
                  />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* 推荐计划 */}
        <Card className="bg-white/5 border-white/10">
          <CardBody className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Users className="text-green-400" size={24} />
              <h3 className="text-lg font-bold text-white">推荐计划</h3>
            </div>

            <div className="space-y-4">
              {[
                { level: '第一代 (直推)', count: 12, reward: '3%', earned: 450 },
                { level: '第二代 (间推)', count: 28, reward: '2%', earned: 180 },
                { level: '第三代 (间间推)', count: 56, reward: '1%', earned: 45 },
              ].map((item, index) => (
                <div 
                  key={index} 
                  className="flex justify-between items-center p-3 rounded-lg bg-white/5"
                >
                  <div>
                    <p className="text-white font-medium">{item.level}</p>
                    <p className="text-gray-500 text-sm">{item.count}人 · {item.reward}奖励</p>
                  </div>
                  <span className="text-green-400 font-bold">+{item.earned} ETR</span>
                </div>
              ))}
            </div>

            <Button
              color="success"
              variant="flat"
              className="w-full mt-4"
              endContent={<ArrowRight size={18} />}
            >
              查看团队详情
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default RewardsPage;
