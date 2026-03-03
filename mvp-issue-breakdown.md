# Mamba Finance MVP Issue 清单（可直接排期）

日期：2026-03-03  
来源：[tech-spec-v1.md](/Users/yzy/Desktop/yzy-workspace/mamba-finance/tech-spec-v1.md)

## 使用方式
- 每个条目即一个开发 Issue（可直接复制到 GitHub/Jira）
- `P0` 为阻塞主链路，必须先做
- 建议按“阶段顺序”推进；同阶段可并行

## 阶段 0：项目与工程基础

### ISSUE-001 初始化项目骨架（P0）
- 目标：创建 Next.js + TypeScript + Tailwind + ESLint + Prettier 项目
- 产出：可启动的 Web 项目与基础目录结构
- 验收标准：
  - `pnpm dev` 可启动
  - 代码检查与格式化脚本可运行
  - 目录包含 `app/`, `src/`, `prisma/`, `tests/`
- 依赖：无

### ISSUE-002 配置 Prisma + PostgreSQL（P0）
- 目标：接入数据库并打通 Prisma Client
- 产出：`.env.example`、Prisma 初始化文件
- 验收标准：
  - Prisma 可连接数据库
  - `prisma generate` 成功
  - 本地能执行迁移命令
- 依赖：ISSUE-001

## 阶段 1：核心数据与领域能力

### ISSUE-003 落地核心 Schema 与首个迁移（P0）
- 目标：实现 Account/Order/RepaymentPlan/Transaction/Attachment 模型
- 产出：`prisma/schema.prisma` + migration
- 验收标准：
  - 模型字段与 `tech-spec-v1` 一致
  - 唯一索引、外键、枚举正确
  - 数据库可成功迁移
- 依赖：ISSUE-002

### ISSUE-004 种子数据与本地开发数据集（P1）
- 目标：提供最小可演示数据
- 产出：`prisma/seed.*`
- 验收标准：
  - 一键导入 2 账户、2 订单、对应还款计划
  - Dashboard/订单页可直接演示
- 依赖：ISSUE-003

### ISSUE-005 还款计划生成器（P0）
- 目标：实现按月收息、末期收本息算法
- 产出：独立领域服务 `repayment-plan-generator`
- 验收标准：
  - 支持月底锚点（如 1/31 -> 2/28 或 2/29）
  - 金额四舍五入到 0.01
  - 输出 `principalDue/interestDue/totalDue/periodIndex/dueDate`
- 依赖：ISSUE-003

### ISSUE-006 订单状态机服务（P0）
- 目标：实现 `active/overdue/closed` 规则
- 产出：订单状态计算与更新服务
- 验收标准：
  - 全部计划已支付时自动 `closed`
  - 存在逾期计划时 `overdue`
  - 不出现 `closed -> active` 逆向变更
- 依赖：ISSUE-003

## 阶段 2：后端 API（主业务链路）

### ISSUE-007 账户 API（P1）
- 目标：实现 `GET/POST/PATCH /api/accounts`
- 产出：账户查询与维护接口
- 验收标准：
  - 支持新建/编辑/列表
  - 字段校验与错误码完整
- 依赖：ISSUE-003

### ISSUE-008 创建订单 API（P0）
- 目标：实现 `POST /api/orders`，自动生成还款计划
- 产出：订单创建事务
- 验收标准：
  - 单次请求创建 Order + RepaymentPlan N 条
  - 输入校验：`principal > 0`, `0 < rate <= 1`, `months >= 1`
  - 异常回滚，不产生半成数据
- 依赖：ISSUE-005, ISSUE-003

### ISSUE-009 订单查询 API（P1）
- 目标：实现 `GET /api/orders` 与 `GET /api/orders/:id`
- 产出：订单列表与详情接口
- 验收标准：
  - 支持按状态过滤
  - 详情返回计划与附件
- 依赖：ISSUE-003

### ISSUE-010 收款核销 API（P0）
- 目标：实现 `POST /api/repayment-plans/:id/collect`
- 产出：事务化核销流程
- 验收标准：
  - 校验计划未支付且金额等于应收
  - 同时写入 Transaction、更新 Plan、更新 Account 余额
  - 并发下不重复核销
- 依赖：ISSUE-003, ISSUE-006

### ISSUE-011 到期计划查询 API（P1）
- 目标：实现 `GET /api/repayment-plans?date=...&status=...`
- 产出：按日期/状态筛选能力
- 验收标准：
  - 支持“今日到期”和“逾期未收”场景
- 依赖：ISSUE-003

