'use client';

import { type ReactNode } from 'react';
import { Web3Provider } from '@/lib/web3/provider';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * 客户端 Providers 组件
 * 在这里集中管理所有需要客户端环境的 Provider
 */
export function Providers({ children }: ProvidersProps) {
  return <Web3Provider>{children}</Web3Provider>;
}
