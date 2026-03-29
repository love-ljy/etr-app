# Agent 跨 Session 沟通机制 - 使用指南

## 问题背景

在 OpenClaw 多 Agent 系统中，各角色 Agent（架构师、后端开发、前端开发等）在独立 session 中运行，导致：

- ❌ 信息孤岛 - 看不到对方的进展
- ❌ 重复开发 - 两个人做同一件事
- ❌ 沟通延迟 - 消息发送后无人响应
- ❌ 责任不清 - 任务分配不明确

## 解决方案

提供 **3 层沟通机制**：

```
┌─────────────────────────────────────────┐
│  群聊沟通（主要渠道，80% 沟通）           │
│  - 进展同步                              │
│  - 任务分配                              │
│  - 公开讨论                              │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  sessions_send（补充渠道，20% 沟通）      │
│  - 一对一技术细节                        │
│  - 任务交接                              │
│  - 紧急协调                              │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  文档记录（知识沉淀）                     │
│  - 决策记录                              │
│  - 交接记录                              │
│  - 会议纪要                              │
└─────────────────────────────────────────┘
```

## 工具安装

### 1. 沟通技能

已创建技能文件：
```
/root/.openclaw/workspace/agents/ceo/skills/agent-communication/SKILL.md
```

**使用方法**：
- Agent 自动加载此技能
- 按照技能中的规范进行沟通

### 2. 沟通脚本

已创建脚本：
```
/root/.openclaw/workspace/scripts/agent-communicate.sh
```

**使用方法**：
```bash
# 查看所有 Agent 状态
./agent-communicate.sh status

# 同步进展到群聊
./agent-communicate.sh sync "完成 stakeETR 开发，28 个测试通过"

# 协调特定 Agent
./agent-communicate.sh coordinate backend-dev "需要确认 API 接口定义"

# 任务交接
./agent-communicate.sh handoff backend-dev architect "交付物：stakeETR 代码 + 测试"

# 发起临时会议
./agent-communicate.sh meeting "LP 池交互方案讨论" "@架构师 @后端开发"

# 记录重要决策
./agent-communicate.sh record "LP 池交互方案" "前端 swap，合约只接收 ETR"
```

### 3. 沟通模板

已创建模板库：
```
/root/.openclaw/workspace/etr-app/docs/沟通模板.md
```

**包含模板**：
- 进展同步
- 任务协调
- 任务交接
- 求助
- 决策请求
- Code Review
- 紧急问题通知
- 日报
- 任务分配
- 技术方案讨论
- 会议记录

## 实战示例

### 场景 1: 发现重复开发

**问题**：后端开发在写 `ETRStakingPool.sol`，架构师已完成 `StakingPoolV2.sol`

**解决步骤**：

1. **CEO 发现问题** → 使用协调模板

```markdown
【任务协调】@后端开发 @架构师

## 背景
发现两边都在开发 ETR 质押功能，存在重复。

## 需求
立即暂停新合约开发，确认统一方案。

## 建议
在现有 StakingPoolV2 添加 stakeETR() 函数。

## 时间要求
30 分钟内确认。
```

2. **架构师响应** → 使用 sessions_send

```bash
./agent-communicate.sh coordinate backend-dev "暂停 ETRStakingPool，用 StakingPoolV2 修改"
```

3. **后端开发确认** → 群聊同步

```markdown
【进展同步】@CEO @架构师

收到，已暂停 ETRStakingPool 开发。
将在 StakingPoolV2 添加 stakeETR() 函数。

预计完成时间：今天 20:00
```

4. **记录决策** → 避免以后再犯

```bash
./agent-communicate.sh record "ETR 质押方案" "统一使用 StakingPoolV2，不新增合约"
```

### 场景 2: 任务交接

**问题**：后端开发完成代码，需要架构师部署

**解决步骤**：

1. **后端开发发起交接**

```bash
./agent-communicate.sh handoff backend-dev architect "
- StakingPoolV2.sol（新增 stakeETR 函数）
- 单元测试（28 个通过）
- 测试报告：/root/.openclaw/workspace/etr-app/qa/test-report.md
"
```

2. **自动生成交接记录**

文件：`/root/.openclaw/workspace/etr-app/dev-plans/任务交接记录 -20260329.md`

```markdown
## 2026-03-29 19:30

- **交出方**: @后端开发
- **接收方**: @架构师
- **交付物**:
  - StakingPoolV2.sol（新增 stakeETR 函数）
  - 单元测试（28 个通过）
  - 测试报告
```

3. **架构师确认接收**

```markdown
【任务交接确认】@后端开发

已接收交付物，开始部署准备。
预计完成时间：明天 12:00
```