### ISSUE-012 附件上传/删除 API（P1）
- 目标：实现 `POST /api/orders/:id/attachments`、`DELETE /api/attachments/:id`
- 产出：凭证文件管理能力
- 验收标准：
  - 支持图片上传并落盘（MVP 本地）
  - 记录元数据到 Attachment
- 依赖：ISSUE-003

## 阶段 3：前端页面与交互

### ISSUE-013 全局布局与导航（P1）
- 目标：搭建 Dashboard/Accounts/Orders 基础导航与页面壳
- 产出：统一 Layout、侧栏、顶部操作区
- 验收标准：
  - 可在 4 个核心路由间稳定跳转
- 依赖：ISSUE-001

### ISSUE-014 订单列表页（P1）
- 目标：展示订单列表与状态筛选
- 产出：`/orders`
- 验收标准：
  - 可按 active/overdue/closed 筛选
  - 显示 borrower、principal、nextDue、status
- 依赖：ISSUE-009, ISSUE-013

### ISSUE-015 新建订单抽屉（P0）
- 目标：用侧边抽屉完成订单录入
- 产出：`/orders` 创建交互
- 验收标准：
  - 提交后生成订单与计划
  - 表单错误有明确提示
- 依赖：ISSUE-008, ISSUE-014

### ISSUE-016 订单详情页（P0）
- 目标：展示订单基础信息、还款计划、附件墙
- 产出：`/orders/[id]`
- 验收标准：
  - 计划列表包含每期应收/状态
  - 附件支持缩略图与预览
- 依赖：ISSUE-009, ISSUE-012

### ISSUE-017 收款核销交互（P0）
- 目标：在详情页/到期列表直接核销
- 产出：收款弹窗或内联表单
- 验收标准：
  - 成功后 UI 状态即时更新
  - 已支付计划不可重复操作
- 依赖：ISSUE-010, ISSUE-016

### ISSUE-018 Dashboard MVP（P1）
- 目标：展示关键经营指标
- 产出：`/dashboard`
- 验收标准：
  - 指标包含总资产、待回本金、本月预计利息、今日到期/逾期数
  - 数据与底层明细可对账
- 依赖：ISSUE-007, ISSUE-009, ISSUE-011

### ISSUE-019 账户页（P2）
- 目标：账户列表与维护
- 产出：`/accounts`
- 验收标准：
  - 新建/编辑账户可用
  - 显示当前余额与账户类型
- 依赖：ISSUE-007, ISSUE-013

## 阶段 4：测试与稳定性

### ISSUE-020 还款算法单元测试（P0）
- 目标：覆盖核心日期与金额边界
- 产出：`tests/unit/repayment-plan-generator.test.*`
- 验收标准：
  - 覆盖月底锚点、闰年、精度舍入
- 依赖：ISSUE-005

### ISSUE-021 核销事务集成测试（P0）
- 目标：确保核销一致性与幂等性
- 产出：`tests/integration/collect-payment.test.*`
- 验收标准：
  - 任一步失败全部回滚
  - 并发请求仅一次成功
- 依赖：ISSUE-010

### ISSUE-022 主链路 E2E（P1）
- 目标：打通“创建订单->生成计划->收款->订单关闭”
- 产出：Playwright/Cypress 用例
- 验收标准：
  - CI 中可稳定通过
- 依赖：ISSUE-015, ISSUE-016, ISSUE-017

### ISSUE-023 错误处理与可观测性（P1）
- 目标：统一 API 错误结构与关键日志
- 产出：错误中间件与业务日志
- 验收标准：
  - 前端可展示可读错误
  - 核销、建单等关键操作有日志
- 依赖：ISSUE-008, ISSUE-010

## 阶段 5：发布准备

### ISSUE-024 文档与运维基线（P1）
- 目标：补齐运行、迁移、回滚说明
- 产出：README、部署变量清单、上线检查表
- 验收标准：
  - 新成员按文档可在 30 分钟内本地跑起
- 依赖：ISSUE-001~ISSUE-023

## 建议排期（10 天单人）
- Day 1-2：ISSUE-001~005
- Day 3-4：ISSUE-006~010
- Day 5-6：ISSUE-011~017
- Day 7：ISSUE-018~019
- Day 8-9：ISSUE-020~023
- Day 10：ISSUE-024

## MVP 出货门槛（Definition of Done）
- `P0` 全部完成并通过测试
- 主链路 E2E 通过
- 核销无脏数据（余额、流水、计划状态一致）
- 首页可在 2 步内查看今日到期/逾期
