# Claude 작업 재개 안내 — Threads 콘텐츠 운영 자동화

> 기준일: 2026-10-06 · 현재 배포 버전: `v1.28` · 라이브: <https://www.buylife.xyz/threads-content-ops>

## 먼저 읽을 문서와 확인 순서

1. 저장소 루트의 `AGENTS.md`, `PROGRESS.md`, `docs/HANDOFF.md`, `docs/ERROR_LESSONS.md`를 읽습니다.
2. 이 폴더의 `AGENTS.md`, `README.md`, 그리고 이 문서를 읽습니다.
3. `git status --short`, `git log --oneline -10`으로 다른 CLI의 동시 작업과 최신 커밋을 확인합니다.
4. 코드 수정 전 `docs/SIDEBAR_LAYOUT_STANDARD.md`, `docs/PLATFORM_PATTERNS.md`의 공통 레이아웃·권한 규칙을 확인합니다.

## 이 프로그램의 목적과 범위

이 프로그램은 설치형 원본 `desktop/`을 배포하는 것이 아닙니다. AIMaster 안에서 각 회원이 자신의 Threads 계정, 자신의 Meta Developers Threads 앱, 자신의 API 키를 연결해 사용하는 **웹 기반 콘텐츠 운영 도구**입니다.

- `desktop/`은 사용자가 제공한 `boksajang/threads-auto` 원본의 기능·흐름 참고 사본입니다. 수정하거나 배포하지 않습니다.
- 기존 `threads/`, `threads-comment-reply/`, `threads-affiliate-poster/`, `threads-easy-planner/`는 참고만 합니다. 다른 CLI가 작업 중인 폴더를 수정하지 않습니다.
- 원본 영상의 다크 화면은 기능 구조만 참고합니다. AIMaster의 실제 서브프로그램 작업 화면은 항상 **흰색 베이스**입니다. 다크 테마를 복제하지 않습니다.

## 완료된 구현 순서

### 1. 웹 전환과 기본 안전장치 (v1.17~v1.25)

- 회원별 Threads OAuth 연결, 회원별 OpenAI·YouTube·쿠팡·Meta 앱 자격증명 저장, 복수 Threads 계정 연결을 구현했습니다.
- 초안 생성, 초안·예약·재검토 상태 전환, YouTube 공개 제목·설명 소재 불러오기를 구현했습니다.
- Meta OAuth 콜백 URI는 `https://www.buylife.xyz/api/threads-content-ops/callback` 하나만 사용합니다.
- 모든 쓰기 Server Action은 로그인만이 아니라 프로그램 접근 권한 및 선택 계정의 `user_id` 소유를 재검사합니다.

### 2. 실제 데이터만 쓰는 웹 운영 대시보드 (v1.26)

- `/threads-content-ops` 기본 화면을 대시보드로 재구성했습니다.
- `tco_threads_accounts`, `tco_posts`, 본인 `user_api_keys`의 실제 데이터만 집계합니다.
- 원본 화면의 구조를 다음처럼 웹형으로 옮겼습니다: 운영 계정 → 즉시 작업 소스 → 상태 지표 → API 상태 → 실제 작업 이력 → 예약 목록.
- 쿠팡·네이버·블로그 소스, 댓글, 성과 데이터는 아직 실제 수집이 없으므로 가짜 숫자나 예시 상품으로 채우지 않습니다.

### 3. 계정별 운영정보와 소스 큐 데이터 기반 (v1.27)

- `?tab=accounts`에 세 번째 번호형 흐름 **계정 운영정보**를 추가했습니다.
- 각 회원은 연결한 각 Threads 계정별로 주제·성격·말투·대상 독자·금지 주제/표현·일상/홍보 비율·하루 목표·댓글 확인 주기·운영 시간을 저장합니다.
- 운영 DB에 아래 테이블을 적용하고, 각 테이블의 RLS 활성화와 4개(select/insert/update/delete) owner-only 정책을 검증했습니다.

| 테이블 | 역할 | 중요한 제약 |
| --- | --- | --- |
| `tco_operation_profiles` | 계정별 운영 선호값 | `user_id`, `account_id`, 계정별 1개 프로필 |
| `tco_content_sources` | 블로그·쿠팡·네이버 브랜드 커넥트 자료 큐 | 회원과 계정별 분리 |

- 마이그레이션: `supabase/migrations/20261006022901_tco_operation_profiles_and_sources.sql`
- `automation_enabled`는 발행 실행 권한이 아니라 선호 설정입니다. 워커·큐·재시도·최종 발행 권한이 구현되기 전에는 어떤 게시도 자동 실행되지 않습니다.

### 4. 콘텐츠 소스 큐 UI와 등록 (v1.28)

- 사이드바 번호 흐름에 **4. 콘텐츠 소스**(`?tab=sources`, `SourceQueue.tsx`)를 추가했습니다. 회원이 계정별로 블로그·쿠팡 파트너스·네이버 브랜드 커넥트 링크를 직접 등록·수정·삭제하고 상태(사용 가능/사용 완료/보관)를 바꿉니다.
- 외부 수집은 하지 않습니다. 서버 동작은 `web-actions.ts`의 `createContentSource`/`updateContentSource`/`setContentSourceStatus`/`deleteContentSource`이며, 모두 권한 검사 뒤 `user_id`로 제한하고 `{ ok, error }` 결과를 반환합니다(throw 금지 — 운영 서버가 메시지를 가림).
- 대시보드 "즉시 작업" 카드는 실제 등록 건수만 보여줍니다. 소스로 초안을 만드는 연결(아래 4번)이 구현되기 전에는 `작업 가능`으로 표시하지 않습니다.

