#!/usr/bin/env bash
# =====================================================================
# 패키지 설치마법사 (macOS / Linux) — AIMaster 배포 키트 공용 템플릿
# 원본: AIMaster scripts/kit-template/setup.sh (포장 때 각 프로그램 KIT/ 로 복사됨 — 프로그램별 차이는 KIT/kit.json)
# 지침: AIMaster docs/DISTRIBUTION_KIT_GUIDE.md §2-2(패키지 설치마법사 표준)
# 실행: 프로그램 폴더의 「패키지설치마법사.command」 더블클릭 (또는 터미널에서 bash KIT/setup.sh)
# 하는 일(8단계): ① Node.js ② Supabase 프로젝트 ③ Supabase 키(확인) ④ DB 파일 실행(자동 복사·확인) ⑤ 이메일 확인 끄기
#                 ⑥ 사이트 설정 ⑦ 설치·빌드 ⑧ Vercel 배포(주소 자동 확인) → 설치결과.txt
# 필요한 화면은 마법사가 브라우저로 열어 주고, 붙여 넣을 내용은 클립보드에 복사해 둡니다. 중간에 멈춰도 다시 실행하면 이어서 합니다.
# 비밀번호·키는 이 컴퓨터의 .env.local 과 본인 Vercel 프로젝트에만 저장됩니다. 키는 입력할 때 화면에 보이지 않습니다.
# =====================================================================
KIT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROGRAM_DIR="$(dirname "$KIT_DIR")"
cd "$PROGRAM_DIR" || exit 1
ENV_FILE="$PROGRAM_DIR/.env.local"
PROGRESS_FILE="$PROGRAM_DIR/.kit-progress"
TOTAL=8

say() { printf "\033[36m%s\033[0m\n" "$1"; }
ok() { printf "  \033[32m[OK]\033[0m %s\n" "$1"; }
warn() { printf "  \033[33m[주의]\033[0m %s\n" "$1"; }
step() { printf "\n\033[35m──────── [%s/%s] %s ────────\033[0m\n" "$1" "$TOTAL" "$2"; }
ask() { local q="$1" d="$2" a; if [ -n "$d" ]; then read -r -p "  $q [$d]: " a; else read -r -p "  $q: " a; fi; echo "${a:-$d}"; }
ask_secret() { local a; read -r -s -p "  $1 (붙여넣기 ⌘V — 화면에 안 보여도 들어갑니다): " a; echo >&2; echo "$a" | tr -d '[:space:]'; }
wait_enter() { read -r -p "  $1 — 끝나면 Enter " _; }
open_url() { if command -v open >/dev/null 2>&1; then open "$1"; elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$1" >/dev/null 2>&1; else warn "이 주소를 직접 여세요: $1"; fi; }
copy_file() { if command -v pbcopy >/dev/null 2>&1; then pbcopy < "$1"; elif command -v xclip >/dev/null 2>&1; then xclip -selection clipboard < "$1"; else return 1; fi; }
copy_text() { if command -v pbcopy >/dev/null 2>&1; then printf "%s" "$1" | pbcopy; else return 1; fi; }
# Supabase는 브라우저처럼 보이는 요청의 Secret key를 거부한다 → 요청 표시를 지정(2026-10-19 확인)
http_status() { local url="$1" key="$2" auth=(); [ -n "$key" ] && auth=(-H "apikey: $key"); case "$key" in eyJ*) auth+=(-H "Authorization: Bearer $key");; esac
  curl -s -o /dev/null -w "%{http_code}" -A "aimaster-kit-setup" --max-time 20 "${auth[@]}" "$url" 2>/dev/null || echo 000; }
jwt_role() { case "$1" in eyJ*) node -e "try{const p=process.argv[1].split('.')[1];console.log(JSON.parse(Buffer.from(p,'base64url').toString()).role||'')}catch(e){console.log('')}" "$1";; *) echo "";; esac; }
done_step() { [ -f "$PROGRESS_FILE" ] && grep -qx "step$1" "$PROGRESS_FILE"; }
mark_done() { echo "step$1" >> "$PROGRESS_FILE"; }
env_get() { [ -f "$ENV_FILE" ] && grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2-; }
env_set() {
  if [ ! -f "$ENV_FILE" ]; then printf "# %s — 독립 운영 설정 (패키지 설치마법사가 만든 파일, 절대 공개·커밋 금지)\nNEXT_PUBLIC_STANDALONE_MODE=true\n" "$TITLE" > "$ENV_FILE"; fi
  grep -vE "^$1=" "$ENV_FILE" > "$ENV_FILE.tmp" || true; mv "$ENV_FILE.tmp" "$ENV_FILE"; printf "%s=%s\n" "$1" "$2" >> "$ENV_FILE"
}
pause_exit() { read -r -p "  Enter를 누르면 닫힙니다 " _; exit "${1:-1}"; }

