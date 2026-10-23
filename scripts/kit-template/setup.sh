#!/usr/bin/env bash
# =====================================================================
# 패키지 설치마법사 (macOS / Linux) — AIMaster 배포 키트 공용 템플릿
# 원본: AIMaster scripts/kit-template/setup.sh (포장 때 각 프로그램 KIT/ 로 복사됨 — 프로그램별 차이는 KIT/kit.json)
# 지침: AIMaster docs/DISTRIBUTION_KIT_GUIDE.md §2-2(패키지 설치마법사 표준)
# 실행: 프로그램 폴더의 「패키지설치마법사.command」 더블클릭 (또는 터미널에서 bash KIT/setup.sh)
# 하는 일(8단계): ① Node.js ② Supabase 프로젝트 ③ Supabase 키(확인) ④ DB 파일 실행(자동 복사·확인) ⑤ 이메일 확인 끄기
#                 ⑥ 사이트 설정 ⑦ 설치·빌드 ⑧ Vercel 배포(주소 자동 확인) → 설치결과.txt
#   업데이트 모드: 예전 설치 폴더를 찾으면(또는 경로 입력) .env.local·.vercel 을 가져와 ②③⑤⑥을 건너뛰고 ④는 확인만, ⑦⑧로 다시 올림
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
# 업데이트 모드(2026-10-20): 예전에 설치한 내 사이트에 새 배포판 코드만 다시 올린다 — Supabase·키·DB·사이트 설정 단계는 건너뜀
UPDATE_MODE=0
is_installed() { [ -f "$1/.env.local" ] && grep -qE "^VERCEL_PROJECT_NAME=." "$1/.env.local"; }
same_program() { [ -f "$1/KIT/kit.json" ] && [ "$(node -e "try{console.log(require(process.argv[1]).shortName||'')}catch(e){console.log('')}" "$1/KIT/kit.json" 2>/dev/null)" = "$SHORT" ]; }
find_old_install() {
  local parent grand best="" best_t=0 d t
  parent="$(dirname "$PROGRAM_DIR")"; grand="$(dirname "$parent")"
  for d in "$parent"/*/ "$grand"/*/ "$grand"/*/*/; do
    d="${d%/}"; [ -d "$d" ] || continue; [ "$d" = "$PROGRAM_DIR" ] && continue
    if same_program "$d" && is_installed "$d"; then
      t=$(node -e "try{console.log(Math.floor(require('fs').statSync(process.argv[1]).mtimeMs))}catch(e){console.log(0)}" "$d/.env.local" 2>/dev/null)
      case "$t" in ''|*[!0-9]*) t=0;; esac
      if [ -z "$best" ] || [ "$t" -gt "$best_t" ]; then best="$d"; best_t=$t; fi
    fi
  done
  echo "$best"
}
# 버전 표시(설치결과.txt): 배포판 번호·프로그램 버전 — 포장 스크립트가 kit.json 에 적은 값, 옛 배포판은 00_START_HERE.md·version.ts 에서 읽음
version_info() {
  local dir="$1" kv av f
  kv=$(node -e "try{console.log(require(process.argv[1]).kitVersion||'')}catch(e){console.log('')}" "$dir/KIT/kit.json" 2>/dev/null)
  av=$(node -e "try{console.log(require(process.argv[1]).appVersion||'')}catch(e){console.log('')}" "$dir/KIT/kit.json" 2>/dev/null)
  [ -z "$kv" ] && [ -f "$(dirname "$dir")/00_START_HERE.md" ] && kv=$(grep -oE "배포판 v[0-9]+\.[0-9]{2}" "$(dirname "$dir")/00_START_HERE.md" | head -1 | sed 's/배포판 //')
  if [ -z "$av" ]; then for f in "$dir/lib/version.ts" "$dir/src/lib/version.ts"; do
    [ -f "$f" ] && av=$(grep -oE "APP_VERSION *= *[\"'][^\"']+" "$f" | head -1 | grep -oE "v[0-9]+\.[0-9]{2}") && [ -n "$av" ] && break
  done; fi
  if [ -n "$kv" ]; then printf "배포판 %s" "$kv"; else printf "배포판 번호 모름"; fi
  [ -n "$av" ] && printf " (프로그램 %s)" "$av"
  echo
}
UPDATE_FROM=""
OLD_VERSION=""
start_update() {
  UPDATE_FROM="$1"; OLD_VERSION=$(version_info "$1")
  cp "$1/.env.local" "$ENV_FILE"
  [ -d "$1/.vercel" ] && cp -R "$1/.vercel" "$PROGRAM_DIR/"
  rm -f "$PROGRESS_FILE"; for n in 2 3 5 6; do mark_done $n; done
  ok "예전 설정(.env.local·Vercel 연결)을 가져왔습니다: $1"
}
if is_installed "$PROGRAM_DIR" && done_step 8; then
  UPD=$(ask "이 폴더는 설치를 마친 폴더입니다. 지금 코드로 내 사이트를 다시 올릴까요? (y=업데이트 / n=처음부터 다시 설치)" "y")
  rm -f "$PROGRESS_FILE"
  if [ "$UPD" = "y" ]; then
    UPDATE_MODE=1; for n in 2 3 5 6; do mark_done $n; done
    [ -f "$PROGRAM_DIR/설치결과.txt" ] && OLD_VERSION=$(grep -m1 "^버전: " "$PROGRAM_DIR/설치결과.txt" | sed -e 's/^버전: //' -e 's/.* → //')
  fi
