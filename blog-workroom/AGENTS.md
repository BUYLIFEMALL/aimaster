# AI 블로그 작업실 자동화 (`blog-workroom`) — 인수인계

- 주소: https://blog-workroom.buylife.xyz (Vercel 프로젝트 `blog-workroom`, `prj_r1bOAHBZ82ktcPI9RYYGe2w35QXY`) · slug `blog-workroom` · 카테고리 블로그 · 버전 **v1.01**
- 루트 `CLAUDE.md`·`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`를 먼저 읽는다. 최상위 규칙: **AI·네이버 키는 회원 본인 것만**(운영자 키 폴백 없음).

## 1. 무엇인가 / 왜 이렇게 만들었나
- 2026-10-15 주인님 지시 "DotoliAI-1.2-setup.exe(도톨이 AI, Python 데스크톱 앱) 웹버전으로 개발". 분석: [`docs/DOTOLI_AI_REFERENCE_ANALYSIS.md`](../docs/DOTOLI_AI_REFERENCE_ANALYSIS.md).
- **권리 없음 — 기능만 참고**(주인님 확인). 원본 코드·지시문·작성 지식(`knowledge.json`)·이름·아이콘은 쓰지 않았다. 작성 원칙(`src/lib/prompts.ts` `WRITING_PRINCIPLES`)은 네이버 서치어드바이저 공개 가이드를 우리 말로 새로 쓴 것.
- 원본과 다른 점: ChatGPT 구독(Codex 로그인) 대신 **회원 본인 OpenAI 또는 Gemini 키**(설정에서 선택), 로컬 SQLite 대신 공용 Supabase, 내장 브라우저 상위 5개 대신 **네이버 검색 API 정확도순**(화면에 "실제 순위와 다를 수 있음" 고지), Kiwi 형태소 분석 없음(AI + 단순 규칙), 자동 업데이트·백업 화면 없음.

## 2. 작업 흐름(좌측 메뉴 순서)
| # | 화면 | 서버 단계(`/api/run/<action>`) | 외부 호출 |
|---|---|---|---|
| 1 | 내 블로그 스타일 `/style` | `style.create` · `style.collect`(RSS + PostView 본문) · `style.analyze` | 네이버 공개 RSS·글, AI |
| 2 | 키워드 탐색 `/keywords` | `kw.discover`(AI 후보 → 검색광고 검색량 + 블로그 문서수 → 등급) · `kw.metrics` · `kw.save` · `kw.related` | AI, 검색광고, 검색 API, 자동완성 |
| 3 | 트렌드 관측 `/trends` | `trend.collect`(뉴스 10 + 웹 10) → `trend.analyze`(요약·자료 속 용어만) → `trend.verify`(데이터랩 14일·급상승 판정 + 수치) | 검색 API·데이터랩, AI |
| 4 | 블로그 벤치마킹 `/benchmark` | `bench.find`(블로그 검색 50건×최대 3주제 → 블로그별 묶음) · `bench.analyze`(RSS 10 + 본문 3 → AI → 수치) | 검색 API, RSS, AI |
| 5 | 글 작성 준비 `/research` | `research.create` · `research.collect`(상위 블로그 5 + 뉴스 5) · `research.analyze`(근거 구절이 자료에 실제로 있는 것만, 원문 25자 연속 일치 제외) → 화면에서 승인 | 검색 API, 글 본문, AI |
| 6 | 글 작성 `/write` | `write.outline`(승인 자료 필수) · `write.section`(구간 1개씩 — 화면이 순서대로 호출, 중지·이어쓰기) | AI |
| 7 | 최종 검수 `/review` | `write.review`(6영역, 본문에 없는 인용은 버림, 검수 중 글이 바뀌면 거절) · `write.finalize`(검수한 글 해시 일치 + 필수 0건 + 확인란) | AI |
| 8 | 이미지 제작 `/images` | `image.plan`(대표 1 + 본문 5~10 노드) · `image.generate`(노드 1장, 참고 이미지 최대 10장 → Storage `blog-workroom` 버킷) | Gemini 이미지 |
- 설정 `/settings`: 키 7종(`openai`·`gemini`·`naver_client_id/secret`·`naver_ads_api_key/secret_key/customer_id` — 공용 provider 이름), 연결 확인(`/api/keys/test`), 글 작업 AI·모델·이미지 모델(`/api/settings`, 저장은 `kind='settings'`). 연동 매뉴얼 팝업 4개(`src/lib/guides.ts`).
- 모델 목록 `src/lib/models.ts`(ai-auto-blog에서 실제 확인한 ID만). 기본: Gemini 3.5 Flash / GPT-4.1 / 이미지 Nano Banana 2.

