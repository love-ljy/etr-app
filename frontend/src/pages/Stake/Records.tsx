import React from 'react';
import {
  Card,
  CardBody,
  Button,
  Chip,
  Progress,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '@nextui-org/react';
import {
  List,
  Clock,
  Unlock,
  TrendingUp,
  AlertCircle,
  ArrowLeft,
  PlusCircle,
} from 'lucide-react';
import { useStaking } from '../../hooks/useStaking';

interface StakeRecordsPageProps {
  onBack?: () => void;
}

export const StakeRecordsPage: React.FC<StakeRecordsPageProps> = ({ onBack }) => {
  const { stakeRecords, unstakeETR, isLoading } = useStaking();

  // 模拟数据
  const mockRecords = [
    {
      id: '1',
      amount: '1000',
      startTime: Date.now() - 86400000 * 10,
      unlockTime: Date.now() + 86400000 * 40,
      dailyReward: '4.5',
      status: 'locked',
      progress: 20,
    },
    {
      id: '2',
      amount: '2500',
      startTime: Date.now() - 86400000 * 30,
      unlockTime: Date.now() + 86400000 * 20,
      dailyReward: '11.25',
      status: 'locked',
      progress: 60,
    },
    {
      id: '3',
      amount: '500',
      startTime: Date.now() - 86400000 * 55,
      unlockTime: Date.now() - 86400000 * 5,
      dailyReward: '2.25',
      status: 'unlocked',
      progress: 100,
    },
  ];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'locked':
        return { color: 'warning', label: '质押中' };
      case 'unlocked':
        return { color: 'success', label: '可解押' };
      case 'unstaked':
        return { color: 'default', label: '已解押' };
      default:
        return { color: 'default', label: '未知' };
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button isIconOnly variant="light" onClick={onBack}>
              <ArrowLeft size={20} />
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-display font-bold gradient-text">我的质押</h2>
            <p className="text-gray-400">管理您的质押记录</p>
          </div>
        </div>

        <Button
          color="warning"
          variant="flat"
          startContent={<PlusCircle size={18} />}
          onClick={onBack}
        >
          新增质押
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardBody className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-orange-500/20 text-orange-400">
                <List size={24} />
              </div>
              <div>
                <p className="text-gray-400">总质押数量</p>
                <p className="text-2xl font-mono font-bold text-white">4,000 ETR</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardBody className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-500/20 text-green-400">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-gray-400">每日收益</p>
                <p className="text-2xl font-mono font-bold text-green-400">+15.75 ETR</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardBody className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
                <Unlock size={24} />
              </div>
              <div>
                <p className="text-gray-400">可解押</p>
                <p className="text-2xl font-mono font-bold text-blue-400">500 ETR</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 质押记录表 */}
      <Card className="bg-white/5 border-white/10">
        <CardBody className="p-6">
          <Table
            aria-label="质押记录"
            classNames={{
              wrapper: "bg-transparent",
              th: "bg-white/5 text-gray-400",
              td: "text-white",
            }}
          >
            <TableHeader>
              <TableColumn>质押金额</TableColumn>
              <TableColumn>日收益</TableColumn>
              <TableColumn>进度</TableColumn>
              <TableColumn>状态</TableColumn>
              <TableColumn>操作</TableColumn>
            </TableHeader>
            <TableBody>
              {mockRecords.map((record) => {
                const statusConfig = getStatusConfig(record.status);
                return (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="font-mono font-bold text-white">{record.amount} ETR</div>
                      <div className="text-xs text-gray-500">
                        质押于 {new Date(record.startTime).toLocaleDateString('zh-CN')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-green-400 font-bold">+{record.dailyReward} ETR</div>
                      <div className="text-xs text-gray-500">每日</div>
                    </TableCell>
                    <TableCell>
                      <div className="w-full max-w-[150px]">
                        <Progress 
                          value={record.progress} 
                          color={record.progress >= 100 ? 'success' : 'warning'}
                          size="sm"
                        />
                        <div className="text-xs text-gray-500 mt-1">{record.progress}%</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip color={statusConfig.color as any} variant="flat" size="sm">
                        {statusConfig.label}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        color={record.status === 'unlocked' ? 'success' : 'default'}
                        variant={record.status === 'unlocked' ? 'solid' : 'flat'}
                        isDisabled={record.status !== 'unlocked'}
                        isLoading={isLoading}
                      >
                        {record.status === 'unlocked' ? '解押' : '锁定中'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* 提示 */}
      <Card className="bg-yellow-500/10 border-yellow-500/20">
        <CardBody className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-400 flex-shrink-0" size={20} />
            <div className="text-sm text-yellow-200">
              <p><strong>解押规则：</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>质押后资金锁定50天，期间无法提前解押</li>
                <li>50天后可随时解押，解押后本金返还至钱包</li>
                <li>解押不影响已产生的收益</li>
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default StakeRecordsPage;
