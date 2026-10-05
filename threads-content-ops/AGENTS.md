# Threads 콘텐츠 운영 자동화 — 작업 인수인계

현재 버전은 `v1.09`입니다. 이 폴더는 AIMaster 웹 안에서 동작하는 `threads-content-ops` 전용 작업 공간입니다.

## 절대 규칙

- 기존 `threads/`, `threads-comment-reply/`, `threads-affiliate-poster/`, `threads-easy-planner/`는 참고만 하고 수정하지 않습니다.
- 이 프로그램은 **웹 전용**입니다. `desktop/`은 외부 원본 참고 사본일 뿐 배포 대상이 아닙니다.
- 모든 회원은 자신의 OpenAI API 키와 자신이 만든 Meta Developers Threads 앱 ID/시크릿만 사용합니다. 운영자 키·공용 Meta 앱·다른 회원 토큰으로 폴백하지 않습니다.
- 계정·초안·예약·발행 이력에는 반드시 `user_id`를 두고 RLS owner-only 정책을 적용합니다.
- 페이지, Server Action, API 콜백 모두 `checkProgramAccess()` 또는 API용 권한 검사로 프로그램 이용 권한까지 확인합니다. 로그인만 확인해서는 안 됩니다.
- 권한이 관여하는 `page.tsx`/`route.ts`에는 `dynamic = "force-dynamic"`와 `fetchCache = "force-no-store"`를 함께 둡니다.
- 자동 발행과 예약은 기본 OFF입니다. 회원이 웹에서 명시적으로 실행 또는 예약한 경우에만 처리합니다.

## v1.09 완료 사항

- 회원별 Threads 앱 자격증명 저장 Server Action과 Meta OAuth 시작 화면을 구현했습니다.
- OAuth `state`는 사용자 ID가 아니라 HTTP 전용·10분 만료 난수 쿠키로 검증합니다.
- 콜백은 코드 교환 뒤 장기 토큰으로 교환하고, Threads 프로필과 토큰 만료시각을 `tco_threads_accounts`에 회원별로 저장합니다.
- `0005_web_multitenancy.sql`의 `tco_threads_accounts`/`tco_posts`는 RLS owner-only입니다.
- 연결 계정 선택·주제 입력으로 회원 본인의 OpenAI 키를 호출해 초안을 생성하고, `tco_posts`에 `draft`로 저장합니다. 클릭 전에는 AI 호출이 발생하지 않습니다.
- 기본 진입 화면은 설정 폼이 아닌 웹 운영 대시보드입니다. 계정·초안·발행 이력·운영 상태를 표시하고, 연결 설정은 접힌 보조 영역에서만 엽니다.

## 다음 단계

1. 초안 검토·수정 후 명시적 1회 발행을 Threads 공식 API로 구현하고 실제 테스트 계정으로 검증한다.
2. 예약은 명시적 opt-in, 취소, 실행 이력, 실패 재시도 정책을 포함해 별도 단계로 구현한다.

작업 완료 시 루트 정책대로 빌드, 선택적 git add, 커밋, 푸시, `vercel deploy --prod --yes --scope buylife`, 문서 갱신까지 한 작업 세트로 끝냅니다.
