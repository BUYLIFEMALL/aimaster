-- AI 바나나 캔버스 v1.19 (2026-10-22) — 운영 DB ref esgxyikcnnvmlhygjkth
-- 「내 작업 레시피」를 템플릿 그래픽 카드로 넓히고(kind 'graphic'), 레시피 이름 바꾸기(본인 수정 권한)를 더한다.
alter table public.banana_canvas_presets drop constraint if exists banana_canvas_presets_kind_check;
alter table public.banana_canvas_presets add constraint banana_canvas_presets_kind_check check (kind in ('edit', 'restore', 'comic', 'graphic'));
create policy "banana_canvas_presets_owner_update" on public.banana_canvas_presets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
