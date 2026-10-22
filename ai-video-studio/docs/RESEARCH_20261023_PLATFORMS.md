# AI 영상 스튜디오 (`ai-video-studio`) — 플랫폼 조사·개발 가능성 분석 보고서

> 작성: 2026-10-23, Claude Code(윈도우). 상태: **조사·분석 완료, 개발 전(개발 플랜은 주인님 확인 뒤 별도 작성)**.
> 대상: ① AIMaster 운영. 코드·DB 변경 없음.
> 이름 확정(주인님 2026-10-23): **AI 영상 스튜디오**, slug 후보 `ai-video-studio`(폴더·문서 중복 없음 확인).
> 성격: `ai-image-studio`가 이미지 연동의 **레퍼런스 프로그램**이듯, 이 프로그램은 **영상 생성·음성·음악·자막·렌더링 연동의 레퍼런스**다. 다른 프로그램은 이 프로그램의 **연동 부분(모델·주소·호출·대기·결과 받기·렌더 엔진)**만 사본으로 가져다 쓰고, 프롬프트·화면 컨셉은 각자 유지한다.
> 단가는 2026-10-23 웹 조사 값이다. 「2차」 표시는 공식 페이지가 아닌 출처라 붙이기 전에 각 콘솔에서 다시 확인한다.

## 0. 먼저 알아야 할 변화 (공식 문서 직접 확인)

| 사항 | 근거 | 영향 |
|---|---|---|
| **Gemini API Veo 3.1 Preview 3종 종료 (2026-10-22)** | https://ai.google.dev/gemini-api/docs/video — 대체 `gemini-omni-1.1-flash` | **`music-video-studio`가 종료 모델 사용 중 → 회원 생성 실패 가능(긴급, `music-video-studio/docs/IMPROVEMENTS.md` 기록)**. 공용 `ai-video-providers`는 이미 Omni Flash 사용 중이라 정상 |
| **OpenAI Sora 2 API·Videos API 종료 (2026-09-24, 대체 없음)** | https://developers.openai.com/api/docs/deprecations | 연동 대상에서 제외. 저장소에 Sora 코드 없음(확인) |
| Suno·Udio 공식 공개 API 없음 (Suno는 2026-07 초대제 파트너만) | 조사 출처 하단 | 기존 `music/`이 제3자 `sunoapi.org` 사용 중 → 약관·지속성 위험(별도 검토 필요). 새 스튜디오는 공식 API(ElevenLabs Music·Lyria)로 |
| Remotion 무료 라이선스 해당 (3인 이하, 주인님 확인) | `docs/PLAN_20261023_FREE_VIDEO_RENDERING.md` 8절 | 렌더링·미리보기 엔진으로 사용 가능 |

## 1. 이미 가진 자산 (재사용)

| 자산 | 위치 | 상태 |
|---|---|---|
| 영상 생성 공용 기준 `ai-video-models/parse/providers` (Gemini Omni Flash·fal·Replicate, 제출→확인→결과, 재시도 없음, 업체 공식 호스트에만 키 전송) | `ai-image-studio/lib/video/*` (사본 shots·원스톱) | 운영 중. **9:16·720p·이미지→영상·오디오 끔 고정** → 넓혀야 함 |
| 브라우저 MP4 인코더 `browser-mp4-encoder` | 기준 `shorts-onestop-studio/src/lib/render/mp4Encoder.ts` | 운영 중 |
| Remotion 브라우저 렌더 | 오늘 시험(10·11절) | 720p·1080p 실시간 수준 확인. R1(크롬 하드웨어 인코딩 영상 멈춤) 대책 있음 |
| TTS 3사(OpenAI·Gemini·ElevenLabs) + Whisper 단어 시간 | `shorts-onestop-studio/src/lib/tts.ts`, `voice.ts`, `api/ai/transcribe` | 운영 중 |
| 스톡 검색(Pexels·Pixabay), 무료 사진 검색 | 원스톱 `stock.ts`, 공용 `free-photo-search` | 운영 중 |
| 영상→장면·음성 추출 `browser-video-extract`, GIF, 루프(ffmpeg.wasm) | insta·원스톱·`video-to-gif`·`infinite-loop-video` | 운영 중 |
| 이미지 스튜디오 화면 뼈대 (1단계 프롬프트·화풍 프리셋 / 2단계 플랫폼→모델→**옵션 스키마 자동 화면** / 갤러리 / 프롬프트 게시판 / 매뉴얼 / 키 등록 / 비공개 버킷 + 서명 주소 + 30일 정리) | `ai-image-studio/` v1.29 | 그대로 따라 만듦 |
| 없음 | 립싱크·아바타, Kling·Hailuo·Wan·Vidu·Runway 직접 연동, 음악 공식 API | 새로 만듦 |

