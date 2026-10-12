# Youtube Playlist 자동화 (yt-playlist-studio v1.03) 릴리스 및 인수인계 문서

> **문서 버전**: v1.03 (2026-10-13)  
> **공식 서비스 URL**: [https://youtube-playlist.buylife.xyz](https://youtube-playlist.buylife.xyz)  
> **기존 호환 URL**: [https://yt-playlist.buylife.xyz](https://yt-playlist.buylife.xyz)  
> **플랫폼 프로그램 슬러그**: `yt-playlist-studio`  
> **카탈로그 순위**: `sort_order = 124` (플랫폼 메인 카탈로그 1순위)  
> **이용 권한 배지**: `['free', 'new']` (가입 회원 누구나 무료 이용)  
> **SSO 쿠키 도메인**: `.buylife.xyz` (AIMaster 통합 세션 공유)

---

## 1. 릴리스 개요 (v1.03)

본 릴리스는 오리지널 레퍼런스(스펙트럼 스튜디오 PRO)와의 UI 1:1 정밀 대조 검수를 통해, **미디어 센터 업로드 섹션의 시각적 비례감과 컴포넌트 형태를 완벽하게 일치시키고 플랫폼 표준 요금제 등록 체계를 완비**한 업데이트입니다:

1. **채널 로고 & GIF 스티커 박스 1:1 정사각형화 (`aspect-square`)**:
   - 기존의 납작한 `h-24` 직사각형에서 완벽한 `aspect-square` 정사각형 규격으로 개편.
   - 미등록 상태: 미니 아이콘(이미지 아이콘, GIF 배지)과 `+ 로고 추가`, `+ GIF 추가` 텍스트를 수직 중앙 정렬로 배치.
   - 등록 상태: 이미지가 왜곡 없이 `object-contain`으로 채워지며, 마우스 호버 시 **`변경`** 및 **`개별 삭제 (휴지통)`** 오버레이 제공.
2. **배경 미디어(이미지/영상) 박스 세로 비율 확장**:
   - 기존의 납작했던 `h-44` (176px)에서 `h-60 sm:h-64` (240~256px)로 세로 높이를 시원하게 확장.
   - 하단 2개 정사각형 박스의 전체 폭과 16:10 황금 비율을 이루어 상하 간 시각적 균형감 완성.
   - 배경 이미지/영상 등록 시 호버 변경 및 개별 삭제(휴지통) 기능 지원.
3. **플랫폼 기본 요금제(`pricing_plans`) 동기화 완비**:
   - 프로그램 등록 시 표준 3단계 요금제(1개월 1만, 2개월 2만, 3개월 3만)를 DB `pricing_plans`에 연동.
   - 관리자 프로그램 수정 화면(`ProgramForm.tsx`)에서 플랜이 0개인 경우 자동으로 기본값을 제안하는 fallback 및 "기본 플랜(1/2/3개월) 불러오기" 버튼 완비.

---

## 2. 아키텍처 및 핵심 파일 맵

```
yt-playlist-studio/
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx             # 자체 로그인 페이지 (SSO 세션 발급)
│   │   ├── api/
│   │   │   ├── auth/logout/route.ts          # 로그아웃 API
│   │   │   ├── generate-bg/route.ts          # Gemini Imagen 3 16:9 배경 생성 API
│   │   │   └── user-key/route.ts             # 개인 Gemini API 키 저장/조회 API
│   │   ├── globals.css                       # Tailwind CSS & 전역 스타일
│   │   ├── layout.tsx                        # 메타데이터 및 전역 레이아웃
│   │   └── page.tsx                          # 메인 작업 페이지 (SSO 및 이용권한 검증)
│   ├── components/
│   │   ├── PlaylistStudioApp.tsx             # 최상위 상태 컨테이너 및 탭 전환 관리
│   │   ├── Sidebar.tsx                       # 플랫폼 표준 좌측 사이드바 (1→2→3 단계 흐름)
│   │   ├── MediaCenter.tsx                   # [1단계] 오디오 트랙, 배경/로고/GIF 업로드, 인코딩 설정
│   │   ├── EditorStudio.tsx                  # [2단계] 10종 스펙트럼, 8종 필터, 10종 오버레이, 14종 파티클 실시간 편집
│   │   ├── ExportStudio.tsx                  # [3단계] WebCodecs GPU 1080p MP4 고속 렌더링 & 스트리밍 저장
│   │   ├── ApiKeyModal.tsx                   # Gemini API 키 등록/관리 팝업
│   │   └── HelpModal.tsx                     # 4단계 상세 사용 가이드 팝업
│   ├── data/
│   │   └── presets.ts                        # 스펙트럼, 필터, 파티클, 컬러 팔레트 프리셋
│   ├── lib/
│   │   ├── render/
│   │   │   ├── canvas-visualizer.ts          # 10종 오디오 주파수 비주얼라이저 & 반응형 FX 렌더러
│   │   │   ├── particle-system.ts            # 14종 실시간 파티클 엔진
│   │   │   ├── video-exporter.ts             # WebCodecs + mp4-muxer 1080p MP4 고속 인코더
│   │   │   └── color-utils.ts                # 색상 보간 및 드로잉 유틸
│   │   ├── access.ts                         # 서브프로그램 이용 권한 검증 (FREE 배지 우선 통과)
│   │   └── version.ts                        # 버전 SSOT (APP_VERSION = 'v1.03')
│   └── types/
│       └── playlist.ts                       # 트랙, 스펙트럼, FX, 파티클 데이터 타입 정의
├── MANUAL.md                                 # 사용자 상세 가이드 및 기능 설명서
├── AGENTS.md                                 # 에이전트 인수인계 문서 (규칙 및 히스토리)
└── package.json                              # 버전 1.03.0
```

---

## 3. 핵심 기능 명세

| 기능 구분 | 세부 기능 및 기술 스펙 |
|---|---|
| **10종 오디오 스펙트럼** | 막대형(BARS), 대칭 막대(SYMMETRIC), 미니막대(MINI_BARS), 원형(CIRCLE), 선형(LINE), 파형 3중(WAVEFORM), 필드 웨이브(FILLED_WAVE), 라디알 링(RADIAL_WAVE), 듀얼 스펙트럼(SPECTRUM_DUAL), 미적용(NONE) |
| **8종 감성 컬러 필터** | 기본(ORIGINAL), 시네마틱(CINEMATIC), 빈티지(VINTAGE), 느와르(NOIR), 몽환적(DREAMY), 생생함(VIVID), 사이버펑크(CYBERPUNK), 환각적(PSYCHEDELIC_BASS) |
| **10종 트렌디 오버레이** | 비트 펄스(Beat Pulse), 카메라 쉐이크(Camera Shake), 글리치 비트(Glitch Beat), RGB 시프트(RGB Shift), 스캔라인(Scanlines), VHS 노이즈(VHS Tape), 스트로보 조명(Strobe Light), 빛 번짐(Light Leaks), 필름 그레인(Film Grain), 없음(None) |
| **14종 파티클 시스템** | 물방울, 눈, 비, 반짝임, 하트, 불티(+재), 빛망울, 속도 비, 종이 가루, 레이저 선, 전기 불꽃, 파편, 사이버 라인, 음표 비 |
| **타임라인 자동 복사** | 업로드된 여러 음원의 누적 재생시간을 실시간 합산하여 유튜브 설명란 형식(`00:00 곡명 - 아티스트`) 텍스트 클립보드 원클릭 복사 |
| **Gemini AI 배경 생성** | 회원 본인 Gemini Imagen 3 API 연동으로 16:9 유튜브 감성 배경 이미지를 즉시 생성 및 자동 적용 |
| **WebCodecs 1080p MP4** | 브라우저 하드웨어 가속 VideoEncoder + AudioEncoder + mp4-muxer 파이프라인으로 초당 60fps 풀HD 비디오 고속 인코딩 |
| **OOM 방지 직접 쓰기** | `showSaveFilePicker` File System Access API 지원으로 RAM 메모리 누수 없이 디스크 직접 스트리밍 저장 |

---

## 4. 인수인계 및 운영 작업 가이드 (차기 에이전트 필독)

1. **로컬 빌드 검증**:
   ```bash
   cd yt-playlist-studio
   npm run build
   ```
2. **프로덕션 배포 및 도메인 동기화**:
   ```bash
   cd yt-playlist-studio
   vercel deploy --prod --yes
   vercel alias set <새배포URL> youtube-playlist.buylife.xyz
   ```
3. **버전 동기화 원칙 (Rule 5)**:
   - 코드 수정 배포 시 마이너 +0.01 상향 (예: `v1.03` ➔ `v1.04`).
   - `src/lib/version.ts`, `package.json`, Supabase DB `programs.version` 세 곳을 반드시 동일하게 동시 갱신.
4. **회원 본인 API 키 연동 원칙 (Rule 00 & Rule 4)**:
   - AI 배경 생성 등 외부 AI 호출 기능은 반드시 사용자가 직접 등록한 `user_api_keys.provider = 'gemini'`를 사용하며, 서버 공용 키로 폴백하지 않음.
