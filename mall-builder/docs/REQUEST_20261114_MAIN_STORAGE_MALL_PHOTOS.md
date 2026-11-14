# 요청 — 메인 사이트 저장공간 담당께: 쇼핑몰 사진도 중앙 정리·사용량에 넣어 주세요 (2026-11-14)

- 보내는 쪽: [역할: mall-builder] Claude Code(윈도우) `claude-win-20261025-workspace`
- 받는 쪽: 메인 사이트 저장공간(`docs/PLAN_20261111_MEMBER_STORAGE_QUOTA.md`, `/api/cron/storage-retention`, `member_storage_usage`) 담당
- 주인님 결정(2026-11-14 채팅):
  - 「(쇼핑몰 사진도) 관리자/테스트계정을 제외하고는 30일 룰 적용하도록 하고」 → 선택 「**안 쓰는 사진만 30일**」(판매 중인 상품 사진은 지우지 않음)
  - 「사용자들은 필요하다면 플랜을 업그레이드하거나 추가 용량 구매해서 사용하게 하면 되」

## 왜 메인 사이트 쪽 일인가
- 쇼핑몰 사진은 공개 저장소 `mall-builder-public`에 **`<몰 id>/…`** 경로로 저장된다(회원 아이디가 경로에 없음).
- 지금 중앙 정리 `member_storage_expired_files`와 사용량 집계는 **경로에 회원 아이디가 들어간 파일만** 본다 → 쇼핑몰 사진은 정리·사용량 모두에서 빠져 있다(운영 DB 확인: `member_storage_usage.by_bucket`에 `mall-builder-private`만 있고 `mall-builder-public` 없음).
- 쇼핑몰 앱에는 서버 키가 없어(몰 운영자 토큰으로만 예약 작업) 저장소 파일을 지울 수 없다.

## 쇼핑몰 쪽에서 해 둔 것 (운영·Lab DB 모두 적용 대상, 0066)
- **`public.mall_builder_expired_photos(p_max integer default 500) returns table (bucket_id text, name text, user_id uuid)`** — `service_role`만 실행.
  - 지울 후보 = `mall-builder-public`의 `<몰 id>/…` 파일 중 ① 어디에도 안 쓰임(상품 사진·상세 그림·상품 설명·첫 화면·지난 주문 품목 사진·공지·몰 설정/로고) ② 몰 주인 보관 기간 지남(`member_storage_policy(owner).retention_days`, 없으면 30일, `unlimited_retention`이면 제외) ③ 몰 주인이 `retention_exempt_manual`(관리자·시험 계정)이 아님.
  - `user_id` = 몰 주인(`mall_builder_stores.owner_id`).
  - 시나리오 `mall-builder/scripts/scenario-0066-expired-photos.sql` 통과(40일 안 쓰는 사진만 후보, 쓰는 사진·로고·10일 사진 제외, 관리자·시험 몰 0건).

## 요청 (두 가지)
1. **중앙 정리에 한 번 더 부르기** — `/api/cron/storage-retention`에서 지금 회원 파일 정리 다음에
   `service.rpc("mall_builder_expired_photos", { p_max: 500 })` → 받은 `bucket_id`·`name`을 지금처럼 `service.storage.from(bucket).remove(names)`로 지우고, 사용량 다시 계산할 회원(`user_id`)을 `touched`에 넣는다(최대 10회 반복은 지금 방식 그대로).
2. **사용량 집계에 쇼핑몰 사진 넣기** — `member_storage_usage` 계산 때 `mall-builder-public`의 `<몰 id>/…` 파일 크기를 **몰 주인**(`mall_builder_stores.owner_id`) 사용량에 더한다(`by_bucket.mall-builder-public`). 그래야 500MB 한도·💾 표시·80% 구독 안내가 쇼핑몰 사진에도 적용되고, 주인님 말씀대로 「플랜 업그레이드·추가 용량 구매」로 이어진다. 분양몰 거울 상품은 본사 몰 사진을 같이 쓰므로 본사 몰 주인에게만 센다(경로 기준이라 자동으로 그렇게 됨).

## 주의
- 쓰는 중인 사진은 절대 지우지 않는다(함수가 이미 걸러 줌). 함수 결과만 지우면 된다.
- Lab DB(`rjjtjakljjxsgjelqgek`)에는 `member_storage_policy`·`retention_exempt_manual`이 없어 함수가 「30일·열외 없음」으로 동작한다(Lab에는 중앙 정리가 없으니 영향 없음).
- 끝나면 이 문서 맨 아래에 「처리함(날짜·커밋)」을 적어 주세요. 문의는 mall-builder 역할 파일(`docs/roles/mall-builder.md`)로.
