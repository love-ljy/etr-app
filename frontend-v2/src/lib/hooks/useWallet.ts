'use client';

import { useCallback } from 'react';
import {
  useAccount,
  useDisconnect,
  useBalance,
  useReadContract,
  useChainId,
  useSwitchChain,
} from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { ETRTokenABI } from '@/lib/abis/ETRToken';
import { getContractAddresses, USDT_ADDRESS, USDT_ADDRESS_TESTNET } from '@/lib/web3/contracts';

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

/**
 * 钱包连接 Hook - 集成 Web3Modal
 * 提供钱包连接、余额查询、链切换等功能
 */
export function useWallet() {
  const { address, isConnected, isConnecting } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const { open } = useWeb3Modal(); // Web3Modal hook

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
    isConnecting,
  };

  // 打开 Web3Modal 连接弹窗
  const openConnectModal = useCallback(() => {
    open();
  }, [open]);

  // 断开钱包连接
  const disconnectWallet = useCallback(() => {
    disconnect();
  }, [disconnect]);

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
    openConnectModal,
    disconnect: disconnectWallet,
    switchToChain,
    refreshBalances,
  };
}

export default useWallet;
