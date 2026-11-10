# REA 카테고리 지침 — 외부 원본 복제·분석용 내부 카테고리 (관리자·시험 계정 전용)

> 2026-11-11 주인님 지시: 「메인싸이트에 REA 카테고리를 만들었어 앞으로 여긴 웹싸이트/앱/PC용 프로그램들을 복제한후에 분석후 AIMaster안에서 사용되는 프로그램에 응용하거나 기능병합, 디자인 적용등으로 활용할꺼야」 「REA카테고리에 등록되는 자동화프로그램, 웹싸이트, 앱 등은 외부노출이 되어선 안되 참고, 분석용이니까 관리자 계정과 테스트계정으로 들어갔을때만 볼수 있으면 되」
> 결정(같은 날): 시험 계정은 새 표시 칸 `profiles.can_view_internal`로 구분 · 처리 대상은 **비공개 카테고리 전부**(`categories.is_public = false`) · 메인 사이트 즉시 배포.

## 1. REA 카테고리는 무엇인가
- 메인 사이트 카테고리 `REA`(slug `rea`). 외부 웹사이트·앱·PC 프로그램을 **복제·분석**한 결과물(사전 검증 페이지, 재구현 시험판, 분석 도구)을 모아 두는 **내부 참고용** 자리다.
- 목적: 분석 결과를 AIMaster 회원 프로그램에 **응용·기능 병합·디자인 적용**하는 재료로 쓴다. REA 프로그램 자체를 회원에게 팔거나 공개하지 않는다.
- 분석 도구: REA(`rea`)·Craft Anything·Ghidra 등 — [`ANALYSIS_TOOLKIT.md`](ANALYSIS_TOOLKIT.md) §2-1·§2-7·§2-7-1.

## 2. 누가 볼 수 있나 (절대 규칙)
| 계정 | REA(비공개 카테고리) 목록·상세·사용 |
|---|---|
| 관리자 `buylifemall@gmail.com` (`profiles.is_admin`) | 보임·사용 가능 |
| 시험 계정 `buylifemall@naver.com` (`profiles.can_view_internal = true`) | 보임·사용 가능 |
| 그 밖의 모든 회원(FREE 배지·구독·등급·사용기간이 있어도) | **안 보임**, 상세 주소로 들어와도 「없는 페이지」, 프로그램 사용 차단 |
| 비로그인 방문자·검색엔진 | 안 보임, 사이트맵 제외, `noindex` |

- 판정 순서(공용 `evaluateProgramAccess`): 정지 → 관리자 → **내부 카테고리면 `can_view_internal`만 허용, 아니면 차단** → (공개 프로그램만) 핸드폰 → FREE → 구독 → 등급+사용기간.
- `can_view_internal`은 회원이 직접 바꿀 수 없다(트리거 `profiles_protect_can_view_internal`). 계정을 추가·해제할 때는 주인님 지시를 받아 서버 키로 SQL을 실행하고 이 문서 §6에 기록한다.
- 「비공개 카테고리 = 내부용」이므로 관리자 화면에서 카테고리를 비공개로 바꾸면 그 카테고리 프로그램 전체가 같은 규칙을 따른다(현재 비공개: `rea`, `backup` — 백업 프로그램은 모두 꺼져 있어 화면 변화 없음).

## 3. 구현 위치 (메인 사이트, 2026-11-11)
- 공용 컴포넌트 `lib/programs/internalCategories.ts` — `isInternalCategory`·`canViewInternalCategories`·`canViewInternalForCurrentUser`·`hideInternalByJoinedCategory`. **프로그램을 보여 주는 새 화면을 만들면 반드시 이 함수로 거른다.**
- 판정: `lib/access/checkProgramAccess.ts`(`isInternalProgram`·`canViewInternal`, 사유 `internal_viewer`/`internal_only`), `lib/access/getProgramAccessMap.ts`.
- 적용 화면: 메인 첫 화면 `app/(main)/page.tsx`, 목록 `app/(main)/programs/page.tsx`, 카테고리 `programs/category/[slug]`(비공개 카테고리는 열람 계정만, `noindex`), 상세 `programs/[slug]`(열람 권한 없으면 404, `noindex`), `app/sitemap.ts`(항상 제외), 패키지·가이드·대시보드, `lib/programs/visibleCategories.ts`.
- DB: `supabase/migrations/0058_internal_category_viewers.sql` — `profiles.can_view_internal` + 보호 트리거 + 시험 계정 지정 + `rea` 비공개.
- 한계: `programs` 표는 RLS상 활성 프로그램을 누구나 읽을 수 있어(정책 `programs_select_active`), 공개 키로 API를 직접 부르면 REA 프로그램의 이름·주소 같은 기본 정보는 보일 수 있다. 화면·검색 노출은 막혀 있다. 완전히 막으려면 RLS를 바꿔야 하며(다른 프로그램 영향 점검 필요) 주인님 결정 대기.
  - **결정(2026-11-11 주인님 「막기」)**: RLS까지 막는다 — 비공개 카테고리(`categories.is_public = false`) 프로그램은 관리자·`can_view_internal` 계정만 `programs`를 읽게. 다른 프로그램 목록·하위 도메인 접근 판정(`createAdminClient()` 사용 부분은 영향 없음) 점검 후 마이그레이션·배포는 REA 담당 세션이 진행, **첫 REA 프로그램 등록 전에 끝낸다.** 같은 날 화면 확인(ego lite): 비로그인 `/programs/category/rea` 404, 시험 계정 「REA (내부)」 표시·프로그램 0개, `/library` 정상(자료 185개).
  - **적용 완료(2026-11-11, 세션 `claude-win-rea`)**: `supabase/migrations/0062_internal_category_rls.sql` 운영 적용 — `categories_select_all` = 공개 또는 `member_can_view_internal()`, `programs_select_active` = 켜짐 그리고 (카테고리 없음·공개 카테고리·열람 계정). 함수 `member_can_view_internal()`·`category_is_internal(uuid)`(security definer). 관리자 전체 권한 정책은 그대로. 확인: 공개 키 프로그램 78(그대로)·카테고리 22→20(REA·백업 숨김), 흉내 조회 시험 계정 REA 1·카테고리 22 / 일반 회원 0·20 / 관리자 1·22·프로그램 101, 운영 화면 공개 카테고리 200·REA 비로그인 404. **이제 위 「한계」는 해소됨** — 공개 키 API로도 REA 카테고리·프로그램이 보이지 않는다.

