# 배포 요청 — 종료 모델 긴급 교체 (맥미니 → 윈도우, 2026-11-03)

작성: Claude Code(맥미니) `claude-mac-20261101-blog` [역할: mac-mini]
승인: 주인님 채팅 「진행해」(2026-11-03) — 플랜 `docs/PLAN_20261103_RETIRED_MODELS_URGENT.md`, **빌드 8회 + 생성 시험(시험 계정 본인 키, 합계 1달러 미만) 승인**. 범위를 넘으면 다시 여쭐 것.
분류: **회원 피해 수정 → 즉시 배포 예외**(음성은 2026-11-17 종료 전에 반드시, 이미지 `gpt-image-1`·타로 `o3-mini`/`o1`은 10-23에 이미 종료돼 지금 실패 중).

요청함: ask `b2143587`

## 커밋
| 묶음 | 커밋 | 내용 |
|---|---|---|
| 음성 | `9045a5005` | `gemini-2.5-flash-preview-tts` → `gemini-3.8-flash-tts`/`-lite-tts`, **호출을 Interactions API로 교체**(`POST /v1beta/interactions`, 응답은 완성된 WAV라 머리말을 붙이지 않음, 말투·빠르기는 `speech_metadata.style`), 옛 저장값 변환 |
| 이미지 | `87b12267e` | 종료 모델 4개 삭제·옛 값 → `gpt-image-2.5-flare`로 바꿔 **실제 호출에도 새 이름 전달**, OpenAI 기본값 `gpt-image-2.5-flare`, `response_format:"url"` 제거·`b64_json` 받기(이미지 스튜디오·쓰레드 제휴 — GPT Image는 주소를 주지 않음), 이미지 스튜디오 화질 `extra_high`→`xhigh`·`output_format` 전달 |
| 타로 | `22fbd1b03` | `o3-mini`·`o1` 삭제·옛 값 → `gpt-5.6-sol`(공식 대체), `gpt-5/6/o` 계열을 추론 모델로 판정해 출력 한도 +4000·대기 150초·`maxDuration 180`(빈 결과·중간 끊김 방지) |

맥미니 검사: 11개 프로그램 `tsc --noEmit` 통과(뮤직비디오는 기존 `renderTrace` 오류 1건 — 이번 수정과 무관), 공용 사본 `check-shared-modules` 일치. `tsx` 시험은 맥에서 못 돌림 → **윈도우에서 `npm test`가 있는 프로그램은 실행**(특히 `naver-blog-allinone`).

## 배포 순서 (한 번에 하나씩, 앞 배포 Ready 확인 뒤 다음)
| 순서 | 폴더 | slug | 지금 → 새 버전 | 비고 |
|---|---|---|---|---|
| 1 | `ai-video-studio` | ai-video-studio | v1.25 → v1.26 | 음성 |
| 2 | `shorts-onestop-studio` | shorts-onestop-studio | DB v1.42 / 코드 `"v2.0"`(형식 어긋남) → **둘 다 v1.43** | 음성 |
| 3 | `ai-image-studio` | ai-image-studio | v1.30 → v1.31 | 이미지 기준 |
| 4 | `playlist-channel-studio` | playlist-channel-studio | v1.33 → v1.34 | |
| 5 | `threads-affiliate-poster` | threads-affiliate-poster | v1.84 → v1.85 | |
| 6 | `threads-content-ops` | threads-content-ops | v2.21 → v2.22 | |
| 7 | `threads-easy-planner` | threads-easy-planner | v1.49 → v1.50 | |
| 8 | `tarot` | tarot-reading | v1.27 → v1.28 | |
| — | `naver-blog-agent`, `naver-blog-allinone` | | **`DEPLOY_REQUEST_20261103_MAC.md`의 7개 배포에 함께 실림**(같은 폴더 다음 배포). 이미 v2.26으로 배포된 블로그 에이전트는 다음 배포 때 v2.27 | 빌드 추가 없음 |
| — | `music-video-studio` | | 공용 사본 목록만 바뀜(음성 서버 호출 없음) → **미배포 대기** | |

