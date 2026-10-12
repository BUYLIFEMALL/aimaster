# LP 턴테이블 자동화 — AI 에이전트 인수인계 문서 (AGENTS.md)

> **프로그램 버전**: `v1.03` (2026-10-12 LP 턴테이블 자동화 바이닐 텍스트 삭제, 신규 썸네일 등록 및 매뉴얼 완비)  
> **공식 커스텀 도메인**: [https://lp-turntable.buylife.xyz](https://lp-turntable.buylife.xyz) (Vercel: `https://lp-turntable.vercel.app`)  
> **프로그램 slug**: `vinyl-lp-studio`  
> **카테고리**: 음악 / 멀티미디어  
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
vinyl-lp-studio/
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx      # 자체 도메인 로그인 화면
│   │   ├── api/
│   │   │   ├── auth/logout/route.ts   # 로그아웃 API
│   │   │   ├── generate-artwork/route.ts # Gemini 3 Pro / Imagen 정방형 아트워크 생성
│   │   │   ├── suggest-style/route.ts # Gemini 2.5 Flash 기반 스타일 프롬프트 추천
│   │   │   └── user-key/route.ts      # 본인 Gemini API 키 조회/저장
│   │   ├── globals.css                # Tailwind CSS v4 & 무한 회전 키프레임
│   │   ├── layout.tsx                 # 루트 레이아웃
│   │   └── page.tsx                   # 메인 페이지 (requireProgramAccess)
│   ├── components/
│   │   ├── Sidebar.tsx                # 플랫폼 표준 좌측 사이드바 (Step 1~4)
│   │   ├── ControlPanel.tsx           # 옵션 컨트롤 패널 (메타데이터, 프롬프트, RPM, 내보내기)
│   │   ├── TurntableDisplay.tsx       # 턴테이블 플레이어 프리뷰 & 렌더링 진행률 & 다운로드
│   │   ├── ApiKeyModal.tsx            # API 키 등록 모달
│   │   ├── HelpModal.tsx              # 사용 가이드 모달
│   │   ├── HistoryDrawer.tsx          # 로컬 히스토리 드로어
│   │   └── VinylStudio.tsx            # 최상위 상태 관리자 & 화면 통합 컨테이너
│   ├── data/
│   │   └── presets.ts                 # 6대 장르 프리셋 (시티팝, 로파이, 사이버펑크, 재즈 등)
│   ├── lib/
│   │   ├── render/
│   │   │   ├── canvas-texture.ts      # 2D Canvas CD/LP 텍스처 마스킹 엔진 (processDiscTexture)
│   │   │   └── media-exporter.ts      # 브라우저 WebCodecs MP4 Muxer 및 gifenc GIF 인코더
│   │   ├── access.ts                  # 이용 권한 체크
│   │   └── version.ts                 # APP_VERSION = 'v1.01'
│   └── types/
│       ├── vinyl.ts                   # 미디어 타입, 상태, 히스토리 인터페이스
│       └── gifenc.d.ts                # gifenc 모듈 타입 선언
├── MANUAL.md                          # 사용자 및 운영 상세 매뉴얼
├── README.md                          # 프로젝트 소개 및 아키텍처
└── package.json                       # Next.js 16, React 19, mp4-muxer, gifenc
```

---

## 2. 핵심 로직 및 렌더링 파이프라인

### 1) 2D Canvas 마스킹 파이프라인 (`canvas-texture.ts`)
* **CD 모드**:
  1. 원본 이미지 1:1 리사이즈 렌더링
  2. 중앙 클램핑 링 및 메탈릭 선형 그라디언트 렌더
  3. 내부 미러 링 및 점선 레이저 가이드 서클
  4. 무지개빛 코닉 그라디언트 홀로그램 반사광 (`color-dodge`)
  5. 중앙 구멍 컷아웃 (`destination-out`) 및 외경 클리핑 (`destination-in`)
* **Vinyl LP 모드**:
  1. 딥 블랙(#111111) 레코드 베이스 원형 렌더
  2. 센터 라벨 원형 클리핑 영역에 이미지 렌더링
  3. 미세 동심원 음각 그루브 라인(Grooves) 반복 드로잉
  4. 45도 / 225도 코닉 회전 광택 하이라이트 (`screen`)
  5. 센터 스핀들 홀 컷아웃 및 외경 클리핑

### 2) 브라우저 네이티브 비디오/GIF 인코딩 파이프라인 (`media-exporter.ts`)
* 회전 주기($RPM$)를 기반으로 정수 회전수(Revolutions)와 전체 프레임 수를 계산하여 **시작 프레임과 종료 프레임이 완벽하게 이어지는 무한 루프**를 생성합니다.
* **MP4**: `VideoEncoder` (`avc1.42001f`, 60fps, 5Mbps, 720x720) + `mp4-muxer`
* **GIF**: `gifenc` (30fps, 360x360, 256색 양자화, 투명 배경 지원)

---

## 3. 버전 업그레이드 규칙

프로그램 수정 시 마이너 버전을 +0.01 상향하며, 아래 3곳을 반드시 함께 동기화합니다:
1. `src/lib/version.ts`: `export const APP_VERSION = 'v1.01';`
2. `package.json`: `"version": "1.01.0"`
3. Supabase DB `programs` 테이블: `version = 'v1.01'`
