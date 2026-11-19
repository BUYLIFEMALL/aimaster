// 격리 사본 서버에 넘길 프로세스 환경을 「허용 이름만」으로 새로 조립한다.
// 주변(ambient) 셸 환경을 통째로 물려주지 않는다 — 2026-11-19 V3 3차에서 이 PC 셸의 GOOGLE_API_KEY·GEMINI_API_KEY 이름이
// 자식 프로세스에 함께 들어간 것이 발견되어(W00_BASELINE §14-AM) 만든 장치다. 값은 어디에도 출력하지 않는다(이름만 다룬다).

// 운영체제·Node 실행에 필요한 일반 이름(비밀값이 아닌 것만). 대소문자를 구분하지 않고 대조한다(윈도우는 Path/PATH가 섞여 있다).
const SYSTEM_ALLOW = [
  "PATH", "PATHEXT", "SYSTEMROOT", "SYSTEMDRIVE", "WINDIR", "COMSPEC",
  "TEMP", "TMP", "TMPDIR", "USERPROFILE", "HOMEDRIVE", "HOMEPATH", "HOME",
  "APPDATA", "LOCALAPPDATA", "PROGRAMDATA", "PROGRAMFILES", "PROGRAMFILES(X86)", "COMMONPROGRAMFILES",
  "NUMBER_OF_PROCESSORS", "PROCESSOR_ARCHITECTURE", "OS", "LANG", "TZ",
];

// 앱이 쓰는 접속 설정 이름(V4 경로: 로그인 → 올리기 → 조회 → 받기 → 생성). 회원의 AI 키는 여기에 없다 — 앱이 DB에서 읽는 기존 경로 그대로다.
const APP_ALLOW = [
  "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_MAIN_SITE_URL",
];

// 허용 목록에 실수로 들어와서는 안 되는 이름의 모양(이중 잠금). APP_ALLOW에 명시된 이름만 예외다.
const SECRET_SHAPE = /(API_?KEY|SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL|PRIVATE)/i;

const SYSTEM_SET = new Set(SYSTEM_ALLOW);
const APP_SET = new Set(APP_ALLOW);

function isAllowedName(name) {
  return APP_SET.has(name) || SYSTEM_SET.has(String(name).toUpperCase());
}

// ambient: 주변 환경(보통 process.env), picked: 접속 설정 원본에서 읽은 이름=값.
// 반환: { env, dropped } — env는 새 객체, dropped는 버린 「이름의 개수」(이름·값은 돌려주지 않는다).
function buildChildEnv(ambient, picked) {
  const env = {};
  let droppedAmbient = 0;
  let droppedPicked = 0;
  for (const [k, v] of Object.entries(ambient || {})) {
    if (v == null) continue;
    if (SYSTEM_SET.has(k.toUpperCase())) env[k] = v; else droppedAmbient += 1;
  }
  for (const [k, v] of Object.entries(picked || {})) {
    if (APP_SET.has(k) && v) env[k] = v; else droppedPicked += 1;
  }
  assertChildEnv(env);
  return { env, dropped: { ambient: droppedAmbient, picked: droppedPicked } };
}

// 자식에게 넘기기 직전의 마지막 검사. 하나라도 어긋나면 던진다 — 호출한 쪽은 서버를 띄우지 않아야 한다.
function assertChildEnv(env) {
  const bad = [];
  for (const k of Object.keys(env)) {
    if (!isAllowedName(k)) { bad.push(k); continue; }
    if (!APP_SET.has(k) && SECRET_SHAPE.test(k)) bad.push(k);
  }
  if (bad.length) {
    const err = new Error(`격리 환경에 허용되지 않은 이름 ${bad.length}개: ${bad.join(", ")}`);
    err.code = "ISOLATED_ENV_REJECTED";
    throw err;
  }
  return true;
}

// Next가 스스로 읽는 환경 파일 후보(설치본 next 16.4.2의 @next/env: `.env.<모드>.local` → `.env.local` → `.env.<모드>` → `.env`).
// 개발 서버는 development 모드지만, 모드가 바뀌어도 새지 않도록 세 모드를 모두 막는다. `.env.vault`는 내장 dotenv가 아는 이름이라 함께 막는다.
// 2026-11-19 Mac 독립 확인(msg_7949975ef65b)에서 이전 가드가 `.env`·`.env.local`만 본다는 지적을 받아 넓혔다.
const ENV_FILE_CANDIDATES = [
  ".env", ".env.local",
  ".env.development", ".env.development.local",
  ".env.production", ".env.production.local",
  ".env.test", ".env.test.local",
  ".env.vault",
];
const ENV_FILE_SET = new Set(ENV_FILE_CANDIDATES);

// 폴더의 「이름 목록」만 본다 — 파일을 열지 않는다. 대소문자를 무시한다(윈도우·맥 기본 파일 시스템은 `.ENV.local`도 같은 파일로 읽는다).
// 폴더·깨진 링크처럼 Next가 읽지 못할 것도 이름이 같으면 막는다(안전한 쪽으로).
function findEnvFiles(dir, readdir = require("fs").readdirSync) {
  return readdir(dir).filter((name) => ENV_FILE_SET.has(String(name).toLowerCase())).sort();
}

function assertNoEnvFiles(dir, readdir) {
  const found = findEnvFiles(dir, readdir);
  if (found.length) {
    const err = new Error(`격리 사본에 환경 파일 ${found.length}개: ${found.join(", ")} — 서버를 띄우지 않습니다`);
    err.code = "ISOLATED_ENVFILE_PRESENT";
    throw err;
  }
  return true;
}

// 실행기가 쓰는 한 묶음: 환경 파일 차단 → 환경 조립(검사 포함) → 띄우기. 앞 단계가 던지면 spawnFn은 불리지 않는다.
function launchGuarded({ copyDir, ambient, picked, spawnFn, readdir }) {
  assertNoEnvFiles(copyDir, readdir);
  const { env, dropped } = buildChildEnv(ambient, picked);
  return { child: spawnFn(env), env, dropped };
}

module.exports = { SYSTEM_ALLOW, APP_ALLOW, ENV_FILE_CANDIDATES, buildChildEnv, assertChildEnv, isAllowedName, findEnvFiles, assertNoEnvFiles, launchGuarded };
