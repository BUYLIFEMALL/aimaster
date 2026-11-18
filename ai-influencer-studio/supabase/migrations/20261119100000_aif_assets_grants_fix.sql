-- AI Influencer W01z — aif_assets 표의 회원 역할(authenticated) 직접 권한을 「읽기만」으로 바로잡는다.
-- ★ 이 파일은 아직 어떤 영속 DB에도 실행하지 않았다(2026-11-19). 운영 적용은 별도 승인 뒤.
-- 작성: Claude(SNS) CC-SNS-01, 세션 claude-win-20261118-sns. Master msg_ee7317b3640a.
--
-- 무슨 일이 있었나
--   2026-11-19 운영 DB에 20261118120000_aif_assets_a1.sql을 적용한 뒤 카탈로그를 보니 public.aif_assets의 권한이
--   authenticated = arwdDxtm(select·insert·update·delete·truncate·references·trigger 전부)였다.
--   운영 DB는 public 스키마의 기본 권한(pg_default_acl)이 새 표에 anon·authenticated·service_role 전부를 주는데,
--   A1 원문은 anon만 「revoke all」 하고 authenticated에는 「grant select」만 했다(먼저 회수하지 않았다).
--   aif_asset_deletions는 A1 원문이 anon·authenticated 둘 다 회수해 정상이었다.
-- 왜 고치나
--   insert·update·delete는 행 단위 보안(RLS, 해당 정책 없음)이 막지만, truncate·references·trigger는 RLS의 대상이 아니다.
--   「회원은 어떤 쓰기도 직접 하지 못한다」는 A1의 원칙과 권한 상태를 맞춘다.
-- 하는 일(이 두 문장뿐)
--   aif_assets에서 authenticated의 직접 권한을 모두 회수한 뒤 select만 다시 준다. select는 지금처럼 RLS 정책
--   aif_assets_select_own_ready(본인 것·ready만)를 거친다.
-- 하지 않는 것
--   * 이미 적용된 파일 3개(a1·p2_missing·p3_summary)·표 구조·데이터·정책·함수·색인 변경 — 없음.
--   * anon·service_role·postgres의 권한 변경 — 없음(anon은 A1이 이미 회수, service_role은 그대로).
--   * 스키마 기본 권한(pg_default_acl) 변경 — 없음. 다른 프로그램의 표에 영향이 가는 설정이라 건드리지 않는다.
--     그래서 앞으로 이 프로그램이 public에 새 표를 만들 때는 그 파일에서 anon·authenticated를 먼저 회수해야 한다.
--   * DROP·삭제 — 없음.
-- 다시 실행해도 결과가 같다(회수 뒤 부여).

revoke all on table public.aif_assets from authenticated;
grant select on table public.aif_assets to authenticated;   -- RLS가 본인 ready만 보이게 한다