## 2. AI 영상 생성 플랫폼

| 플랫폼 | 셀프 키 | 주요 기능 | 단가(USD) | 비동기 | 장점 | 단점 | 적합도 | 개발 가능 |
|---|---|---|---|---|---|---|---|---|
| **Google Gemini Omni Flash** | ✅ AI Studio 키(회원 다수 보유) | T2V·I2V·첫/끝 프레임·참조·대화형 편집·연장(최대 40초)·오디오 | 720p 약 $0.10/초, 무료 없음 | background + 상태 확인 | 회원 키 재사용·편집 기능 | 미리보기 성격, 정책 변경 잦음(Veo가 하루 전 종료) | ★5 | ✅ 이미 구현(옵션 확장만) |
| Veo 3.1 GA (Vertex) | GCP 서비스 계정 | 최대 8초, 오디오 | $0.05~0.40/초(2차) | 장시간 작업 | 최고 품질 | 회원이 GCP 설정하기 어려움 | ★2 | △ (fal·Runway 경유 권장) |
| **fal.ai (모음)** | ✅ 키 1개 | Kling 3.0·Seedance 2.0·Veo 3.1·Hailuo·Wan·LTX, 립싱크·업스케일·배경 제거까지 | Kling 3.0 Pro 720p $0.112/초, Veo 3.1 $0.20~0.40 | 대기열 + **webhook** | 모델 가장 많음·빠른 출시·키 1개 | 공식가보다 0~60% 비쌈, 장애 시 여러 모델 동시 중단 | ★5 | ✅ 이미 일부 구현 |
| **Runway API** | ✅ 크레딧 구매 | 자체 Gen-4.5·**Aleph 2(영상→영상 편집)** + Kling·Veo·Seedance·Wan·Hailuo 등 | 1크레딧=$0.01, Gen-4 Turbo $0.05/초, Veo 3.1 $0.40/초 | 작업 확인(SDK) | 공급사 직영 모음, 단가 투명 | 무료 크레딧 없음 | ★5 | ✅ 새로 |
| **Vidu Q3** | ✅ | T2V·I2V·첫/끝 프레임·참조, 1~16초 | Turbo 720p $0.06/초, Pro 1080p $0.15, **한가한 시간대 50% 할인** | 작업 + 콜백 | 싸고 길다(16초) | 인지도 낮음 | ★4 | ✅ 새로 |
| Kling 공식 | ✅ 선결제($9.80~) | V3·O3(오디오·립싱크)·4K | 720p 약 $0.10/초(2차) | 작업 + 콜백 | 품질·가격 | AK/SK 서명 인증, 선결제 | ★4 | ✅ (먼저 fal·Runway 경유) |
| MiniMax Hailuo | ✅ | 첫/끝 프레임, H3 2K·오디오 | 6초 768p $0.28(2차) | 작업→파일 ID | 저렴·움직임 좋음 | — | ★4 | ✅ (fal 경유 먼저) |
| Seedance 2.x | BytePlus 기업 콘솔 | 멀티샷·참조 영상·오디오 | 720p $0.12~0.19/초(2차) | 작업 확인 | 최상위 품질 | 직접 가입 어려움 | ★3 | ✅ fal·Runway 경유 |
| Wan 2.6~3.0 | DashScope 국제판 | 오디오 | 약 $0.10/초 | 비동기 | 오픈 계열 | 콘솔 복잡 | ★3 | ✅ fal 경유 |
| Luma Ray3 | ✅ | HDR·키프레임 | 720p $0.06~1080p $0.24/초(2차) | 콜백 | HDR | 쇼츠엔 비효율 | ★3 | ✅ 나중 |
| LTX(호스팅) | ✅ | 매우 빠름·4K | $0.06~0.32/초 | — | 속도 | 품질 중간 | ★3 | ✅ fal 경유 |
| Pika / Higgsfield / Kie.ai | 정보 엇갈림·신생·재판매 | — | — | — | — | 지속성 위험 | ★2 | ✗ 보류 |
| **OpenAI Sora 2** | **종료** | — | — | — | — | — | 0 | ✗ |
| 오픈 모델 자체 운영(Wan 2.2·HunyuanVideo·LTX-2) | GPU 서버 | — | 무료(서버비 별도) | — | 무료 | 운영자 GPU 비용 → 본인 키 원칙 위배 | ★1 | ✗ (Lab 교육용만) |

