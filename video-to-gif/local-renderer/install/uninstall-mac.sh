#!/bin/bash
# GIF 자동화 「내 PC 고속 변환」 로컬 렌더러 — 맥 삭제(ffmpeg는 지우지 않음).
set -euo pipefail
for b in "Google/Chrome" "Chromium" "Microsoft Edge" "Naver/Whale"; do
  rm -f "$HOME/Library/Application Support/$b/NativeMessagingHosts/xyz.buylife.gif_renderer.json"
done
rm -rf "$HOME/Library/Application Support/BuylifeGifRenderer"
echo "✔ 삭제했습니다. 브라우저 확장은 확장 관리 화면에서 직접 삭제해 주세요."
