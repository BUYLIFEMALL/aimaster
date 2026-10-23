# 개발 플랜 — 「SEO 최적화 도우미 6.5.4」 분석 기반 업그레이드 (v1.74)

- 작성: 2026-10-20 Claude Code(윈도우) · 대상: ① AIMaster 운영 `naver-blog-seo-studio`
- 주인님 승인: 2026-10-20 "너가 제안한 대로 진행해줘" (새 프로그램 대신 SEO 스튜디오 업그레이드)
- 참고 원본: `D:\PDS\네이버 블로그 SEO 최적화 도우미 Setup 6.5.4.exe` (Electron, 정적 분석만 — 실행하지 않음).
  원칙 21에 따라 **원본 코드·프롬프트는 옮기지 않고 기능만 참고해 새로 만든다.**

## 1. 문제·범위

| # | 내용 | 원본에 있던 것 → 우리 방식 |
|---|---|---|
| 0 | **버그**: 생성 API 허용 목록이 「전환 스토리」「인사이트 가이드」(옛 이름)라 화면에서 「홈판 스토리」「인사이트 엣지」를 고르면 항상 400 실패 | 허용 목록을 생성기의 전략 목록 한 곳에서 가져오게 통일 |
| 1 | 발행 전 자체 점검표 (AI 없음, 비용 0) | 원본 16개 항목 체크리스트 → 제목 길이·키워드 위치·분량·키워드 반복·긴 문단·[확인 필요]·상투 표현·FAQ·이미지 등 점검. **"네이버 공식 점수가 아님"을 화면에 명시**(D-34-02) |
| 2 | 핵심 단어 빈도 상위 15개 (AI 없음) | 원본과 같은 목적, 조사·불용어 제거는 새로 작성 |
| 3 | 내 실제 경험 메모 + 「경험 떠올리기 질문 받기」 | 원본은 AI가 1인칭 경험을 **지어내 제안** → 우리 규칙(가짜 체험담 금지)과 충돌하므로 **AI는 질문만** 만들고, 회원이 적은 실제 경험만 본문에 사용 |
| 4 | 자연스러운 문체 다듬기 옵션 | 원본 「인간화 페르소나·패턴 흔들기(AI 탐지 우회)」 → 문장 길이 변화·상투 표현 제거·소제목 형태 다양화만. **탐지 회피를 약속하지 않음**(기존 생성 규칙 6 유지) |
| 5 | FAQ 넣기 선택 | 글 끝에 「자주 묻는 질문」 Q./A. 3~5개 |
| 6 | 모바일 미리보기 | 375px 폭 화면에서 제목·본문 줄바꿈 확인 |

범위 밖(다음 후보): SNS 홍보 문구, 검색 참고 자료 목록(그라운딩), 카테고리별 인기 제목 추천.
메뉴·확장 동작·DB 구조는 바꾸지 않는다(경험 메모·옵션은 저장하지 않고 생성 요청에만 사용).

## 2. 구현 순서

1. `lib/ai/generator.ts`: 전략 이름 목록 내보내기, `experienceNote`·`naturalStyle`·`includeFaq` 옵션을 프롬프트에 반영 → `app/api/drafts/generate/route.ts` 허용 목록 교체·입력 검증(문자열·길이 상한)
2. `app/api/drafts/experience-questions/route.ts` 신규: 권한 확인(`checkProgramAccessApi`·force-dynamic·no-store) + 본인 키 + 질문 5개 JSON
3. `lib/seoQuality.ts` 신규(순수 함수): 점검표·단어 빈도 → `tests/seo-quality.test.mjs`
4. 화면: `TitleView`(경험 메모·질문 받기·문체·FAQ 옵션), `NewDraftView`(점검표·단어 빈도·모바일 미리보기), `useStudio` 상태 연결, `globals.css`
5. 버전 v1.74(앱·manifest·ZIP·DB `version`/`extension_version`), `/guide`에 새 기능 안내 추가

## 3. 검수

- `npx tsc --noEmit`, `npm run lint`, 기존 테스트(`test:categories`·`test:update-banner`·`test:browser`) + 새 점검 테스트, `npm run build`
- 배포 후 크롬 실제 창: 새 옵션 표시, 홈판 스토리 전략 생성 1회(가장 싼 모델), 점검표·빈도·모바일 미리보기, 375px 폭
- `node scripts/check-extension-release.mjs naver-blog-seo-studio` OK

## 4. 비용

| 구분 | 내용 |
|---|---|
| 개발·시험 | 회원 본인 키(시험 계정·관리자 등록 키)로 가장 싼 텍스트 모델 2~3회(글 1회 + 질문 1회). 이미지 생성 시험 없음 |
| 운영자 인프라 | 없음(기존 Vercel 프로젝트, DB 구조 변경 없음) |
| 회원 부담 | 경험 질문 받기 1회 = 짧은 텍스트 호출 1회(본인 키). 점검표·단어 빈도·미리보기는 AI 호출 없음 |

## 5. 버전·배포·인수인계

- v1.73 → v1.74, 확장 코드 변경 없음(버전·ZIP만), 단일 프로그램 배포 1회
- 산출물: 이 플랜, `AGENTS.md` v1.74 항목, `docs/IMPROVEMENTS.md`, `docs/IMPROVEMENT_HANDOFF_20261020.md`, 루트 `docs/HANDOFF.md`, `docs/PROGRAM_IDEA_BACKLOG.md`, `docs/PROGRAM_CAPABILITY_MAP.md` 카드
