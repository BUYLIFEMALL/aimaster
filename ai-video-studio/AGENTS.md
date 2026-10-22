# AI 영상 스튜디오 (`ai-video-studio`) — 에이전트 인수인계

> 주소: https://ai-video-studio.buylife.xyz · 현재 **v1.01**(2026-10-23) · 운영 DB `esgxyikcnnvmlhygjkth` · Vercel 프로젝트 `ai-video-studio`(팀 buylife)
> 플랜: `docs/PLAN_20261023_AI_VIDEO_STUDIO.md` · 조사 보고서: `docs/RESEARCH_20261023_PLATFORMS.md` · 무료 렌더 시험: 루트 `docs/PLAN_20261023_FREE_VIDEO_RENDERING.md`

## 1. 사용목적 및 대상
- **영상 연동 레퍼런스 프로그램** — `ai-image-studio`가 이미지 모델 연동 기준이듯, 이 프로그램은 AI 영상 생성(이후 음성·음악·자막·브라우저 렌더) 연동의 기준이다. 다른 프로그램은 **연동 부분만** 공용 사본으로 가져다 쓰고 프롬프트·화면은 각자 둔다.
- 대상: 쇼츠·릴스 크리에이터, 제품 홍보 영상이 필요한 판매자, 여러 영상 AI를 비교해 쓰려는 회원.

## 2. 기술 스택·도구
- Next.js 14 App Router · TypeScript · Tailwind · Supabase(공용 DB·비공개 버킷) · Vercel(cron 30일 정리).
- 뼈대: **AI 음악 스튜디오(`ai-music-studio`)** 복사(작업 표·잠금·상태 확인 시 진행·보관함·정리 cron) + 화면 배치는 **AI 이미지 스튜디오**(1단계 프롬프트·화풍 프리셋 → 2단계 플랫폼·모델·옵션).
- 영상 업체 호출: 공용 기준 코드 **`ai-video-models` / `ai-video-parse` / `ai-video-providers`** — **기준 위치가 이 프로그램 `lib/video/`**(2026-10-23 ai-image-studio에서 이전). 사본: `ai-image-studio/lib/video/`·`shots/src/lib/video/`·`shorts-onestop-studio/src/lib/`·`music-video-studio/src/lib/video/`. **기준만 고치고 `node scripts/check-shared-modules.mjs --sync`.**

## 3. 핵심 기능·구조·장단점
- 화면: `/create`(영상 생성 작업실) · `/library`(작업 결과 갤러리) · `/guide`(매뉴얼) · `/settings`(API키등록·플랫폼연동: gemini·fal·replicate).
- 흐름: `POST /api/generations` → 시작/끝 장면 사진을 비공개 버킷 `ai-video-studio/{user}/{id}/start.jpg`에 저장 → 1시간 서명 주소로 `submitVideoJob`(재시도 없음) → `provider_meta`에 작업 정보 저장 → 화면이 8초마다 `GET /api/generations?ids=` → `advance()`가 `checkVideoJob` → 완성 MP4를 `{user}/{id}/video.mp4`에 저장 → 서명 주소로 재생·영문 파일명 내려받기.
- 표 `avs_generations`(RLS 본인 조회·삭제만, 쓰기는 서버) · 동시 4개 · 20분 시간 초과 · 접수 6분 유예(Gemini가 동기 방식으로 바뀌면 최대 270초).
- 모델(1차-가): Gemini Omni Flash(글만·사진, 16:9/9:16) · fal Seedance 1.5 Pro · fal Kling O3 · Replicate Seedance 1 Lite · Kling v2.1 — 단가·길이는 공용 `VIDEO_MODELS` 한 곳에서.
- 장점: 회원 본인 키, 만들기 전 예상 비용·확인 단계, 창을 닫아도 서버가 결과 저장, 30일 자동 정리.
- 한계: 해상도 720p 고정(공용 코드), 오디오 끔(fal), 텍스트→영상은 Gemini만, 모델 목록 1차-가 범위.

## 4. 버전 히스토리
- **v1.02 (2026-10-23, Claude Code 윈도우)**: 1차-나 — fal 최신 모델 5종(Kling 3.0 Standard·Seedance 2.0·Veo 3.1·MiniMax H3(구 Hailuo)·Wan 3.0)을 공용 기준에 **모델별 입력 칸 규칙(`FalInputSpec`: 사진 칸·길이 형식·소리 칸·비율·해상도)**으로 추가, `STUDIO_VIDEO_MODELS`(스튜디오 전용 — 다른 프로그램 목록 불변), 해상도 선택·해상도별 비용. 실생성: Kling 3.0 5초 → 5.04초 8.4MB · MiniMax H3 768P → 5.18초 6.5MB · Wan 3.0 480p → 5초 2.9MB 성공 / **Seedance 2.0은 실사 인물 사진을 업체가 거절**(「likenesses of real people」) → 쉬운 안내 문구로 바꿈(미배포 대기) / Veo 3.1 실생성 미시험(비용 승인 대기).
- **v1.01 (2026-10-23, Claude Code 윈도우)**: 1차-가 — 생성 작업실·갤러리·매뉴얼·키 등록, 공용 영상 기준 이전, DB(`avs_generations`·버킷·programs·요금제 3·VIP 자동 부여·시험 계정), 썸네일. 검수: 시험 6, tsc, build, 크롬 시험 계정 실생성 2회 성공(Gemini 글만 5초 16:9 → 5.01초 1280×720 2.0MB / fal Seedance 사진→영상 5초 → 5.04초 6.5MB), 390px(iframe 확인).

## 5. 남은 작업 → `docs/IMPROVEMENT_BACKLOG.md`
- **1차-나**: fal 새 모델(Kling 3.0·Seedance 2.0·Veo 3.1·Hailuo·Wan) — 공식 입력값 확인하며 하나씩, 공용 기준에 모델별 추가 입력(`extra`)·해상도·오디오·글만 생성(fal t2v) 선택값.
- 2차: 편집·합치기 스튜디오(Remotion + Mediabunny, R1 대책). 3차: 립싱크·업스케일·배경 제거·Runway/Vidu.
- 관찰: 첫 배포에서 fal 생성 요청이 2번 「fal API 키가 없습니다」(400)로 막힘(DB 키는 10-21부터 그대로) → 조회 실패 기록(`[getUserApiKey] 없음`, 값 없음) 추가 후 재배포하자 성공. 재발하면 Vercel 로그에서 이 기록부터 확인.

## 6. 연계·병합 아이디어
- AI 음악 스튜디오 보관함 곡을 2차 편집 스튜디오 배경음악으로 바로 가져오기.
- 갤러리 영상 → 원스톱 쇼츠·Shots 장면 클립으로 넘기기, 뮤직비디오 장면 클립 생성을 이 프로그램 기준 코드로 통일.

## 7. UI/UX 개선안
- 모델 카드에 결과 예시(짧은 미리보기 영상), 프롬프트 게시판(이미지 스튜디오 구조), Gemini로 영상 프롬프트 다듬기 버튼.

## 배포·운영 메모
- 배포: `node scripts/deploy.mjs ai-video-studio --go --owner "<작업 중 표 내 줄 일부>"` (빌드 1회 = 비용, 사전 승인).
- 환경변수(운영): `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_ANON_KEY`·`SUPABASE_SERVICE_ROLE_KEY`·`CRON_SECRET`(이 프로젝트 전용)·`NEXT_PUBLIC_MAIN_SITE_URL`.
