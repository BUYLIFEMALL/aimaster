# AI 쿠팡 운영 자동화 (`coupang-ops`)

https://coupang-ops.buylife.xyz

쿠팡 공식 WING Open API로 상품 등록부터 주문·송장·반품·문의·정산까지 처리합니다. 개발 실행: `npm install` → `npm run dev`(포트 3078), 시험: `npm test`.

1. **사용 목적·대상**: 쿠팡 판매자의 반복 작업을 줄입니다. 판매자가 쿠팡 운영이 편해지는 것이 목표입니다.
2. **기술**: Next.js 16, React 19, Tailwind 4, Supabase 공용 DB, 회원 본인 고정 IP 프록시(Fixie 등), 회원 본인 AI 키.
3. **기능·구조·장단점**: [`AGENTS.md`](AGENTS.md) §3.
4. **버전**: 운영 v1.11, v1.12 대기. 기록은 [`AGENTS.md`](AGENTS.md) 날짜별 항목.
5. **남은 일**: [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md).
6. **연계·아이디어**: [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md) 3번.
7. **UI 개선**: [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md), [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md) 2번.

회원은 본인 쿠팡 키·고정 IP·AI 키를 등록해 사용합니다. 방법은 프로그램의 「연동 & 사용 매뉴얼」(`/guide`)에 있습니다.
