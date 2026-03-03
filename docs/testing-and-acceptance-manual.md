# Mamba Finance 测试与验收手册

## 1. 目标与范围

本手册用于统一 Mamba Finance 的测试与验收流程，覆盖：

- 自动化测试：`unit`、`integration`、`e2e`
- 手工验收（UAT）：按真实用户路径验证可用性
- 发布前通过标准与常见问题排查

适用环境：本机开发环境（macOS + Homebrew PostgreSQL + Next.js）

---

## 2. 测试类型说明

### 2.1 自动化测试

- `test:unit`：验证纯逻辑、参数校验、领域函数
- `test:integration`：验证数据库写入、事务一致性、服务层行为
- `test:e2e`：验证浏览器端到端主流程

### 2.2 手工验收（UAT）

由你以“真实用户”视角操作页面，重点确认：

- 主流程是否可完成
- 页面文案与交互是否正确
- 数据联动是否符合预期

---

## 3. 环境准备

在终端 A 执行：

```bash
brew services start postgresql@16
cd /Users/yzy/Desktop/yzy-workspace/mamba-finance
npx prisma migrate dev
npm run db:seed
npm run dev
```

说明：

- `brew services start` 为系统级命令，可在任意目录执行
- 从 `npx prisma migrate dev` 开始，必须在项目根目录执行
- `npm run dev` 会持续占用终端 A

---

## 4. 自动化测试执行手册

新开终端 B，执行：

```bash
cd /Users/yzy/Desktop/yzy-workspace/mamba-finance
npm run test:unit
npm run test:integration
npm run test:e2e
```

建议顺序：

1. `test:unit`（最快，先挡住基础问题）
2. `test:integration`（验证数据库事务）
3. `test:e2e`（最慢，最后跑主链路）

通过标准：

- 三条命令均返回 `pass`，无 `fail`
- `test:e2e` 显示所有用例通过

---

## 5. 手工验收（UAT）脚本

前提：终端 A 已运行 `npm run dev`。

访问地址：

- `http://localhost:3000/dashboard`
- `http://localhost:3000/orders`
- `http://localhost:3000/accounts`
- `http://localhost:3000/repayments/calendar`

### 5.1 场景一：账户创建

步骤：

1. 进入“账户”页面
2. 点击“新建账户”
3. 输入账户名（如“验收现金账户”）、类型、期初余额
4. 点击“创建”

预期结果：

- 新账户出现在列表中
- 字段值显示正确（名称、类型、余额、状态）

### 5.2 场景二：新建订单

步骤：

1. 进入“订单”页面
2. 点击“新建订单”
3. 填写借款人、本金、月利率、起息日期、期数
4. 点击“创建订单”

预期结果：

- 列表出现新订单
- 订单状态为“执行中”（或根据日期规则变更）
- 可进入订单详情页

### 5.3 场景三：订单详情核销

步骤：

1. 进入某订单详情
2. 在“还款计划”中点击“核销”
3. 选择收款账户，确认发生时间
4. 点击“确认核销”

预期结果：

- 对应期次状态变为“已收/已结清”
- 订单状态按规则更新
- 账户余额与交易记录同步更新

### 5.4 场景四：日历筛选与核销

步骤：

1. 进入“还款日历”
2. 输入借款人关键字并点击“搜索”
3. 点击有计划的日期
4. 在右侧抽屉对某条计划执行“核销”

预期结果：

- 日历与抽屉内状态更新为已收
- 关键字筛选结果正确

### 5.5 场景五：看板联动

步骤：

1. 进入“经营看板”
2. 对比核销前后关键指标变化

预期结果：

- 指标、图表、今日到期/逾期列表与业务动作一致

---

## 6. 发布前最小通过清单

以下项目全部满足，判定“可阶段发布”：

1. 自动化测试全通过：`unit + integration + e2e`
2. 手工 UAT 五个场景全部通过
3. 关键中文界面无明显英文残留（可接受技术术语）
4. 无 P0/P1 级阻塞问题

---

## 7. 常见问题排查

### 7.1 `psql: command not found`

执行：

```bash
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
```

### 7.2 E2E 报 `.next/dev/lock` 占用

说明已有 `next dev` 在运行。处理方式：

- 复用已有 dev 服务，或
- 结束旧进程后重跑 `npm run test:e2e`

### 7.3 Integration 提示 `DATABASE_URL is not available`

确认 `.env` 中 `DATABASE_URL` 已配置且当前终端会话可读取：

```bash
echo $DATABASE_URL
```

必要时手动导出后再跑测试。

### 7.4 `db:seed` 提示 seed 未配置

确认 `package.json` 中存在：

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

---

## 8. 日常执行建议

- 每次开发完成后至少执行：`npm run test:unit && npm run test:integration`
- 关键流程改动后必须执行：`npm run test:e2e`
- 合并/发布前执行：自动化全套 + 手工 UAT 一轮

