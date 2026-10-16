# allinone-graphic — 에이전트 인수인계 문서

## 1. 개요
- **프로그램명**: AI 올인원 그래픽 자동화 (`allinone-graphic`)
- **라이브 도메인**: https://graphic.buylife.xyz
- **버전**: v1.02

## 2. 핵심 로직 & 파일 구조
- `src/lib/templates.ts`: 19개 직군 123종 프리셋 템플릿 데이터베이스
- `src/lib/gemini.ts`: 회원 본인 Gemini 키 기반 렌더링, 인페인팅, AI 자동 입력 도우미
- `src/components/studio/AllInOneGraphicApp.tsx`: 4컬럼 스튜디오 작업 환경
- `src/components/layout/Sidebar.tsx`: 5대 그룹 아코디언 및 직군 필터 표준 사이드바


## B5 (2026-10-15) — 한국 시간 현재 월 기준 추가 (v1.02)

- 주 생성·분석 지침에 한국 시간 기준 현재 연·월을 반영하고, 계절·시기 표현은 현재 월에 맞추며 불필요한 계절·연도 표현을 덧붙이지 않도록 했습니다.


## 2026-10-16 DB 연동 변수 호환 — v1.03 (allinone-graphic)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.
