# Youtube Playlist 자동화 — AI 에이전트 인수인계 문서 (AGENTS.md)

> **프로그램 버전**: `v1.08` (2026-10-17 유튜브 다크 테마 디자인 리뉴얼 & 비주얼 가이드북 전면 신설)
> **공식 커스텀 도메인**: [https://youtube-playlist.buylife.xyz](https://youtube-playlist.buylife.xyz) (기존: `https://yt-playlist.buylife.xyz`)  
> **프로그램 slug**: `yt-playlist-studio`  
> **적용 디자인 템플릿**: **유튜브 다크 콘솔 스타일 (YouTube Dark Console Style · 유튜브 공식 다크 테마)**  
> **인수인계 문서**: [개발 플랜](docs/PLAN_20261017_DESIGN_RENEWAL.md) · [개선 대장](docs/IMPROVEMENTS.md) · [개선 인수인계](docs/IMPROVEMENT_HANDOFF_20261017.md) · [디자인 인수인계](docs/DESIGN_HANDOFF.md)  
> **카테고리**: 음악 / 멀티미디어 / 크리에이터  
> **배지**: `['new']` (2026-10-17 DB 조회 기준. FREE를 임의 전제로 삼지 않음)
> **DB 카탈로그 순위**: `sort_order = 124` (플랫폼 최상단 1순위 노출)

---

## 0. 절대 불변 최상위 규칙 (모든 에이전트 필독)

1. **★ 회원 본인 Gemini API 키 연동 원칙**:
   - 운영자(buylifemall) 또는 시스템 공용 키로 폴백하지 않습니다.
   - 키가 없으면 기능을 임의로 우회하지 않고 `ApiKeyModal`을 열어 등록을 안내합니다. (`user_api_keys.provider = 'gemini'`)
2. **FREE 배지 가입자 전체 무료 이용 원칙**:
   - 실제 programs.badges에 FREE가 있으면 가입 회원 누구나 이용합니다. 현재 DB는 new만 있으므로 통합 자격 판정 결과를 따릅니다. (비로그인은 자체 `/login` 리다이렉트)
3. **작업 화면 유튜브 다크 테마 원칙 (`docs/SIDEBAR_LAYOUT_STANDARD.md`)**:
   - 본문 및 컨트롤 패널은 확정된 #0f0f0f/#181818 유튜브 다크 테마를 유지합니다.
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

---

## 3. 버전 릴리스 히스토리

- **v1.03 (2026-10-13)**:
  - 채널 로고 & GIF 스티커 박스를 오리지널 레퍼런스 규격에 맞추어 `aspect-square` 1:1 정사각형으로 전면 개편.
  - 배경 미디어 박스의 세로 높이를 `h-60 sm:h-64`(240~256px)로 확장하여 하단 2개 정사각형 박스와 16:10 황금비 조화 완성.
  - 배경/로고/GIF 등록 후 개별 삭제(휴지통 아이콘) 및 변경 오버레이 완비.
  - 플랫폼 요금제 표준 동기화: DB `pricing_plans`에 기본 3단계(1개월 1만, 2개월 2만, 3개월 3만) 등록 완료.
- **v1.02 (2026-10-13)**:
  - 프로그램 명칭을 'Youtube Playlist 자동화' (`YouTube Playlist Automation`)로 전면 변경.
  - 공식 도메인 [https://youtube-playlist.buylife.xyz](https://youtube-playlist.buylife.xyz) 연동 및 재배포.
  - 플랫폼 DB 카탈로그 1순위(`sort_order: 124`) 등록 및 16:9 고화질 실사 썸네일 등록 완료.
- **v1.01 (2026-10-13)**:
  - 초기 구축: 10종 스펙트럼, 8종 필터, 10종 오버레이, 6종 EDM FX, 14종 파티클, 유튜브 타임라인 자동 복사, Gemini Imagen 3 배경 생성기, WebCodecs 1080p 고속 MP4 렌더러 탑재.

---

## 4. 인수인계 핵심 점검 체크리스트

1. **배포 명령**:
   - `yt-playlist-studio` 폴더 안에서 `vercel deploy --prod --yes` 실행.
   - 배포 후 `vercel alias set <배포도메인> youtube-playlist.buylife.xyz`로 공식 도메인 연결 보장.
2. **버전 관리 (Rule 5)**:
   - 코드 수정 시 반드시 `src/lib/version.ts`의 `APP_VERSION`, `package.json`의 `version`, Supabase DB `programs.version` 세 곳을 일치시켜 동시 상향.
3. **유튜브 다크 테마 유지**:
   - 작업 화면은 #0f0f0f, 카드 #181818, 경계 #303030 다크 스타일을 유지.
4. **API 키 절대 원칙 (Rule 00 & Rule 4)**:
   - 회원 본인 Gemini API 키 (`user_api_keys.provider = 'gemini'`)만 사용. 공용 키 폴백 금지.


## 2026-10-16 DB 연동 변수 호환 — v1.04 (yt-playlist-studio)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 MP4 내보내기 무음 버그 수정 — v1.05 (Claude Code 윈도우)
- 증상: 완성 MP4에 소리가 없음(코드상 확인: `src/lib/render/video-exporter.ts`가 `AudioEncoder`를 설정만 하고 `AudioData`를 한 번도 넣지 않았음, flush·close도 없었음).
- 수정: 디코딩한 트랙을 반복 횟수만큼 순서대로 이어 0.5초 단위 `AudioData`(f32-planar, 48kHz 스테레오, 모노는 양쪽 복제)로 인코딩. 큰 배열로 합치지 않고 트랙 버퍼에서 바로 잘라 넣으며, 영상 프레임보다 1초 앞서도록 나눠 넣어 두 트랙이 섞여 저장되게 함. 끝에 남은 소리·`audioEncoder.flush()`·`close()`.
- 검수(시험 계정 크롬, `youtube-playlist.buylife.xyz`): 6초 시험음 1곡 → MP4 6.02초·소리 6.02초(크기 시험음과 일치), 반복 2회 → 소리 12.01초·앞뒤 구간 모두 소리 있음. 시험 중 브라우저 저장 창·자동 다운로드는 페이지 안에서만 잠시 막고 파일을 열어 분석(회원 화면 코드는 그대로).
- 버전: `src/lib/version.ts` v1.05, `package.json` 1.05.0(이전 1.03.0으로 남아 있던 것 정정), DB `programs.version` v1.05(SQL `supabase/migrations/20261016_version_v1_05.sql`). VIP 등급 자동 부여 확인(138/138, 주인님 규칙).
- 참고: 같은 방식의 `vinyl-lp-studio/src/lib/render/media-exporter.ts`는 소리 트랙 자체가 없음(의도인지 주인님 확인 필요 — 손대지 않음).


## 2026-10-17 Antigravity(Windows) — 유튜브 다크 콘솔 디자인 리뉴얼 & 전 화면 검정 베이스(#0f0f0f)·유튜브 레드 로고 적용 및 비주얼 가이드북 신설 (v1.06)

- **적용 디자인 템플릿**: **유튜브 다크 콘솔 스타일 (YouTube Dark Console Style · 유튜브 공식 다크 테마)**
- **단일 배경색 일체화**: 퓨어 옵시디언 블랙 `#0f0f0f`, 카드 서피스 `#181818` / `#212121`, 보더 `#272727`, 유튜브 레드 `#ff0000` 포인트 전 화면 통일.
- **유튜브 로고 브랜딩**: 사이드바 상단 및 헤더에 유튜브 공식 레드 플레이 버튼(▶) 심볼 탑재.
- **비주얼 사용 매뉴얼 (`/guide` & `currentTab = 'guide'`) 전면 신설**: 5단계 파이프라인 인포그래픽, 유튜브 플레이리스트 떡상 4대 팁, FAQ 4종 아코디언, 회원 본인 키 연동 보안 원칙 배너 탑재.
- **사이드바 메뉴 표준화**: 다크 테마 적용 및 유틸리티 영역에 `📖 연동 & 사용 매뉴얼` 메뉴 탑재.
- **독립 라우트 지원**: `/guide` 직접 브라우저 URL 접근 라우트 지원 (`src/app/guide/page.tsx`).
- **배포 및 검수**: Vercel 프로덕션 배포 (`https://youtube-playlist.buylife.xyz/`), Microsoft Edge 실세션 데스크톱/모바일 검수 완료.

## 기능·로직·장점·단점 (v1.08 최신 기준)

- **기능:** 본인 파일 음원/배경/로고/GIF 구성, 스펙트럼·필터·파티클 편집, 챕터 복사, 본인 Gemini 키 배경 생성, WebCodecs MP4 출력, 사용 매뉴얼. v1.08은 Viral Finder 참고 메모 수신을 추가합니다.
- **로직:** AIMaster 로그인/프로그램 자격 후 회원 ID를 스튜디오에 전달합니다. 본인 Gemini 키만 조회/사용합니다. 파일/편집/인코딩은 브라우저에서 처리합니다. 참고 메모는 동일 회원·유튜브 HTTPS URL·발급5분을 검사해 해당 화면 메모리에만 표시하고 메뉴 이동/새로고침/만료 시 제거합니다. DB·localStorage·서버 로그에 메모를 저장하지 않습니다.
- **장점:** 파일을 서버에 올리지 않는 제작 흐름, 본인 키, GPU 인코딩, 같은 계정의 영상 참고와 실제 제작을 분리한 연결, 다크·모바일 UI.
- **단점/한계:** WebCodecs/저장 API 브라우저 지원과 PC 자원에 의존합니다. 입력 메모의 회원ID 비교는 수신 확인이며 서명된 인증 토큰이 아닙니다(사람이 입력한 제목/URL을 읽기 전용으로 표시할 뿐 어떤 권한도 부여하지 않음). 실제 미디어 가져오기/프로젝트 자동 적용/지속 메모는 없습니다. 이번에는 실제 음원 렌더/유료 AI 회귀를 실행하지 않았습니다.

## v1.08 변경 히스토리 (2026-10-17 Codex)

- 동일 회원5분 참고 메모 수신/주소 검증·자동 제거, 가이드 안내. 모바일 드로어의 실제 닫기 버튼에 접근성 이름 추가(가려진 바깥 버튼과 구분). Next16.4.2 보안 보완, package1.08.0/APPv1.08. DB 표시는 배포 후 동기화합니다.
- 사전 검사: 빌드/타입, 파서6, 실제 일반 회원 Edge1440/375 연계10, 비로그인API3개401, npm audit0. 코드 복구 후 전체 재검수했습니다. [최종 인수인계](docs/IMPROVEMENT_HANDOFF_20261017_V108_REFERENCE.md) · [개선 대기 목록](docs/IMPROVEMENT_BACKLOG.md).

## 목적·개발 도구·후속 제안 (공통 7항목 보완)

- **목적/대상:** 본인 음원·배경 자료로 유튜브 플레이리스트 영상을 만드는 제작자. 브라우저 안에서 편집·출력하고 회원 본인 AI 키를 연결합니다.
- **도구/기법/스킬:** Next.js16.4.2·React19·TypeScript·Tailwind4, WebAudio·Canvas·WebCodecs, mp4-muxer·GIF 처리, Supabase 통합 인증/본인 키, 회원 Gemini 배경 생성. 이번 작업은 PowerShell/Node, Playwright 실제 Edge, Vercel CLI와 Supabase·Postgres·배포·React 점검 지침을 사용했습니다. 별도 실행 플러그인이나 공용 AI 키를 추가하지 않았습니다.
- **기능/로직/장단점·버전:** 위 최신 기능/히스토리 및 [v1.08 결과](docs/IMPROVEMENT_HANDOFF_20261017_V108_REFERENCE.md)를 기준으로 확인합니다. 브라우저 자원·지원 API 의존과 실제 렌더 재검수 미실행 한계를 유지합니다.
- **작업 대기:** [개선 대기 목록](docs/IMPROVEMENT_BACKLOG.md). 썸네일 캡처, 트랙 번호, 모바일 포커스/Escape, 사용요금 안내는 미구현입니다. 기존 코드/화면부터 비교한 뒤 플랜을 제시합니다.
- **연계/아이디어:** Viral Finder의 같은 회원 참고 메모 수신은 구현했습니다. Suno 메타데이터/챕터 연계와 프로젝트 자동 적용은 제안이며 실제 음원 다운로드·게시를 자동 실행하지 않습니다.
- **UI/스타일:** 기존 유튜브 다크 색을 유지했습니다. 후속 제안은 모바일 포커스 복귀·키보드 닫기와 제작 단계/비용 안내 개선입니다. 이번에는 실제 메뉴 닫기 버튼의 접근성 이름만 보완했습니다.

## v1.08 운영 완료·미완료 구분 (2026-10-17 종료)

참고 메모 수신·본인/5분 검증·가이드·모바일 닫기·Next16.4.2 운영 반영. 소스 ea42c5b8db7bb4510c3f1f941bfb8c9869fe863c 푸시, dpl_HLTavGo2Qn2nqX7A5rDqUuWt8qJy READY, APP/DBv1.08. 빌드/타입·파서6·운영 Edge10·API3개401 통과. 실제 미디어 인코딩·유료 AI는 미검수. 썸네일/트랙번호/포커스·Escape/요금 안내/Suno 연계는 미구현. [완료·미완료/재개 순서](docs/IMPROVEMENT_HANDOFF_20261017_V108_REFERENCE.md) · [대기 목록](docs/IMPROVEMENT_BACKLOG.md).

https://youtube-playlist.buylife.xyz

## 2026-10-17 v1.09 — 휴대폰 메뉴 키보드 접근성·요금 안내 정정 (Claude Code 윈도우)
- `src/components/Sidebar.tsx`: 휴대폰 펼침 메뉴를 `role="dialog" aria-modal`로, 열면 [메뉴 닫기]로 포커스·Tab/Shift+Tab은 메뉴 안에서만 순환·Esc로 닫기·닫으면 ☰ 버튼으로 포커스 복귀, ☰ 버튼 `aria-label`(열기/닫기)·`aria-controls`, 작업 흐름 3단계에 `role="button" tabIndex=0`·Enter/Space 선택·`aria-current`. 데스크톱 화면은 그대로.
- 요금 안내: `PlaylistGuideView.tsx`(1단계 설명·배지 "무료 연동"→"본인 키 연동"·FAQ), `ApiKeyModal.tsx`에 "키 발급은 무료, 이미지 생성은 Google 요금이 본인 계정에 부과될 수 있음 + 공식 가격표 링크". 예전 "무료 티어로 추가 비용 없이 생성"은 사실과 달라 삭제.
- 검수: tsc 통과(ESLint 설정 없음), build, 배포·DB v1.09, 크롬 500px 실제 키 입력 — 메뉴 대화상자·[메뉴 닫기] 포커스·Tab 25회/Shift+Tab 3회 메뉴 안 유지·Esc 닫힘·☰ 포커스 복귀·2단계 Enter 선택(aria-current 확인)·매뉴얼/키 등록 창 문구·콘솔 오류 0.
- **🔴 발견(승인 대기)**: `src/app/api/generate-bg/route.ts`가 쓰는 `imagen-3.0-generate-002`는 Google에서 종료(2025-11-10, 공식 문서 "Imagen models are shut down and no longer available in the Gemini API") → AI 배경 생성이 지금 실패. 대체 `gemini-2.5-flash-image`/Nano Banana 2(`generateContent`). 교체 검수에 회원 본인 키 실제 생성 1회 이상 필요(유료 가능) → 승인 후 진행. 대기 목록 2-1.

## 2026-10-17 v1.10 — AI 배경 생성 모델 교체: Imagen 종료 → gemini-nano-banana-2.1 (Claude Code 윈도우, 주인님 승인)
- 원인: `imagen-3.0-generate-002` Google 종료(2025-11-10). 처음 승인안 `gemini-2.5-flash-image`는 공식 가격표에 2026-10-02 종료 예정 구형으로 표시돼 제외 → 최신 정식 `gemini-nano-banana-2.1`(2026-10-06 GA)로 결정.
- `src/app/api/generate-bg/route.ts`: `@google/genai` `generateImages` → REST `generateContent`(`responseModalities: ["IMAGE"]`, `imageConfig: { aspectRatio: "16:9", imageSize }`) — **이미지 레퍼런스 프로그램 ai-image-studio의 `lib/providers/adapters/gemini.ts` 방식과 동일**. 화질은 본문 `imageSize` "1K"/"2K"만 허용, 기본 2K(장당 약 $0.050), 1K 약 $0.034. 한국인 기본 인물 지시문 추가(핵심 원칙 3). 실패 시 키 값이 담긴 주소를 남기지 않고 원인·힌트(429 한도, 400/403 키·결제)만 안내. 응답에 `model`·`imageSize`.
- 검수: tsc·build, 배포·DB v1.10, 비로그인 401, **유료 시험 1회**(시험 계정 본인 Gemini 키, 1K, 비용 약 $0.034): 200·1376×768(16:9)·JPEG 862KB·약 19초, 눈으로 확인(비 오는 밤 카페, 인물 한국인). `@google/genai` 패키지는 다른 곳에서 안 쓰지만 이번엔 제거하지 않음.

## v1.12 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `src/app/api/generate-bg/route.ts` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).
- 정정(주인님 지시: 프롬프트·생성 스타일은 기존값 유지): v1.10에서 프롬프트 끝에 덧붙였던 한국인 인물 지시문과 temperature 0.7을 제거해 원래 프롬프트 그대로 보냅니다. 모델·주소·이미지 받아오는 부분만 바뀐 상태입니다.

## 2026-10-18 v1.13 — 이미지 생성 호출을 공용 기준 코드로 (이미지 5묶음 · Imagen 교체분, Claude Code 윈도우)
- **한 일**: `src/app/api/generate-bg/route.ts`: 직접 REST 호출 → 공용 호출, 함수 한도 60초 → 시간 제한 50초, 실패 시 공용 안내 문구와 상태 코드를 그대로 응답.
- **바뀐 점(공통)**: 키를 요청 주소가 아니라 머리글로 보냄, 시간 제한, 응답에서 최종 이미지 선택(Pro 모델 중간 초안 제외), 원인별 한국어 안내·키 가림, 유료 생성이라 재시도 0. 프롬프트·모델·비율·화질·화면은 그대로.
- **검수**: tsc 0, `check-shared-modules` OK, Vercel 프로덕션 배포(프로그램당 1회, 비용 절감 규칙)·DB 버전, 크롬 화면 버전. eslint(바뀐 파일) 0. 테스트 스크립트 없음. 실제 이미지 생성 시험은 하지 않음(비용).
- **주의(다음 CLI)**: `src/lib/geminiImage.ts`·`nanoBananaModels.ts`는 공용 기준 코드 사본이다(기준: `ai-image-studio/lib/providers/`). 직접 고치지 않고 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`. 점검표: 루트 `docs/SHARED_MODULE_CHECKPOINTS.md`.
