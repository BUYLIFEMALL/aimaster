# U6 — AI 회의록 열기 (상세 플랜)

- 상위 플랜: [PLAN_20261024_EXPANSION_ROADMAP.md](PLAN_20261024_EXPANSION_ROADMAP.md) §5 U6 · 작성 2026-10-24 · Claude Code(윈도우) `claude-win-20261024-workspace` [역할: workspace]
- 대상: ① AIMaster 운영 · 현재 v1.11 · 공용 DB ref `esgxyikcnnvmlhygjkth` · **DB 표 구조 변경 없음**
- 최상위 규칙: 요약·음성 파일 받아쓰기는 회원 본인 AI 키만 쓴다. 키 없으면 등록 안내, 다른 키로 대신하지 않는다.

## 1. 지금 상태 (2026-10-24 코드 조사)

| 항목 | 지금 | 근거 |
|---|---|---|
| 회의록 블록 | 「AI 회의록」 블록은 있음. 메모 칸만 쓰고 「받아쓰기 시작」은 1단계 안내(「다음 단계에서 열립니다」) | `web/features/meetings/MeetingNotes.block.tsx` (`MEETINGS_AI_OPEN = false`, `web/features/ai/aiApi.ts`) |
| 실시간 받아쓰기 | 원본에 **브라우저 받아쓰기(Web Speech API)** 가 이미 있음 — 크롬·엣지에서 마이크 소리를 실시간 글자로, 침묵·1분마다 자동 재시작. 우리 서버·AI 키 비용 없음 | `web/features/meetings/speech.ts` |
| 서버 흐름 | 시작·이어 적기·일시정지·정지·요약 명령이 모두 있음(`meetingStart`·`meetingAppend`·`meetingStop`·`meetingSummarize` 등) | `server/api/modules/meetings.ts`, `server/meetings/model.ts` |
| AI 요약 | 정지하면 받아쓴 글·메모·회의 종류별 지시문으로 요약(제목·요점·「- [ ] 할 일 @이름」, 받아쓴 줄 인용 칩). 회원 키로 동작, 키 없으면 등록 안내 | `server/meetings/summary.ts`, `instructions.ts` |
| 닫혀 있는 곳 | 단계 정책이 `meetingStop`·`meetingSummarize`·`meetingUploadAudio`·`meetingRetryTranscription`을 막음 | `src/server/stagePolicy.ts` 30줄 |
| 음성 파일 받아쓰기 | 받아쓰기 제공자를 끼우는 자리(`registerSttProvider`)만 있고 **원본에는 제공자가 없음** → 지금은 「받아쓸 수 없음」 | `server/meetings/audio.ts` |
| 받아쓰기 언어 | 브라우저 언어(`navigator.language`)를 따름 — 한국어 브라우저면 `ko-KR` | `speech.ts` 189줄 |
| 화면 문구 | 회의록 블록에 원본 영어 문구가 남아 있음(「Here’s the flow…」, 「AI 비서 turns your notes…」 등) | `MeetingNotes.block.tsx` 317줄 등 |

## 2. 단계 나누기 (추천: A 먼저 배포, B는 A 운영 확인 뒤)

### U6-A 실시간 받아쓰기 + AI 요약 열기 (비용 거의 없음)
1. `MEETINGS_AI_OPEN = true`, 단계 정책에서 `meetingStop`·`meetingSummarize` 열기(음성 파일 두 명령은 B까지 계속 닫음).
2. 받아쓰기 기본 언어를 한국어로: 회의 언어가 「자동」이면 `ko-KR`(브라우저가 영어여도 한국 회원 기준). 회의록 블록의 언어 고르기는 그대로.
3. 회의록 블록 화면 문구 한국어화(사용 흐름 안내 1-2-3단계, 받아쓰는 중·일시정지·정지·요약 중·실패 문구, 마이크 권한 안내) — 번역 파일 `i18n.ko-KR.json`에 키 추가.
4. 지원하지 않는 브라우저(파이어폭스·일부 사파리) 안내: 「크롬·엣지에서 실시간 받아쓰기를 쓸 수 있습니다. 이 브라우저에서는 메모만 적고 요약할 수 있습니다」.
5. 요약 모델: 「자동」이면 회원의 자동 제공자 기본 모델(Gemini는 Flash-Lite) — 지금 구조 그대로. 요약 지시문에 당해 연도·한국어 답변 기준 블록이 들어가는지 확인(U3 `aimasterContextText()`).
6. 개인정보 안내 한 줄(회의록 블록·매뉴얼): 「실시간 받아쓰기는 브라우저(구글·마이크로소프트)의 음성 인식을 씁니다. 참석자에게 녹음·받아쓰기 사실을 알려 주세요.」

