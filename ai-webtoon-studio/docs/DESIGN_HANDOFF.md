# AI 웹툰 자동화 (`ai-webtoon-studio`) 디자인 핸드오프 문서

- **프로그램명**: AI 웹툰 자동화 (영문 `AI Webtoon Automation` / `ai-webtoon-studio`)
- **서비스 공식 URL**: https://ai-webtoon-automation.buylife.xyz
- **배포 버전**: `v1.14` (2026-10-18)
- **적용 템플릿**: **크리에이티브 아틀리에 스타일 (웹툰 스튜디오 다크 변형)**
- **담당 에이전트**: Antigravity CLI (agy, 윈도우)

---

## 1. 디자인 시스템 토큰 명세

| 항목 | 토큰 / 컬러코드 | 용도 |
| :--- | :--- | :--- |
| **Main Background** | `#0a0d14` (딥 블랙 나이트) | 전역 페이지 및 캔버스 바탕색 |
| **Surface (Card)** | `#121620` (미드나잇 다크 서피스) | 메인 카드 컨테이너, 헤더 바, 사이드바 배경 |
| **Card Highlight** | `#181d2a` (다크 카드 하이라이트) | 컷별 카드, 프리뷰 박스, 서브 모듈 |
| **Border** | `#232b3e` (다크 메탈 보더) | 모든 컨테이너 경계선 및 디바이더 |
| **Primary Accent** | `#6366f1` (인디고) → `#8b5cf6` (바이올렛) | 메인 CTA 버튼, 활성 탭, 스텝퍼 배지 |
| **Secondary Accent**| `#f59e0b` (앰버) | 가이드 배지, 퀵 액션 일괄 저장 버튼 |
| **Success / Status** | `#10b981` (에메랄드) | API 연동 완료, 1단계 기획 배지, 진행 완료 표시 |
| **Text Primary** | `#ffffff` / `#f8fafc` | 메인 헤드라인, 라벨 |
| **Text Secondary** | `#94a3b8` / `#cbd5e1` | 보조 설명글, 디스크립션 |

---

## 2. 주요 페이지 및 화면 구성

1. **상단 고정 헤더 (`Header.tsx`)**:
   - `bg-[#121620] border-b border-[#232b3e] shadow-sm`
   - 모바일 햄버거 토글 버튼 (`aria-label="사이드 메뉴 열기"`)
   - 마케팅 슬로건 문구 및 그라디언트 텍스트
   - Gemini API 연동 상태 실시간 펄스 배지
   - 노란색 ZIP 일괄 압축 버튼 & 보라색 롱스크롤 JPG 합성 저장 버튼

2. **반응형 사이드바 (`Sidebar.tsx`)**:
   - 데스크톱(1440px) 260px 좌측 고정 사이드바 (`bg-[#121620] border-r border-[#232b3e]`)
   - 모바일(375px) 슬라이드 오버레이 드로어
   - 프로그램 로고 및 `v1.14 PRO` 배지
   - 대시보드 메인 바로가기
   - **`📖 연동 & 사용 매뉴얼` 신설 메뉴 (가이드북 연결)**
   - 1~4 스텝퍼 배지 (원형 넘버링 + 세로선)
   - 프로젝트 JSON 내보내기/가져오기 및 API키 등록 버튼
   - 하단 로그인 계정 정보 및 원클릭 로그아웃 폼

3. **신설 비주얼 가이드북 (`GuideSection.tsx`)**:
   - 🤖 **마스코트 환영 배너**: 웹툰 작가를 위한 4단계 파이프라인 소개
   - **4단계 원스톱 워크플로우 카드**: 기획/시놉시스 → 캐릭터 일관성 시트 → 시나리오 콘티 → 컷 렌더링 & 롱스크롤 JPG
   - **5대 아트 스타일 비교 카드**: 로판/순정, 액션/실사, 소년만화, 3D 애니, 사이버펑크 네온
   - **세로 롱스크롤 & 캔버스 안전영역 가이드**: 모바일 690px 규격, 무손실 Canvas 병합, 말풍선 연출
   - **BYOK 보안 수칙 및 FAQ 5종**: 로컬 격리 보관 원칙, 턴어라운드 활용법 등

4. **STEP 1~4 작업 섹션 다크 서피스 통일**:
   - `ProjectSection.tsx`: 컨셉 설정 및 5대 화풍 선택 폼 다크화
   - `CharacterSection.tsx`: 캐릭터 3인 탭, 턴어라운드 프리뷰 박스 다크화
   - `ScriptEditorSection.tsx`: 컷별 연출·대사 콘티 카드 및 텍스트 뷰어 다크화
   - `WebtoonCanvasSection.tsx`: 메인 표지 및 컷 렌더링 카드, 네이버웹툰 스타일 690px 세로 롱스크롤 뷰어 다크화
   - `SettingsModal.tsx`: API 키 등록 팝업 다크 서피스 통일

---

## 3. Microsoft Edge 포그라운드 실세션 검수 결과 (`headless: false`)
- 검수 일시: 2026-10-18 00:36 KST
- 검수 계정: 일반 회원 테스트 계정 (`buylifemall@naver.com`)
- 검수 환경: Windows 11, Microsoft Edge (포그라운드 창 노출)
- 아티팩트 증빙 5종 보존 완료:
  1. `edge_webtoon_studio_desktop_dashboard_v114.png` (데스크톱 대시보드 메인)
  2. `edge_webtoon_studio_desktop_guide_v114.png` (데스크톱 비주얼 가이드북)
  3. `edge_webtoon_studio_mobile_dashboard_v114.png` (모바일 대시보드 메인)
  4. `edge_webtoon_studio_mobile_menu_v114.png` (모바일 햄버거 메뉴 열림 드로어)
  5. `edge_webtoon_studio_mobile_guide_v114.png` (모바일 비주얼 가이드북)
