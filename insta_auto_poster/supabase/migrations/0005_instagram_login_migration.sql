-- 인스타그램 계정 연결 방식 전면 교체: Facebook 로그인 + 운영자 공용 앱(META_APP_ID/
-- META_APP_SECRET) + Facebook 페이지 필수 방식(구버전)에서, "Instagram API with Instagram
-- Login" 방식으로 전환한다 — 회원이 각자 본인 소유 Meta 앱(meta_app_id/meta_app_secret,
-- user_api_keys 공용 provider 재사용)을 만들어 등록하고, Facebook 페이지 연결 없이 바로
-- 인스타그램 계정을 연결한다(instagram-comment-reply/instagram-dm-reply와 동일 패턴).
--
-- 배경: 구버전은 AIMaster 루트 CLAUDE.md의 "본인 API 키만 사용, 관리자 공용 키 폴백 금지"
-- 원칙에 어긋나는 구조였다(운영자 소유 단일 공용 Meta 앱을 모든 회원이 같이 쓰는 구조).
-- 그 앱이 Meta App Review(Live 전환)를 받은 적이 없어, 실제로는 운영자 본인 계정 외에는
-- 작동하지 않았을 가능성이 높다(개발 모드 앱은 그 앱의 관리자/테스터 계정만 로그인 가능).
--
-- 주의: 이 마이그레이션은 이미 Supabase MCP를 통해 라이브 프로젝트에 직접 적용했습니다.
-- 실제 적용된 스키마를 이 서브프로젝트 폴더 안에도 문서/이력으로 남겨두기 위한 것입니다.

-- page_id는 Facebook 페이지 ID였는데, 새 방식은 페이지 자체가 없어 더 이상 채우지 않는다.
-- 컬럼은 남겨두되(과거 연결 데이터 보존, 불필요한 파괴적 변경 회피) NOT NULL만 해제한다.
alter table public.insta_accounts alter column page_id drop not null;

-- meta_app_id/meta_app_secret provider는 이미 다른 서브프로젝트(threads-comment-reply,
-- instagram-comment-reply, instagram-dm-reply)에서 user_api_keys.provider 체크 제약에
-- 추가되어 있어, 이 프로젝트는 별도 ALTER 없이 그대로 재사용한다.
