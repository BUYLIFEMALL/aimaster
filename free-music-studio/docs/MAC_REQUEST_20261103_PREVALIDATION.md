# 맥미니 요청 — AI 무료음악 자동화 0단계 사전 검증 (2026-11-03)

요청: Claude Code(윈도우) `claude-win-20261024-music` [역할: music] → 맥미니 세션
근거: 주인님 승인(2026-11-03 채팅 「진행해」) · 플랜 `free-music-studio/docs/PLAN_20261103_V1_01.md` §4 0단계
비용: **없음**(모델은 내 PC에서 실행, 키·결제 없음). 디스크 약 15GB.

## 하는 일 (저장소 밖 임시 폴더, 예: `~/free-music-prevalidation`)
1. ACE-Step 1.5 받기 — 둘 중 하나
   - 휴대용 묶음: 공식 안내의 macOS portable package(`docs/en/INSTALL.md` 「macOS Portable Package」)
   - 또는 `git clone --depth 1 https://github.com/ace-step/ACE-Step-1.5.git` → `uv sync`
2. API 서버 켜기: `./start_api_server_macos.sh`(MLX 백엔드, 주소 `http://127.0.0.1:8001`). 첫 실행 때 모델 자동 내려받기 — **걸린 시간과 내려받은 용량을 적어 주세요.**
3. 시험 4건(각 1회, `docs/en/API.md` 형식: `POST /release_task` → `POST /query_result`로 상태 1(성공)까지 → `GET /v1/audio?path=...`로 받기)
   | 번호 | 요청 | 적을 것 |
   |---|---|---|
   | A | `{"prompt":"warm Korean city pop, soft electric piano, female vocal, 92 BPM","lyrics":"[Verse]\n비 오는 오후 창가에 앉아\n[Chorus]\n오늘은 쉬자 천천히 가자","audio_duration":30}` | 걸린 시간·파일 크기·한국어 발음이 알아들을 만한지 |
   | B | A와 같고 `audio_duration`: 180 | 걸린 시간 |
   | C | `task_type`: `cover`, 원곡은 A 결과 파일, prompt `"acoustic guitar ballad"` | 성공 여부·걸린 시간 |
   | D | `task_type`: `repaint`, A 결과의 10~20초 구간 | 성공 여부·걸린 시간 |
   | E (음질 비교, 2026-11-03 추가) | A와 같은 요청 + `"thinking": true`. 서버를 언어 모델 켠 상태로 시작(`ACESTEP_INIT_LLM=true`, LM `acestep-5Hz-lm-1.7B`, 메모리가 모자라면 `0.6B`) | 걸린 시간·쓴 LM 이름 |
   | F (음질 비교, 2026-11-03 추가) | E와 같고 기본 모델로 바꿔서: `POST /v1/init {"model":"acestep-v15-base","init_llm":true,"lm_model_path":"acestep-5Hz-lm-1.7B"}` 뒤 `"inference_steps": 50` | 걸린 시간 |

   배경: 윈도우 CPU 결과(turbo, 언어 모델 끔)를 주인님이 「Suno보다 떨어지지만 들을 만하다」고 판정 → E·F로 음질이 얼마나 올라가는지 본다. 같은 가사(A)라 나란히 들어 비교할 수 있다.
4. 결과 파일 A·B·E·F를 주인님이 들을 수 있게 공유 폴더(`/Volumes/gt1_mega/Antigravity/AIMaster` 밖, 예: PDS)에 두고 위치를 적어 주세요.

## 결과 적는 곳
`free-music-studio/docs/PLAN_20261103_V1_01.md` §8 표의 「맥미니」 줄(내 파일만 경로 지정 커밋). 막히면 오류 원문을 그대로 적어 주세요.

## 하지 말 것
- 저장소 안에 ACE-Step을 받지 않기(용량), 원본 분석 폴더(`D:/PDS/Program_dev/free-music-src`)는 윈도우 몫.
- 유료 호출·배포·DB 쓰기 없음.
