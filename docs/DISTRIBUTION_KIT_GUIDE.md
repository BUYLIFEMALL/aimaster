# AIMaster 서브프로그램 개별 배포 키트 지침 (DISTRIBUTION_KIT_GUIDE) — 공용 레퍼런스

> **📌 이 문서는 계속 자라는 공용 레퍼런스 문서다(2026-10-19 주인님 지시).** 모든 CLI(Claude Code·Codex·agy, 윈도우·맥미니)는 외부 배포(설치 키트·복제 키트·강의 배포판) 작업 **전에 읽고**, 작업 **중·후에 새로 알게 된 주의사항·함정·개선점을 같은 작업(같은 커밋)에서 이 문서에 추가**한다.
> - 화면이 바뀐 곳·막힌 곳·수강생 질문 → **§6-3 함정 표**에 한 줄(날짜·프로그램·대응)
> - 더 편하게 만들 아이디어·아직 못 한 개선 → **§11 개선 대기 목록**(처리하면 「✅ 날짜·커밋」으로 표시, 지우지 않음)
> - 키트를 새로 만들거나 다시 포장·리허설 → **§8 현황표**, 규칙이 바뀌면 **§10 변경 이력**
> - 다른 CLI가 쓴 항목은 지우거나 덮어쓰지 않고 보완만 한다(append-only).

> 2026-10-19 주인님 지시로 제정, 모든 CLI 공통. **AIMaster에서 개발·운영 중인 서브프로그램을 수강생(외부)에게 「설치 키트」로 넘겨 각자 자기 계정에서 독립 프로그램으로 돌리게 할 때 반드시 이 문서를 따른다.**
> 목표: ① 수강생이 초보여도 **압축 풀기 → 「패키지 설치마법사」 더블클릭 1번(묻는 값만 입력) → 키 등록**으로 끝나게 ② 운영자(주인님·CLI)의 **이전 작업 손이 최소**가 되게 ③ 운영 프로그램이 바뀌면 **배포판도 같은 코드로 바로 다시 만들 수 있게**.
> 기준 사례: `threads-content-ops/KIT/`(PDS `SNS_Auto_Posting_Kit_20261018`, 2026-10-19 리허설 완료 — 기록 `docs/sns-kit-manual/REHEARSAL_LOG.md`), `threads-affiliate-poster/clone-kit/`.

---

## 1. 대원칙 5가지

1. **코드는 하나, 스위치로 나눈다.** 배포판을 위해 원본을 복사해 따로 고치지 않는다. 원본 프로그램 안에서 `NEXT_PUBLIC_STANDALONE_MODE=true`(= `IS_STANDALONE`)일 때만 다르게 동작하게 만든다. 배포판은 「원본 + `KIT/` 폴더」를 **포장만** 한 것이다.
   - 이유: 2026-10-19 리허설에서 키트 사본(`labs/kit-threads`)을 따로 고치다 운영 원본과 어긋나, 같은 수정을 두 번 하고 다시 맞추는 일이 생겼다. 고칠 것은 **원본에서** 고치고 키트는 다시 포장한다.
2. **수강생이 모든 것을 소유한다.** Supabase·Vercel·플랫폼 앱(Meta 등)·AI 키·예약 실행(cron-job.org)까지 전부 수강생 본인 계정. 배포판은 AIMaster(buylife.xyz), 공용 DB, 다른 AIMaster 프로그램 테이블, 운영자 키에 **하나도 기대지 않는다**(최상단 규칙 「본인 계정·본인 키」).
3. **무료 요금제로 끝까지 돌아가야 한다.** 수강생은 대부분 Vercel·Supabase 무료로 시작한다. 무료에서 안 되는 기능(예: Vercel 1분 `crons`)은 무료 대안(예: 회원 본인 cron-job.org)을 **기본값**으로 두고, 유료(Pro) 기능은 「켜면 쓸 수 있는 선택지」로 둔다.
4. **설치는 「패키지 설치마법사」 더블클릭 1번(2026-10-19 주인님 지시·명명, 필수 표준 §2-2).** 수강생은 마법사가 묻는 값만 입력한다. 마법사가 필요한 화면(Supabase·SQL Editor·API Keys 등)을 브라우저로 직접 열어 주고, 붙여 넣을 SQL·주소는 클립보드에 복사하며, 키·DB·사이트 주소가 맞는지 스스로 확인한다. 수강생이 SQL을 여러 개 고르거나 환경변수 파일(`.env.local`)을 찾아 손으로 고치게 하지 않는다.
5. **배포 전에 반드시 수강생처럼 리허설한다**(§6). 리허설 없이 PDS·강의에 넘기지 않는다.

---

## 2. 배포 키트 표준 구성 (프로그램 폴더 안 `KIT/`)

