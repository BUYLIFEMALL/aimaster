-- Auto cleanup helper function for deleting image records older than 30 days
CREATE OR REPLACE FUNCTION public.cleanup_old_user_image_generations(days_old INT DEFAULT 30)
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.user_image_generations
    WHERE created_at < (NOW() - (days_old || ' days')::INTERVAL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Deletes every user's rows, so it must not be callable through the public RPC API.
REVOKE EXECUTE ON FUNCTION public.cleanup_old_user_image_generations(INT) FROM PUBLIC, anon, authenticated;
