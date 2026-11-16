# PLAN-20261117-01 E1 결과 — AI 업무 워크스페이스 확장 첫 묶음 (CC-WORKSPACE-01)

- 담당: Claude(Workspace) `CC-WORKSPACE-01` · 근거: 주인님 채팅 「추천안대로 E1부터 진행해」·「노션·오피스 추천 8개 중 넣을 것: 전부」(2026-11-17 KST), Master 확정 `msg_253d958c9004`
- 상태: **Master done(2026-11-17 `msg_85c696eb8dbd`, 배정 구현·독립 보안 검수 범위) · 미배포**(다음 묶음 배포) · 운영 DB·외부 연결·유료 호출·빌드 0. 한계 유지: 실제 발송·모의 모델 E2E·운영 배포 아님, 선점 뒤 자식 생성 실패 시 재시도 없음, `executeRun` 같은 runId 이중 실행(다른 도구) 미해결
- 독립 검수: Master 지정 MacCodexTester `QA17-003`(아래 6절이 인계 자료)

## 1. 완료 조건 대조
| E1 항목(플랜 4절) | 결과 | 커밋 |
|---|---|---|
| 주간 요약 | 에이전트 템플릿 「🗞️ 월요일 주간 요약」(월 08:00) + 새 도구 `notify_me`(에이전트 주인 본인 메일·카카오톡) | `6e9d07f1c` |
| 회의록 → 에이전트 | 엔진에는 「AI 회의록 요약 완료」 트리거가 이미 있었음 → 「회의 준비·정리」 템플릿으로 만들면 **만든 사람의 회의록에서만** 도는 트리거 자동 추가 | `6e9d07f1c` |
| 시간 기록 | 데이터베이스 템플릿 「⏱️ 작업 시간 기록」 — 작업 시간(시각 범위) → 걸린 시간(0.1시간)·청구 금액 수식, 고객별 보드·달력. 템플릿 규격에 수식 속성·시각 범위 예시 행 추가 | `0da321e33` |
| 폼 조건부 질문 | **이미 동작** — 편집 「조건 만들기」, 렌더러 `FormRenderer.tsx` 234줄, 서버 `forms.ts` 227줄(숨은 질문은 검사·저장 안 함), 공개 폼도 같은 `submitFormResponse`. 원본 시험 `shared/form/form.test.ts` 7/7 → 코드 변경 없음 | — |
| 블로그 채널 이름표 | 콘텐츠 캘린더 채널 「티스토리·워드프레스·구글 블로그」(예전 「기타」), 기존 회원 표는 CSV 합치기가 새 선택지 자동 추가(`import.ts` 428줄) | `6e9d07f1c` |
| 개선 문서 표 정정 | `docs/IMPROVEMENTS.md` §1 옛 상태(AI 키·초대·저장소·알림) 실제로 정정, 미배포 대기 기록, `docs/WORK_INBOX.md` 채널 표 | 문서 커밋 |

## 2. 설계 판단(안전)
- `notify_me`: 받는 사람 = `owner_id ?? created_by_id`(에이전트 주인) 고정, 채널은 `email`·`kakao`만, 한 실행 한 번 + 에이전트당 시간당 10회, 링크할 페이지는 실행자가 열 수 있어야 함. 실제 발송·하루 100건·중복 1분·실패 앱 알림은 기존 `src/server/externalNotify.ts`(회원 본인 메일 계정·카카오 연결) 그대로 — 새 키·새 연결 없음. 엔진 쪽은 `sendExternalNotify` 내보내기만 추가(`automations/engine.ts`).
- 회의록 트리거 `user_filter: [만든 사람]` — 같은 워크스페이스 다른 사람이 회의록을 만들어 주인 AI 키 비용이 나가는 일 방지. 만든 사람을 모르면 트리거 안 걺.
- 템플릿 규격 확장은 추가만(기존 템플릿 동작 같음 — 전체 시험 통과).

## 3. 검증
- 시험 DB `aww-pg-test` 다른 접속 0·vitest 0 확인 뒤 실행.
- 새 시험 `tests/integration/agentE1.test.ts` 9개: 주간 요약 트리거(월 08:00), 회의록 트리거(만든 사람만, 모르면 없음), 다른 템플릿 불변, `notify_me` 목록 포함·주인 1명·채널 중복 제거·한 번만·owner 없으면 만든 사람·열 수 없는 페이지/잘못된 채널/빈 내용 거부·실패 사유 오류 반환·발송 경로 없으면 오류, 작업 시간 템플릿 예시 행(09:00~11:30·3만 원) → **2.5시간·75,000원**(실제 템플릿 생성 + 수식 엔진 계산).
- `tests/integration/workInbox.test.ts` 채널 3종 그대로 들어감.
- **전체 시험 29파일 225/225**, `npx tsc --noEmit` 0.

