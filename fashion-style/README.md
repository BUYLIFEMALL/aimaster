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
