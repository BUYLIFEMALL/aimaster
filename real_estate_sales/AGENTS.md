# 부동산 실거래 투자분석 자동화 (`real_estate_sales/`, slug `real-estate-sales`) — 작업 지침

- 먼저 루트 `CLAUDE.md`·`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`, 이 폴더의 [README.md](README.md)(아키텍처·환경변수·배포)와 [docs/CHANGELOG.md](docs/CHANGELOG.md)를 읽는다.
- 라이브: https://real-estate-sales.buylife.xyz · Next.js 16 + Tailwind v4 · Vercel 서울 리전 고정(`vercel.json` `regions: ["icn1"]`, 공공 API 국내 IP 전용).
- 권한: 레이아웃·서버 액션 모두 `requireProgramAccess()`, 예약 수집 API는 `CRON_SECRET`. AI 키는 회원 본인 것만(폴백 없음). 공공데이터 키는 운영자 공용(최상위 규칙 예외 §8).

## 디자인 리뉴얼 — v1.11 (2026-10-17, Claude Code 맥미니, 주인님 승인 후 구현)
- 적용 템플릿: **스마트 매트릭스 스타일(다크 슬레이트)** — [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md) · 플랜 [docs/PLAN_20261017_DESIGN_RENEWAL.md](docs/PLAN_20261017_DESIGN_RENEWAL.md) · 개선 원장 [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) · 인수인계 [docs/IMPROVEMENT_HANDOFF_20261017.md](docs/IMPROVEMENT_HANDOFF_20261017.md)
- 다크 토큰(옛 `gold`·`dark-*` 이름은 재연결), 사이드바 ☰·📖, 대시보드 지표·연결 상태, 실거래 목록 매트릭스(검색·자치구·정렬·표/카드), 상세 지표·매력도 막대, `/guide` 신설, 로그인까지 다크(원칙 13). 서버 로직 변경 없음.
- **Windows 빌드·배포·무료 화면 검수 완료(v1.11, 소스 `156bb4ad`, 2026-10-17).** 운영 DB v1.11, 서울 icn1·Cron 유지. 실제 Edge 로컬9/운영9·합성9 통과, 유료0. 상세 운영 방문은 제외. 증거·남은 일은 위 인수인계의 최신 완료 절을 읽습니다.

## Windows 인수 주의 — 실제 상세 방문 전 확인

`/listings/[id]`는 GET 서버 렌더 중 본인 키로 자동 AI 분석할 수 있습니다. 무료 검수는 실제 상세/미리읽기를 차단한 tests/runtime.mjs와 합성 tests/fixtures.mjs를 분리해 실행합니다. 앱 인증·DB·분석을 검수용 모의 코드로 바꾸지 않습니다. 본인 Perplexity 생성 캐시는 운영 user_id 없는 전역 구조(#10)로 최상위 데이터 격리 지침과 충돌합니다. 해결 완료/공유 예외로 보고하지 않고 DB 전환 승인이 필요한 별도 미해결로 남깁니다. Next 보안 보완/개발 의존성 경고는 #11, 상세 GET 위험은 #12를 읽습니다. 블랙 확정은 유지합니다.
