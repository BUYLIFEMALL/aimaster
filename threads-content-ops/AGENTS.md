# Threads 콘텐츠 운영 자동화 — 작업 인수인계

현재 버전은 `v1.26`입니다. 이 폴더는 AIMaster 웹 안에서 동작하는 `threads-content-ops` 전용 작업 공간입니다.

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
- 배경은 AIMaster 다크 토큰으로 고정했다: 본문 `bg-dark`(`#0a0a0f`), 좌측 바 `bg-dark-50`(`#12121a`), 경계 `border-dark-200`(`#222232`). 카드만 그 위 단계로 표시한다.
- `API키등록·플랫폼연동`은 업무 흐름 메뉴 바로 아래 유틸리티 영역에 둔다. 하단 고정 영역은 로그인 계정과 로그아웃만 둔다.
- 로그인 이메일과 로그아웃도 API키등록·플랫폼연동 바로 아래에 이어 붙인다. 사이드바 하단에 별도 고정하지 않는다.
- `threads-content-ops` 작업 화면은 `threads`·`threads-affiliate-poster`와 동일한 흰색 배경, 중성 회색 경계, 어두운 본문 글자 구조를 사용한다. 루트 AIMaster의 다크 테마를 이 프로그램 화면에 억지로 적용하지 않는다.

## 다음 단계

1. 초안 검토·수정 후 명시적 1회 발행을 Threads 공식 API로 구현하고 실제 테스트 계정으로 검증한다.
2. 예약은 명시적 opt-in, 취소, 실행 이력, 실패 재시도 정책을 포함해 별도 단계로 구현한다.

작업 완료 시 루트 정책대로 빌드, 선택적 git add, 커밋, 푸시, `vercel deploy --prod --yes --scope buylife`, 문서 갱신까지 한 작업 세트로 끝냅니다.
