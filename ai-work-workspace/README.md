# AI 업무 워크스페이스 자동화

문서와 업무 데이터베이스를 한곳에 모아 보드·캘린더·타임라인으로 정리하는 업무 워크스페이스입니다.

- 주소: https://ai-work-workspace.buylife.xyz
- 버전: v1.12 (AI 회의록 — 실시간 받아쓰기·AI 요약 · AI 비서 — 회원 본인 Claude·OpenAI·Gemini 키(Gemini 기본 Flash-Lite), AI 채팅 기록 30일 자동 삭제, 표준 로그인, 스마트 프로 인디고 워크스페이스 스타일) · 카테고리: 업무자동화 · 이용: 일반 등급 이상 + 사용기간(또는 구독)
- 원본: [litpage](https://github.com/litmers-dev/litpage) (MIT, 저작권 표시 `LICENSE`·`THIRD_PARTY_NOTICES.md`)

## 사용 목적·대상
회의록·업무 위키·프로젝트 보드·할 일을 페이지와 데이터베이스로 정리하려는 팀장·1인 사업자·직장인. 회원마다 워크스페이스가 분리됩니다.

## 기능(1단계)
블록 편집기 41종, 데이터베이스 보기 12종·수식·관계, 검색, 버전 기록, 휴지통, 불러오기·내보내기, 파일 첨부(4MB). AI·공유·에이전트는 다음 단계에서 엽니다.

## 개발
```bash
npm install
docker run -d --name aww-pg-test -e POSTGRES_PASSWORD=awwlocal -e POSTGRES_DB=aww -p 127.0.0.1:55432:5432 postgres:17-alpine
node tests/setup-local-db.mjs --reset           # 로컬 시험 DB (운영과 같은 마이그레이션)
npm run typecheck
npx vitest run --config upstream-tests/vitest.config.mjs server/ --exclude "**/demo-mode.test.ts"   # 원본 서버 시험 522개
npx vitest run --config tests/vitest.config.mjs  # 연결부 시험 13개
npm run build
```
배포(단독 실행): `vercel deploy --prod --yes --scope buylife --cwd "D:/Antigravity/AIMaster/ai-work-workspace"`

에이전트용 상세(7대 항목·구조·주의): [`AGENTS.md`](AGENTS.md) · 플랜: [`docs/PLAN_20261024_INITIAL_BUILD.md`](docs/PLAN_20261024_INITIAL_BUILD.md)
