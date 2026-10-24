# 개발 플랜 — 공용 「무료 음성 엔진」 + 쇼츠 원스톱 「무료 음성(내 브라우저)」 (2026-10-24)

- 작성: Claude Code(윈도우) 음악 담당 `claude-win-20261024-music` · 상태: **주인님 승인 대기**
- 근거: 인수인계 `../../docs/analysis-supertonic-tts-20261024/HANDOFF_20261024_MUSIC_OWNER.md` · 결정·사전 검증 결과 `../../docs/MUSIC_OWNER_QUEUE_20261024.md` §5·§6
- 대상: AIMaster 운영 · DB ref `esgxyikcnnvmlhygjkth`(DB 구조 변경 없음) · https://shorts-onestop-studio.buylife.xyz · 현재 v1.41

## 0. 이미 정한 것
| 항목 | 결정 |
|---|---|
| 상업 이용 | 허용(OpenRAIL-M, 비상업 제한 없음). 라이선스 조건만 가볍게: 처음 고를 때 한 번 사용 제한 안내·확인 체크, 유튜브 설명란에 「AI 합성 음성 사용」 한 줄 자동 |
| 휴대폰 | 공개. 첫 내려받기 「약 400MB, 와이파이 권장」 한 줄(막지 않음), 멈추면 원인 안내 + 유료 음성으로 바꾸기 단추 |
| 음질 | 주인님 청취 통과(사전 검증 페이지, 목소리 F1) |
| 근거 코드 | Supertone 공식 `web/helper.js`(MIT) — 저작권 표시 유지. 외부 앱(gptparkai) 코드는 쓰지 않음 |

## 1. 사전 검증으로 알게 된 것 → 설계 반영
| 결과 | 반영 |
|---|---|
| 첫 내려받기 40~54초, 두 번째부터 2.1초(브라우저 저장분) | Cache API 저장 + 진행률(MB) 표시 + 실패 시 다시 받기 |
| 한 줄 계산 1.3배 느림 / 여러 줄(교차 출처 격리) 0.66~0.99배 | 격리되면 여러 줄, 아니면 자동으로 한 줄(사파리 포함) — 둘 다 동작 |
| COEP `credentialless`에서 외부 그림 정상 | 쇼츠 원스톱 화면에 COOP `same-origin` + COEP `credentialless` — 배포 후 로그인·유튜브 연결·스톡 영상·AI 이미지·매뉴얼 팝업 크롬 확인, 문제 생기면 머리글만 빼고 한 줄 계산으로 계속 |
| 공식 예제는 화면 쪽 계산이라 페이지가 멈춤 | **작업자(worker)** 안에서 계산 |

## 2. 만들 것
### T-1 공용 엔진(새 공용 기준 코드 `browser-free-tts`, 기준 위치 `shorts-onestop-studio/src/lib/freeTts/`)
- `supertonic.ts` — 공식 `helper.js`(MIT, Copyright 2025 Supertone Inc.)를 TypeScript로 옮김(동작 그대로, 저작권 표시 유지)
- `worker.ts` — 작업자: 모델 받기(허깅페이스 `Supertone/supertonic-3`, Cache API 저장)·세션 만들기·문장별 음성 만들기, 진행률 보고
- `engine.ts` — 화면 쪽 얇은 연결: `loadFreeTts(onProgress)`, `speak(text, { voice, speed, steps }) → { wav: Blob, sec, sentenceStarts }`, 격리 여부로 계산 줄 수 자동, 오류를 한국어 안내로(메모리 부족·내려받기 실패)
- `onnxruntime-web@1.20.1`(wasm 파일은 jsdelivr 고정 판 주소에서) — 운영자 서버·트래픽 비용 0
- `docs/SHARED_MODULES.md`·`docs/SHARED_FEATURE_MAP.md`·`scripts/check-shared-modules.mjs`에 기준 등록(사본은 다음 적용 프로그램부터: ai-video-studio·auto-shorts-posting·music-video-studio·shots)

