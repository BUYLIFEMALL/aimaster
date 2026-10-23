# AI 영상 스튜디오 (`ai-video-studio`) — 개발 플랜 (2026-10-23, Claude Code 윈도우)

> 상태: **플랜 — 주인님 승인 전(코드 작성 전)**. 대상: ① AIMaster 운영.
> 근거: 조사 보고서 `docs/RESEARCH_20261023_PLATFORMS.md`(웹 보고서 https://claude.ai/artifact/NaYuBog8xDMF1cG9Hq3isB), 무료 렌더링 시험 `docs/PLAN_20261023_FREE_VIDEO_RENDERING.md` 10·11절.
> 주인님 지시: 「ai-image-studio처럼 영상 전용 레퍼런스 자동화」 · 이름 「AI 영상 스튜디오」 확정 · 「한 번에 다 만들려고 하지 말고 단계적으로 검증하면서 개발」.

## 0. 결론 요약

- **3차로 나눠 만든다.** 1차 = 영상 생성 작업실 + 결과 갤러리(레퍼런스 연동의 핵심) → 2차 = 편집·합치기 스튜디오(회원 PC 무료 렌더) → 3차 = 오디오·립싱크·후처리.
- 각 차수는 **작게 만들고 → 로컬 시험 → 배포 → 크롬 실제 생성 확인** 뒤 다음 차수로 간다.
- 영상 모델 연동 공용 기준 코드(`ai-video-*`)의 기준 위치를 `ai-image-studio`에서 **이 프로그램으로 옮겨** 영상 레퍼런스로 삼는다.

## 1. 기존 프로그램에서 가져올 것 / 보강할 단점

| 프로그램 | 가져올 것 | 보강할 단점 |
|---|---|---|
| AI 이미지 스튜디오 `ai-image-studio` v1.29 | 화면 뼈대(1단계 프롬프트·화풍 프리셋 / 2단계 플랫폼→모델→**옵션 스키마 자동 화면**), 갤러리, 프롬프트 게시판, 키 등록, 비공개 버킷 + 서명 주소 + 30일 정리, 영상 공용 코드 `lib/video/*` | 이미지는 동기 생성 → 영상은 작업 등록·상태 확인 방식 필요 |
| AI 음악 스튜디오 `ai-music-studio` v1.01(오늘) | 같은 날 만든 「레퍼런스 스튜디오」 구성(공급자 registry·adapters, 비동기 작업 표, 모델 비교, 보관함) | — (구조를 맞춰 두 스튜디오가 서로 연결되게) |
| AI 쇼츠 원스톱 `shorts-onestop-studio` v1.37 | 브라우저 MP4 인코더, TTS 3사·Whisper, 스톡 검색, 영상 저장 연결 코드(`videoGen.ts`) | 9:16·720p 고정 |
| Shots `shots` v1.38 | 장면 영상 저장 패턴(공개 버킷) | 공개 버킷 → 새 프로그램은 비공개 + 서명 주소 |
| 뮤직비디오 `music-video-studio` v1.12 | 가로 비율·글만 생성·루프(끝 화면) 사용 사례 | 결과를 서버에 저장 안 함 → 새 프로그램은 30일 보관 |
| 오늘 시험(Remotion·Mediabunny) | 브라우저 렌더 검증 결과, R1 대책 | 2차에서 반영 |

## 2. 프로그램 이름·소개

- 이름: **AI 영상 스튜디오**(확정), slug `ai-video-studio`, 주소 `https://ai-video-studio.buylife.xyz`.
- 한 줄 소개 예시(56자): 「Gemini·Kling·Seedance 등 여러 AI 영상 모델을 본인 키로 골라 만들고 비교·보관하는 영상 작업실」.

## 3. 차수별 기능

### 1차 (v1.01) — 영상 생성 작업실 + 갤러리
좌측 메뉴(이미지 스튜디오와 같은 배치, 767px 이하 ☰ 메뉴):
1. **🎬 영상 생성 작업실** — 1단계: 영상 프롬프트 다듬기(카메라 움직임·화풍 프리셋, 회원 Gemini 키). 2단계: 플랫폼 → 모델 → 옵션 자동 화면(길이·비율·해상도·오디오·시작/끝 이미지·참조 이미지) → 예상 비용 → 생성(작업 등록 → 화면이 몇 초마다 상태 확인 → 완성 즉시 회원 비공개 버킷에 복사).
2. **🗂️ 작업 결과 갤러리** — 재생·다운로드·삭제·사용 모델·비용 기록·30일 자동 삭제 안내, 다른 프로그램으로 넘기기(2차 편집 스튜디오·원스톱).
3. **📝 영상 프롬프트 게시판** — 이미지 스튜디오 게시판 구조 재사용(프롬프트 내용은 이 프로그램 고유).
4. **📖 연동 & 사용 매뉴얼**, 5. **🔑 API키등록·플랫폼연동**(하단 연동 매뉴얼 박스).

연동 모델(1차):

| 공급자 | 모델 | 회원 키 |
|---|---|---|
| Google 직접 | Gemini Omni Flash (글·이미지→영상, 첫/끝 프레임, 16:9·9:16, 720p) | Gemini(대부분 보유) |
| fal | Kling 3.0, Seedance 2.0, Veo 3.1, Hailuo, Wan (+ 지금 있는 Kling O3·Seedance 1.5) | fal |
| Replicate | 지금 있는 Seedance 1 Lite·Kling v2.1 | Replicate |

### 2차 (v1.1x) — 편집·합치기 스튜디오 (회원 PC 무료 렌더)
- 갤러리 클립 + 업로드 영상 + 음악(AI 음악 스튜디오 보관함 연결 또는 업로드) + 음성(TTS) + 자막(자동 받아쓰기) → Remotion Player 미리보기 → `renderMediaOnWeb` MP4(720p/1080p, 9:16·16:9·1:1).
- R1 대책: 넣는 영상마다 첫 1초 시험 추출 → 멈추면 Mediabunny 소프트웨어 재인코딩.
- Remotion 부품을 공용 기준 코드로 등록(뮤직비디오 최종 합치기 등에서 재사용).

### 3차 — 오디오·립싱크·후처리·직접 연동
- 립싱크(fal Kling lipsync·Sync.so), 업스케일·배경 제거(fal), 16:9→9:16 자동 화면 맞춤(브라우저), Runway(Aleph 2 편집)·Vidu 직접 연동, ElevenLabs Music·Lyria BGM.

## 4. 구현 순서·검수 (1차)

| 단계 | 작업 | 검수 |
|---|---|---|
| 1 | 폴더 `ai-video-studio/` 생성 — `ai-image-studio` 뼈대 복사(로그인·권한 `requireProgramAccess`/`checkProgramAccessApi`·사이드바·키 등록·매뉴얼), `lib/version.ts` v1.01 | `tsc`·빌드 |
| 2 | **공용 기준 이전**: `ai-video-models/parse/providers` 기준을 `ai-video-studio/lib/video/`로 옮기고 `ai-image-studio`는 사본으로 전환(`check-shared-modules.mjs`). 기준에 선택값 추가: 모델별 추가 입력(`extra`), fal 글만 생성 모델, `generate_audio` 켜기, 해상도. 기본값 그대로 → 사본 동작 불변 | 사본 일치·원스톱 시험 13·뮤직비디오 시험 18 |
| 3 | 영상 모델 표 + 옵션 스키마(이미지 스튜디오 `ModelOptionSchema` 방식) — fal 새 모델 5종 요청 모양 | 모델별 요청 본문 단위 시험(가짜 응답) |
| 4 | DB(운영 `esgxyikcnnvmlhygjkth`): 표 `avs_jobs`(user_id·RLS·상태·모델·옵션·예상 비용·결과 경로), 비공개 버킷 `ai-video-studio`, SQL 파일 `ai-video-studio/supabase/migrations/` | SQL 파일 + 크롬 SQL 편집기 적용(승인) |
| 5 | API: 생성(작업 등록) · 상태 확인(완성 시 버킷 복사·중복 방지) · 갤러리 목록/삭제 · 30일 정리(공용 `cleanup-usage-log`) | 모의 공급자로 전체 흐름 시험 |
| 6 | 화면: 작업실·갤러리·게시판·매뉴얼·키 등록 + 휴대폰 폭 | 크롬 실제 창 데스크톱·390px |
| 7 | Vercel 프로젝트·`ai-video-studio.buylife.xyz`·환경변수, `programs` 등록(app_url·요금제 3단계·상세 소개·detail_sections·썸네일), VIP 자동 부여 확인 | 배포 Ready·시험 계정 실제 생성 |
| 8 | 인수인계 6종·역량 지도 카드·`SHARED_FEATURE_MAP`(영상 연동 기준 = ai-video-studio)·HANDOFF | — |

## 5. 비용 (사전 보고 — 1차)

| 구분 | 항목 | 예상 | 누구 부담 | 승인 |
|---|---|---|---|---|
| 개발 시험 | Gemini Omni Flash 4초 × 2(글만·이미지) | 약 $0.80 | 시험 계정 본인 Gemini 키 | 필요 |
| 개발 시험 | fal Kling 3.0 5초 × 1, Hailuo 6초 × 1, Seedance 2.0 Fast 5초 × 1 | 약 $2.0 | 시험 계정 본인 fal 키(미등록이면 등록 필요) | 필요 |
| 개발 시험 합계 | | **약 $3 이하** | | |
| 배포 | Vercel 빌드 | **3~5회**(신규 첫 배포 + 수정) | 운영자 | 필요 |
| 사본 프로그램 | ai-image-studio·shots·원스톱·뮤직비디오 사본 동기화(동작 불변) | 빌드 0회(미배포 대기) | — | — |
| 운영 인프라 | Supabase 저장 용량 | 클립당 1~10MB × 30일 보관 — 기존 요금제 범위 예상 | 운영자 | — |
| 운영 인프라 | 서버·도메인 | 없음(렌더는 2차부터 회원 PC) | — | — |
| 회원 부담 | 영상 생성 | 초당 $0.05~0.40(모델별) | 회원 본인 키 | — |

## 6. 버전·배포·인수인계

- 버전: 새 프로그램 `v1.01`(코드 + `programs.version`), 이후 배포마다 +0.01.
- 배포: 대량 신규 개발 → 예외 ①로 1차 완성 시 배포. 2차·3차는 각각 완성 후 배포.
- 산출물: `ai-video-studio/` AGENTS.md·README.md·docs/IMPROVEMENTS.md·IMPROVEMENT_BACKLOG.md·DESIGN_HANDOFF.md·이 플랜, 루트 역량 지도 카드·SHARED_FEATURE_MAP·SHARED_MODULES·HANDOFF.

## 7. 확인이 필요한 결정

1. 3차 구성과 1차 범위(생성 작업실 + 갤러리) — 승인 여부
2. 영상 공용 기준 코드를 `ai-image-studio` → `ai-video-studio`로 옮기는 것
3. 비용: 시험 약 $3 이하(시험 계정 본인 키 — fal 키 등록 필요할 수 있음) + Vercel 빌드 3~5회 + 운영 DB 쓰기(표·버킷·programs 등록, 크롬 SQL 편집기)
4. 디자인: 이미지 스튜디오와 같은 배치·톤으로 시작(디자인 리뉴얼은 나중에 Antigravity 담당)
