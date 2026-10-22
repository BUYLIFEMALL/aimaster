# AI 블로그 작업실 자동화 (`blog-workroom`) — 인수인계

- 주소: https://blog-workroom.buylife.xyz (Vercel 프로젝트 `blog-workroom`, `prj_r1bOAHBZ82ktcPI9RYYGe2w35QXY`) · slug `blog-workroom` · 카테고리 블로그 · 버전 **v1.06**
- **2026-10-22 v1.12 BC-05 30일 자동 삭제(Claude Code 윈도우·웨일):** 설정(`settings`)·내 블로그와 문체(`blog`)를 뺀 작업(키워드·자료·초안·최종본·이미지 작업 등)은 만든 지 30일 뒤 삭제. `src/lib/retention.ts`(순수 함수) — `listItems`·`getItem`이 같은 기준(`retainedFilter`)으로 바로 숨김, `GET /api/cron/cleanup`(Vercel Cron 매일 18:20 UTC, `CRON_SECRET` 필요, `?dry=1` 미리보기)이 지난 행 삭제 + 남은 이미지 작업이 없는 버킷 폴더(회원/작업번호) 파일 삭제. **버그 수정:** 이미지 작업을 지워도 파일이 남던 문제 — `removeJobImages`. 화면 맨 아래 보관 안내. 시험 11(새 2), 배포 Ready, DB v1.12, Vercel 대시보드 「Run」 200·행 12건 그대로(지울 대상 0) 확인.
- **디자인 인수인계서**: [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md) | **디자인 플랜**: [`docs/PLAN_20261016_DESIGN_RENEWAL.md`](docs/PLAN_20261016_DESIGN_RENEWAL.md)
- **개선사항 대장**: [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md) | **개선 인수인계서**: [`docs/IMPROVEMENT_HANDOFF_20261016.md`](docs/IMPROVEMENT_HANDOFF_20261016.md)
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
- 2026-10-16 v1.05 — 포커스 스튜디오 스타일(Focus Studio Style) 디자인 리뉴얼 및 사용 매뉴얼(/guide) 비주얼 가이드북 전면 개편. 딥 인디고 & 바이올렛 토큰 시스템(`globals.css`), 사이드바 레이아웃 표준화(계정 블록 12px 밀착 배치, `Sidebar.tsx`), 8단계 올인원 집필 파이프라인 인포그래픽, 네이버 API 연동 가이드, 골드키워드 판정 공식 및 4등급 치트시트, FAQ 아코디언 구축. Supabase 공유 DB `programs.version='v1.05'` 동기화, Vercel 배포 완료. Microsoft Edge(`msedge.exe`) 데스크톱(1440px) 및 모바일(380px) 실세션 검수 완료. 산출물: `docs/PLAN_20261016_DESIGN_RENEWAL.md`, `docs/DESIGN_HANDOFF.md`, `docs/IMPROVEMENTS.md`, `docs/IMPROVEMENT_HANDOFF_20261016.md`.


## 2026-10-16 DB 연동 변수 호환 — v1.04 (blog-workroom)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## v1.07 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `src/lib/models.ts` `tests/logic.test.mjs` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).

## 2026-10-17 v1.08 — 이미지 생성 호출·모델 목록을 공용 기준 코드로 (4묶음 A 직접 호출형, Claude Code 윈도우)
- `src/lib/ai.ts` `generateImage()`가 공용 사본으로 위임 — 참고 이미지·비율·200초·안전 차단/이미지 없음/형식 검사 오류(`AiError` 코드 safety·noimage·timeout) 그대로, 원래처럼 **재시도 없음**. `models.ts` 이미지 모델 목록은 공용 등급표 2K·Pro 등급(값 동일).
- 공용 사본이 주는 것: 키 머리글 전송, 시간 제한, 응답의 모든 조각에서 **최종** 이미지 선택(gemini-3-pro-image의 중간 초안 `thought` 조각 제외), 안전 차단·한도·키 오류 구분, 키 가리기. 프롬프트·비율·화질은 그대로.
- 검수: tsc 0·기존 테스트 통과, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전 확인. 실제 이미지 생성 시험은 하지 않음 — 오류가 나면 그때 검증(주인님 지시).
- **주의(다음 CLI)**: `geminiImage.ts`·`nanoBananaModels.ts`는 공용 기준 코드 사본이다(기준: `ai-image-studio/lib/providers/`). 직접 고치지 않는다. 이 프로그램만 결과를 다르게 해야 하면 `getNanoBananaConfig()`/`NANO_BANANA_MODEL_CONFIGS` 결과를 호출하는 쪽에서 덮어써 보완한다. 지도: 루트 `docs/SHARED_FEATURE_MAP.md` §3.

## 2026-10-17 v1.09 — 이미지 생성 시간 초과 안내 문구 통일 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 「이미지 생성이 N초 안에 끝나지 않았습니다. 이미지가 이미 만들어졌을 수 있으니 잠시 뒤 결과를 확인한 다음 다시 시도해 주세요.」로 바꿔 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 바로 다시 눌러 이중 과금되는 일을 줄이려는 목적이다. 프롬프트·모델·화질·시간 제한 값은 그대로.
- 이 프로그램이 따로 덮어쓰던 시간 초과·연결 끊김 문구도 같은 뜻(「이미지 생성 응답을 받지 못했습니다. 이미지가 이미 만들어졌을 수 있으니 잠시 뒤 결과를 확인한 다음 …」)으로 고침: `src/lib/ai.ts`(이미지 생성 부분만, 글 생성 쪽 문구는 그대로).
- 검수: 기준 테스트 8개 통과(문구 확인 추가), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.10 — 이미지 시간 초과 자동 재시도 중단(이중 과금 방지) (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)이 **시간 초과(TIMEOUT)는 자동으로 다시 보내지 않도록** 바뀌어 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 자동 재시도가 이중 과금의 원인이 될 수 있었다. 서버 오류·혼잡(429)·연결 실패는 그대로 1회 재시도. 프롬프트·모델·화질·시간 제한 값·안내 문구는 그대로이고, 시간 초과 안내가 재시도 대기 없이 더 빨리 뜬다.
- 이 프로그램은 이미 `retries: 0`이라 동작 변화 없음(버전만 맞춤).
- 검수: 기준 테스트 8개 통과(시간 초과 1회 요청·연결 실패 2회 요청 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.11 — 이미지 시간 초과 안내를 「Google 사용량 확인」으로 정정 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 정정해 사본을 `--sync`로 다시 받음: 「…결과를 받지 못했습니다. 구글 쪽에서는 이미 생성되어 요금이 나갔을 수 있으니, 바로 다시 누르기 전에 Google AI Studio 사용량(https://aistudio.google.com/usage)을 확인해 주세요.」 이전 문구 「잠시 뒤 결과를 확인」은 틀린 안내였다 — 시간 초과는 우리 서버가 요청을 끊는 것이라 이미지가 프로그램(보관함 등)에 저장되지 않고, 회원이 확인할 수 있는 것은 본인 Google 사용량(요금)뿐이다.
- 이 프로그램이 덮어쓰던 이미지 시간 초과·연결 끊김 문구도 같은 사용량 확인 안내로 고침: `src/lib/ai.ts` 이미지 부분(뒤에 「그다음 저장된 단계부터 다시 진행」 유지).
- 검수: 기준 테스트 8개 통과(사용량 주소 포함 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->
