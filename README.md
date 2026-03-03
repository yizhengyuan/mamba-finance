# mamba-finance

Mamba Finance 是一个面向借贷订单周期的资产与债权管理系统（Web）。

## 文档索引
- 产品需求：[prd.md](/Users/yzy/Desktop/yzy-workspace/mamba-finance/prd.md)
- 技术方案：[tech-spec-v1.md](/Users/yzy/Desktop/yzy-workspace/mamba-finance/tech-spec-v1.md)
- 任务拆解：[mvp-issue-breakdown.md](/Users/yzy/Desktop/yzy-workspace/mamba-finance/mvp-issue-breakdown.md)
- Phase 2 技术方案：[tech-spec-v2.md](/Users/yzy/Desktop/yzy-workspace/mamba-finance/tech-spec-v2.md)
- Phase 2 任务拆解：[phase2-issue-breakdown.md](/Users/yzy/Desktop/yzy-workspace/mamba-finance/phase2-issue-breakdown.md)
- 部署变量清单：[docs/deployment-env.md](/Users/yzy/Desktop/yzy-workspace/mamba-finance/docs/deployment-env.md)
- 上线与回滚检查表：[docs/release-checklist.md](/Users/yzy/Desktop/yzy-workspace/mamba-finance/docs/release-checklist.md)

## 技术栈
- Next.js 16（App Router）+ React 19 + TypeScript
- Prisma ORM + PostgreSQL
- Tailwind CSS 4
- 测试：Node Test Runner（unit/integration）+ Playwright（e2e）

## 30 分钟本地启动（新成员）
1. 准备环境：
   - Node.js 20+
   - PostgreSQL 14+
2. 克隆项目并安装依赖：
   - `npm install`
3. 初始化环境变量：
   - `cp .env.example .env`
   - 按本机实际信息修改 `DATABASE_URL`
4. 执行数据库迁移：
   - `npx prisma migrate dev`
5. 导入演示数据：
   - `npm run db:seed`
6. 启动开发服务：
   - `npm run dev`
7. 打开应用：
   - [http://127.0.0.1:3000](http://127.0.0.1:3000)
8. 烟雾验证：
   - Dashboard 可打开
   - Orders 页面可查看列表
   - Accounts 页面可查看账户

## 常用命令
- `npm run dev`: 启动开发服务器
- `npm run lint`: ESLint 检查
- `npm run test:unit`: 单元测试
- `npm run test:integration`: 集成测试（需要 `DATABASE_URL`）
- `npm run test:e2e`: E2E 测试（需要可用数据库）
- `npm run build`: 生产构建
- `npm run start`: 运行生产构建产物
- `npm run db:seed`: 导入本地演示数据
- `npx prisma migrate dev`: 本地创建并执行迁移
- `npx prisma migrate deploy`: 生产执行已提交迁移
- `npx prisma studio`: 打开 Prisma Studio

## 当前交付范围（MVP）
- 账户管理：新增、编辑、列表
- 订单管理：新增、列表、详情
- 还款计划：自动生成、按条件查询
- 收款核销：事务化入账 + 状态同步
- 附件能力：上传/删除
- Dashboard：核心经营指标汇总

## 质量门槛
- 提交前建议至少通过：
  - `npm run lint`
  - `npm run test:unit`
  - `npx tsc --noEmit`
  - `npm run build`
- 上线前请执行 [docs/release-checklist.md](/Users/yzy/Desktop/yzy-workspace/mamba-finance/docs/release-checklist.md)