elif [ -f "$PROGRESS_FILE" ]; then
  AGAIN=$(ask "지난번에 하던 설치가 있습니다. 이어서 할까요? (y=이어서 / n=처음부터)" "y")
  [ "$AGAIN" = "y" ] || rm -f "$PROGRESS_FILE"
elif [ ! -f "$ENV_FILE" ]; then
  OLD=$(find_old_install)
  if [ -n "$OLD" ]; then
    echo; say "  예전에 설치한 같은 프로그램을 찾았습니다: $OLD"
    UPD=$(ask "새 버전으로 업데이트할까요? 예전 사이트·DB·키를 그대로 쓰고 새 코드만 다시 올립니다 (y=업데이트 / n=새로 설치)" "y")
    if [ "$UPD" = "y" ]; then start_update "$OLD"; UPDATE_MODE=1; fi
  else
    OLD=$(ask "예전에 이 프로그램을 설치한 적이 있으면 그 프로그램 폴더 경로를 붙여 넣으세요(업데이트 — 처음 설치면 그냥 Enter)" "")
    OLD=$(printf "%s" "$OLD" | sed -e "s/^[[:space:]\"']*//" -e "s/[[:space:]\"']*\$//"); OLD="${OLD/#\~/$HOME}"
    if [ -n "$OLD" ]; then
      if is_installed "$OLD"; then start_update "$OLD"; UPDATE_MODE=1
      else warn "그 폴더에서 설치 기록(.env.local)을 찾지 못했습니다. 처음 설치로 진행합니다."; fi
    fi
  fi
fi
if [ "$UPDATE_MODE" = "1" ]; then
  say "  [업데이트 모드] Supabase·키·DB·사이트 설정은 그대로 두고, 설치·빌드 → 같은 Vercel 프로젝트에 다시 올리기만 합니다."
  say "  DB(SQL) 작업이 필요한 업데이트인지 KIT/README.md 맨 아래 「업데이트 내역」을 먼저 확인하세요."
fi
step 1 "Node.js 확인"; ok "Node.js $(node -v)"

