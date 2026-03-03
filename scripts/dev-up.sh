#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Mamba Finance 一键启动（本地）"

if [[ ! -f ".env" ]]; then
  echo "未找到 .env，请先执行: cp .env.example .env"
  exit 1
fi

if ! grep -q "^DATABASE_URL=" ".env"; then
  echo ".env 中未检测到 DATABASE_URL，请先配置数据库连接。"
  exit 1
fi

if command -v brew >/dev/null 2>&1; then
  echo "==> 启动 PostgreSQL 服务（postgresql@16）"
  brew services start postgresql@16 >/dev/null
else
  echo "警告: 未检测到 brew，已跳过数据库服务启动。"
  echo "请确认 PostgreSQL 已手动启动。"
fi

echo "==> 执行数据库迁移"
if ! npx prisma migrate deploy; then
  echo "migrate deploy 失败，回退尝试 migrate dev（本地开发模式）"
  npx prisma migrate dev
fi

echo "==> 导入演示数据"
npm run db:seed

echo "==> 启动 Next.js 开发服务"
echo "访问地址: http://127.0.0.1:3000"
npm run dev
