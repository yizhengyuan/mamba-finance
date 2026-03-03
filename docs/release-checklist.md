# 上线与回滚检查表

最后更新：2026-03-04

## 1. 上线前检查（Pre-flight）

1. 代码分支与远端同步，且无未提交变更：
   - `git status --short --branch`
2. 本地质量检查通过：
   - `npm run lint`
   - `npm run test:unit`
   - `npx tsc --noEmit`
   - `npm run build`
3. 数据库迁移已提交到仓库：
   - 检查 `prisma/migrations/` 是否包含本次变更
4. 已确认部署变量：
   - 参考 [docs/deployment-env.md](/Users/yzy/Desktop/yzy-workspace/mamba-finance/docs/deployment-env.md)
5. 关键路径人工走查：
   - 创建订单
   - 收款核销
   - 附件上传/删除
   - Dashboard 指标加载

## 2. 发布步骤（Deploy）

1. 拉取目标版本代码。
2. 安装依赖：
   - `npm ci`
3. 执行生产迁移：
   - `npx prisma migrate deploy`
4. 构建并启动：
   - `npm run build`
   - `npm run start`
5. 发布后烟雾验证（建议 5 分钟内完成）：
   - `GET /api/dashboard/summary` 返回 200
   - `GET /api/orders` 返回 200
   - Web 首页可访问且无明显报错

## 3. 回滚策略（Rollback）

MVP 阶段以“应用版本回滚 + 数据库人工修复”为主，避免自动逆向迁移导致数据不一致。

1. 触发条件（任一满足即回滚）：
   - 核销链路不可用
   - 数据写入异常（订单、计划、流水不一致）
   - 服务持续 5xx 且 5 分钟内无法恢复
2. 应用层回滚：
   - 切回上一个稳定 Git 提交并重新部署
3. 数据层处理：
   - Prisma 默认不建议生产直接执行 `migrate reset`
   - 若迁移导致故障，优先执行：
     - 从发布前数据库备份恢复
     - 或针对异常记录执行人工 SQL 修复
4. 回滚后验证：
   - `GET /api/orders` 正常
   - 可完成一笔收款核销且余额/流水/计划状态一致

## 4. 发布记录模板

建议每次上线在团队文档记录以下内容：

- 发布日期与时区（例如：2026-03-04 Asia/Shanghai）
- 发布人
- Git 提交号
- 迁移版本号（如有）
- 风险点与观察项
- 回滚方案责任人
