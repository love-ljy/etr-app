/**
 * Wagmi v3 + Reown AppKit 配置
 * 配置支持的链和钱包连接
 * 支持 Next.js SSR
 */
import { cookieStorage, createStorage } from '@wagmi/core';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { bsc, bscTestnet } from '@reown/appkit/networks';

// WalletConnect Project ID - 从环境变量获取
// 获取地址：https://cloud.walletconnect.com/
export const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || '';

if (!projectId) {
  console.warn('⚠️ WalletConnect Project ID 未配置，请在 .env.local 中设置 NEXT_PUBLIC_WC_PROJECT_ID');
}

// 项目元数据
export const metadata = {
  name: '赤道ETR',
  description: '赤道ETR - 去中心化质押挖矿平台',
  url: 'https://etr.finance',
  icons: ['https://etr.finance/logo.png'],
};

// 支持的链（AppKit networks）
export const networks = [bsc, bscTestnet];

// 创建 Wagmi Adapter（支持 SSR）
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId,
  networks,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

export { bsc, bscTestnet };
export default wagmiConfig;
