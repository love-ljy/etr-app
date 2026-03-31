# ETR DApp V2 - 项目状态总览

**最后更新**: 2026-03-31  
**状态**: 🟡 开发中 (Bug 修复阶段)

---

## 📋 快速索引

| 角色 | 看这里 |
|------|--------|
| **前端开发** | [前端配置](#前端开发指南) + [合约地址](#合约地址-bsc-testnet) |
| **后端开发** | [Bug 列表](#当前-bug-清单) + [合约代码](./contracts/) |
| **测试/QA** | [测试用例](./QA-TEST-CASES.md) + [测试报告](./qa/) |
| **产品/需求** | [PRD 文档](./prd/) |

---

## 🎯 合约地址 (BSC Testnet)

**⚠️ 这是唯一的权威合约地址来源，请以这里为准！**

| 合约名称 | 地址 | BSCScan 链接 |
|----------|------|--------------|
| **ETRToken** | `0xB58d5fFc11E96af337D6C06b41F2DcD509aFaBcF` | [查看](https://testnet.bscscan.com/address/0xB58d5fFc11E96af337D6C06b41F2DcD509aFaBcF) |
| **StakingPoolV2** | `0xeEfEb6C343c16410F5Dee200D71fC20DCE6c016e` | [查看](https://testnet.bscscan.com/address/0xeEfEb6C343c16410F5Dee200D71fC20DCE6c016e) |
| **CompoundPoolV2** | `0x39140fc1715c5E4aaCC711F2eAA5a00D0A3f3A57` | [查看](https://testnet.bscscan.com/address/0x39140fc1715c5E4aaCC711F2eAA5a00D0A3f3A57) |
| **ReferralSystem** | `0x73bc5e6C363Af763150D7F6803Ed155EE891c97E` | [查看](https://testnet.bscscan.com/address/0x73bc5e6C363Af763150D7F6803Ed155EE891c97E) |
| **USDT (官方)** | `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd` | [查看](https://testnet.bscscan.com/address/0x337610d27c682E347C9cD60BD4b3b107C9d34dDd) |
| **DividendPool** | `0xB26F164ff351F1A3bF62dc6D35123b386Fc6Df4b` | [查看](https://testnet.bscscan.com/address/0xB26F164ff351F1A3bF62dc6D35123b386Fc6Df4b) |
| **SlippageController** | `0xA17B5F1598d08C1307345335f264eBE45b9977a9` | [查看](https://testnet.bscscan.com/address/0xA17B5F1598d08C1307345335f264eBE45b9977a9) |

### 网络配置
```
网络名称：BSC Testnet
ChainID: 97
RPC: https://data-seed-prebsc-1-s1.binance.org:8545
区块浏览器：https://testnet.bscscan.com
```

### 合约参数
| 参数 | 值 |
|------|-----|
| ETR 初始价格 | $0.25 |
| 锁仓周期 | 50 天 |
| 每日解锁 | 2% |
| 日化收益率 | 0.45% |

---

## 💻 前端开发指南

### 1. 配置环境变量

编辑 `frontend-v2/.env.local`:

```bash
# WalletConnect
NEXT_PUBLIC_WC_PROJECT_ID=c1bb7726024cabb6e7885d703d6a951b

# 合约地址 (BSC Testnet)
NEXT_PUBLIC_ETR_TOKEN_ADDRESS=0xB58d5fFc11E96af337D6C06b41F2DcD509aFaBcF
NEXT_PUBLIC_STAKING_POOL_ADDRESS=0xeEfEb6C343c16410F5Dee200D71fC20DCE6c016e
NEXT_PUBLIC_COMPOUND_POOL_ADDRESS=0x39140fc1715c5E4aaCC711F2eAA5a00D0A3f3A57
NEXT_PUBLIC_REFERRAL_ADDRESS=0x73bc5e6C363Af763150D7F6803Ed155EE891c97E
NEXT_PUBLIC_USDT_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd

# 网络配置
NEXT_PUBLIC_CHAIN_ID=97
NEXT_PUBLIC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
NEXT_PUBLIC_BLOCK_EXPLORER=https://testnet.bscscan.com
```

### 2. 创建配置文件

在 `frontend-v2/src/lib/` 创建 `contracts.ts`:

```typescript
// frontend-v2/src/lib/contracts.ts

export const CONTRACTS = {
  ETRToken: process.env.NEXT_PUBLIC_ETR_TOKEN_ADDRESS!,
  StakingPoolV2: process.env.NEXT_PUBLIC_STAKING_POOL_ADDRESS!,
  CompoundPoolV2: process.env.NEXT_PUBLIC_COMPOUND_POOL_ADDRESS!,
  ReferralSystem: process.env.NEXT_PUBLIC_REFERRAL_ADDRESS!,
  USDT: process.env.NEXT_PUBLIC_USDT_ADDRESS!,
} as const;

export const NETWORK = {
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '97'),
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL!,
  blockExplorer: process.env.NEXT_PUBLIC_BLOCK_EXPLORER!,
} as const;

export const CONFIG = {
  ETR_PRICE_USD: 0.25,
  LOCK_PERIOD_DAYS: 50,
  DAILY_YIELD_RATE: 0.0045, // 0.45%
  DAILY_UNLOCK_RATE: 0.02, // 2%
} as const;
```

### 3. 启动开发服务器

```bash
cd frontend-v2
npm install  # 首次运行
npm run dev
```

访问：http://localhost:3000

### 4. 测试清单

- [ ] 钱包连接正常
- [ ] 合约地址读取正确
- [ ] 能读取用户余额
- [ ] 能读取质押数据
- [ ] 交易能正常发送

---

## 🐛 当前 Bug 清单

### P0 - 严重（后端优先修复）

| ID | 模块 | 问题 | 状态 |
|----|------|------|------|
| #006-012 | ReferralSystemV2 | 推荐奖励计算错误（7 个） | 🔴 待修复 |

### P1 - 一般

| ID | 模块 | 问题 | 状态 |
|----|------|------|------|
| #001 | CompoundPool | 时间流逝后复利计算 NaN | 🟡 待修复 |
| #002 | CompoundPool | 复利余额计算 BigNumberish 错误 | 🟡 待修复 |

### P2 - 轻微

| ID | 模块 | 问题 | 状态 |
|----|------|------|------|
| #003 | PriceOracle | 价格计算类型错误 | 🟢 待修复 |
| #004 | PriceOracle | PriceUpdated 事件发射失败 | 🟢 待修复 |

**详细报告**: [./qa/TEST_PROGRESS_REPORT_1.md](./qa/TEST_PROGRESS_REPORT_1.md)

---

## 📁 项目结构

```
etr-app/
├── PROJECT_STATUS.md      # 本文件 - 项目状态总览
├── DEPLOYMENT-SUMMARY.md  # 部署报告
├── QA-TEST-CASES.md       # QA 测试用例
├── contracts/             # 智能合约代码
│   ├── deployment-v2.json # 合约地址（权威来源）
│   └── ...
├── frontend-v2/           # 前端主版本 (Next.js)
│   ├── .env.local         # 环境变量
│   ├── src/
│   │   ├── app/          # 页面
│   │   ├── components/   # 组件
│   │   └── lib/          # 工具库
│   └── TEST_GUIDE.md     # 前端测试指南
├── frontend/              # 前端旧版 (Vite，保留)
├── prd/                   # 产品需求文档
├── qa/                    # QA 测试报告
│   ├── TEST_EXECUTION_2026-03-29.md
│   └── TEST_PROGRESS_REPORT_1.md
└── docs/                  # 文档
```

---

## 📞 沟通机制

### 每日站会
- **时间**: 每日 10:00
- **内容**: 进度同步 + 阻塞问题

### 紧急问题
直接在群里@对应负责人：
- 后端 Bug → @后端开发
- 前端问题 → @前端开发
- 测试问题 → @测试工程师
- 需求/协调 → @资深 CEO

### 代码提交
- 提交前确保测试通过
- Commit 信息清晰描述变更
- 重大变更先在群里同步

---

## 🔗 有用链接

| 资源 | 链接 |
|------|------|
| BSC Testnet 水龙头 | https://testnet.bnbchain.org/faucet-smart |
| BSCScan 测试网 | https://testnet.bscscan.com |
| PancakeSwap 测试网 | https://pancake.kiemtienonline360.com |

---

**最后更新**: 2026-03-31  
**维护人**: @资深 CEO
