# 프로필·후보 평가 서버 구현 — 로컬 검수 완료·묶음 배포 대기

2026-10-27 · Codex `codex-win-20261026-blog-check` [역할: blog]. 사용자 「진행해줘」에 따른 2번 단계의 **서버 구현**입니다. 운영 SQL 적용·실제 AI 호출·정식 UI·배포는 이번에 하지 않았습니다.

- 현재 운영(기존 본인 글 읽기): [운영 reader](https://blog-neighbor-care.buylife.xyz/reader) · [Vercel 보조](https://blog-neighbor-care.vercel.app/reader)
- [관리자 결과함](https://www.buylife.xyz/admin/dev-docs/requests). 새 `/api/analysis`는 미배포입니다.
- 로컬 코드: `src/lib/analysis/` · `src/app/api/analysis/route.ts`
- 로컬 SQL: `supabase/migrations/20261027042907_bnc_analysis.sql` — CLI `migration new`로 생성, 운영 미적용. 운영의 분석용 2개 표는 0개임을 읽기 확인했습니다.

## 이번 구현

1. 회원 인증·기존 프로그램 권한을 통과한 세션의 자료만 처리합니다. 프로필은 받은 본인 글의 자료 ID 1~20개를 서버에서 읽으며, 같은 블로그·본인 소유·남은 수명을 확인합니다. 최근 글 전체를 자동 수집한 것으로 표시하지 않습니다. 글 10개 미만이면 자료 부족에 따른 잠정 초안이고, 각 글은 최대 4,000자 발췌와 원문 분량/잘림 여부를 구분합니다.
2. 프로필 초안은 주제·관심사·독자층·문체·실제 표현·키워드와 근거 원문 ID/짧은 인용을 반환합니다. 인용이 입력 원문에 없거나 다른 자료의 ID면 거절합니다. 외부 글의 명령을 따르거나 도구/URL을 실행하지 않도록 자료와 시스템 지시를 분리합니다. AI 결과의 사실 정확성을 보장하는 검증은 아닙니다.
3. 회원이 초안을 확인·수정하고 원하는 주제/제외 주제·지역·규모·말투 예시를 확정해야 후보 평가를 시작합니다. 원래 AI 결과와 회원 수정본을 구분해 보관하고, 수정 시 revision을 올립니다.
4. 후보는 회원이 사용 권한을 확인해 제공한 네이버 글 본문만 받습니다. 블로그당 3~5개, 요청 전체 3~20개 글(최대 6개 블로그), 본문 합계 최대 60,000자입니다. 본인 블로그·중복 글·외부 도메인·요약 전용 입력을 거절합니다. 이번 구현에는 검색 API 호출이나 타인 글 자동 수집이 없습니다.
5. 후보별 **잠정 주제 적합도** 0~100, 이유, 실제 인용 근거를 반환합니다. 활동은 `unverified`, 이웃 관계는 `unknown`, 종합 점수는 `null`로 서버에서 고정합니다. 광고 비율·활동량·관계를 실제 관찰했다고 표시하지 않습니다. 전체 종합 점수/자동 선별 완성이 아닙니다.
6. 후보 선택도 서버에 저장합니다. 프로필 수정 후에는 기존 평가를 `profileStale=true`로 표시하고 선택을 막습니다. 선택 결과는 이웃 신청·공감·댓글 허가가 아니며 외부 동작은 0입니다.

## 키·모델·비용 경계

- 루트 `TOP_RULE_PERSONAL_ACCOUNT_API.md`와 이미 승인된 플랜 §3에 따라 **기존 `user_api_keys`의 로그인 회원 본인 키 재사용**을 적용했습니다. 로컬 운영자 `OPENAI_API_KEY`를 찾거나 새 키를 발급/저장하지 않습니다. 키가 없으면 등록 안내만 반환하며 운영자/다른 회원 키로 폴백하지 않습니다.
- OpenAI·Anthropic·Gemini 중 요청별로 공급자/모델을 명시합니다. 프로필/후보는 서로 다른 모델을 고를 수 있습니다. `externalAiConfirmed=true`가 필요합니다. 네이버 글 읽기 동의만으로 외부 AI 전송을 허용하지 않습니다. 실제 화면의 모델·비용 안내와 별도 동의 UI는 후속입니다.
- `memberApiKeys.ts`는 루트 `lib/apiKeys.ts`의 정확한 사본, `models.ts`는 `web-crawler/webapp/src/lib/ai/models.ts` 사본입니다. OpenAI 파라미터는 공용 기준 `naver-blog-seo-studio/lib/ai/openaiRequestParams.ts`의 정확한 사본을 등록했습니다. 기준/기존 사본은 수정하지 않았습니다. 무료호환 공급자 G-1은 이번 연결하지 않았습니다.
- 고정 공급자 URL만 호출하고 리디렉션/재시도 없이 최대 45초 1회, 출력 6,000토큰 상한입니다. 공급자 응답은 최대 256KiB, 최종 JSON은 64KiB로 제한합니다. 키는 요청 헤더에만 사용하고 프롬프트·저장·로그·응답에 넣지 않습니다. 공급자 오류 원문도 반환하지 않습니다.
- 현재 모델 목록은 기존 기준을 재사용한 것입니다. 루트 모델 검사에서 기존 OpenAI 17개 시험 통과 기록은 확인했지만 **이번 공급자 호출·현재 모델 생존/실제 품질을 새로 검수한 것은 아닙니다.** 새 모델 추가/공급자 실검수는 비용 범위를 먼저 정한 뒤 진행합니다.

공식 형식 참고(이번 API 연동 검토): [OpenAI Chat](https://developers.openai.com/api/reference/resources/chat), [Gemini generateContent](https://ai.google.dev/api/generate-content), [Anthropic 공식 예제](https://github.com/anthropics/skills/blob/main/skills/claude-api/curl/examples.md), [Supabase DB 함수 권한](https://supabase.com/docs/guides/database/functions). 실제 공급자 테스트는 아래의 가상 응답 검사와 구분합니다.

## 중복 과금·소유자·수명

- 새 표는 `bnc_analysis_jobs`/`bnc_analysis_sources` 2개입니다. 기존 소통 작업 표는 외부 글쓰기 상태/할당량을 다루므로 AI 분석 작업에 혼용하지 않았고, 본인 글만 받는 reader 자료 표에는 후보 글을 섞지 않았습니다.
- 모든 새 표 RLS, 회원/anon 직접 접근 없음. 빈 `search_path`·`SECURITY INVOKER` RPC는 서비스 역할만 실행합니다. 회원 HTTP에는 prepare/claim/complete/uncertain/cleanup 내부 명령을 열지 않습니다.
- 요청 UUID + 입력 해시를 저장하고 실행 토큰 해시로 원자적으로 선점합니다. 같은 요청의 성공 결과는 재사용하고, 여러 서버의 동시 요청 중 한 번만 AI를 호출할 수 있습니다. 입력을 바꾸어 같은 ID를 쓰면 거절합니다.
- 응답 유실·잘린/잘못된 AI JSON·출처를 조작한 인용·저장 실패는 `uncertain`입니다. 실행 중 멈춘 작업도 2분 후 불확정으로 표시하고 자동 재선점하지 않습니다. 실제 과금 여부를 보장하는 상태는 아닙니다. 사용자는 이전 상태를 확인한 뒤 새 요청을 명시적으로 선택해야 합니다.
- 키 미등록 등으로 대기 중인 작업은 본인만 취소할 수 있고, 실행 중 취소는 거절합니다. 동시 대기 상한은 5건이며 2분 지난 실행 작업은 새 작업 자리를 계속 점유하지 않습니다. 기존 불확정 작업 자체를 재실행하지는 않습니다.
- 실행 전과 결과 노출 전에 회원 권한을 다시 확인합니다. 생성 중 권한이 없어지면 결과는 본인 보관 기한 안에 저장하되 응답으로 노출하지 않습니다.
- 프로필은 원래 받은 글의 가장 빠른 만료일을, 후보 평가는 그 프로필과 제공 글의 가장 빠른 만료일을 상속합니다. 후보의 같은 글/내용 및 수정본도 최초 원본 생성시각·만료일을 유지합니다. 결과 확인/프로필 수정은 기한을 늘리지 않습니다.
- 기존 일일 `/api/cron/cleanup-reader`가 reader 정리 후 분석 자료도 정리하도록 **로컬 소스만** 연결했습니다. Cron 횟수는 추가하지 않습니다. 다음 배포 **전에 신규 SQL을 적용**해야 하며, 운영 현재 Cron에는 아직 이 변경이 없습니다. 운영 분석 자료 자동 삭제 실물은 미검수입니다.

## API 계약

`POST /api/analysis`, 같은 출처 JSON·회원 세션·no-store. 작업은 `list`, `get`, `profile`, `review_profile`, `candidates`, `select_candidates`, `cancel`입니다. 서버는 클라이언트 user_id/키/공급자 호출 URL/상태 주입을 받지 않습니다.

| 작업 | 주요 payload | 결과 |
|---|---|---|
| `profile` | `id`, `provider`, `model`, `externalAiConfirmed:true`, `materialIds`, `preferences` | 프로필 초안/근거·잠정 여부·수명 |
| `review_profile` | `id`, `revision`, `profile`, `preferences`, `confirmed:true` | 확인한 수정본·새 revision |
| `candidates` | `id`, `provider`, `model`, `externalAiConfirmed:true`, `profileId`, `profileRevision`, `rightsConfirmed:true`, `posts` | 제공 본문 기준 잠정 주제 점수·근거 |
| `select_candidates` | `id`, `blogIds` | 선택 기록, `externalActions:0` |
| `cancel` | `id` | 본인 queued 작업만 cancelled, 같은 ID 재선점 불가 |
| `list` / `get` | `{}` / `{id}` | 본인 유효 작업 요약 / 결과·프로필 변경 여부 |

`preferences`: `requiredTopics`, `excludedTopics`, `region`, `scale(any/small)`, `styleSamples`. `profile`: `topics`, `interests`, `audience`, `tone`, `phrases`, `keywords`. 후보 `posts` 항목은 `url`, `title`, `body`, `rightsConfirmed:true`입니다. 성공 응답은 `data`, 키 누락은 `needKey:true`·jobId, 불확정은 `GENERATION_UNCONFIRMED`·jobId를 반환합니다. 재시도 시 새 UUID를 자동 생성하면 안 됩니다.

## 검수

| 검사 | 결과 | 한계 |
|---|---|---|
| `npm test` | **70개 통과**(기존54 + 새16) | AI 공급자는 가상 fetch/응답, 실제 비용/품질 아님 |
| `npm run test:analysis-database` | **14개 통과**·실제 PostgreSQL17.11. 독립 연결40개 선점1, 실행토큰/소유자 경계, 수명/수정본·프로필 revision·선택, 핸들러→실SQL→가상AI 프로필/후보→재조회, 만료삭제, 발췌 분량 | 네트워크none·공개포트0·가상회원·운영 JWT 아님. [JSON](evidence/analysis-database-20261027.json) |
| `npm run test:http` | **25개 통과**·실제 루프백 Next production, 새 분석API 미로그인401/캐시금지·GET405 포함 | 가짜 공개키·실세션 없음. [JSON](evidence/analysis-http-20261027.json) |
| 타입·빌드·공용 사본 | 타입/최종 Next build·등록 사본9곳 동일·ZIP 원본7파일/버전 일치 | 운영 배포·UI/실제 AI 아님 |

검수 중 SQL JSON 연산자 괄호 누락을 고쳤고, DB 검수기가 초기 임시 Postgres를 준비 완료로 잘못 판단하는 경합을 고쳤습니다. 본인 글 발췌 여부와 후보 수정본 수명 상속도 보완했습니다. 로컬 DB 컨테이너·HTTP 서버는 종료했습니다. 기존 reader 실제 검수의 운영 본문은 이번 AI 검사에 사용하지 않았습니다.

## 다음 단계·미배포 대기

1. 정식 UI의 프로필 확인·수정, 모델/비용/외부 AI 동의, 후보 근거/미확인 정보/선택, 실패·불확정 상태 흐름을 시안에서 제시합니다. 4대 화면 3시안 사전 승인 규칙을 따르며 이번에 정식 UI를 임의 변경하지 않았습니다.
2. 다음 묶음 적용 때 신규2표/RPC SQL 검토·적용→운영 권한/수명 확인→기존 이름 수정과 함께 배포합니다. 아직 추가 SQL/빌드를 운영에 실행할 승인을 요청하지 않았습니다.
3. 회원이 고른 모델로 실제 AI 품질·현재 모델 호환을 최소 건수로 검수합니다. 비용 사전 승인·자료 외부 전송 동의가 별도 필요하며 새 키 발급은 필요하지 않습니다(시험회원 본인 등록 공급자3종 존재 여부만 확인).
4. 반복 자동읽기, 검색 요약에서 실제 후보 글 취득, 활동/관계 신뢰 근거, 종합 점수, 신청/수락·공감·댓글·답방·대댓글과 운영 정리는 후속입니다. 다른 세션의 워크스페이스/플래너·이미지 왕복은 제외합니다.

비용 리포트: **유료 AI 0·Vercel 빌드/배포 0·운영 스키마/회원키/권한 변경 0**. 무료 로컬 빌드3회, 격리 DB 검수6회(오류 수정/검사 추가 포함), 최종 단위70/DB14/HTTP25 통과. 버전v1.01 유지·미푸시·미배포 대기입니다. ZIP은 로컬 빌드의 타임스탬프로 바이트가 달라질 수 있으며 설치본과 운영 이름 반영은 기존 명칭 후속과 구분합니다.
