/**
 * Wagmi v3 配置
 * 配置支持的链和连接器
 */
import { http, createConfig } from 'wagmi';
import { bsc, bscTestnet } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// WalletConnect Project ID - 请替换为真实的 Project ID
const PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'demo_project_id';

// 创建配置 - 使用标准 injected connector
// 它会自动检测浏览器注入的以太坊钱包 (MetaMask, TrustWallet, TokenPocket等)
export const wagmiConfig = createConfig({
  chains: [bsc, bscTestnet],
  connectors: [
    // 标准注入钱包连接器 - 自动检测所有浏览器钱包
    injected({
      shimDisconnect: true,
    }),
    // WalletConnect - 用于手机钱包
    walletConnect({
      projectId: PROJECT_ID,
      metadata: {
        name: '赤道ETR DAPP',
        description: '赤道ETR - 去中心化质押挖矿平台',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://etr.finance',
        icons: [typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : 'https://etr.finance/logo.png'],
      },
      showQrModal: true,
    }),
  ],
  transports: {
    [bsc.id]: http(),
    [bscTestnet.id]: http(),
  },
});

export { bsc, bscTestnet };
export default wagmiConfig;
