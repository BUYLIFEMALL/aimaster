# BLC-08 — 작업실 → SEO: 자료 수집·근거 승인·본인 문체 개발 플랜

2026-10-22 Claude Code(윈도우, 웨일 — Codex 크레딧 제한으로 주인님 지시 이어받음). 운영 DB ref `esgxyikcnnvmlhygjkth`. 작업표 `docs/BLOG_CONSOLIDATION_TASKS.md` BLC-08.

## 원칙 (작업표·비교 보고서)

- **기존 글 수정(최적화) 경로는 그대로** — optimize·analyze·save-optimized·분석 후 생성은 건드리지 않는다.
- 새 기능은 **「자료부터 집필」 선택 모드**에만 들어가고 기본은 꺼짐(기존 회원 결과가 예고 없이 바뀌지 않게, AGENTS.md:172 원칙).
- 작업실(`blog-workroom`)은 그대로 유지. 앱끼리 API로 묶지 않고 검증된 순수 코드만 사본으로 가져온다.
- 회원 본인 키만(AI: 기존 OpenAI/Claude/Gemini, 네이버 검색: 공용 `user_api_keys`의 `naver_client_id/secret` — 이미 있는 항목이라 새 키 등록 화면 불필요).
- 화면 안내에 "인용 확인은 전체 사실 확인·표절 판정이 아님"을 분명히 적는다.

## 현재 SEO에 없는 것 (조사 결과)

자료는 2,000자 문자열 하나(`sourceContext`)뿐이고 출처 객체·근거 연결·승인이 없다. 회원 글 표본으로 문체를 분석하는 기능도 없다(기본 페르소나·직접 입력 500자만).

## 두 묶음으로 나눈다

### BLC-08a — 자료 수집·근거 승인·「자료부터 집필」 (먼저, v1.84)

| 단위 | 내용 | 파일 |
|---|---|---|
| U1 | 근거 판정 순수 함수: 인용이 해당 출처 원문에 실제로 있는지(`quoteInText`), 원문 25자 연속 복사인지(`copiesSource`), 출처 번호 검증, 승인 지문 해시 | 새 `lib/grounding.ts`(작업실 `src/lib/logic.ts:31–47` 사본) + `tests/grounding.test.mjs` |
| U2 | 자료 수집: 키워드 → 네이버 블로그 상위 5건 본문 + 뉴스 5건, 직접 URL·메모 추가. 본문 읽기는 기존 `drafts/extract`의 공개 주소 검사(SSRF 방어)를 공용 함수로 분리해 재사용 | 새 `app/api/research/collect/route.ts`, `lib/safeFetch.ts`, `lib/naverSearch.ts`(작업실 사본), `lib/apiKeys.ts` 키 종류 확장 |
| U3 | 근거 정리: AI가 자료에서 근거 항목(내용·출처 번호·인용)을 뽑고 U1으로 걸러 버린 수 표시. 자동 재시도 없음(이중 과금 방지) | 새 `app/api/research/analyze/route.ts`, `lib/ai/researchPrompt.ts` |
| U4 | 승인(서버 처리): 남길 항목 선택 → 서버가 승인 시각·지문 저장, 승인 뒤 내용이 바뀌면 승인 무효(작업실은 브라우저가 승인값을 그냥 저장하는 약점이 있어 보강) | 새 `app/api/research/[id]/approve/route.ts` |
| U6 | 「자료부터 집필」: 생성 요청에 선택 값 `researchId` 추가. **없으면 지금 경로 그대로**. 있으면 승인·지문 확인 후 남긴 항목만 프롬프트에 넣고 원고 `seo_report.grounding`에 기록 | `app/api/drafts/generate/route.ts`, `lib/ai/generator.ts`, `useStudio.ts`, 새 `ResearchView.tsx`, 사이드바 메뉴 1개 |
| U7 | 결과 화면에 출처 링크·인용 표시, 품질 패널에 AI 없는 점검(근거 없는 수치 표시) | `NewDraftView.tsx`, `QualityPanel.tsx`, `lib/seoQuality.ts` |

- **DB 변경(승인 필요):** 새 표 1개 `naver_blog_seo_research`(user_id, keyword, sources jsonb, points jsonb, approved_at, approval_hash, created_at) — 회원 본인만 읽고 쓰는 RLS 4개, 30일 자동 정리(기존 `draftRetention`·일일 크론에 추가). 기존 원고 표 칸은 바꾸지 않음(`seo_report` jsonb에 키만 추가 — 화면은 문자열 값만 보여 주므로 기존 화면 영향 없음, 복제 때는 근거 기록 제외).
- **AI 호출:** 근거 정리 1회 + 기존 생성 1회(회원 키).

### BLC-08b — 본인 문체 (다음, v1.85)

| 단위 | 내용 |
|---|---|
| U5 | 글 표본 붙여넣기(또는 블로그 RSS 수집) → 문체 프로필 분석 → 회원 승인 → 「자료부터 집필」·새 글에서 선택 적용. 새 표 1개(`naver_blog_seo_styles`, 회원당 개수 제한, RLS) |

