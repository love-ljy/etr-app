import { useState } from 'react';
import { TrendingUp, Calculator, Wallet, Clock } from 'lucide-react';

export function CompoundPoolPage() {
  const [days, setDays] = useState(30);
  
  const poolData = {
    total: 155.75,
    accumulated: 5.25,
    yesterdayEarnings: 0.75,
    dailyROI: 0.5,
  };

  const calculateCompound = (principal: number, days: number, rate: number) => {
    return principal * Math.pow(1 + rate / 100, days);
  };

  const projectedAmount = calculateCompound(poolData.total, days, poolData.dailyROI);
  const projectedEarnings = projectedAmount - poolData.total;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">复利池</h2>
        <p className="text-gray-400">收益自动复利，财富指数增长</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
          <p className="text-gray-400 text-sm mb-2">复利池总额</p>
          <p className="text-2xl font-bold text-blue-400">{poolData.total} ETR</p>
          <p className="text-gray-500 text-xs mt-1">≈ $38.94</p>
        </div>
        
        <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
          <p className="text-gray-400 text-sm mb-2">累计收益</p>
          <p className="text-2xl font-bold text-green-400">{poolData.accumulated} ETR</p>
          <p className="text-gray-500 text-xs mt-1">已自动复利</p>
        </div>
        
        <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
          <p className="text-gray-400 text-sm mb-2">昨日收益</p>
          <p className="text-2xl font-bold text-orange-400">+{poolData.yesterdayEarnings} ETR</p>
          <p className="text-gray-500 text-xs mt-1">日化 {poolData.dailyROI}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Calculator size={20} />
            </div>
            <h3 className="font-bold">复利计算器</h3>
          </div>

          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">计算天数</span>
              <span className="font-bold">{days} 天</span>
            </div>
            <input
              type="range"
              min="1"
              max="365"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer"
            />
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">预计总额</span>
              <span className="text-2xl font-bold text-blue-400">{projectedAmount.toFixed(4)} ETR</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">预计收益</span>
              <span className="text-green-400 font-bold">+{projectedEarnings.toFixed(4)} ETR</span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
              <Clock size={20} />
            </div>
            <h3 className="font-bold">复利历史</h3>
          </div>

          <div className="space-y-3">
            {[
              { date: '今天', amount: '+0.75', balance: '155.75' },
              { date: '昨天', amount: '+0.74', balance: '155.00' },
              { date: '2天前', amount: '+0.74', balance: '154.26' },
              { date: '3天前', amount: '+0.73', balance: '153.52' },
            ].map((item, index) => (
              <div key={index} className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                <span className="text-gray-400 text-sm">{item.date}</span>
                <span className="text-green-400 font-bold">{item.amount} ETR</span>
                <span className="text-gray-500 text-sm">{item.balance}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 p-6 rounded-2xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="text-green-400" size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold">自动复利</h3>
              <p className="text-gray-400 text-sm">质押收益自动进入复利池，享受复利增长</p>
            </div>
          </div>
          
          <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-bold hover:shadow-lg hover:shadow-green-500/30 transition-all">
            <Wallet size={18} />
            提取复利
          </button>
        </div>
      </div>
    </div>
  );
}

export default CompoundPoolPage;
