'use client';

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, shortenAddress } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/hooks";
import { Menu, Wallet, Copy, ExternalLink, ChevronDown, LogOut, Settings } from "lucide-react";
import { SettingsModal } from "@/components/settings-modal";

interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  onMenuClick?: () => void;
}

export const Header = React.forwardRef<HTMLDivElement, HeaderProps>(
  ({ className, onMenuClick }, ref) => {
    const [showDropdown, setShowDropdown] = React.useState(false);
    const [showSettingsModal, setShowSettingsModal] = React.useState(false);
    const { wallet, disconnect, openConnectModal } = useWallet();

    return (
      <>
        <motion.header
          ref={ref}
          className={cn(
            "fixed top-0 right-0 left-0 lg:left-64 z-30 h-16",
            "bg-[rgba(10,10,15,0.8)] backdrop-blur-xl border-b border-white/5",
            className
          )}
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as const }}
        >
        <div className="h-full px-4 lg:px-6 flex items-center justify-between">
          {/* 左侧 */}
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Menu size={24} />
            </button>
            
            <div className="hidden sm:block">
              <h2 className="text-lg font-semibold text-white">Dashboard</h2>
              <p className="text-xs text-white/40">欢迎回来</p>
            </div>
          </div>

          {/* 右侧 - 钱包连接 */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Settings size={20} />
            </button>
            {!wallet.isConnected ? (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Wallet size={18} />}
                onClick={openConnectModal}
                className="shadow-[0_0_20px_rgba(0,245,255,0.3)]"
              >
                连接钱包
              </Button>
            ) : (
              <div className="relative">
                <motion.button
                  className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[rgba(20,20,35,0.8)] border border-[#00f5ff]/30 hover:border-[#00f5ff]/50 transition-all"
                  onClick={() => setShowDropdown(!showDropdown)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00f5ff] to-[#ff00ff] flex items-center justify-center">
                    <Wallet size={16} className="text-black" />
                  </div>
                  
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-white">
                      {shortenAddress(wallet.address || "")}
                    </p>
                    <p className="text-xs text-white/50 font-mono">{wallet.etrBalance} ETR</p>
                  </div>
                  
                  <ChevronDown size={16} className="text-white/40" />
                </motion.button>

                {/* 下拉菜单 */}
                <AnimatePresence>
                  {showDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowDropdown(false)} 
                      />
                      <motion.div
                        className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-[rgba(20,20,35,0.98)] backdrop-blur-xl border border-white/10 shadow-2xl z-50 overflow-hidden"
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* 钱包信息 */}
                        <div className="p-4 border-b border-white/5">
                          <p className="text-xs text-white/40 mb-2">已连接钱包</p>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-mono text-white truncate pr-2">{wallet.address}</p>
                            <button 
                              className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors flex-shrink-0"
                              onClick={() => navigator.clipboard.writeText(wallet.address)}
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 rounded-lg bg-white/5">
                              <p className="text-xs text-white/40">ETR余额</p>
                              <p className="text-sm font-mono text-[#00f5ff]">{wallet.etrBalance}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-white/5">
                              <p className="text-xs text-white/40">BNB余额</p>
                              <p className="text-sm font-mono text-white">{wallet.balance}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* 操作菜单 */}
                        <div className="p-2">
                          <a 
                            href={`https://bscscan.com/address/${wallet.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <ExternalLink size={16} />
                            <span className="text-sm">在浏览器查看</span>
                          </a>
                          
                          <button 
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#ff3366] hover:bg-[#ff3366]/10 transition-colors"
                            onClick={() => {
                              disconnect();
                              setShowDropdown(false);
                            }}
                          >
                            <LogOut size={16} />
                            <span className="text-sm">断开连接</span>
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </motion.header>

      {/* 设置弹窗 */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </>
  );
});

Header.displayName = "Header";

export default Header;
