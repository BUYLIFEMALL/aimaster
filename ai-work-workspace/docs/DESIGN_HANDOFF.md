# AI 업무 워크스페이스 자동화 — 디자인 인수인계

## 적용 스타일
- **「노션형 블록 워크스페이스 스타일」**(원본 litpage 디자인 값 그대로) + AIMaster 공통 좌측 메뉴 규격.
- 색: 원본 토큰 `--lp-*`(`src/litpage/web/styles/tokens.css`, Tailwind 기본 팔레트 기반), 라이트·다크·시스템 테마(기기별 저장 `nc:theme`, 레이아웃의 첫 화면 스크립트가 적용). 강조색 `--lp-blue-bg-accent #4f46e5`.
- 매뉴얼(`/guide`)·로그인 화면도 같은 토큰을 써서 워크스페이스와 배경·카드·글자 색이 같다(규칙 ⑪).

## AIMaster 규격 요소 (`src/litpage/web/features/shell/AimasterSidebar.tsx`, `aimaster.css`)
- 좌측 메뉴 맨 위: `← 다른 프로그램 보기`(https://www.buylife.xyz/programs) + 프로그램 이름 + 버전.
- 메뉴 목록 마지막(「사이드바 맞춤 설정」) 바로 아래: 📖 연동 & 사용 매뉴얼 → 구분선 → 계정 이메일 + 로그아웃(8~10px 간격, 맨 아래로 밀지 않음).
- 맨 아래 고정 영역은 원본 워크스페이스 전환기(계정 아님).

## 휴대폰(767px 이하)
- 원본 반응형: 좌측 메뉴 숨김 → 위쪽 ☰ 버튼으로 펼침(가림막).
- 이식판 추가: 문서 본문 좌우 여백 16px(`features/page/page.css`, 미배포 `5a9d5e564`), 매뉴얼은 한 줄 배치.
- 2026-10-24 검수: 창 최대화로 실제 창 크기 축소 불가 → 390px iframe 두 개로 매뉴얼·워크스페이스 확인(실창 검수 아님).

## 매뉴얼(`src/app/guide`)
- 지침 `docs/MANUAL_AND_INTEGRATION_GUIDELINES.md` 7대 구성: 머리글 정보 바(📖·업무자동화·약 3분·본인 키 불필요·바로 열기 버튼) → 개요 카드(카탈로그 실사 썸네일 + 3대 배지) → 흐름 줄 → STEP 1~4 카드 → 단계별 상세(단축키 상자) → 💡 팁 → ⚠️ 주의 → 바로가기 버튼. 외부 연동이 없어 「사용 매뉴얼형」으로 작성.

## 썸네일
- `program-images/catalog/ai-work-workspace-thumbnail.jpg`(gemini-3-pro-image-preview, 관리자 본인 키 1회, 2026-10-24): 30대 한국인 직장인 + 업무 보드·문서·타임라인(도형만) + 체크리스트·캘린더·카드 아이콘. 확대본 6장에서 글자·로고 없음 확인.

## 주의
- 원본 CSS 클래스(`nc-*`, `lit-*`)는 바꾸지 않는다(원본 시험·화면 시험과 맞음).
- 새 AIMaster 요소는 `aww-*` 클래스로만 추가한다.