**판단**: 「Gemini 직접 + fal 모음 키 + Runway 모음 키」로 시작하고, 사용량 많은 모델만 나중에 공식 직접 연결(Vidu 우선). 연결 코드는 `submit / poll / fetchResult` 공통 틀(지금 `ai-video-providers`와 같은 구조)로 업체별 파일만 추가.

## 3. 음성·음악·립싱크·자막

| 분야 | 1순위 | 저가·무료 대안 | 제외·주의 | 개발 가능 |
|---|---|---|---|---|
| 음성(TTS) | **ElevenLabs**(한국어 상·단어 시간·감정 / 1천 자당 약 $0.10) · 한국어 캐릭터 목소리는 **Typecast**(무료 월 3만 자) | OpenAI `gpt-4o-mini-tts`(약 $0.015/분), Gemini TTS, Azure(월 50만 자 무료) | 브라우저 Web Speech는 **녹음 불가** → 미리 듣기만 | ✅ 3사 이미 구현(원스톱), Typecast·Azure 새로 |
| 음악(BGM) | **ElevenLabs Music**(공식, 라이선스 학습) | **Google Lyria 3**(곡당 약 $0.08, Gemini 키 재사용), Stable Audio 2.5, 회원이 올린 음원 | **Suno·Udio 공식 API 없음 → 제외** | ✅ 새로 |
| 립싱크·말하는 영상 | **Sync.so lipsync-2**(분당 $2.4~3, 무료 월 3회) | **Kling lipsync(fal, 초당 $0.014)** | HeyGen(비쌈)·Hedra(구독)·D-ID(품질 하락) 후순위, Wav2Lip은 **상업 이용 불가** | ✅ 새로 |
| 자막(받아쓰기) | OpenAI `whisper-1`(단어 시간, 분당 약 $0.006) | **브라우저 무료 `@remotion/whisper-webgpu`**(한국어 품질 시험 필요), ElevenLabs Scribe | gpt-4o-transcribe는 단어 시간 없음 | ✅ whisper-1 구현됨, 브라우저 판 새로 |

## 4. 렌더링·편집·후처리·스톡

