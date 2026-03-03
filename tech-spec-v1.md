# Mamba Finance 技术方案 V1（可直接开发）

版本：v1.0  
日期：2026-03-03  
对应 PRD：[prd.md](/Users/yzy/Desktop/yzy-workspace/mamba-finance/prd.md)

## 1. 目标与范围

### 1.1 本阶段目标（MVP）
- 实现账户体系（资金池）
- 实现借贷订单录入与生命周期状态管理
- 自动生成还款计划（按月收息，到期收本息）
- 实现收款入账并自动核销还款计划
- 提供首页核心看板（总资产、待回本金、本月预计利息、今日到期/逾期）

### 1.2 非目标（Phase 2+）
- OCR 自动识别凭证
- AI 自动日报与异常审计
- 复杂图表与高级筛选

## 2. 系统架构

### 2.1 技术栈
- 前端：Next.js（App Router）+ React + TypeScript + Tailwind CSS
- 后端：Next.js Route Handlers（REST API）
- 数据库：PostgreSQL（生产）+ Prisma ORM
- 文件存储：本地开发使用 `public/uploads`，生产建议 S3 兼容对象存储
- 认证：MVP 使用单租户账号（邮箱+密码或 magic link 二选一）

### 2.2 模块划分
- `Dashboard`：资产总览与到期提醒
- `Accounts`：账户/资金池管理
- `Orders`：借贷订单录入、详情、状态流转
- `Repayments`：还款计划与收款核销
- `Transactions`：流水台账
- `Attachments`：凭证与抵押物图片挂载

## 3. 业务规则（关键决策）

### 3.1 利息与计划生成规则（MVP 固定规则）
- 利率单位：月利率（如 `0.01` 表示 1%）
- 计息方式：单利，不复利
- 期数：按自然月计算（`months`）
- 还款结构：
  - 前 `months - 1` 期：仅收利息
  - 最后 1 期：收最后一期利息 + 全部本金
- 每期利息：`principal * monthlyRate`
- 金额精度：统一保留 2 位小数，采用四舍五入（HALF_UP）
- 到期日生成：以放款日“日号”为锚点，若目标月无该日，则取该月最后一天

### 3.2 订单状态机
- `active`：正常执行中
- `closed`：所有计划已核销
- `overdue`：存在逾期未结清计划（`dueDate < today && status != paid`）

状态流转规则：
- 新建订单后默认 `active`
- 定时任务或查询时发现逾期计划，订单标记为 `overdue`
- 所有计划结清后自动置为 `closed`
- `closed` 不可逆（MVP 不支持反结账）

### 3.3 对账规则
- 每笔“收款”必须关联一条 `repayment_plan`
- 入账成功后：
  - `repayment_plan.status` 从 `pending/overdue` -> `paid`
  - 写入 `transaction`（资金流向账户）
  - 更新 `account.currentBalance`
- 禁止对已 `paid` 计划重复核销

## 4. 数据模型（Prisma 草案）

```prisma
model Account {
  id             String   @id @default(cuid())
  name           String
  type           AccountType
  currency       String   @default("CNY")
  openingBalance Decimal  @db.Decimal(18, 2)
  currentBalance Decimal  @db.Decimal(18, 2)
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  transactions   Transaction[]
}

model Order {
  id             String   @id @default(cuid())
  orderNo        String   @unique
  borrowerName   String
  borrowerPhone  String?
  principal      Decimal  @db.Decimal(18, 2)
  monthlyRate    Decimal  @db.Decimal(8, 6)
  startDate      DateTime
  months         Int
  collateralDesc String?
  status         OrderStatus @default(active)
  notes          String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  repaymentPlans RepaymentPlan[]
  attachments    Attachment[]
}

model RepaymentPlan {
  id             String   @id @default(cuid())
  orderId        String
  periodIndex    Int
  dueDate        DateTime
  principalDue   Decimal  @db.Decimal(18, 2)
  interestDue    Decimal  @db.Decimal(18, 2)
  totalDue       Decimal  @db.Decimal(18, 2)
  status         PlanStatus @default(pending)
  paidAt         DateTime?
  transactionId  String? @unique
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  order          Order @relation(fields: [orderId], references: [id])
  transaction    Transaction? @relation(fields: [transactionId], references: [id])

  @@unique([orderId, periodIndex])
  @@index([dueDate, status])
}

model Transaction {
  id             String   @id @default(cuid())
  accountId      String
  type           TransactionType
  amount         Decimal  @db.Decimal(18, 2)
  occurredAt     DateTime
  counterparty   String?
  note           String?
  createdAt      DateTime @default(now())

  account        Account @relation(fields: [accountId], references: [id])
  repaymentPlan  RepaymentPlan?

  @@index([accountId, occurredAt])
}

model Attachment {
  id             String   @id @default(cuid())
  orderId        String
  category       AttachmentCategory
  fileName       String
  fileUrl        String
  mimeType       String?
  sizeBytes      Int?
  createdAt      DateTime @default(now())

  order          Order @relation(fields: [orderId], references: [id])

  @@index([orderId, category])
}

enum AccountType {
  cash
  bank_card
  wechat
  alipay
  other
}

enum OrderStatus {
  active
  closed
  overdue
}

enum PlanStatus {
  pending
  paid
  overdue
}

enum TransactionType {
  inflow
  outflow
}

enum AttachmentCategory {
  transfer_receipt
  collateral_photo
  other
}
```

