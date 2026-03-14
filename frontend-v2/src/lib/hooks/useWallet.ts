'use client';

import { useState, useCallback, useEffect } from 'react';
import { 
  useAccount, 
  useConnect, 
  useDisconnect, 
  useBalance, 
  useReadContract,
  useChainId,
  useSwitchChain,
} from 'wagmi';
import { ETRTokenABI } from '@/lib/abis/ETRToken';
import { getContractAddresses, USDT_ADDRESS, USDT_ADDRESS_TESTNET } from '@/lib/web3/contracts';

export type WalletType = 'metamask' | 'walletconnect';

export interface WalletInfo {
  address: string;
  shortAddress: string;
  balance: string;
  etrBalance: string;
  usdtBalance: string;
  chainId: number;
  isConnected: boolean;
  isConnecting: boolean;
}

const USDT_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function useWallet() {
  const { address, isConnected, isConnecting: isAccountConnecting } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { connect, connectors, isPending: isConnectPending } = useConnect();
  const { disconnect } = useDisconnect();
  
  // 获取原生代币(BNB)余额
  const { data: balanceData } = useBalance({
    address: address,
  });

  const contracts = getContractAddresses();
  
  // 获取ETR代币余额
  const { data: etrBalanceData, refetch: refetchEtrBalance } = useReadContract({
    address: contracts.ETRToken as `0x${string}`,
    abi: ETRTokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && contracts.ETRToken !== '0x...',
    },
  });

  // 获取USDT余额
  const usdtAddress = chainId === 56 ? USDT_ADDRESS : USDT_ADDRESS_TESTNET;
  const { data: usdtBalanceData, refetch: refetchUsdtBalance } = useReadContract({
    address: usdtAddress as `0x${string}`,
    abi: USDT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address,
    },
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);

  // 格式化地址显示
  const formatAddress = useCallback((addr: string | undefined): string => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }, []);

  // 格式化余额显示
  const formatBalance = useCallback((balance: bigint | undefined, decimals: number = 18): string => {
    if (!balance) return '0.00';
    const value = Number(balance) / Math.pow(10, decimals);
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }, []);

  // 钱包信息
  const wallet: WalletInfo = {
    address: address || '',
    shortAddress: formatAddress(address),
    balance: formatBalance(balanceData?.value, balanceData?.decimals),
    etrBalance: formatBalance(etrBalanceData, 18),
    usdtBalance: formatBalance(usdtBalanceData, 18),
    chainId: chainId || 0,
    isConnected,
    isConnecting: isAccountConnecting || isConnectPending,
  };

  // 连接钱包
  const connectWallet = useCallback(async (walletType: WalletType) => {
    try {
      setSelectedWallet(walletType);
      
      console.log('Available connectors:', connectors.map(c => ({ id: c.id, name: c.name })));
      
      const connector = connectors.find(c => {
        if (walletType === 'walletconnect') {
          return c.id === 'walletConnect';
        }
        // injected 支持所有浏览器钱包 (MetaMask, TrustWallet等)
        return c.id === 'injected';
      });

      if (!connector) {
        const availableIds = connectors.map(c => c.id).join(', ');
        throw new Error(`连接器未找到。可用连接器: ${availableIds}. 请确保已安装MetaMask或其他Web3钱包`);
      }

      console.log('Connecting with connector:', connector.id);
      await connect({ connector });
      setIsModalOpen(false);
    } catch (error) {
      console.error('连接钱包失败:', error);
      // 提供更友好的错误信息
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          throw new Error('用户取消了连接请求');
        } else if (error.message.includes('provider')) {
          throw new Error('未检测到Web3钱包，请安装MetaMask或TrustWallet');
        }
      }
      throw error;
    }
  }, [connect, connectors]);

  // 断开钱包连接
  const disconnectWallet = useCallback(() => {
    disconnect();
    setSelectedWallet(null);
  }, [disconnect]);

  // 打开连接弹窗
  const openConnectModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  // 关闭连接弹窗
  const closeConnectModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // 切换链
  const switchToChain = useCallback(async (targetChainId: number) => {
    if (switchChain) {
      await switchChain({ chainId: targetChainId });
    }
  }, [switchChain]);

  // 刷新余额
  const refreshBalances = useCallback(async () => {
    await refetchEtrBalance();
    await refetchUsdtBalance();
  }, [refetchEtrBalance, refetchUsdtBalance]);

  return {
    wallet,
    connect: connectWallet,
    disconnect: disconnectWallet,
    isModalOpen,
    openConnectModal,
    closeConnectModal,
    selectedWallet,
    switchToChain,
    refreshBalances,
  };
}

export default useWallet;
