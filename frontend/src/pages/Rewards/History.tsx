import React, { useState } from 'react';
import {
  Card,
  CardBody,
  Button,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Select,
  SelectItem,
} from '@nextui-org/react';
import {
  History,
  Filter,
  Calendar,
  TrendingUp,
  Gift,
  PieChart,
  ArrowLeft,
} from 'lucide-react';
import { useRewards, type RewardType } from '../../hooks/useRewards';

interface RewardsHistoryPageProps {
  onBack?: () => void;
}

export const RewardsHistoryPage: React.FC<RewardsHistoryPageProps> = ({ onBack }) => {
  const { filterRewards } = useRewards();
  const [filterType, setFilterType] = useState<RewardType>('all');
  const [filterDays, setFilterDays] = useState(30);

  const filteredRecords = filterRewards(filterType, filterDays);

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'staking':
        return { icon: TrendingUp, color: 'success', label: '质押收益' };
      case 'referral':
        return { icon: Gift, color: 'warning', label: '推荐收益' };
      case 'dividend':
        return { icon: PieChart, color: 'secondary', label: '分红收益' };
      default:
        return { icon: Gift, color: 'default', label: '其他' };
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        {onBack && (
          <Button isIconOnly variant="light" onClick={onBack}>
            <ArrowLeft size={20} />
          </Button>
        )}
        <div>
          <h2 className="text-2xl font-display font-bold gradient-text">收益明细</h2>
          <p className="text-gray-400">查看您的历史收益记录</p>
        </div>
      </div>

      {/* 筛选栏 */}
      <Card className="bg-white/5 border-white/10">
        <CardBody className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Filter className="text-orange-400" size={18} />
              <Select
                label="筛选类型"
                selectedKeys={[filterType]}
                onSelectionChange={(keys) => setFilterType(Array.from(keys)[0] as RewardType)}
                classNames={{
                  trigger: "bg-white/5 border-white/10",
                  value: "text-white",
                }}
              >
                <SelectItem key="all">全部</SelectItem>
                <SelectItem key="staking">质押收益</SelectItem>
                <SelectItem key="referral">推荐收益</SelectItem>
                <SelectItem key="dividend">分红收益</SelectItem>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="text-orange-400" size={18} />
              <Select
                label="时间范围"
                selectedKeys={[filterDays.toString()]}
                onSelectionChange={(keys) => setFilterDays(Number(Array.from(keys)[0]))}
                classNames={{
                  trigger: "bg-white/5 border-white/10",
                  value: "text-white",
                }}
              >
                <SelectItem key="7">近7天</SelectItem>
                <SelectItem key="30">近30天</SelectItem>
                <SelectItem key="90">近90天</SelectItem>
              </Select>
            </div>

            <div className="flex-1 text-right">
              <Chip variant="flat" color="default">
                共 {filteredRecords.length} 条记录
              </Chip>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 记录列表 */}
      <Card className="bg-white/5 border-white/10">
        <CardBody className="p-6">
          <Table
            aria-label="收益历史记录"
            classNames={{
              wrapper: "bg-transparent",
              th: "bg-white/5 text-gray-400",
              td: "text-white",
            }}
          >
            <TableHeader>
              <TableColumn>类型</TableColumn>
              <TableColumn>时间</TableColumn>
              <TableColumn>描述</TableColumn>
              <TableColumn>金额</TableColumn>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => {
                const config = getTypeConfig(record.type);
                return (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Chip
                        startContent={<config.icon size={14} />}
                        color={config.color as any}
                        variant="flat"
                        size="sm"
                      >
                        {config.label}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {record.date.toLocaleDateString('zh-CN')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {record.date.toLocaleTimeString('zh-CN')}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-400">
                      {record.description || '-'}
                    </TableCell>
                    <TableCell>
                      <div className={`font-mono font-bold text-${config.color}`}>
                        +{record.amount} ETR
                      </div>
                      <div className="text-xs text-gray-500">{record.amountUSD}</div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
};

export default RewardsHistoryPage;