## 다음 구현 우선순위

다음 단계는 한 번에 모두 만들지 말고, 아래 순서를 지킵니다. 각 번호를 하나의 독립 작업 세트(구현 → 빌드 → 문서 → 커밋 → 푸시 → 루트 배포)로 끝냅니다.

1. ~~**콘텐츠 소스 큐 UI와 등록**~~ — **완료(v1.28, 2026-10-06).** 위 "4. 콘텐츠 소스 큐 UI와 등록" 참고.
2. **쿠팡 파트너스 실제 검색 연동**: 회원 본인의 쿠팡 파트너스 키로만 검색하고, 사용자가 선택한 결과만 소스 큐로 저장합니다. 키가 없거나 API가 실패하면 명확한 안내를 보이며 예시 상품을 대신 표시하지 않습니다.
3. **네이버 브랜드 커넥트 링크 분석·등록**: 회원이 입력한 제휴 링크를 분석해 실제 결과만 큐에 저장합니다. 크롤링 또는 외부 연결이 필요하면 권한·정책·실제 응답을 먼저 검증합니다.
4. **계정별 즉시 초안 생성 흐름 확장**: 선택 소스와 계정 운영정보를 프롬프트에 넣어 초안을 만들고, 사용자가 검토한 뒤에만 명시적으로 발행합니다.
5. **댓글 관리**: Meta 공식 API로 실제 수집 가능한 댓글만 표시하고, AI 제안 답변과 최종 전송을 분리합니다. 자동 답글은 기본 OFF입니다.
6. **성과 리포트**: Meta/제휴 플랫폼에서 실제로 얻은 지표만 저장·표시합니다. 수집 권한·API가 없는 항목은 빈 상태와 설정 안내로 남깁니다.
7. **무인 예약 실행**: Vercel Cron 보안 설정, 큐 조회, 계정별 opt-in, 실행 이력, 실패 재시도, 중단 장치를 모두 갖춘 후에만 별도 단계로 구현합니다. 사전 환경변수·DB 스키마 변경은 주인님 승인 범위입니다.

## 핵심 금지사항과 검수 기준

- 운영자 API 키, 운영자 Meta 앱, 다른 회원의 토큰으로 절대 폴백하지 않습니다. 모든 외부 키·앱·계정은 회원 본인 것입니다.
- 모든 새 사용자 데이터는 `user_id`를 갖고 RLS owner-only 정책을 적용합니다. 서비스 롤을 쓰더라도 코드에서 `user_id` 필터를 유지합니다.
- API route/Server Action에는 `checkProgramAccessApi()` 또는 `requireProgramAccess()` 계열의 이용 권한 검사를 넣습니다. 로그인 확인만으로는 부족합니다.
- 권한을 읽는 `page.tsx`/`route.ts`에는 `dynamic = "force-dynamic"`와 `fetchCache = "force-no-store"`를 함께 둡니다.
- 자동화 UI는 선호 설정, 큐 대기, 실행 워커, 외부 발행 권한을 구분해 표시합니다. 아직 없는 기능을 `활성`, `발행 가능`, `실시간`처럼 표현하지 않습니다.
- 타 프로그램 UI를 참고할 때는 레이아웃·동작 규칙을 재사용하되, 원본의 다크 색상은 가져오지 않습니다. 사이드바는 `docs/SIDEBAR_LAYOUT_STANDARD.md`를 따르며 로그인 계정·로그아웃을 API 메뉴 바로 아래에 둡니다.
- 실제 유료 API 호출, 환경변수 변경, DB 스키마 변경, 외부 최종 발행은 루트 정책의 사전 승인 조건을 지킵니다.

## 배포와 인수인계 절차

이 프로그램은 루트 AIMaster 프로젝트의 경로입니다. `threads-content-ops/`에서 Vercel 배포를 실행하면 별도 프로젝트가 생기므로 실제 서비스 주소가 갱신되지 않습니다.

```powershell
# 이 폴더에서 기능 빌드
npm.cmd run build

# 저장소 루트에서 필요한 파일만 명시적으로 커밋
git add threads-content-ops/<changed-files> docs/HANDOFF.md docs/ERROR_LESSONS.md
git commit -m "feat(threads-content-ops): <요약>"
git push origin master

# 반드시 저장소 루트에서 실제 AIMaster 서비스 배포
vercel deploy --prod --yes --scope buylife
```

배포 뒤 `curl.exe -sS -I https://www.buylife.xyz/threads-content-ops`를 확인합니다. 비로그인 상태의 `307 → /login?redirect=...`는 정상입니다. `X-Vercel-Cache: MISS`를 확인해 권한 응답 캐싱이 없는지 봅니다.

## 최근 기준점

- 최신 기능 커밋: `git log --oneline -5 -- threads-content-ops "app/(dashboard)/threads-content-ops"`로 확인 — v1.28 `feat(threads-content-ops): 콘텐츠 소스 큐 등록 (v1.28)`이 최신이며, 그 직전 기능은 `77604d77`(v1.27 계정별 운영정보)입니다.
- 운영 DB 버전: `programs.slug = 'threads-content-ops'`, `version = 'v1.28'`
- 실제 서비스 주소는 항상 `https://www.buylife.xyz/threads-content-ops`입니다(루트 AIMaster 프로젝트 배포).
- 작업 중인 다른 CLI의 변경을 섞지 않도록 `git add`는 반드시 파일 경로를 지정합니다. 루트의 `.analysis-threads-auto/`, `scratch/`, `debug.log`, 갱신 스크립트, `threads-content-ops/supabase/.temp/`는 이 기능 커밋에 포함하지 않습니다.
