# AI 쇼츠 원스톱 제작 자동화 (`shorts-onestop-studio`) — 에이전트 인수인계

> 루트 `CLAUDE.md`·`AGENTS.md`(최상단 필독: 계정 고정·동시 작업 금지·비용 최소화·DB 연동)와 `docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`를 먼저 읽는다.
> 기획·참고 원본 분석·단계 계획: [`../docs/CARD_SHORTS_REFERENCE_ANALYSIS.md`](../docs/CARD_SHORTS_REFERENCE_ANALYSIS.md) (외부 상용 설치 프로그램의 **기능만** 참고 — 원본 코드·디자인·문구·이름 사용 금지, 원칙 21).
> 작업 시작 전 `docs/ACTIVE_WORK.md`에 이 폴더를 등록하고, 끝나면 지운다.

## 1. 한 줄 소개
주제 한 줄 → AI 대본(인트로·카드 3~8장·아웃트로) → 배경(스톡·AI 이미지·움직이는 배경) → 음성·자막 → 배경음악 → **브라우저에서** 1080×1920·30fps MP4. 웹 프로그램, 회원 본인 키, 서버 렌더 없음(운영자 비용 거의 없음 → 프리미엄 후보 아님).

## 2. 현재 상태 (버전 `src/lib/version.ts` = DB `programs.version`)
| 단계 | 내용 | 상태 |
|---|---|---|
| P1 뼈대 | 폴더·권한(정지→관리자→핸드폰→FREE→구독→등급+기간, 서비스 롤 조회)·흰색 레이아웃·모바일 ☰·좌측 6단계 메뉴(준비 중 안내)·API키등록(Gemini·OpenAI·Claude, 연결 확인=모델 목록 조회라 요금 없음)·DB 등록·Vercel·도메인 | **v1.01 배포**(2026-10-16) |
| P2 대본 | 텍스트 공급자 레지스트리·주제 추천·대본 JSON·참고 문서·내 대본 | 다음 |
| P3~P8 | 화면 합성 → 배경 → 음성·자막·음악 → MP4 렌더 → SEO·발행 계획·일괄 → 마무리·공개 | 대기 |

## 3. 운영 정보
- 주소: https://shorts-onestop-studio.buylife.xyz (별칭 https://shorts-onestop-studio.vercel.app), Vercel 프로젝트 `shorts-onestop-studio`(팀 `buylife`), 배포 `vercel deploy --prod --yes --scope buylife`(이 폴더에서).
- DB: `programs` slug `shorts-onestop-studio`, 카테고리 유튜브, 최소 등급 일반, **badges `coming`(개발 중)**, 요금제 3종. 등록 SQL `supabase/migrations/0001_register_shorts_onestop_studio.sql`.
  - `is_active=false`면 관리자·시험 계정도 들어갈 수 없어(권한 판정 not_found) 활성으로 두고, **등급 자동 부여(`grade_program_access`)는 공개 전까지 넣지 않는다** → 지금은 관리자 + 시험 계정(`buylifemall@naver.com`, blog-workroom 기간 복사)만 사용.
- Vercel 환경변수(Production): 공용 DB 연결값 새·기존 이름 + `NEXT_PUBLIC_MAIN_SITE_URL`. 등록 스크립트 `scripts/add-platform-env.mjs`(루트 `.env.local`에서 읽음, 값 출력 없음). **운영자 AI 키는 등록하지 않는다.**
- 키 provider: `gemini`·`openai`·`anthropic`(공용 `user_api_keys`). 스톡 `pexels`·`pixabay`는 제약에 이미 있음(P4에서 추가). **Groq·Cloudflare·NVIDIA·OpenRouter·Azure Speech는 `user_api_keys` 제약에 없음 → 쓰려면 DB 제약 변경(주인님 승인 필요)**.

## 4. 개발 규칙(이 프로그램)
- 스타일 기준은 `blog-workroom` 뼈대(흰색, 브랜드 색만 `#e11d48`). 새 화면도 같은 클래스(`card`·`notice`·`flow-item` 등) 사용.
- 모든 API는 `checkProgramAccessApi()` + 같은 출처 확인 + `dynamic`/`fetchCache` 두 줄. 페이지·레이아웃은 `requireProgramAccess()`.
- AI 프롬프트에 당해 연도 주입(원칙 8), 인물 이미지는 한국인 기본(원칙 3).
- 시험: 무료 공급자·모델 목록 조회 우선, 품질 확인은 가장 저렴한 모델 소량(최상단 비용 지침). 회원 화면 검수는 크롬에서 `buylifemall@naver.com` 로그인 상태로.

## 5. 작업 기록
- 2026-10-16 v1.01 — P1 뼈대 배포. 남은 확인: 시험 계정 로그인 후 실제 크롬 화면(주인님 로그인 필요).
