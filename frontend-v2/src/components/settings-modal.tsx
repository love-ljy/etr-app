'use client';

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Moon, Sun, Globe, Bell, Shield, ChevronRight, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 设置项组件
function SettingItem({ 
  icon, 
  label, 
  description, 
  children,
  onClick,
  disabled = false
}: { 
  icon: React.ReactNode; 
  label: string; 
  description?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <div 
      className={`flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 
        ${onClick && !disabled ? 'cursor-pointer hover:bg-white/10' : ''} 
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        transition-colors`}
      onClick={onClick && !disabled ? onClick : undefined}
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#00f5ff]/10 flex items-center justify-center text-[#00f5ff]">
          {icon}
        </div>
        <div>
          <p className="text-white font-medium">{label}</p>
          {description && <p className="text-sm text-white/40">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// 开关组件
function Toggle({ checked, onChange, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
        checked
          ? 'bg-[#00f5ff] shadow-[0_0_12px_rgba(0,245,255,0.6)]'
          : 'bg-white/10 border border-white/20'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <motion.div
        className={`absolute top-1 w-5 h-5 rounded-full shadow-md transition-colors ${
          checked ? 'bg-black left-[calc(100%-24px)]' : 'bg-white/60 left-1'
        }`}
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

// 语言选择弹窗
function LanguageSelector({ 
  current, 
  onSelect, 
  onClose 
}: { 
  current: string; 
  onSelect: (lang: 'zh' | 'en') => void;
  onClose: () => void;
}) {
  const languages = [
    { code: 'zh' as const, name: '简体中文', flag: '🇨🇳' },
    { code: 'en' as const, name: 'English', flag: '🇺🇸' },
  ];

  return (
    <motion.div
      className="absolute inset-0 bg-[rgba(15,15,25,0.98)] z-10 p-6"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
    >
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={onClose}
          className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ChevronRight size={20} className="rotate-180" />
        </button>
        <h3 className="text-lg font-semibold text-white">选择语言</h3>
      </div>

      <div className="space-y-2">
        {languages.map((lang) => (
          <button
            key={lang.code}
            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-colors ${
              current === lang.code 
                ? 'bg-[#00f5ff]/10 border-[#00f5ff]/50' 
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
            onClick={() => onSelect(lang.code)}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{lang.flag}</span>
              <span className="text-white font-medium">{lang.name}</span>
            </div>
            {current === lang.code && (
              <div className="w-6 h-6 rounded-full bg-[#00f5ff] flex items-center justify-center">
                <Check size={14} className="text-black" />
              </div>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { lang, setLang } = useI18n();
  const [darkMode, setDarkMode] = React.useState(true);
  const [notifications, setNotifications] = React.useState(true);
  const [showLanguageSelector, setShowLanguageSelector] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  // 显示提示
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  // 切换深色模式
  const handleDarkModeChange = (value: boolean) => {
    setDarkMode(value);
    if (value) {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    }
    showToast(value ? (lang === 'zh' ? '已切换到深色模式' : 'Dark mode enabled') : (lang === 'zh' ? '已切换到浅色模式' : 'Light mode enabled'));
  };

  // 切换通知
  const handleNotificationChange = (value: boolean) => {
    setNotifications(value);
    localStorage.setItem('notifications', value ? 'on' : 'off');
    showToast(value ? '通知已开启' : '通知已关闭');
  };

  // 切换语言
  const handleLanguageChange = (l: 'zh' | 'en') => {
    setLang(l);
    showToast(l === 'zh' ? '已切换到简体中文' : 'Switched to English');
    setShowLanguageSelector(false);
  };

  // 导出助记词（演示功能）
  const handleExportMnemonic = () => {
    alert('⚠️ 安全提示\n\n导出助记词存在安全风险，请确保：\n1. 周围环境安全，无人窥视\n2. 不要截图或拍照保存\n3. 手写在纸上并妥善保管\n\n此功能需要钱包连接验证。');
  };

  // 加载本地存储的设置
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const savedNotif = localStorage.getItem('notifications');
    
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
      if (savedTheme === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
    }
    
    if (savedNotif) {
      setNotifications(savedNotif === 'on');
    }
  }, []);

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
            <div className="relative bg-[rgba(15,15,25,0.98)] backdrop-blur-xl rounded-3xl border border-[#00f5ff]/20 shadow-[0_0_60px_rgba(0,245,255,0.15)] overflow-hidden max-h-[80vh] flex flex-col">
              {/* Toast 提示 */}
              <AnimatePresence>
                {toast && (
                  <motion.div
                    className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-[#00f5ff]/20 border border-[#00f5ff]/50 text-[#00f5ff] text-sm font-medium"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    {toast}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 语言选择器 */}
              <AnimatePresence>
                {showLanguageSelector && (
                  <LanguageSelector
                    current={lang}
                    onSelect={handleLanguageChange}
                    onClose={() => setShowLanguageSelector(false)}
                  />
                )}
              </AnimatePresence>

              {/* 头部 */}
              <div className="relative p-6 border-b border-white/5 flex-shrink-0">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X size={20} />
                </button>
                
                <div className="text-center">
                  <h2 className="text-xl font-bold text-white mb-1">设置</h2>
                  <p className="text-sm text-white/50">自定义您的体验</p>
                </div>
              </div>

              {/* 设置列表 */}
              <div className="p-4 space-y-3 overflow-y-auto">
                {/* 主题设置 */}
                <SettingItem
                  icon={darkMode ? <Moon size={20} /> : <Sun size={20} />}
                  label={lang === 'zh' ? '深色模式' : 'Dark Mode'}
                  description={lang === 'zh' ? '切换浅色/深色主题' : 'Toggle light/dark theme'}
                >
                  <Toggle checked={darkMode} onChange={handleDarkModeChange} />
                </SettingItem>

                {/* 通知设置 */}
                <SettingItem
                  icon={<Bell size={20} />}
                  label={lang === 'zh' ? '通知' : 'Notifications'}
                  description={lang === 'zh' ? '接收收益和奖励提醒' : 'Receive earnings and reward alerts'}
                >
                  <Toggle checked={notifications} onChange={handleNotificationChange} />
                </SettingItem>

                {/* 语言设置 */}
                <SettingItem
                  icon={<Globe size={20} />}
                  label={lang === 'zh' ? '语言' : 'Language'}
                  description={lang === 'zh' ? '简体中文' : 'English'}
                  onClick={() => setShowLanguageSelector(true)}
                >
                  <div className="flex items-center gap-2 text-white/40">
                    <span className="text-sm">{lang === 'zh' ? '中文' : 'EN'}</span>
                    <ChevronRight size={20} />
                  </div>
                </SettingItem>

                {/* 安全设置 */}
                <div className="pt-4 border-t border-white/5">
                  <p className="text-xs text-white/40 mb-3 px-1">{lang === 'zh' ? '安全' : 'Security'}</p>
                  <div className="space-y-3">
                    <SettingItem
                      icon={<Shield size={20} />}
                      label={lang === 'zh' ? '导出助记词' : 'Export Mnemonic'}
                      description={lang === 'zh' ? '备份您的钱包' : 'Backup your wallet'}
                      onClick={handleExportMnemonic}
                    >
                      <ChevronRight size={20} className="text-white/40" />
                    </SettingItem>
                  </div>
                </div>

                {/* 关于 */}
                <div className="pt-4 border-t border-white/5">
                  <p className="text-xs text-white/40 mb-3 px-1">{lang === 'zh' ? '关于' : 'About'}</p>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                    <p className="text-white font-medium mb-1">赤道ETR DeFi Platform</p>
                    <p className="text-sm text-white/40">v0.1.0-beta</p>
                    <p className="text-xs text-white/30 mt-2">
                      {lang === 'zh' ? '构建时间: ' : 'Build: '}
                      2026-03-12
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default SettingsModal;
