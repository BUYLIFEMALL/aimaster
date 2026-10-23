#!/bin/bash
# GIF 자동화 「내 PC 고속 변환」 로컬 렌더러 — 맥 삭제(ffmpeg는 지우지 않음).
set -euo pipefail
rm -f "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/xyz.buylife.gif_renderer.json"
rm -rf "$HOME/Library/Application Support/BuylifeGifRenderer"
echo "✔ 삭제했습니다. 크롬 확장은 chrome://extensions 에서 직접 삭제해 주세요."
