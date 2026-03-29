'use client';

import { type ReactNode } from 'react';
import { WagmiProvider, type State } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { wagmiAdapter, projectId, metadata, networks } from './wagmi';

// 创建 QueryClient 实例（组件外部，避免重复创建）
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

// 创建 AppKit 实例（客户端组件模块顶层执行）
// 由于文件有 'use client'，只会在客户端执行
const finalProjectId = projectId || 'placeholder_id_for_injected_wallets';

if (!projectId) {
  console.warn('⚠️ WalletConnect Project ID 未配置，WalletConnect 功能不可用，但浏览器钱包（MetaMask等）仍可使用');
}

createAppKit({
  adapters: [wagmiAdapter],
  projectId: finalProjectId,
  networks: networks as any, // 类型断言解决类型不匹配问题
  metadata,
  themeMode: 'dark', // 深色主题
  themeVariables: {
    '--w3m-accent': '#00f5ff', // 主题色 - 赤道ETR 青色
    '--w3m-border-radius-master': '12px',
  },
  featuredWalletIds: [
    // MetaMask
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
    // Trust Wallet
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
    // Coinbase Wallet
    'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa',
    // TokenPocket
    '20459438007b75f4f4acb98bf29aa3b800550309646d375da5fd4aac6c2a2c66',
  ],
  features: {
    analytics: false, // 关闭分析
  },
});

interface Web3ProviderProps {
  children: ReactNode;
  initialState?: State;
}

export function Web3Provider({ children, initialState }: Web3ProviderProps) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default Web3Provider;