## 4. REA에 프로그램을 등록할 때 (모든 CLI 공통 체크리스트)
1. 폴더는 다른 프로그램과 같이 `AIMaster/<이름>/`(확장은 `<이름>/extension/`). 분석 원본 파일은 `D:\PDS\Program_dev`에 두고 실행하지 않는다(핵심 원칙 21).
2. `programs` 등록 시 `category_id` = REA, `badges`에 `free`·`premium`을 달지 않는다(달아도 내부 규칙이 먼저 막지만 혼동 방지). 요금제는 만들지 않아도 된다. 상세 소개(`description`)는 짧게 「분석 대상·목적」만.
3. 하위 프로그램 자체의 `lib/access.ts`(`requireProgramAccess`·`checkProgramAccessApi`)도 **관리자 또는 `can_view_internal`만 허용**하도록 만든다 — 메인 사이트가 숨겨도 하위 도메인 주소로 직접 들어올 수 있기 때문이다. 판정 표는 `createAdminClient()`로 읽는다(핵심 원칙 6).
4. 하위 프로그램에 검색 차단: `app/layout.tsx` 메타데이터 `robots: { index: false, follow: false }` + `app/robots.ts`에서 전체 `disallow`.
5. 외부 원본을 다룰 때는 CLAUDE.md 최상위 「외부 소스 분석·이식 규칙」(라이선스 확인 → 기능 전부 목록 → AIMaster 기존 기능과 비교 → 플랜에서 주인님 결정)과 핵심 원칙 21(상용 원본은 코드 복사 금지, 기능·동작만)을 그대로 따른다. **REA가 비공개라고 해서 남의 상용 코드를 그대로 옮겨도 된다는 뜻이 아니다.**
6. 분석 결과는 [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md)에 카드로 남기고, 응용·병합 대상 회원 프로그램의 `docs/IMPROVEMENTS.md`에 연결한다.
7. API 키: 관리자·시험 계정 본인 키(`user_api_keys`)만 쓴다(최상위 규칙 그대로). 개발·시험은 Claude API 크레딧 우선([`CLAUDE_CODE_API_CREDIT.md`](CLAUDE_CODE_API_CREDIT.md)).

## 5. 데이터 보관
- REA 프로그램은 관리자·시험 계정만 쓰므로, 두 계정의 30일 자동 삭제 열외(`profiles.retention_exempt`)에 따라 **REA 분석 자료는 무기한 보관**된다. 그래도 프로그램의 30일 정리 코드는 다른 프로그램과 같은 방식(열외 계정 제외)으로 만들어 둔다 — 나중에 열람 계정이 늘어날 수 있기 때문이다.

## 6. 내부 열람 계정 기록
| 날짜 | 계정 | 변경 | 근거 |
|---|---|---|---|
| 2026-11-11 | `buylifemall@naver.com` (시험 계정) | `can_view_internal = true` | 주인님 지시, 마이그레이션 0058 |
| (관리자) | `buylifemall@gmail.com` | `is_admin`으로 항상 허용 | — |

## 7. 점검
- 비로그인으로 `https://www.buylife.xyz/programs/category/rea` → 404, `/programs` 목록에 REA 없음, `/sitemap.xml`에 REA 프로그램 없음.
- 관리자·시험 계정 로그인 → 목록·카테고리 바에 REA 보임.
- DB: `select slug, is_public from categories where is_public = false;` · `select count(*) from profiles where can_view_internal;`(=1)
