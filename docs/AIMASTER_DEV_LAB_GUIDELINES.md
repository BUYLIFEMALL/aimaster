# AIMaster_dev 개발·운영 지침 — 개별 프로그램 개발 및 강의 Class (Lab)

> 2026-10-19 주인님 지시로 제정한 **최상위 메인 지침**이다. 루트 `CLAUDE.md`·`AGENTS.md`·`GEMINI.md` 맨 위에서 이 문서로 연결한다.
> **AIMaster_dev는 기본 AIMaster 개발 프로젝트(buylife.xyz 메인 사이트 + 서브 프로그램)와 완전히 다른 별도 운영 체계다.** 두 체계의 규칙을 섞지 않는다.

> ## ★★★ 절대 불변 최상위 규칙 — AIMaster_dev 작업 CLI의 AIMaster 운영 수정·삭제 금지 (2026-10-19 주인님 지시, 어떤 경우에도 바뀌지 않음)
> **AIMaster_dev(Lab) 쪽을 작업하는 CLI(Claude Code·Codex·Antigravity `agy` 등 모든 에이전트)는 AIMaster 운영 쪽의 프로그램(루트 메인 사이트 코드, `AIMaster/<프로그램>/` 운영 서브프로그램 폴더, 그 Vercel 프로젝트·도메인·환경변수)과 운영 DB(Supabase `AIMaster`, ref `esgxyikcnnvmlhygjkth`)를 절대 수정하거나 삭제할 수 없다.**
> - 금지 예: 운영 폴더 파일 편집·삭제, 운영 DB에 대한 모든 쓰기(`insert/update/delete`, 마이그레이션, 테이블·버킷·사용자 변경), 운영 Vercel 프로젝트 배포·설정 변경·삭제, 운영 프로그램을 `labs/`로 "옮기기"(복사만 허용 — 원본은 그대로 둔다).
> - 허용: `labs/` 폴더, `scripts/lab/`, 이 지침 문서, AIMaster_dev DB(ref `rjjtjakljjxsgjelqgek`), Lab 전용 Vercel 프로젝트. 운영 코드를 **읽고 참고·복사**하는 것은 된다.
> - **유일한 예외: 관리자(주인님, `buylifemall@gmail.com`)가 그 작업을 명시적으로 지시한 경우만.** 이때도 지시받은 범위만 하고, 운영 작업은 운영 AIMaster 지침(루트 `CLAUDE.md`·`AGENTS.md` 전체 규칙)을 그대로 따른다. "Lab 작업에 필요해서", "같은 저장소라서", "작은 수정이라서"는 예외가 아니다.
> - 작업 중 운영 쪽을 건드려야 할 것 같으면 **멈추고 주인님께 먼저 여쭌다.** 이 규칙은 이 문서의 다른 모든 내용보다 위에 있고, 주인님 외에는 누구도 바꿀 수 없다.

## 0. 한눈에 보기

| 구분 | AIMaster (운영) | AIMaster_dev (Lab) |
|---|---|---|
| 용도 | 실제 회원 서비스 | 개별 프로그램 개발 실험, 강의 수업 시연·실습 |
| Supabase 프로젝트 | `AIMaster` — ref `esgxyikcnnvmlhygjkth` | `AIMaster_dev` — ref `rjjtjakljjxsgjelqgek` |
| Supabase 조직·요금제 | `BUYLIFE` (Pro) | **`BUYLIFE-DEV` (Free, 0원)** — 2026-10-19 BUYLIFE에서 이전(주소·키·ref 그대로) |
| 메인 사이트 연결 | buylife.xyz 회원·등급·권한·결제로 묶임 | **연결 없음** — 프로그램 하나하나가 혼자 동작 |
| 코드 위치 | `AIMaster/<프로그램>/` | `AIMaster/labs/<프로그램>/` |
| Vercel 프로젝트 이름 | 프로그램 이름 그대로 | **항상 `dev-<이름>`** — Vercel 목록에서 운영 프로젝트와 바로 구분(2026-10-19 주인님 지시). 도메인에 밑줄을 쓸 수 없어 `dev_`가 아니라 `dev-` |
| 주소 | `<이름>.buylife.xyz` | Vercel이 만들어 주는 **`dev-<이름>.vercel.app` 그대로** |
| 로그인 | 메인 회원 계정 + `requireProgramAccess()` | dev의 Supabase Auth로 그 프로그램에서 바로 가입·로그인 |
| 가입 | 회원가입 + 핸드폰 + 권한 부여 | **누구나 가입 허용**(2026-10-19 주인님 확정, 1번 방식) |
| 수명 | 계속 운영 | **언제든 새로 만들고 삭제** |

