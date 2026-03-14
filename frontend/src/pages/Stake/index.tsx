import React, { useState } from 'react';
import {
  Card,
  CardBody,
  Button,
  Input,
  Tabs,
  Tab,
  Chip,
  Progress,
  Tooltip,
} from '@nextui-org/react';
import {
  Wallet,
  TrendingUp,
  Clock,
  Shield,
  Calculator,
  ArrowRightLeft,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useStaking } from '../../hooks/useStaking';

interface StakePageProps {
  onSwitchToRecords?: () => void;
}

export const StakePage: React.FC<StakePageProps> = () => {
  const {
    stakeInfo,
    calculateEstimatedReward,
    isLoading,
  } = useStaking();

  const [stakeAmount, setStakeAmount] = useState('');
  const [usdtAmount, setUsdtAmount] = useState('');
  const [activeTab, setActiveTab] = useState('etr');

  const estimatedReward = calculateEstimatedReward(stakeAmount);
  const etrPrice = 0.25;

  const stakeRules = [
    { icon: Clock, title: '50天锁仓', desc: '质押后资金锁定50天' },
    { icon: TrendingUp, title: '每日解锁2%', desc: '每天释放2%本金' },
    { icon: Calculator, title: '24小时结算', desc: '按个人时间每24小时结算' },
    { icon: Shield, title: '有效持仓≥$100', desc: '持仓价值需≥100美元' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div className="text-center py-8">
        <h2 className="text-3xl font-display font-bold gradient-text mb-2">质押ETR</h2>
        <p className="text-gray-400">质押ETR代币，享受每日稳定收益</p>
      </div>

      <Tabs 
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as string)}
        classNames={{
          tabList: "bg-white/5 border border-white/10",
          cursor: "bg-gradient-to-r from-orange-500 to-yellow-500",
          tab: "text-white",
        }}
      >
        <Tab 
          key="etr" 
          title={
            <div className="flex items-center gap-2">
              <Wallet size={18} />
              <span>质押ETR</span>
            </div>
          }
        >
          <Card className="bg-white/5 border-white/10 mt-4">
            <CardBody className="p-6 space-y-6">
              {/* 输入区域 */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">输入质押数量</span>
                  <span className="text-sm text-gray-500">可用: 10,000 ETR</span>
                </div>

                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    classNames={{
                      input: "text-2xl font-mono",
                      inputWrapper: "bg-white/5 border-white/10 h-16",
                    }}
                    endContent={
                      <div className="flex items-center gap-2">
                        <Chip color="warning" variant="flat">ETR</Chip>
                        <Button size="sm" variant="flat" color="warning">全部</Button>
                      </div>
                    }
                  />
                </div>

                <div className="text-right text-sm text-gray-500">
                  ≈ ${(parseFloat(stakeAmount || '0') * etrPrice).toFixed(2)} USD
                </div>
              </div>

              {/* 预估收益 */}
              <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                <CardBody className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Calculator className="text-green-400" size={20} />
                      <span className="text-gray-400">预估日收益</span>
                    </div>
                    <span className="text-2xl font-mono font-bold text-green-400">
                      +{estimatedReward} ETR
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">当前日化收益率</span>
                      <span className="text-orange-400 font-bold">{stakeInfo.dailyROI}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">预估月收益</span>
                      <span className="text-white font-bold">
                        +{(parseFloat(estimatedReward) * 30).toFixed(2)} ETR
                      </span>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* 锁仓信息 */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-white/5 border-white/10">
                  <CardBody className="p-4 text-center">
                    <Clock className="mx-auto mb-2 text-orange-400" size={24} />
                    <p className="text-gray-400 text-sm">锁仓周期</p>
                    <p className="text-xl font-bold text-white">50天</p>
                  </CardBody>
                </Card>
                
                <Card className="bg-white/5 border-white/10">
                  <CardBody className="p-4 text-center">
                    <TrendingUp className="mx-auto mb-2 text-green-400" size={24} />
                    <p className="text-gray-400 text-sm">每日解锁</p>
                    <p className="text-xl font-bold text-white">2%</p>
                  </CardBody>
                </Card>
              </div>

              {/* 确认按钮 */}
              <Button
                color="warning"
                size="lg"
                className="w-full h-14 font-bold text-lg animate-glow"
                isLoading={isLoading}
                isDisabled={!stakeAmount || parseFloat(stakeAmount) <= 0}
              >
                确认质押
              </Button>
            </CardBody>
          </Card>
        </Tab>

        <Tab 
          key="usdt" 
          title={
            <div className="flex items-center gap-2">
              <ArrowRightLeft size={18} />
              <span>USDT购买并质押</span>
            </div>
          }
        >
          <Card className="bg-white/5 border-white/10 mt-4">
            <CardBody className="p-6 space-y-6">
              <Chip color="primary" variant="flat" className="w-full justify-center py-2">
                一键购买ETR并自动质押
              </Chip>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">输入USDT数量</span>
                  <span className="text-sm text-gray-500">可用: 1,000 USDT</span>
                </div>

                <Input
                  type="number"
                  placeholder="0.00"
                  value={usdtAmount}
                  onChange={(e) => setUsdtAmount(e.target.value)}
                  classNames={{
                    input: "text-2xl font-mono",
                    inputWrapper: "bg-white/5 border-white/10 h-16",
                  }}
                  endContent={<Chip color="success" variant="flat">USDT</Chip>}
                />
              </div>

              <div className="flex justify-center">
                <ArrowRightLeft className="text-orange-400" size={32} />
              </div>

              <Card className="bg-white/5 border-white/10">
                <CardBody className="p-4 text-center">
                  <p className="text-gray-400 text-sm mb-2">预估获得ETR</p>
                  <p className="text-3xl font-mono font-bold text-green-400">
                    {(parseFloat(usdtAmount || '0') / etrPrice).toFixed(2)} ETR
                  </p>
                  <p className="text-xs text-gray-500 mt-2">购买后将自动质押</p>
                </CardBody>
              </Card>

              <div className="flex justify-between text-sm text-gray-500">
                <span>购买手续费</span>
                <span>3%</span>
              </div>

              <Button
                color="success"
                size="lg"
                className="w-full h-14 font-bold text-lg"
                isDisabled={!usdtAmount || parseFloat(usdtAmount) <= 0}
              >
                授权USDT并质押
              </Button>
            </CardBody>
          </Card>
        </Tab>
      </Tabs>

      {/* 质押规则 */}
      <Card className="bg-white/5 border-white/10">
        <CardBody className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">质押规则</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stakeRules.map((rule, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
                  <rule.icon size={20} />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{rule.title}</p>
                  <p className="text-gray-500 text-xs">{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
            <AlertCircle className="text-yellow-400 flex-shrink-0" size={20} />
            <p className="text-sm text-yellow-200">
              质押后资金将锁定50天，期间无法提前取出。请确保您了解锁仓规则后再进行操作。
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default StakePage;
