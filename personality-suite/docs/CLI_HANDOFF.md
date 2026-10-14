# personality-suite 인수인계 (CLI_HANDOFF)

## 현재 상태 (2026-10-14, v1.04)
- **v1.04**: 종합 프로필 검사별 반영 비중(제외·참고·중요·핵심). 코드·package(1.0.4)·DB `programs.version` v1.04. DB 스키마 변경 없음. 검수: 단위 19/19, tsc·빌드, 운영에서 제외·정렬·basedOn 비중 저장 확인(테스트 결과·프로필 삭제). 프로필 화면의 `doneCount`가 마음 상태 점검 저장분까지 세던 문제도 후보 목록(민감 검사 제외)으로 바로잡음.

### v1.03 기준
- **v1.03**: 결과 공유 이미지(브라우저 PNG), 인쇄·PDF 저장, 프로필 화면의 시기별 변화 추이 그래프. 코드·package(1.0.3)·DB `programs.version` v1.03. DB 스키마 변경 없음.
- 검수: 단위 18/18, tsc·빌드, 운영 로그인 화면에서 이미지 생성·카드 렌더링·추이 그래프 확인(테스트 결과 삭제).

### v1.02 기준
- **v1.02**: 기질·성향 점검(24문항), 스트레스·마음 상태 자기점검(20문항, 기본 미저장·AI/프로필 제외·고정 상담 안내), 같은 검사 이전 결과 비교, 종합 프로필에 직전 결과 반영(`changes`). 코드·package(1.0.2)·DB `programs.version` v1.02. DB 스키마 변경 없음.

### v1.01 기준
- 신규 프로그램 **AI 종합 성격 진단 자동화** 구현·등록·배포 완료. 주소: https://personality-suite.buylife.xyz (옛 `personality-suite.vercel.app`도 유지).
- 등록: `programs`(slug `personality-suite`, 카테고리 Tools, 배지 `new`+`free` → 가입한 회원 누구나 사용, 최소 등급 일반), 요금제 3종(1/2/3개월 10,000/20,000/30,000), VIP 등급 접근, 썸네일(실사 16:9, §13 템플릿).
- DB: `personality_suite_results`, `personality_suite_profiles`(마이그레이션 0001·0002 — 적용 완료, 파일과 일치).
- Vercel: 프로젝트 `personality-suite`(팀 buylife), 환경변수 4종은 `scripts/add-personality-suite-vercel-env.mjs`로 등록(Supabase URL·anon·service role·메인 사이트 URL). 배포: `cd personality-suite && vercel deploy --prod --yes --scope buylife`.

## 검수 증거
- 단위 17/17(v1.02), `tsc --noEmit` 무오류, `npm run build` 통과.
- 운영(로그인 Chrome): 대시보드 14종 표시 → 성격 5요인 30문항 응답 → 결과 화면(점수·해석) → AI 심층 분석 정상 → 결과 삭제 후 `/api/results` 0건 확인.
- 비로그인: `/dashboard` 307 → `/login`, `/api/results` 401.

## 이어서 할 일
- 일반 회원(`buylifemall@naver.com`) 로그인으로 같은 흐름 재확인(주인님 로그인 후).
- v1.03 후보는 `AGENTS.md`의 "남은 일" 참고. 계획서: `docs/DEVELOPMENT_PLAN.md`.

## 함정
- 이 폴더는 `ai-writing-editor` 뼈대를 복사해 만들었다. 복사 후 `@/lib/we/*`·`we.css` 잔재와 slug(`access.ts`)·`version.ts`를 먼저 `tsc`로 확인할 것.
- Vercel CLI 배포 출력이 JSON 안내만 보여도 배포는 진행된다 — `vercel ls --scope buylife`로 상태 확인.
