# 부동산 실거래 투자분석 자동화 (`real_estate_sales/`, slug `real-estate-sales`) — 작업 지침

- 먼저 루트 `CLAUDE.md`·`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`, 이 폴더의 [README.md](README.md)(아키텍처·환경변수·배포)와 [docs/CHANGELOG.md](docs/CHANGELOG.md)를 읽는다.
- 라이브: https://real-estate-sales.buylife.xyz · Next.js 16 + Tailwind v4 · Vercel 서울 리전 고정(`vercel.json` `regions: ["icn1"]`, 공공 API 국내 IP 전용).
- 권한: 레이아웃·서버 액션 모두 `requireProgramAccess()`, 예약 수집 API는 `CRON_SECRET`. AI 키는 회원 본인 것만(폴백 없음). 공공데이터 키는 운영자 공용(최상위 규칙 예외 §8).

## 디자인 리뉴얼 — v1.11 (2026-10-17, Claude Code 맥미니, 주인님 승인 후 구현)
- 적용 템플릿: **스마트 매트릭스 스타일(다크 슬레이트)** — [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md) · 플랜 [docs/PLAN_20261017_DESIGN_RENEWAL.md](docs/PLAN_20261017_DESIGN_RENEWAL.md) · 개선 원장 [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) · 인수인계 [docs/IMPROVEMENT_HANDOFF_20261017.md](docs/IMPROVEMENT_HANDOFF_20261017.md)
- 다크 토큰(옛 `gold`·`dark-*` 이름은 재연결), 사이드바 ☰·📖, 대시보드 지표·연결 상태, 실거래 목록 매트릭스(검색·자치구·정렬·표/카드), 상세 지표·매력도 막대, `/guide` 신설, 로그인까지 다크(원칙 13). 서버 로직 변경 없음.
- **빌드·배포·화면 검수는 윈도우 CLI 대기.**
