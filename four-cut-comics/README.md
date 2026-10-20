# AI 4컷 만화 자동화 (`four-cut-comics`)

주제 한 줄로 **대본 → 캐릭터 시트 → 컷 그림 → 말풍선 → 저장**까지 만드는 인스타툰·4컷 만화 생성기입니다. 회원 본인의 Google Gemini API 키로 동작합니다.

https://four-cut-comics.buylife.xyz

- 현재 버전: `v1.19`(2026-10-20 내 작품에서 여러 회차 한 번에 인스타 예약·예약 대기 / v1.18 인스타 예약 게시·게시 기록·올라갈 장 미리보기 / v1.17 인스타그램에 바로 게시 — 바둑판 1장·컷별 캐러셀, 상세 `AGENTS.md`)
- 개발 지침·7대 항목: [`AGENTS.md`](AGENTS.md)
- 디자인: 크리에이티브 아틀리에 스타일 — 코믹 파스텔 변형 → [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md)
- 개선 제안·백로그: [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md) · [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md)
- 최근 인수인계: [`docs/IMPROVEMENT_HANDOFF_20261018.md`](docs/IMPROVEMENT_HANDOFF_20261018.md)
- 원본 분석·전체 플랜: [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md), CLI 상태: [`docs/CLI_HANDOFF.md`](docs/CLI_HANDOFF.md)

## 명령
```bash
npm run dev     # 로컬 실행
npm test        # 단위 테스트(26개)
npm run build   # 운영 빌드
```
