/**
 * Wagmi v3 + Web3Modal v5 配置
 * 配置支持的链和钱包连接
 */
import { http, createConfig } from 'wagmi';
import { bsc, bscTestnet } from 'wagmi/chains';
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors';

// WalletConnect Project ID - 从环境变量获取
// 获取地址：https://cloud.walletconnect.com/
export const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || '';

if (!projectId) {
  console.warn('⚠️ WalletConnect Project ID 未配置，请在 .env.local 中设置 NEXT_PUBLIC_WC_PROJECT_ID');
}

// 项目元数据
const metadata = {
  name: '赤道ETR',
  description: '赤道ETR - 去中心化质押挖矿平台',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://etr.finance',
  icons: [typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : 'https://etr.finance/logo.png'],
};

// 支持的链
export const chains = [bsc, bscTestnet] as const;

// 创建 Wagmi 配置
export const wagmiConfig = createConfig({
  chains,
  connectors: [
    // WalletConnect 连接器
    walletConnect({
      projectId,
      metadata,
      showQrModal: false, // Web3Modal 会处理 QR 码显示
    }),
    // 浏览器注入钱包（MetaMask, Trust Wallet 等）
    injected({ shimDisconnect: true }),
    // Coinbase Wallet
    coinbaseWallet({
      appName: metadata.name,
      appLogoUrl: metadata.icons[0],
    }),
  ],
  transports: {
    [bsc.id]: http(),
    [bscTestnet.id]: http(),
  },
});

export { bsc, bscTestnet };
export default wagmiConfig;