| 파일 | 역할 | 기준 |
|---|---|---|
| `KIT/README.md` | **수강생용 설치 안내**(아래 §2-1 목차 고정) | `threads-content-ops/KIT/README.md` |
| `KIT/PLATFORMS.md` | 플랫폼별 가입·키 발급(OpenAI·Gemini·Meta·쿠팡 등, 이 프로그램이 쓰는 것만) | 같은 폴더 |
| `KIT/schema.sql` | **새 Supabase에 한 번에 붙여넣는 전체 스키마 1개**: `profiles`+가입 트리거, `user_api_keys`(이 프로그램이 저장하는 provider만 허용 목록에), 프로그램 테이블·RLS·스토리지 버킷, 예약 실행 표(§4-6) | 같은 폴더 |
| `KIT/upgrade-YYYYMMDD-<내용>.sql` | 배포 **뒤에** DB가 바뀌면 이미 설치한 수강생이 한 번 실행하는 추가 SQL(신규 설치는 `schema.sql`에 이미 반영) | `upgrade-20261019-cronjob.sql` |
| `KIT/env.example` | 환경변수 설명(값 없음). `NEXT_PUBLIC_STANDALONE_MODE=true` 포함 | 같은 폴더 |
| `패키지설치마법사.cmd` / `패키지설치마법사.command` (프로그램 폴더 **맨 위**) | **더블클릭 실행 파일**(윈도우 / 맥) — 포장 때 `scripts/kit-template/`에서 자동 복사. 수강생은 이것만 누른다 | `.cmd`는 내용 **영문만**(한글 줄은 코드페이지 전환 전에 깨질 수 있음), `.command`는 압축에 **실행 권한**(포장 스크립트가 자동) |
| `KIT/setup.ps1` / `KIT/setup.sh` | **패키지 설치마법사 본체**(원본 `scripts/kit-template/` 하나 — 포장 때 항상 최신으로 복사, 프로그램별 사본을 고치지 않는다). 8단계·자동 확인·이어서 하기 — 상세 §2-2 | 같은 폴더(**`.ps1`은 UTF-8 BOM** — 없으면 윈도우 PowerShell 5.1이 한글을 깨뜨림) |
| `KIT/vercel.json` | **무료(Hobby)에서 배포되는 설정**(하루 1번 이하 `crons`만). 운영용 1분 `crons`가 든 원본 `vercel.json`을 포장 때 이 파일로 바꿔 넣는다 | 같은 폴더 |
| `KIT/enable-vercel-cron.ps1` / `.sh` | (예약 기능이 있으면) Vercel Pro 수강생이 1분 예약 호출 + `*_PLATFORM_SCHEDULER=on`을 켜고 재배포 | 같은 폴더 |
| `KIT/kit.json` | **키트의 모든 프로그램별 설정**: `title`·`shortName`·`description`, 설치 끝 안내(`callbackPath`·`callbackLabel`·`nextStep`), **마법사 DB 확인 표 `checkTable`(DB 파일에서 마지막에 만들어지는 표 — 필수)**, (선택) `authRedirectPath`(가입·OAuth 로그인 콜백이 Supabase URL Configuration 등록을 요구하면, 예 `/auth/callback` → 마법사가 배포 뒤 그 화면을 열고 주소를 복사해 줌), 추가 환경변수 질문(`extraEnv`: name·question·default·secret·from=brand/siteUrl), 포장(`exclude`·`overrides`), DB 파일(`schema`: `static` 또는 `generate`+`parts`) | `threads-affiliate-poster/KIT/kit.json`(generate), `threads-content-ops/KIT/kit.json`(static) |
| `KIT/database/*.sql` | (`schema.mode=generate`일 때) DB 파일 앞·뒤 조각 — 가운데는 운영 `supabase/migrations/*`가 자동으로 들어감 → **운영 DB 변경이 키트에 저절로 반영** | `threads-affiliate-poster/KIT/database/` |
| `KIT/manuals/*.html` | (선택) 캡처형 단계별 매뉴얼 | `threads-affiliate-poster/KIT/manuals/` |

### 2-1. `KIT/README.md` 목차(고정 — 수강생이 프로그램이 달라도 같은 순서로 익히게)
0. 준비물(Node 22 LTS·Supabase·Vercel·플랫폼 개발자 계정·AI 키) / 1. 압축 풀기·폴더 정하기(**경로 짧게·한글/공백 없이, GitHub 저장소 폴더 안에 풀지 않기**) / 2. **패키지 설치마법사 실행**(더블클릭, 8단계 표) / 3. 설치 확인·(선택) 관리자 지정 / 4. 플랫폼 앱 만들기 / 5. 키 등록·계정 연결·첫 게시 / 6. 예약 게시 연결(기본 cron-job.org, Pro 선택) / 7. (선택) 내 도메인 / 8. 자주 막히는 곳 / 9. 비용 안내 / 업데이트 내역
- 화면 이름·버튼 이름은 **리허설 때 실제 화면 그대로** 적는다(§6-3 함정 목록 반영).

### 2-2. 「패키지 설치마법사」 표준 (필수 — 2026-10-19 주인님 지시·명명)

**모든 배포판은 이 방식으로 설치한다.** 수강생은 프로그램 폴더의 `패키지설치마법사` 파일을 더블클릭하고, 마법사가 묻는 값만 입력한다. 기준 구현: `scripts/kit-template/setup.ps1`·`setup.sh`·`패키지설치마법사.cmd`·`패키지설치마법사.command`(모든 키트 공용 — 프로그램별 차이는 `KIT/kit.json`).

**① 8단계(고정 순서)** — 단계마다 마법사가 할 수 있는 일은 마법사가 하고, 사람은 확인·입력만 한다.
| 단계 | 마법사가 하는 일 | 사람이 하는 일 |
|---|---|---|
| 1 Node.js | 버전 확인, 없으면 윈도우 `winget` 자동 설치 제안 / 설치 화면 열기 | 설치 후 다시 실행 |
| 2 Supabase 프로젝트 | 새 프로젝트 화면 열기, 붙여 넣은 **주소창 주소 또는 Project URL에서 프로젝트 ID 자동 추출**, 연결 확인 | 프로젝트 만들고 주소 붙여넣기 |
| 3 Supabase 키 | API Keys 화면 열기, **키 종류(공개/비밀) 혼동 차단**, 실제 호출로 이 프로젝트 키인지 확인 | 키 2개 붙여넣기(숨김 입력) |
| 4 DB 만들기 | `KIT/schema.sql`을 **클립보드에 복사**, SQL Editor 열기, Run 뒤 **`checkTable` 조회로 성공 확인**(실패면 다시 안내) | 붙여넣기 → Run |
| 5 이메일 확인 끄기 | Sign In / Providers 화면 열기 | Confirm email 끄기 |
| 6 내 사이트 설정 | 사이트 이름 형식 검사, `CRON_SECRET` 자동 생성, `extraEnv` 질문 | 이름·브랜드(·추가 질문) |
| 7 설치·빌드 | `npm install`·`npm run build` | 기다리기 |
| 8 인터넷에 올리기 | Vercel 로그인·연결·**GitHub 자동 연결 해제**·환경변수 등록·배포, **`vercel inspect` 별칭으로 실제 주소 자동 확인** 후 주소가 다르면 맞춰 재배포, (선택) `authRedirectPath` 화면 열기 | Vercel 로그인 |
| 끝 | 사이트 열기, **콜백 주소 클립보드 복사**, `설치결과.txt`(비밀값 없음) 저장 | 다음 단계(플랫폼 앱) |

