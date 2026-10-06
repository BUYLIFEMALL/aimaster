# Threads 콘텐츠 운영 자동화 — 작업 인수인계

현재 버전은 `v1.31`입니다. 이 폴더는 AIMaster 웹 안에서 동작하는 `threads-content-ops` 전용 작업 공간입니다. (실제 화면·서버 동작 코드는 루트 `app/(dashboard)/threads-content-ops/`에 있고, 배포는 저장소 루트에서 합니다.)

> Claude를 포함한 다음 작업 에이전트는 먼저 [`docs/CLAUDE_CONTINUATION.md`](docs/CLAUDE_CONTINUATION.md)를 읽습니다. v1.17부터 v1.27까지의 구현 순서, 다음 기능 우선순위, 흰색 UI·멀티테넌시·배포 주의사항을 한곳에 정리했습니다.

## v1.31 검은 버튼 글자가 안 보이던 문제 수정 (2026-10-06)

- 증상: 콘텐츠 소스 화면의 `상품 검색`·`소스로 저장`·`소스 등록`·`수정 저장` 버튼과 계정 운영정보의 `운영정보 저장` 버튼이 검은 배경에 글자가 안 보였다(주인님 스크린샷). 설정 화면의 파란/빨간 버튼도 흰색이어야 할 글자가 어두운색이었다.
- 원인: 이 화면은 `app/globals.css`의 `.threads-content-ops-light .text-white { color: #171717 }`(옛 다크 테마 카드의 흰 글자를 흰 화면에서 읽히게 하려는 규칙) 범위 안에 있다. 버튼이 `bg-neutral-900 text-white`면 이 규칙이 글자를 어두운색으로 바꿔 검은 배경 위에서 사라진다. 처음 시도한 `!text-white`도 소용없었다 — Tailwind가 `@layer` 안의 `.text-white` 규칙을 `!text-white`용으로도 자동 생성(`!important` 포함, 더 높은 우선순위)해서 다시 덮였다(서버가 만든 CSS를 직접 열어 확인).
- 해결: 진한 배경(`bg-neutral-900`·`bg-sky-600`·`bg-[#e7000b]`) 위 글자는 `text-white` 대신 **`text-[#ffffff]`**를 쓴다. 이 값은 범위 규칙이 건드리지 않는 일반 클래스라 항상 흰색이다. 7개 버튼에 적용(`AccountOperations.tsx` 1, `SourceQueue.tsx` 4, `WebSetup.tsx` 2).
- **새 버튼을 만들 때:** 이 프로그램 화면에서 진한 배경 버튼에 `text-white`를 쓰지 말고 `text-[#ffffff]`를 쓴다. 글자색 때문에 `globals.css`의 범위 규칙을 고치지는 않는다(다른 화면 영향).

## v1.30 쿠팡 파트너스 상품 검색 → 소스 저장 (2026-10-06)

