# 개발 플랜 — 백로그 3차: 후처리(립싱크·업스케일·배경 제거) + 9:16 자동 맞춤

- 작성: 2026-11-09 [역할: video] Claude Code(윈도우) `claude-win-video`
- 백로그 원문: `docs/IMPROVEMENT_BACKLOG.md` 3차 「립싱크(fal Kling lipsync·Sync.so), 업스케일·배경 제거(fal), 9:16 자동 맞춤, Runway·Vidu 직접 연동」
- 상태: **주인님 결정 대기**(아래 6절)

## 1. 지금 상태

| 항목 | 지금 |
|---|---|
| 영상 만들기 | Gemini·fal·Replicate, 회원 본인 키. fal 작업 접수·확인 코드 `lib/video/videoProviders.ts`(`submitVideoJob`·`checkVideoJob`) |
| 비율 맞춤 | 영상 합치기에 9:16·16:9·1:1 비율 선택 있음. 비율이 다른 영상은 **가운데를 잘라 꽉 채움**(`Composition.tsx` `objectFit: "cover"`)만 됨 — 가로 영상을 세로로 넣으면 양옆이 잘림 |
| 후처리 | 없음 |

## 2. fal 모델 확인 (2026-11-09 공식 페이지·OpenAPI)

| 기능 | 주소 | 입력 | 제한 | 가격(회원 fal 키) |
|---|---|---|---|---|
| 립싱크(기본) | `fal-ai/kling-video/lipsync/audio-to-video` | `video_url`, `audio_url` | 영상 2~10초·100MB·mp4/mov, 소리 2~60초·5MB | 5초마다 $0.014 |
| 립싱크(고급) | `fal-ai/sync-lipsync/v2` | `video_url`, `audio_url`, `model`, `sync_mode` | 명시 없음 | 1분 $3(pro $5) |
| 업스케일 | `fal-ai/topaz/upscale/video` | `video_url`, `upscale_factor`(1~4), `model` | — | 초당 $0.01(720p 이하)·$0.02(1080p 이하)·$0.08(그 위) |
| 배경 제거 | `bria/video/background-removal` | `video_url`, `background_color`, `output_container_and_codec` | 30초 미만·4000px 미만 | 초당 $0.14 |

## 3. 추천 범위

1. **9:16 자동 맞춤(무료)** — 영상 합치기 장면마다 「꽉 채우기(가운데 자르기) / 전체 보이기(흐린 배경)」 고르기, 기본은 지금과 같은 꽉 채우기. 브라우저 렌더라 AI 비용 없음. `Composition.tsx`(공용 `video-edit-composition`)를 기준으로 고치고 사본(`music-video-studio`) 동기화 — 사본 쪽은 급하지 않아 다음 배포 때.
2. **후처리 3종(회원 fal 키)** — 내 보관함 영상 카드에 「✨ 후처리」: 립싱크(Kling, 소리 파일 올리기 또는 영상 합치기 내레이션), 업스케일(2배, Topaz 기본 모델), 배경 제거(초록·투명 선택). 실행 전 예상 비용 표시, 결과는 새 영상으로 보관함에 저장(원본 유지, 30일 정리 규칙 그대로), 결과 불확실하면 자동 재실행 없음.
3. **넣지 않음**: Sync 립싱크 v2(1분 $3 — Kling의 약 40배, 짧은 쇼츠에는 Kling으로 충분), Runway·Vidu 직접 연동(새 키 등록 화면·새 계정이 필요한데 fal에 비슷한 모델이 이미 있어 회원 편의가 낮음 — 필요하면 fal 모델 목록에 추가하는 쪽이 낫다).

## 4. 순서

1. 9:16 맞춤 → tsc·시험·로컬 build → 커밋(미배포 대기)
2. 후처리 서버(접수·확인 API, 기존 fal 접수 코드 재사용) → 화면 → 시험
3. 시험 계정 fal 키로 각 1회 실제 확인(아래 비용) → 배포(빌드 1회, 승인 뒤) → `programs.version`

## 5. 비용

| 항목 | 횟수 | 예상 |
|---|---|---|
| 개발 시험(시험 계정 본인 fal 키) | 립싱크 5초 1회 · 업스케일 5초 720p 1회 · 배경 제거 5초 1회 | 약 $0.014 + $0.05 + $0.70 ≈ **$0.77** |
| Vercel 빌드 | 1회(모았다가) | 배포 때 승인 |
| 회원 부담 | 회원 본인 fal 키 | 위 단가 그대로 |

## 6. 주인님 결정 항목

1. 범위: 9:16 맞춤 + 후처리 3종(추천) / 9:16 맞춤만 / 후처리만
2. 넣지 않을 것: Sync v2·Runway·Vidu 제외에 동의하시는지
3. 시험 비용 약 $0.77(시험 계정 fal 키) 진행 여부
