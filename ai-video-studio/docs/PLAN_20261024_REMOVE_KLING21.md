# 공용 영상 모델에서 Replicate Kling v2.1 제거 플랜 (2026-10-24)

> 상태: **승인됨(주인님 「Kling v2.1 제거 진행해」, 빌드 최대 5회 안내 후)** · Claude Code(윈도우, 영상 담당 `claude-win-video`)
> 대상: ① AIMaster 운영 · 공용 기준 `ai-video-models`(`ai-video-studio/lib/video/videoModels.ts`)

## 문제
Replicate가 `kwaivgi/kling-v2.1`을 종료(오류 1203 `discontinued`, 2026-10-24 실생성으로 확인). 다른 프로그램용 `VIDEO_MODELS`(5개)와 스튜디오용 목록 모두에 남아, 고르면 항상 실패.

## 영향 확인
- 기본 모델 `DEFAULT_VIDEO_MODEL = VIDEO_MODELS[0]` = Gemini Omni Flash → 바뀌지 않음.
- 옛 기록·저장된 장면의 이름 표시는 `findVideoModel(...)?.name` 대체값이 있어 깨지지 않음. 업체가 접수를 거절하므로 진행 중 작업은 없음.
- 시험: `ai-video-studio/tests/catalog.test.mjs`(Kling v2.1로 비율·길이·단가 확인), `shorts-onestop-studio/tests/video.test.ts` → 다른 모델로 바꿈(지우지 않음).

## 순서
1. 기준에서 제거(주석으로 종료 기록) → 시험 기대값 수정.
2. 사본 복사: `ai-image-studio`·`shorts-onestop-studio`·`shots`(스크립트 `--sync`는 뮤직비디오 사본까지 덮어써서 쓰지 않음). **뮤직비디오 사본은 그 폴더를 작업 중인 세션이 다음 배포 때 `--sync`로 맞춤**(인수인계에 요청).
3. 배포(회원 기능 실패 수정 → 바로 배포 예외), 한 번에 하나씩: AI 영상 스튜디오 → Shots → 원스톱 쇼츠(각 버전 +0.01, 그 프로그램의 미배포 대기분 함께). AI 이미지 스튜디오는 화면에서 이 목록을 쓰지 않아 미배포 대기.
4. 각 프로그램 크롬에서 모델 선택 목록에 Kling v2.1이 없는지 확인. 영상 생성은 하지 않음.

## 비용
빌드 3회(최대 5회 승인 범위 안), AI 호출 없음.
