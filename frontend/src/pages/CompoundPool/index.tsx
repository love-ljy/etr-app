import React, { useState } from 'react';
import {
  Card,
  CardBody,
  Button,
  Chip,
  Progress,
  Tabs,
  Tab,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '@nextui-org/react';
import {
  TrendingUp,
  Wallet,
  Clock,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Calculator,
} from 'lucide-react';
import { useCompoundPool } from '../../hooks/useCompoundPool';

export const CompoundPoolPage: React.FC = () => {
  const { 
    poolData, 
    history, 
    isLoading,
    calculateCompoundEstimate,
  } = useCompoundPool();

  const [days, setDays] = useState(30);

  const estimatedAmount = calculateCompoundEstimate(days);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 mb-4 animate-glow">
          <TrendingUp className="text-white" size={32} />
        </div>
        <h2 className="text-3xl font-display font-bold gradient-text mb-2">复利池</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          质押收益自动进入复利池，享受 <span className="text-blue-400 font-bold">复利增长</span>
        </p>
      </div>

      {/* 资产卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/30">
          <CardBody className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                <Wallet size={20} />
              </div>
              <span className="text-gray-400">复利池总额</span>
            </div>
            <p className="text-2xl font-mono font-bold text-white">{poolData.totalCompounding} ETR</p>
            <p className="text-sm text-gray-500">≈ ${(parseFloat(poolData.totalCompounding) * 0.25).toFixed(2)}</p>
          </CardBody>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardBody className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
                <TrendingUp size={20} />
              </div>
              <span className="text-gray-400">累计复利收益</span>
            </div>
            <p className="text-2xl font-mono font-bold text-green-400">+{poolData.totalCompounded} ETR</p>
            <Chip size="sm" color="success" variant="flat">+{poolData.yesterdayEarnings} 昨日</Chip>
          </CardBody>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardBody className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
                <Percent size={20} />
              </div>
              <span className="text-gray-400">日化收益率</span>
            </div>
            <p className="text-2xl font-mono font-bold text-orange-400">{poolData.dailyROI}%</p>
            <p className="text-sm text-gray-500">0.3% - 0.6% 浮动</p>
          </CardBody>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardBody className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                <Clock size={20} />
              </div>
              <span className="text-gray-400">自动复利</span>
            </div>
            <p className="text-2xl font-mono font-bold text-white">24小时</p>
            <p className="text-sm text-gray-500">每日自动结算</p>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 复利计算器 */}
        <Card className="bg-white/5 border-white/10">
          <CardBody className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Calculator className="text-blue-400" size={24} />
              <h3 className="text-lg font-bold text-white">复利计算器</h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">当前复利池金额</span>
                <span className="font-mono font-bold text-white">{poolData.totalCompounding} ETR</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">预估天数</span>
                <div className="flex gap-2">
                  {[7, 30, 90, 365].map((d) => (
                    <Button
                      key={d}
                      size="sm"
                      variant={days === d ? "solid" : "flat"}
                      color={days === d ? "primary" : "default"}
                      onClick={() => setDays(d)}
                    >
                      {d}天
                    </Button>
                  ))}
                </div>
              </div>

              <Progress 
                value={days / 365 * 100} 
                color="primary"
                className="mt-4"
              />

              <Card className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/30 mt-4">
                <CardBody className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">{days}天后预估总额</span>
                    <span className="text-2xl font-mono font-bold text-blue-400">
                      {estimatedAmount} ETR
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-gray-500 text-sm">预期收益</span>
                    <span className="text-green-400 font-bold">
                      +{(parseFloat(estimatedAmount) - parseFloat(poolData.totalCompounding)).toFixed(4)} ETR
                    </span>
                  </div>
                </CardBody>
              </Card>
            </div>
          </CardBody>
        </Card>

        {/* 复利说明 */}
        <Card className="bg-white/5 border-white/10">
          <CardBody className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="text-green-400" size={24} />
              <h3 className="text-lg font-bold text-white">复利机制</h3>
            </div>

            <div className="space-y-4 text-sm">
              <div className="p-4 rounded-lg bg-white/5">
                <p className="text-gray-400 mb-2"><strong className="text-white">第1天</strong></p>
                <p className="text-gray-500">
                  本金 1000 ETR × 0.5% = <span className="text-green-400">5 ETR</span> 收益进入复利池
                </p>
              </div>

              <div className="p-4 rounded-lg bg-white/5">
                <p className="text-gray-400 mb-2"><strong className="text-white">第2天</strong></p>
                <p className="text-gray-500">
                  复利池 5 ETR × 0.5% = <span className="text-green-400">0.025 ETR</span> 复利收益
                </p>
                <p className="text-gray-500 mt-1">
                  复利池总额 = 5 + 0.025 = <span className="text-blue-400">5.025 ETR</span>
                </p>
              </div>

              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-blue-200">
                  💡 复利池收益按日化 0.3%-0.6% 计算，收益自动累加，实现指数增长
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 历史记录 */}
      <Card className="bg-white/5 border-white/10">
        <CardBody className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <History className="text-purple-400" size={24} />
            <h3 className="text-lg font-bold text-white">复利记录</h3>
          </div>

          <Table 
            aria-label="复利历史记录"
            classNames={{
              wrapper: "bg-transparent",
              th: "bg-white/5 text-gray-400",
              td: "text-white",
            }}
          >
            <TableHeader>
              <TableColumn>时间</TableColumn>
              <TableColumn>类型</TableColumn>
              <TableColumn>金额</TableColumn>
              <TableColumn>余额</TableColumn>
            </TableHeader>
            <TableBody>
              {history.slice(0, 5).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{new Date(item.timestamp).toLocaleString('zh-CN')}</TableCell>
                  <TableCell>
                    <Chip 
                      size="sm" 
                      color={item.type === 'compound' ? 'success' : item.type === 'deposit' ? 'primary' : 'danger'}
                      variant="flat"
                    >
                      {item.type === 'compound' ? '复利' : item.type === 'deposit' ? '存入' : '提取'}
                    </Chip>
                  </TableCell>
                  <TableCell className={item.type === 'withdraw' ? 'text-red-400' : 'text-green-400'}>
                    {item.type === 'withdraw' ? '-' : '+'}{item.amount} ETR
                  </TableCell>
                  <TableCell className="font-mono">{item.balanceAfter} ETR</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
};

export default CompoundPoolPage;
