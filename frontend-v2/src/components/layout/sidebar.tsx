"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SettingsModal } from "@/components/settings-modal";
import { useI18n } from "@/lib/i18n";
import { 
  LayoutDashboard, 
  Wallet, 
  TrendingUp, 
  Gift, 
  Users,
  Settings
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const getNavItems = (t: ReturnType<typeof useI18n>['t']): NavItem[] => [
  { label: t.dashboard, href: "/", icon: <LayoutDashboard size={20} /> },
  { label: t.stake, href: "/stake", icon: <Wallet size={20} /> },
  { label: t.compound, href: "/compound", icon: <TrendingUp size={20} /> },
  { label: t.rewards, href: "/rewards", icon: <Gift size={20} /> },
  { label: t.referral, href: "/referral", icon: <Users size={20} /> },
];

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, isOpen = false, onClose }, ref) => {
    const pathname = usePathname();
    const { t } = useI18n();
    const navItems = getNavItems(t);
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    
    // 检测是否为桌面端
    const [isDesktop, setIsDesktop] = React.useState(false);
    
    React.useEffect(() => {
      const checkDesktop = () => {
        setIsDesktop(window.innerWidth >= 1024);
      };
      
      checkDesktop();
      window.addEventListener('resize', checkDesktop);
      return () => window.removeEventListener('resize', checkDesktop);
    }, []);

    // 桌面端始终显示，移动端通过 isOpen 控制
    const shouldShow = isDesktop || isOpen;

    return (
      <>
        {/* 移动端遮罩 */}
        <AnimatePresence>
          {isOpen && !isDesktop && (
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
          )}
        </AnimatePresence>
        
        {/* Sidebar */}
        <motion.aside
          ref={ref}
          className={cn(
            "fixed left-0 top-0 z-50 h-screen w-64 bg-[rgba(10,10,15,0.95)] backdrop-blur-xl border-r border-white/5",
            "flex flex-col",
            className
          )}
          initial={false}
          animate={{ 
            x: shouldShow ? 0 : -280, 
            opacity: shouldShow ? 1 : 0 
          }}
          transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] as const }}
        >
          {/* Logo */}
          <div className="p-6 border-b border-white/5">
            <Link href="/" className="flex items-center gap-3 group">
              <motion.div 
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f5ff] to-[#ff00ff] flex items-center justify-center"
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-black font-bold text-lg">E</span>
              </motion.div>
              <div>
                <h1 className="text-xl font-bold gradient-text-cyber">赤道ETR</h1>
                <p className="text-xs text-white/40">DeFi Platform</p>
              </div>
            </Link>
          </div>

          {/* 导航 */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item, index) => {
              const isActive = pathname === item.href;
              
              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
                      isActive 
                        ? "bg-[#00f5ff]/10 text-[#00f5ff] border border-[#00f5ff]/30 shadow-[0_0_20px_rgba(0,245,255,0.1)]"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                    onClick={() => onClose?.()}
                  >
                    <span className={cn(
                      "transition-colors",
                      isActive ? "text-[#00f5ff]" : "text-white/40 group-hover:text-white/60"
                    )}>
                      {item.icon}
                    </span>
                    <span className="font-medium">{item.label}</span>
                    
                    {isActive && (
                      <motion.div
                        className="absolute left-0 w-1 h-8 bg-gradient-to-b from-[#00f5ff] to-[#ff00ff] rounded-r-full"
                        layoutId="activeIndicator"
                      />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* 底部设置 */}
          <div className="p-4 border-t border-white/5">
            <button 
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings size={20} />
              <span className="font-medium">{t.settings}</span>
            </button>
          </div>

          {/* 设置弹窗 */}
          <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
          />
        </motion.aside>
      </>
    );
  }
);

Sidebar.displayName = "Sidebar";

export { Sidebar };
