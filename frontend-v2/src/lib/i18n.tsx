// 多语言配置
export type Language = 'zh' | 'en';

export interface Translations {
  // 通用
  connectWallet: string;
  disconnect: string;
  loading: string;
  confirm: string;
  cancel: string;
  close: string;
  
  // 导航
  dashboard: string;
  stake: string;
  compound: string;
  rewards: string;
  referral: string;
  settings: string;
  
  // Dashboard
  totalAssets: string;
  availableBalance: string;
  stakedAmount: string;
  compoundBalance: string;
  pendingRewards: string;
  quickActions: string;
  
  // Stake
  stakeETR: string;
  unstake: string;
  stakeAmount: string;
  unlockTime: string;
  apy: string;
  lockPeriod: string;
  expectedReward: string;
  stakeRecords: string;
  
  // Compound
  compoundPool: string;
  deposit: string;
  claim: string;
  transfer: string;
  dailyRate: string;
  totalEarned: string;
  
  // Rewards
  claimRewards: string;
  referralRewards: string;
  dividendRewards: string;
  totalEarnedRewards: string;
  
  // Referral
  referralLink: string;
  referralCode: string;
  copyLink: string;
  bindReferrer: string;
  directReferrals: string;
  indirectReferrals: string;
  
  // Settings
  darkMode: string;
  notifications: string;
  language: string;
  exportMnemonic: string;
}

export const translations: Record<Language, Translations> = {
  zh: {
    connectWallet: '连接钱包',
    disconnect: '断开连接',
    loading: '加载中...',
    confirm: '确认',
    cancel: '取消',
    close: '关闭',
    
    dashboard: '首页',
    stake: '质押',
    compound: '复利',
    rewards: '收益',
    referral: '推荐',
    settings: '设置',
    
    totalAssets: '总资产',
    availableBalance: '可用余额',
    stakedAmount: '已质押',
    compoundBalance: '复利池',
    pendingRewards: '待领取收益',
    quickActions: '快速操作',
    
    stakeETR: '质押 ETR',
    unstake: '解押',
    stakeAmount: '质押数量',
    unlockTime: '解锁时间',
    apy: '年化收益率',
    lockPeriod: '锁仓周期',
    expectedReward: '预期收益',
    stakeRecords: '质押记录',
    
    compoundPool: '复利池',
    deposit: '存入',
    claim: '提取',
    transfer: '划转',
    dailyRate: '日化收益率',
    totalEarned: '累计收益',
    
    claimRewards: '领取收益',
    referralRewards: '推荐收益',
    dividendRewards: '分红收益',
    totalEarnedRewards: '累计收益',
    
    referralLink: '推荐链接',
    referralCode: '推荐码',
    copyLink: '复制链接',
    bindReferrer: '绑定推荐人',
    directReferrals: '直推人数',
    indirectReferrals: '间推人数',
    
    darkMode: '深色模式',
    notifications: '通知',
    language: '语言',
    exportMnemonic: '导出助记词',
  },
  en: {
    connectWallet: 'Connect Wallet',
    disconnect: 'Disconnect',
    loading: 'Loading...',
    confirm: 'Confirm',
    cancel: 'Cancel',
    close: 'Close',
    
    dashboard: 'Dashboard',
    stake: 'Stake',
    compound: 'Compound',
    rewards: 'Rewards',
    referral: 'Referral',
    settings: 'Settings',
    
    totalAssets: 'Total Assets',
    availableBalance: 'Available Balance',
    stakedAmount: 'Staked Amount',
    compoundBalance: 'Compound Balance',
    pendingRewards: 'Pending Rewards',
    quickActions: 'Quick Actions',
    
    stakeETR: 'Stake ETR',
    unstake: 'Unstake',
    stakeAmount: 'Stake Amount',
    unlockTime: 'Unlock Time',
    apy: 'APY',
    lockPeriod: 'Lock Period',
    expectedReward: 'Expected Reward',
    stakeRecords: 'Stake Records',
    
    compoundPool: 'Compound Pool',
    deposit: 'Deposit',
    claim: 'Claim',
    transfer: 'Transfer',
    dailyRate: 'Daily Rate',
    totalEarned: 'Total Earned',
    
    claimRewards: 'Claim Rewards',
    referralRewards: 'Referral Rewards',
    dividendRewards: 'Dividend Rewards',
    totalEarnedRewards: 'Total Earned',
    
    referralLink: 'Referral Link',
    referralCode: 'Referral Code',
    copyLink: 'Copy Link',
    bindReferrer: 'Bind Referrer',
    directReferrals: 'Direct Referrals',
    indirectReferrals: 'Indirect Referrals',
    
    darkMode: 'Dark Mode',
    notifications: 'Notifications',
    language: 'Language',
    exportMnemonic: 'Export Mnemonic',
  },
};

// 获取当前语言
export function getCurrentLanguage(): Language {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('language') as Language) || 'zh';
  }
  return 'zh';
}

// 获取翻译
export function t(key: keyof Translations): string {
  const lang = getCurrentLanguage();
  return translations[lang][key];
}

// 全局语言 Context
import React from 'react';

export const LanguageContext = React.createContext<{
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
}>({ lang: 'zh', setLang: () => {}, t: translations.zh });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = React.useState<Language>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('language') as Language) || 'zh';
    }
    return 'zh';
  });
  const handleSetLang = (l: Language) => {
    setLang(l);
    localStorage.setItem('language', l);
  };
  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useI18n = () => React.useContext(LanguageContext);
