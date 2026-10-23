-- ai-audio-analyzer
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.04',
    updated_at = now()
where slug = 'ai-audio-analyzer' and version = 'v1.03'
returning slug, version, extension_version, extension_download_url;

-- ai-auto-blog
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.64',
    extension_version = 'v1.64',
    extension_download_url = 'https://ai-auto-blog-one.vercel.app/downloads/ai-auto-blog-extension-latest.zip',
    updated_at = now()
where slug = 'ai-auto-blog' and version = 'v1.63'
returning slug, version, extension_version, extension_download_url;

-- ai-image-studio
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.09',
    updated_at = now()
where slug = 'ai-image-studio' and version = 'v1.08'
returning slug, version, extension_version, extension_download_url;

-- ai-influencer-studio
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.08',
    updated_at = now()
where slug = 'ai-influencer-studio' and version = 'v1.07'
returning slug, version, extension_version, extension_download_url;

-- ai-mastering-studio
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.04',
    updated_at = now()
where slug = 'ai-mastering-studio' and version = 'v1.03'
returning slug, version, extension_version, extension_download_url;

-- ai-prompt-studio
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.04',
    updated_at = now()
where slug = 'ai-prompt-studio' and version = 'v1.03'
returning slug, version, extension_version, extension_download_url;

-- ai-slide-builder
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.07',
    updated_at = now()
where slug = 'ai-slide-builder' and version = 'v1.06'
returning slug, version, extension_version, extension_download_url;

-- ai-task-planner
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.07',
    updated_at = now()
where slug = 'ai-task-planner' and version = 'v1.06'
returning slug, version, extension_version, extension_download_url;

-- ai-webtoon-studio
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.09',
    updated_at = now()
where slug = 'ai-webtoon-studio' and version = 'v1.08'
returning slug, version, extension_version, extension_download_url;

-- ai-writing-editor
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.07',
    updated_at = now()
where slug = 'ai-writing-editor' and version = 'v1.06'
returning slug, version, extension_version, extension_download_url;

-- allinone-graphic
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.03',
    updated_at = now()
where slug = 'allinone-graphic' and version = 'v1.02'
returning slug, version, extension_version, extension_download_url;

-- auto-detail-page
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.06',
    updated_at = now()
where slug = 'auto-detail-page' and version = 'v1.05'
returning slug, version, extension_version, extension_download_url;

-- banana-canvas
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.05',
    updated_at = now()
where slug = 'banana-canvas' and version = 'v1.04'
returning slug, version, extension_version, extension_download_url;

-- blog-content-maker
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.04',
    extension_version = 'v1.04',
    extension_download_url = 'https://blog-content-maker.buylife.xyz/downloads/blog-content-maker-extension-latest.zip',
    updated_at = now()
where slug = 'blog-content-maker' and version = 'v1.03'
returning slug, version, extension_version, extension_download_url;

-- blog-keyword
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.04',
    updated_at = now()
where slug = 'blog-keyword' and version = 'v1.03'
returning slug, version, extension_version, extension_download_url;

-- blog-workroom
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.04',
    updated_at = now()
where slug = 'blog-workroom' and version = 'v1.03'
returning slug, version, extension_version, extension_download_url;

-- booking-reminder
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.06',
    updated_at = now()
where slug = 'booking-reminder' and version = 'v1.05'
returning slug, version, extension_version, extension_download_url;

-- cardnews-studio
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.09',
    updated_at = now()
where slug = 'cardnews-studio' and version = 'v1.08'
returning slug, version, extension_version, extension_download_url;

-- cinematic-storyboard-studio
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.05',
    updated_at = now()
where slug = 'cinematic-storyboard-studio' and version = 'v1.04'
returning slug, version, extension_version, extension_download_url;

-- competitor-analysis
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.05',
    updated_at = now()
where slug = 'competitor-analysis' and version = 'v1.04'
returning slug, version, extension_version, extension_download_url;

-- crm-google-form
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.06',
    updated_at = now()
where slug = 'crm-google-form' and version = 'v1.05'
returning slug, version, extension_version, extension_download_url;

-- detail-page-12p
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.03',
    updated_at = now()
where slug = 'detail-page-12p' and version = 'v1.02'
returning slug, version, extension_version, extension_download_url;

-- document-translator
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.04',
    updated_at = now()
where slug = 'document-translator' and version = 'v1.03'
returning slug, version, extension_version, extension_download_url;

-- ebook-studio
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.05',
    updated_at = now()
where slug = 'ebook-studio' and version = 'v1.04'
returning slug, version, extension_version, extension_download_url;

-- emotion-writer
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.09',
    updated_at = now()
where slug = 'emotion-writer' and version = 'v1.08'
returning slug, version, extension_version, extension_download_url;

-- fashion-style
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.06',
    updated_at = now()
where slug = 'fashion-style' and version = 'v1.05'
returning slug, version, extension_version, extension_download_url;

-- file-merge
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.06',
    updated_at = now()
where slug = 'file-merge' and version = 'v1.05'
returning slug, version, extension_version, extension_download_url;

-- four-cut-comics
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.08',
    updated_at = now()