**①-2 업데이트 모드 (2026-10-20, 배포판 v1.03부터)** — 새 배포판을 받은 기존 설치자가 「다시 올리기」만 하게 한다.
- 시작할 때 같은 프로그램(`kit.json` `shortName` 같음)이 **설치를 마친 폴더**(`.env.local`에 `VERCEL_PROJECT_NAME`)를 자동으로 찾는다 — 범위: 이 폴더의 상위 폴더 형제, 그 위 폴더의 자식·손자(예: `D:\work\Kit_v1.01\insta_auto_poster` ↔ `D:\work\Kit_v1.02\insta_auto_poster`). 여럿이면 `.env.local`이 가장 최근인 곳. 못 찾으면 예전 폴더 경로를 한 번 묻고, 처음 설치는 Enter로 넘어간다.
- 업데이트를 고르면 예전 `.env.local`·`.vercel`을 복사하고 ②③⑤⑥을 끝난 것으로 표시 → ① Node 확인 → ④ **확인만**(`checkTable` 200이면 통과 + `KIT/upgrade-*.sql` 목록 안내, 없으면 **설치 SQL 전체를 다시 돌리지 않고** 「업데이트 내역」의 SQL만 안내·재확인) → ⑦ 빌드 → ⑧ 같은 Vercel 프로젝트에 환경변수·배포. 끝 화면·`설치결과.txt` 제목이 「업데이트」.
- 설치를 마친 **같은 폴더**에서 다시 실행하면 「지금 코드로 다시 올릴까요?」(y=업데이트 / n=처음부터).
- **버전 기록(v1.04~)**: 포장 스크립트가 압축 안 `KIT/kit.json`에 `kitVersion`(배포판 번호)·`appVersion`(프로그램 `APP_VERSION`)을 적고, 마법사가 `설치결과.txt`·끝 화면에 「버전: 배포판 vX.YY (프로그램 vA.BB)」, 업데이트면 「이전 → 새」를 적는다. 옛 배포판(값 없음)은 상위 `00_START_HERE.md`의 「배포판 vX.YY」·`version.ts`에서 읽고, 같은 폴더 재실행은 이전 `설치결과.txt`의 「버전:」 줄에서 읽는다.
- **예전 폴더 정리(v1.04~)**: 업데이트(다른 폴더에서 가져온 경우)가 끝나면 「예전 폴더를 휴지통으로 보낼까요?」(기본 **n**). y일 때만 **휴지통으로**(윈도우 `SendToRecycleBin`, 맥 `~/.Trash`로 이동 — 바로 지우지 않음). 지금 폴더이거나 지금 폴더를 품은 폴더·다른 프로그램 폴더(`shortName` 다름)는 대상이 아니다. 프로그램 폴더만 보내고 상위 묶음 폴더는 남긴다.
- 그래서 **DB 변경이 있는 배포판은 반드시 `KIT/upgrade-<날짜>-<내용>.sql`과 `KIT/README.md` 「업데이트 내역」 표에 SQL 실행 여부를 적는다**(마법사는 기존 DB에 `schema.sql`을 다시 돌리지 않음).

**② 꼭 지킬 것**
- **이어서 하기**: 끝난 단계를 `.kit-progress`(비밀값 없음)에 적고, 다시 실행하면 이어서 한다. 값은 단계마다 `.env.local`에 바로 저장한다(창을 닫아도 잃지 않게). 두 파일과 `설치결과.txt`는 포장에서 항상 뺀다.
- **확인은 스스로**: 「잘 했나요?」로 끝내지 않고 실제 호출로 확인한다(키 → `/auth/v1/settings`·`/rest/v1/`, DB → `checkTable`, 사이트 → HTTP 200).
- **Supabase 확인 요청에는 User-Agent를 지정**한다(`aimaster-kit-setup`). PowerShell 기본 표시(Mozilla 포함)는 브라우저로 취급돼 **Secret key가 401로 거부**된다(2026-10-19 실측).
- 키는 **숨김 입력**, 화면·`설치결과.txt`·로그에 키를 출력하지 않는다.
- **AI 코딩 도구에 설치를 맡기지 않게 안내**한다(마법사는 사람이 답하는 방식 — AI 도구는 `.env.local`을 손으로 만들게 유도하는 경우가 있었다, 2026-10-19 주인님 실제 사례). 「손으로 하는 방법」은 안내서 맨 아래 고급 참고로만 둔다.
- `.cmd` 실행 파일 내용은 영문만, `.command`·`.sh`는 압축에 실행 권한(포장 스크립트 `EXECUTABLE`), `.ps1`은 UTF-8 BOM.

**③ 새 프로그램을 키트로 만들 때** — `KIT/kit.json`에 `checkTable`(필수), 필요하면 `authRedirectPath`·`extraEnv`를 넣는다. 마법사 코드는 고치지 않는다(모든 키트가 같은 마법사). 프로그램만의 단계가 꼭 필요하면 마법사에 `kit.json` 선택 항목으로 일반화해 넣고 이 표를 갱신한다.