clear
say "╔══════════════════════════════════════════════╗"

# ① Node.js (kit.json을 읽으려면 Node가 먼저 필요)
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/^v//' | cut -d. -f1)" -lt 20 ]; then
  say "   패키지 설치마법사"; say "╚══════════════════════════════════════════════╝"
  step 1 "Node.js 확인"
  warn "Node.js 22 LTS가 필요합니다$(command -v node >/dev/null 2>&1 && echo " (지금 $(node -v))")."
  say "  설치 화면을 엽니다 → macOS 설치 파일(.pkg)을 받아 설치하세요."
  open_url "https://nodejs.org/ko/download"
  say "  설치가 끝나면 이 창을 닫고 「패키지설치마법사.command」를 다시 실행하세요."
  pause_exit 1
fi
kit() { node -e "const k=require(process.argv[1]); const v=($2); console.log(v==null?'':v)" "$KIT_DIR/kit.json" 2>/dev/null; }
TITLE=$(kit x "k.title"); TITLE=${TITLE:-프로그램}
SHORT=$(kit x "k.shortName"); SHORT=${SHORT:-app}
CHECK_TABLE=$(kit x "k.checkTable"); CHECK_TABLE=${CHECK_TABLE:-profiles}
CALLBACK=$(kit x "k.callbackPath")
CALLBACK_LABEL=$(kit x "k.callbackLabel"); CALLBACK_LABEL=${CALLBACK_LABEL:-플랫폼 앱 콜백 주소}
NEXT_STEP=$(kit x "k.nextStep"); NEXT_STEP=${NEXT_STEP:-KIT/README.md 를 이어서 진행하세요.}
EXTRA_COUNT=$(kit x "(k.extraEnv||[]).length"); EXTRA_COUNT=${EXTRA_COUNT:-0}

say "   $TITLE — 패키지 설치마법사"
say "╚══════════════════════════════════════════════╝"
say "질문에 답만 하면 됩니다. 필요한 화면은 마법사가 브라우저로 열어 드립니다."
say "중간에 창을 닫아도 「패키지설치마법사」을 다시 실행하면 이어서 진행합니다."
say "폴더: $PROGRAM_DIR"
[ -d "$PROGRAM_DIR/.git" ] && warn "이 폴더가 Git 저장소입니다. 저장소 밖(예: ~/work/$SHORT)에 압축을 풀어 쓰는 것을 권장합니다."
if [ -f "$PROGRESS_FILE" ]; then
  AGAIN=$(ask "지난번에 하던 설치가 있습니다. 이어서 할까요? (y=이어서 / n=처음부터)" "y")
  [ "$AGAIN" = "y" ] || rm -f "$PROGRESS_FILE"
fi
step 1 "Node.js 확인"; ok "Node.js $(node -v)"

# ② Supabase 프로젝트
step 2 "Supabase(DB) 프로젝트 만들기"
SB_URL=$(env_get NEXT_PUBLIC_SUPABASE_URL)
if ! done_step 2 || [ -z "$SB_URL" ]; then
  say "  브라우저에서 Supabase 새 프로젝트 화면을 엽니다(처음이면 GitHub 또는 이메일로 무료 가입)."
  say "  · Project name: 아무 이름 · Database Password: [Generate] 후 메모장에 저장 · Region: Northeast Asia (Seoul)"
  say "  · [Create new project] → 1~2분 기다리면 프로젝트 화면이 열립니다."
  open_url "https://supabase.com/dashboard/new"
  while true; do
    RAW=$(ask "프로젝트 화면의 브라우저 주소창 주소를 복사해 붙여 넣으세요(또는 Project URL https://xxxx.supabase.co)" "")
    REF=$(printf "%s" "$RAW" | sed -nE 's#.*supabase\.com/dashboard/project/([a-z0-9]{20}).*#\1#p')
    [ -z "$REF" ] && REF=$(printf "%s" "$RAW" | sed -nE 's#.*https?://([a-z0-9]{20})\.supabase\.co.*#\1#p')
    if [ -z "$REF" ]; then warn "주소에서 프로젝트 ID(영문·숫자 20자)를 찾지 못했습니다. 프로젝트 화면 주소를 그대로 붙여 넣어 주세요."; continue; fi
    SB_URL="https://$REF.supabase.co"
    CODE=$(http_status "$SB_URL/auth/v1/health" "")
    [ "$CODE" = "200" ] || [ "$CODE" = "401" ] && break
    warn "$SB_URL 에 연결되지 않습니다. 프로젝트가 아직 만들어지는 중이면 1분 뒤 다시 붙여 넣으세요."
  done
  env_set NEXT_PUBLIC_SUPABASE_URL "$SB_URL"; mark_done 2