## 4. 함께 처리(별도 ID)
- WS-20261117-10 1단계 `ad65c8ac5`: 보기 탭이 저장된 이름 그대로 표시(8150da176의 기본 이름 표시 번역 되돌림, 회원 「Table」 보존). 2단계(서버 기본 이름 현지화)는 Master 지시로 보류.

## 5. 한계·미검수
- 실제 화면·실제 발송 미검수(미배포): 템플릿 선택 화면에 새 템플릿 2개가 보이는지, 에이전트가 실제로 `notify_me`를 한 번 부르는지(AI 모델 판단), 메일·카카오톡 실제 수신.
- 타이머 「시작/정지」 버튼은 템플릿 규격이 버튼 속성을 아직 지원하지 않아 미구현(지금은 날짜 칸에 시각 입력) — E2 후보.
- 회원 AI 비용(주간 요약 에이전트 실행)은 미측정.

## 6. MacTester(QA17-003) 인계 — 재현 방법
- 소스 기준: `6e9d07f1c`·`0da321e33`·`ad65c8ac5`(+ 앞선 미배포 `90612778f`·`8150da176`).
- 로컬: `cd ai-work-workspace && npx vitest run --config tests/vitest.config.mjs integration/agentE1.test.ts integration/workInbox.test.ts`(점유 확인 필수), 폼 조건 `npx vitest run src/litpage/shared/form/form.test.ts`.
- 화면 확인 순서(배포 뒤 또는 로컬 dev): 에이전트 「+ 새 에이전트 › 템플릿」에 「🗞️ 월요일 주간 요약」, 「🗓️ 회의 준비·정리」로 만든 에이전트의 트리거 2개(정시 없음·회의록 요약 1개, 실행 대상 = 만든 사람) / 템플릿 갤러리 「⏱️ 작업 시간 기록」 → 예시 행 걸린 시간 2.5·청구 금액 ₩75,000 / 받은 업무 → 채널 「티스토리」 발행 기록 → 캘린더 채널 「티스토리」 / 보기 탭 이름을 「Table」로 바꿔 ko·en 화면 모두 「Table」.
- 실제 발송 시험은 시험 계정 본인 메일 계정·카카오 연결이 필요(운영 키·실발송은 Master·주인님 승인 범위).

## 비용
없음(빌드 0·AI 0·운영 DB 0·외부 호출 0).

## 7. 결함 수정 — notify_me 계보 1회 (Mac QA `msg_cd9ac04abae3`, Master 승인 `msg_cfa0dc4481e5`) · 커밋 `22177c868`
- 원인(경로 확인): 「허용」 다시 실행은 `api/modules/agents.ts` 618~624 `decideRunReview` → `enqueueRun`(새 runId, payload 복사), 같은 실행 이중 처리는 `runs.ts` `pump()`(메모리 대기열) — 메모리 플래그는 둘 다 못 막음.
- 수정: `runs.ts` `claimNotifyMe(runId)` — `agent_runs.payload`에 `notifyMeSent`를 `UPDATE … WHERE payload = 읽은 값`(NULL이면 `IS NULL`)으로 한 번만 기록, 다른 payload 칸 보존, 이미 있음·실행 없음·payload 못 읽음·5번 충돌·예외 → false(발송 0). 실행 맥락에 `claimNotifyMe` 연결(675줄). `tools.ts` `notifyMe`는 입력 검사 뒤·발송 전에 선점 성공일 때만 보냄 — **선점 함수가 없으면 보내지 않음(메모리 대체 없음, 시험 맥락은 「시험 전용 메모리 선점」을 명시)**. `decideRunReview`가 payload를 복사하므로 다시 실행이 `notifyMeSent`를 물려받아 계보 전체 1회.
- 정책: 선점 뒤 발송 실패 → 자동 재발송 0(중복보다 미발송). 실패 이유는 단계 오류·기존 외부 알림의 앱 알림(채널별 시간당 1회). 매뉴얼(`src/app/guide/page.tsx` 업무 비서 STEP 04)에 「한 번만·실패하면 다시 보내지 않음·이유는 알림함」 명시.
- 빨강→초록: 새 시험 4개(같은 실행 두 worker+다른 문구 / 보낸 뒤 「허용」 다시 실행 + 다른 payload 칸 보존 / 선점 뒤 실패 재발송 0 / 동시 선점 1·없는 실행 0·선점 함수 없는 운영 맥락 발송 0)가 **수정 전 4 실패** → 수정 후 통과. 관계없는 새 정시 실행 2개는 각각 1회(수정 전후 통과). 에이전트 시험 3파일 48/48, **전체 29파일 230/230**, tsc 0. 실제 발송·운영 DB 0.
- **범위 밖(알려진 위험)**: `executeRun`이 같은 runId를 두 프로세스에서 실행할 수 있는 구조 자체는 그대로 — 이번 수정은 notify_me 발송만 1회로 막은 것이며 다른 도구(페이지 쓰기·MCP 등)의 중복 실행을 해결하지 않음(MCP 쓰기는 기존 승인 CAS가 별도로 막음).

