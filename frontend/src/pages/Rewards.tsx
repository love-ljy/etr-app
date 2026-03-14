import { Gift, TrendingUp, Users, Wallet } from 'lucide-react';

export function RewardsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">收益中心</h2>
        <p className="text-gray-400">查看您的收益统计并领取奖励</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { title: '累计收益', value: '+2,500 ETR', sub: '≈ $625.00', color: 'green' },
          { title: '今日收益', value: '+15.5 ETR', sub: '≈ $3.88', color: 'orange' },
          { title: '待领取收益', value: '150.5 ETR', sub: '≈ $37.63', color: 'yellow' },
        ].map((card) => (
          <div key={card.title} className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
            <p className="text-gray-400 text-sm mb-2">{card.title}</p>
            <p className={`text-2xl font-bold text-${card.color}-400`>{card.value}</p>
            <p className="text-gray-500 text-xs mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="p-6 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 flex items-center justify-center">
              <Gift className="text-yellow-400" size={28} />
            </div>
            <div>
              <p className="text-lg font-bold">有待领取的收益</p>
              <p className="text-3xl font-bold text-yellow-400">150.5 ETR</p>
              <p className="text-gray-400 text-sm">≈ $37.63</p>
            </div>
          </div>
          
          <button className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-bold hover:shadow-lg hover:shadow-yellow-500/30 transition-all">
            一键领取
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
          <h3 className="font-bold mb-6">收益来源</h3>
          
          <div className="space-y-4">
            {[
              { label: '质押收益', value: '70%', color: 'bg-green-500', amount: '1,750 ETR' },
              { label: '推荐收益', value: '20%', color: 'bg-orange-500', amount: '500 ETR' },
              { label: '分红收益', value: '10%', color: 'bg-blue-500', amount: '250 ETR' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4">
                <div className="w-full">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">{item.label}</span>
                    <span className="text-sm font-bold">{item.amount}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: item.value }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
          <h3 className="font-bold mb-6">推荐计划</h3>
          
          <div className="space-y-4">
            {[
              { level: '第一代 (直推)', count: 12, reward: '3%', earned: '450 ETR' },
              { level: '第二代 (间推)', count: 28, reward: '2%', earned: '180 ETR' },
              { level: '第三代 (间间推)', count: 56, reward: '1%', earned: '45 ETR' },
            ].map((item, index) => (
              <div key={index} className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                <div>
                  <p className="font-semibold text-sm">{item.level}</p>
                  <p className="text-gray-400 text-xs">{item.count}人 · {item.reward}奖励</p>
                </div>
                <span className="text-green-400 font-bold">+{item.earned}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RewardsPage;
