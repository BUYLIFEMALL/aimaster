-- WAV 파일은 mp3보다 훨씬 커서(3~4분 곡 기준 수십MB) 기존 버킷 기본 업로드 제한에 걸려
-- "The object exceeded the maximum allowed size" 오류로 저장이 실패한 사례가 있었다
-- (2026-08-15, 실제 WAV 변환 결과를 우리 Storage로 옮기다 발견). 버킷 레벨 제한을 200MB로
-- 넉넉하게 올린다.
update storage.buckets set file_size_limit = 209715200 where id = 'music-audio';
