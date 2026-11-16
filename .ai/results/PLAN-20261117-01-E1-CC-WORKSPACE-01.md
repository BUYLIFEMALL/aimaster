# PLAN-20261117-01 E1 결과 — AI 업무 워크스페이스 확장 첫 묶음 (CC-WORKSPACE-01)

- 담당: Claude(Workspace) `CC-WORKSPACE-01` · 근거: 주인님 채팅 「추천안대로 E1부터 진행해」·「노션·오피스 추천 8개 중 넣을 것: 전부」(2026-11-17 KST), Master 확정 `msg_253d958c9004`
- 상태: **ready_review · 미배포**(공통지침 v1.4 작은 묶음) · 운영 DB·외부 연결·유료 호출·빌드 0
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