# ② Supabase 프로젝트
step 2 "Supabase(DB) 프로젝트 만들기"
SB_URL=$(env_get NEXT_PUBLIC_SUPABASE_URL)
if ! done_step 2 || [ -z "$SB_URL" ]; then
  say "  브라우저에서 Supabase 프로젝트 목록을 엽니다(처음이면 GitHub 또는 이메일로 무료 가입 → 조직(Organization) 하나 만들기, 플랜은 Free)."
  say "  · 이미 조직이 있으면 새 조직을 만들지 말고 그 조직에서 [New project] — 무료 프로젝트는 계정당 2개까지 0원입니다."
  say "  · Project name: 아무 이름 · Database password: [Generate a password] 후 메모장에 저장 · Region: Asia-Pacific(그대로) — 서울로 하려면 [Need a specific region?] → Seoul"
  say "  · 나머지는 그대로 두고 [Create new project] → 1~2분 기다리면 프로젝트 화면이 열립니다."
  open_url "https://supabase.com/dashboard/projects"
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
UPGRADE_FILES=$(cd "$KIT_DIR" && ls upgrade-*.sql 2>/dev/null | sed 's#^#KIT/#' | paste -sd ',' - | sed 's/,/, /g')
if [ "$(http_status "$TABLE_URL" "$SERVICE_KEY")" = "200" ]; then ok "DB가 이미 준비돼 있습니다($CHECK_TABLE 확인)"
  [ "$UPDATE_MODE" = "1" ] && [ -n "$UPGRADE_FILES" ] && say "  업데이트용 SQL: $UPGRADE_FILES — 「업데이트 내역」에 실행하라고 적힌 것만 SQL Editor에서 한 번 실행하세요(없으면 넘어가세요)."
elif [ "$UPDATE_MODE" = "1" ]; then
  # 기존 DB에는 설치 SQL 전체를 다시 돌리지 않는다 — 업데이트 내역의 SQL만 안내
  warn "기존 DB에서 $CHECK_TABLE 표를 찾지 못했습니다. 이번 버전은 DB 변경이 필요할 수 있습니다."
  say "  KIT/README.md 맨 아래 「업데이트 내역」에 적힌 SQL${UPGRADE_FILES:+($UPGRADE_FILES)}을 SQL Editor에서 실행하세요."
  open_url "https://supabase.com/dashboard/project/$REF/sql/new"
  while true; do
    wait_enter "업데이트 SQL을 실행했나요?"
    [ "$(http_status "$TABLE_URL" "$SERVICE_KEY")" = "200" ] && { ok "DB 확인($CHECK_TABLE)"; break; }
    warn "아직 $CHECK_TABLE 표가 보이지 않습니다. 예전 설치와 같은 Supabase 프로젝트인지, SQL에 빨간 오류가 없는지 확인해 주세요."
  done
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
  say "  가입할 때 확인 메일 없이 바로 로그인되도록 하는 설정입니다(내 사이트는 나만 쓰므로 확인 메일이 필요 없음)."
  say "  Sign In / Providers 화면을 엽니다 → 맨 위 「User Signups」 칸의 「Confirm email」 스위치를 끄기(회색) → [Save changes]"
  open_url "https://supabase.com/dashboard/project/$REF/auth/providers"
  wait_enter "Confirm email 을 끄고 저장했나요?"; mark_done 5
fi
ok "이메일 확인 설정"

# ⑥ 사이트 설정
step 6 "내 사이트 설정"
if ! done_step 6 || [ -z "$(env_get VERCEL_PROJECT_NAME)" ]; then
  while true; do
    PROJECT=$(ask "사이트 이름만 입력하세요 — 영문 소문자·숫자·- (예: my-insta → 주소 https://my-insta.vercel.app)" "my-$SHORT-$((RANDOM % 900 + 100))")
    printf "%s" "$PROJECT" | grep -Eq '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$' && break
    warn "영문 소문자·숫자·- 만 쓸 수 있습니다(3~50자)."
  done
  BRAND=$(ask "내 사이트 화면 위쪽(메뉴 제목·브라우저 탭)에 보일 내 이름/브랜드(예: 홍길동 마케팅 — 비우면 표시 안 함)" "")
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
  say ""; say "  [마무리] Supabase 로그인 주소 설정 — 가입 확인·비밀번호 메일의 링크가 localhost가 아니라 내 사이트로 오게 합니다."
  [ "$UPDATE_MODE" = "1" ] && say "  (예전에 이미 저장했다면 그냥 Enter — 사이트 주소가 바뀌었을 때만 고치면 됩니다)"
  say "  URL Configuration 화면을 엽니다."
  say "  · Site URL 칸: $SITE_URL  (클립보드에 복사해 두었습니다 → ⌘V) → [Save changes]"
  say "  · Redirect URLs → [Add URL]: $SITE_URL/**  → [Save URLs]  (이 줄은 Enter 뒤 클립보드에 복사됩니다)"
  copy_text "$SITE_URL" || true
  open_url "https://supabase.com/dashboard/project/$REF/auth/url-configuration"
  wait_enter "Site URL을 저장했나요?"
  copy_text "$SITE_URL/**" || true
  wait_enter "Redirect URLs에 $SITE_URL/** 를 추가(⌘V)했나요?"
