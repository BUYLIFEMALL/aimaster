# AIMaster 서브프로그램 개별 배포 키트 지침 (DISTRIBUTION_KIT_GUIDE) — 공용 레퍼런스

> **📌 이 문서는 계속 자라는 공용 레퍼런스 문서다(2026-10-19 주인님 지시).** 모든 CLI(Claude Code·Codex·agy, 윈도우·맥미니)는 외부 배포(설치 키트·복제 키트·강의 배포판) 작업 **전에 읽고**, 작업 **중·후에 새로 알게 된 주의사항·함정·개선점을 같은 작업(같은 커밋)에서 이 문서에 추가**한다.
> - 화면이 바뀐 곳·막힌 곳·수강생 질문 → **§6-3 함정 표**에 한 줄(날짜·프로그램·대응)
> - 더 편하게 만들 아이디어·아직 못 한 개선 → **§11 개선 대기 목록**(처리하면 「✅ 날짜·커밋」으로 표시, 지우지 않음)
> - 키트를 새로 만들거나 다시 포장·리허설 → **§8 현황표**, 규칙이 바뀌면 **§10 변경 이력**
> - 다른 CLI가 쓴 항목은 지우거나 덮어쓰지 않고 보완만 한다(append-only).

> 2026-10-19 주인님 지시로 제정, 모든 CLI 공통. **AIMaster에서 개발·운영 중인 서브프로그램을 수강생(외부)에게 「설치 키트」로 넘겨 각자 자기 계정에서 독립 프로그램으로 돌리게 할 때 반드시 이 문서를 따른다.**
> 목표: ① 수강생이 초보여도 **압축 풀기 → DB 파일 1개 실행 → 설치 스크립트 1번 → 키 등록**으로 끝나게 ② 운영자(주인님·CLI)의 **이전 작업 손이 최소**가 되게 ③ 운영 프로그램이 바뀌면 **배포판도 같은 코드로 바로 다시 만들 수 있게**.
> 기준 사례: `threads-content-ops/KIT/`(PDS `SNS_Auto_Posting_Kit_20261018`, 2026-10-19 리허설 완료 — 기록 `docs/sns-kit-manual/REHEARSAL_LOG.md`), `threads-affiliate-poster/clone-kit/`.

---

## 1. 대원칙 5가지

1. **코드는 하나, 스위치로 나눈다.** 배포판을 위해 원본을 복사해 따로 고치지 않는다. 원본 프로그램 안에서 `NEXT_PUBLIC_STANDALONE_MODE=true`(= `IS_STANDALONE`)일 때만 다르게 동작하게 만든다. 배포판은 「원본 + `KIT/` 폴더」를 **포장만** 한 것이다.
   - 이유: 2026-10-19 리허설에서 키트 사본(`labs/kit-threads`)을 따로 고치다 운영 원본과 어긋나, 같은 수정을 두 번 하고 다시 맞추는 일이 생겼다. 고칠 것은 **원본에서** 고치고 키트는 다시 포장한다.
2. **수강생이 모든 것을 소유한다.** Supabase·Vercel·플랫폼 앱(Meta 등)·AI 키·예약 실행(cron-job.org)까지 전부 수강생 본인 계정. 배포판은 AIMaster(buylife.xyz), 공용 DB, 다른 AIMaster 프로그램 테이블, 운영자 키에 **하나도 기대지 않는다**(최상단 규칙 「본인 계정·본인 키」).
3. **무료 요금제로 끝까지 돌아가야 한다.** 수강생은 대부분 Vercel·Supabase 무료로 시작한다. 무료에서 안 되는 기능(예: Vercel 1분 `crons`)은 무료 대안(예: 회원 본인 cron-job.org)을 **기본값**으로 두고, 유료(Pro) 기능은 「켜면 쓸 수 있는 선택지」로 둔다.
4. **설치는 「DB 파일 1개 + 스크립트 1번」.** 수강생이 SQL을 여러 개 고르거나 환경변수를 손으로 넣게 하지 않는다.
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
| `KIT/setup.ps1` / `KIT/setup.sh` | **설치 스크립트**: Node 확인 → `npm install` → 질문(프로젝트 이름·주소·브랜드·Supabase URL·Publishable/Secret key) → `.env.local` 생성(`CRON_SECRET` 자동 생성) → 빌드 → Vercel 로그인·연결·환경변수·배포 → 콜백 주소 출력 | 같은 폴더(**`.ps1`은 UTF-8 BOM** — 없으면 윈도우 PowerShell 5.1이 한글을 깨뜨림) |
| `KIT/vercel.json` | **무료(Hobby)에서 배포되는 설정**(하루 1번 이하 `crons`만). 운영용 1분 `crons`가 든 원본 `vercel.json`을 포장 때 이 파일로 바꿔 넣는다 | 같은 폴더 |
| `KIT/enable-vercel-cron.ps1` / `.sh` | (예약 기능이 있으면) Vercel Pro 수강생이 1분 예약 호출 + `*_PLATFORM_SCHEDULER=on`을 켜고 재배포 | 같은 폴더 |
| `KIT/kit.json` | 이름·짧은 이름·콜백 경로 등 메타 | `{"title","shortName","callbackPath"}` |

