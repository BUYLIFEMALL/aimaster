# 음악(SUNO)자동화 (music-automation) 사용 매뉴얼(/guide) 신설 개발 플랜

작성일시: 2026-10-16  
작업 CLI: Antigravity (Windows)  
대상 도메인: `https://music-rho-virid-22.vercel.app/`  
목표 버전: `v1.07` ➔ `v1.08`

---

## 1. 개요 및 배경
- **현상**:
  - `https://music-rho-virid-22.vercel.app/` 좌측 사이드바에 사용 매뉴얼 메뉴가 없으며, `/guide` 페이지가 존재하지 않아 사용자가 Suno 음악 기획, AI 생성, MR/보컬 분리, WAV 추출, Remix 스튜디오의 활용 방법을 체계적으로 안내받지 못함.
  - 사이드바의 계정 정보와 로그아웃이 하단 고정(`mt-auto`)되어 있어 최신 공통 사이드바 지침(메뉴 바로 밑 밀착 배치) 미적용 상태임.
- **목표**:
  - 좌측 사이드바에 `📚 연동 & 사용 안내` (`/guide`) 메뉴 추가 및 계정/로그아웃 블록 메뉴 밑 밀착 배치.
  - `사이버 수노 다크 스튜디오 스타일`에 맞춘 고품질 3대 인터랙티브 탭 가이드북 컴포넌트(`MusicUsageGuide.tsx`) 및 라우트(`app/(dashboard)/guide/page.tsx`) 구축.

---

## 2. 작업 범위 및 세부 구현 내용

### 1) 사이드바 구조 개선 (`components/layout/Sidebar.tsx`)
- `UTILITY_ITEMS`에 `📚 연동 & 사용 안내` (`/guide`) 항목 추가.
- 최신 사이드바 표준에 맞춰 `mt-auto` 하단 고정을 제거하고, 유틸리티 메뉴 바로 아래 `border-t border-[#23232f] pt-3`에 접속 계정 정보와 로그아웃 버튼을 바짝 밀착 배치.
- 오렌지(`text-orange-400`) & 딥 다크 포인트 유지.

### 2) 가이드북 라우트 신설 (`app/(dashboard)/guide/page.tsx`)
- `requireProgramAccess()` 탑재로 회원 등급 및 사용기간 권한 엄격 검증.
- 메인 헤더 배너: "🎵 Suno AI 음악 자동화 마스터 가이드북".

### 3) 3대 인터랙티브 탭 가이드북 컴포넌트 (`components/guide/MusicUsageGuide.tsx`)
- **스타일 템플릿**: `사이버 수노 다크 스튜디오 스타일` (딥블랙 `#09090b` + 일렉트릭 오렌지 `#f97316`).
- **탭 1: 📋 4단계 실전 마스터 가이드**:
  - **STEP 00. API 키 등록 (`/settings`)**: Suno API 토큰 / 플랫폼 키 연동 및 계정 격리 원리.
  - **STEP 01. AI 음악 기획 (`/plannings/new`, `PlanningForm`)**: 주제·분위기 입력 ➔ AI 스타일 프롬프트 및 구조화된 가사 콘셉트([Verse], [Chorus], [Bridge], [Outro]) 자동 완성, 보컬 성별(남성/여성/듀엣) 및 연주곡 모드 가이드.
  - **STEP 02. Suno 생성 및 트랙 관리 (`/plannings`, `TrackList`)**: Suno v4/v5/v6 모델 기반 2개 트랙 동시 생성, 실시간 오디오 스트리밍 플레이어, 앨범 커버 자동 생성.
  - **STEP 03. 프로페셔널 후가공 (곡 연장, MR/보컬 분리, 고음질 WAV)**: 원하는 파트 이어붙이기(Extend), 악기 트랙만 분리(Instrumental MR), 방송/음원용 무손실 WAV 파일 다운로드 가이드.
  - **STEP 04. 음악 Remix 스튜디오 (`/remix`, `RemixStudio`)**: 기존 곡이나 외부 오디오 파일을 새로운 장르/템포/보컬로 재해석(Remake)하는 Suno Remix 파이프라인.
- **탭 2: 🎛️ Suno 프롬프트 & 스타일 비법**:
  - 성공적인 음악 스타일 태그 조합 (예: `K-Pop, Energetic Synth, 128 BPM, Female Vocal, Crisp Master`).
  - 구조 메타 태그(`[Verse]`, `[Pre-Chorus]`, `[Chorus]`, `[Drop]`, `[Outro]`) 작성 노하우 아코디언.
- **탭 3: 💡 사운드 꿀팁 & 트러블슈팅 FAQ**:
  - 4대 실전 사운드 꿀팁 (MR 추출 시 잡음 최소화, 곡 연장 시 이음매 자연스럽게 맞추기 등).
  - 5대 트러블슈팅 FAQ (크레딧 차감 원리, 생성 대기 지연 해결, WAV 다운로드 오류 대응 등).

### 4) 버전 판올림 및 DB 동기화
- 코드: `music/lib/version.ts` ➔ `v1.08`
- DB: Supabase 공유 DB `programs` 테이블 `music-automation` 행 `version = 'v1.08'` 동기화.

---

## 3. 검수 계획 (Microsoft Edge 전용)
- **검수 브라우저**: **Microsoft Edge (`msedge.exe`) 전용** (규칙 준수, Chrome 배제).
- **테스트 계정**: `buylifemall@naver.com` 실세션 주입 검수.
- **검수 항목**:
  1. 데스크톱 탭 1 (4단계 실전 가이드)
  2. 데스크톱 탭 2 (프롬프트 & 스타일 비법)
  3. 데스크톱 탭 3 (사운드 꿀팁 & FAQ)
  4. 사이드바 메뉴 연동 및 접속계정/로그아웃 밀착 확인
  5. 모바일(375px) 반응형 뷰 검수

---

## 4. 예상 소모 비용
- **소모 비용: 0원** (순수 UI/컴포넌트 및 로직 연동 작업, 유료 API 호출 없음).
