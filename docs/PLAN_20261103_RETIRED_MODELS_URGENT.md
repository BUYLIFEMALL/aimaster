# 플랜 — 종료(예정) 모델 긴급 교체 1단계 (2026-11-03, 승인 대기)

작성: Claude Code(맥미니) `claude-mac-20261101-blog` [역할: mac-mini] · 주인님 「1번부터 진행해」
기준: `docs/AI_MODEL_CATALOG.md`(모델 선택표), 공식 문서(2026-11-03 확인).

## A. Gemini 음성 — 11-17 종료 (`gemini-2.5-flash-preview-tts`)
새 모델 `gemini-3.8-flash-tts`(고품질)·`gemini-3.8-flash-lite-tts`(저렴)는 **호출 방식이 다르다**: `POST /v1beta/interactions`, 본문 `input[].content[].text` + `annotations: [{type:"speech_metadata", style}]`, `response_format:{type:"audio"}`, `generation_config.speech_config:[{voice}]`. 응답 `steps[type=model_output].content[type=audio].data` = **완성된 WAV**(지금처럼 PCM에 머리말을 붙이면 안 됨). 목소리 Kore·Aoede·Puck·Charon 그대로. 속도 칸이 없어 말투·속도를 `style` 문장으로 넘김.

| 프로그램 | 파일 | 할 일 |
|---|---|---|
| `ai-video-studio` (공용 기준 `video-edit-voice`) | `lib/edit/voice.ts`, `lib/edit/tts.ts` | 목록 2.5 → 3.8 두 개, Gemini 호출부를 새 방식으로, 옛 저장값 변환 |
| `music-video-studio` (사본) | `src/lib/edit/voice.ts` | `--sync`만(이 프로그램은 음성 서버 호출 없음 → 배포 불필요, 다음 배포 때) |
| `shorts-onestop-studio` | `src/lib/voice.ts`, `src/lib/tts.ts` | 위와 같은 수정(기준 코드가 아니라 원조 사본이라 손으로 같게) |

## B. OpenAI 이미지 — `gpt-image-1` 10-23 종료, `gpt-image-1-mini`·`gpt-image-1.5` 12-01 종료
새 모델 `gpt-image-2.5-flare`(빠른 일상 생성 · 기본)·`gpt-image-2.5-sunburst`(편집 정밀)는 **같은 Images API·같은 인자**(size·quality·output_format, quality에 `xhigh`·`max` 추가). `gpt-image-2`는 공식 안내에 호출 정보가 없어 넣지 않음. 저장된 옛 값은 `flare`로 변환.

| 프로그램 | 파일 |
|---|---|
| `ai-image-studio` (이미지 기준) | `lib/providers/registry.ts`, `adapters/openai.ts` 기본값, `components/GalleryClient.tsx` 이름표(옛 기록 표시는 유지) |
| `naver-blog-agent` | `src/lib/ai/contentModels.ts` |
| `naver-blog-allinone` | `src/lib/blog/models.ts` |
| `playlist-channel-studio` | `src/lib/playlist/types.ts`(변환표 이미 있음) |
| `threads-affiliate-poster` | `src/lib/ai/imageModels.ts` |
| `threads-content-ops` | `lib/personas.ts` |
| `threads-easy-planner` | `src/lib/ai/imageModels.ts` |
(Lab `labs/kit-threads`는 운영이 아니라 이번 범위에서 뺌 — 기록만)

## C. OpenAI 글 — `tarot` `o3-mini`·`o1` 10-23 종료
`tarot/lib/deck.ts` 선택지 맨 위에 `gpt-6.1-sol`·`gpt-6.1-terra`·`gpt-6-luna` 추가(선택표 추천), `o3-mini`·`o1` 삭제, 옛 저장·공유 링크 값은 `normalizeOpenAIModel`에서 `gpt-6.1-terra`로 변환.

## 순서·충돌
- `naver-blog-agent`·`naver-blog-allinone`은 윈도우 7개 배포 요청(`DEPLOY_REQUEST_20261103_MAC.md`)에 들어 있다 — **같은 폴더를 윈도우가 CLI로 배포하면 내 미커밋 수정이 섞여 올라가므로**, 수정 → 바로 커밋 후 윈도우에 「이번 배포에 함께 포함」을 알린다(빌드 추가 없음).
- 그 밖에 다른 세션 작업 중인 폴더 없음(`ACTIVE_WORK.md` 확인).

## 검사
맥미니: 프로그램마다 `tsc --noEmit`, 있는 시험(기대값만 고침). 음성 새 호출 모양은 실제 1회 확인이 필요 → 윈도우 배포 뒤 시험 계정 본인 Gemini 키로 3.8 TTS 1회(약 $0.01 이하). 이미지는 `flare` 1장(1024 low, 수 센트).

## 비용
| 항목 | 횟수 | 비고 |
|---|---|---|
| 빌드(즉시, 회원 피해 예외) | 9회: ai-video-studio, shorts-onestop-studio, ai-image-studio, playlist-channel-studio, threads-affiliate-poster, threads-content-ops, threads-easy-planner, tarot + (naver-blog 2개는 이미 승인된 7개 배포에 포함) | 순차 |
| 생성 시험 | 음성 1~2회 + 이미지 1회 | 시험 계정 본인 키, 합계 1달러 미만 |
버전: 배포 프로그램마다 +0.01.