fi

CALLBACK_URL=""; [ -n "$CALLBACK" ] && CALLBACK_URL="$SITE_URL$CALLBACK"
NEW_VERSION=$(version_info "$PROGRAM_DIR")
if [ "$UPDATE_MODE" = "1" ] && [ -n "$OLD_VERSION" ]; then VERSION_LINE="$OLD_VERSION → $NEW_VERSION"; else VERSION_LINE="$NEW_VERSION"; fi
{
  echo "$TITLE — $([ "$UPDATE_MODE" = "1" ] && echo 업데이트 || echo 설치) 결과 ($(date '+%Y-%m-%d %H:%M'))"; echo
  echo "내 사이트: $SITE_URL"
  echo "버전: $VERSION_LINE"
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
if [ "$UPDATE_MODE" = "1" ]; then say "   업데이트 완료!"; else say "   설치 완료!"; fi
say "╚══════════════════════════════════════════════╝"
say "내 사이트: $SITE_URL"
if [ -n "$CALLBACK_URL" ]; then if copy_text "$CALLBACK_URL"; then say "$CALLBACK_LABEL(클립보드에 복사됨): $CALLBACK_URL"; else say "$CALLBACK_LABEL: $CALLBACK_URL"; fi; fi
say "다음 단계: $NEXT_STEP"
say "버전: $VERSION_LINE"
say "이 내용은 프로그램 폴더의 「설치결과.txt」에도 저장했습니다."

# 업데이트 뒤 예전 폴더 정리 제안 — 키가 든 .env.local 이 남아 있으므로. 수강생이 y 한 경우에만 휴지통(~/.Trash)으로(바로 지우지 않음)
if [ "$UPDATE_MODE" = "1" ] && [ -n "$UPDATE_FROM" ] && [ -d "$UPDATE_FROM" ]; then
  OLD_FULL="$(cd "$UPDATE_FROM" && pwd)"
  case "$PROGRAM_DIR/" in "$OLD_FULL/"*) HOLDS_CURRENT=1;; *) HOLDS_CURRENT=0;; esac
  if [ "$HOLDS_CURRENT" = "0" ] && same_program "$OLD_FULL"; then
    echo; say "  예전 폴더에는 키가 든 .env.local 이 남아 있습니다(설정은 이 폴더로 복사했으니 지워도 됩니다): $OLD_FULL"
    DEL=$(ask "예전 폴더를 휴지통으로 보낼까요? (y=보내기 / n=남겨 두기)" "n")
    if [ "$DEL" = "y" ]; then
      if [ -d "$HOME/.Trash" ] && mv "$OLD_FULL" "$HOME/.Trash/$(basename "$OLD_FULL")-$(date +%Y%m%d%H%M%S)" 2>/dev/null; then
        ok "예전 폴더를 휴지통으로 보냈습니다. 키가 남지 않도록 휴지통도 비워 주세요."
      else warn "휴지통으로 보내지 못했습니다. 직접 지워 주세요: $OLD_FULL"; fi
    else say "  남겨 둡니다. 나중에 직접 지우세요(폴더째 남에게 보내지 마세요)."; fi
  fi
fi
open_url "$SITE_URL"
pause_exit 0