### T-2 쇼츠 원스톱 연결
- `src/lib/voice.ts`: `TtsProvider`에 `"browser"` 추가, 모델 「무료 음성(내 브라우저) · Supertone」, 목소리 10개(여성 1~5·남성 1~5, 한국어 이름), 말 빠르기 0.9~1.5. 기본값은 지금처럼 OpenAI(바꾸지 않음)
- 새 `src/lib/freeVoice.ts`(화면 쪽): 음성 만들기 → 새 API `/api/media/voice-upload`(배경음악과 같은 일회용 업로드 주소, `<회원>/voice/`, WAV·10MB)로 저장소에 바로 올림 → 서명 주소 → `{ path, src, words }`. 같은 `voice` 폴더라 **30일 자동 정리 그대로 적용**
- 자막 시각: 엔진이 돌려주는 문장별 길이로 낱말 시작 시각 계산(문장 안은 글자 수 비율) → 유료 받아쓰기(Whisper) 호출 없음
- `RenderView.tsx` `makeVoice`·`pipeline.ts` `makeVoices`: 무료 음성이면 `freeVoice`, 아니면 지금처럼 `/api/ai/tts`. `/api/ai/tts`는 `browser`가 오면 「무료 음성은 브라우저에서 만듭니다」 안내
- 화면: 무료 음성을 처음 고를 때 한 번 사용 제한 안내·확인 체크(실존 인물 흉내·딥페이크 금지, 공개 시 합성음 표기 — 라이선스 원문 링크), 첫 내려받기 진행률, 실패 시 「유료 음성으로 바꾸기」
- `src/lib/youtube/browserUpload.ts`: 무료 음성을 쓴 영상이면 설명란 끝에 「🔊 이 영상은 AI 합성 음성(Supertone)을 사용했습니다.」 자동 추가

### T-3 머리글
- `next.config.ts` 쇼츠 원스톱 화면에 COOP `same-origin` + COEP `credentialless`. 배포 후 크롬 확인 항목에서 하나라도 깨지면 머리글만 빼는 수정(한 줄 계산으로 계속 동작)

## 3. 검수
- 시험: 자막 시각 계산·음성 설정 정리(`browser`)·설명란 한 줄 — 순수 함수 시험 추가, 기존 시험 전체, `tsc`·`npm run build`
- 크롬 운영(시험 계정 `buylifemall@naver.com`): 무료 음성 선택 → 안내 확인 → 첫 내려받기 진행률 → 장면 2~3개 음성 → 자막이 말할 때 맞게 나오는지 → MP4에 목소리 → 두 번째는 바로 시작 → 유튜브 설명란 한 줄(업로드는 하지 않음) → 로그인·유튜브 연결 화면·스톡 영상·AI 이미지·매뉴얼 팝업 정상
- 휴대폰: 배포 후 주인님 휴대폰으로 한 번(속도가 느리면 안내 문구만 보완)

## 4. 비용
| 항목 | 횟수 | 계정·키 | 대략 |
|---|---|---|---|
| Vercel 빌드 | 1회(머리글 문제로 빼는 수정이 필요하면 +1) | 팀 `buylife` | 빌드 1~2회분 |
| AI 호출 | 0 | — | 없음 |
| 모델 내려받기 | 회원 브라우저가 허깅페이스에서 직접 | — | 운영자 비용 없음 |
| 저장소 | 회원 음성 WAV(10초 약 0.9MB), 30일 뒤 자동 삭제 | 운영 저장소 | 기존 음성과 같은 수준 |

## 5. 버전·인수인계
- 쇼츠 원스톱 v1.42(코드·DB), 인수인계 `AGENTS.md`·`docs/IMPROVEMENTS.md`, 루트 `docs/HANDOFF.md`, 프로그램 비교표, 공통 아이디어 표, 공용 모듈 등록부. 사전 검증 페이지는 정식 개발 시작 때 지움.
