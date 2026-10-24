# 인수인계 — 브라우저 무료 음성 합성 엔진 + 쇼츠 원스톱 「무료 음성」 선택지 (2026-10-24)

- 넘기는 쪽: Claude Code(윈도우) `claude-win-dotori`(새 프로그램 분석·플랜 담당) — 분석과 사전 조사만, **코드·DB·배포 변경 없음**. 플랜 작성 도중 주인님 「스톱」 → 「이 작업은 음악 담당이 할 거니까 인수인계 문서로 남겨줘」.
- **받는 쪽: 음악 담당 세션**(`claude-win-20261024-music` 줄)
- 근거: [Supertonic TTS 0.3.0 분석 보고서](REPORT.md)
- 대상: AIMaster 운영 · DB ref `esgxyikcnnvmlhygjkth`

## 1. 주인님 결정

| 항목 | 결정 |
|---|---|
| 방향 | **(가) 먼저: 공용 「브라우저 무료 음성 합성」 엔진 → 나레이션 있는 프로그램에 「무료 음성(내 브라우저)」 선택지, 쇼츠 원스톱부터.** 끝나면 다음 단계(독립 「AI 음성 합성 자동화」 여부)로 |
| 근거 코드 | 이 외부 앱(Supertonic TTS, `gptparkai.com` 비공식)이 아니라 **Supertone 공식 오픈소스로 직접** |
| 구현 담당 | 음악 담당 |
| **개발 플랜·비용** | ⏳ **아직 없음** — 음악 담당이 플랜을 써서 주인님 승인부터 |

## 2. 이미 확인한 것 (다시 조사하지 않아도 됨)

| 항목 | 내용 |
|---|---|
| 공식 저장소 | `github.com/supertone-inc/supertonic` — **코드 MIT**(Copyright 2025 Supertone Inc.). 언어별 예제 폴더 `web/`·`nodejs/`·`py/` 등. **`web/`**: `index.html`·`main.js`·`helper.js`·`vite.config.js`·`package.json`·`assets`(심볼릭 링크) — 브라우저 실행 기준 예제 |
| 모델 | `huggingface.co/Supertone/supertonic-3` — **가중치 라이선스 `openrail`(용도 제한)**. ONNX: `onnx/vector_estimator.onnx` 256.5MB · `vocoder.onnx` 101.4MB · `text_encoder.onnx` 36.4MB · `duration_predictor.onnx` 3.7MB · `tts.json`·`unicode_indexer.json` + 목소리 `voice_styles/M1~M5·F1~F5.json`(각 0.3MB). 합계 약 398MB(첫 실행 1회 내려받기) |
| 성능·제약(외부 앱 경험) | `onnxruntime-web` WASM이 기본·권장(멀티스레드), WebGPU는 일부 연산이 CPU로 넘어가 음질이 깨질 수 있다는 안내. 작업자(worker)에서 돌려야 화면이 안 멈춤. 멀티스레드는 교차 출처 격리(COOP/COEP 머리글) 필요 |
| 기능(모델 쪽) | 31개 언어(자동 감지), 44.1kHz, 디노이징 스텝, 말하기 속도(0.9~1.5 권장), 표현 태그(웃음·숨소리·한숨) |
| 쇼츠 원스톱 현재 음성 구조 | `shorts-onestop-studio` v1.41 — `src/lib/voice.ts`: `TtsProvider = "openai" \| "gemini" \| "elevenlabs"`, `TTS_MODELS`·`TTS_VOICES`·`DEFAULT_TTS`(openai `gpt-4o-mini-tts` `coral`)·`AudioSettings`·`normalizeAudio`·자막 나누기(`captionChunks`·`timedCaptionChunks`·`startsFromWords`) / `src/lib/tts.ts`: **서버에서** `synthesize()` → `saveAudio()`(저장소 업로드), `bgmUploadUrl()`(브라우저 직접 업로드 주소), `wordStarts()`(OpenAI 받아쓰기로 자막 시각) |

## 3. 설계할 때 꼭 볼 점

