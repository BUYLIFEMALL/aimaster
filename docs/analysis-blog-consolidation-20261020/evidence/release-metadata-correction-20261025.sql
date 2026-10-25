-- 운영 esgxyikcnnvmlhygjkth / 2026-10-25 codex-win-20261025-blog
-- 이미 배포된 앱·라이브 ZIP과 programs 표시값 정합성만 정정. 회원 데이터/키/연결 변경 없음.
-- 적용 전에 세 배포 READY·공식 alias·HTTP 버전·ZIP 버전 대조 완료.
DO $$
BEGIN
  IF (SELECT count(*) FROM public.programs WHERE
    (slug='ai-auto-blog' AND version='v1.81' AND extension_version='v1.80' AND extension_download_url='https://ai-auto-blog.buylife.xyz/downloads/ai-auto-blog-extension-latest.zip') OR
    (slug='tistory-auto-blog' AND version='v1.92' AND extension_version='v1.91' AND extension_download_url='https://tistory-auto-blog.buylife.xyz/downloads/tistory-auto-blog-extension-latest.zip') OR
    (slug='naver-blog-allinone' AND version='v1.53' AND extension_version='v1.52' AND extension_download_url='https://naver-blog-allinone.buylife.xyz/downloads/naver-blog-allinone-latest.zip')
  ) <> 3 THEN
    RAISE EXCEPTION '버전/주소 사전 조건 변경: 재조회 후 재검토 필요';
  END IF;
  UPDATE public.programs SET version='v1.82', extension_version='v1.82', updated_at=now()
    WHERE slug='ai-auto-blog' AND version='v1.81' AND extension_version='v1.80';
  UPDATE public.programs SET extension_version='v1.92', updated_at=now()
    WHERE slug='tistory-auto-blog' AND version='v1.92' AND extension_version='v1.91';
  UPDATE public.programs SET extension_version='v1.53', updated_at=now()
    WHERE slug='naver-blog-allinone' AND version='v1.53' AND extension_version='v1.52';
END $$;
SELECT slug,version,extension_version,extension_download_url FROM public.programs
WHERE slug IN ('ai-auto-blog','tistory-auto-blog','naver-blog-allinone') ORDER BY slug;
