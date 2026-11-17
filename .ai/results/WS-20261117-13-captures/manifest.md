# WS-20261117-13 로컬 실화면 대표 캡처 (2026-11-17, CC-WORKSPACE-01)

로컬 개발 서버 `http://localhost:3457`(Master 지속 세션 PID 32968, DB `aww_dev`), 엣지 탭 1553942690, 시험 계정 로그인, 확인용 워크스페이스 `workspace6433`.
캡처 도구가 화면을 1208×980으로 축소해 저장(실제 화면 폭 1560px). 왼쪽 아래 계정 이메일 줄은 회색으로 가림. 원본 JPG → PNG 변환.

| 파일 | 화면 | 실제 화면 폭 | iframe 여부 | 원본 캡처 |
|---|---|---|---|---|
| 01-desktop-studio-dashboard.png | `/workspace6433/studio` 관제 대시보드(S2)·남색 사이드바(S1) | 1560px | 아님 | screenshot-1794877776077-1.jpg |
| 02-375-iframe-receipts.png | 데스크톱 영수증 화면 위 오른쪽에 375×812 iframe(`/workspace6433/receipts`) — 엣지 창이 500px 아래로 줄지 않아 사용, 실기기 아님 | 바깥 1560px / iframe 375px | **예** | screenshot-1794877982660-6.jpg |
| 03-desktop-db-calendar.png | 새 데이터베이스 달력 보기(월 구분 상자·오늘 표시), 오른쪽에 새 보기 설정 창이 열린 상태 | 1560px | 아님 | screenshot-1794877890152-4.jpg |

## 보완 묶음 (WS-20261117-19 수정 뒤, Master msg_84c6c02fa0b5 / Mac QA019)
| 파일 | 화면 | 실제 화면 폭 | iframe 여부 | 원본 캡처 |
|---|---|---|---|---|
| 04-desktop-en-studio-before-ws19.png | 영어(en) 관제 대시보드 — 수정 전: 상단 제목 띠 빈칸, 사이드바 「관제 대시보드」 한국어 | 1560px(저장 1232×963) | 아님 | screenshot-1794878940231-8.jpg |
| 05-desktop-en-studio-after-ws19.png | 영어 — 수정 후: 상단 「📊 Control dashboard」, 사이드바 첫 메뉴 「Control dashboard」 | 1560px | 아님 | screenshot-1794879109230-9.jpg |
| 06-desktop-ko-studio-after-ws19.png | 한국어 복원 — 상단 「📊 관제 대시보드」, 기존 한글 그대로 | 1560px | 아님 | screenshot-1794879160515-10.jpg |
| 07-desktop-calendar-cards-monthend.png | 시험 달력(설정 창 닫음), 월말(29·30, 12월 상자)까지, 시험 카드 6장(긴 제목 1·20일 겹침 4·25일 1) | 1560px | 아님 | screenshot-1794879279218-12.jpg |
| 08-375-iframe-receipts-top.png | 375×812 iframe 영수증 상단(상단 제목 줄 보임) — 확대 저장 337×731 | iframe 375px | **예** | screenshot-1794879314628-14.png |
| 09-375-iframe-menu-open.png | 375 iframe ☰ 메뉴 펼침(사이드바·아래 6개 메뉴) | iframe 375px | **예** | screenshot-1794879370623-19.png |

- 375 하단 캡처 없음: 영수증 화면이 375×812에서 **스크롤 불가**(아래 결함)라 하단을 화면에 띄울 방법이 없어 찍지 못함. 개발 도구 배지(N 1 Insight)는 iframe 안 닫기 버튼을 눌러도 닫히지 않아 그대로 찍힘(개발 서버 전용, 제품 화면 아님).
