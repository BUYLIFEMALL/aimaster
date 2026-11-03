# RTX 5080 윈도우 PC 요청 — AI 무료음악 자동화 0단계 사전 검증 (2026-11-03)

요청: Claude Code(윈도우, Intel 내장 그래픽 PC) `claude-win-20261024-music` [역할: music] → **RTX 5080이 달린 다른 윈도우 PC**의 세션(또는 주인님 직접 실행)
근거: 주인님 지시(2026-11-03 채팅 「윈도 pc쪽은 nvidia 5080 이니까 그쪽에서 테스트 해보면 될꺼야」) · 플랜 `free-music-studio/docs/PLAN_20261103_V1_01.md` §8
비용: **없음**(모델은 그 PC에서 실행, 키·결제 없음). 디스크 약 15GB.
참고: 지금 작업 PC(Intel 내장 그래픽)는 그래픽 생성이 메모리 부족으로 실패해 CPU로만 시험했다. 5080은 CUDA 정식 구성(언어 모델·기본 모델 켬)의 속도와 음질을 보는 기준 장비다.

## 하는 일 (저장소 밖 폴더, 예: `D:\free-music-prevalidation`)
1. ACE-Step 1.5 받기: `git clone --depth 1 https://github.com/ace-step/ACE-Step-1.5.git` → 공식 안내 `docs/en/INSTALL.md`의 Windows(CUDA) 절차(`uv sync`). RTX 50 계열은 CUDA 12.8 이상용 PyTorch가 필요하다 — 설치된 PyTorch 버전을 적어 주세요.
2. API 서버 켜기(주소 `http://127.0.0.1:8001`): 공식 Windows 시작 스크립트 또는 `uv run acestep-api`. 처음에는 `ACESTEP_INIT_LLM=true`(LM `acestep-5Hz-lm-1.7B`). 첫 실행 때 모델 자동 내려받기 — **걸린 시간과 용량을 적어 주세요.**
3. 시험 6건(각 1회). 형식: `POST /release_task` → `POST /query_result`로 상태 1(성공)까지 → `GET /v1/audio?path=...`
   | 번호 | 요청 | 적을 것 |
   |---|---|---|
   | A | `{"prompt":"warm Korean city pop, soft electric piano, female vocal, 92 BPM","lyrics":"[Verse]\n비 오는 오후 창가에 앉아\n[Chorus]\n오늘은 쉬자 천천히 가자","audio_duration":30}` (turbo, 언어 모델 끔으로 요청 `"thinking": false`) | 걸린 시간 — 지금 PC CPU 결과(90초)와 같은 조건 |
   | B | A와 같고 `audio_duration`: 180 | 걸린 시간(CPU 371초와 비교) |
   | C | `task_type`: `cover`, 원곡은 A 결과 파일을 **multipart `src_audio`로 업로드**(JSON 절대 경로는 거절됨), prompt `"acoustic guitar ballad"` | 성공 여부·시간 |
   | D | `task_type`: `repaint`, A 결과의 10~20초 구간(같이 multipart 업로드) | 성공 여부·시간 |
   | E | A와 같고 `"thinking": true`(언어 모델 사용) | 시간·VRAM |
   | F | `POST /v1/init {"model":"acestep-v15-base","init_llm":true,"lm_model_path":"acestep-5Hz-lm-1.7B"}` 뒤 E와 같은 요청 + `"inference_steps": 50` | 시간·VRAM |
4. 시험 중 `nvidia-smi`로 최대 VRAM 사용량을 적어 주세요.
5. 결과 파일 A·E·F(+B)를 `D:\PDS\Program_dev\free-music-src\outputs-5080\`처럼 주인님이 들을 수 있는 곳에 두고 위치를 적어 주세요. 주인님이 지금 PC의 CPU 결과와 나란히 들어 음질을 비교합니다.

## 결과 적는 곳
`free-music-studio/docs/PLAN_20261103_V1_01.md` §8 표의 「윈도우 RTX 5080」 줄(내 파일만 경로 지정 커밋, 같은 저장소를 쓰지 않으면 결과를 채팅으로 전달). 막히면 오류 원문을 그대로 적어 주세요.

## 하지 말 것
- 저장소 안에 ACE-Step을 받지 않기(용량).
- 유료 호출·배포·DB 쓰기 없음.
