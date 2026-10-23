-- 리믹스 결과가 원곡보다 짧게(약 30~50초) 나오는 문제(2026-08-17, Suno "duration" 파라미터를
-- 넘겨도 완전히 해결되지 않음을 실사용 테스트로 확인) 대응: 초기 생성이 목표 길이(원곡 길이)에
-- 못 미치면 Suno `/generate/extend`로 같은 remix row를 자동으로 몇 차례 더 연장한다.
-- (music_track_remix_variants는 그대로 두고, 매 연장마다 새 variant를 이 테이블에 계속
-- 추가한다 — "새 트랙 row"를 만드는 기존 곡 연장 패턴과 달리, 리믹스는 자동 반복이라 매번
-- 새 remix row를 만들면 목록이 매 hop마다 늘어나 지저분해지므로 같은 row를 재사용한다.)
alter table public.music_track_remixes
  add column target_duration_seconds int,   -- 목표 길이(원곡 길이, 또는 업로드 시 기본값)
  add column extend_hop_count int not null default 0,  -- 자동 연장 몇 번 했는지(상한 체크용)
  add column instrumental boolean not null default false;  -- 연장 요청 시 prompt 포함 여부 판단용
