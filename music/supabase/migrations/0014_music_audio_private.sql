-- 2026-10-21 주인님 결정: music-audio 공개 저장소 → 비공개(서명 주소) 전환. 음악(SUNO)자동화 v1.20.
-- 화면은 lib/storageSign.ts가 회원 본인 행의 주소를 1시간짜리 서명 주소로 바꿔 보여 주고, Suno 리믹스 원곡은 24시간짜리로 넘긴다.
-- 영향: 예전에 밖으로 복사해 둔 고정 공개 주소(/object/public/music-audio/...)는 더 이상 열리지 않는다(승인된 영향).
-- 되돌리기: update storage.buckets set public = true where id = 'music-audio';
update storage.buckets set public = false where id = 'music-audio';
select id, public from storage.buckets where id = 'music-audio';
