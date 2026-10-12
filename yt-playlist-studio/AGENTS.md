# Youtube Playlist 자동화 — AI 에이전트 인수인계 문서 (AGENTS.md)

> **프로그램 버전**: `v1.02` (2026-10-13 프로그램 명칭을 'Youtube Playlist 자동화'로 변경, Vercel 배포 주소 및 커스텀 도메인 동기화)  
> **공식 커스텀 도메인**: [https://youtube-playlist.buylife.xyz](https://youtube-playlist.buylife.xyz) (기존: `https://yt-playlist.buylife.xyz`)  
> **프로그램 slug**: `yt-playlist-studio`  
> **카테고리**: 음악 / 멀티미디어 / 크리에이터  
> **배지**: `['free', 'new']` (AIMaster 가입 회원 누구나 무료 이용)

---

## 0. 절대 불변 최상위 규칙 (모든 에이전트 필독)

1. **★ 회원 본인 Gemini API 키 연동 원칙**:
   - 운영자(buylifemall) 또는 시스템 공용 키로 폴백하지 않습니다.
   - 키가 없으면 기능을 임의로 우회하지 않고 `ApiKeyModal`을 열어 등록을 안내합니다. (`user_api_keys.provider = 'gemini'`)
2. **FREE 배지 가입자 전체 무료 이용 원칙**:
   - `programs.badges`에 `'free'`가 등록되어 있으므로 가입 회원은 누구나 무료 이용 가능합니다. (비로그인은 자체 `/login` 리다이렉트)
3. **작업 화면 클린 화이트 베이스 원칙 (`docs/SIDEBAR_LAYOUT_STANDARD.md`)**:
   - 본문 및 컨트롤 패널은 `bg-white` / `bg-slate-50` 테마를 유지합니다.
4. **단일 작업 세트 완결 원칙**:
   - 빌드 검증(`npm run build`) → Git Commit → Git Push → Vercel 프로덕션 배포(`vercel deploy --prod --yes`) → 버전 상향 동기화(`lib/version.ts` + `package.json` + DB `programs.version`) → 결과 보고까지 한 번에 완료합니다.

---

## 1. 아키텍처 및 디렉토리 구조

```
yt-playlist-studio/
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx      # 자체 도메인 로그인 화면
│   │   ├── api/
│   │   │   ├── auth/logout/route.ts   # 로그아웃 API
│   │   │   ├── generate-bg/route.ts   # Gemini Imagen 3 기반 16:9 감성 배경 생성
│   │   │   └── user-key/route.ts      # 본인 Gemini API 키 조회/저장
│   │   ├── globals.css                # Tailwind CSS v4 & 커스텀 스크롤바
│   │   ├── layout.tsx                 # 루트 레이아웃
│   │   └── page.tsx                   # 메인 페이지 (requireProgramAccess)
│   ├── components/
│   │   ├── Sidebar.tsx                # 플랫폼 표준 좌측 사이드바 (Step 1~3 워크플로우)
│   │   ├── MediaCenter.tsx            # 1단계: 음원 드롭존, 유튜브 타임라인 자동 복사, 배경/로고 업로드, AI 배경 생성
│   │   ├── EditorStudio.tsx           # 2단계: 10종 스펙트럼, 8종 필터, 10종 오버레이, 6종 EDM FX, 14종 파티클, 16:9 실시간 캔버스
│   │   ├── ExportStudio.tsx           # 3단계: WebCodecs 1080p MP4 GPU 고속 렌더링 & 진행률 & 다운로드
│   │   ├── ApiKeyModal.tsx            # API 키 등록 모달
│   │   ├── HelpModal.tsx              # 사용 가이드 모달
│   │   └── PlaylistStudioApp.tsx      # 최상위 상태 관리자 & 화면 통합 컨테이너
│   ├── data/
│   │   └── presets.ts                 # 스펙트럼, 필터, 파티클, 18색 팔레트, 초기 설정값
│   ├── lib/
│   │   ├── render/
│   │   │   ├── color-utils.ts         # 프리셋 컬러 보간 및 drawRoundRect 유틸
│   │   │   ├── particle-system.ts     # 14종 파티클 애니메이션 엔진
│   │   │   ├── canvas-visualizer.ts   # 실시간/내보내기 10종 스펙트럼 및 비트 반응 FX 렌더러
│   │   │   └── video-exporter.ts      # WebCodecs VideoEncoder + mp4-muxer 고속 MP4 렌더러
│   │   ├── access.ts                  # 이용 권한 체크
│   │   └── version.ts                 # APP_VERSION = 'v1.01'
│   └── types/
│       └── playlist.ts                # 트랙, 스펙트럼 옵션, FX, 파티클, 인코딩 타입
├── MANUAL.md                          # 사용자 및 운영 상세 매뉴얼
├── README.md                          # 프로젝트 소개 및 아키텍처
└── package.json                       # Next.js 14, WebCodecs, mp4-muxer
```

---

## 2. 핵심 구현 특징

1. **10종 오디오 스펙트럼 비주얼라이저**:
   - 막대형(BARS), 대칭 막대(SYMMETRIC), 미니막대(MINI_BARS), 원형(CIRCLE), 선형(LINE), 파형 3중(WAVEFORM), 필드 웨이브(FILLED_WAVE), 라디알 웨이브(RADIAL_WAVE), 듀얼 스펙트럼(SPECTRUM_DUAL), 미적용(NONE).
2. **8종 필터 & 10종 트렌디 오버레이 & 6종 EDM 파티 모드**:
   - 시네마틱, 빈티지, 느와르, 몽환적, 생생함, 사이버펑크, 환각적(BASS).
   - 비트 펄스, 카메라 쉐이크, 글리치 비트, RGB 시프트, 스캔라인, VHS, 스트로보 조명, 빛 번짐(Light Leaks), 필름 그레인.
3. **14종 스타일 파티클 오버레이**:
   - 물방울, 반짝임, 네온 도형, 하트, 불티(+재), 눈 내림, 속도 비, 종이 가루, 레이저 선, 빛망울, 전기 불꽃, 파편, 사이버 라인, 음표 비.
4. **유튜브 타임라인 원클릭 자동 복사**:
   - 각 트랙의 누적 재생시간을 실시간 연산하여 `00:00 곡명 - 아티스트` 챕터를 클립보드에 자동 복사.
5. **Gemini Imagen 3 AI 배경 1클릭 생성기**:
   - 사용자 본인 Gemini API 키 연동으로 16:9 유튜브 감성 배경 이미지를 즉시 생성하여 배경으로 적용.
6. **WebCodecs GPU 가속 비디오 인코더**:
   - `mp4-muxer` + `VideoEncoder` + `AudioEncoder` 기반으로 브라우저 GPU를 활용해 1080p MP4를 고속 렌더링.
   - `showSaveFilePicker` 실시간 디스크 직접 쓰기를 지원하여 대용량 렌더링 시 메모리 부족(OOM) 완벽 방지.