fi
REF=$(printf "%s" "$SB_URL" | sed -E 's#https://([a-z0-9]+)\.supabase\.co.*#\1#')
ok "Supabase 프로젝트: $SB_URL"

# ③ Supabase 키
step 3 "Supabase 키 등록(마법사가 맞는 키인지 확인합니다)"
if ! done_step 3 || [ -z "$(env_get SUPABASE_SERVICE_ROLE_KEY)" ]; then
  say "  API Keys 화면을 엽니다. 「Publishable key」와 「Secret key」(없으면 Legacy 탭의 anon / service_role)를 복사해 넣으세요."
  open_url "https://supabase.com/dashboard/project/$REF/settings/api-keys"
  while true; do
    ANON=$(ask_secret "① Publishable key (또는 anon public)")
    case "$ANON" in sb_secret_*) warn "이것은 Secret key입니다. ①에는 Publishable(공개) 키를 넣어 주세요."; continue;; esac
    [ "$(jwt_role "$ANON")" = "service_role" ] && { warn "이것은 service_role 키입니다. ①에는 anon(공개) 키를 넣어 주세요."; continue; }
    [ "$(http_status "$SB_URL/auth/v1/settings" "$ANON")" = "200" ] && break
    warn "이 프로젝트의 키가 아닌 것 같습니다. 다시 복사해 주세요."
  done
  ok "Publishable key 확인"
  while true; do
    SERVICE=$(ask_secret "② Secret key (또는 service_role — 절대 공개 금지)")
    case "$SERVICE" in sb_secret_*) ;; *) [ "$(jwt_role "$SERVICE")" = "service_role" ] || { warn "Secret key(sb_secret_…) 또는 service_role 키를 넣어 주세요(①과 다른 키입니다)."; continue; };; esac
    CODE=$(http_status "$SB_URL/rest/v1/" "$SERVICE")
    [ "$CODE" != "401" ] && [ "$CODE" != "403" ] && [ "$CODE" != "000" ] && break
    warn "이 프로젝트의 Secret key가 아닌 것 같습니다(응답 $CODE). 다시 복사해 주세요."
  done
  env_set NEXT_PUBLIC_SUPABASE_ANON_KEY "$ANON"; env_set SUPABASE_SERVICE_ROLE_KEY "$SERVICE"; mark_done 3
fi
SERVICE_KEY=$(env_get SUPABASE_SERVICE_ROLE_KEY)
ok "Supabase 키 저장(.env.local)"

# ④ DB 파일 실행
step 4 "DB 만들기(설치 SQL 실행)"
TABLE_URL="$SB_URL/rest/v1/$CHECK_TABLE?select=*&limit=1"
if [ "$(http_status "$TABLE_URL" "$SERVICE_KEY")" = "200" ]; then ok "DB가 이미 준비돼 있습니다($CHECK_TABLE 확인)"
else
  while true; do
    if copy_file "$KIT_DIR/schema.sql"; then ok "설치 SQL을 클립보드에 복사했습니다."; else warn "자동 복사에 실패했습니다. KIT/schema.sql 을 텍스트 편집기로 열어 전체 복사(⌘A, ⌘C)하세요."; fi
    say "  SQL Editor를 엽니다 → 빈 칸을 클릭하고 ⌘V → 오른쪽 아래 [Run] → 'Success' 확인"
    say "  ('destructive operation' 확인 창이 뜨면 [Run this query] 를 누르세요)"
    open_url "https://supabase.com/dashboard/project/$REF/sql/new"
    wait_enter "Run 을 눌렀나요?"
    [ "$(http_status "$TABLE_URL" "$SERVICE_KEY")" = "200" ] && { ok "DB 만들기 확인($CHECK_TABLE)"; break; }
    warn "아직 DB가 만들어지지 않았습니다. 빨간 오류가 보이면 그 문장을 메모해 두고, 한 번 더 붙여 넣고 Run 해 주세요."
  done
