# ETR DApp Subgraph

ETR DApp 的 The Graph 子图，用于索引质押、复利、推荐和分红合约事件，提供高效的链上数据查询。

## 📁 目录结构

```
subgraph/
├── subgraph.yaml          # Subgraph 配置文件
├── schema.graphql        # GraphQL 数据模型
├── package.json          # 依赖配置
├── README.md            # 本文档
├── abis/                # 合约 ABI 文件
│   ├── StakingPool.json
│   ├── CompoundPool.json
│   ├── ReferralSystemV2.json
│   └── DividendPool.json
└── src/
    └── mappings/        # 事件处理器
        ├── stakingPool.ts
        ├── compoundPool.ts
        ├── referralSystem.ts
        └── dividendPool.ts
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd ~/chain/etr_dapp/subgraph
npm install
```

### 2. 复制合约 ABI

从 Hardhat artifacts 复制 ABI 文件：

```bash
mkdir -p abis
cp ../contracts/artifacts/contracts/StakingPool.sol/StakingPool.json abis/
cp ../contracts/artifacts/contracts/CompoundPool.sol/CompoundPool.json abis/
cp ../contracts/artifacts/contracts/ReferralSystemV2.sol/ReferralSystemV2.json abis/
cp ../contracts/artifacts/contracts/DividendPool.sol/DividendPool.json abis/
```

### 3. 配置合约地址

编辑 `subgraph.yaml`，填写部署后的合约地址和开始区块：

```yaml
dataSources:
  - name: StakingPool
    source:
      address: "0x..."  # StakingPool 地址
      startBlock: 12345  # 部署区块号
  - name: CompoundPool
    source:
      address: "0x..."  # CompoundPool 地址
      startBlock: 12345
  - name: ReferralSystemV2
    source:
      address: "0x..."  # ReferralSystemV2 地址
      startBlock: 12345
  - name: DividendPool
    source:
      address: "0x..."  # DividendPool 地址
      startBlock: 12345
```

### 4. 生成代码

```bash
npm run codegen
```

### 5. 构建

```bash
npm run build
```

## 📡 部署

### 部署到 The Graph Studio

1. 在 [The Graph Studio](https://thegraph.com/studio/) 创建 Subgraph
2. 获取部署密钥
3. 认证并部署：

```bash
graph auth --studio YOUR_DEPLOY_KEY
graph deploy --studio etr-dapp-subgraph
```

### 部署到本地节点

```bash
# 启动本地 Graph 节点
docker-compose up -d

# 创建并部署
npm run create-local
npm run deploy-local
```

## 📊 数据模型

### 核心实体

| 实体 | 描述 | 来源合约 |
|-----|------|---------|
| `User` | 用户综合信息 | 所有合约 |
| `StakeRecord` | 质押记录 | StakingPool |
| `RewardClaim` | 收益领取记录 | StakingPool |
| `CompoundRecord` | 复利操作记录 | CompoundPool |
| `ReferrerBinding` | 推荐绑定关系 | ReferralSystemV2 |
| `ReferralRecord` | 推荐奖励记录 | ReferralSystemV2 |
| `DividendClaim` | 分红领取记录 | DividendPool |
| `DailyStats` | 每日统计数据 | 聚合计算 |

## 🔍 GraphQL 查询示例

### 查询用户质押历史

```graphql
{
  user(id: "0x...") {
    stakes {
      id
      amount
      startTime
      unlockTime
      status
      totalClaimed
    }
    totalStaked
    totalClaimed
  }
}
```

### 查询复利记录

```graphql
{
  user(id: "0x...") {
    compoundRecords(orderBy: timestamp, orderDirection: desc) {
      type
      amount
      newBalance
      timestamp
    }
    currentCompoundBalance
  }
}
```

### 查询推荐记录

```graphql
{
  user(id: "0x...") {
    referrals {
      referee {
        id
      }
      generation
      rewardAmount
      timestamp
    }
    referralCount
    totalReferralRewards
  }
}
```

### 查询每日统计

```graphql
{
  dailyStats(orderBy: date, orderDirection: desc, first: 30) {
    date
    newStakes
    totalStakedAmount
    newCompoundDeposits
    newReferrals
    totalReferralRewards
  }
}
```

## 🔧 事件映射

### StakingPool 事件

| 事件 | 处理器 | 功能 |
|-----|-------|------|
| `Staked` | `handleStaked` | 创建质押记录 |
| `Unstaked` | `handleUnstaked` | 更新质押状态 |
| `RewardClaimed` | `handleRewardClaimed` | 记录收益领取 |
| `AllRewardsClaimed` | `handleAllRewardsClaimed` | 批量领取 |
| `StakeRecordUpdated` | `handleStakeRecordUpdated` | 更新质押金额 |
| `YieldRateUpdated` | `handleYieldRateUpdated` | 更新收益率 |

### CompoundPool 事件

| 事件 | 处理器 | 功能 |
|-----|-------|------|
| `RewardDeposited` | `handleRewardDeposited` | 收益存入复利池 |
| `CompoundClaimed` | `handleCompoundClaimed` | 提取复利 |
| `CompoundTransferredToBalance` | `handleCompoundTransferred` | 划转至余额 |
| `CompoundCalculated` | `handleCompoundCalculated` | 每日复利计算 |

### ReferralSystemV2 事件

| 事件 | 处理器 | 功能 |
|-----|-------|------|
| `ReferralBound` | `handleReferralBound` | 记录推荐绑定 |
| `ReferralRewardDistributed` | `handleReferralRewardDistributed` | 记录推荐奖励 |
| `ReferralStatsUpdated` | `handleReferralStatsUpdated` | 更新推荐统计 |

### DividendPool 事件

| 事件 | 处理器 | 功能 |
|-----|-------|------|
| `DividendClaimed` | `handleDividendClaimed` | 记录分红领取 |
| `DividendDistributed` | `handleDividendDistributed` | 记录分红分发 |
| `UserLevelUpdated` | `handleUserLevelUpdated` | 更新用户等级 |

## ⚠️ 注意事项

1. **合约地址**：部署前必须填写正确的合约地址
2. **开始区块**：设置为合约部署的区块号，避免索引无关数据
3. **网络**：目前配置为 `bsc-testnet`，主网部署时改为 `bsc`
4. **同步时间**：首次同步可能需要较长时间，取决于开始区块

## 🔗 前端集成

部署后，前端可以使用 GraphQL 查询真实历史数据，替代模拟数据：

```typescript
// 使用 Apollo Client 或 urql 查询
const COMPOUND_HISTORY = gql`
  query GetCompoundHistory($user: String!) {
    user(id: $user) {
      compoundRecords(orderBy: timestamp, orderDirection: desc) {
        type
        amount
        newBalance
        timestamp
      }
    }
  }
`;
```

## 📚 相关链接

- [The Graph 文档](https://thegraph.com/docs/)
- [GraphQL 教程](https://graphql.org/learn/)
- [AssemblyScript](https://www.assemblyscript.org/)

## 📝 License

MIT