1. **음성이 브라우저에서 만들어짐** → 지금 서버 `synthesize` 경로와 다름. 만들어진 WAV를 `bgmUploadUrl`과 같은 방식(브라우저 직접 업로드)으로 저장소에 올리고 같은 저장 위치·30일 규칙을 따르는 경로가 필요.
2. **자막 시각** → `wordStarts`는 OpenAI 키로 받아쓰기. 무료 음성은 키가 없으므로 ① 모델 길이 예측(`duration_predictor`)·구간 시각 ② 글자 수 비례 나누기(`captionChunks`) 중 선택 — 유료 키 호출 없이.
3. **공용 기준 코드 등록** → 엔진은 새 공용 모듈(예: `browser-free-tts`)로 `docs/SHARED_MODULES.md`·`docs/SHARED_FEATURE_MAP.md`에 기준 파일·사본 목록을 등록하고 `scripts/check-shared-modules.mjs`에 넣기. 사본은 직접 고치지 않음.
4. **교차 출처 격리 머리글** → 멀티스레드를 쓰려면 `Cross-Origin-Opener-Policy`·`Cross-Origin-Embedder-Policy`가 필요한데, 로그인(SSO)·외부 이미지·영상 미리보기에 영향이 갈 수 있음. **시제품에서 먼저 확인**하고, 안 되면 단일 스레드(느림)로.
5. **모델 파일 받는 곳** → 허깅페이스에서 회원 브라우저가 직접 받기(운영자 서버 비용 0). 캐시(Cache API)·진행률·취소·다시 받기, 첫 실행 안내(「약 400MB, 데스크톱 크롬 권장」).
6. **라이선스 고지(필수)** → OpenRAIL 용도 제한: 화면에 「모델 라이선스(OpenRAIL) 조건을 확인하세요 · 실존 인물 사칭·기만 금지 · 공개 시 합성음임을 밝히기 권장」. **상업 이용(유튜브 수익화 등) 가능 여부는 주인님 확인 사항으로 남아 있음** — 플랜 보고 때 함께 여쭙기.
7. **회원 본인 키 원칙과 충돌 없음** → 키가 필요 없는 무료 엔진이라 운영자 키 폴백 문제도 없음. 기존 유료 선택지는 그대로.
8. 다음 적용 대상(쇼츠 뒤): `ai-video-studio`(`lib/edit/tts.ts`) · `auto-shorts-posting` · `music-video-studio`(`src/lib/edit/voice.ts`) · `shots`(`src/lib/render/voices.ts`).

## 4. 다음 첫 단계

1. `docs/ACTIVE_WORK.md`에 내 줄 추가(공용 모듈 + `shorts-onestop-studio`).
2. 공식 `web/` 예제(`main.js`·`helper.js`)를 읽고 엔진 경계(입력 텍스트·목소리·속도·스텝 → WAV·구간 시각) 정하기.
3. 개발 플랜 작성: 시제품(COOP/COEP·첫 내려받기·한국어 음질) → 공용 엔진 → 쇼츠 선택지·업로드·자막 → 검수(크롬 실제 화면, 시험 계정) → 배포(빌드 횟수) → 비용 표 → 주인님 승인.

## 비용 리포트 (넘기는 쪽)

AI 호출 0회 · 빌드 0회 — 비용 없음(공개 저장소·허깅페이스 공개 정보 조회만).

## 5. 받는 쪽 접수 (2026-10-24, 음악 담당 `claude-win-20261024-music`)
- 주인님 지시 「바로 하지 말고 검토 후 작업 대기 리스트로 올려」 → **작업 대기 등록.** 순서: ① 지금 진행 중인 플레이리스트 Spectrum 묶음 P-0~P-5 → ② 이 작업(개발 플랜 작성·보고 → 승인 후 시제품부터).
- 검토 메모: 플랜에 넣을 결정 질문 — 모델 상업 이용(OpenRAIL) 가능 여부, 교차 출처 격리 머리글(로그인·외부 미디어 영향) 시제품 결과에 따른 단일/멀티 스레드, 자막 시각 방식(길이 예측 vs 글자 수 비례). 첫 내려받기 약 400MB는 회원 브라우저가 허깅페이스에서 직접(운영자 비용 0).

