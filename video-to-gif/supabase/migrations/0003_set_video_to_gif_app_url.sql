update public.programs
set app_url = 'https://video-to-gif-buylife.vercel.app',
    updated_at = now()
where slug = 'video-to-gif';
