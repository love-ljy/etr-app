import { useState } from 'react';
import { 
  Calculator, 
  Shield, 
  Clock, 
  Percent,
  ArrowRight,
  Wallet
} from 'lucide-react';

export function StakePage() {
  const [amount, setAmount] = useState('');
  const [activeTab, setActiveTab] = useState('stake');

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">质押 ETR</h2>
        <p className="text-gray-400">质押ETR代币，享受每日0.3%-0.6%的稳定收益</p>
      </div>

      <div className="flex gap-2 mb-6">
        {['stake', 'buy'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              activeTab === tab
                ? 'bg-gradient-to-r from-orange-500 to-yellow-500'
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {tab === 'stake' ? '质押ETR' : '用USDT购买'}
          </button>
        ))}
      </div>

      <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-gray-400">输入质押数量</span>
            <span className="text-gray-400 text-sm">可用: 10,000 ETR</span>
          </div>
          
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-2xl font-bold focus:outline-none focus:border-orange-500/50"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-orange-400 font-bold">ETR</span>
              <button className="text-sm text-orange-400 hover:text-orange-300">全部</button>
            </div>
          </div>
          
          <p className="text-right text-gray-500 text-sm mt-1">≈ ${(parseFloat(amount || '0') * 0.25).toFixed(2)} USD</p>
        </div>

        <div className="p-4 rounded-xl bg-white/5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400">
              <Calculator size={20} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="text-gray-400">预估日收益</span>
                <span className="text-green-400 font-bold text-xl">+{(parseFloat(amount || '0') * 0.0045).toFixed(4)} ETR</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">当前日化收益率</span>
            <span className="text-orange-400">0.45%</span>
          </div>
        </div>

        <button className="w-full py-4 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-orange-500/30 transition-all">
          确认质押
        </button>
      </div>

      <div className="mt-6 p-6 rounded-2xl bg-white/5 border border-white/10">
        <h3 className="font-bold mb-4">质押规则</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: Clock, title: '50天锁仓', desc: '质押后资金锁定50天' },
            { icon: Percent, title: '每日解锁2%', desc: '每天释放2%本金' },
            { icon: Calculator, title: '24小时结算', desc: '按个人时间结算' },
            { icon: Shield, title: '有效持仓≥$100', desc: '持仓价值需≥100美元' },
          ].map((rule) => (
            <div key={rule.title} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 flex-shrink-0">
                <rule.icon size={20} />
              </div>
              <div>
                <p className="font-semibold text-sm">{rule.title}</p>
                <p className="text-gray-400 text-xs">{rule.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StakePage;
