#!/usr/bin/env bash

set -euo pipefail

PORT="${1:-3000}"
LOCAL_URL="http://127.0.0.1:${PORT}"

echo "==> 检查本地服务: ${LOCAL_URL}"
if ! curl -fsS "${LOCAL_URL}" >/dev/null 2>&1; then
  echo "本地服务不可达，请先在另一个终端运行: npm run dev:up"
  exit 1
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "未检测到 cloudflared。请先安装:"
  echo "  brew install cloudflared"
  exit 1
fi

echo "==> 创建临时公网链接（Ctrl+C 可停止分享）"
echo "注意: 分享期间你的本机和 dev 服务必须保持运行。"

cloudflared tunnel --url "${LOCAL_URL}" --no-autoupdate 2>&1 | awk '
{
  print $0
  if ($0 ~ /https:\/\/[-a-zA-Z0-9]+\.trycloudflare\.com/) {
    match($0, /https:\/\/[-a-zA-Z0-9]+\.trycloudflare\.com/)
    if (RSTART > 0) {
      link = substr($0, RSTART, RLENGTH)
      printf("\n=== 可分享体验链接 ===\n%s\n\n", link)
      fflush()
    }
  }
}'
