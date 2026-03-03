# mamba-finance

Mamba Finance 是一个面向借贷订单周期的资产与债权管理系统（Web）。

## 当前状态
- 已完成：项目初始化（Next.js + TypeScript + Tailwind）
- 已完成：Prisma + PostgreSQL 接入
- 已完成：核心数据模型与首个迁移
- 方案文档：[tech-spec-v1.md](/Users/yzy/Desktop/yzy-workspace/mamba-finance/tech-spec-v1.md)
- 任务拆解：[mvp-issue-breakdown.md](/Users/yzy/Desktop/yzy-workspace/mamba-finance/mvp-issue-breakdown.md)

## 本地开发
1. 安装依赖：`npm install`
2. 配置环境变量：复制 `.env.example` 为 `.env` 并填写 `DATABASE_URL`
3. 生成 Prisma Client：`npx prisma generate`
4. 启动开发：`npm run dev`

## 常用命令
- `npm run lint`
- `npm run build`
- `npx prisma migrate dev`
- `npx prisma studio`