where slug = 'four-cut-comics' and version = 'v1.07'
returning slug, version, extension_version, extension_download_url;

-- ghost-scraper
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.11',
    updated_at = now()
where slug = 'website-scraper' and version = 'v1.10'
returning slug, version, extension_version, extension_download_url;

-- image-convert-studio
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.06',
    updated_at = now()
where slug = 'image-convert-studio' and version = 'v1.05'
returning slug, version, extension_version, extension_download_url;

-- infinite-loop-video
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.04',
    updated_at = now()
where slug = 'infinite-loop-video' and version = 'v1.03'
returning slug, version, extension_version, extension_download_url;

-- insta_auto_poster
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.07',
    updated_at = now()
where slug = 'auto-instagram-posting' and version = 'v1.06'
returning slug, version, extension_version, extension_download_url;

-- instagram-comment-reply
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.06',
    updated_at = now()
where slug = 'instagram-comment-reply' and version = 'v1.05'
returning slug, version, extension_version, extension_download_url;

-- instagram-dm-reply
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.05',
    updated_at = now()
where slug = 'instagram-dm-reply' and version = 'v1.04'
returning slug, version, extension_version, extension_download_url;

-- kakao_auto_poster
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.09',
    updated_at = now()
where slug = 'kakao-auto-posting' and version = 'v1.08'
returning slug, version, extension_version, extension_download_url;

-- landing-architect
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.06',
    updated_at = now()
where slug = 'landing-architect' and version = 'v1.05'
returning slug, version, extension_version, extension_download_url;

-- longtail-keyword-expander
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.05',
    updated_at = now()
where slug = 'longtail-keyword-expander' and version = 'v1.04'
returning slug, version, extension_version, extension_download_url;

-- markdown-studio
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.08',
    updated_at = now()
where slug = 'markdown-studio' and version = 'v1.07'
returning slug, version, extension_version, extension_download_url;

-- mbti
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.04',
    updated_at = now()
where slug = 'personality-code' and version = 'v1.03'
returning slug, version, extension_version, extension_download_url;

-- mbti-character
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.07',
    updated_at = now()
where slug = 'mbti-character' and version = 'v1.06'
returning slug, version, extension_version, extension_download_url;

-- music
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.05',
    updated_at = now()
where slug = 'music-automation' and version = 'v1.04'
returning slug, version, extension_version, extension_download_url;

-- music-player
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.03',
    updated_at = now()
where slug = 'music-player' and version = 'v1.02'
returning slug, version, extension_version, extension_download_url;

-- music-video-studio
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.05',
    updated_at = now()
where slug = 'music-video-studio' and version = 'v1.04'
returning slug, version, extension_version, extension_download_url;

-- naver-blog-agent
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.84',
    extension_version = 'v1.84',
    extension_download_url = 'https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-agent' and version = 'v1.83'
returning slug, version, extension_version, extension_download_url;

-- naver-blog-allinone
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.42',
    extension_version = 'v1.42',
    extension_download_url = 'https://naver-blog-allinone.buylife.xyz/downloads/naver-blog-allinone-latest.zip',
    updated_at = now()
where slug = 'naver-blog-allinone' and version = 'v1.41'
returning slug, version, extension_version, extension_download_url;

-- naver-blog-auto-poster_app/web
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.05',
    updated_at = now()
where slug = 'naver-blog-auto-poster' and version = 'v1.04'
returning slug, version, extension_version, extension_download_url;

-- naver-blog-auto-poster_web/web
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.06',
    extension_version = 'v1.06',
    extension_download_url = 'https://www.buylife.xyz/downloads/naver-blog-auto-poster-web-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-auto-poster-web' and version = 'v1.05'
returning slug, version, extension_version, extension_download_url;

-- naver-blog-seo-studio
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.64',
    extension_version = 'v1.64',
    extension_download_url = 'https://naver-blog-seo-studio.vercel.app/downloads/naver-blog-seo-studio-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-seo-studio' and version = 'v1.63'
returning slug, version, extension_version, extension_download_url;

-- naver-cafe-poster
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.07',
    updated_at = now()
where slug = 'naver-cafe-poster' and version = 'v1.06'
returning slug, version, extension_version, extension_download_url;

-- persona-style-studio
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.06',
    updated_at = now()
where slug = 'persona-style-studio' and version = 'v1.05'
returning slug, version, extension_version, extension_download_url;

-- personality-suite
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.06',
    updated_at = now()
where slug = 'personality-suite' and version = 'v1.05'
returning slug, version, extension_version, extension_download_url;

-- photo-remake-studio
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.03',
    updated_at = now()
where slug = 'photo-remake-studio' and version = 'v1.02'
returning slug, version, extension_version, extension_download_url;

-- playlist-channel-studio
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.07',
    updated_at = now()
where slug = 'playlist-channel-studio' and version = 'v1.06'
returning slug, version, extension_version, extension_download_url;

-- portrait-photo
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.19',
    updated_at = now()
where slug = 'portrait-photo' and version = 'v1.18'
returning slug, version, extension_version, extension_download_url;

-- prompt-template-studio
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.03',
    updated_at = now()
