# ETR-App 项目文档规范

## 📁 项目文档存储位置

**项目根目录**: `/root/.openclaw/workspace/etr-app/`

### 文档分类存储

| 文档类型 | 存储路径 | 说明 |
|---------|---------|------|
| **PRD 文档** | `/root/.openclaw/workspace/etr-app/prd/` | 产品需求文档、功能规格 |
| **UI 设计** | `/root/.openclaw/workspace/etr-app/ui-design/` | 设计稿、设计规范、组件库 |
| **开发计划** | `/root/.openclaw/workspace/etr-app/dev-plans/` | 迭代计划、任务拆解、排期 |
| **技术文档** | `/root/.openclaw/workspace/etr-app/docs/` | API 文档、架构设计、部署文档 |
| **测试文档** | `/root/.openclaw/workspace/etr-app/qa/` | 测试用例、测试报告 |

---

## 📋 文档命名规范

### PRD 文档
```
PRD_[版本号]_[功能模块]_[日期].md
示例：PRD_v1.0_用户认证_2026-03-20.md
```

### UI 设计文档
```
UI_[页面/组件名]_[版本]_[日期].md
示例：UI_登录页面_v2_2026-03-20.md
```

### 开发计划
```
PLAN_[迭代版本]_[日期范围].md
示例：PLAN_Sprint1_2026-03-20至2026-03-27.md
```

### 技术文档
```
[类型]_[主题]_[日期].md
示例：API_接口文档_2026-03-20.md
示例：ARCH_系统架构_2026-03-20.md
```

---

## 🚀 敏捷协作要求

### 文档更新流程
1. **PD Director** - 创建/更新 PRD 文档 → `prd/` 目录
2. **UI Designer** - 创建设计文档 → `ui-design/` 目录
3. **Architect** - 创建技术文档 → `docs/` 目录
4. **开发团队** - 更新开发计划 → `dev-plans/` 目录
5. **QA** - 更新测试文档 → `qa/` 目录

### 文档交接格式
在飞书群聊中@相关人员时，附上文档链接：
```
✅ [任务类型] 完成：[功能名称]

📄 文档位置：/root/.openclaw/workspace/etr-app/[目录]/[文件名].md

👉 @下一环节负责人 请查收
```

---

## ⚠️ 重要提醒

1. **项目隔离**: 所有文档必须保存在 `etr-app/` 目录下，**不要**与 `precious-metal-app/` 混用
2. **统一路径**: 所有团队成员使用相同的绝对路径访问文档
3. **版本控制**: 重要文档更新时保留版本号，便于追溯
4. **及时同步**: 文档创建/更新后，立即在群聊中通知相关成员

---

## 📂 完整目录结构

```
etr-app/
├── prd/              # 产品需求文档
│   └── PRD_v1.0_XXX.md
├── ui-design/        # UI 设计文档
│   └── UI_XXX.md
├── dev-plans/        # 开发计划
│   └── PLAN_XXX.md
├── docs/             # 技术文档
│   ├── API_XXX.md
│   └── ARCH_XXX.md
├── qa/               # 测试文档
│   └── TEST_XXX.md
├── frontend/         # 前端代码
├── frontend-v2/      # 前端 V2 代码
├── contracts/        # 智能合约
└── subgraph/         # Subgraph 配置
```

---

**创建时间**: 2026-03-20
**最后更新**: 2026-03-20
