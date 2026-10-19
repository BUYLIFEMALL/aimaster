#!/usr/bin/env bash
# =====================================================================
# 대화형 설치 스크립트 (macOS / Linux) — 강의용 설치 키트 2026-10-18
# 실행 방법: 프로그램 폴더(이 KIT 폴더의 한 단계 위)에서
#   bash KIT/setup.sh
# 하는 일: ① Node.js 확인 ② 패키지 설치 ③ 설정값 입력 → .env.local 생성
#          ④ 내 컴퓨터에서 빌드 확인 ⑤ (원하면) Vercel 배포 + 환경변수 등록
# 비밀번호·키는 이 컴퓨터의 .env.local 과 본인 Vercel 프로젝트에만 저장됩니다.
# =====================================================================
set -e
KIT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROGRAM_DIR="$(dirname "$KIT_DIR")"
cd "$PROGRAM_DIR"
TITLE=$(node -e "console.log(require('$KIT_DIR/kit.json').title)" 2>/dev/null || echo "프로그램")
SHORT=$(node -e "console.log(require('$KIT_DIR/kit.json').shortName)" 2>/dev/null || echo "app")
CALLBACK=$(node -e "console.log(require('$KIT_DIR/kit.json').callbackPath)" 2>/dev/null || echo "")

say() { printf "\033[36m%s\033[0m\n" "$1"; }
ok() { printf "  \033[32m[OK]\033[0m %s\n" "$1"; }
warn() { printf "  \033[33m[주의]\033[0m %s\n" "$1"; }
ask() { local q="$1" d="$2" a; if [ -n "$d" ]; then read -r -p "$q [$d]: " a; else read -r -p "$q: " a; fi; echo "${a:-$d}"; }

say ""
say "==== $TITLE 설치를 시작합니다 ===="
say "폴더: $PROGRAM_DIR"

say ""; say "[1/5] Node.js 확인"
if ! command -v node >/dev/null 2>&1; then warn "Node.js가 없습니다. https://nodejs.org 에서 LTS(22 이상)를 설치한 뒤 다시 실행하세요."; exit 1; fi
MAJOR=$(node -v | sed 's/^v//' | cut -d. -f1)
if [ "$MAJOR" -lt 20 ]; then warn "Node.js $(node -v) 은 너무 낮습니다. 20 이상(권장 22 LTS)으로 올려 주세요."; exit 1; fi
ok "Node.js $(node -v)"

say ""; say "[2/5] 패키지 설치 (처음에는 몇 분 걸립니다)"
npm install
ok "패키지 설치 완료"

say ""; say "[3/5] 설정값 입력 (Supabase → Project Settings → API 화면을 옆에 열어 두세요)"
ENV_FILE="$PROGRAM_DIR/.env.local"
WRITE_ENV=y
if [ -f "$ENV_FILE" ]; then
  RE=$(ask "이미 .env.local 이 있습니다. 새로 만들까요? (y/n)" "n")
  [ "$RE" = "y" ] || { WRITE_ENV=n; ok "기존 .env.local 을 그대로 씁니다."; }
fi
if [ "$WRITE_ENV" = "y" ]; then
  PROJECT=$(ask "Vercel 프로젝트 이름(영문 소문자·숫자·-, 예: my-$SHORT)" "my-$SHORT")
  SITE_URL=$(ask "사이트 주소(모르면 그대로 Enter, 배포 후 다시 맞춥니다)" "https://$PROJECT.vercel.app")
  BRAND=$(ask "화면에 표시할 내 이름/브랜드(예: 홍길동 마케팅, 비우면 표시 안 함)" "")
  SUPABASE_URL=$(ask "Supabase Project URL (https://xxxx.supabase.co)" "")
  ANON_KEY=$(ask "Supabase anon(public) 또는 Publishable key" "")
  SERVICE_KEY=$(ask "Supabase service_role 또는 Secret key (절대 공개 금지)" "")
  CRON_SECRET=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
  cat > "$ENV_FILE" <<EOF
# $TITLE — 독립 운영 설정 (setup.sh 가 만든 파일, 절대 공개·커밋 금지)
NEXT_PUBLIC_STANDALONE_MODE=true
NEXT_PUBLIC_SITE_URL=$SITE_URL
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY
CRON_SECRET=$CRON_SECRET
NEXT_PUBLIC_BRAND_NAME=$BRAND
VERCEL_PROJECT_NAME=$PROJECT
EOF
  ok ".env.local 생성 (CRON_SECRET 자동 생성: 예약 게시 연결 때 사용 — 파일에서 확인)"
fi

say ""; say "[4/5] 내 컴퓨터에서 빌드 확인"
npm run build
ok "빌드 성공"

say ""; say "[5/5] Vercel 배포"
DEPLOY=$(ask "지금 Vercel에 배포할까요? (y/n)" "y")
[ "$DEPLOY" = "y" ] || { say "나중에 이 스크립트를 다시 실행하거나 KIT/README.md 4단계를 따라 배포하세요."; exit 0; }

getenv() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2-; }
PROJECT=$(getenv VERCEL_PROJECT_NAME)
say "브라우저가 열리면 본인 Vercel 계정으로 로그인하세요."
npx --yes vercel@latest login
npx --yes vercel@latest link --yes --project "$PROJECT"
push_env() { local v; v=$(getenv "$1"); [ -n "$v" ] || return 0; printf "%s" "$v" | npx --yes vercel@latest env add "$1" production --force >/dev/null; ok "환경변수 $1 등록"; }
for k in NEXT_PUBLIC_STANDALONE_MODE NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_BRAND_NAME NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY CRON_SECRET; do push_env "$k"; done
npx --yes vercel@latest deploy --prod --yes

say ""; say "Vercel 대시보드 → 이 프로젝트 → Settings → Domains 에 보이는 주소를 확인하세요."
OLD_URL=$(getenv NEXT_PUBLIC_SITE_URL)
REAL_URL=$(ask "실제 사이트 주소" "$OLD_URL")
if [ "$REAL_URL" != "$OLD_URL" ]; then
  sed -i.bak "s#^NEXT_PUBLIC_SITE_URL=.*#NEXT_PUBLIC_SITE_URL=$REAL_URL#" "$ENV_FILE" && rm -f "$ENV_FILE.bak"
  push_env NEXT_PUBLIC_SITE_URL
  say "주소가 바뀌어 한 번 더 배포합니다."
  npx --yes vercel@latest deploy --prod --yes
fi

say ""; say "==== 설치 완료 ===="
say "사이트: $REAL_URL"
say "Meta 앱 콜백 주소: $REAL_URL$CALLBACK"
say "다음 단계: KIT/README.md 의 5단계(Meta 앱 설정)부터 진행하세요."