- 다음 구현 우선순위 2번. `콘텐츠 소스` 탭 맨 위에 **쿠팡 파트너스 상품 검색** 패널을 추가했다. 회원 본인의 `coupang_access_key`/`coupang_secret_key`(공용 `user_api_keys`, 쇼핑제휴 자동화와 같은 항목이라 한 번 등록하면 두 프로그램이 같이 씀)로 검색하고, 결과 카드(사진·이름·가격·로켓/무료배송)에서 **고른 상품만** `tco_content_sources`에 `source_type='coupang'`으로 저장한다. 검색 결과 자체는 저장하지 않는다.
- **구현 출처:** `threads-affiliate-poster/src/lib/coupang/{client,links}.ts`(2026-09-11 실계정 실호출 검증)의 서명·엔드포인트·오류 해석을 `threads-content-ops/lib/coupang.ts`로 **복사**했다(다른 프로그램의 `@/` 별칭이 루트와 달라 직접 import 불가). 규격이 바뀌면 두 곳을 같이 고칠 것. 서명은 `signedDate+method+path+query`(path와 query 사이에 `?` 없음)이며 모의 테스트에서 재계산 값과 일치함을 확인했다.
- **운영자 키 사용 없음:** 키는 로그인한 회원의 `user_api_keys` 행만 읽는다. 키가 없으면 검색 버튼을 막고 `API키등록·플랫폼연동` 안내만 보인다(예시 상품 없음).
- **알려진 제약(쿠팡 쪽):** 검색은 키워드당 10개·시간당 10회, API 키는 쿠팡 파트너스 **누적 매출 15만원 이후**에 활성화(`401 Specified key is not registered` = 정상 대기 상태). 이 문구들을 화면 안내로 옮겼다. 키가 활성화되기 전에는 파트너스 사이트에서 만든 링크를 `새 소스 등록`에 직접 붙여넣는다.
- **제휴 링크 검사(`checkCoupangAffiliateLink`):** 쿠팡 종류 소스는 수수료가 잡히는 추적 링크(`link.coupang.com/...` 또는 `lptag=AF…`)만 저장·수정할 수 있다. 일반 쇼핑 주소(`www.coupang.com/vp/products/…`)는 수수료 0이라 거부한다(v1.28에서는 막지 않았던 동작 변경). 상품 사진은 `https://*.coupangcdn.com`만 저장·표시한다.
- **미리보기 링크 주의:** 검색 결과의 `productUrl`은 본인 제휴 추적 링크라 열면 제휴 클릭으로 잡힐 수 있어, 화면의 `상품 페이지`는 일반 주소 `https://www.coupang.com/vp/products/{productId}`로 연다(쇼핑제휴 자동화 README와 같은 규칙).
- 저장 시 `metadata`에 `{ via: "coupang_search", productId, price, imageUrl, isRocket, isFreeShipping, savedAt }`를 담고 소스 목록에 사진·가격을 보여준다.
- 루트 `lib/apiKeys.ts`의 `ApiKeyProvider` 타입에 `youtube_api_key`/`coupang_access_key`/`coupang_secret_key`를 추가했다(v1.28에서 기록한 `tsc` 오류 해소, 기존 값·동작 변경 없음).
- DB 스키마 변경 없음. **실제 쿠팡 키로 검색해 본 확인은 아직 못 했다**(회원 키 필요 — 모의 응답으로 서명·해석·오류 안내·링크 검사만 검증).

## v1.29 대시보드 두 칸 배치 수정 (2026-10-06)

- 증상: 대시보드 `운영·API 상태`(왼쪽)와 `실제 작업 진행`(오른쪽) 두 칸에서, 오른쪽의 긴 초안 문장이 칸 폭을 밀어내 왼쪽 칸이 세로로 찌그러지고 오른쪽은 화면 밖으로 넘쳤다(주인님 스크린샷).
- 원인: `grid-cols-[0.85fr_1.15fr]`의 `fr` 열은 기본 최소 폭이 내용 폭(`min-content`)이라 `truncate` 문장이 있어도 열이 늘어난다.
- 해결(`OperationsDashboard.tsx`): 열을 `xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]`로, 두 카드에 `min-w-0`을 추가. 임시 미리보기 페이지에 같은 긴 문장(스크린샷의 MBC 뉴스 초안)을 넣어 1500px 폭에서 두 칸이 균형 있게 나뉘고 문장이 `…`로 줄어드는 것을 눈으로 확인한 뒤 미리보기 파일은 삭제했다. DB 변경 없음.

## v1.28 콘텐츠 소스 큐 UI·등록 (2026-10-06)

