# Runway·Vidu 직접 연동 — 개발 플랜 (2026-11-11)

- 담당: [역할: video] Claude Code(윈도우) `claude-win-video`
- 지시: 주인님 2026-11-11 「진행해 키있어」(Runway·Vidu 직접 연동)
- 상태: **v1.33 배포 완료(2026-11-11) — 실생성 2회는 주인님 키 등록 대기.** 결정(2026-11-11 주인님): 1 DB 허용 목록 승인(적용 완료) · 2 모델 4개 모두 · 3 빌드 1회 + 실생성 2회 승인.
- 구현 확정: 두 회사 모두 시작 사진 1장(끝 장면은 문서 미확인이라 끔), Vidu는 비율 칸이 없어 사진 비율을 따름, Runway 길이 5·10초(문서에 목록 없음).

## 1. 지금 상태 (확인 2026-11-11)
- 영상 모델 호출은 공용 기준 코드 `ai-video-client`(`lib/video/videoModels.ts`·`videoParse.ts`·`videoProviders.ts`, 사본 4곳: ai-image-studio·shorts-onestop-studio·shots·music-video-studio). 제공자는 `gemini`·`fal`·`replicate` 세 가지.
- 회원 키 표 `user_api_keys`의 허용 목록(`user_api_keys_provider_check`)에 **`runway`·`vidu`가 없어 등록이 막혀 있음**(가짜 회원으로 넣어 보니 거절). 관리자·시험 계정 모두 두 키 미등록.
- 영상 스튜디오 키 API(`app/api/keys/route.ts`) 허용 목록도 `gemini·fal·replicate·openai·elevenlabs`뿐.

## 2. 두 회사 API (공식 문서 2026-11-11)
| | Runway | Vidu |
|---|---|---|
| 주소·인증 | `https://api.dev.runwayml.com`, `Authorization: Bearer <키>`, `X-Runway-Version: 2024-11-06` | `https://api.vidu.com`, `Authorization: Token <키>` |
| 영상 만들기 | `POST /v1/image_to_video` — `model`·`promptImage`(https 주소 또는 data URI)·`promptText`·`ratio`·`duration` | `POST /ent/v2/img2video` — `model`·`images`[1장, 주소 또는 data URI]·`prompt`·`duration`·`resolution`, 시작·끝 장면은 `POST /ent/v2/start-end2video`(`images` 2장) |
| 결과 확인 | `GET /v1/tasks/{id}` → `status`가 `SUCCEEDED`면 `output[0]` | `GET /ent/v2/tasks/{id}/creations` → `state` `success`면 `creations[].url`(24시간 유효) |
| 실패 | 400 입력·401 키·429 너무 잦음(재시도 가능)·5xx | `err_code`: `CreditInsufficient`·`Unauthorized`·`TooManyRequests`·`TaskPromptPolicyViolation` 등. **실패한 생성은 과금 안 함** |
| 값 | 1크레딧 $0.01 | 1크레딧 0.03125위안(약 6원) |

## 3. 넣을 모델 (모델 선택표 규칙: 미리보기·종료 예정 제외, 그 회사 자체 모델만 — 같은 회사의 Veo·Kling·Seedance 재판매는 이미 fal로 있음)
| 모델 | 회사 | 값(초당, 문서) | 5초 대략 | 시작·끝 장면 | 비고 |
|---|---|---|---|---|---|
| `gen4.5` | Runway | 12크레딧 = $0.12 | $0.60(약 860원) | 문서 미확인 | Runway 최신·고품질 |
| `gen4_turbo` | Runway | 5크레딧 = $0.05 | $0.25(약 360원) | 문서 미확인 | Runway 가장 빠름 |
| `viduq3-turbo` | Vidu | 720p 12크레딧 | 약 375원 | ○(Q3 turbo·pro) | 균형 |
| `viduq3-pro` | Vidu | 720p 20크레딧 | 약 625원 | ○ | 고품질 |
- **넣지 않음**: `viduq4-preview`(미리보기), `viduq1`(1080p 5초 고정·구형).
- 세로(9:16) 비율 값(Runway `720:1280`)·Vidu Q3 엔드포인트·필드는 문서에서 아직 확인 못 함 → **구현 첫 단계에서 문서 3쪽(입력 크기·결과 주소 유효기간·Q3 레퍼런스) 추가 확인 후** 확정. 확인 안 되는 항목은 넣지 않음.

## 4. 바꾸는 곳
| 파일 | 내용 |
|---|---|
| 운영 DB(`esgxyikcnnvmlhygjkth`) | `user_api_keys_provider_check`에 `runway`·`vidu` 추가(기존 이름 그대로 두고 덧붙임 — 2026-10-22 `apify` 추가와 같은 방식). **주인님 승인 필요** |
| 공용 기준 `videoModels.ts`·`videoParse.ts`·`videoProviders.ts` | 제공자 `runway`·`vidu` 추가: 제출 → 상태 확인 → 영상 바이트(기존 「제출 번호 저장 → 화면이 몇 초마다 확인」 구조 그대로, 자동 재시도 없음·공식 호스트만). 모델은 **영상 스튜디오 추가 목록(`STUDIO_EXTRA_MODELS`)에만** → 사본 4곳은 코드만 같아지고 화면 변화 없음(미배포 대기로 다음 배포 때) |
| `ai-video-studio` 키 API·설정 화면 | `runway`·`vidu` 키 칸 + 「연동 매뉴얼」 링크(매뉴얼 글이 없으면 `platform_guides`에 새로) |
| 시험 | 요청 모양·상태 해석·오류 문구 시험(가짜 응답), 공용 사본 일치 |

## 5. 검수·비용·배포
- 로컬: 시험·tsc·린트·build(무료).
- 운영 실생성(주인님 키 등록 뒤): **Runway `gen4_turbo` 5초 1회(약 360원) + Vidu `viduq3-turbo` 5초 1회(약 375원)** — 비싼 모델(gen4.5·q3-pro)은 요청 모양이 같아 실생성 생략.
- 배포: `ai-video-studio` v1.33 빌드 1회. 사본 4곳은 다음 배포 때 함께.

## 6. 주인님이 해 주실 일
- Runway 키: https://dev.runwayml.com 에서 만든 키를, Vidu 키: https://platform.vidu.com 에서 만든 키를 **DB 허용 목록 변경 뒤** 영상 스튜디오 설정(시험 계정)에 등록. 키 값은 채팅에 적지 않음.

## 7. 주인님 결정 항목
| 번호 | 결정할 것 | 추천 |
|---|---|---|
| 1 | 운영 DB 허용 목록에 `runway`·`vidu` 추가 | 승인(없으면 키 등록 불가) |
| 2 | 넣을 모델 | §3의 4개(gen4.5·gen4_turbo·viduq3-turbo·viduq3-pro) |
| 3 | 실생성 시험 2회(약 735원, 주인님 키) + 빌드 1회 | 승인 |
