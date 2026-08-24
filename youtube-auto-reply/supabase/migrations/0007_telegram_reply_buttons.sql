-- 텔레그램으로 발송한 "게시/보류/건너뛰기" 승인 메시지를 나중에 다시 찾아 수정(버튼 비활성화
-- 등)할 수 있도록, 어떤 메시지로 보냈는지 댓글 행에 함께 기록해둔다.
alter table ytreply_comments
  add column if not exists telegram_chat_id text,
  add column if not exists telegram_message_id bigint;
