# AI 12단 상세페이지 자동화 — 개선사항 관리 대장 (IMPROVEMENTS.md)

이 문서는 `detail-page-12p` 프로그램의 기능, 성능, UI/UX, 디자인, 편의성 관련 개선 필요사항을 기록하고 추적하는 원장입니다.

---

## 개선사항 목록

| ID | 구분 | 개선 항목 | 우선순위 | 상태 | 관련 파일 | 설명 |
| :---: | :---: | :--- | :---: | :---: | :--- | :--- |
| **IMP-01** | 디자인 | 전체 화면 단일 배경색(`#f8fafc`) 일체화 | P1 (필수) | 🔵 진행 중 | `src/app/globals.css`, `DetailPageApp.tsx` | 최상단 지침 11번(단일 배경색 및 일관된 테마 스타일 준수)에 따라 모든 탭 화면의 배경색 일체화 |
| **IMP-02** | 기능/UX | 📖 연동 & 사용 매뉴얼 (`/guide`) 비주얼 가이드북 신설 | P1 (필수) | 🔵 진행 중 | `src/components/DetailGuideView.tsx`, `Sidebar.tsx`, `src/app/guide/page.tsx` | 최상단 지침 7번에 따라 사이드바에 매뉴얼 메뉴 탑재 및 5단계 파이프라인, 12단 치트시트, FAQ 전면 신설 |
| **IMP-03** | UI/UX | 사이드바 계정 블록 간격 밀착 정렬 | P2 | 🔵 진행 중 | `src/components/Sidebar.tsx` | 최하단 계정 정보와 로그아웃 버튼을 메뉴 바로 아래 12px 간격으로 밀착 정렬 |
| **IMP-04** | 편의성 | URL 쿼리 파라미터(`?tab=guide` 등) 양방향 동기화 | P2 | 🔵 진행 중 | `src/components/DetailPageApp.tsx` | 새로고침 시에도 현재 보고 있던 탭 상태 유지 및 브라우저 히스토리 지원 |
| **IMP-05** | 성능 | 이미지 지연 로딩 및 캔버스 렌더링 최적화 | P3 | ⚪ 대기 | `src/components/DetailStudioView.tsx` | 12개 씬 고해상도 이미지 동시 렌더링 시 메모리 사용량 최적화 |
| **IMP-06** | 기능 | 스마트스토어/쿠팡 HTML 태그 자동 생성 옵션 | P3 | ⚪ 대기 | `src/components/DetailStudioView.tsx` | 통이미지 다운로드 외에 블로그/카페형 복사 태그 클립보드 내보내기 지원 |

---

## 처리 기록
- 2026-10-16: IMP-01, IMP-02, IMP-03, IMP-04 착수 (Antigravity CLI)
