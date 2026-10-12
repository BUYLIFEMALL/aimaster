-- 예약·자동 실행(cron) 작업까지 핸드폰 번호 필수 정책 적용(2026-10-12)에 따른 프로그램 버전 +0.01.
update public.programs set version='v1.05', updated_at=now() where slug='booking-reminder';
update public.programs set version='v1.05', updated_at=now() where slug='crm-google-form';
update public.programs set version='v1.05', updated_at=now() where slug='kakao-auto-posting';
update public.programs set version='v1.06', updated_at=now() where slug='naver-cafe-poster';
update public.programs set version='v1.05', updated_at=now() where slug='trending-product-finder';
update public.programs set version='v1.05', updated_at=now() where slug='auto-threads-posting';
update public.programs set version='v1.06', updated_at=now() where slug='auto-instagram-posting';
update public.programs set version='v1.51', updated_at=now() where slug='threads-affiliate-poster';
update public.programs set version='v1.05', updated_at=now() where slug='stepmail';
update public.programs set version='v1.08', updated_at=now() where slug='real-estate-sales';
update public.programs set version='v1.05', updated_at=now() where slug='youtube-auto-reply';
update public.programs set version='v1.05', updated_at=now() where slug='instagram-comment-reply';
update public.programs set version='v1.05', updated_at=now() where slug='threads-comment-reply';