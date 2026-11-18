-- AI Influencer W01 — 비공개 원본 자산 버킷 aif-assets.
-- ★ 운영 DB(ref esgxyikcnnvmlhygjkth)에 2026-11-19 적용했다(주인님 승인, 적용 기록 이름 aif_assets_bucket). 이 파일은 그때 실행한 문장의 기록이다.
-- 작성: Claude(SNS) CC-SNS-01, 세션 claude-win-20261118-sns.
--
-- 속성: 비공개(public = false) · 파일당 20MiB(20971520) · 이미지 MIME 5종. A1 표의 제약(bucket = 'aif-assets', mime 5종, generated 20MiB 이하)과 같은 값이다.
-- 저장소 정책(storage.objects의 RLS 정책)은 만들지 않는다 — 회원은 이 버킷에 직접 접근하지 못하고, 서버가 서비스 키로만 읽고 쓴다.
-- 이 파일에 없는 것: 추적 버킷 등록(storage_posting_tracked_buckets) — 최초 운영 ON 때(W00 §19-R2-4, 별도 승인).
-- 주의: 다시 실행하면 같은 id가 이미 있어 실패한다(일부러 on conflict를 두지 않았다 — 이미 있는 버킷의 속성을 조용히 지나치지 않게).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('aif-assets', 'aif-assets', false, 20971520, array['image/png','image/jpeg','image/webp','image/heic','image/heif']);
