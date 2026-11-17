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

## WS-20261117-20 (스크롤 복구·사이드바 영문)
| 파일 | 화면 | 실제 화면 폭 | iframe 여부 | 원본 캡처 |
|---|---|---|---|---|
| 10-desktop-receipts-issue-before-ws20-cut.png | 수정 전 발행 탭 — 휠 10칸 뒤에도 scrollTop 0, 마지막 「볼타로 바로 발급」 아래 잘림 | 1560px | 아님 | screenshot-1794879624447-21.jpg |
| 11-desktop-receipts-issue-after-ws20-bottom.png | 수정 후 휠로 끝까지(scrollTop 181=최대), 마지막 버튼·보관 안내 보임 | 1560px | 아님 | screenshot-1794879662063-22.jpg |
| 12-375-iframe-receipts-after-ws20-bottom.png | 수정 후 375×812 iframe 휠로 끝까지(scrollTop 418=최대), 하단 보관 안내 보임 | iframe 375px | **예** | screenshot-1794879682981-26.png |
| 13-desktop-en-sidebar-after-ws20.png | 영어 — 사이드바 아래 메뉴·칩·Other programs·Log out 영어(영수증 본문은 기존 한국어 전용) | 1560px | 아님 | screenshot-1794879809230-27.jpg |

## 남은 시각 3조건 보완 (Master msg_1e930b6d22a9)
| 파일 | 화면 | 실제 폭 | iframe | 원본 |
|---|---|---|---|---|
| 14-375-iframe-receipts-issue-bottom.png | 375 발행 탭 휠로 끝까지(scrollTop 1055=최대), 「볼타로 바로 발급」(누르지 않음)·보관 안내 보임 | iframe 375 | 예 | screenshot-1794880241587-29.png |
| 15-375-iframe-menu-open-issue.png | 375 ☰ 펼침(사이드바 left 0·폭 260) | iframe 375 | 예 | screenshot-1794880257980-30.png |
| 16-375-iframe-menu-closed-issue.png | 바깥 눌러 닫힘(사이드바 left -240) | iframe 375 | 예 | screenshot-1794880257981-31.png |
| 17-desktop-calendar-6cards-more.png | 20일 시험 카드 6장 → 「1개 더 보기」 | 1560 | 아님 | screenshot-1794880289188-32.jpg |
| 18-desktop-calendar-more-expanded.png | 더 보기 누른 뒤 6장 모두 펼침(그 주 240→242px) | 1560 | 아님 | screenshot-1794880295852-33.jpg |
| 19-desktop-long-title-card-open.png | 긴 제목 카드 열기 — 전체 제목·날짜 11/20 읽힘 | 1560 | 아님 | screenshot-1794880329961-34.jpg |
| 20-desktop-calendar-monthend-no-panel.png | 설정 패널 없이 월말 29·30·12월 1~5 상자까지 | 1560 | 아님 | screenshot-1794880342945-36.jpg |
- 17~20은 iframe 메뉴 조작으로 같은 사이트 사이드바 상태가 접혀서 사이드바 없이 찍힘(확인 뒤 다시 펼쳐 원복).
| 21-desktop-calendar-wrap-titles-on.png | 시험 달력 보기 「항목 제목 줄바꿈」 켠 상태 — 긴 제목 2줄 클램프, 20일 3장+「3개 더 보기」, 주 240px(확인 뒤 원래 OFF로 복원) | 1560 | 아님 | screenshot-1794880791627-37.jpg |
