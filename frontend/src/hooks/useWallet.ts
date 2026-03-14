import { useState, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance, useReadContract } from 'wagmi';
import { ETRTokenABI } from '../abis/ETRToken';
import { getContractAddresses } from '../utils/contracts';

/**
 * 钱包类型定义
 */
export type WalletType = 'metamask' | 'trustwallet' | 'walletconnect';

/**
 * 钱包信息接口
 */
export interface WalletInfo {
  address: string;
  shortAddress: string;
  balance: string;
  etrBalance: string;
  usdtBalance: string;
  balanceUSD?: string;
  chainId: number;
  isConnected: boolean;
  isConnecting: boolean;
}

// USDT合约地址 (BSC主网)
const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';

/**
 * 使用钱包连接 Hook
 * 支持 MetaMask, TrustWallet, WalletConnect
 * 
 * @example
 * const { 
 *   wallet, 
 *   connect, 
 *   disconnect, 
 *   isModalOpen, 
 *   setIsModalOpen 
 * } = useWallet();
 */
export const useWallet = () => {
  const { address, isConnected, isConnecting: isAccountConnecting, chainId } = useAccount();
  const { connect, connectors, isPending: isConnectPending } = useConnect();
  const { disconnect } = useDisconnect();
  
  // 获取原生代币(BNB)余额
  const { data: balanceData } = useBalance({
    address: address,
  });

  // 获取ETR代币余额
  const contracts = getContractAddresses();
  const { data: etrBalanceData } = useReadContract({
    address: contracts.ETRToken as `0x${string}`,
    abi: ETRTokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && contracts.ETRToken !== '0x...',
    },
  });

  // 获取USDT余额
  const { data: usdtBalanceData } = useReadContract({
    address: USDT_ADDRESS,
    abi: [{
      "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
      "name": "balanceOf",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    }],
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
    return value.toFixed(4);
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

  /**
   * 连接钱包
   * @param walletType 钱包类型
   */
  const connectWallet = useCallback(async (walletType: WalletType) => {
    try {
      setSelectedWallet(walletType);
      
      // 找到对应的connector
      const connector = connectors.find(c => {
        if (walletType === 'walletconnect') {
          return c.id === 'walletConnect';
        }
        return c.id === 'injected';
      });

      if (!connector) {
        throw new Error('连接器未找到，请检查配置');
      }

      await connect({ connector });
      setIsModalOpen(false);
    } catch (error) {
      console.error('连接钱包失败:', error);
      throw error;
    }
  }, [connect, connectors]);

  /**
   * 断开钱包连接
   */
  const disconnectWallet = useCallback(() => {
    disconnect();
    setSelectedWallet(null);
  }, [disconnect]);

  /**
   * 打开连接弹窗
   */
  const openConnectModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  /**
   * 关闭连接弹窗
   */
  const closeConnectModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return {
    // 钱包信息
    wallet,
    // 连接方法
    connect: connectWallet,
    disconnect: disconnectWallet,
    // 弹窗控制
    isModalOpen,
    openConnectModal,
    closeConnectModal,
    // 当前选中的钱包类型
    selectedWallet,
  };
};

export default useWallet;
