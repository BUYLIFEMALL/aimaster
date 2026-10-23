#!/bin/bash
# GIF 자동화 「내 PC 고속 변환」 로컬 렌더러 — 맥 설치(무료, 관리자 권한 불필요).
# 사용: curl -fsSL https://video-to-gif.buylife.xyz/downloads/local-renderer/install-mac.sh | bash
#       (개발 시험: LOCAL_SRC=<local-renderer 폴더> bash install-mac.sh)
# 하는 일: ① 연결 스크립트(host.pl)를 내 계정 폴더에 복사 ② ffmpeg 찾기(없으면 Homebrew로 설치 안내/설치)
#          ③ 크롬에 연결 등록(~/Library/Application Support/Google/Chrome/NativeMessagingHosts/)
set -euo pipefail

HOST_NAME="xyz.buylife.gif_renderer"
EXT_ID="efgimakonmphcdojhiegemjmpbokpcgk"
BASE_URL="https://video-to-gif.buylife.xyz/downloads/local-renderer"
DEST="$HOME/Library/Application Support/BuylifeGifRenderer"
CHROME_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"

echo "▶ GIF 자동화 내 PC 고속 변환 — 설치를 시작합니다."
mkdir -p "$DEST" "$CHROME_DIR"

if [ -n "${LOCAL_SRC:-}" ]; then
  cp "$LOCAL_SRC/host/host.pl" "$DEST/host.pl"
else
  curl -fsSL "$BASE_URL/host.pl" -o "$DEST/host.pl"
fi
chmod 755 "$DEST/host.pl"

FFMPEG=""
# Homebrew 없이 직접 받은 ffmpeg는 이 폴더에 두면 쓴다(브라우저로 받은 파일의 맥 격리 표시는 지워 실행되게).
if [ -f "$DEST/ffmpeg" ]; then
  chmod 755 "$DEST/ffmpeg"
  xattr -d com.apple.quarantine "$DEST/ffmpeg" 2>/dev/null || true
fi
for p in /opt/homebrew/bin/ffmpeg /usr/local/bin/ffmpeg "$DEST/ffmpeg" "$(command -v ffmpeg 2>/dev/null || true)"; do
  if [ -n "$p" ] && [ -x "$p" ] && "$p" -hide_banner -version >/dev/null 2>&1; then FFMPEG="$p"; break; fi
done
if [ -z "$FFMPEG" ]; then
  BREW="$(command -v brew 2>/dev/null || true)"
  [ -z "$BREW" ] && [ -x /opt/homebrew/bin/brew ] && BREW=/opt/homebrew/bin/brew
  [ -z "$BREW" ] && [ -x /usr/local/bin/brew ] && BREW=/usr/local/bin/brew
  if [ -n "$BREW" ]; then
    echo "▶ ffmpeg가 없어 Homebrew로 설치합니다(무료, 몇 분 걸릴 수 있습니다)."
    "$BREW" install ffmpeg
    for p in /opt/homebrew/bin/ffmpeg /usr/local/bin/ffmpeg; do [ -x "$p" ] && FFMPEG="$p" && break; done
  fi
fi
if [ -z "$FFMPEG" ]; then
  echo "✖ ffmpeg를 찾지 못했습니다. 아래 둘 중 하나를 한 뒤 이 명령을 다시 실행해 주세요."
  echo "  ① Homebrew 설치(쉬움, 맥 로그인 비밀번호를 물어봄):"
  echo '     /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
  echo "  ② ffmpeg 직접 받기: https://evermeet.cx/ffmpeg/ 에서 ffmpeg 압축 파일을 받아 풀고, 안의 ffmpeg 파일을"
  echo "     $DEST 폴더에 넣기 (자세히: https://video-to-gif.buylife.xyz/guide#mac-ffmpeg)"
  open "$DEST" 2>/dev/null || true
  exit 1
fi

printf '{"ffmpeg":"%s"}\n' "$FFMPEG" > "$DEST/config.json"
cat > "$CHROME_DIR/$HOST_NAME.json" <<JSON
{
  "name": "$HOST_NAME",
  "description": "VideoToGIF local renderer",
  "path": "$DEST/host.pl",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://$EXT_ID/"]
}
JSON

echo "✔ 설치했습니다. ffmpeg: $FFMPEG"
echo "  이제 크롬에서 「GIF 자동화 · 내 PC 고속 변환」 확장을 켜고 GIF 자동화 화면을 새로고침하세요."
