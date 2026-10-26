# AI 블로그 이웃 소통 자동화 — 담당 지침

> **최신 상태:** 2026-10-26 23:47 운영SQL 적용·읽기검수 완료: 신규6표 RLS=true, runtime=false, RPC는service_role만, 회원직접쓰기/서버runtime수정불가, jobs/settings0. 프로그램등록·실제SSO/계정·UI/AI/확장·30일정리·배포는 미완료. 사용자 후속 실행 지시에 따라 Codex가 적용했습니다. 생성 SQL 재실행 대신 [완료검수/다음단계](docs/IMPROVEMENT_HANDOFF_20261026_SERVER_DATABASE.md)를 확인합니다.

2026-10-26 · 담당 `codex-win-20261025-blog` [역할: blog]. 루트 지침 우선. ① AIMaster 운영용 신규 독립 기본 프로그램 `blog-neighbor-care`, 운영ref `esgxyikcnnvmlhygjkth`.

## 목적·현재 상태

본인 블로그에 맞는 후보 선별→서로이웃 신청/수락→새 글 공감/분석/댓글→외부 결과 기록. [원문 D1~D9](../docs/analysis-naver-blog-neighbor-20261024/HANDOFF_20261024_BLOG_NEIGHBOR_CARE.md) 유지. 현재 **1번 서버/DB 소스와 로컬 검수만**, 운영SQL 적용·읽기검수 완료, 프로그램등록/배포/실제네이버 동작 미완료. 공개UI·확장·AI생성은 아직 없습니다. 계획 초기버전v1.01(package1.1.0), 실제릴리스 아님.

## 구조·도구

- Next16.4.2 API-only `/api/work`, Supabase SSR0.12.7/JS2.117.3, TypeScript5.9.3. 개인 환경파일/키를 복사하거나 하드코딩하지 않습니다.
- 회원인증 `auth.getUser()`→활성프로그램 확인→공용 `checkProgramAccess`→서버전용RPC. 소유자는 세션에서 결합하며 요청의user_id/성공증거/작업상태를 믿지 않습니다.
- `bnc_dispatch`: 서비스 역할 전용·SECURITY INVOKER·고정search_path, 회원설정행 잠금으로 상한/이웃슬롯/상태를 원자적으로 처리. 관찰/claim/arm/verify_permit/result는 회원HTTP에 노출하지 않습니다.
- 회원SELECT는본인RLS만, 직접상태/카운터변경·RPC호출불가. 서버 역할도runtime업데이트불가. 라이브게이트는 **초기false**이며 운영자 SQL로 정책근거를 별도로 확인하기 전 켜지 않습니다.
- 본인공용 `member_platform_accounts`의 `naver_blog` 연결 참조만 받습니다. 이 플랫폼 연결/카탈로그 등록·실제기기 검증은4번 확장단계에서 필요하며, 네이버로그인OAuth를 블로그쓰기 권한으로 취급하지 않습니다.
- Postgres17.11 Docker격리검수: 네트워크none·호스트포트0·가상회원만, 검수후본인컨테이너삭제. 운영DB를 로컬검수에 쓰지 않습니다.

## 공용 사본 원본

`src/lib/programAccess.ts`←루트`lib/access/checkProgramAccess.ts`; `src/lib/utils/phone.ts`←루트`lib/utils/phone.ts`; Supabase server/admin/cookieDomain←`blog-keyword/src/lib/supabase/`의 동명파일. 사본규칙은루트를따르며 직접규칙을변경하지않습니다. 다른CLI는 원본변경시여기도함께대조합니다. 별도`access.ts`에서프로그램활성/운영ref를확인합니다.

## 검수·운영 적용

```powershell
npm ci --ignore-scripts
npm test
npm run test:database
npm run build
npm run test:http
```

명령은 **이폴더**에서만 실행. DB검수는캐시된`postgres:17-alpine` 필요(`--pull never`), 실제DB/회원키연결없음. HTTP검수는빌드뒤실행, 가짜공개키/세션없음 경로만 확인. 실제Supabase로그인/Edge E2E통과로보고하지않습니다. [검수·인수인계](docs/IMPROVEMENT_HANDOFF_20261026_SERVER_DATABASE.md)와`docs/evidence/`참고.

**운영SQL:** [적용안내](docs/APPLY_20261026_SERVER_DATABASE.md)·검수SQL을 먼저제시합니다. 원본 직접Run 절차는 이번 검수본에 한해 사용자 후속지시로 변경해 Codex가 실행했습니다. 신규6표/함수/RLS/권한만 적용했으며 기존키/회원권한/프로그램행은 미수정입니다.

## 기능·장단점·이력

- 구현: 설정/작업준비·승인/수정/목록, 회원합산상한20/100/30, 이웃당댓글·답글합계1/KST일, 선점세대·30초허가재확인, 결과불명중단·재전송방지, 연결해제시작업보존.
- 로컬검수: API14·SQL28·실제NextHTTP6=48. 메모리모의32개와별도이며 원래출시40개전체완료아님.
- 한계: 실제JWT/SSO·프로그램권한운영E2E·정책허용·외부계정관찰·확장·UI·AI·30일삭제Cron미구현. 생성물만료실행차단만현재구현.
- 2026-10-26: 서버/DB 1단계 최초작성, 운영미적용/미배포. 사용범위는[플랜](docs/PLAN_20261026_SERVER_DATABASE.md).

## 대기·연계·디자인

1번운영적용/읽기검수 완료. 다음은 허용자료·본인Edge 읽기검수와2번프로필/AI·3번디자인·4번확장순서로진행합니다. UI는디자인담당의4화면3시안/승인후. 다른세션5번워크스페이스/플래너·이미지원고복귀는제외. 기존Edge에이전트/SEO대기기록보존. [개선원장](docs/IMPROVEMENTS.md)·[대기목록](docs/IMPROVEMENT_BACKLOG.md)·[디자인전달](docs/DESIGN_HANDOFF.md).
