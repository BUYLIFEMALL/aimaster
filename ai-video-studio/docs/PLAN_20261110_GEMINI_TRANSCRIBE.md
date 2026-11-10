# 받아쓰기에 Gemini 추가 — 개발 플랜 (2026-11-10)

- 담당: [역할: video] Claude Code(윈도우) `claude-win-video`
- 지시: 주인님 2026-11-10 「모든 테스트에 사용하는건 Claude가 기본이야」「Claude로 해」 → Claude API는 음성 입력이 없어(공식 기능 목록·`docs/AI_MODEL_CATALOG.md` §3 받아쓰기 Claude 「없음」) 받아쓰기는 Claude로 불가 → 주인님 선택 「Gemini 받아쓰기 추가」
- 상태: **✅ ai-video-studio v1.31 배포·운영 확인(2026-11-10, `ai-video-studio-1e670xxcf`)** — 주인님 결정: 1 Gemini 3.8 Flash 먼저 · 2 3.8 Flash 기본 · 3 선택 칸 둠 · 4 쇼츠 원스톱도 함께(다음 순서). 바뀐 점: 긴 소리는 Files API 대신 5분 조각(§2 아래 「바꾼 결정」)

## 1. 문제
- 받아쓰기는 지금 **회원 본인 OpenAI `whisper-1`만** 된다(`lib/clip/clipServer.ts` `transcribeAudio`). OpenAI 키가 없거나 잔액이 없으면 V1 「긴 영상 → 쇼츠」·V2 「해설 교차편집」 둘 다 첫 단계에서 멈춘다(11-10 시험 계정 429).
- `whisper-1`은 2027-02-26 종료 예정(`AI_MODEL_CATALOG.md` §4).
- 구간 고르기·번역은 이미 Claude → Gemini → OpenAI 순서로 회원 키를 고른다(`askJson`). 받아쓰기만 한 제공자에 묶여 있다.

## 2. 방법 (공식 문서 확인 2026-11-10, `aistudio.google.com/docs/audio`)
- Gemini는 받아쓰기 전용 모델 없이 **일반 모델에 소리를 넣고 지시**한다. 문장 시각은 설정 칸이 없고 「구간마다 시작·끝 초를 JSON으로」 지시 + 응답 형식(JSON 스키마)으로 받는다.
- 소리를 요청에 바로 넣기(base64)는 **요청 전체 20MB까지** → 16kHz 모노 WAV 기준 약 6.5분까지 바로 넣고, 그보다 길면(V1은 최대 10분) **Files API에 올렸다가 받아쓰기 뒤 지운다**.
- 모델: `gemini-3.8-flash`(선택표 중가 기본값). 문서 예시도 이 모델. 재시도 없음(이중 과금 방지), 시간 제한 240초(지금과 같음).
- 받은 문장은 지금처럼 `cleanSegments`(무음 위치로 경계 다듬기)를 거친다 → Gemini 시각이 1초 단위로 거칠어도 컷 경계는 무음 쪽으로 맞춰진다.

### 바꾼 결정(구현 중, 2026-11-10)
- Gemini Files API 안내가 새 Interactions API 기준으로 바뀌어 `generateContent`에서 파일을 붙이는 법을 공식 문서로 확인하지 못함 → 6.5분 넘는 소리는 **5분씩, 목표 지점 앞 10초 안의 가장 조용한 곳에서 잘라** 조각마다 바로 넣고 동시에 부른 뒤 시각을 이어 붙임(`splitWav`). 파일을 올렸다 지울 필요 없음.

## 2-1. OpenAI 받아쓰기 모델 확인 (공식 문서 2026-11-10, `developers.openai.com/api/docs/guides/speech-to-text`, 주인님 「openai도 모델 있는지 확인해보고 있으면 사용자가 선택할 수 있게」)
| 모델 | 문장 시각 | 상태 | 이 기능에 쓸 수 있나 |
|---|---|---|---|
| `gpt-transcribe` | **없음**(글만) — 「`timestamp_granularities[]`는 `whisper-1`만 지원」 | 추천·종료 예정 없음 | ✕ 컷 배치에 시각이 필요 |
| `whisper-1` | 문장·낱말 시각 | **2027-02-26 종료** | ○ (지금 쓰는 모델) |
| `gpt-4o-transcribe`·`-mini-transcribe` | 언급 없음 | 2027-02-26 종료 | ✕ |
| `gpt-4o-transcribe-diarize` | 화자별 구간 시각 | 2027-02-26 종료, 30초 넘으면 나누기 설정 필요 | △ 종료 예정이라 넣지 않음 |
| `gpt-live-transcribe` | 실시간용 | — | ✕ 파일 받아쓰기 아님 |
→ 선택 칸: **Gemini 3.8 Flash(기본·추천) · Gemini 3.5 Flash Lite(저가) · OpenAI whisper-1(2027-02 종료 예정 표시)**. 회원 선택은 이 브라우저에 기억. OpenAI가 시각을 주는 새 모델을 내면 그때 추가.