### 2-1. `KIT/README.md` 목차(고정 — 수강생이 프로그램이 달라도 같은 순서로 익히게)
0. 준비물(Node 22 LTS·Supabase·Vercel·플랫폼 개발자 계정·AI 키) / 1. 압축 풀기·폴더 정하기(**경로 짧게·한글/공백 없이, GitHub 저장소 폴더 안에 풀지 않기**) / 2. Supabase 만들기(지역 서울, SQL 실행, 이메일 확인 끄기) / 3. 설치 스크립트 / 4. 플랫폼 앱 만들기 / 5. 키 등록·계정 연결·첫 게시 / 6. 예약 게시 연결(기본 cron-job.org, Pro 선택) / 7. (선택) 내 도메인 / 8. 자주 막히는 곳 / 9. 비용 안내 / 업데이트 내역
- 화면 이름·버튼 이름은 **리허설 때 실제 화면 그대로** 적는다(§6-3 함정 목록 반영).

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

1. **포장 스크립트 하나로**: `scripts/make_lecture_kit.py`의 `PROGRAMS` 목록에 한 줄 추가(원본 폴더·키트 안 이름·뺄 항목·덮어쓸 파일)하고 실행 → `D:\PDS\<키트이름>_<YYYYMMDD>.zip`.
   - **항상 빼는 것**: `.env*`(`.env.example` 제외), `node_modules`, `.next`, `.vercel`, `.git`, `*.tsbuildinfo`, `*.log`, 내부 문서(`docs/`, `AGENTS.md`, `CLAUDE.md`), 운영 마이그레이션(`supabase/` — `KIT/schema.sql`이 대신), 내부 테스트·스크립트(필요 없으면)
   - **덮어쓰는 것**: `vercel.json` ← `KIT/vercel.json`(무료용), `.env.example` ← `KIT/env.example`, 루트 `README.md` ← 「`KIT/README.md`부터 보세요」 한 줄
2. **포장 후 비밀값 검사(필수)**: 압축 안에 `.env.local`·실제 키(`sk-`, `sk-ant-`, `eyJ`(JWT), `AIza`, `r8_` 등)·`.vercel`이 없는지 확인한 뒤 넘긴다.
3. **이름 규칙**: `<묶음이름>_<YYYYMMDD>.zip`(예: `SNS_Auto_Posting_Kit_20261018.zip`). 여러 프로그램을 한 압축에 넣으면 최상위 `00_START_HERE.md`(묶음 안내·공통 순서·맥 메모·AI 코딩 도구용 문장).
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
4. 발견한 문제는 **원본 프로그램에서** 고치고(코드 하나 원칙), 키트 사본에는 다시 복사하거나 다시 포장한다. 운영에도 영향이 있는 버그(예: 시간대)는 운영도 같이 고쳐 배포.
5. 끝나면 교육 매뉴얼(초보자용 단계·필요한 값·화면 캡처) 작성 → 새 날짜로 재포장 → PDS 반영.

### 6-2. 리허설에서 반드시 확인
가입·로그인 / 키 저장(모든 provider) / 플랫폼 계정 연결 / 글 생성 1회(가장 싼 모델) / 즉시 발행 / 예약 발행(기본 방식으로 작업 자동 생성·자동 꺼짐) / 30일 정리 작업 / 독립 모드 화면에 AIMaster 흔적 없음 / 모바일 폭 / 시간 표시(한국 시각).

### 6-3. 이미 알려진 함정 (2026-10-19 리허설 — README·스크립트에 미리 반영)
| 단계 | 함정 | 대응 |
|---|---|---|
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

---

## 7. 역할·기록

- **원본 수정·포장·리허설·매뉴얼**: Claude Code(기능), 디자인 손질은 agy — 같은 폴더 동시 작업 금지(작업 중 표).
- 배포 키트를 만들거나 바꾸면: 프로그램 `AGENTS.md`에 「배포 키트」 절(키트 버전·포장 날짜·리허설 결과·알려진 한계), 루트 `docs/HANDOFF.md`에 한 줄, 이 문서 §8 현황표 갱신.
- 키트 사본(`labs/kit-*`)은 리허설용이다. **영구 수정은 원본에서.** 리허설이 끝나면 사본·Lab Supabase·`dev-*` Vercel 프로젝트 정리 여부를 주인님께 확인.

