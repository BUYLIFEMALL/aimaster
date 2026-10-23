# 개발 플랜 — Veo 3.1 Preview 종료 대응: Gemini Omni Flash로 교체 (v1.11 → v1.12)

> 작성 2026-10-23, Claude Code(윈도우). 주인님 승인: 「먼저 진행하고 … 진행해」(배포 1회 + 시험 생성 1회 약 $0.40 범위).

## 문제
- Google이 Gemini API의 `veo-3.1-*-generate-preview` 3종을 **2026-10-22 종료**(https://ai.google.dev/gemini-api/docs/video). 이 프로그램의 장면 영상 생성이 이 모델만 사용 → 회원 생성 실패.
- 공식 대체: `gemini-omni-1.1-flash`(Interactions API). 비율 `9:16`/`16:9`, 글만으로 생성, 첫·끝 프레임 지원, **길이 지정 칸 없음(프롬프트로 안내)**(https://ai.google.dev/gemini-api/docs/omni).

## 범위
1. 공용 기준 `ai-video-providers`(`ai-image-studio/lib/video/videoProviders.ts`)에 선택값 추가 — `aspectRatio?: "9:16" | "16:9"`(기본 9:16), `startUrl` 생략 가능(Gemini만, 다른 업체는 오류). 기본값 그대로라 사본(Shots·원스톱) 동작 불변 → 사본 동기화만, 배포는 다음 배포 때(미배포 대기).
2. 이 프로그램에 공용 사본 3개(`ai-video-models`·`ai-video-parse`·`ai-video-providers`) 추가 → `src/lib/video/`. 시작 API를 `submitVideoJob`으로, 상태 API는 완료 시 MP4를 바로 응답(`checkVideoJob`), 내려받기 API·Veo 전용 코드 제거.
3. 모델 선택지: Gemini Omni Flash 1개(초당 약 $0.10). 저장된 옛 Veo 값은 서버·화면에서 새 모델로 자동 변환. 길이 4·6·8초는 그대로 두고 프롬프트로 안내(실제 길이는 시험으로 확인해 화면 문구 결정).
4. 루프: 끝 프레임 = 시작 이미지(공용 `endUrl`).

## 검수
- `npx tsc --noEmit`, 기존 테스트, `npm run build`, `node scripts/check-shared-modules.mjs`.
- 시험 생성 1회(시험 계정 `buylifemall@naver.com` 본인 Gemini 키) → 크롬 실제 화면에서 장면 영상 재생 확인.

## 비용
- Vercel 빌드 1회(뮤직비디오). 시험 생성 1회 약 $0.40~0.80(회원 본인 키). 다른 비용 없음.

## 버전·배포
- v1.12(`src/lib/version.ts` + DB `programs.version`). Shots·원스톱은 사본만 반영(미배포 대기, `docs/SHARED_MODULES.md` 기록).
