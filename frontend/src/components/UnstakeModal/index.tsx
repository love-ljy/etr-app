import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Input,
  Typography,
  Space,
  Alert,
  Divider,
  Row,
  Col,
} from 'antd';
import {
  WarningOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import { useStaking, type StakeRecord } from '../../hooks/useStaking';
import { colors } from '../../styles/theme';

const { Title, Text } = Typography;

interface UnstakeModalProps {
  open: boolean;
  record: StakeRecord;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * 解押弹窗组件
 */
export const UnstakeModal: React.FC<UnstakeModalProps> = ({
  open,
  record,
  onClose,
  onSuccess,
}) => {
  const { unstakeETR, isLoading, isUnstakeSuccess, error } = useStaking();
  const [amount, setAmount] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);

  const etrPrice = 0.25;
  const maxUnstake = parseFloat(record.unlockedAmount);

  // 监听解押成功
  useEffect(() => {
    if (isUnstakeSuccess) {
      onSuccess?.();
      onClose();
    }
  }, [isUnstakeSuccess, onClose, onSuccess]);

  // 重置状态
  useEffect(() => {
    if (open) {
      setAmount('');
      setConfirmStep(false);
    }
  }, [open]);

  // 设置最大数量
  const handleMax = () => {
    setAmount(record.unlockedAmount);
  };

  // 处理确认
  const handleConfirm = () => {
    const numAmount = parseFloat(amount);
    if (numAmount <= 0 || numAmount > maxUnstake) {
      return;
    }
    setConfirmStep(true);
  };

  // 处理解押
  const handleUnstake = async () => {
    await unstakeETR(record.id, amount);
  };

  // 返回上一步
  const handleBack = () => {
    setConfirmStep(false);
  };

  // 格式化金额
  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={420}
      centered
      closable={!isLoading}
      maskClosable={!isLoading}
      style={{
        '--ant-modal-content-bg': colors.bgContainer,
      } as React.CSSProperties}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: `${colors.warning}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <UnlockOutlined style={{ fontSize: 32, color: colors.warning }} />
        </div>
        <Title level={4} style={{ color: colors.textPrimary, margin: 0 }}>
          {confirmStep ? '确认解押' : '解押ETR'}
        </Title>
        <Text type="secondary">
          {confirmStep ? '请确认解押信息' : '输入要解押的数量'}
        </Text>
      </div>

      {!confirmStep ? (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 质押记录信息 */}
          <div
            style={{
              background: colors.bgBase,
              borderRadius: 8,
              padding: 16,
            }}
          >
            <Row justify="space-between" style={{ marginBottom: 8 }}>
              <Col>
                <Text type="secondary" style={{ fontSize: 12 }}>质押记录</Text>
              </Col>
              <Col>
                <Text style={{ color: colors.textPrimary, fontWeight: 500 }}>
                  #{record.id}
                </Text>
              </Col>
            </Row>
            
            <Row justify="space-between" style={{ marginBottom: 8 }}>
              <Col>
                <Text type="secondary" style={{ fontSize: 12 }}>质押数量</Text>
              </Col>
              <Col>
                <Text style={{ color: colors.textPrimary }}>
                  {record.amount} ETR
                </Text>
              </Col>
            </Row>

            <Row justify="space-between">
              <Col>
                <Text type="secondary" style={{ fontSize: 12 }}>可解押数量</Text>
              </Col>
              <Col>
                <Text style={{ color: colors.success, fontWeight: 500 }}>
                  {record.unlockedAmount} ETR
                </Text>
              </Col>
            </Row>
          </div>

          <Divider style={{ borderColor: colors.border, margin: '12px 0' }} />

          {/* 输入解押数量 */}
          <div>
            <Row justify="space-between" style={{ marginBottom: 8 }}>
              <Col>
                <Text style={{ color: colors.textSecondary }}>解押数量</Text>
              </Col>
              <Col>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  可解押: <Text style={{ color: colors.success }}>{record.unlockedAmount} ETR</Text>
                </Text>
              </Col>
            </Row>

            <Input
              size="large"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                const value = e.target.value;
                if (/^\d*\.?\d*$/.test(value)) {
                  setAmount(value);
                }
              }}
              suffix={
                <Space>
                  <Text style={{ color: colors.primary, fontWeight: 500 }}>ETR</Text>
                  <Button
                    type="link"
                    size="small"
                    onClick={handleMax}
                    style={{ padding: 0, color: colors.primary }}
                  >
                    全部
                  </Button>
                </Space>
              }
              style={{
                background: colors.bgBase,
                borderColor: colors.border,
                color: colors.textPrimary,
                fontSize: 18,
              }}
            />

            {amount && parseFloat(amount) > maxUnstake && (
              <Text type="danger" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                超过可解押数量
              </Text>
            )}

            <div style={{ marginTop: 4, textAlign: 'right' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ≈ ${(parseFloat(amount || '0') * etrPrice).toFixed(2)} USD
              </Text>
            </div>
          </div>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{ marginTop: 8 }}
            />
          )}

          <Button
            type="primary"
            size="large"
            block
            disabled={
              !amount || 
              parseFloat(amount) <= 0 || 
              parseFloat(amount) > maxUnstake
            }
            onClick={handleConfirm}
            style={{
              height: 48,
              fontSize: 16,
              fontWeight: 500,
              background: colors.primary,
              borderColor: colors.primary,
              marginTop: 8,
            }}
          >
            下一步
          </Button>
        </Space>
      ) : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 确认信息 */}
          <div
            style={{
              background: colors.bgBase,
              borderRadius: 8,
              padding: 20,
            }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  解押数量
                </Text>
                <Text 
                  style={{ 
                    fontSize: 32, 
                    fontWeight: 700, 
                    color: colors.textPrimary,
                    fontFamily: 'JetBrains Mono, monospace',
                    display: 'block',
                  }}
                >
                  {formatAmount(amount)} ETR
                </Text>
                <Text type="secondary">
                  ≈ ${(parseFloat(amount) * etrPrice).toFixed(2)} USD
                </Text>
              </div>

              <Divider style={{ borderColor: colors.border, margin: '8px 0' }} />

              <Row justify="space-between">
                <Col>
                  <Text type="secondary" style={{ fontSize: 12 }}>质押记录</Text>
                </Col>
                <Col>
                  <Text style={{ fontSize: 12 }}>#{record.id}</Text>
                </Col>
              </Row>

              <Row justify="space-between">
                <Col>
                  <Text type="secondary" style={{ fontSize: 12 }}>解押后剩余解锁</Text>
                </Col>
                <Col>
                  <Text style={{ fontSize: 12 }}>
                    {(maxUnstake - parseFloat(amount)).toFixed(4)} ETR
                  </Text>
                </Col>
              </Row>

              <Row justify="space-between">
                <Col>
                  <Text type="secondary" style={{ fontSize: 12 }}>预计到账</Text>
                </Col>
                <Col>
                  <Text style={{ color: colors.success, fontSize: 12 }}>
                    ~{formatAmount(amount)} ETR
                  </Text>
                </Col>
              </Row>
            </Space>
          </div>

          <Alert
            message="注意"
            description="解押后资金将返回您的钱包，不再产生收益。确认后交易将在区块链上处理。"
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            style={{
              background: `${colors.warning}10`,
              borderColor: colors.warning,
            }}
          />

          <Row gutter={[12, 12]}>
            <Col span={12}>
              <Button
                size="large"
                block
                onClick={handleBack}
                disabled={isLoading}
                style={{
                  height: 48,
                  fontSize: 16,
                  background: colors.bgElevated,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                }}
              >
                返回
              </Button>
            </Col>
            <Col span={12}>
              <Button
                type="primary"
                size="large"
                block
                loading={isLoading}
                onClick={handleUnstake}
                style={{
                  height: 48,
                  fontSize: 16,
                  fontWeight: 500,
                  background: colors.primary,
                  borderColor: colors.primary,
                }}
              >
                确认解押
              </Button>
            </Col>
          </Row>
        </Space>
      )}
    </Modal>
  );
};

export default UnstakeModal;
