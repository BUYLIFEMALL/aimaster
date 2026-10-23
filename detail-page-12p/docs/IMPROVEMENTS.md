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

## 2026-10-18 이미지 실패 시 조용한 대체 결과 (Claude Code 윈도우, 이미지 5묶음 중 발견)
- **발견**: 장면 이미지가 실패하면(키 오류·한도·시간 초과 포함) 조용히 SVG 대체 그림을 넣는다 — 12장면 중 일부가 대체 그림이어도 회원이 원인을 모른다. 장면 카드에 「대체 그림(원인: …)」 표시 제안. 또 라우트 함수 한도 60초라 Pro 모델은 시간 초과가 잦을 수 있음 — `maxDuration` 상향 검토.
- **우선순위**: 중 · **처리 상태**: ✅ 구현 완료(2026-10-18, AGENTS.md 같은 날짜 항목) · **관련 파일**: 이미지 생성 함수·화면
- **다음 첫 단계**: 실패 원인(`GeminiImageError.code`)을 응답에 함께 내려 화면에 한 줄 안내.

## 2026-10-23 🟡 미배포 대기 — 메인 사이트 링크 주소 정정 (Claude Code 윈도우, 세션 `claude-win-20261023-mainsite-url`)
- 메인 사이트 주소 상수가 연결 안 되는 `https://aimaster.buylife.xyz`였다(권한 없음·정지·핸드폰 안내 이동, 회원가입·비밀번호 찾기·약관 링크가 접속 오류). → `https://www.buylife.xyz`, `/signup`→`/register`, `/legal/privacy`·`/legal/terms`→`/privacy`·`/terms`. 커밋 `486fd5fd3`(prompt-template-studio는 `9c170faf5`). tsc 0.
- 운영 임시 조치: 메인 Vercel 프로젝트에 `aimaster.buylife.xyz`를 추가해 `www.buylife.xyz`로 308 이동(경로 유지) — 회원가입 `/signup`만 다음 배포 전까지 404.
- 다음 배포 때: 버전 +0.01, 로그인 화면의 회원가입·비밀번호 찾기 링크와 권한 없는 계정 이동 확인.