08a를 운영 검수한 뒤 별도 플랜·승인으로 진행.

## 시험

- 무료: U1 단위 시험, 생성 API가 `researchId` 없을 때 **기존과 같은 프롬프트**인지 고정 시험, 승인 지문 불일치·미승인·남의 자료 거절 시험, 기존 `test:seo-quality`·`test:categories`·`test:auto-publish`·`test:openai-params` 회귀, tsc·빌드.
- 실제(시험 계정 본인 키, 가장 싼 모델): 자료 수집 1회(네이버 검색 무료 한도) → 근거 정리 1회 → 승인 → 「자료부터 집필」 생성 1회. 확장 발행은 하지 않음(원고 생성까지만).

## 비용 (08a)

| 항목 | 예상 | 비고 |
|---|---|---|
| Vercel 운영 빌드 | 1회(실패 시 +1) | |
| DB 스키마 | 새 표 1개 + RLS | **승인 필요** |
| 유료 AI(시험) | 2회(근거 정리 1 + 생성 1) | 시험 계정 본인 키, 가장 싼 모델(예: gpt-4o-mini 급), 1회당 수 원 수준 |
| 네이버 검색 | 수집 1회 | 회원 키, 무료 한도 |

https://naver-blog-seo-studio.buylife.xyz

---

## BLC-08b 상세 플랜 — 본인 문체 (v1.85, 2026-10-22 추가)

08a 운영 완료 뒤 작성. v1.85에는 08a 개선(「승인 뒤 바뀜 · 다시 승인 필요」 표시, 커밋 `ed4edeec7`, 미배포)을 함께 싣는다(빌드 1회 절약).

| 단위 | 내용 | 파일 |
|---|---|---|
| S1 | 문체 자료: ① 내 글 표본 붙여넣기(40자 이상, 최대 10개) 또는 ② 네이버 블로그 ID → 공개 RSS 최신 글 5/10개 본문(기존 `lib/safeFetch.ts` 재사용, AI·키 없음) | 새 `app/api/styles/route.ts`, `lib/naverRss.ts` |
| S2 | 문체 분석: 회원 AI 키 1회 → 작업실과 같은 항목(성격·어조·문장·구성·독자·자주 쓰는 표현·피할 표현·강점·주의점) | 새 `app/api/styles/[id]/analyze/route.ts`, `lib/ai/stylePrompt.ts`(작업실 `stylePrompt`·`styleBrief` 기반) |
| S3 | 승인(서버): 프로필 지문 저장, 승인 뒤 바뀌면 무효(08a와 같은 방식) | 새 `app/api/styles/[id]/approve/route.ts`, `lib/grounding.ts`의 지문 함수 재사용 |
| S4 | 적용: 생성 요청에 선택 값 `styleId`. **없으면 기존 프롬프트 그대로(시험으로 고정)**. 있으면 승인 확인 후 페르소나 지시 뒤에 「내 블로그 문체」 지시를 덧붙이고 원고 `seo_report.style`에 기록 | `drafts/generate/route.ts`, `generator.ts`, `useStudio.ts`(선택한 문체 상태) |
| S5 | 화면: 사이드바 「✍️ 내 문체」 메뉴(만들기·분석·승인·목록), 「새 글 만들기」·「자료부터 집필」에 「내 문체 적용」 선택칸(기본 = 적용 안 함) | 새 `StyleView.tsx`, `TitleView.tsx`, `ResearchView.tsx`, `StudioSidebar.tsx` |

- **DB 변경(승인 필요):** 새 표 `naver_blog_seo_styles`(user_id, name, blog_id, samples jsonb, posts jsonb, profile jsonb, approved_at, approval_hash, created_at, updated_at) — RLS 본인 4개, 생성 데이터 30일 자동 정리 대상(회원 분석 결과).
- **원칙:** 기본은 적용 안 함(기존 결과 불변), 회원 본인 키, 공개 RSS만 읽음(로그인 필요한 글 읽지 않음), "문체 흉내가 AI 탐지 회피를 약속하지 않음" 안내.
- **시험:** 무료 — 지문·승인 판정, `styleId` 없을 때 프롬프트 불변, 표본 검증, RSS 파싱(가짜 응답). 실제 — 시험 계정 글 표본 붙여넣기 → 문체 분석 1회 → 승인 → 「새 글 만들기」에 적용해 생성 1회(gpt-4o-mini). RSS 경로는 공개 블로그 ID로 수집까지만(AI 없음).

| 비용 | 예상 |
|---|---|
| Vercel 운영 빌드 | 1회(08a 개선 포함, 실패 시 +1) |
| DB 스키마 | 새 표 1개 + RLS — **승인 필요** |
| 유료 AI(시험) | 2회(분석 1 + 생성 1, 보강 시 최대 +2), 시험 계정 본인 키·gpt-4o-mini, 수 원 수준 |