**④ 마법사를 고쳤으면** — 두 파일(ps1·sh)을 함께 고치고, 문법 검사(`[Parser]::ParseFile`·`bash -n`)와 Lab 프로젝트로 확인 동작 시험(키·DB·주소) 뒤 포장한다. 실제 설치 리허설(§6)은 주인님 지시 시점에.

---

## 3. 독립 모드(STANDALONE) 코드 체크리스트 — 원본 프로그램에 넣는다

- [ ] `lib/deployment.ts`: `IS_STANDALONE`, `SITE_URL`(`NEXT_PUBLIC_SITE_URL`), `BRAND_NAME`(`NEXT_PUBLIC_BRAND_NAME`), `brandTitle()` — 기준 `threads-content-ops/lib/deployment.ts`
- [ ] **가입·로그인**: 자체 `/login`(가입 포함). AIMaster SSO 쿠키(`.buylife.xyz`)·메인 사이트 이동 끔. 이용 권한 판정은 독립 모드에서 「로그인한 본인 = 사용 가능」(등급·구독·핸드폰 판정 없음)
- [ ] **AIMaster 흔적 숨기기**: 「← 다른 프로그램 보기」(buylife.xyz/programs), 메인 사이트 매뉴얼 버튼(→ `KIT/PLATFORMS.md` 안내), 제목의 「AIMaster」(→ 브랜드), **외부 서비스에 남는 이름**(예: cron-job.org 작업 이름)에서도 「AIMaster」 빼기
- [ ] **OAuth 콜백·사이트 주소**는 `SITE_URL` 기준(운영 도메인 고정값 금지)
- [ ] **운영자 공용 키·운영자 환경변수 키**를 쓰는 기능(최상위 규칙 예외 §8 등)은 독립 모드에서 끄거나 수강생 본인 키로
- [ ] **다른 AIMaster 프로그램 테이블**(예: `threads_accounts`) 접근 끔
- [ ] **예약·정기 실행**: `docs/SCHEDULER_POLICY.md` — 독립 모드 기본 **회원 본인 cron-job.org**, Vercel 방식은 `*_PLATFORM_SCHEDULER=on`(Pro 스크립트)일 때만 선택 가능. `KIT/vercel.json`은 무료에서 배포되는 것만
- [ ] **시간대**: 서버에서 만드는 날짜 문자열은 `timeZone: "Asia/Seoul"`, 날짜 입력값은 브라우저에서 ISO로 바꿔 전송(`docs/ERROR_LESSONS.md` 2026-10-19 두 건)
- [ ] **30일 자동 삭제 등 정리 작업**은 무료 `crons`(하루 1번)로 동작하는지 확인
- [ ] 회원 키 허용 목록(`user_api_keys_provider_check`)에 프로그램이 저장하는 provider가 **전부** 있는지(없으면 키 저장 실패) — `KIT/schema.sql`과 코드의 저장 목록 대조

---

## 4. 포장(압축) — 손이 덜 가는 방법

1. **포장 스크립트 하나로**: 프로그램의 `KIT/kit.json`만 써 두고 `python scripts/make_lecture_kit.py --name <묶음이름> --programs <폴더1> [폴더2 …] [--out D:\PDS]` → `<묶음이름>_<YYYYMMDD>.zip`(인자 없이 실행하면 SNS 묶음 = threads-content-ops + insta_auto_poster). 스크립트가 공용 설치 스크립트를 넣고, `schema.mode=generate`면 DB 파일을 조각에서 합쳐 만든다. **포장 뒤 자동 검사 2가지**: 비밀값 검사 + **DB 대조**(2026-10-20 — 압축에 들어간 코드가 쓰는 표 `.from`·함수 `.rpc`·버킷 `storage.from`이 `KIT/schema.sql`에 없으면 실패하고 압축을 지운다). 배포판에서 `IS_STANDALONE`으로 일부러 건너뛰는 운영 전용 표(공용 연동 표 등)만 `kit.json` `schemaCheckIgnore`에 적는다 — 보호 코드가 있는지 확인하고 적을 것. 포장 없이 점검만: `--check-only [--programs …]`.
   - **항상 빼는 것**: `.env*`(`.env.example` 제외), `node_modules`, `.next`, `.vercel`, `.git`, `*.tsbuildinfo`, `*.log`, 내부 문서(`docs/`, `AGENTS.md`, `CLAUDE.md`), 운영 마이그레이션(`supabase/` — `KIT/schema.sql`이 대신), 내부 테스트·스크립트(필요 없으면)
   - **덮어쓰는 것**: `vercel.json` ← `KIT/vercel.json`(무료용), `.env.example` ← `KIT/env.example`, 루트 `README.md` ← 「`KIT/README.md`부터 보세요」 한 줄
2. **포장 후 비밀값 검사(자동)**: 스크립트가 `.env*`(`.env.example` 제외)·실제 키 모양(OpenAI·Anthropic·JWT·Supabase 새 키·Google·Replicate)을 찾으면 **포장을 멈추고 펼친 폴더를 지운다**. 통과 메시지 「비밀값 검사 통과」를 확인하고 넘긴다.
3. **배포판 번호·이름 규칙(2026-10-20 주인님 지시 — 메인 넘버링 정책과 같음)**: 배포판도 `vX.YY` 번호를 쓴다. 이름 `<묶음이름>_<번호>.zip`(예: `SNS_Auto_Posting_Kit_v1.01.zip`), 포장 날짜는 `00_START_HERE.md` 맨 위에 적힌다. **다시 포장할 때마다 +0.01**(v1.01 → v1.02 …, v1.99 다음 v2.00), 메이저는 주인님 지시 때만. 포장 스크립트는 `--version` 필수이고 **같은 번호가 이미 있으면 덮어쓰지 않고 멈춘다**. 낸 번호는 §8 현황표 「배포판 번호 이력」에 적는다. (2026-10-18~19의 날짜 이름 압축 `_20261018`·`_20261019`·`_v2_20261019`는 번호 규칙 전 시험판) 여러 프로그램을 한 압축에 넣으면 최상위 `00_START_HERE.md`(묶음 안내·공통 순서·맥 메모·AI 코딩 도구용 문장).
4. **옛 압축은 지우지 않는다**(수강생이 받은 버전 추적용). 새 버전은 날짜만 바꿔 새로 만든다.