fi
mark_done 4

# ⑤ 이메일 확인 끄기
step 5 "회원가입 이메일 확인 끄기(내 사이트에 바로 가입되도록)"
if ! done_step 5; then
  say "  Sign In / Providers 화면을 엽니다 → Email 항목 → 「Confirm email」 끄기 → [Save]"
  open_url "https://supabase.com/dashboard/project/$REF/auth/providers"
  wait_enter "Confirm email 을 끄고 저장했나요?"; mark_done 5
fi
ok "이메일 확인 설정"

# ⑥ 사이트 설정
step 6 "내 사이트 설정"
if ! done_step 6 || [ -z "$(env_get VERCEL_PROJECT_NAME)" ]; then
  while true; do
    PROJECT=$(ask "사이트 이름(영문 소문자·숫자·-, 주소가 됩니다: https://이름.vercel.app)" "my-$SHORT-$((RANDOM % 900 + 100))")
    printf "%s" "$PROJECT" | grep -Eq '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$' && break
    warn "영문 소문자·숫자·- 만 쓸 수 있습니다(3~50자)."
  done
  BRAND=$(ask "화면에 표시할 내 이름/브랜드(예: 홍길동 마케팅, 비우면 표시 안 함)" "")
  env_set VERCEL_PROJECT_NAME "$PROJECT"; env_set NEXT_PUBLIC_SITE_URL "https://$PROJECT.vercel.app"; env_set NEXT_PUBLIC_BRAND_NAME "$BRAND"
  [ -n "$(env_get CRON_SECRET)" ] || env_set CRON_SECRET "$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")"
  i=0
  while [ "$i" -lt "$EXTRA_COUNT" ]; do
    NAME=$(kit x "k.extraEnv[$i].name"); Q=$(kit x "k.extraEnv[$i].question"); D=$(kit x "k.extraEnv[$i].default")
    FROM=$(kit x "k.extraEnv[$i].from"); SECRET=$(kit x "k.extraEnv[$i].secret ? 'y' : ''")
    if [ "$FROM" = "brand" ]; then V="$BRAND"; elif [ "$FROM" = "siteUrl" ]; then V="https://$PROJECT.vercel.app"
    elif [ -n "$SECRET" ]; then V=$(ask_secret "$Q"); else V=$(ask "$Q" "$D"); fi
    [ -n "$V" ] && env_set "$NAME" "$V"
    i=$((i+1))
  done
  mark_done 6
fi
ok "설정 저장(.env.local)"

# ⑦ 설치·빌드
step 7 "프로그램 설치·빌드(처음에는 3~5분 걸립니다)"
if ! done_step 7; then
  npm install --no-fund --no-audit || { warn "패키지 설치 실패. 인터넷 연결을 확인하고 다시 실행하세요."; pause_exit 1; }
  npm run build || { warn "빌드 실패. 위 오류와 KIT/README.md 의 '자주 막히는 곳'을 확인하세요."; pause_exit 1; }
  mark_done 7
fi
ok "설치·빌드 완료"

# ⑧ Vercel 배포
step 8 "인터넷에 올리기(Vercel 배포)"
PROJECT=$(env_get VERCEL_PROJECT_NAME)
say "  브라우저가 열리면 본인 Vercel 계정으로 로그인하세요(처음이면 무료 Hobby로 가입, 이미 로그인돼 있으면 넘어갑니다)."
npx --yes vercel@latest login
npx --yes vercel@latest link --yes --project "$PROJECT" || { warn "Vercel 프로젝트 연결 실패. 6단계 이름을 바꾸려면 .kit-progress 파일을 지우고 다시 실행하세요."; pause_exit 1; }
# 폴더가 GitHub 저장소 안이면 Vercel이 그 저장소를 자동 연결해 엉뚱한 코드가 배포될 수 있다(2026-10-19 리허설) → 연결 해제
npx --yes vercel@latest git disconnect --yes >/dev/null 2>&1 || true
push_env() { local v; v=$(env_get "$1"); [ -n "$v" ] || return 0; printf "%s" "$v" | npx --yes vercel@latest env add "$1" production --force >/dev/null 2>&1; ok "환경변수 $1"; }
for k in NEXT_PUBLIC_STANDALONE_MODE NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_BRAND_NAME NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY CRON_SECRET; do push_env "$k"; done
i=0; while [ "$i" -lt "$EXTRA_COUNT" ]; do push_env "$(kit x "k.extraEnv[$i].name")"; i=$((i+1)); done

