# LP 턴테이블 자동화 — AI 에이전트 인수인계 문서 (AGENTS.md)

> **프로그램 공식 명칭**: LP 턴테이블 자동화 (`vinyl-lp-studio`)  
> **공식 커스텀 도메인**: [https://vinyl-lp.buylife.xyz](https://vinyl-lp.buylife.xyz) (보조: `https://lp-turntable.buylife.xyz`, Vercel: `https://lp-turntable.vercel.app`)  
> **프로그램 slug**: `vinyl-lp-studio`  
> **기준 버전**: `v1.08` (2026-10-17 디자인 리뉴얼 & 비주얼 가이드북 & 로그인 표준화 완료)  
> **카테고리**: 음악 / 비디오 멀티미디어  
> **배지**: `['free', 'new']` (AIMaster 가입 회원 누구나 무료 이용)  
> **적용 디자인 템플릿**: **크리에이티브 아틀리에 스타일 — 바이닐 다크 레트로 콘솔 변형** (`#0c0d12` 딥 옵시디언 나이트)

---

## 0. 절대 불변 최상위 규칙 (모든 에이전트 필독)

1. **★ 회원 본인 Gemini API 키 연동 원칙**:
   - 운영자(`buylifemall`) 또는 타인의 공용 키로 폴백하지 않습니다.
   - 키가 없으면 기능을 임의 우회하지 않고 `ApiKeyModal`을 열어 등록을 안내합니다. (`user_api_keys.provider = 'gemini'`)
2. **FREE 배지 가입자 전체 무료 이용 원칙**:
   - `programs.badges`에 `'free'`가 등록되어 있으므로 가입 회원은 누구나 무료 이용 가능합니다. (비로그인은 자체 `/login` 리다이렉트)
3. **프로그램 내 전체 페이지 단일 배경색 및 일관된 테마 준수 원칙 (`#0c0d12`)**:
   - 본문, 컨트롤 패널, 사이드바, 가이드, 로그인 화면 등 모든 페이지는 딥 옵시디언 나이트 `#0c0d12` 배경을 유지합니다.
4. **단일 작업 순차 진행 및 완결 원칙**:
   - 플랜 제시 → 구현 → 빌드 검증(`npm run build`) → Vercel 배포(`vercel --prod --yes`) → Edge 브라우저 실세션 검수 → 버전 동기화(`lib/version.ts` + `package.json` + DB) → 인수인계 문서 갱신 및 Git 푸시.

---

## 1. 프로그램 개요 및 주요 기능 (Features)

LP 턴테이블 자동화는 음악 크리에이터, LP 애호가, 숏폼/유튜브 운영자를 위한 **아날로그 바이닐 LP 및 CD 회전 목업 비디오/GIF 자동 생성 스튜디오**입니다.

### 핵심 기능 목록
1. **듀얼 미디어 포맷 지원**:
   - **12인치 클래식 바이닐 LP**: 딥 블랙 홈 그루브(Grooves), 센터 라벨 커스텀 텍스처, 톤암 및 금속 스핀들 핀 시각화.
   - **4.7인치 홀로그램 CD**: 빛의 각도에 따라 무지개빛으로 반사되는 코닉 그라디언트 홀로그램 및 레이저 가이드 링 시각화.
2. **Google Gemini AI 기반 앨범 아트워크 생성**:
   - 아티스트명, 곡명, 장르 정보를 기반으로 AI가 최적의 커버 프롬프트를 1초 만에 추천(`suggest-style`).
   - 회원의 개인 Gemini API 키로 1:1 정방형 고화질 앨범 아트워크를 즉시 생성 및 라벨에 자동 전사.
3. **사용자 로컬 이미지 업로드 지원**:
   - 준비된 PNG/JPG 앨범 커버를 드래그 앤 드롭 또는 파일 업로드로 즉시 적용.
4. **아날로그 턴테이블 정밀 회전 속도 제어**:
   - 10 ~ 100 RPM 미세 조절 슬라이더 지원.
   - 3대 클래식 RPM 프리셋 칩 제공: **33 RPM**(클래식 LP), **45 RPM**(싱글 바이닐), **78 RPM**(고속 쉘락).
5. **MP4 배경 음악 결합 & 고화질 미디어 내보내기**:
   - **배경 음악 결합 MP4 (30fps)**: 사용자가 음원 파일(MP3, WAV 등)을 업로드하면, 음악 길이와 일치하는 고화질 사운드 포함 회전 MP4 생성.
   - **무한 루프 60fps MP4**: 음원이 없을 시 10초 반복 무한 루프 무음 720p 60fps 비디오 렌더링.
   - **무한 루프 투명 GIF**: 360×360 30fps 무한 반복 애니메이션 GIF 생성.
6. **작업 히스토리 로컬 스토리지 보관함**:
   - 제작한 앨범 커버 및 설정값을 로컬 브라우저에 안전하게 저장하고 원클릭 복원/삭제 지원.
7. **비주얼 사용 매뉴얼 (`/guide`)**:
   - 5단계 표준 파이프라인, 4대 골든 팁, FAQ 아코디언, 비로그인 공개 열람 지원.

---

## 2. 시스템 아키텍처 및 핵심 로직 (Architecture & Logic)

```
vinyl-lp-studio/
├── src/
│   ├── app/
│   │   ├── (auth)/layout.tsx          # 24px 골드/앰버 격자 모눈 배경 표준 레이아웃
│   │   ├── (auth)/login/page.tsx      # [로그인] / [회원가입] 표준 2버튼 탭 토글 화면
│   │   ├── api/
│   │   │   ├── auth/logout/route.ts   # 로그아웃 API
│   │   │   ├── generate-artwork/route.ts # Gemini 정방형 아트워크 생성 API
│   │   │   ├── suggest-style/route.ts # Gemini 스타일 프롬프트 추천 API
│   │   │   └── user-key/route.ts      # 본인 Gemini API 키 암호화 조회/저장
│   │   ├── globals.css                # 다크 옵시디언(#0c0d12) 테마 & 무한 회전 키프레임
│   │   ├── guide/page.tsx             # 비주얼 가이드북 라우트 (비로그인 공개 열람)
│   │   ├── layout.tsx                 # 루트 메타데이터 & 폰트
│   │   └── page.tsx                   # 메인 스튜디오 페이지 (권한 검증)
│   ├── components/
│   │   ├── Sidebar.tsx                # 표준 좌측 사이드바 (대시보드, 1~4단계, 매뉴얼)
│   │   ├── ControlPanel.tsx           # 옵션 컨트롤 콘솔 (다크 레트로 스타일)
│   │   ├── TurntableDisplay.tsx       # 턴테이블 캔버스 뷰포트 & 렌더링 진행률 & 다운로드
│   │   ├── VinylGuideView.tsx         # 5단계 파이프라인 비주얼 가이드북 컴포넌트
│   │   ├── ApiKeyModal.tsx            # 다크 Gemini API 키 관리 모달
│   │   ├── HelpModal.tsx              # 다크 가이드 팝업
│   │   ├── HistoryDrawer.tsx          # 다크 작업 히스토리 드로어
│   │   └── VinylStudio.tsx            # 최상위 상태 통합 관리자 (Studio <-> Guide 전환)
│   ├── data/
│   │   └── presets.ts                 # 인기 장르 6종 프리셋 (시티팝, 로파이, 재즈 등)
│   ├── lib/
│   │   ├── render/
│   │   │   ├── canvas-texture.ts      # 2D Canvas 마스킹 & 디스크 텍스처 렌더링 엔진
│   │   │   └── media-exporter.ts      # WebCodecs VideoEncoder MP4 & gifenc GIF 렌더러
│   │   ├── access.ts                  # 이용 권한 검증 미들웨어
│   │   ├── auth.ts                    # Supabase Auth 연동 (requireUser / getUser)
│   │   └── version.ts                 # APP_VERSION = 'v1.08'
│   └── types/
│       ├── vinyl.ts                   # 미디어 타입, 설정, 상태, 히스토리 인터페이스
│       └── gifenc.d.ts                # gifenc 모듈 타입 선언
├── docs/
│   ├── DESIGN_HANDOFF.md              # v1.08 디자인 리뉴얼 인수인계서
│   ├── IMPROVEMENTS.md                # 개선사항 관리 대장
│   ├── IMPROVEMENT_HANDOFF_20261017.md# 금일 작업 인수인계서
│   ├── IMPROVEMENT_BACKLOG.md         # 프로그램 개선 대기 목록 인수인계서
│   └── PLAN_20261017_DESIGN_RENEWAL.md# 디자인 리뉴얼 개발플랜
└── package.json                       # Next.js 16, React 19, mp4-muxer, gifenc
```

### 핵심 렌더링 파이프라인
1. **2D Canvas 디스크 텍스처 합성 (`canvas-texture.ts`)**:
   - `processDiscTexture(canvas, image, config)` 함수를 통해 원본 이미지를 받아 LP/CD 규격으로 클리핑 및 필터 렌더링.
   - **LP 텍스처**: 센터 원형 라벨에만 이미지를 배치하고, 외곽 블랙 바이닐 영역에 수십 개의 미세 그루브 음각 선과 45도/225도 코닉 회전 광택 하이라이트(`screen` 블렌딩)를 합성.
   - **CD 텍스처**: 원본 전면 인쇄 위에 무지개빛 코닉 홀로그램 광택 반사광(`color-dodge` 블렌딩)과 투명한 레이저 트랙 및 센터 컷아웃 마스킹 적용.
2. **100% 클라이언트 사이드 비디오 인코딩 (`media-exporter.ts`)**:
   - 서버로 프레임을 전송하지 않고 브라우저 내장 `VideoEncoder` (WebCodecs API)와 `mp4-muxer`를 사용하여 하드웨어 가속 60fps MP4 파일 생성.
   - 배경 음악 파일이 있을 경우 `AudioContext`로 클라이언트에서 48kHz 디코딩 후 AAC 오디오 트랙과 영상 프레임을 완벽 동기화 Muxing.

---

## 3. 프로그램 장점 및 강점 (Strengths & Pros)

1. **서버 렌더링 비용 제로 (0원 운영)**:
   - 모든 비디오(MP4) 및 GIF 렌더링이 사용자의 웹 브라우저(WebCodecs + Canvas)에서 100% 실행되므로, 고가의 서버 GPU 인프라나 대역폭 비용이 전혀 발생하지 않습니다.
2. **독보적인 비주얼 완성도 (크리에이티브 아틀리에 스타일)**:
   - 딥 옵시디언 나이트(`#0c0d12`)와 레트로 바이닐 골드/앰버 액센트가 결합되어 실제 고급 아날로그 턴테이블 콘솔을 조작하는 듯한 프리미엄 감성을 제공합니다.
3. **회원 본인 API 키 기반의 완벽한 비용·보안 격리**:
   - Gemini API 키를 개인 브라우저 세션에 안전하게 보관하며 타인이나 운영자 키로 폴백하지 않아 비용 누수 위험이 없습니다.
4. **오디오 결합 기능 지원**:
   - 단순 무음 루프 영상에 그치지 않고, 사용자의 실제 음원 파일을 결합하여 완성도 높은 숏폼 쇼츠용 완제품 비디오를 즉시 다운로드할 수 있습니다.
5. **접근성 높은 비주얼 가이드북 (`/guide`)**:
   - 비로그인 방문자도 5단계 파이프라인과 실전 팁을 미리 열람할 수 있어 서비스 가입 전환율을 높입니다.

---

## 4. 프로그램 한계점 및 단점 (Weaknesses & Cons)

1. **오디오 반응형 비주얼라이저(Waveform) 부재**:
   - 음원을 넣었을 때 소리는 나오지만, 음악 파형이나 이퀄라이저 바가 실시간으로 튀는 반응형 애니메이션이 아직 없어 시각적 다이내믹스가 제한적임 (`LOGIC-01` 대기 과제).
2. **단일 뷰포트 레이아웃의 한계**:
   - 현재는 턴테이블 위의 회전 디스크만 보여주며, 앨범 자켓(슬리브)이 비스듬히 거치된 3D 듀얼 렌더 뷰가 미지원됨 (`LOGIC-02` 대기 과제).
3. **로열티 프리 기본 샘플 음원의 부재**:
   - 사용자가 개인 PC나 모바일에 음원 파일이 없는 경우 음악 결합 기능을 테스트하기 위해 별도로 파일을 구해야 하는 번거로움이 있음 (`UI-02` 대기 과제).
4. **브라우저 WebCodecs 지원 편차**:
   - 최신 Chromium 기반 브라우저(Edge, Chrome)에서는 60fps MP4가 초고속으로 인코딩되나, 구형 모바일 브라우저나 일부 환경에서는 하드웨어 가속이 제한될 수 있음 (GIF 인코더가 폴백으로 동작).

---

## 5. 버전별 변경 히스토리 (Version History / Changelog)

| 버전 | 일자 | 작업자 | 주요 변경 및 추가 내역 |
|:---:|:---:|:---:|---|
| **v1.00** | 2026-10-01 | Codex | 초기 프로젝트 기획, Next.js 16 기반 프로젝트 생성, 턴테이블 기본 UI 구성 |
| **v1.01** | 2026-10-05 | Codex | 2D Canvas 기반 LP 및 CD 텍스처 마스킹 엔진(`canvas-texture.ts`) 1차 구축 |
| **v1.02** | 2026-10-08 | Claude Code | WebCodecs API 및 `mp4-muxer` 연동 60fps 무음 MP4 비디오 렌더러 구현 |
| **v1.03** | 2026-10-12 | Claude Code | 바이닐 오기 텍스트 정비, 신규 썸네일 등록, gifenc 기반 무한 루프 GIF 내보내기 탑재 |
| **v1.04** | 2026-10-16 | Codex | Supabase DB 연동 정책 업데이트 (PUBLISHABLE/SECRET 키 호환 레이어 적용) |
| **v1.05** | 2026-10-16 | Claude Code | **MP4 배경 음악(소리 트랙) 기능 추가**: 로컬 오디오 48kHz 디코딩 및 AAC 오디오 Muxing 파이프라인 탑재 |
| **v1.06** | 2026-10-17 | agy | 디자인 리뉴얼 사전 기획 수립, 프로그램 분석 플랜(`PLAN_20261017_DESIGN_RENEWAL.md`) 및 개선 대장 작성 |
| **v1.07** | 2026-10-17 | agy | 다크 옵시디언 `#0c0d12` 글로벌 CSS 토큰 구축 및 `(auth)/layout.tsx` 격자 모눈 배경 신설 |
| **v1.08** | 2026-10-17 | agy | **크리에이티브 아틀리에 스타일(바이닐 다크 레트로 콘솔 변형) 전면 리뉴얼 완결**:<br>- 전체 화면 단일 배경색 `#0c0d12` 일체화<br>- `[로그인] / [회원가입]` 표준 2버튼 탭 토글 레이아웃 적용<br>- 좌측 사이드바 `📖 연동 & 사용 매뉴얼` 메뉴 탑재 및 뷰 전환 연동<br>- 비주얼 사용 매뉴얼 (`VinylGuideView.tsx`, `/guide`) 신설 (비로그인 공개 열람 허용)<br>- 컨트롤 패널, 턴테이블 모니터, 모달 3종(ApiKey, Help, History) 다크 콘솔 룩 변환<br>- 33/45/78 RPM 프리셋 칩 탑재<br>- Next.js 16 빌드 성공, Vercel 프로덕션 배포 완료 (`https://vinyl-lp.buylife.xyz`)<br>- Microsoft Edge 브라우저 실세션 검수 캡처 5종 보존 완료 |

---

## 6. 개선 대기 목록 및 인수인계 문서 안내

다음 CLI가 작업을 이어서 진행할 때는 아래 문서들을 반드시 먼저 확인하십시오:
1. **개선 대기 목록 (우선순위/구현방안)**: [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md)
2. **디자인 사양 및 토큰**: [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md)
3. **개선사항 관리 원장**: [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md)
4. **금일 작업 상세 인수인계서**: [`docs/IMPROVEMENT_HANDOFF_20261017.md`](docs/IMPROVEMENT_HANDOFF_20261017.md)
