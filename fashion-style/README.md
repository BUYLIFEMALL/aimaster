# AI 패션스타일 자동화 (fashion-style)

인물 사진에 AI 스타일리스트가 추천한 코디를 입혀 보고 메이크업·헤어까지 완성하는 AIMaster 가상 피팅 스튜디오입니다. 사진·옷장은 서버에 저장하지 않고 회원 브라우저에만 보관하며, AI는 회원 본인의 Gemini 키로 호출합니다.

- 운영: https://fashion-style.buylife.xyz · v1.01 · 인수인계 [AGENTS.md](AGENTS.md), [docs/CLI_HANDOFF.md](docs/CLI_HANDOFF.md) · 계획 [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md)

```bash
npm install
npm test                # 순수 로직 12개
npm run test:browser    # 보이는 Chrome 15개(모의 Gemini). Playwright + 설치된 Chrome 필요
npx next build
vercel deploy --prod --yes --scope buylife   # 수정 때마다 DB programs.version +0.01
```


## B5 (2026-10-15) — 한국 시간 현재 월 기준 추가 (v1.05)

- 주 생성·분석 지침에 한국 시간 기준 현재 연·월을 반영하고, 계절·시기 표현은 현재 월에 맞추며 불필요한 계절·연도 표현을 덧붙이지 않도록 했습니다.


## 2026-10-16 DB 연동 변수 호환 — v1.06 (fashion-style)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.
