-- 버그 수정: kakao_broadcast_recipients에 select/insert/delete 정책만 있고 update
-- 정책이 빠져 있었다. RLS가 update를 조용히 막아서(에러 없이 0건 반영) 그룹 이동
-- (moveBroadcastRecipientGroupAction/moveManyBroadcastRecipientsGroupAction)과 이름/
-- 전화번호 수정(updateBroadcastRecipientAction)이 실제로는 아무것도 안 바뀌는 상태였다.
create policy "kakao_broadcast_recipients_update_own"
  on public.kakao_broadcast_recipients for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