## 8. 배포 키트 현황

| 프로그램 | 키트 방식 | 최신 포장 | 리허설 | 메모 |
|---|---|---|---|---|
| `threads-content-ops` (Threads 콘텐츠 운영 자동화) | `KIT/` + `make_lecture_kit.py` | `SNS_Auto_Posting_Kit_20261018` | ✅ 2026-10-19(가입~자동 발행·예약 방식) | 리허설 수정분(예약 방식 선택·시간대·토스 표기 등)은 원본 반영 완료 → **재포장 필요** |
| `insta_auto_poster` (INSTA 포스팅 자동화) | `KIT/` + `make_lecture_kit.py` | `SNS_Auto_Posting_Kit_20261018` | ⚪ 대기 | 예약 방식 지침 미적용(1순위 예정) |
| `threads-affiliate-poster` (쓰레드 쇼핑제휴) | `clone-kit/`(`make-clone.mjs`, 마이그레이션 자동 합침) | — | ⚪ 없음 | 예약 방식 반영(v1.63). 다음 개정 때 `KIT/` 표준으로 맞출지 결정 |

## 9. 관련 문서
- 예약 기능: [`SCHEDULER_POLICY.md`](SCHEDULER_POLICY.md) · Lab 규칙: [`AIMASTER_DEV_LAB_GUIDELINES.md`](AIMASTER_DEV_LAB_GUIDELINES.md) · 리허설 기록: [`sns-kit-manual/REHEARSAL_LOG.md`](sns-kit-manual/REHEARSAL_LOG.md) · 오류 교훈: [`ERROR_LESSONS.md`](ERROR_LESSONS.md) · 최상위 규칙: [`TOP_RULE_PERSONAL_ACCOUNT_API.md`](TOP_RULE_PERSONAL_ACCOUNT_API.md)

## 10. 변경 이력
| 날짜 | 내용 |
|---|---|
| 2026-10-19 | 공용 레퍼런스 문서로 지정(주인님 지시): 맨 위 갱신 의무, §11 개선 대기 목록 추가. |
| 2026-10-19 | 제정(Claude Code 윈도우). 주인님 지시: 「AIMaster 서브프로그램을 개별 배포판으로 만들어 수강생에게 키트 방식으로 이전 — 최대한 편리하고 손이 덜 가는 방법의 지침」. Threads 키트 리허설(T1~T25)·쇼핑제휴 clone-kit·예약 방식 결정을 근거로 작성. |

## 11. 개선 대기 목록 (계속 추가)
| # | 날짜 | 개선할 점 | 근거 | 상태 |
|---|---|---|---|---|
| 1 | 2026-10-19 | 설치 스크립트(`setup.ps1`/`.sh`)에 `vercel link` 직후 `npx vercel@latest git disconnect --yes` 자동 실행 | 리허설 T9-1: 저장소 안 폴더에서 GitHub 자동 연결 → 엉뚱한 코드 배포·빌드 비용 | ⚪ 대기(다음 키트 개정) |
| 2 | 2026-10-19 | 설치 스크립트가 키 입력을 화면에 보이지 않게(`Read-Host -AsSecureString` / `read -s`) | 리허설 T9: 입력한 Secret key가 창에 그대로 보임 | ⚪ 대기 |
| 3 | 2026-10-19 | 포장 스크립트 `make_lecture_kit.py`를 프로그램별 `KIT/kit.json`(빼기·덮어쓰기 목록)으로 읽게 일반화 → 새 프로그램은 `kit.json`만 쓰면 포장 | 지금은 스크립트 안 `PROGRAMS` 목록을 손으로 고쳐야 함 | ⚪ 대기 |
| 4 | 2026-10-19 | 포장 직후 비밀값 자동 검사(압축 안 `.env*`·키 패턴 발견 시 실패) | §4-2를 사람이 하지 않게 | ⚪ 대기 |
| 5 | 2026-10-19 | `threads-affiliate-poster/clone-kit` 방식과 `KIT/` 방식 중 하나로 통일 | 키트 방식이 두 가지라 수강생·CLI 모두 헷갈림 | ⚪ 주인님 결정 대기 |
| 6 | 2026-10-19 | 교육 매뉴얼(`docs/sns-kit-manual/SNS_KIT_STUDENT_MANUAL.md`) 작성 후 키트 `KIT/README.md`와 화면 이름·순서 일치시키기 | 리허설에서 안내서와 실제 화면이 다른 곳 다수 | 🔄 진행 중 |