## 8. Tester 추가 요청 — notify_me 상위 검토·허용 정책과 링크 열람 범위 (Master `msg_52ec5062c28a`) · 읽기 조사, 코드 변경 없음
| 확인 | 근거(함수·줄) | 판정 |
|---|---|---|
| 상위 승인 정책 | `agents/runs.ts` 665~672 `approve()`: 대화형이면 `review_for_me`에서 `share`·`destructive`, `always_ask`면 전부 확인을 받음. 정시 실행(비대화형)은 666줄에서 전부 `accept`(모든 도구 공통 설계) | — |
| notify_me가 승인을 거치는가 | `agents/tools.ts` 257~276 `notifyMe`는 `env.approve`를 **부르지 않음**(외부 발송인데 위험도 표시 없음). `request_url_access`(327, `share`)·MCP(368)는 부름 | **빈틈 1**: 대화형 채팅에서 「항상 묻기」·「검토 후 실행」이어도 묻지 않고 메일·카카오톡을 보냄 |
| 링크 페이지 열람 | 264줄 `canRead(pageId, env.userId)` — `env.userId`는 에이전트 봇(`runs.ts` 651 `agent.bot_id`). 받는 사람(주인)의 열람은 확인하지 않음. 실제 메일 링크는 `src/server/externalNotify.ts` 157~159가 **페이지 제목을 주소에 넣어** 만듦 | **빈틈 2**: 봇은 열 수 있고 주인은 못 여는 페이지면 제목이 주인 메일·카카오톡으로 나감(비교: `send_notification` 294줄은 받는 사람별로 `canRead` 확인) |

**수정안(구현 전, 범위 `agents/tools.ts`·`tests/integration/agentE1.test.ts`)**
1. 페이지 확인을 「봇도 열 수 있고 **주인도 열 수 있어야**」로 바꿈(`canRead(pageId, owner)` 추가, 아니면 발송 0).
2. 선점(`claimNotifyMe`) **전에** `env.approve({ tool: 'notify_me', risk: 'share', payload: { title: '주인에게 메일·카카오톡 보내기', markdown: 채널·문구 미리보기, confirmLabel: '보내기' } })` — 거절·취소면 발송 0, 선점도 소비하지 않음. 대화형 `review_for_me`·`always_ask`는 확인을 받고, `skip_all`(관리자 허용 시)·정시 실행은 기존 정책대로 자동.
3. 순서: 입력 검사 → 페이지(봇·주인) → 승인 → 선점 → 발송.
4. 시험(실발송 0, 모의 handler): 대화형 `review_for_me`에서 승인 요청이 나오고 거절 시 발송 0·선점 안 됨 / 허용 시 1회 / 정시 실행은 승인 없이 1회 / 주인이 못 여는 페이지는 발송 0. 수정 전 빨강 → 후 초록으로 제출.

