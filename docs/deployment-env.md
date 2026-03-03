# 部署环境变量清单

最后更新：2026-03-04

## 必填

### `DATABASE_URL`
- 说明：PostgreSQL 连接串，由 Prisma 读取。
- 示例：
  - `postgresql://postgres:postgres@localhost:5432/mamba_finance?schema=public`
- 注意：
  - 生产环境请使用独立账号与最小权限。
  - 必须包含正确的数据库名与 `schema`。

## 可选

### `NODE_ENV`
- 说明：Node 运行模式。
- 默认：由框架注入（通常为 `production`）。

### `PORT`
- 说明：`npm run start` 监听端口。
- 默认：`3000`

### `E2E_PORT`
- 说明：Playwright 本地启动测试服务端口（仅测试用）。
- 默认：`3100`

## 不建议放入环境变量的内容
- 应用级业务常量（例如月利率默认值、状态文案）应保持在代码中配置化，不放入部署变量。

## 生产环境建议
- 为不同环境分离数据库：
  - `mamba_finance_dev`
  - `mamba_finance_staging`
  - `mamba_finance_prod`
- 用 Secret Manager 注入 `DATABASE_URL`，不要写入仓库文件。
- 部署后先运行：
  - `npx prisma migrate deploy`
  - 再启动应用进程。
