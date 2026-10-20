# 개발 플랜 — 「📅 내 예약 현황」 8개 프로그램 SNS 예약 모아 보기 (2026-10-20, Claude Code 윈도우)

주인님 결정: 메인 사이트에 모으기 — 회원 메뉴 새 화면 + 홈 「내 작업대」 위 요약 한 줄(추가개선 제안 3-2, 「진행」).

## 범위
- 모으는 프로그램(한 건씩 예약, 모두 `status='scheduled'` + `scheduled_at`): INSTA 포스팅(`insta_posts`)·카드뉴스(`cns_insta_posts`)·인플루언서(`aif_insta_posts`)·웹툰(`wts_insta_posts`)·4컷(`fcc_insta_posts`)·쓰레드 자동포스팅(`posts`)·쓰레드 쇼핑제휴(`tap_posts`)·쓰레드 운영(`tco_posts`).
- 제외(다음 단계 후보): 네이버 카페·카카오 — 규칙을 켜 두면 주기마다 도는 정기형이라 표시 방식이 다름.
- 보기 전용. 취소·수정은 「○○에서 보기」로 각 프로그램에서(그림 파일 정리 등 프로그램별 처리 유지).

## 구조
- `lib/schedules/memberSchedules.ts`: `SOURCES` 표(프로그램 slug·표·SNS·내용 칸·계정 칸), 서비스 키로 읽되 `user_id = 로그인 회원`만, 표 하나 실패해도 나머지 표시. 같은 SNS 30분 안(계정이 둘 다 있고 다르면 제외) → 겹침 표시.
- `app/(dashboard)/schedules/page.tsx`: 요약 카드 3개(남은 예약·다음 게시·겹침) + 날짜별 목록 + 「○○에서 보기」. 비로그인은 로그인으로.
- `components/home/ScheduleSummaryBar.tsx` + `app/(main)/page.tsx`: 예약이 있을 때만 「⏰ SNS 예약 n건 대기 · 다음 게시 … · ⚠️ 겹침 n건 → 내 예약 현황」.
- `components/layout/Sidebar.tsx`: 「내 구독」 아래 「내 예약 현황」.
- 새 프로그램이 같은 방식으로 예약을 만들면 `SOURCES`에 한 줄 추가.

## 검수·비용
tsc·build, 푸시 자동 배포, 크롬(관리자) 메뉴·빈 화면·홈. DB 변경 없음, 유료 API 0.