## 9. 보안 보완 구현 (Master `msg_9f35f4e64a6b` 승인) · 커밋 `ce458cc2a`
- `agents/tools.ts` `notifyMe` 순서: 입력 검사 → 페이지(봇 **그리고** 받는 주인 `canRead`, 주인 없음 → 0) → `env.approve({ tool: 'notify_me', risk: 'share', 채널·문구 미리보기, 확인 「보내기」 })` → 거절이면 발송 0·**선점 소비 0** → 발송 직전 열람 재확인(승인 대기 중 철회 대비) → 영속 선점 → 발송. 상위 정책(`runs.ts` 665~672: 대화형 `review_for_me`·`always_ask`는 묻고, `skip_all`·정시 실행은 자동)은 **변경하지 않음**. 번역 2줄(`i18n.literals.ko-KR.json`: 승인 제목·「보내기」 — 승인 범위 밖 사전 파일 2줄, 화면 한국어용).
- 빨강→초록: 새 시험 4개 수정 전 4 실패 → 후 통과(share 승인 요청·미리보기 / 거절 시 0·다음 허용 1 / 주인 못 엶·주인 없음 0·승인 묻지 않음 / 승인 대기 중 철회 → 0). 전체 29파일 **234/234**, tsc 0, 실발송 0.
- **한계(정직)**: 위 시험은 `notifyMe`가 실제 `env.approve`를 정확한 위험도로 부르고 결과를 지키는지까지다. **`runs.ts` `runModel`의 승인 함수(665~672)를 실제 모델 반복으로 돌린 통합 시험은 아님** — 저장소에 에이전트 대화를 모의 모델로 끝까지 돌리는 장치가 없음. 그래서 「대화형 review_for_me·always_ask·정시 전체 정책 통과」라고 주장하지 않음. 최소 보완안: `runs.ts`에서 승인 판정식만 `export function agentApprovalNeeded(r, approvalMode, interactive)`로 꺼내 클로저가 그 함수를 부르게 하고(동작 같음), 그 함수를 notify_me의 실제 요청 값으로 시험 — 범위 밖이라 승인 후.

## 10. 계보 동시성 추가 반례 조사 + 루트 실행 기준 선점 수정안 (Mac `msg_494116d1535e`) · 코드 전
- 도달 경로: 「허용」 자식은 `decideRunReview`가 `status='needs_review'`일 때만 만들고, 그 상태는 `executeRun` 끝(`runs.ts` 742·758)에서 기록 → **실행기 하나면** 부모가 끝난 뒤 자식이 생겨 순차(통과). **반례가 실제로 도달하는 경로**: 같은 runId를 두 프로세스가 실행(`pump()` 메모리 대기열, `executeRun` 433 무조건 running) → A가 needs_review로 끝나고 허용 → 자식이 `notifyMeSent` 없는 payload 복사 → 아직 도는 B가 부모 행에 선점 → 부모 true·자식 true. 즉 「payload 복사만으로 계보 1회」는 **보장 아님**(정정).
- 수정안(범위 `runs.ts` `claimNotifyMe`·`agentE1.test.ts`, 새 스키마 0): 선점 대상을 **루트 실행 행**으로. `parent_run_id`를 따라 올라가되 ① 부모가 **같은 agent_id·같은 space_id**일 때만 같은 계보(다른 에이전트 = `call_agent` 하위 실행 784줄 → 거기서 끊고 자기가 루트, 혼입 없음) ② 부모 id가 있는데 행이 없음 → false(fail closed) ③ 같은 agent인데 space가 다름 → false ④ 방문 집합으로 순환 → false, 깊이 32 넘으면 false. 루트 payload에 기존 CAS(읽은 값 조건 UPDATE, 다른 칸 보존, 5회 충돌 → false). 자기 행 payload에 `notifyMeSent`가 이미 있으면 false(기존 호환). 독립 정시 실행은 부모가 없어 각자 루트 → 각 1회.
- 시험 계획(빨강→초록): 부모 선점 **전에** 자식 행 생성 → 부모·자식 순서 둘 다 1회만 / 손자까지 1회 / 다른 에이전트 하위 실행은 따로 1회 / 부모 행 누락 0 / 순환 0 / 다른 space 0 / 독립 정시 2개 각 1회 / 다른 payload 칸 보존.
- 남는 위험(범위 밖): `executeRun` 이중 실행 자체는 그대로 — 다른 도구 중복은 해결하지 않음.

