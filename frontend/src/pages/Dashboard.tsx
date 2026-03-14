import { 
  Wallet, 
  TrendingUp, 
  Shield, 
  Users, 
  Gift,
  Zap,
  Plus,
  ArrowRight
} from 'lucide-react';
import type { WalletInfo } from '../hooks/useWallet';

interface DashboardProps {
  wallet: WalletInfo;
  onConnect: () => void;
  onNavigate?: (page: string) => void;
}

const mockData = {
  etrBalance: 10000,
  stakedAmount: 5000,
  pendingRewards: 150.5,
  dailyROI: 0.45,
  totalEarned: 2500,
  referralCount: 12,
  compoundPool: 320.75,
};

export function Dashboard({ wallet, onConnect, onNavigate }: DashboardProps) {
  if (!wallet.isConnected) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="text-center py-20">
          <div className="relative inline-block mb-8">
            <div className="absolute inset-0 bg-orange-500 blur-[100px] opacity-30 animate-pulse"></div>
            <div className="relative w-28 h-28 mx-auto rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white font-bold text-5xl shadow-2xl shadow-orange-500/30">
              E
            </div>
          </div>
          
          <h1 className="text-5xl sm:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-400 bg-clip-text text-transparent">
              EQUATOR ETR
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            去中心化质押挖矿平台，享受每日
            <span className="text-orange-400 font-bold"> 0.3% - 0.6% </span>
            稳定收益
          </p>
          
          <button
            onClick={onConnect}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-orange-500/30 transition-all transform hover:scale-105"
          >
            <Wallet size={24} />
            连接钱包开始赚取
          </button>
          
          <p className="text-sm text-gray-500 mt-6">支持 MetaMask、TrustWallet、WalletConnect</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: TrendingUp, title: '稳定收益', desc: '日化收益0.3%-0.6%' },
            { icon: Shield, title: '安全保障', desc: '智能合约审计' },
            { icon: Users, title: '推荐奖励', desc: '最高180%奖励' },
            { icon: Gift, title: '复利增长', desc: '收益自动复利' },
          ].map((f) => (
            <div key={f.title} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-orange-500/30 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-yellow-500/20 flex items-center justify-center text-orange-400 mb-4 group-hover:scale-110 transition-transform">
                <f.icon size={28} />
              </div>
              <h3 className="font-bold text-lg mb-1">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">
            欢迎回来, <span className="bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">{wallet.shortAddress}</span>
          </h2>
          <p className="text-gray-400 mt-1">这是您今天的收益概览</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => onNavigate?.('stake')}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/30 transition-all"
          >
            <Zap size={18} />
            立即质押
          </button>
          <button
            onClick={() => onNavigate?.('rewards')}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/10 border border-white/10 rounded-xl font-semibold hover:bg-white/20 transition-all"
          >
            <Gift size={18} />
            领取收益
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-orange-500/30 transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
              <Wallet size={20} />
            </div>
            <span className="text-orange-400 text-sm font-bold">+5.2%</span>
          </div>
          <p className="text-gray-400 text-sm">ETR 余额</p>
          <p className="text-2xl font-bold mt-1">{mockData.etrBalance.toLocaleString()} ETR</p>
          <p className="text-gray-500 text-xs mt-1">≈ $2,500.00</p>
        </div>

        <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-orange-500/30 transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400">
              <Shield size={20} />
            </div>
          </div>
          <p className="text-gray-400 text-sm">质押金额</p>
          <p className="text-2xl font-bold mt-1">{mockData.stakedAmount.toLocaleString()} ETR</p>
          <p className="text-gray-500 text-xs mt-1">≈ $1,250.00</p>
        </div>

        <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-orange-500/30 transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
              <TrendingUp size={20} />
            </div>
            <span className="text-blue-400 text-sm font-bold">+0.75</span>
          </div>
          <p className="text-gray-400 text-sm">复利池</p>
          <p className="text-2xl font-bold mt-1">{mockData.compoundPool} ETR</p>
          <p className="text-gray-500 text-xs mt-1">日化 {mockData.dailyROI}%</p>
        </div>

        <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-orange-500/30 transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
              <Gift size={20} />
            </div>
            <span className="text-purple-400 text-sm font-bold">+2.5</span>
          </div>
          <p className="text-gray-400 text-sm">待领取收益</p>
          <p className="text-2xl font-bold mt-1">{mockData.pendingRewards} ETR</p>
          <p className="text-gray-500 text-xs mt-1">≈ $37.63</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white/5 border border-white/10">
          <h3 className="text-lg font-bold mb-6">快速操作</h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button
              onClick={() => onNavigate?.('stake')}
              className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-orange-500/30 transition-all group"
            >
              <Plus size={24} className="mx-auto mb-2 text-gray-400 group-hover:text-orange-400 transition-colors" />
              <span className="text-sm">质押ETR</span>
            </button>
            
            <button
              onClick={() => onNavigate?.('compound')}
              className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-orange-500/30 transition-all group"
            >
              <TrendingUp size={24} className="mx-auto mb-2 text-gray-400 group-hover:text-orange-400 transition-colors" />
              <span className="text-sm">复利池</span>
            </button>
            
            <button
              onClick={() => onNavigate?.('rewards')}
              className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-orange-500/30 transition-all group"
            >
              <Gift size={24} className="mx-auto mb-2 text-gray-400 group-hover:text-orange-400 transition-colors" />
              <span className="text-sm">领取收益</span>
            </button>
            
            <button
              onClick={() => onNavigate?.('records')}
              className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-orange-500/30 transition-all group"
            >
              <Wallet size={24} className="mx-auto mb-2 text-gray-400 group-hover:text-orange-400 transition-colors" />
              <span className="text-sm">我的质押</span>
            </button>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
          <h3 className="text-lg font-bold mb-6">收益统计</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">累计收益</span>
              <span className="text-green-400 font-mono font-bold">+{mockData.totalEarned} ETR</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-400">推荐人数</span>
              <span className="font-mono font-bold">{mockData.referralCount} 人</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-400">当前日化</span>
              <span className="text-orange-400 font-mono font-bold">{mockData.dailyROI}%</span>
            </div>
            
            <div className="pt-4">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full"></div>
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">距离下一等级还需质押 2,500 ETR</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-blue-500/10 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
              <Users className="text-white" size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold">推荐计划</h3>
              <p className="text-gray-400 text-sm">邀请好友赚取高达 180% 奖励</p>
            </div>
          </div>
          
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white/10 border border-white/10 rounded-xl font-semibold hover:bg-white/20 transition-all">
            查看详情
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
