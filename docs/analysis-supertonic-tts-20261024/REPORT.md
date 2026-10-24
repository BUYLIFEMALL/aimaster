# Supertonic TTS 0.3.0 정적 분석 · 음성 합성 기능 비교·개발 의견 (2026-10-24)

작성: Claude Code(윈도우) `claude-win-dotori`(새 프로그램 분석·플랜 담당). 기준: [신규·외부 프로그램 분석·개발 플랜 지침](../PROGRAM_ANALYSIS_PLANNING_GUIDE.md). **분석만 — 코드·DB·배포 변경 없음.** 대상: AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`).

## 0. 방법·근거·한계·권리

| 항목 | 내용 |
|---|---|
| 원본 | `D:\PDS\Program_dev\Supertonic TTS-0.3.0-x64.exe` (183.6MB, SHA-256 `7ad6ec5d…215d`, 빌드 2026-09-09) |
| 형식 | NSIS 3 → `app-64.7z` → Electron(`desktop/main.js`) + 안에 Next.js 15 서버(`resources/server`, standalone) |
| 방법 | 실행 안 함. 7-Zip·`@electron/asar` 해제(저장소 밖 임시 폴더), 데스크톱 코드 직접 읽음, Next 빌드 결과에서 API 경로·한국어 문구 348개·외부 주소 추출. 허깅페이스 공개 API로 모델 크기·라이선스 확인(읽기 전용) |
| 한계 | 실행·음질 확인 안 함 |
| 앱 정체 | 개발자 표기 `gptparkai.com`, 「Supertone 공식 앱이 아닙니다」 명시. **Supertone Inc.가 공개한 오픈소스 TTS 모델 `Supertone/supertonic-3`을 쓰는 비공식 앱** |
| 권리 | 이 앱의 코드·문구는 쓰지 않는다. 만들 때는 **Supertone 공식 저장소(`github.com/supertone-inc/supertonic`, 코드 MIT)**와 **모델(`huggingface.co/Supertone/supertonic-3`, 가중치 OpenRAIL — 용도 제한)**을 직접 근거로 한다. OpenRAIL 조건(상업 이용·금지 용도)은 확인 필요(§6) |

## 1. 기능·로직

| 영역 | 내용 |
|---|---|
| 실행 방식 2가지 | ① **로컬 엔진(빠름)**: PC의 Python 3.9~3.13을 찾아 `pip install supertonic[serve]` → `supertonic serve`(네이티브 onnxruntime)를 자동 기동·정지(Microsoft Store 파이썬 별칭 감지 안내 포함) ② **브라우저 모드(설치 불필요·느림)**: `onnxruntime-web` 1.17(WASM 기본·멀티스레드, WebGPU 실험), 모델을 허깅페이스에서 1회 내려받아 브라우저 캐시, 작업자(worker) 스레드로 화면 안 멈춤 |
| 모델 | Supertonic 3 · **31개 언어**(자동 감지 가능) · 44.1kHz · ONNX 4개 파일 약 398MB(`vector_estimator` 256MB·`vocoder` 101MB·`text_encoder` 36MB·`duration_predictor` 4MB) + 목소리 10종(M1~M5·F1~F5, 각 0.3MB) |
| 목소리 | 10종 설명(톤·밝기·속도) + 실제 측정값(피치 Hz·밝기 Hz·자/초) 표시, 미리듣기 |
| 조절 | 디노이징 스텝(품질↔속도), 말하기 속도(권장 0.9~1.5), **표현 태그(웃음·숨소리·한숨)** |
| 합성 방식 | **한 개** / **여러 줄 한꺼번에**(줄마다 1개, 최대 64개, ZIP) / **대화**(「M1: …」「F3: …」 대본 → 화자별 목소리 자동 배정, 대사 사이 침묵, 합본 + 대사별 파일 + 자막 SRT + 대본 TXT, 「제미나이로 대본 만들기」 Gem 링크) |
| 출력 | WAV(무손실) / MP3(브라우저 변환 `lamejs`), **음성 구간에 맞춘 SRT 자막** |
| 편의 | 설정 프리셋 20개, 최근 생성 기록(설정·문장 되살리기), 진단 정보(백엔드·스레드·캐시·모델 저장소), 모델 캐시 삭제 |
| API | 로컬 서버에 **OpenAI 호환 `POST /api/v1/audio/speech`**, `/api/tts`, `/api/tts/batch`, `/api/styles`, `/api/engine` |
| 안내 | 사칭·기만 사용 금지(명예훼손·사기 고지), 합성음 공개 시 밝히기 권장, 모델 OpenRAIL 고지, 무보증 |

## 2. 우리 프로그램과 비교

| 기능 | 우리 현황 |
|---|---|
| 음성 합성 독립 프로그램 | **없음** (카탈로그·비교표에 음성 전용 프로그램 없음) |
| 나레이션 생성 | 영상 프로그램 안에서만: `shorts-onestop-studio`(`src/lib/tts.ts`·`voice.ts`, OpenAI·Gemini·ElevenLabs·본인 목소리 복제), `ai-video-studio`(`lib/edit/tts.ts`), `auto-shorts-posting`(OpenAI `gpt-4o-mini-tts`), `music-video-studio`(`src/lib/edit/voice.ts`), `shots`(`src/lib/render/voices.ts`) |
| 비용 | 모두 **회원 본인 유료 키** 필요 |
| 무료·키 없는 음성 | 없음 |
| 여러 줄 대량·대화(여러 화자)·SRT 동시 출력 | 없음(영상 자막은 각 프로그램 내부) |

→ **겹치는 것은 「나레이션 한 줄 만들기」 정도이고, 무료·키 없는 음성, 대량·대화 합성, 음성 파일 자체를 결과물로 내는 도구는 우리에게 없다.**

## 3. 새로 가져올 만한 것

| # | 기능 | 넣을 곳 | 구현 가능성(웹) | 회원·운영자 비용 | 우선 |
|---|---|---|---|---|---|
| T1 | **브라우저 무료 음성 합성 엔진**(공식 Supertonic 모델·`onnxruntime-web`, 회원 브라우저에서 실행, 모델 1회 내려받아 캐시) | 새 공용 기준 코드 | 높음(공식 웹 예제·ONNX). 첫 실행 약 400MB, 데스크톱 크롬 권장 | **0원**(서버·키 없음) | 상 |
| T2 | 기존 나레이션에 「무료 음성(내 브라우저)」 선택지 추가 | `shorts-onestop-studio` → `ai-video-studio`·`auto-shorts-posting`·`music-video-studio` | 높음(T1 사본) | 0원 | 상 |
| T3 | 여러 줄 대량 합성 + ZIP | 독립 도구 또는 T2 프로그램 | 높음 | 0원 | 중 |
| T4 | **대화(여러 화자) 합성** + 합본 + SRT + 대본 | 독립 도구 | 높음 | 0원 | 중 |
| T5 | 음성 구간에 맞춘 SRT 자막 | T2·독립 도구 | 높음 | 0원 | 중 |
| T6 | 표현 태그(웃음·숨·한숨)·말하기 속도·품질 스텝·목소리 측정값 표시 | T1과 함께 | 높음(모델 기능) | 0원 | 중 |
| T7 | 로컬 파이썬 엔진(빠름) | 「내 PC 고속 변환」 실행기 연계 | 낮음(회원 PC에 파이썬 설치 필요) | 0원 | 하 |

## 4. 접목하지 않는 것

| 기능 | 이유 |
|---|---|
| Electron·Next 내장 서버·파이썬 자동 설치 | 우리는 웹. 브라우저 모드만으로 충분, 파이썬은 후순위(T7) |
| 이 앱의 코드·문구 | 권리 없음 — Supertone 공식 오픈소스로 직접 구현 |
| 로컬 OpenAI 호환 API | 웹 서비스에는 해당 없음 |

## 5. 병합 vs 독립 — 판단

| 기준 | 판정 |
|---|---|
| 같은 일 | △ 나레이션 한 줄은 쇼츠·영상 프로그램과 겹침. **음성 파일 자체가 결과물**(오디오북·강의·팟캐스트·대화 음성·나레이션 대량)인 일은 우리에게 없음 |
| 같은 사용자 | △ 영상 제작자 일부 겹침, 오디오북·강의·팟캐스트 제작자는 새 사용자 |
| 한 흐름 | × 영상 흐름의 일부가 아니라 독립 결과물 |
| 독립 조건 | **입출력 고유**(텍스트 → 음성 파일·SRT) · **동작 방식 다름**(서버·키 없이 브라우저 실행) — 매뉴얼 §4-4 해당 |

**의견: 두 갈래로 진행.**
1. **공용 기준 코드 먼저(T1)** → 나레이션이 있는 영상 프로그램에 「무료 음성」 선택지로 사본 적용(T2, `shorts-onestop-studio` 먼저). 회원이 유료 키 없이도 나레이션을 만들 수 있게 됨.
2. **독립 신규 프로그램 「AI 음성 합성 자동화」(가칭) — 조건부 추천**: 한 개·여러 줄·대화(여러 화자) 합성, WAV/MP3, SRT, 프리셋·기록. 무료 엔진을 기본으로, 회원 본인 키 엔진(OpenAI·Gemini·ElevenLabs)을 선택지로 붙여 품질 비교. 운영자 비용 0원이라 **FREE 배지 무료 입구** 후보. 단, OpenRAIL 상업 이용 조건 확인 뒤 착수.

이름 후보(확정은 주인님): ① AI 음성 합성 자동화 `ai-voice-studio` ② 무료 TTS 낭독 자동화 `free-tts-studio` ③ AI 대화 음성 자동화 `ai-dialogue-voice` ④ AI 나레이션 제작 자동화 `ai-narration-studio` — 추천 ①(기능이 한 번에 설명되고 기존 이름과 겹치지 않음). 카드 한 줄 예시: 「글을 넣으면 내 브라우저에서 무료로 31개 언어 음성과 자막을 만들고, 여러 화자 대화도 한 번에 완성합니다」.

## 6. 주인님 결정 (2026-10-24)

- **방향 (가) 먼저 진행**: 공용 「브라우저 무료 음성 합성」 엔진(Supertone 공식 오픈소스) → 나레이션 있는 프로그램에 「무료 음성」 선택지, `shorts-onestop-studio`부터. 다음 단계(독립 프로그램 여부)는 그 뒤. **구현: 음악 담당** — [인수인계](HANDOFF_20261024_MUSIC_OWNER.md). 남은 확인: OpenRAIL 상업 이용 조건.

### 결정 전 선택지 기록

1. **방향** — (가) 공용 엔진 + 기존 영상 프로그램에 무료 음성만 (나) (가) + 독립 「AI 음성 합성 자동화」 신규 (다) 진행 안 함. 추천: (나), 단 (가)를 먼저.
2. **모델 라이선스(OpenRAIL) 확인** — 회원이 만든 음성의 상업 이용(유튜브 수익화 등)이 허용되는지, 금지 용도 고지를 어떻게 넣을지. 확인 전에는 「상업 이용 조건은 모델 라이선스를 확인하세요」 고지 필수.
3. **구현 담당** — 영상 프로그램 나레이션은 영상 담당(`ai-video-studio` 등)과 쇼츠 담당, 독립 프로그램은 새로 지정.
4. 시험 방식 — 첫 실행 약 400MB 내려받기가 회원 화면에서 감당되는지(데스크톱 크롬 권장, 모바일 비권장), 브라우저 멀티스레드에 필요한 교차 출처 격리 머리글(COOP/COEP)이 다른 기능(로그인·외부 이미지)과 충돌하지 않는지 시제품으로 확인.

## 7. 재현 명령

```bash
7z x -o<빈폴더>/nsis "Supertonic TTS-0.3.0-x64.exe" '$PLUGINSDIR/app-64.7z'
7z x -o<빈폴더>/app <빈폴더>/nsis/$PLUGINSDIR/app-64.7z
npx -y @electron/asar@3.2.17 extract <빈폴더>/app/resources/app.asar <빈폴더>/asar   # 실행하지 않음
curl -s "https://huggingface.co/api/models/Supertone/supertonic-3?blobs=true"        # 모델 크기·라이선스
```

비용: AI 호출 0, 빌드 0 — 비용 없음.