## 11. 계보 루트 선점 + 승인 판정 함수 (Master `msg_0ee3d7393621` 승인) · 커밋 `f2792fb2543520aaedc7fbc6b3277f231a3ce953`
- `agents/runs.ts` `readLineage`·`claimNotifyMe`: 자기 행에서 `parent_run_id`를 따라 올라가며 **같은 space 확인 후 같은 agent일 때만** 같은 계보, 다른 agent(`call_agent` 하위 실행)를 만나면 거기서 끊고 자기가 루트. 부모 누락·다른 space·순환(방문 집합)·깊이 32 초과·payload 읽기 실패·**계보 어느 행(자기·중간·루트)에든 기존 `notifyMeSent`** → false. 루트 행에 기존 CAS(읽은 값 조건 UPDATE / NULL은 `IS NULL`, 다른 칸 보존, 5회 충돌 재시도 후 false).
- **불변 근거**: `parent_run_id`·`agent_id`·`space_id`는 `insertRun`(INSERT)에서만 씀. `agent_runs` UPDATE는 `updateRun`(호출처가 넘기는 칸은 status·started/ended_time·error·result·steps 등, 위 세 칸 넘기는 호출 없음 — `grep "updateRun(.*(payload|parent_run_id|agent_id|space_id)"` 0건), 시간 초과 정리(status만), `consumeApprovedCall`·`claimNotifyMe`(payload만), `decideRunReview`(review·status), `triggers.ts` `markRetried`(payload만) — 세 칸을 바꾸는 문 없음.
- **덤으로 찾은 것(범위 밖, 보고만)**: `agents/triggers.ts` 490 `markRetried`는 payload를 **조건 없이 통째로 덮어씀**(막힌 멘션 실행에만 쓰여 그 실행은 도구를 돌리지 않아 notify_me 표시와 겹칠 일은 없어 보이나, 같은 행 동시 CAS가 있으면 덮일 수 있음).
- `agentApprovalNeeded(r, approvalMode, interactive)` export — `runModel`의 실제 `approve` 클로저가 `agentApprovalNeeded(r, approvalMode, !!opts.interactive)`를 부르도록 바꿈(예전 식 그대로, 동작 변경 없음).
- 시험(`tests/integration/agentE1.test.ts`) 새 7개 **수정 전 7 실패 → 후 통과**: 부모 선점 전 자식 생성 부모→자식 / 자식→부모+손자 / 부모·자식 동시 1개만 / 다른 space·부모 누락·순환·깊이 41 → 0 / 중간·자기 표시 → 0, 독립 정시 2개 각 1회, 다른 payload 칸 보존 / 클로저가 판정 함수를 부르는지 소스 확인 / notify_me 실제 요청값(`risk: share`)으로 행렬 — 대화형 review_for_me·always_ask true, skip_all false, 비대화형 3모드 false, 판정 「물음」에서 거절 → 발송 0·선점 0. (다른 agent 하위 실행 따로 1회는 수정 전에도 통과.)
- 명령: `cd ai-work-workspace && npx vitest run --config tests/vitest.config.mjs integration/agentE1.test.ts`(26/26), 전체 `npx vitest run --config tests/vitest.config.mjs` **29파일 242/242**, `npx tsc --noEmit -p .` 0. 실발송·운영 DB·빌드 0.
- **한계 유지**: 모의 모델로 `runModel` 전체를 돌린 E2E 아님(판정 함수 + 클로저 호출 소스 확인까지). `executeRun` 이중 실행 자체는 범위 밖.