## 1. 기본 원칙

1. **프로그램 단위로 독립한다.** Lab 프로그램은 AIMaster 메인 사이트·다른 Lab 프로그램·운영 DB를 부르지 않는다. AIMaster 전체를 복제하지 않으며, 공통 테이블(`profiles`·`programs`·`subscriptions` 등)도 dev에 만들지 않는다.
2. **운영 DB는 절대 건드리지 않는다.** Lab 프로그램의 환경변수·마이그레이션·삭제 스크립트는 dev ref(`rjjtjakljjxsgjelqgek`)만 쓴다. 운영 ref(`esgxyikcnnvmlhygjkth`)가 보이면 즉시 멈춘다. 에이전트가 DB 작업을 보고할 때는 항상 어느 ref에 했는지 적는다.
3. **자유롭게 만들고 지운다.** 실험·수업이 끝나면 `scripts/lab/delete-lab.mjs`로 그 프로그램의 테이블·버킷·Vercel 프로젝트·폴더를 한 번에 지운다(주인님 지시 범위 안의 Lab 프로그램은 삭제 전 재질문하지 않는다).
4. **이름표(접두어)로 칸을 나눈다.** 한 Lab 프로그램의 테이블·Storage 버킷은 모두 그 프로그램 이름표로 시작한다. 이름표 = 폴더 이름의 `-`를 `_`로 바꾼 것(예: `labs/card-demo/` → 테이블 `card_demo_posts`, 버킷 `card-demo-files`). 다른 Lab의 칸은 건드리지 않는다.
5. **데이터는 로그인한 본인 것만 보인다.** 사용자 데이터 테이블은 `user_id uuid references auth.users` + RLS `auth.uid() = user_id`를 처음부터 건다(누구나 가입하므로 필수).

## 1-1. AIMaster_dev DB 구조 (2026-10-19 초기화 후 재설계)

| 영역 | 내용 |
|---|---|
| `public` | **공통 테이블 없음.** Lab 프로그램마다 `<이름표>_*` 테이블·뷰·함수만 둔다. Data API로 바로 쓰므로 대시보드 설정 변경이 필요 없다. |
| `lab_admin` (API 비공개) | `programs` 등록부(이름·이름표·버킷 이름표·목적·주소·상태), `register_program(이름, 목적, 주소)`, `drop_program(이름)` |
| 자동 검사 (이벤트 트리거 `lab_enforce_tables`) | `public`에 **등록된 이름표가 없는 테이블을 만들면 거부**하고, 새 테이블은 **RLS를 자동으로 켠다**(정책을 안 만들면 아무도 못 읽음 = 안전 기본값) |
| `auth` | 모든 Lab이 함께 쓰는 로그인. 데이터는 각 테이블 RLS로 본인 것만 |
| Storage | 버킷 이름은 `<이름>-`로 시작. 삭제는 Storage API(`delete-lab.mjs`) |

- **2026-10-19 초기화 기록**: 예전 블로그 시험 데이터(public 테이블 12개, `blog_posts` 31건·212MB 포함, dev 계정 `buylifemall@gmail.com` 1개)를 dev DB 안의 **`lab_backup_20261019` 스키마**(API 비공개)에 복사해 건수를 맞춰 본 뒤 public·계정을 비웠다. **보관 결정(2026-10-19 주인님): dev 쪽 Lab 프로그램이 안정화될 때까지 보관하고, 안정화되면 `drop schema lab_backup_20261019 cascade;`로 삭제한다.** 삭제 시점은 주인님께 「안정화됐으니 지워도 될지」 한 번 여쭌 뒤 진행한다.
- **주의 — 일시정지 프로젝트를 재개할 때**: 상태가 `COMING_UP`인 동안에는 빈 임시 DB가 먼저 응답하고, 복원이 끝나면(`ACTIVE_HEALTHY`) 원래 데이터로 바뀐다. 그 사이에 조회·적용한 내용은 사라진다. **반드시 `ACTIVE_HEALTHY`를 확인한 뒤** 조회·변경한다.
- 원본 SQL: [`labs/_platform/migrations/0001_lab_admin.sql`](../labs/_platform/migrations/0001_lab_admin.sql) — dev를 다시 초기화하면 이 파일부터 다시 적용한다.
- 새 Lab 마이그레이션은 항상 `select lab_admin.register_program('<이름>');`으로 시작한다(뼈대에 포함).
- 삭제는 `select lab_admin.drop_program('<이름>');` 한 줄로 그 이름표의 DB 객체가 모두 지워지고 등록부에 삭제 표시가 남는다.

