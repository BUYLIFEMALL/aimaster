# Suno 음악기획 자동화 — 디자인 완료 인수인계 보고서 (DESIGN_HANDOFF.md)

> **문서 상태**: 디자인 구현 완료 및 Vercel 배포 완료  
> **작성 일자**: 2026-10-16  
> **버전**: `v1.10`  
> **담당 CLI**: Antigravity (Windows)  
> **적용 템플릿 명칭**: **`사이버 수노 다크 스튜디오 스타일 (Cyber Suno Dark Studio Style)`**  
> **라이브 URL**: https://suno-music-studio.buylife.xyz (Vercel `dpl_CyHfNn6vNeRAGZCXwkQWcvD3LQfK`)

---

## 1. 디자인 컨셉 및 스타일 템플릿
- **템플릿 스타일 명칭**: **`사이버 수노 다크 스튜디오 스타일 (Cyber Suno Dark Studio Style)`**
- **디자인 배경**:
  - 기존 화이트(Light) 배경을 실제 이용자가 병행 사용하는 **Suno AI 공식 사이트(suno.com/create 및 suno.com/discover)**의 딥 블랙 & 다크 스튜디오 감성으로 전면 전환.
  - 음악 창작자의 몰입감을 극대화하는 **퓨어 딥 블랙(`#09090b`) & 다크 옵시디언 서페이스**와 Suno의 시그니처인 **앰버 오렌지(`#f97316`) & 일렉트릭 바이올렛(`#8b5cf6`)** 네온 하이라이트 조합.

---

## 2. 디자인 토큰 사양 (Design Tokens)

| 토큰명 | CSS 변수 | HEX / RGBA 값 | 적용 컴포넌트 및 용도 |
|---|---|---|---|
| **메인 배경** | `--bg-deep` | `#09090b` | 순수 딥 옵시디언 블랙 메인 바디 배경 |
| **서페이스** | `--surface` | `#0e0e12` | 메인 콘텐츠 작업 공간 배경 |
| **스튜디오 카드** | `--surface-card` | `#14141b` | 엘리베이티드 카드, 빌더/앨범 패널 컨테이너 |
| **카드 호버** | `--surface-card-hover` | `#1c1c26` | 프리셋 및 트랙 카드 호버 인터랙션 |
| **알약 활성** | `--surface-active` | `#272733` | Suno 스타일 활성 탭 및 선택 칩 |
| **시그니처 브랜드** | `--brand` | `#f97316` | Suno Vibrant Amber Orange (메인 액션, 포커스 링) |
| **브랜드 글로우** | `--brand-glow` | `rgba(249, 115, 22, 0.3)` | 네온 발광 버튼 및 활성 뱃지 그림자 |
| **스튜디오 퍼플** | `--accent-purple` | `#8b5cf6` | DAW 메타태그 및 장르 매트릭스 악센트 |
| **경계선** | `--line` | `rgba(255, 255, 255, 0.08)` | 다크 글래스모피즘 미세 구분선 |
| **강조선** | `--line-strong` | `rgba(255, 255, 255, 0.14)` | 카드 보더, 인풋 및 필드셋 테두리 |
| **메인 텍스트** | `--ink` | `#f4f4f5` | 고대비 오프 화이트 본문 |
| **보조 텍스트** | `--muted` | `#a1a1aa` | 캡션, 메타정보, 부연 설명 |

---

## 3. 핵심 컴포넌트 구조 및 특징

### 1) 사이드바 (Suno Signature Sidebar)
- **로고**: 트렌디한 산세리프 볼드 워드마크 `SUNO` + `음악기획 자동화` + `v1.10` 뱃지.
- **알약형 메뉴 (Pill-shaped Navigation)**:
  - `border-radius: 9999px` 완전한 알약형 캡슐 디자인.
  - 활성 상태 시 Suno 본사이트와 동일한 고대비 다크 서페이스(`bg-[#272733]`) 및 앰버 카운트 뱃지.
- **Suno 본사이트 바로가기 하이라이트**:
  - `https://suno.com/create`로 즉시 연결되는 앰버 오렌지 네온 글래스 칩 버튼 탑재.
- **사용자 프로필 아바타**:
  - Suno 공식 사이트의 주황색 원형 아바타(`buylife`)를 재현하여 사용자 이니셜 뱃지 표시.

### 2) 사용 매뉴얼 전면 비주얼화 (`UsageGuide.tsx`)
- **줄글 텍스트 탈피**:
  - 4단계 비주얼 파이프라인(01 컨셉 & 스타일 ➔ 02 AI 작사 & 트랙 기획 ➔ 03 클립보드 원클릭 복사 ➔ 04 Suno 본사이트 생성) 다이어그램 구축.
  - Suno 프롬프트 엔지니어링 설계도: `Style of Music` (사운드 프롬프트) vs `Lyrics` (메타 태그 구조화 가사) 비교 박스.
  - 3대 핵심 역량 쇼케이스 카드 및 키보드 단축키 칩 시트.
  - FAQ 아코디언 카드.

### 3) 인풋 & 슬라이더 컨트롤
- 다크 인풋(`bg-[#09090d]`, `border: 1px solid rgba(255,255,255,0.12)`).
- 포커스 시 부드러운 오렌지 앰버 네온 포커스 링(`box-shadow: 0 0 0 3px rgba(249,115,22,0.25)`).

---

## 4. 반응형 대응점 (Responsive Breakdown)
- **데스크톱 (1440px)**:
  - 고해상도 2단 스튜디오 그리드, 넉넉한 여백과 가독성 최적화.
- **태블릿 / 중소형 (768px ~ 1100px)**:
  - 1열 스택 그리드로 유연 전환, 갤러리 카드 2열 배치.
- **모바일 (375px ~ 390px iPhone 기준)**:
  - 사이드바를 좌측 슬라이딩 오버레이 햄버거 메뉴(☰)로 전환.
  - 모바일 전용 상단 스티키 바(`height: 57px`, 다크 헤더).
  - 수평 가로 스크롤(overflow) 0%, 모든 카드 및 버튼 패딩 최적화.

---

## 5. 검수 증거 (Microsoft Edge 검수 통과)
- **검수 브라우저**: **Microsoft Edge (`msedge`) 전용 사용** (규칙 준수).
- **검수 계정**: 일반 회원 테스트 계정 (`buylifemall@naver.com`) 실세션 인증.
- **검증 산출물**:
  - 데스크톱 빌더: `edge_suno_builder_desktop.png`
  - 모바일 빌더: `edge_suno_builder_mobile.png`
  - 데스크톱 가이드: `edge_suno_guide_desktop.png`
  - 모바일 가이드: `edge_suno_guide_mobile.png`
- **단위 테스트**: 53개 테스트 100% 통과 (`npm test`).
- **프로덕션 배포**: Vercel `dpl_CyHfNn6vNeRAGZCXwkQWcvD3LQfK` (HTTP 200 OK).
