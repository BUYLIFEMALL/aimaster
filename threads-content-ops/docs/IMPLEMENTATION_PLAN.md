# AIMaster 편입 구현 계획

## 1단계 — 기반 편입

원본 Electron 앱을 `desktop/`으로 독립 편입했다. 이 단계에서는 외부 계정 연결·게시·API 키 호출을 실행하지 않는다.

2026-10-05 기준선 검증 결과:

- Node.js `v24.20.0`으로 원본 요구사항(Node.js 24.15 이상)을 충족했다.
- `npm.cmd ci --ignore-scripts`로 네이티브 설치 스크립트를 실행하지 않고 의존성을 감사했다.
- `npm.cmd run typecheck`, `npm.cmd run lint`는 통과했다.
- `npm.cmd test`는 테스트 파일이 없어 종료 코드 1로 끝났다. 테스트가 통과한 것이 아니므로, AIMaster 전환 코드에는 새 테스트를 추가해야 한다.
- 의존성 감사는 37건(critical 1건 포함)의 취약점 경고를 냈다. 설치 파일 생성 전에 잠금 파일을 검토·업데이트하고 같은 검증을 다시 실행한다.

완료 기준:

- 새 폴더만 변경한다.
- 원본의 의존성과 네이티브 구성요소를 목록화한다.
- 제품 범위와 AIMaster 통합 방식을 확정한다.

## 2단계 — AIMaster 활성화 연결

루트 AIMaster에 아래를 새로 구현한다. 기존 자동화 프로그램의 route나 UI를 수정하지 않고, `threads-content-ops` 전용 경로와 구성요소를 만든다.

진행 현황(2026-10-05): `app/(dashboard)/threads-content-ops` 전용 대시보드와 기기별 연동 토큰 발급/폐기 액션, `GET /api/threads-content-ops/whoami` 토큰 검증 API를 추가했다. 모든 쓰기·검증 경로는 `threads-content-ops` 이용 권한을 다시 확인하며, 페이지와 route에는 동적 렌더링·무캐시 선언을 넣었다. 프로그램 DB 등록 전에는 권한 판정으로 접근이 막히는 것이 정상이다.

운영 DB 등록 완료(2026-10-05): `programs`에 `threads-content-ops`(id `b94cf8ad-edaf-4878-9889-ab196e6450aa`, version `v1.01`)를 만들고 기본 1/2/3개월 요금제를 등록했다. 설치 파일과 MVP가 준비되기 전까지 `is_active=false`를 유지한다. 재현 가능한 SQL은 `supabase/migrations/0001_register_threads_content_ops.sql`에 남겼다.

1. 프로그램 상세/다운로드/개인 액세스 토큰 페이지
2. `personal_access_tokens` 기반의 `threads-content-ops` 전용 토큰 검증 API
3. 이용권한 미보유 시 JSON 403 응답 및 구매 화면 안내
4. 데스크톱 앱의 토큰 붙여넣기, 상태 확인, 로그아웃/토큰 폐기

## 3단계 — 안전한 MVP

- 회원별 AI 키를 서버에서만 해석하는 초안 생성 API
- 회원별 Threads 앱 ID/Secret OAuth 연결
- 단일 계정, 수동 초안 검토, 공식 API 수동 발행
- 로컬 SQLite에만 저장하는 초안·실행 이력
- 토큰·게시 오류의 민감값 마스킹

## 4단계 — 운영 자동화

- 다계정 프로필과 예약 슬롯
- 예약 실행 시점의 권한·토큰 만료 재확인
- 예약 기본 OFF, 재실행 후 자동화 OFF, 중복 발행 방지 및 원격 결과 조정
- 공식 API 기반 게시 이력·성과 조회

## 5단계 — 선택 기능 심사

YouTube/RSS, 쿠팡/네이버 상품, Chrome 확장, Native Messaging은 각각 독립 검토한다. 각 기능은 서비스 약관, 최소 권한, 제휴 문구, 수집 범위, 사용자의 명시적 선택을 충족하기 전까지 제품 UI에서 비활성화한다.

## 출시 전 체크포인트

- 원본 저작물의 상업적 이용·변경·재배포 권한 확인
- `programs` 및 3단계 기본 `pricing_plans` 등록
- `APP_VERSION`과 DB 버전 `v1.01` 일치
- API route의 entitlement/dynamic/no-store 검증
- Windows 설치 파일·업데이트 방식·서명 여부 검토
- 사용자용 API키등록·플랫폼연동 매뉴얼 및 플랫폼 가이드 등록
