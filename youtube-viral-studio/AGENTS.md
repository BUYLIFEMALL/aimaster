# YouTube Viral Studio — AI 에이전트 인수인계 문서 (AGENTS.md)

> # ★★★ 최상위 절대 불변 규칙 (2026-10-09 주인님 지시)
> **모든 사용자는 본인의 계정과, 본인이 사용할 본인 YouTube API 키를 각각 직접 등록·연동해서 사용한다.**
> 운영자(주인님)나 타인의 키로 대신 처리하지 않으며, 키가 없으면 "본인 키를 등록해주세요"로 안내한다.

---

## 1. 개요 & 버전 현황
- 프로그램명: **YouTube Viral Studio (골든 파인더 엔진)**
- Slug: `youtube-viral-studio`
- 현재 버전: `v1.01` (`lib/version.ts`)
- 기반 템플릿: AIMaster Next.js 16 + React 19 + Tailwind CSS v4
- 공유 Supabase DB: `esgxyikcnnvmlhygjkth`

---

## 2. 핵심 구현 모듈

### 백엔드 로직 (`src/lib/youtube/`)
- `client.ts`: Google YouTube Data API v3 호출 래퍼 (할당량 소진, 잘못된 키 에러 정밀 핸들링)
- `metrics.ts`:
  - `calculateVPH()`: 시간당 조회수 속도 계산 (Views Per Hour)
  - `calculateVsRatio()`: 구독자 대비 조회수 배수 계산 (소형 채널 파괴력)
  - `calculateViralScore()`: 0~100점 바이럴 점수 및 등급 뱃지(초대박/대박/떡상/양호) 산출
- `viralShorts.ts`: 다차원 필터링 기반 떡상 쇼츠 검색
- `goldenChannels.ts`: 구독자 1만명 이하 고효율 황금 채널 스크리닝
- `trendingVideos.ts`: 대한민국 실시간 급상승 영상 수집 및 VPH 랭킹 산출
- `sourceFinder.ts`: 쇼츠 설명란 링크 파싱 + 동일 채널 롱폼 영상의 단어 유사도 기반 원본 역추적

### 권한 및 설정 (`src/lib/`)
- `auth.ts`: `requireUser()` 세션 검증
- `access.ts`: `requireProgramAccess()` (FREE 배지 및 관리자 프리패스, 구독/기간 권한 검증 시 RLS 차단 방지를 위해 `createAdminClient()` 사용)
- `apiKeys.ts`: 회원별 본인 API 키(`youtube_api_key`) 조회 및 마스킹

---

## 3. UI 화면 구성 (`src/app/(dashboard)/`)
- 화이트 베이스 표준 레이아웃 (`docs/SIDEBAR_LAYOUT_STANDARD.md` 준수)
- `/viral-shorts`: 조회수 폭발 쇼츠 찾기 (메인)
- `/golden-channels`: 황금 채널 발굴기
- `/trending-videos`: 실시간 터진 영상 (VPH 뱃지)
- `/source-finder`: 쇼츠 원본 찾기
- `/favorites`: 즐겨찾기 보관함 (CSV 내보내기 지원)
- `/settings`: YouTube API 키 설정 및 1분 발급 가이드
- `/guide`: 핵심 지표 해석 및 이용 가이드
