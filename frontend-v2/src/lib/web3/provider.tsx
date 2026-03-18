'use client';

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createWeb3Modal } from '@web3modal/wagmi';
import { wagmiConfig, projectId, chains } from './wagmi';
import { type ReactNode } from 'react';

// 创建 QueryClient 实例（组件外部，避免重复创建）
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

// 创建 Web3Modal 实例
if (projectId) {
  createWeb3Modal({
    wagmiConfig,
    projectId,
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
  });
}

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default Web3Provider;
