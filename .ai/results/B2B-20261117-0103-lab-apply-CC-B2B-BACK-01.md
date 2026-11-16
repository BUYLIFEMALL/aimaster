# B2B Lab 0103 단독 적용 결과 — CC-B2B-BACK-01 (2026-11-17)

지시: Master msg_956f7d261923(Mac msg_f193c3324b3c 최종 PASS 뒤 실행 승인). 범위: 0103 함수 수정 + 적용 기록만.

## 대상 확인
- Lab MCP 프로젝트 URL `https://rjjtjakljjxsgjelqgek.supabase.co`.
- ego 브라우저 SQL 편집기 주소 `…/project/rjjtjakljjxsgjelqgek/sql/new`, 화면 제목 「SQL Editor | AIMaster_dev | BUYLIFE-DEV」, 상단 BUYLIFE-DEV / AIMaster_dev 눈 확인(운영 esgxyik 아님).

## 지문 재대조
- 0103 원문 `05fd87eeed148ecd9d238430862d8595366e43a6575a46d78b80bf00b3b48de6` · apply.sql `f0bf36e77443e02c0ecc79c5380d004025b9a78c3681982cda99f15cf072ada8`(build.mjs 재생성해도 같음) · precheck `7f8a0667…` · verify `b3f40b6a…`.
- 편집기에 붙여 넣은 내용 sha256 = `f0bf36e7…`(8,053자, 파일과 같음).

## precheck(읽기, 적용 전)
- 1~10 모두 OK: 몰 있음 · 0102 기록 1 · 0103 기록 0 · 도우미 없음 · 교환 표 · 지킴 트리거 1 · 지킴 0102판 · 진행 중 교환 0 · 시험 아닌 주문 17/1 · 알림 44.
- 기준값: 주문 지문 `c56e3560d4f9b4d98c724cbfc93ed228` · 장부 `7203b416…:EXQA-2:500` · 리워드 `1552ca37…:pending:2300`, `53f55d95…:paid:500`.

## 적용
- apply.sql **실행 1회**(Run 한 번, 확인 창 없음) → 「Success. No rows returned」.
- 적용 기록 `supabase_migrations.schema_migrations` version **`20261116193438`**, name `mall_builder_0103_exchange_confirmed_window`.

## verify(읽기, 적용 뒤) — 전체 14/14 OK
| 번호 | 값 |
|---|---|
| 1·2 | 0103 기록 1 · 0102 기록 1 |
| 3 | true/true/false/false/false |
| 4 | false/false(도우미 회원·비로그인 실행 권한 없음) |
| 5·6 | true · true(교환 신청 7일 D4 그대로) |
| 7 | true/false |
| 8 | true/1 |
| 9 | 교환 0 |
| 10 | 시험 주문 2(EXQA-1 delivered · EXQA-2 confirmed) |
| 11·12 | 17/1 · 알림 44(변화 없음) |
| 13 | 리셀러 manifest 「없음」(장부 7203b416 500·리워드 2줄 그대로, 기존 대기 2,300 보존, 출금 0) |
| 14 | 예약 false/true |
| 16 | 주문 지문 `c56e3560…` = precheck 11번(전후 같음) |

## 하지 않은 것
fixture 재생성·EXQA-1 추가 확정·교환 신청·정리(b5)·뒷정리·0104·공용 0032·운영 DB·빌드·배포·키 변경 0. ego 작업 공간 219 닫음.
