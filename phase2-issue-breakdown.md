# Mamba Finance Phase 2 Issue 清单（UX 增强）

日期：2026-03-04  
来源：[tech-spec-v2.md](/Users/yzy/Desktop/yzy-workspace/mamba-finance/tech-spec-v2.md)

## 阶段 A：数据与接口

### ISSUE-P2-001 还款日历聚合 API（P0）
- 目标：实现 `GET /api/calendar/repayments`
- 验收：
  - 支持 `month/status/keyword` 参数
  - 返回“按天聚合 + 当天计划列表”
  - 复用统一错误结构与日志

### ISSUE-P2-002 Dashboard 图表 API（P0）
- 目标：实现 `GET /api/dashboard/charts`
- 验收：
  - 返回 30 天资产趋势
  - 返回账户资产构成
  - 返回未来 7 天到期结构

## 阶段 B：前端核心交互

### ISSUE-P2-003 还款日历页面骨架（P0）
- 目标：新增 `/repayments/calendar`
- 验收：
  - 月视图渲染完整
  - 当日点击可打开计划清单抽屉

### ISSUE-P2-004 日历筛选与跳转（P1）
- 目标：支持状态筛选 + 借款人搜索 + 跳转详情
- 验收：
  - 筛选后日历数据实时刷新
  - 清单点击可跳转对应订单详情

### ISSUE-P2-005 日历内联核销（P0）
- 目标：在日清单内直接触发收款核销
- 验收：
  - 核销成功后当日统计和状态即时更新
  - 已支付计划不可重复核销

### ISSUE-P2-006 Dashboard 图表组件接入（P0）
- 目标：接入折线/环图/柱状图
- 验收：
  - 图表与 KPI 数据口径一致
  - 桌面/移动端布局稳定

## 阶段 C：附件体验增强

### ISSUE-P2-007 附件 Lightbox 预览（P1）
- 目标：订单详情附件支持全屏预览
- 验收：
  - 点击缩略图可打开大图
  - 支持左右切图与 Esc 关闭

### ISSUE-P2-008 移动端附件交互优化（P2）
- 目标：优化移动端浏览和操作
- 验收：
  - 全屏滑动浏览
  - 删除操作可达且有确认

## 阶段 D：测试与收尾

### ISSUE-P2-009 日历聚合服务单测（P0）
- 目标：覆盖日期边界和状态过滤
- 验收：
  - 跨月边界正确
  - `pending/overdue/paid` 统计准确

### ISSUE-P2-010 E2E 扩展（日历核销路径）（P1）
- 目标：新增“日历 -> 核销 -> 状态更新”端到端用例
- 验收：
  - CI/本地可稳定通过
  - 核销后日历与订单详情状态一致

## 推荐执行顺序
1. `ISSUE-P2-001` -> `ISSUE-P2-002`
2. `ISSUE-P2-003` -> `ISSUE-P2-005`
3. `ISSUE-P2-006` -> `ISSUE-P2-008`
4. `ISSUE-P2-009` -> `ISSUE-P2-010`