## 3. 저장 구조
- 테이블 `public.blog_workroom_items`(id, user_id, kind, title, data jsonb, ref_id, created_at, updated_at) + RLS owner-only 4정책. kind: settings·blog·keyword·brief·bench·research·draft·final·image_job. 데이터 형태: `src/lib/types.ts`. 서버는 service role + **모든 조회에 user_id 조건**(`src/lib/store.ts`), 종류별 개수 상한(키워드 1000, 블로그 30, 그 외 300).
- 이미지 버킷 `blog-workroom`(공개 읽기, 10MB, png/jpeg/webp), 경로 `<userId>/<jobId>/<nodeId>-<시각>.<ext>`.
- 마이그레이션 기록: `supabase/migrations/0001_blog_workroom.sql`. DDL은 2026-10-15 Codex Supabase 연결로 문장별 적용(이 세션에 DB 구조 도구가 없어서), 버킷·programs·요금제·VIP 접근은 service role 스크립트.

## 4. 검수 기록 (v1.01, 2026-10-15)
- 단위 테스트 8/8(`npm test`: 주소 해석, 등급, 급상승, 검수 인용·원문 유사, 합치기, 지시문 연도·체크 해제 항목 제외, 모델 검증), `tsc`·빌드 통과, 실제 네이버 RSS·본문 수집 확인(공식 블로그 50개 목록·본문 1,708자).
- 운영: 로그인 200, `/` 307, 보호 화면 307(`?redirect=`), API 401, 알 수 없는 단계 404, 다른 출처 로그아웃 403, `X-Vercel-Cache: MISS`.
- 엣지 시험 계정(일반 회원 권한, 메인 로그인 공유): 설정 화면 키 상태·모델 표시, ① 블로그 등록 → 최신 5개 수집 → 본인 Gemini 스타일 분석(「」 인용·2026년 10월 기준) → 승인, ② 네이버 키 미등록 시 AI 호출 전에 등록 안내, ⑧ 글 붙여넣기 → 문단 구성(대표 1 + 본문 5) → 대표 이미지 1장 생성·Storage 저장(한국인 인물). 400px 10개 화면 가로 넘침 0·☰ 메뉴.
- **미검수: 네이버 키가 필요한 ②~⑦ 실제 흐름** — 시험 계정에 본인 네이버 검색·검색광고 키 등록이 필요(에이전트는 키를 입력하지 않음). 등록되면 키워드 탐색 → 보관 → 글 작성 준비(상위 5 + 승인) → 초안 → 검수 → 최종본 순으로 이어서 확인.

## 5. 남은 일·주의
- 위 미검수 흐름(주인님이 시험 계정 설정에 네이버 키 등록 후).
- 프리미엄 후보 아님(운영자 실비 없음 — 원칙 16). 서버 수집량이 커지면 재판단.
- 원본 대비 미구현: 이미지 "유사 이미지 찾기", 참고 사이트 주소 읽기, 노드별 개별 참고 이미지, 캔버스 끌기 화면, 사용량 통계 화면.
- 버전 올릴 때: `src/lib/version.ts` + `package.json` + DB `programs.version` + 이 문서.