---

## 5. 배포 뒤 업데이트 (이미 설치한 수강생)

- 수강생 사본은 **자동으로 바뀌지 않는다.** 원본에서 고친 뒤 새 날짜로 다시 포장하고, `KIT/README.md` 「업데이트 내역」에 날짜·바뀐 점·필요한 조치를 적는다.
- DB가 바뀌면 `KIT/schema.sql`(신규 설치용)과 **`KIT/upgrade-YYYYMMDD-*.sql`(기존 설치자용)** 을 함께 만든다. 업그레이드 SQL은 여러 번 실행해도 안전하게(`if not exists`, 허용 목록은 「현재 정의 읽어 값만 추가」 — `docs/ERROR_LESSONS.md` 2026-10-19 허용 목록 형식 건).
- 코드 교체 안내: 「새 압축의 파일로 덮어쓰되 `.env.local`은 그대로 → `npm install` → 설치 스크립트의 배포 단계(또는 `npx vercel@latest deploy --prod`)」.

---

## 6. 리허설 (배포 전 필수) — ② AIMaster_dev(Lab)에서

### 6-1. 순서
1. 작업 중 표(`docs/ACTIVE_WORK.md`)에 `labs/kit-<이름>` 등록 → 포장한 압축을 풀어 `labs/kit-<이름>/`에 둔다(운영 폴더·운영 DB 미접촉).
2. **Supabase 조직 `BUYLIFE-DEV`(무료)** 에 새 프로젝트(무료 조직은 활성 프로젝트 2개 한도 — 리허설 끝나면 일시정지·삭제), **Vercel 프로젝트 이름 `dev-<이름>`**(Lab 규칙).
3. 주인님이 수강생 역할로 `KIT/README.md`를 처음부터 따라 하고, CLI는 크롬 화면·DB로 확인하며 **단계별 기록**(`docs/<키트>-manual/REHEARSAL_LOG.md` + 캡처 `img/`).
4. 발견한 문제는 **원본 프로그램에서** 고치고(코드 하나 원칙), 키트 사본에는 다시 복사하거나 다시 포장한다. **리허설을 마칠 때 사본과 원본의 `KIT/`·앱 코드를 비교해 사본에만 있는 수정이 없는지 확인**한다(2026-10-19 사본에만 남은 키트 파일 발견). 운영에도 영향이 있는 버그(예: 시간대)는 운영도 같이 고쳐 배포.
5. 끝나면 교육 매뉴얼(초보자용 단계·필요한 값·화면 캡처) 작성 → 새 날짜로 재포장 → PDS 반영.

### 6-2. 리허설에서 반드시 확인
가입·로그인 / 키 저장(모든 provider) / 플랫폼 계정 연결 / 글 생성 1회(가장 싼 모델) / 즉시 발행 / 예약 발행(기본 방식으로 작업 자동 생성·자동 꺼짐) / 30일 정리 작업 / 독립 모드 화면에 AIMaster 흔적 없음 / 모바일 폭 / 시간 표시(한국 시각).

