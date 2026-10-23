-- Storage bucket for ai-image-studio permanent image storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-image-generations', 'ai-image-generations', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for public reading and owner uploading
CREATE POLICY "ai_image_generations_select_public" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'ai-image-generations');

CREATE POLICY "ai_image_generations_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ai-image-generations' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "ai_image_generations_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ai-image-generations' AND (storage.foldername(name))[1] = auth.uid()::text);