각 프로그램: `lib/version.ts` +0.01 → `npx tsc --noEmit`·(있으면)`npm test`·`npm run build` → `vercel deploy --prod --yes` → Ready(시간 초과로 보이면 `vercel inspect`) → DB `update programs set version='<새>', updated_at=now() where slug='<slug>';` → `docs/PENDING_DEPLOYS.md`·프로그램 `AGENTS.md` 기록.

## 배포 뒤 실제 시험 (시험 계정 `buylifemall@naver.com` 본인 키, 승인 범위)
1. AI 영상 스튜디오 편집 → 내레이션: 음성 모델 「Gemini 3.8 Flash TTS」로 짧은 문장 1회 → 재생되는지(WAV).
2. 이미지 스튜디오: `gpt-image-2.5-flare`, 1024x1024, 화질 low 1장 → 갤러리에 저장되는지.
3. 플레이리스트: 참조 이미지(페르소나) 있는 상태로 `gpt-image-2.5-flare` 1장 — **flare가 편집(`/v1/images/edits`)을 지원하는지 공식 문서에 없음**. 실패하면 그 오류 원문을 맥미니에 알려 주면 sunburst로 돌리는 수정을 한다.
4. 타로: OpenAI 모델 `gpt-5.6-luna`로 3장 리딩 1회 → 본문이 비지 않는지.
(시험 계정에 해당 키가 없으면 그 시험은 건너뛰고 「키 없음」으로 기록)

## 결과 (2026-11-03, 윈도우 Claude Code `claude-win-20261024-music`)
- 8개 모두 순서대로 배포 Ready·DB 버전 갱신(빌드 8회, 승인 범위 안). 버전 커밋 `d9448b5bb`.
| 순서 | 프로그램 | 버전 | 배포 | 시험 |
|---|---|---|---|---|
| 1 | `ai-video-studio` | v1.26 | `ai-video-studio-nikbwpt4l` | 음성 Gemini 3.8 Flash TTS 1회 통과(6.4초, WAV 188KB, RIFF 머리말) |
| 2 | `shorts-onestop-studio` | v1.43 | `shorts-onestop-studio-2z711hpa9` | 같은 음성 공용 코드 — 영상 스튜디오 시험으로 대신(자체 호출 시험 안 함) |
| 3 | `ai-image-studio` | v1.31 | `ai-image-studio-2amw33trt` | gpt-image-2.5-flare 1024 low 1장 통과(10.5초, b64). 갤러리 저장은 미확인 |
| 4 | `playlist-channel-studio` | v1.34 | `playlist-channel-studio-e5lnm0rdl` | 참조 이미지 편집(`/v1/images/edits`) flare 1장 통과(15.1초) — flare가 편집 지원함 확인 |
| 5 | `threads-affiliate-poster` | v1.85 | `threads-affiliate-poster-dg55pgkc0` | 호출 시험 안 함(요청서 범위 밖) |
| 6 | `threads-content-ops` | v2.22 | `threads-content-dq8rs2jct` | 호출 시험 안 함(요청서 범위 밖). 배포 도구 출력에 결과 줄이 없어 `vercel ls`로 Ready 확인 |
| 7 | `threads-easy-planner` | v1.50 | `threads-easy-planner-matxodjk3` | 호출 시험 안 함(요청서 범위 밖) |
| 8 | `tarot` | v1.28 | `tarot-ofrylsvat` | gpt-5.6-luna 3장 리딩 1회 통과(7.5초, 본문 828자, finish stop), 메뉴에 o3-mini·o1 없음 |
- 시험 4개 모두 통과 → 플레이리스트를 sunburst로 돌리는 수정은 필요 없음. 생성 비용 합계 약 $0.15 이하(추정).
- `naver-blog-agent`·`naver-blog-allinone`은 `DEPLOY_REQUEST_20261103_MAC.md` 배포 몫으로 남김(이 세션은 배포 안 함). `music-video-studio`는 미배포 대기 그대로.