### 6-3. 이미 알려진 함정 (2026-10-19 리허설 — README·스크립트에 미리 반영)
| 단계 | 함정 | 대응 |
|---|---|---|
| 마법사 ⑧ Vercel 환경변수(2026-10-20 윈도우 리허설) | **윈도우 PowerShell 파이프가 값 앞에 BOM을 붙여** `NEXT_PUBLIC_STANDALONE_MODE`가 `"﻿true"`로 저장 → 독립 모드 꺼짐 → 수강생 사이트가 운영 주소로 이동 | ✅ v1.06 `Push-Env`가 BOM 없는 임시 파일을 `cmd` 입력으로 넘김(`docs/ERROR_LESSONS.md` 2026-10-20). v1.01~v1.05 윈도우 설치자는 v1.06 업데이트 모드로 해결 |
| 마법사 ⑤·⑥ 문구(2026-10-20 리허설) | 「Email 항목 → Confirm email」이 실제 화면(맨 위 User Signups 칸)과 다름, 사이트 이름 질문에 「어떤 주소를 넣지?」, 브랜드 질문 뜻 모호 | ✅ v1.06 문구 수정(이유 한 줄·User Signups 위치·「이름만 입력(예)」·「화면 위쪽에 보일 이름」) |
| 마법사 ②단계(2026-10-20 윈도우 리허설) | 마법사가 여는 `supabase.com/dashboard/new`는 **이미 조직이 있는 사람에게 「새 조직 만들기」 화면**을 보여 줌 — 새 조직을 만들면 무료 한도·요금이 헷갈림 | ✅ 2026-10-20 마법사가 `supabase.com/dashboard/projects`를 열고 「이미 조직이 있으면 그 조직의 [New project]」·지역 기본 Asia-Pacific(서울은 Need a specific region?)으로 안내(배포판 v1.05~), 매뉴얼·3개 키트 README 같은 문구. 무료 프로젝트는 계정당 2개 — 새 조직을 만들 필요 없음 |
| 리허설 압축 풀기(2026-10-20) | Git Bash `unzip`은 압축의 UTF-8 이름 표시(`0x800`)를 무시해 `패키지설치마법사.cmd` 이름이 깨짐 | 압축은 정상(표시 있음). 시험할 때는 윈도우 탐색기·`Expand-Archive`로 푼다 |
| Supabase 새 프로젝트 | 지역 기본값이 「Asia-Pacific」 | 「Need a specific region?」→ **Northeast Asia (Seoul)** 안내 |
| 프로젝트 준비 | 잠시 임시 이름·「Coming up」 | 「1분 기다렸다 새로고침」 안내 |
| SQL Editor | 「Snippets…」 안내 창, `drop … if exists` 때문에 「Potential issue detected」 경고 | Understood / **Run query** 눌러도 된다고 안내 |
| 이메일 확인 끄기 | 메뉴 위치 변경 | Authentication → Sign In / Providers → **User Signups 맨 아래 Confirm email** |
| 키 화면 | 메뉴 이름 「API Keys」, Publishable/Secret | 화면 이름 그대로, Secret은 눈 아이콘·복사 버튼 |
| 설치 스크립트 | 입력한 키가 창에 그대로 보임 | 「설치 화면을 남에게 보여 주거나 붙여 넣지 마세요」 |
| **Vercel 연결** | **폴더가 GitHub 저장소 안이면 `vercel link`가 저장소를 자동 연결 → 저장소 푸시마다 엉뚱한 코드가 배포됨** | README에 「저장소 밖에 풀기」, 설치 스크립트에 연결 직후 **`npx vercel@latest git disconnect --yes`** 넣기(다음 키트 개정 때 반영) |
| 배포 주소 | 주소가 3개 보여 헷갈림, 개별 배포 주소는 로그인 보호 | **Vercel Domains 화면의 주소 하나만** 쓰기 |
| Meta 앱 만들기 | 앱 이름에 「Threads」 등 상표 거부 가능, 비즈니스 포트폴리오 단계, 마지막 「앱 만들기」=약관 동의 | 이름 예시, 「아직 연결하고 싶지 않음」, 약관 안내 |
| Meta 콜백 칸 | 주소 입력 후 **Enter가 아니라 아래 제안 항목 클릭**해야 들어감 | 캡처와 함께 안내. 이미 앱이 있으면 콜백만 **추가**(기존 주소 지우지 않기) |
| 예약 발행 | Vercel 무료는 `crons` 하루 1번·최대 59분 지연 | 기본 「내 cron-job.org」, Pro만 Vercel 선택(`docs/SCHEDULER_POLICY.md`) |
| cron-job.org | 응답 30초 초과 실패, 25회 실패 시 작업 자동 정지, IP 제한 켜면 403 | 즉시 응답 + 응답 뒤 처리, 예약 때마다 작업 켜짐 확인, 「IP 제한 끄기」 안내 |
| 화면 | 밝은 테마가 `.text-white`를 검정으로 바꿔 버튼 글자가 안 보임 | 버튼 글자색 `text-[#ffffff]` |
| 설치(2026-10-19 주인님 실사용) | 질문형 스크립트 대신 `.env.local`을 직접 찾아 값을 넣게 됨(AI 도구가 「손으로 하는 방법」을 고르거나, 실행 명령을 못 찾음) | **패키지 설치마법사**(더블클릭 실행 파일) 도입, 안내서 2장을 마법사로, 손 설치는 고급 참고로 내림(§2-2) |
| 키 확인(PowerShell) | `Invoke-WebRequest` 기본 User-Agent(Mozilla 포함) 때문에 Supabase가 Secret key를 401로 거부 | 확인 요청에 `-UserAgent "aimaster-kit-setup"`(맥 `curl -A`) |

---

## 7. 역할·기록

- **원본 수정·포장·리허설·매뉴얼**: Claude Code(기능), 디자인 손질은 agy — 같은 폴더 동시 작업 금지(작업 중 표).
- 배포 키트를 만들거나 바꾸면: 프로그램 `AGENTS.md`에 「배포 키트」 절(키트 버전·포장 날짜·리허설 결과·알려진 한계), 루트 `docs/HANDOFF.md`에 한 줄, 이 문서 §8 현황표 갱신.
- 키트 사본(`labs/kit-*`)은 리허설용이다. **영구 수정은 원본에서.** 리허설이 끝나면 사본·Lab Supabase·`dev-*` Vercel 프로젝트 정리 여부를 주인님께 확인.

## 8. 배포 키트 현황