| 분야 | 선택 | 비용 | 판단 |
|---|---|---|---|
| 편집·미리보기·렌더 | **Remotion(Player + `renderMediaOnWeb`) + Mediabunny** | 무료(3인 이하) | 기본 엔진. 회원 PC에서 처리 → 서버비 0 |
| 특수 변환 | ffmpeg.wasm | 무료 | GIF·역재생·형식 변환만 |
| 서버 렌더(선택) | 회원 본인 Shotstack·JSON2Video 키 | 회원 부담 | 저사양 PC·휴대폰 회원용 선택지로만 |
| 업스케일 | Topaz(fal, 720p $0.01/초~) | 소액 | fal 키 재사용 |
| 영상 배경 제거 | BiRefNet v2 video(fal) | 저렴(재확인) | fal 키 재사용 |
| 16:9→9:16 자동 화면 맞춤 | 브라우저 MediaPipe 얼굴 추적 + Remotion 자르기 | 무료 | 새로 |
| 무료 스톡 영상 | **Pexels**(월 2만 회, 한도 상향 무료) · Pixabay | 무료 | 키당 한도가 있어 **회원 본인 키**(최상위 규칙 예외 대상 아님) |
| 제외 | Revideo/Motion Canvas(중복 투자), Editframe(근거 부족) | — | — |

## 5. 추천 구성 (회원이 등록할 키를 최소화)

| 회원 키 | 쓰이는 곳 | 비고 |
|---|---|---|
| **Gemini** (대부분 이미 보유) | Omni Flash 영상, Lyria 음악, Gemini TTS, 프롬프트 다듬기 | 공용 `user_api_keys` 재사용 |
| **fal** | Kling·Seedance·Veo·Hailuo·Wan·LTX 영상, Kling 립싱크, Topaz, 배경 제거 | 키 1개로 여러 기능 |
| **ElevenLabs** (선택) | 고품질 TTS·음악·받아쓰기 | 원스톱에서 이미 등록한 회원 재사용 |
| **OpenAI** (선택) | 저가 TTS·whisper-1 | 이미 보유 회원 많음 |
| Runway·Vidu·Sync.so·Typecast (선택) | 고급·저가 선택지 | 2차 |
| **Pexels** (무료) | 스톡 영상 | 회원 본인 무료 키 |

새 키 종류(fal은 이미 있음)는 공용 연동 항목(`integration_catalog`)에 추가해 다른 프로그램도 재사용(최상위 공용 연동 규칙).

## 6. 화면 구성 안 (이미지 스튜디오 뼈대 + 영상 단계)

1. **영상 생성 작업실** — 1단계 영상 프롬프트 다듬기(카메라 움직임·화풍 프리셋), 2단계 플랫폼→모델→**옵션 스키마 자동 화면**(길이·비율·해상도·첫/끝 프레임·오디오·참조 이미지) → 생성(작업 등록 → 화면이 상태 확인 → 완료 즉시 회원 비공개 버킷에 복사)
2. **편집·합치기 스튜디오** — Remotion 타임라인: 클립 순서·자르기·전환, 음성(TTS)·배경음악·자막(자동 받아쓰기) → 브라우저 MP4(720p/1080p, 9:16·16:9·1:1)
3. **오디오 작업실** — TTS·음악·립싱크
4. **작업 결과 갤러리** — 클립·완성본(30일 보관, 다른 프로그램으로 넘기기)
5. 프롬프트 게시판 / 연동 & 사용 매뉴얼 / API키등록·플랫폼연동

## 7. 레퍼런스(공용 기준) 경계

| 공용으로 꺼낼 것(다른 프로그램이 사본 사용) | 프로그램마다 따로 둘 것 |
|---|---|
| 영상 모델 목록·단가·옵션 스키마, 업체별 제출/확인/결과 코드, 결과 버킷 복사, 오류 형식 | 영상 프롬프트 문구·화풍 |
| TTS·음악·립싱크·받아쓰기 연결 코드 | 장면 구성·대본 |
| Remotion 구성 부품(클립 이어붙이기·자막 SVG·음악 페이드)·렌더 호출·R1 점검 | 화면 디자인·흐름 |

기존 `ai-video-*`(기준 `ai-image-studio`)는 **이 프로그램으로 기준을 옮기고** 사본(shots·원스톱·뮤직비디오)을 맞춘다(이전 방법은 개발 플랜에서 결정).