## 12. markRetried 묵은 덮어쓰기 도달 경로 조사 (Master `msg_ade30da3c967`) · 읽기 조사, 코드 변경 없음
- 코드: `agents/triggers.ts` 469~487 `retryBlockedMentions` — 474 `status IN ('failed','pending','running')` 조회 → 478 `getRun`으로 payload 읽음 → 480 `blocked`·`retried` 확인 → 481 `markRetried(run.id, run.payload)` → 489~491 **조건 없는 `UPDATE … SET payload = 읽어 둔 값 + retried`** → 484 자식 `enqueueRun(parentRunId: run.id, 같은 agent)`. 호출처: `api/modules/agents.ts` 809(페이지 접근 권한 부여 API, 동기 처리).
- 막힌 루트가 스스로 선점할 수 있나: **없음** — `runs.ts` 412 `preflight`가 `payload.blocked`면 모델·도구를 돌리지 않고 바로 실패. 그래서 루트 행의 `notifyMeSent`는 **자식(재시도 실행)이 계보 루트로 올라와 기록**할 때만 생김.
- 묵은 덮어쓰기 성립 조건: 루트 payload를 읽은 뒤 쓰기 전에 다른 쪽이 루트에 `notifyMeSent`를 기록해야 함. ① **한 프로세스**: `retryBlockedMentions`는 동기 DB 호출만으로 끝까지 돌고(중간 await 없음), 자식은 `schedulePump`(setImmediate) 뒤에야 실행 → 같은 프로세스 안에서는 끼어들 수 없음 → **도달 안 됨**. ② **프로세스 여러 개**: 권한 부여 API 두 번이 거의 동시에 들어와 B가 `retried=false`인 payload를 읽고, 그 사이 A가 `retried`를 쓰고 자식1을 만들고 자식1이 모델 실행 뒤 루트에 선점, 그다음 B가 쓰면 → `notifyMeSent`가 지워지고 B도 자식2를 만들어 자식2가 다시 선점 → **2회 발송 가능**. 단 B의 읽기→쓰기 사이(밀리초)에 자식1의 모델 실행(초 단위)이 끝나야 하므로 B 프로세스가 수 초 멈춰야 하는 드문 경합. 같은 경합에서 **재시도 자식이 2개 생기는 문제**(멘션에 두 번 답함)는 훨씬 쉽게 생김(읽기 두 번이 쓰기 전에만 겹치면 됨).
- `approvedCalls`: 막힌 루트 payload에는 처음부터 없음(385줄 생성값: facts·blocked·mention) → 지워질 승인 키 없음. 영향은 `notifyMeSent`와 재시도 중복.
- **결론**: 「계보 전체 1회」는 **여러 프로세스 + 동시 권한 부여 + 프로세스 정지라는 경계까지는 남아 있음**(한 프로세스에서는 성립). 
- 수정안(범위 `agents/triggers.ts` `markRetried`·시험 1파일, 새 스키마 0): `markRetried`를 `claimRetry(runId): boolean`로 — 원문 payload를 다시 읽어 `retried`면 false, 아니면 `UPDATE … WHERE id = ? AND payload = 읽은 원문`(NULL은 `IS NULL`)으로 `{...최신 payload, retried: true}` 기록, 5회 충돌 → false. `retryBlockedMentions` 481을 `if (!claimRetry(run.id)) continue;`로 — 최신 payload를 합쳐 쓰므로 `notifyMeSent` 등 보존, 동시 호출은 한 쪽만 자식 생성. 시험: 루트에 `notifyMeSent`가 있는 막힌 행에 `claimRetry` → 표시 보존 / 두 번 호출 → 한 번만 true / 묵은 원문으로 쓰려 하면 0건(조건 불일치) / 다른 칸(facts·mention) 보존. 승인 후 진행.

## 13. 막힌 멘션 재시도 조건부 저장 (Master `msg_54873d545291` 승인) · 커밋 `93eabfc2e9f46e00f74f518b0c960049961b9243`
- `agents/triggers.ts`: `markRetried`(조건 없는 덮어쓰기) 삭제 → `export function claimRetry(runId)`: 최신 원문을 다시 읽어 `retried`면 false, 아니면 `payload = 읽은 원문`(NULL은 `IS NULL`) 조건으로 `{...최신, retried: true}`, 5회 충돌·없는 실행·JSON 아님·객체 아님·DB 예외 → false. `retryBlockedMentions` 481줄은 `if (!claimRetry(run.id)) continue;` — 성공한 쪽만 자식 생성. 낡은 입력 payload를 UPDATE에 쓰지 않음.
- 시험 새 파일 `tests/integration/agentRetryCas.test.ts`(실제 시험 DB, 모델·발송 없음 — 대기열 대신 기록만): ① 막힌 실행 읽기 직후 다른 worker가 재시도하고 자식이 루트 선점 → 처음 재시도 계속: **수정 전 자식 2개(실패 재현)** → 후 자식 1개·루트 `notifyMeSent` 보존·`retried`·facts·mention 보존·자식 추가 선점 false ② 정상 재시도 1회 → 자식 1, 다시 불러도 0, 다른 칸 보존(수정 전후 통과, 회귀) ③ `claimRetry`: 다른 쪽이 남긴 표시를 최신 재읽기로 보존·두 번째 false·없는 실행·배열 payload·깨진 JSON false(수정 전 함수 없음 실패).
- 명령: `cd ai-work-workspace && npx vitest run --config tests/vitest.config.mjs integration/agentRetryCas.test.ts`(3/3), 전체 **30파일 245/245**, `npx tsc --noEmit -p .` 0. 실발송·운영 DB·빌드 0.
- 기존 정책 영향: 표시를 먼저 남긴 뒤 자식 생성(`enqueueRun`)이 실패하면 그 멘션은 다시 재시도하지 않음 — 예전과 같은 순서(표시 → 생성)라 정책 변화 없음, 이번에 새 큐 보장은 넣지 않음.
- 남은 경계: 루트 선점 계보 1회는 이제 동시 재시도·낡은 덮어쓰기까지 막음. `executeRun` 같은 runId 이중 실행 자체(다른 도구)는 여전히 범위 밖. 깊이 32는 부모 링크 32개(=33행)까지 허용.
