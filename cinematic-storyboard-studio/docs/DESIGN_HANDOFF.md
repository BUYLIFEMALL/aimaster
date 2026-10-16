# 시네마틱 스토리보드 자동화 — 디자인 리뉴얼 인수인계서 (DESIGN_HANDOFF.md)

- **작업 일시**: 2026-10-16
- **작업자**: Antigravity CLI (agy, Windows PC)
- **적용 버전**: `v1.06` (이전 `v1.05`)
- **디자인 템플릿 고유 명칭**: **크리에이티브 아틀리에 스타일 (Creative Atelier Style)**
  - 서브 카테고리: 시네마틱 아틀리에 (Cinematic Dark Atelier)
- **실제 서비스 배포 URL**: [https://cinematic-storyboard-studio.buylife.xyz](https://cinematic-storyboard-studio.buylife.xyz)

---

## 1. 디자인 시스템 토큰 & 테마 원칙

최상단 지침 11번(**"프로그램 내 전체 페이지 단일 배경색 및 일관된 테마 스타일 준수 의무"**)을 철저히 준수하여 `/studio`, `/projects`, `/settings`, `/guide` 전 화면을 단 하나의 동일한 배경색과 통일된 아틀리에 스타일로 일치시켰습니다.

| 요소 | 컬러 토큰 / Tailwind 클래스 | 용도 및 설명 |
| :--- | :--- | :--- |
| **전체 배경색 (단일 배경)** | `#0b0f17` (`bg-[#0b0f17]`) | 딥 시네마틱 차콜 (영화 편집실/상영관 무드) |
| **사이드바 배경** | `#0e131f` (`bg-[#0e131f]`) | 슬레이트 딥 다크 + 12px 간격 계정 프로필 밀착 |
| **카드 서피스** | `#131926` (`bg-[#131926]`) | 패널, 카드 및 그리드 박스 베이스 |
| **인풋 & 내부 필드** | `#182030` (`bg-[#182030]`) | 텍스트 입력, 엔진 셀렉터, 캔버스 패널 |
| **메인 포인트 컬러** | `#f59e0b` (앰버 골드, `from-amber-500 to-amber-600`) | 주요 CTA 버튼, 번호 배지, 활성 메뉴 하이라이트 |
| **서브 액센트 컬러** | `#ef4444` (클래퍼보드 레드) / `#10b981` (에메랄드) | 비디오 프롬프트 생성, 상태 뱃지, 복사 완료 피드백 |
| **보더 라인** | `border-slate-800` (hover: `border-slate-700`) | 은은한 다크 아틀리에 외곽선 |
| **텍스트 대비** | `text-slate-100` (제목), `text-slate-300` (본문), `text-slate-400` (메타) | 고대비 다크 텍스트 계층 |

---

## 2. 화면별 리뉴얼 내역

### 1) 📖 연동 & 사용 매뉴얼 (`/guide`) 전면 신설
- 사이드바 유틸리티 영역 최상단에 `📖 연동 & 사용 매뉴얼` 메뉴 탑재 및 앰버 골드 펄스 배지 적용.
- **5단계 시네마틱 파이프라인 (Step-by-Step)**:
  - STEP 01: 본인 Google Gemini API 키 연동 (플랫폼 가이드 연계)
  - STEP 02: 레퍼런스 이미지 업로드 & 로그라인 AI 제안
  - STEP 03: 4단계 감정선 & 9컷 키프레임 자동 분석
  - STEP 04: 3:2 마스터 콘택트 시트 렌더링 & 3×3 정밀 분할 다운로드
  - STEP 05: Runway · Kling · Luma 맞춤 영상 프롬프트 & JSON 생성
- **비디오 AI 툴 연동 노하우**: Runway Gen-3 Alpha, Kling AI 1.5, Luma Dream Machine 맞춤 활용법 탑재.
- **전문 촬영 & 앵글 용어 치트시트**: 샷 크기(8), 카메라 앵글(6), 카메라 무빙(5) 카테고리 필터 탭 제공.
- **자주 묻는 질문(FAQ) 4종**: 아코디언 인터랙션 지원.

### 2) 🎬 작업 스튜디오 (`/studio`)
- 단일 배경색 `#0b0f17` 및 다크 아틀리에 카드 서피스 적용.
- 4:3 드래그앤드롭 이미지 업로드 영역 및 1600px 브라우저 리사이징 유지.
- Nano Banana (Flash) 및 Nano Banana Pro 2K 엔진 선택 카드 앰버 골드 하이라이트.
- 3:2 마스터 콘택트 시트 뷰, 다운로드 및 슬라이더 분할 액션 바 다크 스타일링.
- 씬 리스트 테이블 및 JSON 뷰어 다크 콘솔화.

### 3) ✂️ 3×3 인터랙티브 분할 에디터 (`SplitEditor.tsx`)
- 전체 화면 모달을 `bg-[#0b0f17]` 및 컨트롤 패널 `bg-[#0e131f]`로 일체화.
- 캔버스 뷰포트 `bg-[#070a0f]`와 앰버 골드 가이드라인 적용.
- 상하좌우 여백 및 1~3행 경계선 슬라이더 앰버 골드 악센트.
- 브라우저 클라이언트 JSZip 기반 9컷 개별 JPG 다운로드.

### 4) 📁 내 프로젝트 아카이브 (`/projects`)
- 단일 배경색 `#0b0f17` 및 다크 카드 그리드.
- 빈 상태 뷰 시네마틱 아틀리에화 및 새 프로젝트 제작 CTA.
- 3:2 마스터 썸네일 호버 줌 효과.

### 5) ⚙️ API키등록·플랫폼연동 (`/settings`)
- 단일 배경색 `#0b0f17` 및 다크 서피스 카드.
- Google AI Studio Gemini API 키 등록 폼 및 상태 표시등.
- 본인 API 키 최상위 절대 규칙 고지 유지 및 발급 매뉴얼 팝업 링크 연동.

---

## 3. Microsoft Edge 전용 실세션 검증 결과

최상단 지침에 따라 **Microsoft Edge 전용 (`msedge.exe`)**으로 일반 회원 테스트 계정(`buylifemall@naver.com`) 로그인 세션을 통해 검증을 완료하였습니다.

- **데스크톱 검수 (1440px)**:
  - `edge_storyboard_guide_desktop_v106.png`: 헤더 히어로 배너 및 5단계 파이프라인
  - `edge_storyboard_guide_pipeline_v106.png`: 비디오 AI 연계 노하우 및 촬영 용어 치트시트
  - `edge_storyboard_guide_faq_v106.png`: FAQ 아코디언 및 하단 CTA
  - `edge_storyboard_studio_desktop_v106.png`: 업로드 및 엔진 셀렉터 다크 일체감
  - `edge_storyboard_projects_desktop_v106.png`: 프로젝트 아카이브 딥 차콜 일체감
  - `edge_storyboard_settings_desktop_v106.png`: API 키 등록 및 매뉴얼 팝업
- **모바일 반응형 검수 (390px)**:
  - `edge_storyboard_studio_mobile_v106.png`: 모바일 1열 카드 배치 및 터치 타깃 검증
  - `edge_storyboard_guide_mobile_v106.png`: 모바일 가이드북 폰트 가독성 및 아코디언 터치 반응 검증

---

## 4. 버전 및 배포 정보
- **버전**: `v1.06` (`src/lib/version.ts`, `package.json`, Supabase 공유 DB `programs.version = 'v1.06'`)
- **Next.js Turbopack 빌드**: 통과 (`npm run build`)
- **Vercel 프로덕션 배포**: 완료 (`https://cinematic-storyboard-studio.buylife.xyz`)
