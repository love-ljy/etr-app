# ETR DApp V2 - QA 测试用例

## 📋 测试环境

- **网络**: BSC Testnet (ChainId: 97)
- **测试 USDT**: `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd`
- **合约版本**: V2 (USDT 质押模式)

---

## 🔧 前置准备

### 1. 获取测试币
- BNB: [BSC Testnet Faucet](https://testnet.binance.org/faucet-smart)
- USDT: 从测试网 USDT 合约获取少量用于测试

### 2. 部署合约
```bash
cd contracts
npm run deploy-v2:testnet
```

### 3. 更新前端配置
将部署输出的合约地址更新到 `frontend-v2/src/lib/web3/contracts.ts`

---

## ✅ 功能测试用例

### 模块 1: StakingPoolV2 (USDT 质押池)

#### TC-001: USDT 质押
| 项目 | 内容 |
|------|------|
| 用例名称 | 用户质押 USDT 赚取 ETR |
| 前置条件 | 1. 用户钱包有 USDT<br>2. 已授权 StakingPool 使用 USDT |
| 测试步骤 | 1. 调用 `stake(usdtAmount, referrer)`<br>2. 输入质押数量 100 USDT<br>3. 确认交易 |
| 预期结果 | - 交易成功<br>- 生成 StakeRecord<br>- USDT 从用户账户扣除<br>- 用户可在 `getUserStakes` 中查看质押记录 |
| 优先级 | P0 |

#### TC-002: 领取收益
| 项目 | 内容 |
|------|------|
| 用例名称 | 领取质押收益 (ETR) |
| 前置条件 | 1. 用户有活跃质押<br>2. 距离上次领取超过 24 小时 |
| 测试步骤 | 1. 调用 `claimReward(stakeId)`<br>2. 或调用 `claimAllRewards()` |
| 预期结果 | - 交易成功<br>- ETR 收益自动存入 CompoundPool<br>- `totalClaimed` 增加<br>- 奖励池余额减少 |
| 优先级 | P0 |

#### TC-003: 解押 USDT
| 项目 | 内容 |
|------|------|
| 用例名称 | 解押已解锁的 USDT |
| 前置条件 | 1. 用户有质押记录<br>2. 已有部分解锁（每日解锁 2%） |
| 测试步骤 | 1. 调用 `unstake(stakeId)`<br>2. 确认交易 |
| 预期结果 | - 交易成功<br>- USDT 返回用户钱包<br>- 质押记录更新<br>- 优先领取待领取收益 |
| 优先级 | P0 |

#### TC-004: 锁仓机制验证
| 项目 | 内容 |
|------|------|
| 用例名称 | 验证 50 天锁仓 + 每日解锁 2% |
| 前置条件 | 用户有新质押记录 |
| 测试步骤 | 1. 质押后立即调用 `getUnstakableUSDT(stakeId)`<br>2. 等待 1 天后再次调用<br>3. 等待 50 天后再次调用 |
| 预期结果 | - 第 1 天：可解押≈2%<br>- 第 2 天：可解押≈4%<br>- 第 50 天：可解押 100% |
| 优先级 | P1 |

#### TC-005: 最低持仓限制
| 项目 | 内容 |
|------|------|
| 用例名称 | 持仓<$100 时无收益 |
| 前置条件 | 用户质押 USDT<$100 |
| 测试步骤 | 1. 质押 50 USDT<br>2. 等待 24 小时<br>3. 调用 `calculatePendingReward(stakeId)` |
| 预期结果 | - 待领取收益为 0<br>- `isValidAccount(user)` 返回 false |
| 优先级 | P1 |

#### TC-006: 推荐人绑定
| 项目 | 内容 |
|------|------|
| 用例名称 | 首次质押时绑定推荐人 |
| 前置条件 | 用户无推荐人，有有效推荐人地址 |
| 测试步骤 | 1. 调用 `stake(100 USDT, referrerAddress)` |
| 预期结果 | - 质押成功<br>- 推荐关系绑定<br>- `ReferrerBound` 事件触发 |
| 优先级 | P1 |

---

### 模块 2: CompoundPoolV2 (复利池)

#### TC-010: 收益自动复投
| 项目 | 内容 |
|------|------|
| 用例名称 | StakingPool 收益自动进入复利池 |
| 前置条件 | 用户领取收益 |
| 测试步骤 | 1. 调用 `claimReward(stakeId)`<br>2. 查询 `getCompoundBalance(user)` |
| 预期结果 | - 复利余额增加<br>- 收益未直接转账给用户，而是进入复利池 |
| 优先级 | P0 |

#### TC-011: 复利开关 - 关闭状态
| 项目 | 内容 |
|------|------|
| 用例名称 | 开关关闭时禁止直接存入 ETR |
| 前置条件 | `allowDirectDeposit = false` |
| 测试步骤 | 1. 用户调用 `depositETR(amount)` |
| 预期结果 | - 交易 revert<br>- 错误信息："direct deposit is disabled" |
| 优先级 | P1 |

#### TC-012: 复利开关 - 开启状态
| 项目 | 内容 |
|------|------|
| 用例名称 | 开关开启时允许直接存入 ETR |
| 前置条件 | 1. `allowDirectDeposit = true`<br>2. 用户有 ETR 余额 |
| 测试步骤 | 1. 用户授权 CompoundPool 使用 ETR<br>2. 调用 `depositETR(amount)` |
| 预期结果 | - 交易成功<br>- ETR 从用户账户扣除<br>- 复利余额增加<br>- `totalDirectDeposited` 增加 |
| 优先级 | P1 |

#### TC-013: 复利计算
| 项目 | 内容 |
|------|------|
| 用例名称 | 每日自动计算复利 |
| 前置条件 | 用户有复利余额 |
| 测试步骤 | 1. 查询 `calculateDailyCompound(user)`<br>2. 等待 24 小时<br>3. 调用 `getTotalCompound(user)` |
| 预期结果 | - 复利余额 = 本金 + 复利收益<br>- 日复利 = 余额 × 0.45% |
| 优先级 | P1 |

#### TC-014: 提取复利
| 项目 | 内容 |
|------|------|
| 用例名称 | 提取复利到钱包 |
| 前置条件 | 用户有复利余额 |
| 测试步骤 | 1. 调用 `claimCompound()` |
| 预期结果 | - 交易成功<br>- ETR 转账到用户钱包<br>- 复利余额归零<br>- `totalClaimed` 增加 |
| 优先级 | P0 |

#### TC-015: 管理员切换开关
| 项目 | 内容 |
|------|------|
| 用例名称 | 管理员控制复利开关 |
| 前置条件 | 调用者是合约 owner |
| 测试步骤 | 1. 调用 `setDirectDepositEnabled(true)`<br>2. 查询 `allowDirectDeposit()`<br>3. 调用 `setDirectDepositEnabled(false)` |
| 预期结果 | - 开关状态正确切换<br>- `DirectDepositToggled` 事件触发 |
| 优先级 | P1 |

---

### 模块 3: ETRToken

#### TC-020: 代币分配验证
| 项目 | 内容 |
|------|------|
| 用例名称 | 验证初始代币分配 (95% 黑洞 + 5% LP) |
| 前置条件 | 合约部署完成 |
| 测试步骤 | 1. 查询 `balanceOf(blackHole)`<br>2. 查询 `balanceOf(lpPool)`<br>3. 查询 `getTotalSupply()` |
| 预期结果 | - 黑洞余额 = 2 亿 × 95% = 1.9 亿 ETR<br>- LP 池余额 = 2 亿 × 5% = 1000 万 ETR<br>- 总供应量 = 2 亿 ETR |
| 优先级 | P0 |

#### TC-021: 转账手续费
| 项目 | 内容 |
|------|------|
| 用例名称 | 验证买入/卖出手续费 |
| 前置条件 | 用户有 ETR 余额 |
| 测试步骤 | 1. 从 LP 池转账到用户（模拟买入）<br>2. 从用户转账到 LP 池（模拟卖出） |
| 预期结果 | - 买入：扣除 3% 手续费<br>- 卖出：扣除 3%-50% 动态手续费<br>- 手续费转入 feeCollector |
| 优先级 | P1 |

---

### 模块 4: 前端集成测试

#### TC-030: 连接钱包
| 项目 | 内容 |
|------|------|
| 用例名称 | 钱包连接功能 |
| 前置条件 | 安装 MetaMask |
| 测试步骤 | 1. 打开前端页面<br>2. 点击"连接钱包"<br>3. 切换到 BSC Testnet |
| 预期结果 | - 钱包连接成功<br>- 显示账户地址和余额 |
| 优先级 | P0 |

#### TC-031: 质押页面
| 项目 | 内容 |
|------|------|
| 用例名称 | USDT 质押流程 |
| 前置条件 | 已连接钱包，有 USDT 余额 |
| 测试步骤 | 1. 进入质押页面<br>2. 输入质押数量<br>3. 授权 USDT<br>4. 确认质押 |
| 预期结果 | - 授权成功<br>- 质押成功<br>- 页面显示质押记录 |
| 优先级 | P0 |

#### TC-032: 复利池页面
| 项目 | 内容 |
|------|------|
| 用例名称 | 复利池操作 |
| 前置条件 | 已连接钱包，有复利余额 |
| 测试步骤 | 1. 进入复利池页面<br>2. 查看复利余额和预估日收益<br>3. 点击提取复利 |
| 预期结果 | - 数据正确显示<br>- 提取成功 |
| 优先级 | P0 |

---

## 📊 测试报告模板

### 测试执行记录

| 用例 ID | 测试日期 | 测试人 | 结果 | 备注 |
|---------|----------|--------|------|------|
| TC-001 | | | Pass/Fail | |
| TC-002 | | | Pass/Fail | |
| TC-003 | | | Pass/Fail | |
| TC-004 | | | Pass/Fail | |
| TC-005 | | | Pass/Fail | |
| TC-006 | | | Pass/Fail | |
| TC-010 | | | Pass/Fail | |
| TC-011 | | | Pass/Fail | |
| TC-012 | | | Pass/Fail | |
| TC-013 | | | Pass/Fail | |
| TC-014 | | | Pass/Fail | |
| TC-015 | | | Pass/Fail | |
| TC-020 | | | Pass/Fail | |
| TC-021 | | | Pass/Fail | |
| TC-030 | | | Pass/Fail | |
| TC-031 | | | Pass/Fail | |
| TC-032 | | | Pass/Fail | |

### Bug 列表

| 编号 | 严重程度 | 描述 | 复现步骤 | 状态 |
|------|----------|------|----------|------|
| BUG-001 | | | | Open |

---

## 🚀 部署检查清单

- [ ] 合约编译无错误
- [ ] 部署脚本配置正确
- [ ] 私钥已配置（.env 文件）
- [ ] 部署到测试网成功
- [ ] 合约地址更新到前端配置
- [ ] 前端可以连接合约
- [ ] 所有 P0 测试用例通过
- [ ] 无严重 Bug

---

## 📞 联系方式

如有问题请联系开发团队。
