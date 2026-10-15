# AI 블로그 작업실 자동화 (`blog-workroom`) — 인수인계

- 주소: https://blog-workroom.buylife.xyz (Vercel 프로젝트 `blog-workroom`, `prj_r1bOAHBZ82ktcPI9RYYGe2w35QXY`) · slug `blog-workroom` · 카테고리 블로그 · 버전 **v1.03**
- 루트 `CLAUDE.md`·`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`를 먼저 읽는다. 최상위 규칙: **AI·네이버 키는 회원 본인 것만**(운영자 키 폴백 없음).

## 1. 무엇인가 / 왜 이렇게 만들었나
- 2026-10-15 주인님 지시로 설치형 블로그 글쓰기 보조 프로그램(Python 데스크톱 앱)의 기능을 참고해 「AI 블로그 작업실 자동화」 웹 버전으로 새로 개발. 분석 기록은 `docs/HANDOFF.md` 2026-10-15 항목 참고.
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
- ②~⑦(네이버 키 필요) 흐름은 v1.03에서 메인 계정 본인 키로 서버 단계 전체 검수 완료(§6 v1.03). 시험 계정 화면으로 같은 흐름을 보려면 시험 계정에 본인 네이버 키를 등록해야 한다.

## 5. 남은 일·주의
- (선택) 메인 계정(크롬)으로 ②~⑦ 화면을 직접 열어 v1.03 시험 데이터 확인.
- 프리미엄 후보 아님(운영자 실비 없음 — 원칙 16). 서버 수집량이 커지면 재판단.
- 원본 대비 미구현: 이미지 "유사 이미지 찾기", 참고 사이트 주소 읽기, 노드별 개별 참고 이미지, 캔버스 끌기 화면, 사용량 통계 화면.
- 버전 올릴 때: `src/lib/version.ts` + `package.json` + DB `programs.version` + 이 문서.

## 6. 작업 기록
- v1.02 (2026-10-16): 주인님 지시로 프로그램 폴더 안의 참고 원본 프로그램 이름 표현을 모두 지우고 이 프로그램 이름으로 바꿈(인수인계 문서 1곳, 코드 주석 1곳). 화면·DB 설명·저장 데이터에는 원래 없었음(확인). 동작 변경 없음.
- v1.03 (2026-10-16): **네이버 키가 필요한 ②~⑦ 실제 흐름 검수** — 주인님 지시("다른 네이버 프로그램에 등록된 키를 쓰면 된다")에 따라, 키를 다른 계정으로 옮기지 않고(최상위 규칙) **메인 계정 본인 키로 메인 계정 작업**을 서버 단계에서 직접 실행했다(같은 `user_api_keys`를 쓰므로 다른 프로그램에 등록한 키가 이 프로그램에서 자동으로 쓰임). 결과: 키워드 탐색 25개(골드 포함)·보관·연관어, 트렌드 20자료→용어→추이 검증, 벤치마킹 12블로그→분석, 글 작성 준비(상위 5개 본문·사전 지식 15개·근거 제외 0)→승인→구성 4구간→구간별 작성→검수→필수 수정→재검수→최종본 저장까지 통과. 시험 데이터는 메인 계정에 남겨 둠(크롬에서 확인 가능, 필요 없으면 각 화면에서 삭제).
  - 고친 것: ① **등급 기준 실측 보정** — 검색 API 문서수는 누적이라 실측 분포(검색량 300↑ 연관어 30개: 2~1,600배, 중간값 약 60배)에 맞춰 골드 10 미만(월 1,000↑)·실버 30·일반 150으로(`src/lib/logic.ts`). ② 검색광고 연관어는 긴 검색어로 물으면 자기 자신만 돌려줌 → 짧은 단어로 다시 묻는 `shortRelated()`(`src/lib/metrics.ts`). ③ 데이터랩은 최근 1~2일이 미집계 → 빈 날을 0으로 채워 모든 용어가 하락으로 보이던 문제, 집계된 마지막 날까지만 사용(`trend.ts` `fillDays`). ④ 검수 제안에 「해당 문장을 삭제합니다」 같은 지시문이 와서 [제안 반영]이 지시문을 본문에 넣던 문제 — 지시문 금지·삭제는 빈 문자열(`prompts.ts`), 지시문은 삭제 제안으로 변환(`asReplacement`), 화면은 「이 문장 삭제」 버튼. ⑤ 키·설정 도우미를 `src/lib/context.ts`로 분리(단계 처리를 next 모듈 없이 시험 가능).
  - 단위 9/9.
- 2026-10-16(DB만, 버전 그대로): 메인 사이트 설명을 `docs/PROGRAM_DESCRIPTION_STANDARD.md` 형식으로 다시 씀 — short_desc 50자, 상세 설명 6단락(굵은 한 줄 소개 + 이모티콘 단락 + 본인 키·주의).
