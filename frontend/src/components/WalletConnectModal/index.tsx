import React from 'react';
import { Modal, Button, Space, Typography } from 'antd';
import { 
  LinkOutlined, 
  GlobalOutlined,
  MobileOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { WalletType } from '../../hooks/useWallet';

const { Text, Title } = Typography;

interface WalletConnectModalProps {
  open: boolean;
  onCancel: () => void;
  onConnect: (walletType: WalletType) => void;
  loading?: boolean;
}

interface WalletOption {
  type: WalletType;
  name: string;
  icon: React.ReactNode;
  description: string;
  popular?: boolean;
}

const walletOptions: WalletOption[] = [
  {
    type: 'metamask',
    name: 'MetaMask',
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#E2761B"/>
        <path d="M20 8L12 14L14 20L20 24L26 20L28 14L20 8Z" fill="#fff"/>
        <path d="M12 14L10 18L14 20L12 14Z" fill="#CFCFCF"/>
        <path d="M28 14L30 18L26 20L28 14Z" fill="#CFCFCF"/>
        <path d="M14 20L20 24L20 32L14 26V20Z" fill="#E4761B"/>
        <path d="M26 20L20 24L20 32L26 26V20Z" fill="#E4761B"/>
      </svg>
    ),
    description: '最流行的浏览器钱包',
    popular: true,
  },
  {
    type: 'walletconnect',
    name: 'WalletConnect',
    icon: <GlobalOutlined style={{ fontSize: 40, color: '#3B99FC' }} />,
    description: '支持多种钱包连接',
  },
  {
    type: 'trustwallet',
    name: 'TrustWallet',
    icon: <MobileOutlined style={{ fontSize: 40, color: '#3375BB' }} />,
    description: '安全的移动端钱包',
  },
];

/**
 * 钱包连接弹窗组件
 */
export const WalletConnectModal: React.FC<WalletConnectModalProps> = ({
  open,
  onCancel,
  onConnect,
  loading = false,
}) => {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      centered
      width={420}
      styles={{
        body: { 
          padding: '24px',
          background: '#161B22',
        },
        header: { 
          background: '#161B22',
          borderBottom: '1px solid #30363D',
        },
        mask: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
        },
      }}
      closeIcon={<CloseOutlined style={{ color: '#8B949E' }} />}
      title={
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <Title level={4} style={{ margin: 0, color: '#F0F6FC', fontSize: 18 }}>
            <LinkOutlined style={{ marginRight: 8, color: '#F7931A' }} />
            连接钱包
          </Title>
          <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 4 }}>
            选择您要连接的钱包
          </Text>
        </div>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {walletOptions.map((wallet, index) => (
          <Button
            key={wallet.type}
            type="default"
            size="large"
            block
            loading={loading}
            onClick={() => onConnect(wallet.type)}
            className="btn-hover"
            style={{
              height: 'auto',
              minHeight: 76,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              background: wallet.popular ? 'linear-gradient(135deg, #F7931A10 0%, #FFB80010 100%)' : '#0D1117',
              border: wallet.popular ? '1px solid #F7931A40' : '1px solid #30363D',
              borderRadius: 12,
              position: 'relative',
              animation: `slideUp 0.3s ease-out ${index * 0.1}s both`,
            }}
          >
            {wallet.popular && (
              <div
                style={{
                  position: 'absolute',
                  top: -1,
                  right: 12,
                  background: '#F7931A',
                  color: '#fff',
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: '0 0 4px 4px',
                  fontWeight: 500,
                }}
              >
                推荐
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
              <div style={{ flexShrink: 0 }}>{wallet.icon}</div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 600, 
                  color: '#F0F6FC',
                  lineHeight: 1.4,
                }}
                >
                  {wallet.name}
                </div>
                <div style={{ 
                  fontSize: 12, 
                  color: '#8B949E',
                  lineHeight: 1.4,
                }}
                >
                  {wallet.description}
                </div>
              </div>
            </div>
          </Button>
        ))}
      </Space>

      <div style={{ 
        marginTop: 24, 
        padding: '14px 16px',
        background: '#0D1117',
        borderRadius: 8,
        border: '1px solid #30363D',
      }}>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center', lineHeight: 1.6 }}>
          连接即表示您同意我们的
          <a href="#" style={{ color: '#F7931A', textDecoration: 'none' }}> 服务条款</a>
          和
          <a href="#" style={{ color: '#F7931A', textDecoration: 'none' }}> 隐私政策</a>
        </Text>
      </div>
    </Modal>
  );
};

export default WalletConnectModal;