**배포판 번호 이력**
| 묶음 | 번호 | 포장일 | 내용 | 비고 |
|---|---|---|---|---|
| `SNS_Auto_Posting_Kit` | **v1.01** | 2026-10-20 | Threads 콘텐츠 운영 + INSTA 포스팅 — 패키지 설치마법사, INSTA 예약 방식(운영 Vercel/배포판 cron-job.org) 반영, 202개 파일·비밀값 검사 통과 | 번호 규칙 첫 배포판. 이전 날짜 이름 압축은 시험판 |
| `SNS_Auto_Posting_Kit` | **v1.02** | 2026-10-20 | INSTA v1.26→v1.33(내 이미지 직접 첨부·여러 장 한 번에·예약 안정화), Threads 운영 v2.09→v2.14(예약 안정화). 두 `KIT/README.md`에 「업데이트 내역」 표 신설, INSTA 안내서 5장에 직접 첨부 설명. 207개 파일·비밀값 검사 통과, 짧은 경로 독립 모드 `npm ci`+`npm run build` 두 프로그램 통과 | DB(SQL) 작업 없음(v1.01 설치자는 새 코드 재배포만). 실제 수강생 계정 설치·게시는 주인님 시험 대기 |
| `SNS_Auto_Posting_Kit` | **v1.03** | 2026-10-20 | 프로그램 코드는 v1.02와 같음(INSTA v1.33·Threads 운영 v2.14). **패키지 설치마법사 업데이트 모드**(§2-2 ①-2) + 포장 스크립트 **DB 대조** 첫 적용, 두 `KIT/README.md` 업데이트 방법·v1.03 줄. 207개 파일·비밀값 검사·DB 대조 통과, 압축 안 `setup.ps1` BOM·문법 0 | 업데이트 모드는 v1.03 마법사부터(v1.01·v1.02 설치자가 v1.03 폴더에서 실행하면 동작). `00_START_HERE.md`의 업데이트 안내 한 줄은 다음 포장(v1.04)부터 |
| `SNS_Auto_Posting_Kit` | **v1.04** | 2026-10-20 | 프로그램 코드는 v1.02·v1.03과 같음. 마법사 **버전 기록**(`설치결과.txt` 「버전:」, 업데이트면 이전 → 새)·업데이트 뒤 **예전 폴더 휴지통 보내기 제안**(기본 n), 포장 스크립트가 `kit.json`에 `kitVersion`·`appVersion` 기록, `00_START_HERE.md` 업데이트 안내 첫 반영. 207개 파일·비밀값·DB 대조 통과, 압축 안 마법사 문법·BOM 확인 | 실제 v1.01 설치본으로 업데이트 실시험은 대기(이 PC에 설치본 없음). 맥 실기기 시험은 하지 않기로 함(2026-10-20 주인님 결정 — 맥 마법사는 Git Bash 시험 틀·문법 검사까지) |
| `SNS_Auto_Posting_Kit` | **v1.05** | 2026-10-20 | 마법사 ②단계 Supabase 주소 → 프로젝트 목록(새 조직 화면 문제, 윈도우 리허설 중 발견)·지역 안내 실제 화면대로, 다른 세션 커밋 포함(INSTA v1.34 로그아웃 아이콘 `342c3e23`, 예약 실행 공용화 `41c39274` — 동작 같음). 209개 파일(`schedulerConfig.ts` 2개 추가)·비밀값·DB 대조 통과, 짧은 경로 독립 모드 `npm ci`+`build` 두 프로그램 통과 | 이 압축의 `KIT/README.md` 업데이트 내역에는 v1.05 줄이 없음(포장 뒤 추가 — 다음 포장부터) |
| `SNS_Auto_Posting_Kit` | **v1.06** | 2026-10-20 | **윈도우 마법사 환경변수 BOM 오류 수정**(독립 모드 꺼짐 → 운영 주소 이동), ⑤·⑥ 문구 수정. 프로그램 코드는 v1.05와 같음. 209개 파일·비밀값·DB 대조 통과 | v1.01~v1.05 윈도우 설치본은 v1.06 업데이트 모드로 고쳐짐(리허설에서 확인 예정) |

| 프로그램 | 키트 방식 | 최신 포장 | 리허설 | 메모 |
|---|---|---|---|---|
| `threads-content-ops` (Threads 콘텐츠 운영 자동화) | `KIT/` 표준(static DB 파일) | `SNS_Auto_Posting_Kit_v1.06` | ✅ 2026-10-19(가입~자동 발행·예약 방식) — 리허설 자원(Lab Supabase `kit-threads`·Vercel `dev-threads-posting`)은 2026-10-20 삭제 | 리허설 수정분 원본 반영 후 2026-10-19 재포장 완료(189개 파일·비밀값 검사 통과·DB 파일에 예약 표/cron-job.org 키 포함 확인) |
| `insta_auto_poster` (INSTA 포스팅 자동화) | `KIT/` 표준(static DB 파일) | `SNS_Auto_Posting_Kit_v1.06` | ⚪ 대기 | 2026-10-19 예약 방식 적용(v1.25): `KIT/schema.sql`·`upgrade-20261019-cronjob.sql`·`enable-vercel-cron.*`·README 6장 — v1.01에 반영됨 |
| `threads-affiliate-poster` (쓰레드 쇼핑제휴) | **`KIT/` 표준(2026-10-19 clone-kit에서 통합)**, DB 파일 자동 생성(generate) | 시험 포장만(배포 전) | ⚪ 없음 | 설치 스크립트로 운영자 이름·이메일·Fixie까지 자동 등록. 리허설 후 PDS 반영 |

## 9. 관련 문서
- 예약 기능: [`SCHEDULER_POLICY.md`](SCHEDULER_POLICY.md) · Lab 규칙: [`AIMASTER_DEV_LAB_GUIDELINES.md`](AIMASTER_DEV_LAB_GUIDELINES.md) · 리허설 기록: [`sns-kit-manual/REHEARSAL_LOG.md`](sns-kit-manual/REHEARSAL_LOG.md) · 오류 교훈: [`ERROR_LESSONS.md`](ERROR_LESSONS.md) · 최상위 규칙: [`TOP_RULE_PERSONAL_ACCOUNT_API.md`](TOP_RULE_PERSONAL_ACCOUNT_API.md)