## 3. 바꾸는 곳
| 파일 | 내용 |
|---|---|
| `lib/clip/geminiTranscribe.ts`(새, 순수) | 지시문·응답 스키마, 응답 검사(숫자·순서·길이 넘김 잘라내기·빈 글 빼기) — 시험 대상 |
| `lib/clip/clipServer.ts` | `transcribeAudio`: 회원 키 순서 **Gemini → OpenAI**(결정 1), Gemini는 20MB 기준 바로 넣기/Files API, 끝나면 업로드한 소리·Gemini 파일 모두 지움, 어떤 모델로 받아썼는지 돌려줌 |
| `app/api/clip/transcribe/route.ts` | 사용 기록에 제공자·모델 추가 |
| `components/clip/NarrateStudio.tsx`·`ClipStudio.tsx` | 받아쓰기 모델 선택 칸(§2-1) + 모델별 대략 비용 안내(Gemini 3.8 Flash 3분 약 10원 · Flash Lite 약 4원 · whisper-1 약 25원), 키가 없을 때 등록 안내 |
| 시험 `tests/geminiTranscribe.test.mjs` | 정상·순서 섞임·끝 넘김·빈 응답·JSON 깨짐 |
| `docs/AI_MODEL_CATALOG.md` §3 | `gemini-3.5-transcribe`는 지금 공식 문서에 없음 → 「일반 모델 + 지시」로 정정(문서만) |

## 4. 원본/AIMaster 비교 (같은 기능 재사용)
| 기능 | 지금 | 채택 |
|---|---|---|
| Gemini 음성 넣기 | `free-music-studio/src/lib/ai/lyrics.ts` `viaGemini`(소리 `inline_data`, 참고곡 스타일) | 같은 요청 모양을 따른다(공용 기준 코드는 아님 — 짧아서 프로그램 안에 둠) |
| 회원 키 고르기 | `askJson` 순서표 | 받아쓰기용 순서표를 따로 둠(Claude 칸 없음) |

## 5. 검수·비용·배포
- 로컬: 시험(기존 102 + 새 시험)·`tsc`·린트·`npm run build`(무료).
- 운영: ego 시험 계정 본인 Gemini 키로 ① 해설 교차편집 17초 1회 ② 긴 영상 → 쇼츠 짧은 영상 1회 — 합계 약 1~2원.
- 배포: `ai-video-studio` v1.31, **Vercel 빌드 1회(승인 필요)**. 확장 없음, DB 변경 없음.
- 회원 비용: Gemini 3.8 Flash 기준 3분 약 $0.008(약 10원) — 지금 OpenAI 약 25원보다 쌈.
- 처음 설정 0단계(Gemini 키가 있으면 그대로) · 매일 조작 변화 없음 · 동의 변화 없음.

## 6. 주인님 결정 항목
| 번호 | 결정할 것 | 추천 |
|---|---|---|
| 1 | 회원 키가 둘 다 있을 때 순서 | **Gemini 먼저 → 없으면 OpenAI**(더 쌈, whisper 종료 예정, 시험 계정처럼 OpenAI 잔액이 없어도 막히지 않음). 대안: OpenAI 먼저(시각이 더 정확) |
| 2 | Gemini 모델 | **`gemini-3.8-flash`**(중가 기본). 대안: `gemini-3.5-flash-lite`(더 쌈, 받아쓰기 품질 미검증) |
| 3 | 화면에 받아쓰기 모델 고르는 칸 | **둠**(주인님 지시) — §2-1의 3개, 기본값은 회원이 가진 키 중 순서 1번, 고른 모델은 브라우저에 기억. 고른 모델의 키가 없으면 실행 전에 등록 안내(다른 제공자로 몰래 바꾸지 않음) |
| 4 | 같은 받아쓰기를 쓰는 다른 프로그램(`shorts-onestop-studio` 레퍼런스 받아쓰기·`insta_auto_poster`도 `whisper-1`) | 이번에는 `ai-video-studio`만, 나머지는 각 프로그램 다음 작업 때 같은 방식으로(아이디어 표에 등록) |