where slug = 'prompt-template-studio' and version = 'v1.02'
returning slug, version, extension_version, extension_download_url;

-- react-ui-showcase
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.04',
    updated_at = now()
where slug = 'ai-web-ui' and version = 'v1.03'
returning slug, version, extension_version, extension_download_url;

-- real_estate_sales
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.09',
    updated_at = now()
where slug = 'real-estate-sales' and version = 'v1.08'
returning slug, version, extension_version, extension_download_url;

-- reverse-prompt
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.04',
    updated_at = now()
where slug = 'reverse-prompt' and version = 'v1.03'
returning slug, version, extension_version, extension_download_url;

-- seo-thumbnail-pro
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.04',
    updated_at = now()
where slug = 'seo-thumbnail-pro' and version = 'v1.03'
returning slug, version, extension_version, extension_download_url;

-- shop-detail-page
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.05',
    updated_at = now()
where slug = 'shop-detail-page' and version = 'v1.04'
returning slug, version, extension_version, extension_download_url;

-- shorts-viral-studio
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.09',
    updated_at = now()
where slug = 'shorts-viral-studio' and version = 'v1.08'
returning slug, version, extension_version, extension_download_url;

-- shots
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.09',
    updated_at = now()
where slug = 'auto-shorts-posting' and version = 'v1.08'
returning slug, version, extension_version, extension_download_url;

-- stepmail
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.10',
    updated_at = now()
where slug = 'stepmail' and version = 'v1.09'
returning slug, version, extension_version, extension_download_url;

-- style-dna-analyzer
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.15',
    updated_at = now()
where slug = 'style-dna-analyzer' and version = 'v1.14'
returning slug, version, extension_version, extension_download_url;

-- suno-music-studio
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.09',
    updated_at = now()
where slug = 'suno-music-studio' and version = 'v1.08'
returning slug, version, extension_version, extension_download_url;

-- tarot
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.06',
    updated_at = now()
where slug = 'tarot-reading' and version = 'v1.05'
returning slug, version, extension_version, extension_download_url;

-- threads
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.06',
    updated_at = now()
where slug = 'auto-threads-posting' and version = 'v1.05'
returning slug, version, extension_version, extension_download_url;

-- threads-affiliate-poster
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.52',
    updated_at = now()
where slug = 'threads-affiliate-poster' and version = 'v1.51'
returning slug, version, extension_version, extension_download_url;

-- threads-comment-reply
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.06',
    updated_at = now()
where slug = 'threads-comment-reply' and version = 'v1.05'
returning slug, version, extension_version, extension_download_url;

-- threads-content-ops
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.95',
    updated_at = now()
where slug = 'threads-content-ops' and version = 'v1.94'
returning slug, version, extension_version, extension_download_url;

-- threads-easy-planner
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.43',
    updated_at = now()
where slug = 'threads-easy-planner' and version = 'v1.42'
returning slug, version, extension_version, extension_download_url;

-- thumbnail-master
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.04',
    updated_at = now()
where slug = 'thumbnail-master' and version = 'v1.03'
returning slug, version, extension_version, extension_download_url;

-- tistory-auto-blog
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.71',
    extension_version = 'v1.71',
    extension_download_url = 'https://tistory-auto-blog-pearl.vercel.app/downloads/tistory-auto-blog-extension-latest.zip',
    updated_at = now()
where slug = 'tistory-auto-blog' and version = 'v1.70'
returning slug, version, extension_version, extension_download_url;

-- trending-product-finder
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.06',
    updated_at = now()
where slug = 'trending-product-finder' and version = 'v1.05'
returning slug, version, extension_version, extension_download_url;

-- ui-canvas
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.07',
    updated_at = now()
where slug = 'ui-canvas' and version = 'v1.06'
returning slug, version, extension_version, extension_download_url;

-- video-to-gif
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.05',
    updated_at = now()
where slug = 'video-to-gif' and version = 'v1.04'
returning slug, version, extension_version, extension_download_url;

-- vinyl-lp-studio
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.04',
    updated_at = now()
where slug = 'vinyl-lp-studio' and version = 'v1.03'
returning slug, version, extension_version, extension_download_url;

-- web-crawler/webapp
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.05',
    updated_at = now()
where slug = 'web-crawler-saas' and version = 'v1.04'
returning slug, version, extension_version, extension_download_url;

-- youtube-auto-reply
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.06',
    updated_at = now()
where slug = 'youtube-auto-reply' and version = 'v1.05'
returning slug, version, extension_version, extension_download_url;

-- youtube-channel-consultant
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.06',
    updated_at = now()
where slug = 'youtube-channel-consultant' and version = 'v1.05'
returning slug, version, extension_version, extension_download_url;

-- youtube-viral-studio
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.12',
    updated_at = now()
where slug = 'youtube-viral-studio' and version = 'v1.11'
returning slug, version, extension_version, extension_download_url;

-- yt-playlist-studio
-- Supabase variable-name compatibility release; no schema or credential changes.
update public.programs
set version = 'v1.04',
    updated_at = now()
where slug = 'yt-playlist-studio' and version = 'v1.03'
returning slug, version, extension_version, extension_download_url;
