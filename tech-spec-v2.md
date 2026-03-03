# Mamba Finance 技术方案 V2（Phase 2: UX 增强）

版本：v2.0  
日期：2026-03-04  
对应 PRD：[prd.md](/Users/yzy/Desktop/yzy-workspace/mamba-finance/prd.md)

## 1. 目标与范围

### 1.1 目标
- 增加“还款日历”视图，降低到期管理心智成本。
- 增加 Dashboard 图表层，补齐趋势和构成的可视化。
- 增强附件预览体验（快速预览、键盘切换、移动端适配）。

### 1.2 非目标
- OCR 自动识别凭证（Phase 3）
- AI 自动简报/异常审计（Phase 3）
- 多租户与权限体系重构（后续独立阶段）

## 2. 功能设计

### 2.1 还款日历（/repayments/calendar）
- 视图模式：
  - 月视图（默认）
  - 日清单抽屉（点击日期打开）
- 单元格信息：
  - 到期笔数
  - 到期总额
  - 逾期笔数（红色角标）
- 筛选条件：
  - 状态：`pending` / `overdue` / `paid`
  - 关键字：借款人
- 交互：
  - 点击计划项可跳转 `/orders/[id]` 并定位到对应期数
  - 在日清单可直接触发“收款核销”

### 2.2 Dashboard 图表增强
- 新增图表：
  - 资产趋势（30 天折线图）
  - 资产构成（账户维度环图）
  - 到期结构（7 天柱状图）
- 与现有 KPI 卡片共存，图表位于卡片下方。
- 数据一致性要求：图表与 KPI 同源查询逻辑，避免口径不一致。

### 2.3 附件预览体验增强
- 详情页附件墙支持：
  - 点击缩略图打开 Lightbox
  - 键盘左右切图、Esc 关闭
  - 展示文件名、上传时间、大小
- 移动端：
  - 全屏滑动浏览
  - 底部操作栏保留删除按钮

## 3. 技术方案

### 3.1 后端 API 扩展
- 新增：`GET /api/calendar/repayments?month=YYYY-MM&status=...&keyword=...`
  - 返回月内每天的聚合数据和计划列表。
- 新增：`GET /api/dashboard/charts?range=30d`
  - 返回趋势、构成、到期结构三个数据集。

### 3.2 领域与查询服务
- 新增服务：
  - `src/lib/services/calendar-repayment-service.ts`
  - `src/lib/services/dashboard-chart-service.ts`
- 统一日期边界：全部使用 UTC 边界计算，前端负责本地时区展示。

### 3.3 前端架构
- 新页面：
  - `src/app/repayments/calendar/page.tsx`
- 新组件：
  - `src/components/calendar/month-grid.tsx`
  - `src/components/charts/line-chart.tsx`
  - `src/components/charts/donut-chart.tsx`
  - `src/components/charts/bar-chart.tsx`
  - `src/components/attachments/lightbox.tsx`

### 3.4 图表库选择
- 优先 `recharts`（轻量，React 生态成熟）。
- 备选 `echarts-for-react`（复杂场景能力更强）。

## 4. 数据与性能

### 4.1 数据查询策略
- 日历聚合查询按月份执行，单次查询最多 31 天窗口。
- 图表查询默认 30 天窗口，并提供服务端缓存（短 TTL）。

### 4.2 索引建议
- `RepaymentPlan(dueDate, status)` 已有索引复用。
- 增加：
  - `Order(borrowerName)` 模糊搜索可考虑 trigram（后续可选）。

## 5. 验收标准

### 5.1 功能验收
- 日历可显示当月到期/逾期分布，支持筛选并可跳转到订单详情。
- Dashboard 新增三类图表并与 KPI 口径一致。
- 附件支持 Lightbox 预览与键盘切换。

### 5.2 质量验收
- 新增 API 具备统一错误响应与日志。
- 新增服务层单元测试覆盖关键聚合逻辑。
- 主链路 E2E 增加“日历入口核销”场景。
