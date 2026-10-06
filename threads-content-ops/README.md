# Threads 콘텐츠 운영 자동화

> AIMaster 프로그램 slug: `threads-content-ops` · 현재 버전: `v1.22`

## v1.22 운영 대기열·YouTube 소재 확장

- 원본 `threads-auto`와 영상의 YouTube 소재 수집 흐름을 웹에 맞게 옮겼습니다. 회원이 등록한 YouTube Data API 키로 공개 동영상의 제목·설명만 가져와 소재 입력란을 채우며, AI 호출과 Threads 발행은 회원이 각각 명시적으로 누를 때만 이뤄집니다.
- 기존 `tco_posts`의 상태값을 활용해 초안 → 예약 대기 → 취소/검토 대기, 발행 실패 → 재검토·재시도 대기열을 구현했습니다. 모든 전환은 현재 회원의 `user_id`와 프로그램 이용 권한을 서버에서 다시 확인합니다.
- 예약의 실제 무인 실행 워커는 Vercel Cron 보안 비밀값과 실행 간격을 별도 설정한 뒤 연결합니다. 현재 화면은 예약을 안전하게 보관·취소하는 단계이며, 자동 발행을 사실처럼 표시하지 않습니다.

## 목적

별도 PC 프로그램 설치 없이 AIMaster 웹에서 개인 Threads 계정을 연결하고, 이후 AI 초안 생성·검토·명시적 발행·예약을 처리하는 회원별 콘텐츠 운영 프로그램입니다.

## 현재 실제 동작 범위 (v1.17)

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

## v1.21 연결 해제 실제 색상 일치

- 참조 화면 픽셀을 확인해 연결 해제 버튼 기본색을 `#e7000b`로 고정했습니다. 이전 Tailwind 기본 red-600과의 색상 차이를 제거했습니다.

## v1.20 연결 해제 버튼 스타일

- Threads 계정 연결 해제 버튼의 기본·호버·비활성 색상과 크기를 `threads-affiliate-poster`의 danger 버튼(`bg-red-600`, `hover:bg-red-500`, `disabled:bg-red-300`)과 동일하게 맞췄습니다.

## v1.19 Meta OAuth 리디렉션 URI

- Threads OAuth 요청과 토큰 교환은 모두 `https://www.buylife.xyz/api/threads-content-ops/callback`만 사용합니다. 배포 별칭이나 환경값에 따라 서로 다른 주소를 보내지 않습니다.
- Meta 앱 대시보드의 **사용 사례 → Threads API 액세스 → 설정 → 유효한 OAuth 리디렉션 URI**에 위 주소를 정확히 추가해야 합니다. Webhook 또는 Facebook 로그인 URI 칸은 대상이 아닙니다.
- 앱이 Development 모드면 **역할** 메뉴에서 연결할 Threads 계정을 Tester로 추가해야 합니다.

## v1.18 연동값 관리 화면

- 등록된 API 키와 Threads 앱 자격증명은 실제 원문을 다시 노출하지 않고 앞·뒤 일부만 마스킹해 표시합니다.
- 각 값은 등록 뒤 수정과 삭제를 개별로 실행할 수 있습니다. 삭제·계정 연결 해제 모두 본인 user_id 행만 대상으로 하며, 실행 전 확인창을 표시합니다.
- 연결된 Threads 계정은 사용자명과 토큰 만료 시각을 보이고, 연결 해제는 계정 연결 레코드만 삭제합니다. 이미 저장한 초안과 발행 이력은 남습니다.

## v1.16 설정 화면

- `threads-affiliate-poster`의 설정 화면 포맷과 같이 플랫폼별 회색 섹션을 사용합니다.
- OpenAI는 `AI 콘텐츠 생성` 섹션에 분리하고, Threads·YouTube·쿠팡 키는 각 플랫폼 섹션에서 개별 저장합니다.
- 저장된 비밀값은 다시 표시하지 않고 `등록됨` 상태만 표시합니다. Threads 연결 상태와 연동 매뉴얼도 화면 하단에서 확인합니다.

## 참고 원본

`desktop/`은 사용자가 지정한 외부 Electron 원본의 참고 사본입니다. 이 웹 서비스의 실행 경로가 아니며, 설치형 프로그램·기기 토큰 방식으로 확장하지 않습니다.
