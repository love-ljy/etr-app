import React, { useState, useMemo } from 'react';
import { 
  Card, 
  Button, 
  Row, 
  Col, 
  Space, 
  Typography,
  Table,
  Tag,
  Modal,
  InputNumber,
  Statistic,
  Tooltip,
  Empty,
  Divider,
  Alert,
  Form,
} from 'antd';
import { 
  WalletOutlined,
  SwapOutlined,
  CalculatorOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { useCompound, type CompoundRecord } from '../../hooks/useCompound';
import { useWallet } from '../../hooks/useWallet';
import { WalletConnectModal } from '../../components/WalletConnectModal';
import type { WalletType } from '../../hooks/useWallet';

const { Title, Text } = Typography;

/**
 * 复利池页面组件
 */
export const CompoundPage: React.FC = () => {
  const { 
    wallet, 
    connect, 
    isModalOpen, 
    openConnectModal, 
    closeConnectModal 
  } = useWallet();

  const {
    compoundStats,
    compoundBalance,
    compoundHistory,
    isLoading,
    claimCompound,
    transferToBalance,
    getCompoundHistory,
    calculateCompound,
  } = useCompound();

  // 本地状态
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [calculatorInput, setCalculatorInput] = useState({ principal: '', days: 30 });
  const [calculatorResult, setCalculatorResult] = useState<{
    totalAmount: string;
    totalEarnings: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 获取分页数据
  const { records: paginatedHistory, total: totalHistory } = useMemo(() => {
    return getCompoundHistory(currentPage, pageSize);
  }, [getCompoundHistory, currentPage, pageSize, compoundHistory]);

  // 处理钱包连接
  const handleConnect = async (walletType: WalletType) => {
    try {
      await connect(walletType);
    } catch (error) {
      console.error('连接失败:', error);
    }
  };

  // 处理提取复利
  const handleClaim = async () => {
    await claimCompound();
    setClaimModalOpen(false);
  };

  // 处理划转
  const handleTransfer = async () => {
    if (transferAmount && parseFloat(transferAmount) > 0) {
      await transferToBalance(transferAmount);
      setTransferModalOpen(false);
      setTransferAmount('');
    }
  };

  // 处理计算器计算
  const handleCalculate = () => {
    if (calculatorInput.principal) {
      const result = calculateCompound(calculatorInput.principal, calculatorInput.days);
      setCalculatorResult({
        totalAmount: result.totalAmount,
        totalEarnings: result.totalEarnings,
      });
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '日期',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: Date) => (
        <Text style={{ color: '#F0F6FC', fontSize: 13 }}>
          {timestamp.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })}
        </Text>
      ),
    },
    {
      title: '日化收益率',
      dataIndex: 'dailyRate',
      key: 'dailyRate',
      render: (rate: number) => (
        <Tag color="orange" style={{ fontSize: 12 }}>
          {rate.toFixed(2)}%
        </Tag>
      ),
    },
    {
      title: '复利收益',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: string, record: CompoundRecord) => (
        <div>
          <Text style={{ color: '#00D084', fontWeight: 500, fontSize: 13 }}>
            +{amount} ETR
          </Text>
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.amountUSD}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: '累计余额',
      dataIndex: 'cumulativeBalance',
      key: 'cumulativeBalance',
      render: (balance: string, record: CompoundRecord) => (
        <div>
          <Text style={{ color: '#F0F6FC', fontSize: 13 }}>
            {balance} ETR
          </Text>
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.cumulativeBalanceUSD}
            </Text>
          </div>
        </div>
      ),
    },
  ];

  // 未连接状态
  if (!wallet.isConnected) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 16px' }}>
        <Card
          style={{
            background: '#161B22',
            border: '1px solid #30363D',
            borderRadius: 12,
            textAlign: 'center',
            padding: '40px 20px',
          }}
          className="fade-in"
        >
          <div 
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #F7931A20 0%, #FFB80020 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 28,
              color: '#F7931A',
            }}
          >
            <RiseOutlined />
          </div>
          <Title level={4} style={{ color: '#F0F6FC', marginBottom: 12 }}>
            复利池
          </Title>
          <Text style={{ color: '#8B949E', display: 'block', marginBottom: 24, fontSize: 14 }}>
            质押收益自动复利，让收益产生收益
          </Text>
          <Button
            type="primary"
            size="large"
            icon={<WalletOutlined />}
            onClick={openConnectModal}
            style={{
              height: 48,
              padding: '0 32px',
              fontSize: 15,
              borderRadius: 8,
              background: '#F7931A',
              border: 'none',
            }}
          >
            连接钱包
          </Button>
        </Card>

        <WalletConnectModal
          open={isModalOpen}
          onCancel={closeConnectModal}
          onConnect={handleConnect}
          loading={wallet.isConnecting}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px' }}>
      {/* 复利池总览卡片 */}
      <Card
        style={{
          background: 'linear-gradient(135deg, #161B22 0%, #1C2128 100%)',
          border: '1px solid #30363D',
          borderTop: '3px solid #F7931A',
          borderRadius: 12,
          marginBottom: 20,
        }}
        bodyStyle={{ padding: '24px' }}
        className="slide-up"
      >
        <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
          <Col>
            <Space>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #F7931A20 0%, #FFB80020 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  color: '#F7931A',
                }}
              >
                <RiseOutlined />
              </div>
              <div>
                <Title level={5} style={{ color: '#F0F6FC', margin: 0, fontSize: 16 }}>
                  复利池总览
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  收益自动复利，无需手动操作
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Tooltip title="复利池金额 = 质押产生的静态收益，每日自动复利">
              <InfoCircleOutlined style={{ color: '#8B949E' }} />
            </Tooltip>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <div style={{ padding: '12px 0' }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                当前复利池总额
              </Text>
              <div style={{ 
                fontSize: 'clamp(20px, 3vw, 26px)', 
                fontWeight: 700, 
                color: '#F0F6FC',
                fontFamily: '"JetBrains Mono", monospace',
              }}>
                {compoundBalance.total} ETR
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {compoundBalance.totalUSD}
              </Text>
            </div>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <div style={{ padding: '12px 0' }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                今日复利收益
              </Text>
              <div style={{ 
                fontSize: 'clamp(20px, 3vw, 26px)', 
                fontWeight: 700, 
                color: '#00D084',
                fontFamily: '"JetBrains Mono", monospace',
              }}>
                +{compoundStats.todayEarned} ETR
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {compoundStats.todayEarnedUSD}
              </Text>
            </div>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <div style={{ padding: '12px 0' }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                累计复利收益
              </Text>
              <div style={{ 
                fontSize: 'clamp(20px, 3vw, 26px)', 
                fontWeight: 700, 
                color: '#00D084',
                fontFamily: '"JetBrains Mono", monospace',
              }}>
                +{compoundStats.totalEarned} ETR
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {compoundStats.totalEarnedUSD}
              </Text>
            </div>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <div style={{ padding: '12px 0' }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                当前日化收益率
              </Text>
              <div style={{ 
                fontSize: 'clamp(20px, 3vw, 26px)', 
                fontWeight: 700, 
                color: '#F7931A',
                fontFamily: '"JetBrains Mono", monospace',
              }}>
                {compoundStats.dailyRate.toFixed(2)}%
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                每日自动结算
              </Text>
            </div>
          </Col>
        </Row>

        {/* 操作按钮组 */}
        <Divider style={{ borderColor: '#30363D', margin: '20px 0' }} />
        
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12}>
            <Button
              type="primary"
              size="large"
              block
              icon={<WalletOutlined />}
              onClick={() => setClaimModalOpen(true)}
              disabled={parseFloat(compoundStats.balance) <= 0}
              loading={isLoading}
              className="btn-hover"
              style={{
                height: 48,
                fontSize: 15,
                borderRadius: 8,
                background: '#F7931A',
                border: 'none',
              }}
            >
              提取到钱包
            </Button>
          </Col>
          <Col xs={24} sm={12}>
            <Button
              type="default"
              size="large"
              block
              icon={<SwapOutlined />}
              onClick={() => setTransferModalOpen(true)}
              disabled={parseFloat(compoundStats.balance) <= 0}
              loading={isLoading}
              className="btn-hover"
              style={{
                height: 48,
                fontSize: 15,
                borderRadius: 8,
                background: '#161B22',
                border: '1px solid #F7931A',
                color: '#F7931A',
              }}
            >
              划转到余额
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 收益明细表格 */}
      <Card
        style={{
          background: '#161B22',
          border: '1px solid #30363D',
          borderRadius: 12,
          marginBottom: 20,
        }}
        bodyStyle={{ padding: '20px' }}
        className="slide-up delay-100"
      >
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Space>
              <HistoryOutlined style={{ color: '#F7931A', fontSize: 18 }} />
              <Title level={5} style={{ color: '#F0F6FC', margin: 0, fontSize: 15 }}>
                收益明细
              </Title>
            </Space>
          </Col>
          <Col>
            <Button
              type="link"
              icon={<CalculatorOutlined />}
              onClick={() => setCalculatorOpen(true)}
              style={{ color: '#F7931A', fontSize: 13 }}
            >
              收益计算器
            </Button>
          </Col>
        </Row>

        {compoundHistory.length > 0 ? (
          <Table
            dataSource={paginatedHistory}
            columns={columns}
            rowKey="id"
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: totalHistory,
              onChange: setCurrentPage,
              showSizeChanger: false,
              showTotal: (total) => `共 ${total} 条记录`,
              style: { marginTop: 16 },
            }}
            style={{ 
              background: 'transparent',
            }}
            rowClassName={() => 'table-row-dark'}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text type="secondary" style={{ fontSize: 13 }}>
                暂无复利收益记录
              </Text>
            }
            style={{ padding: '40px 0' }}
          />
        )}
      </Card>

      {/* 提示信息 */}
      <Alert
        message="复利池规则说明"
        description={
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
            <li>质押产生的静态收益自动进入复利池</li>
            <li>复利池按日化收益率 0.3%-0.6% 自动计算复利</li>
            <li>复利池金额可随时提取到钱包，无锁仓限制</li>
            <li>划转至余额后可再次质押，实现复投</li>
            <li>复利池金额不参与推荐奖励计算</li>
          </ul>
        }
        type="info"
        showIcon
        style={{
          background: 'rgba(24, 144, 255, 0.1)',
          border: '1px solid rgba(24, 144, 255, 0.3)',
          borderRadius: 8,
        }}
      />

      {/* 提取确认弹窗 */}
      <Modal
        title="提取复利到钱包"
        open={claimModalOpen}
        onCancel={() => setClaimModalOpen(false)}
        onOk={handleClaim}
        confirmLoading={isLoading}
        okText="确认提取"
        cancelText="取消"
        okButtonProps={{
          style: { background: '#F7931A', borderColor: '#F7931A' },
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Text>您即将提取复利池中的全部金额到钱包：</Text>
          <Card
            style={{ background: '#F6FFED', border: '1px solid #B7EB8F' }}
            bodyStyle={{ padding: 16 }}
          >
            <Statistic
              title="可提取金额"
              value={compoundStats.balance}
              suffix="ETR"
              valueStyle={{ color: '#52C41A', fontSize: 24 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              ≈ {compoundStats.balanceUSD}
            </Text>
          </Card>
          <Text type="secondary" style={{ fontSize: 12 }}>
            提取后，复利池金额将转入您的钱包地址，可随时使用。
          </Text>
        </Space>
      </Modal>

      {/* 划转弹窗 */}
      <Modal
        title="划转到余额"
        open={transferModalOpen}
        onCancel={() => {
          setTransferModalOpen(false);
          setTransferAmount('');
        }}
        onOk={handleTransfer}
        confirmLoading={isLoading}
        okText="确认划转"
        cancelText="取消"
        okButtonProps={{
          disabled: !transferAmount || parseFloat(transferAmount) <= 0 || parseFloat(transferAmount) > parseFloat(compoundStats.balance),
          style: { background: '#F7931A', borderColor: '#F7931A' },
        }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Text>将复利池金额划转到余额，可用于再次质押：</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              可划转余额: {compoundStats.balance} ETR
            </Text>
            <InputNumber
              placeholder="请输入划转金额"
              value={transferAmount ? parseFloat(transferAmount) : undefined}
              onChange={(value) => setTransferAmount(value?.toString() || '')}
              min={0}
              max={parseFloat(compoundStats.balance) || 0}
              precision={4}
              style={{ width: '100%' }}
              addonAfter="ETR"
              size="large"
            />
          </div>
          <Button
            type="link"
            size="small"
            onClick={() => setTransferAmount(compoundStats.balance)}
            style={{ padding: 0, color: '#F7931A' }}
          >
            全部划转
          </Button>
          <Text type="secondary" style={{ fontSize: 12 }}>
            划转后，金额将转入您的钱包余额，可在质押页面再次质押。
          </Text>
        </Space>
      </Modal>

      {/* 收益计算器弹窗 */}
      <Modal
        title="复利收益计算器"
        open={calculatorOpen}
        onCancel={() => {
          setCalculatorOpen(false);
          setCalculatorResult(null);
          setCalculatorInput({ principal: '', days: 30 });
        }}
        footer={null}
        width={480}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Form layout="vertical">
            <Form.Item label="预期投入金额 (ETR)">
              <InputNumber
                placeholder="请输入投入金额"
                value={calculatorInput.principal ? parseFloat(calculatorInput.principal) : undefined}
                onChange={(value) => setCalculatorInput(prev => ({ ...prev, principal: value?.toString() || '' }))}
                min={0}
                precision={2}
                style={{ width: '100%' }}
                addonAfter="ETR"
                size="large"
              />
            </Form.Item>
            <Form.Item label="计算天数">
              <InputNumber
                value={calculatorInput.days}
                onChange={(value) => setCalculatorInput(prev => ({ ...prev, days: value || 30 }))}
                min={1}
                max={365}
                style={{ width: '100%' }}
                addonAfter="天"
                size="large"
              />
            </Form.Item>
            <Form.Item>
              <Text type="secondary" style={{ fontSize: 12 }}>
                当前日化收益率: {compoundStats.dailyRate.toFixed(2)}%
              </Text>
            </Form.Item>
            <Button
              type="primary"
              block
              size="large"
              onClick={handleCalculate}
              disabled={!calculatorInput.principal}
              style={{
                background: '#F7931A',
                borderColor: '#F7931A',
              }}
            >
              计算收益
            </Button>
          </Form>

          {calculatorResult && (
            <Card
              style={{ 
                background: 'linear-gradient(135deg, #F6FFED 0%, #F0F5FF 100%)', 
                border: '1px solid #B7EB8F',
                borderRadius: 8,
              }}
              bodyStyle={{ padding: 16 }}
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="预期总金额"
                    value={calculatorResult.totalAmount}
                    suffix="ETR"
                    valueStyle={{ color: '#52C41A', fontSize: 20 }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="预计收益"
                    value={calculatorResult.totalEarnings}
                    suffix="ETR"
                    valueStyle={{ color: '#F7931A', fontSize: 20 }}
                  />
                </Col>
              </Row>
              <Divider style={{ margin: '12px 0' }} />
              <Text type="secondary" style={{ fontSize: 11 }}>
                *以上计算结果仅供参考，实际收益以系统结算为准
              </Text>
            </Card>
          )}
        </Space>
      </Modal>

      {/* 钱包连接弹窗 */}
      <WalletConnectModal
        open={isModalOpen}
        onCancel={closeConnectModal}
        onConnect={handleConnect}
        loading={wallet.isConnecting}
      />
    </div>
  );
};

export default CompoundPage;
