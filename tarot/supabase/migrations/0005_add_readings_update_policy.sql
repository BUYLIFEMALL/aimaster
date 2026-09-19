-- 0004에 UPDATE 정책이 누락되어 있었다. ResultInteractive.tsx가 이미 저장된 리딩에
-- card_images/ai_reading을 추가로 업데이트할 때(.update().eq("id", readingId)) 이 정책이
-- 없으면 RLS가 기본적으로 막아서 조용히 실패한다(2026-09-19, 0004가 실제 DB에 한 번도
-- 적용된 적이 없었다는 것과 함께 발견 — 아래 참고).
-- PostgreSQL은 CREATE POLICY에 IF NOT EXISTS를 지원하지 않는다.
CREATE POLICY "Users can update their own tarot readings"
  ON tarot_readings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
