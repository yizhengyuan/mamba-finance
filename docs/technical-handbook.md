# Mamba Finance 技术手册

本文档面向研发与运维，集中维护项目的开发、测试、部署信息。

## 1. 技术栈

- Next.js 16（App Router）+ React 19 + TypeScript
- Prisma ORM + PostgreSQL
- Tailwind CSS 4
- 测试：Node Test Runner（unit/integration）+ Playwright（e2e）

## 2. 本地开发启动

### 2.1 常规启动

```bash
brew services start postgresql@16
cd /Users/yzy/Desktop/yzy-workspace/mamba-finance
npx prisma migrate dev
npm run db:seed
npm run dev
```

### 2.2 一键启动

```bash
cd /Users/yzy/Desktop/yzy-workspace/mamba-finance
npm run dev:up
```

## 3. 临时分享链接（仅演示）

```bash
brew install cloudflared
cd /Users/yzy/Desktop/yzy-workspace/mamba-finance
npm run dev:share
```

说明：

- 该方式仅适合临时演示，不建议生产使用
- 本机终端停止后链接会失效

## 4. 常用命令

- `npm run dev`: 启动开发服务器
- `npm run dev:up`: 一键启动数据库+迁移+seed+dev
- `npm run dev:share`: 生成临时外部体验链接（cloudflared）
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

## 5. 测试与验收

- 详细测试流程见：[docs/testing-and-acceptance-manual.md](/Users/yzy/Desktop/yzy-workspace/mamba-finance/docs/testing-and-acceptance-manual.md)

最小通过标准：

1. `npm run test:unit`
2. `npm run test:integration`
3. `npm run test:e2e`
4. `npm run build`

## 6. 部署与发布

- 环境变量清单：[docs/deployment-env.md](/Users/yzy/Desktop/yzy-workspace/mamba-finance/docs/deployment-env.md)
- 发布检查与回滚：[docs/release-checklist.md](/Users/yzy/Desktop/yzy-workspace/mamba-finance/docs/release-checklist.md)

推荐生产部署路径：

1. 部署到云服务器（如阿里云 ECS）
2. 反向代理（Nginx）+ HTTPS
3. PostgreSQL 独立管理与定期备份
