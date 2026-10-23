# AI Audio분석 자동화 — 디자인 리뉴얼 사전 개발 플랜 (PLAN_20261019_DESIGN_RENEWAL.md)

- **작성 일자**: 2026-10-19
- **대상 프로그램**: AI Audio분석 자동화 (`ai-audio-analyzer`, 78번)
- **공식 서비스 링크**: [https://audio.buylife.xyz](https://audio.buylife.xyz)
- **적용 목표 버전**: `v1.10` (기존 v1.04 ➔ v1.10 동기화)
- **디자인 공식 템플릿**: **사이버 네온 다크 콘솔 스타일 — 오디오 인텔리전스 랩 에디션 (Cyber Neon Dark Console Style — Audio Intelligence Lab Edition)**

---

## 1. 추진 배경 및 목표
1. **디자인 일체감 및 몰입도 극대화**:
   - 기존의 밝은 라이트 테마(`bg-slate-50`)에서 오디오 음향 분석 전문 도구의 톤앤매너에 최적화된 **딥 스페이스 다크 콘솔 테마**(`bg-[#060911]`, `surface: #0d121f`)로 전면 전환.
   - 네온 시안(`#00f0ff`), 일렉트릭 바이올렛(`#8b5cf6`), 앰버 골드(`#f59e0b`) 발광 토큰을 적용하여 오디오 파형, 스템, 스펙트럼의 시각적 식별성을 극대화.
2. **독립 비주얼 가이드북 (`/guide/page.tsx`) 전면 신설 (`DESIGN.md` 9번 원칙)**:
   - 단순 팝업 모달을 넘어 독립 라우트 `/guide`에 4단계 오디오 인텔리전스 파이프라인, 음성 랩(화자분리/회의록) 및 음악 랩(Suno v5 역설계/포렌식) 해설, BYOK 보안 가이드, FAQ 5종 네온 아코디언 완비.
3. **사이드바 표준화 및 모바일 반응형 완비**:
   - `v1.10 AUDIO LAB` 네온 뱃지, 분석 모드 3종 칩, 1-2-3 넘버링 워크플로우, `/guide` 골드 뱃지, 모바일 햄버거 드로어 탑재.
4. **버전 3중 동기화 (`v1.10`)**:
   - `package.json`, `src/lib/version.ts`, Supabase DB `programs` 메타데이터 완전 동기화.

---

## 2. 세부 구현 단계 및 작업 순서
```
[1단계: 사전 플랜 수립 및 DB 동기화]
  - docs/PLAN_20261019_DESIGN_RENEWAL.md 작성
  - Supabase DB programs 테이블 version 'v1.10' 갱신
  - package.json (1.10.0), src/lib/version.ts (v1.10) 갱신

[2단계: 디자인 토큰 및 글로벌 테마 구축]
  - src/app/globals.css: 사이버 네온 다크 콘솔 토큰 시스템 및 네온 발광 CSS 구축
  - src/app/layout.tsx: 다크 테마 메타데이터 및 배경 설정

[3단계: 사이드바 및 레이아웃 표준화]
  - src/components/layout/Sidebar.tsx: v1.10 AUDIO LAB 뱃지, 1-2-3 넘버링, /guide 골드 메뉴, 모바일 햄버거 메뉴

[4단계: 메인 스튜디오 UI 고도화]
  - src/components/studio/AudioAnalyzerApp.tsx: 상단 .studio-hero 웰컴 배너 및 3대 핵심 KPI 지표 카드 탑재
  - src/components/studio/AudioUploader.tsx: 다크 드롭존 및 파형 시각화
  - src/components/studio/SpeechReportView.tsx & MusicReportView.tsx: 다크 콘솔 카드 및 네온 스템 바, 원클릭 복사

[5단계: 독립 비주얼 가이드북 (/guide/page.tsx) 신설]
  - 4단계 분석 파이프라인 다이어그램
  - 음성 인텔리전스 (Speech Lab) vs 음악 분석 (Music Lab) 기능 비교
  - BYOK 보안 원칙 및 FAQ 5종 아코디언 제공

[6단계: 빌드 및 프로덕션 배포]
  - npx tsc --noEmit 및 npm run build (Turbopack 빌드 검증)
  - npx vercel --prod --yes (https://audio.buylife.xyz 배포)

[7단계: Microsoft Edge 최전면 포그라운드 실세션 검수]
  - 일반 회원 테스트 계정(buylifemall@naver.com) SSR 세션 쿠키 주입
  - 6종 필수 캡처 보존 및 화면 최전면 10분 유지

[8단계: 규격 문서 6종 완비 및 Git 원격 푸시]
  - AGENTS.md, README.md, DESIGN_HANDOFF.md, IMPROVEMENTS.md, IMPROVEMENT_BACKLOG.md, PLAN 동기화
  - DESIGN.md 현황판 완료 갱신 및 ACTIVE_WORK.md 정리, HANDOFF.md 보고서 추가
  - Git 커밋 및 origin/master 원격 푸시
```

---

## 3. 검수 계획 및 성공 기준
- **로컬 빌드**: `npm run build` 오류 없이 성공.
- **Vercel 배포**: `https://audio.buylife.xyz` 프로덕션 READY 상태.
- **Edge 검수 (6종 캡처 보존)**:
  1. `edge_audio_desktop_studio_v110.png` (메인 스튜디오 전경)
  2. `edge_audio_desktop_modes_v110.png` (분석 엔진 모드 및 업로더)
  3. `edge_audio_desktop_guide_v110.png` (비주얼 가이드북 상단)
  4. `edge_audio_desktop_guide_faq_v110.png` (가이드북 FAQ 아코디언 오픈)
  5. `edge_audio_desktop_settings_v110.png` (API 키 설정)
  6. `edge_audio_mobile_guide_v110.png` (모바일 375px 반응형 뷰)
- **화면 유지**: Edge 브라우저 최전면 포그라운드로 10분간 유지.

---

## 4. 최종 구현 및 검수 결과 (2026-10-19 완료)
- **로컬 빌드**: `npm run build` Turbopack 빌드 성공 (경로 7개 정상 생성, exit code 0).
- **Vercel 프로덕션 배포**: `https://audio.buylife.xyz` (배포 ID: `dpl_FdVg6n5vvFNznPftCCMcoTaxfazp`, `READY`).
- **Edge 최전면 포그라운드 실세션 검수**:
  - 일반 회원 테스트 계정(`buylifemall@naver.com`) SSR 인증 쿠키 주입 완료.
  - 6종 캡처 보존 완료:
    1. `edge_audio_desktop_studio_v110.png`
    2. `edge_audio_desktop_uploader_v110.png`
    3. `edge_audio_desktop_guide_v110.png`
    4. `edge_audio_desktop_guide_faq_v110.png`
    5. `edge_audio_desktop_settings_v110.png`
    6. `edge_audio_mobile_guide_v110.png`
  - 실제 Edge 브라우저 창 최전면 10분 유지 완료.
- **문서화**: 규격 인수인계 문서 6종(`AGENTS.md`, `README.md`, `DESIGN_HANDOFF.md`, `IMPROVEMENTS.md`, `IMPROVEMENT_BACKLOG.md`, `PLAN`) 완비.