## 5. 核心算法

### 5.1 自动生成还款计划（伪代码）

```ts
function generatePlans(principal, monthlyRate, startDate, months) {
  const interestPerPeriod = round2(principal * monthlyRate);
  const plans = [];

  for (let i = 1; i <= months; i++) {
    const dueDate = addMonthsWithAnchor(startDate, i);
    const principalDue = i === months ? principal : 0;
    const interestDue = interestPerPeriod;
    const totalDue = round2(principalDue + interestDue);

    plans.push({
      periodIndex: i,
      dueDate,
      principalDue,
      interestDue,
      totalDue,
      status: 'pending',
    });
  }

  return plans;
}
```

### 5.2 入账核销事务（必须事务化）
1. 校验 `repayment_plan.status != paid`
2. 校验收款金额是否等于 `plan.totalDue`（MVP 仅支持全额）
3. 创建 `transaction (inflow)`
4. 更新 `repayment_plan.status = paid` 并关联 `transactionId`
5. 更新 `account.currentBalance += amount`
6. 若订单全部计划已 `paid`，更新 `order.status = closed`

## 6. API 设计（MVP）

### 6.1 账户
- `GET /api/accounts`：账户列表
- `POST /api/accounts`：新建账户
- `PATCH /api/accounts/:id`：编辑账户

### 6.2 订单
- `GET /api/orders`：订单列表（支持状态过滤）
- `POST /api/orders`：创建订单并自动生成还款计划
- `GET /api/orders/:id`：订单详情（含计划、附件）
- `PATCH /api/orders/:id`：编辑订单基础信息（不允许修改已生成计划的核心字段）

### 6.3 还款计划/收款
- `GET /api/repayment-plans?date=YYYY-MM-DD&status=pending`：按日查看到期项
- `POST /api/repayment-plans/:id/collect`：收款核销

请求体示例：
```json
{
  "accountId": "acc_xxx",
  "amount": 10100.00,
  "occurredAt": "2026-03-10T10:30:00+08:00",
  "note": "3月回款"
}
```

### 6.4 附件
- `POST /api/orders/:id/attachments`：上传附件
- `DELETE /api/attachments/:id`：删除附件

## 7. 前端信息架构（MVP）

### 7.1 页面
- `/dashboard`
- `/accounts`
- `/orders`
- `/orders/[id]`

### 7.2 关键交互
- 新建订单：侧边抽屉表单，一次提交生成订单+计划
- 收款核销：在订单详情或今日到期列表内直接操作
- 凭证墙：订单详情页瀑布/网格展示图片，可全屏预览

## 8. 质量与校验

### 8.1 校验规则
- `principal > 0`
- `0 < monthlyRate <= 1`
- `months >= 1`
- 账户币种暂固定 CNY（MVP）

### 8.2 测试最低覆盖
- 单元测试：还款计划生成（闰月、月底锚点、精度）
- 集成测试：收款核销事务一致性
- E2E：创建订单 -> 生成计划 -> 收款 -> 订单关闭

## 9. 里程碑与工期估算（1 人）

- 第 1-2 天：项目初始化、Prisma Schema、迁移、种子数据
- 第 3-4 天：账户模块 + 订单创建 + 计划生成
- 第 5-6 天：收款核销 + 事务一致性 + 状态机
- 第 7 天：Dashboard 聚合与到期/逾期列表
- 第 8 天：附件上传与预览
- 第 9 天：测试补齐与缺陷修复
- 第 10 天：发布准备与文档整理

## 10. 风险与后续

- 风险：MVP 暂不支持部分还款、展期、反结账；如业务强依赖需前置到 Phase 1.5
- 风险：若不加数据库事务，余额与计划状态可能不一致
- 建议 Phase 2 优先：还款日历 + 逾期看板 + 更细粒度筛选

---

## 附：实施顺序（代码落地）
1. 初始化 Next.js + Prisma + PostgreSQL
2. 落地 Schema 与迁移
3. 实现 `POST /api/orders` + 计划生成逻辑
4. 实现 `POST /api/repayment-plans/:id/collect` 事务化核销
5. 接入 Dashboard 聚合查询
6. 完成基础 UI（订单列表/详情/收款）
