-- 2026-10-21 Shots 표 updated_at 자동 갱신(주인님 승인). 칸은 있었지만 갱신 장치가 없어 수정해도 시각이 그대로였다(v1.30 업로드 기록에서 발견).
-- 기존 공용 함수 public.update_updated_at()(programs 표가 사용 중)을 그대로 쓴다. 원스톱 shorts_onestop_items는 코드가 직접 넣으므로 제외.
do $$
declare t text;
begin
  foreach t in array array['shorts_videos','shorts_video_segments','shorts_candidates','user_render_settings','youtube_accounts'] loop
    if not exists (select 1 from pg_trigger where tgname = t || '_updated_at' and tgrelid = ('public.' || t)::regclass) then
      execute format('create trigger %I before update on public.%I for each row execute function public.update_updated_at()', t || '_updated_at', t);
    end if;
  end loop;
end $$;