- `docs/CLAUDE_CONTINUATION.md`의 다음 구현 우선순위 1번을 구현했다. 사이드바 번호 흐름에 **4. 콘텐츠 소스**(`?tab=sources`)를 추가하고, 회원이 계정별로 **블로그 글 주소·쿠팡 파트너스 상품 링크·네이버 브랜드 커넥트 제휴 링크**를 직접 등록·수정·삭제하며 상태(사용 가능/사용 완료/보관)를 바꿀 수 있다.
- **이번 단계는 입력값 보관만 한다.** 외부 사이트 수집·크롤링·검색 연동은 하지 않고, 쿠팡·네이버 분석 결과를 지어내지 않는다. 대시보드 "즉시 작업" 카드의 블로그/쿠팡/네이버는 실제 등록 건수만 보여주고 `작업 가능`으로 표시하지 않는다(초안 연결은 다음 단계).
- DB 스키마 변경 없음 — v1.27에서 만든 `tco_content_sources`(회원+계정 FK, owner-only RLS 4정책, anon 권한 없음)를 그대로 쓴다. 운영 DB에서 정책·권한·RLS를 다시 조회해 확인했다.
- 서버 동작(`web-actions.ts`의 `createContentSource`/`updateContentSource`/`setContentSourceStatus`/`deleteContentSource`)은 모두 `authorizedUser()`(프로그램 이용 권한) 뒤에 `user_id`로 다시 제한하고, 등록 시 계정이 본인 소유인지 확인한다. 링크는 `http`/`https`만 허용하며 `javascript:`·`data:`·로그인 정보 포함 주소는 거부한다(화면에 `href`로 렌더링하기 때문). 같은 계정에 같은 링크 중복 등록 금지, 회원당 최대 200건.
- **예상된 오류는 throw하지 않고 `{ ok, error }`로 반환**한다(운영 서버는 Server Action의 throw 메시지를 가려서 안내 문구가 안 보이기 때문 — v1.24와 같은 원칙). 새 서버 동작도 이 방식을 따른다.
- 알려진 기존 이슈(이번 작업 범위 밖): `web-actions.ts`의 `resolveApiKey(supabase, user.id, "youtube_api_key")`가 루트 `lib/apiKeys`의 `ApiKeyProvider` 타입에 없어 `tsc`에서 오류가 난다. 루트 앱이 `typescript.ignoreBuildErrors`라 빌드는 통과하고 런타임 값은 정상이다. 루트 `lib/apiKeys` 타입을 넓히는 별도 작업으로 처리.

## v1.27 계정별 운영정보·회원별 데이터 기반

- 운영 DB에 `tco_operation_profiles`, `tco_content_sources`를 적용했다. 두 테이블은 `user_id`와 계정 FK를 가지며 RLS를 활성화하고, authenticated 역할에 대해서도 select/insert/update/delete 각각 `(select auth.uid()) = user_id`만 허용한다. anon 권한은 회수했다.
- `?tab=accounts`의 세 번째 번호형 흐름인 **계정 운영정보**에서 계정별 주제·성격·말투·대상 독자·금지 주제/표현·일상/홍보 비율·하루 목표·댓글 확인 주기·운영 시간·자동화 사용 선호를 실제로 저장한다.
- `automation_enabled`는 발행 권한이 아니라 회원의 선호 설정이다. 무인 실행 워커와 안전한 스케줄 정책이 구현되기 전에는 어떤 게시도 자동으로 시작하지 않는다.
- 콘텐츠 소스 큐는 다음 단계(블로그·쿠팡·네이버 브랜드 커넥트 실제 수집/등록)에 사용할 공통 회원별 기반이다. 아직 외부 결과나 성과를 임의로 생성하지 않는다.

## v1.26 웹 운영 대시보드 1단계

- AIMaster 웹 서브프로그램 표준에 따라 **흰색 배경·중성 회색 경계·어두운 본문 글자**를 유지한다. 원본 Electron의 다크 화면은 기능 흐름 참고용이며 웹 작업 화면의 색상 기준이 아니다.
- 대시보드는 실제 `tco_threads_accounts`, `tco_posts`, 회원 본인 `user_api_keys` 등록 상태만 집계한다. 계정·초안·예약·발행·실패 기록이 없으면 0 또는 안내 상태를 보이며, 가짜 성과·작업 로그·상품을 표시하지 않는다.
- 원본의 운영 구조를 웹형으로 옮겼다: 현재 운영 계정, 누적 게시/초안/실패/예약 지표, 즉시 작업 소스, 운영·API 상태, 실제 작업 이력, 예약 작업 목록. 일상·YouTube 외 블로그·쿠팡·네이버 브랜드 커넥트는 해당 회원별 소스 테이블과 실제 API 로직이 생기기 전까지 `설정·구현 필요`로 표시한다.
- 다음 구현 단계는 계정별 운영 프로필·소스 큐·댓글·성과 이력 테이블과 owner-only RLS이다. 이는 DB 스키마 변경이므로 별도 승인 뒤 마이그레이션으로 진행한다.

## v1.25 OpenAI 응답 호환

- Responses API가 `output_text` 대신 `output[].content[].text`에 본문을 주는 경우도 읽는다. 401/403, 429, 빈 응답을 구분한 안내 문구를 반환한다.

## v1.24 예상된 생성 오류

- `generateAndSaveDraft()`는 OpenAI/API 키 오류를 throw하지 않고 `{ ok, error }` 결과로 반환한다. 클라이언트는 오류 경계 대신 화면 메시지로 표시한다.