## 10. 변경 이력
| 날짜 | 내용 |
|---|---|
| 2026-10-20 | **배포판 번호 규칙(주인님 지시)**: 메인 넘버링 정책과 같은 `vX.YY`, 다시 포장할 때마다 +0.01, 같은 번호 덮어쓰기 금지(포장 스크립트 `--version` 필수·중복 거부). 첫 번호 `SNS_Auto_Posting_Kit_v1.01`. |
| 2026-10-19 | **「패키지 설치마법사」 표준 제정(주인님 지시·명명)**: 더블클릭 실행 파일 + 8단계 마법사(화면 자동 열기·클립보드 복사·키/DB/주소 자동 확인·이어서 하기·`설치결과.txt`), `kit.json` `checkTable`(필수)·`authRedirectPath`(선택), 포장에 실행 파일·실행 권한 자동 반영, 세 키트 안내서 2·3장 교체. 계기: 주인님이 새 배포판으로 설치할 때 환경설정 파일을 직접 찾아 넣게 된 일. |
| 2026-10-19 | **키트 방식 통일(주인님 결정)**: `KIT/` 표준 + clone-kit의 DB 자동 생성·HTML 매뉴얼. 공용 설치 스크립트 템플릿(`scripts/kit-template/`, 키 숨김·GitHub 연결 해제), kit.json 기반 포장(`--name --programs`)·비밀값 자동 검사, 쇼핑제휴 `clone-kit/` → `KIT/` 이전. 이유: 수강생은 스크립트 한 번(환경변수 수동 입력 제거), 운영자는 DB 파일 자동 생성(수동 동기화 제거), 리허설로 검증된 방식, 모든 키트 같은 순서. |
| 2026-10-19 | 공용 레퍼런스 문서로 지정(주인님 지시): 맨 위 갱신 의무, §11 개선 대기 목록 추가. |
| 2026-10-19 | 제정(Claude Code 윈도우). 주인님 지시: 「AIMaster 서브프로그램을 개별 배포판으로 만들어 수강생에게 키트 방식으로 이전 — 최대한 편리하고 손이 덜 가는 방법의 지침」. Threads 키트 리허설(T1~T25)·쇼핑제휴 clone-kit·예약 방식 결정을 근거로 작성. |

## 11. 개선 대기 목록 (계속 추가)
| # | 날짜 | 개선할 점 | 근거 | 상태 |
|---|---|---|---|---|
| 1 | 2026-10-19 | 설치 스크립트(`setup.ps1`/`.sh`)에 `vercel link` 직후 `npx vercel@latest git disconnect --yes` 자동 실행 | 리허설 T9-1: 저장소 안 폴더에서 GitHub 자동 연결 → 엉뚱한 코드 배포·빌드 비용 | ✅ 2026-10-19 공용 템플릿 |
| 2 | 2026-10-19 | 설치 스크립트가 키 입력을 화면에 보이지 않게(`Read-Host -AsSecureString` / `read -s`) | 리허설 T9: 입력한 Secret key가 창에 그대로 보임 | ✅ 2026-10-19 공용 템플릿 |
| 3 | 2026-10-19 | 포장 스크립트 `make_lecture_kit.py`를 프로그램별 `KIT/kit.json`(빼기·덮어쓰기 목록)으로 읽게 일반화 → 새 프로그램은 `kit.json`만 쓰면 포장 | 지금은 스크립트 안 `PROGRAMS` 목록을 손으로 고쳐야 함 | ✅ 2026-10-19(`--name --programs`, schema generate) |
| 4 | 2026-10-19 | 포장 직후 비밀값 자동 검사(압축 안 `.env*`·키 패턴 발견 시 실패) | §4-2를 사람이 하지 않게 | ✅ 2026-10-19(가짜 키로 검출 확인) |
| 5 | 2026-10-19 | `threads-affiliate-poster/clone-kit` 방식과 `KIT/` 방식 중 하나로 통일 | 키트 방식이 두 가지라 수강생·CLI 모두 헷갈림 | ✅ 2026-10-19 주인님 결정: **`KIT/` 표준 + clone-kit의 DB 자동 생성·HTML 매뉴얼** |
| 6 | 2026-10-19 | 교육 매뉴얼(`docs/sns-kit-manual/SNS_KIT_STUDENT_MANUAL.md`) 작성 후 키트 `KIT/README.md`와 화면 이름·순서 일치시키기 | 리허설에서 안내서와 실제 화면이 다른 곳 다수 | 🔄 2026-10-20 초안 작성(패키지 설치마법사 8단계 기준, `docs/sns-kit-manual/SNS_KIT_STUDENT_MANUAL.md`) — 📷 캡처는 주인님 v1.01 시험 화면으로 채움. 같은 날 두 키트 README의 예전 예약 방식 문구(도메인 변경 시 「cron-job.org URL 고치기」·「Authorization 값」)도 「키 다시 저장」으로 교체 → 다음 배포판 v1.02에 반영 |
| 7 | 2026-10-19 | 쇼핑제휴 운영: 설정 화면에 Claude(`anthropic`)·Replicate 키 칸이 있는데 저장 함수 허용 목록(`src/lib/actions/settings.ts` `VALID_PROVIDERS`)에 없어 저장 시 「알 수 없는 provider」 | 키트 허용 목록 점검 중 발견(키트 `99_finalize.sql`에는 naver·replicate 추가함) | ✅ 2026-10-19 쇼핑제휴 v1.64(`anthropic`·`replicate` 허용 목록 추가) |
| 9 | 2026-10-19 | 설치를 「묻는 값만 입력」하는 마법사로 — 화면 자동 열기·클립보드·자동 확인·이어서 하기 | 주인님 실사용: 새 배포판에서 `.env.local`을 직접 고치게 됨 | ✅ 2026-10-19 **패키지 설치마법사**(§2-2). 실제 리허설은 대기 |
| 10 | 2026-10-19 | 마법사가 Supabase 이메일 확인 끄기·URL Configuration까지 자동으로(지금은 화면만 열어 줌) | Supabase Management API는 수강생 개인 접근 토큰이 필요 — 토큰 발급 단계가 늘어 오히려 복잡 | ⚪ 검토(지금은 화면 열기 + 안내가 더 쉬움) |
| 8 | 2026-10-19 | 리허설에서 고친 **키트 파일**이 사본(`labs/kit-*`)에만 남는 문제 → 리허설 끝날 때 「사본 ↔ 원본 KIT·앱 코드 차이 비교」를 필수 단계로 | Threads 키트 README·schema·Pro 스크립트가 사본에만 있었음(2026-10-19 발견·이전) | ✅ 규칙화(§6-1 4번) |
