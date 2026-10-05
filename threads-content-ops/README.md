# Threads 콘텐츠 운영 자동화

> AIMaster 프로그램 slug: `threads-content-ops` · 현재 버전: `v1.07`

## 목적

별도 PC 프로그램 설치 없이 AIMaster 웹에서 개인 Threads 계정을 연결하고, 이후 AI 초안 생성·검토·명시적 발행·예약을 처리하는 회원별 콘텐츠 운영 프로그램입니다.

## 현재 실제 동작 범위 (v1.07)

- AIMaster 로그인과 `threads-content-ops` 이용 권한을 확인한 회원만 화면과 연동 기능을 사용할 수 있습니다.
- 회원이 직접 만든 Meta Developers Threads 앱의 `threads_app_id`와 `threads_app_secret`만 저장합니다. 운영자 공용 Meta 앱 또는 공용 API 키는 사용하지 않습니다.
- `https://www.buylife.xyz/api/threads-content-ops/callback` OAuth 콜백으로 Threads 계정을 연결합니다.
- OAuth의 난수 `state`를 HTTP 전용·10분 만료 쿠키로 검증하고, 단기 토큰을 장기 토큰으로 교환한 뒤 서버에서만 저장합니다.
- 연결 계정은 `tco_threads_accounts`, 향후 초안·예약·발행 이력은 `tco_posts`에 `user_id` 기준으로 분리 저장됩니다. 두 테이블은 owner-only RLS를 사용합니다.
- 연결된 계정을 선택해 주제를 입력하면, 회원 본인의 OpenAI API 키로 Threads 초안을 한 번 생성하고 본인 `tco_posts` 초안으로 저장합니다.

아직 초안 편집·발행·예약 화면은 다음 단계입니다. 아직 구현되지 않은 기능을 동작하는 것처럼 표시하거나 자동 발행하지 않습니다.

## 회원 연결 순서

1. Meta Developers에서 회원 본인 명의의 Threads 앱을 만듭니다.
2. 앱의 유효 OAuth 리디렉션 URI에 `https://www.buylife.xyz/api/threads-content-ops/callback`을 등록합니다.
3. AIMaster `/threads-content-ops`에서 OpenAI 키(초안 단계용), Threads 앱 ID, 앱 시크릿을 저장합니다.
4. **내 Threads 계정 연결하기**를 눌러 Meta 인증을 완료합니다.

개발 모드 Meta 앱은 해당 회원이 앱 역할(관리자/개발자/테스터)에 등록돼 있어야 인증됩니다. 각 회원이 만든 앱만 쓰므로 다른 회원의 권한이나 토큰이 섞이지 않습니다.

## 개발 규칙

- 기존 `threads/`, `threads-comment-reply/`, `threads-affiliate-poster/`, `threads-easy-planner/`는 수정하지 않습니다.
- 모든 쓰기 API와 Server Action은 로그인뿐 아니라 프로그램 이용 권한도 재확인합니다.
- 새 API/권한 페이지는 `dynamic = "force-dynamic"`, `fetchCache = "force-no-store"`를 함께 선언합니다.
- 자동 발행·예약은 기본 OFF이며, 회원이 웹에서 명시적으로 지시한 경우에만 실행합니다.
- 버전을 바꾸면 `lib/version.ts`, `programs.version`, 이 문서와 `docs/HANDOFF.md`를 같은 작업에서 맞춥니다.

## 참고 원본

`desktop/`은 사용자가 지정한 외부 Electron 원본의 참고 사본입니다. 이 웹 서비스의 실행 경로가 아니며, 설치형 프로그램·기기 토큰 방식으로 확장하지 않습니다.