## v1.23 복수 계정 연결

- `WebSetup`은 `tco_threads_accounts`의 모든 본인 계정을 표시하고 OAuth로 계정을 추가 연결할 수 있습니다. `disconnectThreadsAccount(accountId)`는 `user_id`와 `id`를 동시에 제한해 계정별로만 제거합니다.

## v1.22 운영 대기열과 YouTube 소재

- 원본 `threads-auto`/영상의 YouTube 공개 메타데이터 소재 흐름을 웹형으로 옮겼습니다. `loadYouTubeSource()`는 현재 회원 권한과 본인 `youtube_api_key`를 확인한 뒤 공개 제목·설명만 읽고, 1,200자 이내의 초안 소재로 돌려줍니다.
- `tco_posts` 기존 상태를 이용해 `draft → scheduled → draft`(예약/취소), `failed → draft`(재검토)를 서버 액션으로 구현했습니다. 모든 mutation에는 `user_id`, 현재 상태 조건, `checkProgramAccess()`가 함께 적용됩니다.
- 예약 시간은 5분 후~180일 이내만 허용합니다. 아직 Vercel Cron 보안 비밀값과 요금제 실행 간격이 확인되지 않았으므로 예약 무인 발행은 켜지지 않았으며, UI도 이를 자동 실행이라고 표시하지 않습니다.

## 절대 규칙

- 기존 `threads/`, `threads-comment-reply/`, `threads-affiliate-poster/`, `threads-easy-planner/`는 참고만 하고 수정하지 않습니다.
- 이 프로그램은 **웹 전용**입니다. `desktop/`은 외부 원본 참고 사본일 뿐 배포 대상이 아닙니다.
- 모든 웹 작업 화면은 AIMaster 공통 규칙대로 흰색 베이스를 사용한다. 메인 사이트·원본 설치형 앱의 다크 테마를 웹 작업 화면에 적용하지 않는다.
- 모든 회원은 자신의 OpenAI API 키와 자신이 만든 Meta Developers Threads 앱 ID/시크릿만 사용합니다. 운영자 키·공용 Meta 앱·다른 회원 토큰으로 폴백하지 않습니다.
- 계정·초안·예약·발행 이력에는 반드시 `user_id`를 두고 RLS owner-only 정책을 적용합니다.
- 페이지, Server Action, API 콜백 모두 `checkProgramAccess()` 또는 API용 권한 검사로 프로그램 이용 권한까지 확인합니다. 로그인만 확인해서는 안 됩니다.
- 권한이 관여하는 `page.tsx`/`route.ts`에는 `dynamic = "force-dynamic"`와 `fetchCache = "force-no-store"`를 함께 둡니다.
- 자동 발행과 예약은 기본 OFF입니다. 회원이 웹에서 명시적으로 실행 또는 예약한 경우에만 처리합니다.

## v1.21 완료 사항

- 쇼핑제휴 설정 화면 스크린샷의 연결 해제 버튼 중심 실제 색상 `#e7000b`을 콘텐츠 운영 화면에 그대로 적용한다. 일반 Tailwind 색상 이름만 맞추지 않는다.

## v1.20 완료 사항

- Threads 계정 연결 해제는 쇼핑제휴 자동화 `Button`의 danger variant와 동일한 `bg-red-600` / hover `bg-red-500` / disabled `bg-red-300` 스타일을 쓴다.

## v1.19 완료 사항

- Meta 오류 1349168(화이트리스트에 없는 redirect URI)을 막기 위해 `lib/oauth.ts`에 프로덕션 콜백 주소를 단일 상수로 뒀다. OAuth 시작, 코드 교환, 화면 안내가 같은 주소를 쓴다.
- 설정 화면은 쇼핑제휴 자동화와 같은 안내 흐름으로, Threads API 액세스 설정의 유효한 OAuth 리디렉션 URI 칸과 Development 모드 Tester 역할 등록을 명시한다.

## v1.18 완료 사항

