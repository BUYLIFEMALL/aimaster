# LP 턴테이블 자동화 (LP Turntable Studio)

> **공식 커스텀 도메인**: [https://vinyl-lp.buylife.xyz](https://vinyl-lp.buylife.xyz)  
> **기준 버전**: `v1.08` (2026-10-17 크리에이티브 아틀리에 스타일 리뉴얼 완료)  
> **프로그램 slug**: `vinyl-lp-studio`  
> **카테고리**: 음악 / 비디오 멀티미디어  
> **배지**: `['free', 'new']` (AIMaster 가입 회원 누구나 무료 이용)  
> **적용 디자인 템플릿**: **크리에이티브 아틀리에 스타일 — 바이닐 다크 레트로 콘솔 변형** (`#0c0d12` 딥 옵시디언 나이트)

---

## 1. 프로그램 개요 및 주요 기능 (Features)

Google Gemini AI와 Canvas & WebCodecs 기술을 융합하여 아날로그 바이닐 LP 및 CD 앨범 아트워크를 기획하고, 브라우저에서 직접 고화질 60fps MP4 회전 비디오와 무한 루프 GIF 목업을 생성하는 전문 턴테이블 영상 자동화 스튜디오입니다.

1. **미디어 포맷 듀얼 지원**: 12인치 클래식 바이닐 LP(음각 그루브/스핀들 핀) & 4.7인치 CD(홀로그램 프리즘 반사광/레이저 트랙).
2. **AI 아트워크 기획 & 생성**: 곡 정보 기반 Gemini AI 프롬프트 원클릭 추천 및 회원 본인 키 기반 고화질 정방형 커버 생성.
3. **로컬 커스텀 이미지 업로드**: 소장 중인 PNG/JPG 앨범 커버 즉시 전사.
4. **턴테이블 정밀 RPM 제어**: 10~100 RPM 슬라이더 및 33/45/78 RPM 원클릭 프리셋.
5. **MP4 배경 음악 결합 & 고화질 내보내기**:
   - 오디오 포함 30fps MP4 비디오 (업로드한 음악 길이와 일치하는 완제품 렌더링).
   - 무음 무한 루프 60fps MP4 (10초 반복 숏폼용).
   - 무한 루프 투명 GIF (360×360 30fps 웹용 애니메이션).
6. **작업 히스토리 로컬 스토리지 보관함**: 최근 생성 앨범 안전 보관 및 원클릭 복원.
7. **비주얼 사용 매뉴얼 (`/guide`)**: 5단계 파이프라인, 4대 골든 팁, FAQ, 비로그인 공개 열람 지원.

---

## 2. 시스템 아키텍처 및 핵심 로직 (Architecture & Logic)

```
vinyl-lp-studio/
├── src/
│   ├── app/
│   │   ├── (auth)/layout.tsx          # 24px 골드/앰버 격자 모눈 배경 표준 레이아웃
│   │   ├── (auth)/login/page.tsx      # [로그인] / [회원가입] 표준 2버튼 탭 토글 화면
│   │   ├── api/
│   │   │   ├── generate-artwork/route.ts # Gemini 정방형 아트워크 생성 API
│   │   │   ├── suggest-style/route.ts # Gemini 스타일 프롬프트 추천 API
│   │   │   └── user-key/route.ts      # 본인 Gemini API 키 암호화 조회/저장
│   │   ├── globals.css                # 다크 옵시디언(#0c0d12) 테마 & 무한 회전 키프레임
│   │   ├── guide/page.tsx             # 비주얼 가이드북 라우트 (비로그인 공개 열람)
│   │   └── page.tsx                   # 메인 스튜디오 페이지 (권한 검증)
│   ├── components/
│   │   ├── Sidebar.tsx                # 표준 좌측 사이드바 (대시보드, 1~4단계, 매뉴얼)
│   │   ├── ControlPanel.tsx           # 옵션 컨트롤 콘솔 (다크 레트로 스타일)
│   │   ├── TurntableDisplay.tsx       # 턴테이블 캔버스 뷰포트 & 렌더링 진행률 & 다운로드
│   │   ├── VinylGuideView.tsx         # 5단계 파이프라인 비주얼 가이드북 컴포넌트
│   │   └── VinylStudio.tsx            # 최상위 상태 통합 관리자 (Studio <-> Guide 전환)
│   ├── lib/
│   │   ├── render/
│   │   │   ├── canvas-texture.ts      # 2D Canvas 마스킹 & 디스크 텍스처 렌더링 엔진
│   │   │   └── media-exporter.ts      # WebCodecs VideoEncoder MP4 & gifenc GIF 렌더러
│   │   ├── access.ts                  # 이용 권한 검증 미들웨어
│   │   └── version.ts                 # APP_VERSION = 'v1.08'
```

- **Canvas 텍스처 엔진**: `canvas-texture.ts`에서 LP의 원형 홈(Grooves)과 45도/225도 코닉 회전 광택, CD의 무지개 홀로그램 광택을 수학적 블렌딩(`screen`, `color-dodge`)으로 합성.
- **클라이언트 비디오 렌더러**: `media-exporter.ts`에서 브라우저 내장 `VideoEncoder`와 `mp4-muxer`를 사용하여 회전 주기를 완벽하게 일치시킨 60fps MP4를 서버 부하 없이 생성.

---

## 3. 프로그램 장점 및 강점 (Strengths & Pros)

1. **서버 인프라 렌더링 비용 제로 (0원 운영)**: 모든 연산과 비디오 인코딩이 클라이언트 브라우저에서 수행되어 GPU 서버 비용이 발생하지 않습니다.
2. **압도적인 레트로 감성 비주얼**: 다크 옵시디언 나이트(`#0c0d12`)와 바이닐 앰버/골드 조화의 크리에이티브 아틀리에 템플릿 적용.
3. **회원 본인 API 키 기반의 완벽한 보안/비용 격리**: 개인 키로 직접 생성하여 운영자 및 타 회원 키로의 비용 누출 차단.
4. **오디오 결합 지원**: 사용자의 음원 파일을 즉시 동기화 결합하여 숏폼/쇼츠용 완제품 비디오 즉시 출력.
5. **친절한 비주얼 가이드북 제공**: 5단계 파이프라인과 4대 팁을 비로그인 상태에서도 쉽게 열람 가능.

---

## 4. 프로그램 한계점 및 단점 (Weaknesses & Cons)

1. **오디오 주파수 파형(Waveform) 시각 효과 미탑재**: 음악에 맞춰 튀는 실시간 이퀄라이저 파형 애니메이션이 아직 미구현됨 (`LOGIC-01`).
2. **3D 앨범 자켓(슬리브) 거치 뷰 미지원**: 디스크 단독 회전 뷰 중심이며 앨범 자켓과의 듀얼 3D 거치 뷰가 없음 (`LOGIC-02`).
3. **로열티 프리 샘플 음원 기본 내장 부재**: 사용자가 테스트할 수 있는 무료 BGM 음원 샘플 미제공 (`UI-02`).

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

## 6. 관련 인수인계 문서

- **개선 대기 목록 (백로그)**: [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md)
- **AI 에이전트 인수인계 문서**: [`AGENTS.md`](AGENTS.md)
- **디자인 사양 및 토큰**: [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md)
- **개선사항 관리 원장**: [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md)
- **금일 작업 인수인계서**: [`docs/IMPROVEMENT_HANDOFF_20261017.md`](docs/IMPROVEMENT_HANDOFF_20261017.md)
