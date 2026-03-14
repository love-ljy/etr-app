'use client';

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/lib/hooks";
import { Wallet, ArrowRight, Shield, Zap, Globe, AlertCircle, Check } from "lucide-react";
import Link from "next/link";

// 3D浮动动画
const floatingAnimation = {
  y: [0, -10, 0],
  rotateX: [0, 2, 0],
  rotateY: [0, 3, 0],
  transition: {
    duration: 6,
    repeat: Infinity,
    ease: "easeInOut" as const
  }
};

// 呼吸动画
const breatheAnimation = {
  scale: [1, 1.02, 1],
  boxShadow: [
    "0 0 20px rgba(0, 245, 255, 0.3)",
    "0 0 40px rgba(0, 245, 255, 0.5)",
    "0 0 20px rgba(0, 245, 255, 0.3)"
  ],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut" as const
  }
};

// 钱包选项
const walletOptions = [
  {
    id: 'metamask' as const,
    name: "MetaMask",
    icon: "🦊",
    description: "最流行的以太坊钱包",
    popular: true,
  },
  {
    id: 'walletconnect' as const,
    name: "WalletConnect",
    icon: "🔗",
    description: "连接移动钱包",
    popular: false,
  },
];

// 特性列表
const features = [
  { icon: <Shield size={20} />, text: "安全的智能合约" },
  { icon: <Zap size={20} />, text: "高收益质押" },
  { icon: <Globe size={20} />, text: "全球用户信赖" },
];

export default function ConnectWalletPage() {
  const { wallet, connect, isModalOpen, openConnectModal, closeConnectModal } = useWallet();
  const [selectedWallet, setSelectedWallet] = React.useState<typeof walletOptions[0]["id"] | null>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);
  const [connectionSuccess, setConnectionSuccess] = React.useState(false);

  // 自动打开连接弹窗
  React.useEffect(() => {
    openConnectModal();
  }, [openConnectModal]);

  const handleConnect = async (walletType: typeof walletOptions[0]["id"]) => {
    setSelectedWallet(walletType);
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      await connect(walletType);
      setConnectionSuccess(true);
      
      // 2秒后跳转到首页
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (err) {
      setConnectionError(err instanceof Error ? err.message : '连接失败，请重试');
      setIsConnecting(false);
    }
  };

  // 如果已连接，显示已连接状态
  if (wallet.isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        {/* 背景效果 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00f5ff]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#ff00ff]/5 rounded-full blur-3xl" />
        </div>

        <motion.div
          className="relative z-10 w-full max-w-md text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00ff88] to-[#00d474] flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(0,255,136,0.4)]">
            <Check size={40} className="text-black" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">钱包已连接</h2>
          <p className="text-white/50 mb-6">{wallet.shortAddress}</p>
          
          <Link href="/">
            <Button variant="primary" size="lg" rightIcon={<ArrowRight size={18} />}>
              进入 Dashboard
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景效果 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00f5ff]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#ff00ff]/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-[#00f5ff]/3 to-transparent rounded-full" />
      </div>

      {/* 内容 */}
      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] }}
      >
        {/* Logo */}
        <motion.div 
          className="flex flex-col items-center mb-8"
          animate={floatingAnimation}
        >
          <motion.div 
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00f5ff] to-[#ff00ff] flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(0,245,255,0.4)]"
            animate={breatheAnimation}
          >
            <span className="text-black font-bold text-3xl">E</span>
          </motion.div>
          
          <h1 className="text-3xl font-bold gradient-text-cyber mb-2">赤道ETR</h1>
          <p className="text-white/50">连接钱包开始您的DeFi之旅</p>
        </motion.div>

        {/* 连接卡片 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Card variant="neon" className="overflow-hidden" isHoverable={false}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">选择钱包</h2>
                <Badge variant="cyan">Web3</Badge>
              </div>

              {/* 错误提示 */}
              <AnimatePresence>
                {connectionError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 p-3 rounded-lg bg-[#ff3366]/10 border border-[#ff3366]/30 flex items-center gap-2"
                  >
                    <AlertCircle size={16} className="text-[#ff3366]" />
                    <span className="text-sm text-[#ff3366]">{connectionError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-3">
                {walletOptions.map((wallet, index) => (
                  <motion.button
                    key={wallet.id}
                    className={`
                      w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-300
                      ${selectedWallet === wallet.id && isConnecting
                        ? "bg-[#00f5ff]/10 border-[#00f5ff]/50 shadow-[0_0_20px_rgba(0,245,255,0.2)]" 
                        : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                      }
                      ${isConnecting ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
                    `}
                    onClick={() => !isConnecting && handleConnect(wallet.id)}
                    disabled={isConnecting}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    whileHover={!isConnecting ? { scale: 1.02 } : {}}
                    whileTap={!isConnecting ? { scale: 0.98 } : {}}
                  >
                    <span className="text-2xl">{wallet.icon}</span>
                    
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{wallet.name}</span>
                        {wallet.popular && (
                          <Badge variant="magenta" className="text-[10px] px-2 py-0">热门</Badge>
                        )}
                      </div>
                      <p className="text-sm text-white/40">{wallet.description}</p>
                    </div>
                    
                    {selectedWallet === wallet.id && isConnecting ? (
                      <motion.div
                        className="w-5 h-5 border-2 border-[#00f5ff] border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <ArrowRight 
                        size={18} 
                        className="text-white/30" 
                      />
                    )}
                  </motion.button>
                ))}
              </div>

              {/* 连接状态 */}
              <AnimatePresence>
                {isConnecting && (
                  <motion.div
                    className="mt-6 flex items-center justify-center gap-3 text-[#00f5ff]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <span className="text-sm">正在连接 {walletOptions.find(w => w.id === selectedWallet)?.name}...</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>
        </motion.div>

        {/* 特性 */}
        <motion.div 
          className="mt-8 grid grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="flex flex-col items-center gap-2 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#00f5ff]">
                {feature.icon}
              </div>
              <span className="text-xs text-white/50">{feature.text}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* 底部提示 */}
        <motion.p 
          className="mt-8 text-center text-sm text-white/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          连接即表示您同意我们的
          <a href="#" className="text-[#00f5ff]/70 hover:text-[#00f5ff] transition-colors">服务条款</a>
          和
          <a href="#" className="text-[#00f5ff]/70 hover:text-[#00f5ff] transition-colors">隐私政策</a>
        </motion.p>

        {/* 返回首页 */}
        <motion.div
          className="mt-4 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <Link href="/" className="text-sm text-white/40 hover:text-white transition-colors">
            ← 返回首页
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