## 2. Lab에서도 그대로 지키는 규칙 (예외 없음)

- **본인 API 키**: AI·외부 서비스 키는 사용자가 본인 것을 직접 넣어 쓴다. 강의 시연은 주인님(강사) 본인 키, 수강생은 각자 본인 키. 운영자 키를 환경변수에 넣어 모두가 쓰게 하지 않는다(무료 공용 키 예외는 운영 지침과 같은 조건).
- **비밀 키를 코드·문서·저장소에 넣지 않는다.** Vercel 환경변수와 로컬 `.env.local`(커밋 금지)에만 둔다.
- **비용 규칙**: 유료 API 대량·반복 호출, 이미지·영상 다수 생성은 사전 승인. 시험은 가장 저렴한 모델로(`docs/TEST_COST_POLICY.md`). dev 프로젝트 재개(컴퓨트 요금)는 주인님 승인 후, 쓰지 않을 때는 일시정지.
- **AI 프롬프트 당해 연도 기준**, 인물 이미지는 기본 한국인 묘사(운영 핵심 원칙 3·8번).
- **진행·보고는 쉬운 한글 존댓말**, 같은 폴더 동시 작업 금지·`docs/ACTIVE_WORK.md` 확인.
- 이미지 생성 연동은 `ai-image-studio`의 모델·호출 방식을 참고(프롬프트는 프로그램 고유).

## 3. Lab에서는 적용하지 않는 운영 규칙 (운영으로 옮길 때부터 적용)

- 메인 사이트 연동: `requireProgramAccess()`/`checkProgramAccessApi()`, 등급·사용기간·핸드폰 필수, FREE/프리미엄 배지, `programs`·`pricing_plans` 등록
- 버전 관리(`lib/version.ts`·`programs.version`), 인수인계 문서 6종, `DESIGN.md` 현황판·디자인 템플릿 등록, 역량 지도(`PROGRAM_CAPABILITY_MAP.md`) 갱신
- `<이름>.buylife.xyz` 도메인·`.buylife.xyz` SSO 쿠키, 사이드바 "다른 프로그램 보기" 링크, 메인 사이트 상세 소개 작성
- 공용 기준 코드 사본 동기화(`check-shared-modules.mjs`)·프로그램별 배포 등급 규칙
- Lab 작업은 루트 `docs/HANDOFF.md`에 남기지 않아도 된다. 대신 `labs/<프로그램>/README.md` 한 장에 목적·실행 방법·남은 일만 적는다.

## 4. 프로그램 생명주기

### 4-1. 만들기
```bash
node scripts/lab/new-lab.mjs <이름>          # labs/<이름>/ 에 뼈대 복사 + 이름표 적용
cd labs/<이름> && npm install
# .env.local 에 dev 주소·공개 키 입력(.env.example 참고) → npm run dev 로 확인
```
- 테이블: `labs/<이름>/supabase/migrations/*.sql`에 작성 → dev에만 적용(Supabase MCP `apply_migration` 시 `project_id=rjjtjakljjxsgjelqgek`, 또는 dev SQL 편집기).
- 배포: `labs/<이름>/`에서 처음 한 번 `vercel link --yes --project dev-<이름> --scope buylife`(**프로젝트 이름은 반드시 `dev-`로 시작** — `new-lab.mjs`가 `lab.json`에 적어 두고, `delete-lab.mjs`는 `dev-`가 아니면 삭제를 거부한다) → `vercel deploy --prod --yes --scope buylife` → `dev-<이름>.vercel.app` 주소가 생긴다(이미 쓰이는 이름이면 Vercel이 뒤에 글자를 붙인다). 환경변수 2개(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 또는 `NEXT_PUBLIC_SUPABASE_ANON_KEY` — 모두 dev 값)를 `vercel env add`로 등록한 뒤 다시 배포한다. 이 프로젝트의 "운영 배포"는 곧 dev DB 연결 배포다.
- Lab 프로젝트 배포도 빌드 비용이므로 로컬에서 `npm run build`로 먼저 확인하고, 여러 Lab은 한 번에 하나씩 배포한다.