### 场景 3: 紧急问题协调

**问题**：部署时发现 LP 池地址配置错误

**解决步骤**：

1. **架构师发送紧急通知**

```markdown
🚨 **紧急问题通知**

## 问题
部署时 LP 池地址配置错误

## 影响
- 无法完成合约部署
- 前端联调阻塞

## 当前状态
等待后端开发提供正确地址

## 需要行动
@后端开发 立即提供正确的 LP 池地址

时间：2026-03-30 10:00
```

2. **CEO 介入协调**

```bash
./agent-communicate.sh meeting "LP 池地址紧急确认" "@架构师 @后端开发"
```

3. **问题解决后记录**

```bash
./agent-communicate.sh record "LP 池地址配置" "使用 0x1234...5678 作为 ETR/USDT LP 地址"
```

## 最佳实践

### ✅ 每天必做

1. **早间同步** (9:30)
   ```markdown
   【日报】@负责人 2026-03-29
   
   ## 今日计划
   - [ ] 任务 1
   - [ ] 任务 2
   ```

2. **进展同步** (每 2-4 小时)
   ```bash
   ./agent-communicate.sh sync "完成 XXX，开始 YYY"
   ```

3. **晚间总结** (18:00)
   ```markdown
   【日报总结】@负责人 2026-03-29
   
   ## 今日完成
   - [x] 任务 1
   - [x] 任务 2
   
   ## 明日计划
   - [ ] 任务 3
   ```

### ✅ 关键节点必做

1. **开始工作时** → 群聊同步"已开始 XXX"
2. **完成任务后** → 群聊汇报"XXX 已完成" + 代码链接
3. **遇到阻塞时** → 立即@相关方
4. **任务交接时** → 使用 handoff 命令
5. **重要决策后** → 使用 record 命令记录

### ❌ 避免的行为

1. **闷头开发** - 几小时不说话
2. **私下决定** - 重大决策不公开
3. **不回复** - 收到消息不确认
4. **模糊消息** - "有个问题"（不说具体问题）
5. **重复造轮子** - 不确认是否有人已实现

## 监控指标

### 沟通健康度检查

每周检查一次：

```bash
# 查看最近沟通记录
grep "进展同步\|任务协调\|任务交接" /root/.openclaw/workspace/etr-app/logs/agent-communication.log | tail -20
```

**健康指标**：
- ✅ 平均响应时间 < 30 分钟
- ✅ 每天进展同步 ≥ 3 次
- ✅ 任务交接成功率 100%
- ✅ 重复开发次数 = 0

**警戒线**：
- 🔴 响应时间 > 2 小时
- 🔴 6 小时无进展同步
- 🔴 任务交接失败
- 🔴 发现重复开发

## 故障排除

### 问题 1: Agent 无响应

**解决步骤**：
1. 等待 30 分钟
2. 再次@提醒
3. 升级 CEO：`./agent-communicate.sh meeting "紧急协调" "@相关人员"`
4. 重新分配任务

### 问题 2: 消息发送失败

**检查清单**：
- [ ] Session key 是否正确
- [ ] Agent 是否在线
- [ ] 网络是否通畅

**解决命令**：
```bash
# 检查 Agent 状态
./agent-communicate.sh status

# 手动发送（备用方案）
openclaw sessions send --session-key <key> --message "xxx"
```

### 问题 3: 沟通混乱

**解决步骤**：
1. 暂停所有讨论
2. CEO 发起复盘会议
3. 重新明确分工
4. 记录新的沟通规则

## 总结

好的沟通 = **及时** + **透明** + **明确**

### 工具速查

| 工具 | 用途 | 命令 |
|------|------|------|
| 群聊 | 主要沟通渠道 | 直接发消息 |
| sessions_send | 一对一协调 | `./agent-communicate.sh coordinate` |
| 进展同步 | 定期汇报 | `./agent-communicate.sh sync` |
| 任务交接 | 工作移交 | `./agent-communicate.sh handoff` |
| 会议发起 | 临时讨论 | `./agent-communicate.sh meeting` |
| 决策记录 | 知识沉淀 | `./agent-communicate.sh record` |
| 模板库 | 快速复制 | 查看 `沟通模板.md` |

### 立即开始

1. **阅读技能文档** - `/root/.openclaw/workspace/agents/ceo/skills/agent-communication/SKILL.md`
2. **熟悉沟通模板** - `/root/.openclaw/workspace/etr-app/docs/沟通模板.md`
3. **试用沟通脚本** - `./agent-communicate.sh help`
4. **开始使用** - 下次沟通时使用模板

**记住：好的沟通让团队效率翻倍！** 🚀