### U6-B 음성 파일 받아쓰기 (회원 본인 키, A 운영 확인 뒤)
- 제공자 1순위 **Gemini**(회원 다수가 가진 키): 큰 파일은 `ai-audio-analyzer`의 검증된 방식 그대로 — 서버가 회원 키로 Google 파일 「이어 올리기」 주소를 받아 브라우저가 Google로 직접 올림(키는 서버에만, Vercel 본문 4.5MB 한도 우회, 최대 100MB) → 파일 주소로 받아쓰기(말한 사람 구분·시각 포함 JSON). 기준 코드: `ai-audio-analyzer/src/lib/geminiFiles.ts`·`app/api/upload/start/route.ts`(사본으로 가져옴, 공용 기준 코드 후보).
- 2순위 **OpenAI**(`gpt-4o-mini-transcribe`): 브라우저 직접 업로드가 안 돼 4MB 이하 파일만(약 4분 MP3). Claude 키만 있는 회원은 음성 파일 받아쓰기 불가 안내(실시간 받아쓰기는 됨).
- 음성 파일은 처리용 자료라 원본 규칙대로 받아쓰기 성공 뒤 바로 삭제(실패 시 최대 3일). Google에 올린 파일도 처리 뒤 삭제.
- 단계 정책에서 `meetingUploadAudio`·`meetingRetryTranscription` 열기.

### 30일 규칙
- 받아쓴 글·요약은 회원 페이지 안의 업무 자료(AI가 만들어 준 페이지와 같은 취급)라 30일 삭제 대상이 아니다. 음성 파일은 위처럼 즉시 삭제.

## 3. 검수
- **무료**: 타입 검사, 원본 서버 시험 522개(회의록 시험 포함 — 바뀌는 기대값만 고침), 연결부 시험(단계 정책이 A 두 명령을 열고 B 두 명령은 닫는지), 로컬 빌드.
- **크롬(실제 화면)**: 시험 계정으로 회의록 블록 → 받아쓰기 시작(마이크 권한은 주인님이 허용) → 한국어로 몇 문장 → 정지 → 요약·할 일·인용 칩 확인 → 휴대폰 폭. 시험 페이지는 휴지통으로.
- **유료 시험**: A는 요약 3회(시험 계정 본인 Gemini 키, Flash-Lite — 1원 안팎). B는 짧은 음성 파일 2회(Gemini 1·OpenAI 1).

## 4. 비용
| 구분 | 항목 | 내용 |
|---|---|---|
| 개발·시험 | Vercel 빌드 | A 1회, B 1회(수정 필요하면 각 +1) — 배포 직전 승인 범위 |
| 개발·시험 | 유료 AI 시험 | A 요약 3회 + B 받아쓰기 2회, 모두 시험 계정 본인 키·가장 싼 모델(합계 수십 원 이하) |
| 운영자 인프라 | 없음 | 실시간 받아쓰기는 브라우저 기능, 음성 파일은 Google로 직접 올라가 우리 서버 용량·트래픽 거의 없음 |
| 회원 부담 | AI 사용료 | 요약·음성 파일 받아쓰기는 회원 본인 키로 청구(Gemini Flash-Lite 기준 1시간 회의 요약 수 원 수준, 음성 파일 받아쓰기는 분량에 비례) |

## 5. 버전·배포·문서
- A: v1.12 바로 배포(회원 기능 열기 — 다음 단계 B의 전제), B: v1.13.
- 문서: IMPROVEMENTS·BACKLOG·AGENTS·README, 사용 매뉴얼(`/guide`)에 「AI 회의록 쓰는 법」(Step 1~4, 브라우저·개인정보 안내 — 매뉴얼 표현은 디자인 역할과 조율), 프로그램 비교표, 메인 사이트 상세 소개(회의록 추가 — 저장 전 백업), 역할 파일·HANDOFF.

## 6. 주인님 결정이 필요한 것
1. A(실시간 받아쓰기 + 요약)만 먼저 하고, B(음성 파일)는 A 운영 확인 뒤로 나눌까요? — **추천: 나누기**
2. 음성 파일 받아쓰기 제공자를 Gemini 우선(큰 파일 가능)·OpenAI 보조(4MB 이하)로 할까요? — **추천: 그렇게**
