import { useState, useEffect } from 'react';
import { 
  Wallet, 
  Home, 
  PlusCircle, 
  List, 
  Gift, 
  History,
  TrendingUp,
  LogOut,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { useWallet } from './hooks/useWallet';
import { Dashboard } from './pages/Dashboard';
import { StakePage } from './pages/Stake';
import { RewardsPage } from './pages/Rewards';
import { CompoundPoolPage } from './pages/CompoundPool';
import type { WalletType } from './hooks/useWallet';

type PageType = 'dashboard' | 'stake' | 'records' | 'rewards' | 'rewards-history' | 'compound';

const menuItems = [
  { key: 'dashboard', icon: Home, label: '首页' },
  { key: 'stake', icon: PlusCircle, label: '质押' },
  { key: 'records', icon: List, label: '我的质押' },
  { key: 'compound', icon: TrendingUp, label: '复利池' },
  { key: 'rewards', icon: Gift, label: '收益' },
  { key: 'rewards-history', icon: History, label: '收益明细' },
];

export default function App() {
  const { wallet, connect, disconnect, isModalOpen, openConnectModal, closeConnectModal } = useWallet();
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleConnect = async (walletType: WalletType) => {
    try {
      await connect(walletType);
      closeConnectModal();
    } catch (error) {
      console.error('连接失败:', error);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard wallet={wallet} onConnect={openConnectModal} onNavigate={setCurrentPage} />;
      case 'stake':
        return <StakePage />;
      case 'rewards':
        return <RewardsPage />;
      case 'compound':
        return <CompoundPoolPage />;
      default:
        return <Dashboard wallet={wallet} onConnect={openConnectModal} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans">
      {/* 背景效果 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[128px]"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px]"></div>
      </div>

      {/* 顶部导航 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            {wallet.isConnected && (
              <button 
                className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-orange-500/30">
                E
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-lg tracking-wider">
                  <span className="bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">EQUATOR</span>
                </h1>
                <p className="text-xs text-gray-500 -mt-0.5">ETR FINANCE</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!wallet.isConnected ? (
              <button
                onClick={openConnectModal}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-orange-500/30 transition-all"
              >
                <Wallet size={18} />
                <span className="hidden sm:inline">连接钱包</span>
              </button>
            ) : (
              <>
                <div className="hidden md:flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-xs font-bold">E</div>
                    <span className="font-mono font-bold text-sm">{wallet.etrBalance}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold">$</div>
                    <span className="font-mono font-bold text-sm">{wallet.usdtBalance}</span>
                  </div>
                </div>
                
                <button
                  onClick={disconnect}
                  className="p-2.5 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-colors"
                >
                  <LogOut size={20} />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 主布局 */}
      <div className="pt-16 flex">
        {/* 侧边栏 */}
        {wallet.isConnected && (
          <>
            {/* 桌面端 */}
            <aside className="hidden lg:block w-64 min-h-[calc(100vh-64px)] border-r border-white/10 bg-[#0a0a0f]/50 backdrop-blur-xl">
              <nav className="p-4 space-y-1">
                {menuItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setCurrentPage(item.key as PageType)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      currentPage === item.key
                        ? 'bg-gradient-to-r from-orange-500/20 to-yellow-500/20 text-orange-400 border border-orange-500/30'
                        : 'hover:bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    <item.icon size={20} />
                    <span className="font-medium">{item.label}</span>
                    {currentPage === item.key && <ChevronRight size={16} className="ml-auto" />}
                  </button>
                ))}
              </nav>

              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-xs text-gray-500 mb-1">已连接</p>
                  <p className="font-mono text-sm font-bold truncate">{wallet.shortAddress}</p>
                </div>
              </div>
            </aside>

            {/* 移动端菜单 */}
            {mobileMenuOpen && (
              <div className="lg:hidden fixed inset-0 z-40">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
                <aside className="absolute left-0 top-16 bottom-0 w-64 bg-[#12121a] border-r border-white/10">
                  <nav className="p-4 space-y-1">
                    {menuItems.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => {
                          setCurrentPage(item.key as PageType);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                          currentPage === item.key
                            ? 'bg-gradient-to-r from-orange-500/20 to-yellow-500/20 text-orange-400'
                            : 'hover:bg-white/5 text-gray-400'
                        }`}
                      >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </nav>
                </aside>
              </div>
            )}
          </>
        )}

        {/* 主内容 */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {renderPage()}
        </main>
      </div>

      {/* 钱包连接弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeConnectModal} />
          
          <div className="relative w-full max-w-md bg-[#12121a] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <button 
              onClick={closeConnectModal}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-2xl font-bold mb-2">
              <span className="bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">连接钱包</span>
            </h2>
            <p className="text-gray-400 mb-6">选择您要连接的钱包</p>
            
            <div className="space-y-3">
              {[
                { type: 'metamask', name: 'MetaMask', icon: '🦊', desc: '最流行的浏览器钱包' },
                { type: 'walletconnect', name: 'WalletConnect', icon: '🔗', desc: '支持多种钱包' },
                { type: 'trustwallet', name: 'TrustWallet', icon: '🛡️', desc: '安全的移动端钱包' },
              ].map((w) => (
                <button
                  key={w.type}
                  onClick={() => handleConnect(w.type as WalletType)}
                  className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-orange-500/50 rounded-xl transition-all"
                >
                  <span className="text-3xl">{w.icon}</span>
                  <div className="text-left">
                    <p className="font-bold">{w.name}</p>
                    <p className="text-xs text-gray-500">{w.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