## 8. 개발 가능성 종합

| 기능 | 가능 | 근거 |
|---|---|---|
| 여러 업체 AI 영상 생성(비동기) | ✅ | 공용 코드 운영 중, Vercel 300초 안에서 제출·확인 분리 |
| 브라우저 편집·렌더(무료) | ✅ | 오늘 시험 720p·1080p 성공 |
| 음성·자막 | ✅ | 원스톱 코드 운영 중 |
| 음악(공식 API) | ✅ | ElevenLabs Music·Lyria 공개 API |
| 립싱크 | ✅ | fal·Sync.so API |
| 긴 영상(10분 이상)·휴대폰 렌더 | △ | 회원 PC 성능 의존 → 길이 경고·서버 렌더 선택지 |
| 예약 자동 렌더(탭 없이) | ✗(브라우저 방식) | 필요하면 회원 본인 서버 렌더 키 |
| Sora·Suno·Udio | ✗ | 종료·공식 API 없음 |

## 9. 비용

| 구분 | 내용 |
|---|---|
| 운영자 | 서버 렌더 없음 → 추가 인프라 비용 거의 없음(저장소 30일 보관분·Vercel 함수 짧은 호출). 배포 빌드는 회당 승인 |
| 회원 | 영상 생성 초당 $0.05~0.40(모델별), TTS 분당 $0.015~, 음악 곡당 $0.08~, 렌더 0원 |
| 개발 시험 | 가장 싼 모델·짧은 길이(예: Vidu Turbo 720p 4초 ≈ $0.24, Omni Flash 4초 ≈ $0.40)로 최소 횟수, 시험 계정 본인 키, **실행 전 승인** |

## 10. 위험·남은 확인

1. Gemini 미리보기 모델이 예고 짧게 종료됨 → 모델 목록을 레지스트리 한 곳에서 관리, 종료 시 기준만 교체.
2. R1: 크롬 하드웨어 인코딩 영상을 편집에 넣으면 멈춤 → 시험 추출 + 소프트웨어 재인코딩 대책(플랜 문서 11절).
3. 휴대폰 촬영 영상·브라우저 Whisper 한국어 품질 실측 전.
4. 2차 출처 단가 재확인.
5. 기존 `music/`의 비공식 Suno 사용 — 별도 검토 제안.

## 출처
- Gemini 영상 문서: https://ai.google.dev/gemini-api/docs/video · 가격: https://ai.google.dev/gemini-api/docs/pricing
- OpenAI 종료 목록: https://developers.openai.com/api/docs/deprecations
- Runway: https://docs.dev.runwayml.com/guides/pricing/ · Vidu: https://platform.vidu.com/docs/pricing · fal: https://fal.ai/explore/image-to-video-apis
- 2차: https://invideo.io/blog/ai-video-model-pricing , https://aireiter.com/blog/kling-3-api-pricing-guide-2026 , https://wavespeed.ai/blog/cost-and-billing/luma-ai-pricing/ , https://evolink.ai/blog/wan-api-pricing-guide , https://www.atlascloud.ai/blog/guides/seedance-2-cost-per-second
- Suno API: https://www.digitalmusicnews.com/2026/07/03/suno-is-opening-an-api-partner-program/
- Sync.so: https://sync.so/pricing · Kling lipsync(fal): https://fal.ai/models/fal-ai/kling-video/lipsync/audio-to-video
- Typecast: https://typecast.ai/pricing/api/ · Azure: https://azure.microsoft.com/ja-jp/pricing/details/cognitive-services/speech-services/
- Lyria 3: https://openrouter.ai/google/lyria-3-pro-preview · 브라우저 Whisper: https://remotion.dev/docs/whisper-webgpu
- Topaz(fal): https://fal.ai/models/fal-ai/topaz/upscale/video/llms.txt · Pexels: https://www.pexels.com/api/documentation/ · Pixabay: https://pixabay.com/api/docs/