deploy() { local log; log=$(npx --yes vercel@latest deploy --prod --yes 2>&1); printf "%s\n" "$log" | sed 's/^/  /' >&2; printf "%s" "$log"; }
LOG=$(deploy)
# 실제 사이트 주소 자동 확인: 이번 배포의 별칭(alias) 중 가장 짧은 *.vercel.app
DEPLOY_URL=$(printf "%s" "$LOG" | grep -oE 'https://[a-z0-9.-]+\.vercel\.app' | tail -1)
SITE_URL=$(env_get NEXT_PUBLIC_SITE_URL)
if [ -n "$DEPLOY_URL" ]; then
  ALIAS=$(npx --yes vercel@latest inspect "$DEPLOY_URL" 2>&1 | grep -oE 'https://[a-z0-9.-]+\.vercel\.app' | grep -vx "$DEPLOY_URL" | awk '{ print length, $0 }' | sort -n | head -1 | cut -d' ' -f2)
  [ -n "$ALIAS" ] && SITE_URL="$ALIAS"
fi
[ "$(http_status "$SITE_URL" "")" = "200" ] || SITE_URL=$(ask "사이트 주소를 확인하지 못했습니다. Vercel → 이 프로젝트 → Domains 의 주소를 넣어 주세요" "$SITE_URL")
if [ "$SITE_URL" != "$(env_get NEXT_PUBLIC_SITE_URL)" ]; then
  say "  실제 주소($SITE_URL)로 설정을 맞추고 한 번 더 올립니다."
  env_set NEXT_PUBLIC_SITE_URL "$SITE_URL"; push_env NEXT_PUBLIC_SITE_URL; deploy >/dev/null
fi
mark_done 8

# (선택) Supabase 로그인 주소 설정 — kit.json authRedirectPath 가 있는 프로그램만(예: 이메일 링크·OAuth 로그인 콜백)
AUTH_REDIRECT=$(kit x "k.authRedirectPath")
if [ -n "$AUTH_REDIRECT" ]; then
  say ""; say "  [마무리] Supabase 로그인 주소 설정 — URL Configuration 화면을 엽니다."
  say "  · Site URL 칸: $SITE_URL  (클립보드에 복사해 두었습니다 → ⌘V)"
  say "  · Redirect URLs → [Add URL]: $SITE_URL$AUTH_REDIRECT  → [Save]"
  copy_text "$SITE_URL" || true
  open_url "https://supabase.com/dashboard/project/$REF/auth/url-configuration"
  wait_enter "두 칸을 저장했나요?"
fi

CALLBACK_URL=""; [ -n "$CALLBACK" ] && CALLBACK_URL="$SITE_URL$CALLBACK"
{
  echo "$TITLE — 설치 결과 ($(date '+%Y-%m-%d %H:%M'))"; echo
  echo "내 사이트: $SITE_URL"
  [ -n "$CALLBACK_URL" ] && echo "$CALLBACK_LABEL: $CALLBACK_URL"
  echo "Supabase 프로젝트: https://supabase.com/dashboard/project/$REF"; echo
  echo "다음 단계: $NEXT_STEP"
  echo "  1) 내 사이트 /login 에서 회원가입 → 로그인(관리자 지정은 KIT/README.md 참고)"
  echo "  2) 플랫폼 앱을 만들고 위 콜백 주소를 등록 → 사이트 설정에 키 저장 → 계정 연결"
  echo "  3) 예약 게시: 사이트 설정 「⏰ 예약 발행」에 cron-job.org 키 등록"; echo
  echo "※ 비밀번호·키는 .env.local 과 Vercel에만 있습니다. 이 파일에는 비밀값이 없습니다."
} > "$PROGRAM_DIR/설치결과.txt"

echo
say "╔══════════════════════════════════════════════╗"
say "   설치 완료!"
say "╚══════════════════════════════════════════════╝"
say "내 사이트: $SITE_URL"
if [ -n "$CALLBACK_URL" ]; then if copy_text "$CALLBACK_URL"; then say "$CALLBACK_LABEL(클립보드에 복사됨): $CALLBACK_URL"; else say "$CALLBACK_LABEL: $CALLBACK_URL"; fi; fi
say "다음 단계: $NEXT_STEP"
say "이 내용은 프로그램 폴더의 「설치결과.txt」에도 저장했습니다."
open_url "$SITE_URL"
pause_exit 0