### 4-2. 수정
- dev에서 마음대로 고친다. 테이블을 지웠다 다시 만들어도 된다(운영과 무관).
- 기존 운영 프로그램을 실험적으로 고쳐 보고 싶으면, 운영 폴더를 직접 고치지 말고 `labs/<이름>-exp/`로 **복사**해서 Lab 규칙으로 실험한다(원본 운영 폴더·운영 DB는 읽기만 — 최상위 규칙).

### 4-3. 삭제
```bash
node scripts/lab/delete-lab.mjs <이름>            # 지울 목록만 보여 줌(아무것도 안 지움)
node scripts/lab/delete-lab.mjs <이름> --yes      # 실제 삭제
```
- 지우는 것: 마이그레이션에 `create table`로 적힌 이름표 테이블(이름표로 시작하는지 다시 확인), 이름표 버킷, Vercel 프로젝트(`vercel project rm`), `labs/<이름>/` 폴더.
- DB 삭제에는 dev 연결 주소 환경변수 `LAB_DB_URL`(dev의 Postgres 연결 문자열, 주인님이 직접 넣음)이 필요하다. **윈도우 PC에만 등록돼 있으며 삭제 스크립트는 윈도우에서만 실행한다(맥미니 미등록, 2026-10-19 주인님 결정).** 주소에 운영 ref가 있거나 dev ref가 없으면 스크립트가 실행을 거부한다. `LAB_DB_URL`이 없으면 DB 쪽은 실행할 SQL만 출력하고 건너뛴다.

### 4-4. 운영으로 옮기기 (잘 됐을 때만, **주인님의 명시적 지시가 있을 때만** — 최상위 규칙의 예외에 해당)
1. `labs/<이름>/` → `AIMaster/<이름>/`로 옮긴다.
2. 운영 규칙을 이때부터 모두 적용: `requireProgramAccess()` 등 권한 판정 추가, `programs`·요금제 등록, `v1.01`, 인수인계 문서 6종, 도메인 `<이름>.buylife.xyz`, 상세 소개 등.
3. 같은 마이그레이션 파일을 운영 DB에 적용(운영 DB 변경은 기존처럼 사전 승인).
4. dev 쪽은 `delete-lab.mjs`로 정리한다.

## 5. 강의 수업 운영

1. **수업 전**: 대시보드에서 AIMaster_dev 재개(몇 분 소요, 승인된 비용) → 시연할 Lab 프로그램 주소가 열리는지, 가입·로그인이 되는지 확인.
2. **수업 중**: 수강생은 `dev-<이름>.vercel.app`에서 직접 가입해 쓴다(누구나 가입). 강사 시연은 강사 본인 dev 계정 + 본인 키.
3. **수업 후**: 그 Lab이 더 필요 없으면 `delete-lab.mjs`로 지우고, 다음 수업 전까지 dev 프로젝트를 일시정지한다.
4. dev 계정과 운영 회원 계정은 완전히 별개다(쿠키 이름에 ref가 들어가 섞이지 않음). 수강생이 운영 사이트로 넘어가면 운영 가입이 따로 필요하다고 안내한다.
5. 수업 편의 설정(가입 이메일 인증 끄기 등)은 **dev에만** 적용한다.

## 5-1. Free 조직(BUYLIFE-DEV) 운영 메모 (2026-10-19)

- **비용 0원.** 대신 Free 제약: 7일 동안 사용이 없으면 자동 일시정지(오래 정지되면 대시보드 복구가 막힐 수 있음), DB 500MB(넘으면 읽기 전용), 파일 1GB·파일당 50MB, 전송량 월 5GB, 활성 사용자 월 5만, 자동 백업 없음, 로그 1일, 가장 작은 서버.
- DB 용량에는 `lab_backup_20261019`(약 0.2GB)가 포함된다 — 500MB 한도에 가까워지면 백업부터 정리(주인님 확인).
- **유료로 돌릴 때**: AIMaster_dev → Project Settings → General → Transfer project → `BUYLIFE`(Pro). 조직 기본료 추가 없이 dev 컴퓨트만 과금. `BUYLIFE-DEV` 조직 자체를 Pro로 올리면 기본료가 조직 하나 더 붙으므로 하지 않는다.
- **에이전트 접근**: claude.ai Supabase 커넥터는 허용된 조직만 볼 수 있다. dev를 MCP로 다루려면 커넥터에 `BUYLIFE-DEV` 조직 권한이 있어야 한다(없으면 `permission` 오류).
- 7일 자동 정지 방지 장치(하루 1회 가벼운 요청)는 별도 작업으로 결정 예정.