- 설정 화면은 참조 프로그램의 등록 행 형식에 맞춰, 저장된 값은 마스킹 값 + 등록됨 + 수정/삭제만 보입니다. 새 값을 입력할 때만 비밀번호 입력칸이 열립니다.
- deleteMemberCredential과 disconnectThreadsAccount는 checkProgramAccess 뒤 현재 로그인한 회원의 user_id로 다시 제한합니다. 계정 연결 해제는 tco_threads_accounts만 지우고 tco_posts 이력은 보존합니다.
- 화면에 계정 사용자명, 토큰 만료 시각, 연결 해제 버튼을 표시합니다. 앱 ID·시크릿·OpenAI·YouTube·쿠팡 키는 각각 개별 수정/삭제할 수 있습니다.

## v1.17 완료 사항

- `threads-affiliate-poster` 설정 UI를 기준으로 플랫폼별 회색 섹션, API 키별 개별 저장, 등록됨/미등록 상태, Threads 연결 상태, 하단 연동 매뉴얼을 사용한다. 저장값은 화면에 재노출하지 않는다.
- 등록된 키 행의 비활성 저장 버튼은 `교체 입력 필요`, 미등록 행은 `값 입력 필요`로 표시한다. 새 값 입력 즉시 `저장`으로 바뀐다.
- 회원별 Threads 앱 자격증명 저장 Server Action과 Meta OAuth 시작 화면을 구현했습니다.
- OAuth `state`는 사용자 ID가 아니라 HTTP 전용·10분 만료 난수 쿠키로 검증합니다.
- 콜백은 코드 교환 뒤 장기 토큰으로 교환하고, Threads 프로필과 토큰 만료시각을 `tco_threads_accounts`에 회원별로 저장합니다.
- `0005_web_multitenancy.sql`의 `tco_threads_accounts`/`tco_posts`는 RLS owner-only입니다.
- 연결 계정 선택·주제 입력으로 회원 본인의 OpenAI 키를 호출해 초안을 생성하고, `tco_posts`에 `draft`로 저장합니다. 클릭 전에는 AI 호출이 발생하지 않습니다.
- 기본 진입 화면은 설정 폼이 아닌 웹 운영 대시보드입니다. 계정·초안·발행 이력·운영 상태를 표시하고, 연결 설정은 접힌 보조 영역에서만 엽니다.
- 다른 자동화 프로그램과 같은 좌측 흐름 메뉴를 추가했습니다: 대시보드, 콘텐츠 작성, 초안·발행 관리, API키등록·플랫폼연동. 각 메뉴는 `?tab=`으로 웹 작업 영역을 전환합니다.
- `docs/SIDEBAR_LAYOUT_STANDARD.md`를 따라 `/threads-content-ops`에서는 AIMaster 공용 사이드바를 숨기고, 화면 가장자리의 고정 프로그램 전용 사이드바 하나만 표시합니다. 하단에는 로그인 계정·로그아웃을 둡니다.
- 과거 다크 토큰 안내는 폐기한다. 프로그램 작업 화면은 `bg-white` 기반, 중성 회색 경계, 어두운 본문 글자로 유지한다. 다크 톤은 루트 메인 페이지와 설치형 원본 참고 화면에만 해당한다.
- `API키등록·플랫폼연동`은 업무 흐름 메뉴 바로 아래 유틸리티 영역에 둔다. 하단 고정 영역은 로그인 계정과 로그아웃만 둔다.
- 로그인 이메일과 로그아웃도 API키등록·플랫폼연동 바로 아래에 이어 붙인다. 사이드바 하단에 별도 고정하지 않는다.
- `threads-content-ops` 작업 화면은 `threads`·`threads-affiliate-poster`와 동일한 흰색 배경, 중성 회색 경계, 어두운 본문 글자 구조를 사용한다. 루트 AIMaster의 다크 테마를 이 프로그램 화면에 억지로 적용하지 않는다.

## 다음 단계

1. `docs/CLAUDE_CONTINUATION.md`의 순서대로 회원별 콘텐츠 소스 큐 UI·등록부터 구현한다.
2. 초안 검토·수정 후 명시적 1회 발행을 Threads 공식 API로 구현하고 실제 테스트 계정으로 검증한다.
3. 예약은 명시적 opt-in, 취소, 실행 이력, 실패 재시도 정책을 포함해 별도 단계로 구현한다.

작업 완료 시 루트 정책대로 빌드, 선택적 git add, 커밋, 푸시, `vercel deploy --prod --yes --scope buylife`, 문서 갱신까지 한 작업 세트로 끝냅니다.
