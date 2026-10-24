# G-1 구현·검수 인수인계 — 공용 AI 공급자와 회원 키

2026-10-24 · Codex(윈도우·Edge) `codex-win-20261024-docbot-g1`.

**현재 상태: 소스 구현·로컬 검사와 운영 DB 준비까지 완료, 미배포. 2026-10-24 Edge 재시도로 관리자 로그인 상태의 설정/매뉴얼·공급자 선택·키 미등록 안내를 확인했습니다. 일반 회원 키 재사용·실제 AI 응답·좁은 화면 검수는 남아 있습니다.** G-2~G-5는 미착수입니다. 주인님의 「순서대로 한스텝 한스텝 진행」에 따라 G-1만 진행했습니다. 원래 [단계별 플랜·비용](PLAN_G1_G5_20261024.md)과 [공식 공급자 조사](OFFICIAL_PROVIDERS_20261024.md)를 함께 읽습니다.

## 1. 결과와 경계

| 대상 | 구현한 동작 | 유지·미작업 |
|---|---|---|
| 문서 챗봇 | 답변 공급자/모델 선택, 새 공급자로 웹 검색 판단용 비스트리밍 호출·답변 SSE, NDJSON 응답 계약, 답변 중단 버튼 | 기본 Upstage Solar 유지. 문서 읽기·1024차원 임베딩·기존 조각/소유권/30일 정리는 그대로 |
| AI Prompt | 내 템플릿의 실행 공급자/모델 선택·한 번 답변 받기 | 기본 Gemini 유지. 설계·변수 제안·AI 자동 채우기는 Gemini 전용. 실행 결과 스트리밍 UI는 이번 범위 아님 |
| 공용 키 | 두 앱의 기존 설정에서 동일 등록 부품과 `user_api_keys` 항목을 사용. 마스킹 조회·저장·삭제·본인 조건 | 앱별 키 사본·운영자 키 폴백·타 회원 키 재사용 없음. 회원 권한을 합치지 않음 |
| 공급자 | Groq `openai/gpt-oss-20b`/`120b`, OpenRouter 고정 `meta-llama/llama-3.3-70b-instruct:free`, Cloudflare 지정 모델 2개 | NVIDIA는 운영 이용 조건 확인 전 비활성. 임의 URL·미허용 모델·유료 자동 전환·재시도 없음 |

FREE Prompt 회원이 유료 문서 챗봇 권한 때문에 키를 등록하지 못하는 문제를 피하려고, **같은 공용 UI/저장소를 두 앱 설정에 각각 연결**했습니다. 원안의 ‘챗봇 설정 한 곳만 등록’에서 이 부분을 보완했습니다. 메인 사이트 수정·배포는 추가하지 않았습니다.

새 AI로 일반 대화만 할 때는 「내 문서 참고」를 끄면 Upstage 키를 요구하지 않습니다. 문서 참고를 켜면 Upstage, 웹 검색에는 Tavily 본인 키가 따로 필요합니다. 질문·이력·참고 자료가 선택한 공급자에게 전달된다는 안내를 표시합니다.

## 2. 기준·사본과 연결 파일

