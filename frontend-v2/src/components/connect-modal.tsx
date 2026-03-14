'use client';

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useConnect, useAccount, useConnectors } from 'wagmi';
import { Button } from "@/components/ui/button";
import { 
  X, 
  Wallet, 
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 钱包配置
const walletConfigs = [
  {
    id: 'metaMask',
    name: 'MetaMask',
    icon: '🦊',
    description: '最受欢迎的以太坊钱包',
    color: '#E2761B',
    rdns: 'io.metamask', // MetaMask 的 EIP-6963 RDNS
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    icon: '🔵',
    description: '币安官方钱包',
    color: '#3375BB',
    rdns: 'com.trustwallet.app',
  },
  {
    id: 'walletConnect',
    name: 'WalletConnect',
    icon: '🔗',
    description: '连接手机钱包',
    color: '#3B99FC',
  },
  {
    id: 'injected',
    name: '浏览器钱包',
    icon: '🌐',
    description: '其他浏览器插件钱包',
    color: '#00f5ff',
  },
];

export function ConnectModal({ isOpen, onClose }: ConnectModalProps) {
  const { connect, isPending, error } = useConnect();
  const { isConnected } = useAccount();
  const connectors = useConnectors();
  const [connectingId, setConnectingId] = React.useState<string | null>(null);
  const [debugInfo, setDebugInfo] = React.useState<string>('');

  // 连接成功后自动关闭
  React.useEffect(() => {
    if (isConnected && isOpen) {
      setTimeout(onClose, 1500);
    }
  }, [isConnected, isOpen, onClose]);

  // 调试：打印可用连接器
  React.useEffect(() => {
    if (isOpen) {
      console.log('=== 可用连接器 ===');
      connectors.forEach((c, i) => {
        console.log(`[${i}] id: ${c.id}, name: ${c.name}, type: ${c.type}`);
        // @ts-ignore
        console.log(`    rdns: ${c.rdns || 'N/A'}`);
      });
      console.log('==================');
    }
  }, [isOpen, connectors]);

  const handleConnect = async (walletId: string) => {
    setConnectingId(walletId);
    setDebugInfo('');
    
    console.log(`尝试连接钱包: ${walletId}`);
    console.log('可用 connectors:', connectors.map(c => ({ id: c.id, name: c.name })));

    let connector;

    if (walletId === 'walletConnect') {
      // WalletConnect
      connector = connectors.find(c => c.id === 'walletConnect');
    } else if (walletId === 'metaMask') {
      // 查找 MetaMask - 通过名称或 rdns
      connector = connectors.find(c => {
        const name = c.name?.toLowerCase() || '';
        // @ts-ignore
        const rdns = c.rdns?.toLowerCase() || '';
        return name.includes('metamask') || 
               name.includes('meta mask') ||
               rdns.includes('metamask') ||
               rdns === 'io.metamask';
      });
    } else if (walletId === 'trust') {
      // 查找 Trust Wallet
      connector = connectors.find(c => {
        const name = c.name?.toLowerCase() || '';
        // @ts-ignore
        const rdns = c.rdns?.toLowerCase() || '';
        return name.includes('trust') || rdns.includes('trust');
      });
    } else {
      // 其他浏览器钱包 - 使用第一个 injected
      connector = connectors.find(c => c.type === 'injected');
    }

    // 如果没有找到特定钱包，使用第一个 injected connector
    if (!connector) {
      connector = connectors.find(c => c.type === 'injected');
      console.log('未找到特定钱包，使用默认 injected connector');
    }

    if (connector) {
      console.log('找到 connector:', { id: connector.id, name: connector.name });
      try {
        await connect({ connector });
        console.log('连接成功');
      } catch (err: any) {
        console.error('连接失败:', err);
        setDebugInfo(err?.message || '连接失败');
      }
    } else {
      console.error('未找到任何可用连接器');
      const errorMsg = '未检测到钱包，请安装 MetaMask 或其他 Web3 钱包';
      setDebugInfo(errorMsg);
      // 尝试打开 MetaMask 下载页面
      if (walletId === 'metaMask') {
        window.open('https://metamask.io/download/', '_blank');
      }
    }
    
    setConnectingId(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 遮罩 */}
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* 弹窗 */}
          <motion.div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-[rgba(15,15,25,0.98)] backdrop-blur-xl rounded-3xl border border-[#00f5ff]/20 shadow-[0_0_60px_rgba(0,245,255,0.15)] overflow-hidden">
              {/* 头部 */}
              <div className="relative p-6 border-b border-white/5">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X size={20} />
                </button>
                
                <div className="text-center">
                  <h2 className="text-xl font-bold text-white mb-1">连接钱包</h2>
                  <p className="text-sm text-white/50">选择您要连接的钱包</p>
                </div>
              </div>

              {/* 钱包列表 */}
              <div className="p-4 space-y-2">
                {isConnected ? (
                  <motion.div
                    className="flex flex-col items-center py-8 text-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="w-16 h-16 rounded-full bg-[#00ff88]/20 flex items-center justify-center mb-4">
                      <CheckCircle size={32} className="text-[#00ff88]" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">连接成功！</h3>
                    <p className="text-sm text-white/50">正在跳转...</p>
                  </motion.div>
                ) : (
                  <>
                    {error && (
                      <motion.div
                        className="p-3 rounded-xl bg-[#ff3366]/10 border border-[#ff3366]/30 flex items-center gap-3 mb-4"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <AlertCircle size={20} className="text-[#ff3366] flex-shrink-0" />
                        <p className="text-sm text-[#ff3366]">
                          {error.message?.includes('User rejected') 
                            ? '用户取消了连接' 
                            : error.message || '连接失败，请重试'}
                        </p>
                      </motion.div>
                    )}

                    {debugInfo && (
                      <motion.div
                        className="p-3 rounded-xl bg-[#ffa500]/10 border border-[#ffa500]/30 text-sm text-[#ffa500] mb-4"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        调试信息: {debugInfo}
                      </motion.div>
                    )}

                    {walletConfigs.map((wallet, index) => {
                      const isConnecting = connectingId === wallet.id || (isPending && connectingId === wallet.id);
                      
                      return (
                        <motion.button
                          key={wallet.id}
                          className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#00f5ff]/50 hover:bg-[#00f5ff]/5 transition-all group"
                          onClick={() => handleConnect(wallet.id)}
                          disabled={isPending}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {/* 图标 */}
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                            style={{ 
                              backgroundColor: `${wallet.color}20`,
                              border: `1px solid ${wallet.color}40`
                            }}
                          >
                            {wallet.icon}
                          </div>

                          {/* 信息 */}
                          <div className="flex-1 text-left">
                            <h3 className="font-semibold text-white group-hover:text-[#00f5ff] transition-colors">
                              {wallet.name}
                            </h3>
                            <p className="text-sm text-white/40">{wallet.description}</p>
                          </div>

                          {/* 状态 */}
                          {isConnecting ? (
                            <Loader2 size={20} className="text-[#00f5ff] animate-spin" />
                          ) : (
                            <ArrowRight 
                              size={18} 
                              className="text-white/20 group-hover:text-[#00f5ff] transition-colors" 
                            />
                          )}
                        </motion.button>
                      );
                    })}
                  </>
                )}
              </div>

              {/* 底部提示 */}
              <div className="p-4 bg-white/5 border-t border-white/5">
                <p className="text-center text-xs text-white/30">
                  未安装钱包？
                  <span 
                    className="text-[#00f5ff]/70 hover:text-[#00f5ff] cursor-pointer ml-1"
                    onClick={() => window.open('https://metamask.io/download/', '_blank')}
                  >
                    下载 MetaMask
                  </span>
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ConnectModal;