## 6. dev 프로젝트 1회 준비 (주인님 승인 후)

- [x] AIMaster_dev 재개(2026-10-19) → Free 조직 `BUYLIFE-DEV`로 이전(2026-10-19)
- [x] claude.ai Supabase 커넥터에 `BUYLIFE-DEV` 조직 권한 추가(주인님) — 2026-10-19 Claude Code(윈도우)가 MCP로 확인: 주소 조회·SQL 실행 정상, `public` 테이블 0개
- [x] Authentication → 이메일 확인(Confirm email) 끄기 — 수강생이 바로 가입·로그인 (2026-10-19 Claude Code가 대시보드 Sign In / Providers에서 끄고 저장, 새로고침 후 꺼짐 확인. 「새 가입 허용」은 켜짐 유지)
- [ ] Authentication → URL 설정에 Lab 주소를 허용 목록에 추가(비밀번호 재설정 등 메일 링크가 필요할 때) — **Lab 프로그램을 만들 때마다 그 정확한 주소(`https://dev-<이름>.vercel.app/**`)를 하나씩 추가한다.** `https://dev-*.vercel.app/**`, `*-buylife.vercel.app` 같은 와일드카드는 쓰지 않는다: `vercel.app` 이름은 누구나 만들 수 있어, 남이 `dev-xxx` 프로젝트를 만들면 로그인 링크(토큰)가 그쪽으로 넘어갈 수 있다(2026-10-19 Claude Code 판단, 아직 Lab 프로그램 없음)
- [x] 삭제 스크립트용 `LAB_DB_URL`(dev Postgres 연결 문자열)을 주인님 PC 환경변수로 등록 — 에이전트는 비밀번호를 입력하지 않는다 (2026-10-19 윈도우 PC 사용자 환경변수 등록, Session pooler `aws-1-ap-northeast-2.pooler.supabase.com:5432`. Claude Code가 값 출력 없이 dev ref 포함·운영 ref 없음·접속 성공(`lab_admin` 스키마 확인) 검증. **맥미니에는 등록하지 않음(주인님 결정) — 삭제 스크립트는 윈도우 전용**: DB·Vercel 삭제는 윈도우 담당(`docs/MAC_MINI_AGENT_PLAYBOOK.md`)이므로 맥미니 에이전트는 Lab 삭제가 필요하면 윈도우에 요청한다)

## 7. 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-10-19 | dev DB 비밀번호 리셋 + `LAB_DB_URL` 윈도우 PC 등록(주인님), Claude Code 접속 검증 성공 → 6번 체크리스트 중 URL 허용 목록(첫 Lab 프로그램 때)만 남음 |
| 2026-10-19 | dev(ref `rjjtjakljjxsgjelqgek`) Auth 「Confirm email」 끔(주인님 지시, Claude Code가 크롬 대시보드에서 처리) — 가입 즉시 로그인 가능. 운영 DB 설정은 변경 없음 |
| 2026-10-19 | dev 커넥터 연결 확인(Claude Code): ref `rjjtjakljjxsgjelqgek` 주소 조회·SQL 실행 성공(PostgreSQL 17.6) → 6번 체크리스트 커넥터 항목 완료 처리 |
| 2026-10-19 | 절대 불변 최상위 규칙 추가(주인님 지시): AIMaster_dev 작업 CLI는 AIMaster 운영 프로그램·DB를 수정·삭제할 수 없다(관리자 명시 요청만 예외) |
| 2026-10-19 | 제정(주인님 지시): AIMaster_dev = 개별 프로그램 개발·강의 Class 전용 독립 체계, 누구나 가입(1번), `labs/` 폴더·이름표·`dev-<이름>.vercel.app` 주소(Vercel 프로젝트 `dev-` 접두어), 뼈대(`labs/_template`)·생성/삭제 스크립트(`scripts/lab/`) |