- 기준: `ai-doc-chatbot/src/lib/compatibleChat/{config.ts,transport.ts,keyStore.ts,ProviderSelect.tsx,ProviderKeys.tsx,ProviderGuide.tsx}`.
- 사본: `ai-prompt-studio/src/lib/compatibleChat/`의 같은 6개 파일. 테마는 `dark` 인자만 다르게 전달합니다.
- 공용 API 부품: 두 앱 `src/app/api/settings/compatible-keys/route.ts`. 각 앱의 로컬 권한 검사·서버 DB 클라이언트를 사용하며 다른 앱 API를 호출하지 않습니다.
- 문서 챗봇 연결: `src/app/api/chat/route.ts`, `(dashboard)/chat/page.tsx`, `settings/page.tsx`, `guide/page.tsx`. `upstage.ts`는 기존 답변 호출에 취소 신호 인자만 추가했습니다.
- Prompt 연결: `src/app/api/templates/execute/route.ts`, `ApiKeyModal.tsx`, `templates/PromptExecuteModal.tsx`, `TemplatesView.tsx`.
- 공급자 원문 오류·키 값은 새 모듈 오류 응답에 포함하지 않습니다. SSE 한글 조각·CRLF·종료 신호·본문 중단·빈 답변·401/403/402/429/5xx를 처리합니다. 별도 reasoning 필드는 답변에 섞지 않습니다.
- 새 공급자의 손상/잘린 스트림은 성공 반환하지 않아 답변 저장 단계로 넘어가지 않습니다. 실제 모델은 실행 응답/NDJSON `done`에 반환하지만, **이력 DB의 모델별 영구 기록은 추가하지 않았습니다**.
- 중단은 새 공급자 요청과 기존 Upstage 답변 호출에 전달합니다. 이미 시작한 문서 임베딩·Tavily 내부 요청까지 모두 취소하는 변경은 하지 않았습니다. 중단 전에 저장이 완료된 답변을 되돌리지는 않습니다.

기준만 고친 뒤 아래 명령으로 이 묶음만 동기화합니다. `--module`은 정확한 ID 또는 접두사를 선택하며, 지정하지 않은 프로그램은 수정하지 않습니다. 전체 검사의 기존 동작은 유지합니다.

```powershell
node scripts/check-shared-modules.mjs --module compatible-chat --sync
node scripts/check-shared-modules.mjs --module compatible-chat
npm --prefix ai-doc-chatbot test
```

## 3. 운영 DB 적용 증거

대상 ref **`esgxyikcnnvmlhygjkth`**, Lab 변경 없음.

- 적용: `g1_compatible_chat_keys`, 운영 마이그레이션 이력 **`20261024065908`**. [실행 SQL](../../ai-doc-chatbot/supabase/migrations/20261024065908_g1_compatible_chat_keys.sql).
- `user_api_keys_provider_check`의 **조회 시점 기존 식을 통째로 보존해 OR 확장**했습니다. 과거 목록으로 재작성하지 않습니다. 기존 식은 단일 PostgreSQL 배열 리터럴이므로 옛 마이그레이션의 ‘따옴표 안 값 추출’ 정규식을 그대로 재사용하면 잘못 해석할 수 있습니다.
- 추가 허용값: `groq`, `openrouter`, `cloudflare_workers_ai_token`, `cloudflare_account_id`.
- 적용 후 제약 `convalidated=true`, 기존 Upstage/Gemini/Tavily/apify/cronjob 항목과 새 4개 허용, `nvidia`/임의 항목 거절을 **회원 키 쓰기 없이 식 평가**로 확인했습니다.
- 카탈로그: `groq`·`openrouter`·`cloudflare_workers_ai` 활성, `nvidia_nim` 비활성. `ON CONFLICT DO NOTHING`으로 기존 행을 덮어쓰지 않습니다. 카탈로그 등록은 메인 사이트에 입력 화면을 자동 추가하는 작업이 아닙니다.
- 회원 키 행·기존 회원 자료·권한·RLS·문서 검색 함수는 수정하지 않았습니다. `user_api_keys` RLS 활성 확인. 앱 버전 DB 값도 올리지 않았습니다.
- 제약은 새 값이 이미 허용되면 재작성하지 않는 구조입니다. 테이블 잠금 2초·명령 15초 제한을 둡니다. 운영에서 재실행한 것은 아니므로 무조건 재실행하지 말고 이력부터 확인합니다.
- Supabase 보안 점검 실행: INFO 9건, WARN 25건(기존 백업 표 정책·함수 권한/검색 경로·유출 비밀번호 보호 항목). 이번 대상 표의 지적은 없었습니다. 다른 프로그램 정책은 수정하지 않았습니다. [정책 점검](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [함수 권한 점검](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
- 공식 [upsert 문서](https://supabase.com/docs/reference/javascript/upsert)와 변경 기록을 확인했습니다. 2026-11-10 예정 [옛 TLS 암호군 종료](https://supabase.com/changelog/cbc-tls-ciphers-deprecated)는 현재 Node/Edge의 새 호출 계약 변경 사유가 아니며, 키/인증 설정을 초기화하지 않았습니다.

## 4. 검수 결과

| 검사 | 결과 | 한계 |
|---|---|---|
| 기존 회귀 + 신규 모듈 시험 | **65/65 통과**. 기존 33 + 두 앱 실제 사본 각각 16개 | 가짜 fetch/DB를 통한 호출·소유권 검사. 실회원 E2E와 구분 |
| TypeScript | 두 앱 `tsc --noEmit --incremental false` 통과 | 실제 공급자 응답 확인 아님 |
| 로컬 운영용 빌드 | 문서 챗봇 → Prompt 순서로 2개 모두 통과 | Vercel 배포 없음 |
| 공용 사본 | 6개 모듈 + 키 API, 7/7 동일 | 해당 묶음만 검사 |
| 로컬 실제 HTTP | 두 앱 키 GET/POST/DELETE, 챗봇 POST, 템플릿 실행 POST, 총 8개 모두 비로그인 401·키 미노출 | 로그인 후 기능·키 재사용 검수 남음 |
| Edge 실제 창 | **재시도 성공**: 관리자 로그인으로 두 앱 키 설정·챗봇 매뉴얼/공급자·Cloudflare 키 미등록 안내 확인 | 최초 포커스 실패는 아래 재시도 기록으로 보완. 일반 회원·좁은 화면·실제 응답은 미검수 |
| 외부 AI 실호출 | 0회 | 시험 회원 `buylifemall@naver.com`의 새 공급자 키 미등록(키 원문 조회 안 함) |

## 5. 다음 첫 단계와 비용

1. Edge 제어는 아래 재시도로 확인했습니다. 현재 로컬은 관리자 `buylifemall@gmail.com` 로그인 상태이며, 일반 회원 검수에는 시험 회원으로 전환하고 새 공급자 본인 키가 필요합니다. 키는 화면에서만 등록하고 비밀번호/키를 문서·채팅에 남기지 않습니다. 챗봇 `http://localhost:4311/settings`, Prompt `http://localhost:4312`입니다.
2. 본인 새 공급자 키로 키 등록→다른 앱 등록 상태 재사용→일반 질문/스트리밍·중단→잘못된 키/한도 안내→기존 Solar/Gemini/문서 근거 회귀를 확인합니다. 운영 장애를 일부러 만들거나 과도한 실제 요청으로 429를 유발하지 않습니다.
3. 미검수인 공급자는 각각 미검수로 남깁니다. 본인 키가 없는 공급자를 운영자 키로 시험하지 않습니다. 매뉴얼·키 폼·실행 선택 UI의 데스크톱/좁은 화면 확인도 남았습니다.
4. 이후 G-2로 넘어가기 전 **커스텀 봇 위치**를 확정합니다(문서 챗봇 추천 / Prompt / 두 앱 연결). G-5의 보류/연결 시제품/정식 통합도 별도 선택 대기입니다.
5. 원래 G-1~G-4 묶음 계획에 따라 앱당 한 번·총 2회 배포합니다. 실제 배포 직전 최신 대기 목록·버전·팀 빌드 상태를 확인하고 순차 진행합니다.

**배포: 미배포 대기(기존 단계별 묶음 계획).** 소스 버전 문서 챗봇 v1.07·Prompt v1.09 유지. 다음 실제 배포 때 각각 +0.01(현재 기준 v1.08/v1.10 후보), 코드·DB·프로그램 비교표를 맞춥니다. 다음 CLI는 버전이 그사이 바뀌지 않았는지 다시 확인합니다.

**현재 사용량·종료 비용:** 외부 AI 0회(과금 0원)·수동 Vercel 배포 0회·로컬 빌드 2회(무료). 코드 `2d56a117b`와 등록/인계 `1d3c28f60`는 원격 반영했습니다. 마지막 묶음 푸시의 메인 Git 연동 1건(`dpl_HjpoejHJoMvHXuTK43751zpYLEtz`)은 **CANCELED(건너뜀)** 확인. 이 취소 건도 배포 한도/동시 빌드 자리 사용 1건으로 셉니다. 청구 금액을 빌드 상태만으로 확정하지 않습니다. 종료 메모는 추가 푸시를 만들지 않고 다음 작업 푸시에 묶습니다.

DB는 기존 운영 프로젝트의 제약/카탈로그 준비와, 저장소 지침의 `node scripts/pending-check.mjs --publish`로 관리자 미배포 현황(`site_settings.ops_overview`)을 갱신했습니다(운영 ref `esgxyikcnnvmlhygjkth`, 저장 성공). 향후 실호출은 원래 전체 예산(텍스트 ≤10회, 임베딩 ≤3요청, PDF1쪽 ≤1요청, API 실비 ≤1,000원)에서 누적 관리하고, 배포 빌드는 총 $0.20 상한을 유지합니다.

## 6. Edge 재시도 기록 — 2026-10-24

주인님 「엣지 띄워놨어」「다시 해봐」 후 실제 Edge 창(`msedge`, window-id `656848`)에서 진행했습니다. `orca computer`의 `--restore-window`를 붙인 Return 입력으로 로컬 로그인 화면 이동에 성공했고, 이어 관리자 계정의 설정 화면 로그인을 확인했습니다. **설치/권한 부족이나 제품 코드 오류가 원인이라고 확정하지 않습니다.** 직전 `window_not_focused`와 보조 실행 정책 차단은 과거 시도 기록입니다.

- 확인한 것: 문서 챗봇 설정의 기존 키 마스킹·추가 공급자 입력란, 새 연결 매뉴얼의 실제 펼침과 4단계/공식 콘솔 링크/NVIDIA 운영 대기 안내. 공급자 메뉴에 기존 Upstage + 활성 3개가 있고 NVIDIA가 없는 것을 확인했습니다.
- Cloudflare 선택 후 질문 전송에서 **‘본인 키와 계정 ID를 등록해 주세요’ 및 ‘키 등록하러 가기’**가 실제 화면에 표시됐습니다. 외부 AI 응답을 성공한 것으로 기록하지 않습니다. 키 조회/검증이 대화방 생성보다 먼저인 서버 경로이며, 키를 등록·삭제하거나 기존 키를 바꾸지 않았습니다.
- Prompt 새 탭에서 동일 관리자 로그인으로 공용 키 모달을 열어 Gemini와 추가 공급자 4항목·매뉴얼이 표시되는 것을 확인했습니다. 이 상태는 키 등록 UI 확인이며, 저장/앱 간 실제 키 재사용 성공을 의미하지 않습니다.
- 클릭/키 입력은 도구의 `ok`만으로 성공 판정하지 않고 반환된 접근성 트리와 실제 스크린샷을 대조했습니다. 동작 직전 새 상태에서 요소 번호를 얻고, 실제 창 조작에는 `--restore-window`를 사용합니다. 열린 선택 메뉴에서 창을 다시 복원하면 메뉴가 닫히며 번호가 달라질 수 있습니다.
- 조작 중 입력 문구/선택값 변화가 관찰되어 키보드·마우스 동시 조작을 잠시 멈춰 달라고 안내했습니다. 선택 동작 중 일시적인 공급자/모델 표시 차이는 자동 조작/동시 입력 영향과 분리해 추가 재현이 필요하므로 제품 버그로 확정하거나 코드 수정하지 않았습니다.
- 현재 열린 화면은 **Prompt의 공용 키 설정 모달**입니다. 주인님께 시험 회원으로 전환해 본인 키 등록 / 현재 본인 계정 직접 등록 / 키 발급 안내 필요 중 선택을 요청했습니다. 관리자 키를 다른 회원을 위한 대체 키로 사용하지 않습니다.
- 이번 재시도: **소스 변경 없음·AI 외부 호출 0·배포/빌드 0**, DB 설정/회원 키 쓰기 없음. 기존 65개 시험과 빌드는 코드 변경이 없어 다시 돌리지 않았습니다. 일반 회원/FREE 권한·키 저장/재사용·실제 응답/중단·좁은 화면은 남겨 둡니다.
