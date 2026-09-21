# 네이버 블로그 SEO 스튜디오

`naver-blog-auto-poster_app`과 `naver-blog-auto-poster_web`을 수정하지 않고 새로 시작하는 독립 서브프로젝트입니다.

## 제품 방향

AI가 네이버 블로그 글의 기획·초안·SEO 점검을 돕고, 사용자가 사실을 검수한 뒤 네이버에서 직접 발행하는 콘텐츠 제작 스튜디오입니다. 자동 로그인, 자동 발행, 대량 댓글·공감·이웃추가 기능은 기본 범위에 포함하지 않습니다.

## 1차 구현 상태

- 새 글 기획 화면(주제·키워드·전략 선택) 골격 구현
- C-Rank 기본, ALCON, AEO, 홈판 스토리, 인사이트 엣지 전략 선택 UI
- 사실 확인·사람의 최종 발행 원칙을 화면에 명시
- 공용 Supabase 권한 게이트와 `/api/drafts/generate` 초안 생성 API 골격 구현
- 실제 AI 호출은 사용자가 등록한 OpenAI 키가 있을 때만 실행되며, 현재 테스트에서는 외부 AI 호출을 실행하지 않음

## 공용 Supabase 반영 상태

- 프로그램 slug: `naver-blog-seo-studio` (개발 중 상태로 등록)
- 기본 요금제: 1·2·3개월 표준 요금제 등록
- 사용자 초안 테이블: `naver_blog_seo_drafts`
- RLS: `user_id = auth.uid()` 소유자 정책 적용
- 마이그레이션 원본: `supabase/migrations/20260921093000_register_naver_blog_seo_studio.sql`
- 대시보드: `/dashboard`에서 프로그램 권한을 확인한 뒤 접근
- 로그인: `/login`에서 AIMaster 공용 계정 사용
- API 키 설정: `/settings`에서 기존 공용 `user_api_keys`의 `openai`·`gemini` provider를 사용

## 실행

```bash
npm install
npm run dev
```

## 운영 원칙

- AIMaster 공용 Supabase와 프로그램 권한 체계를 사용합니다.
- 사용자 본인의 API 키만 사용하고 운영자 키로 대체하지 않습니다.
- 새 DB 테이블이나 프로그램 등록이 필요할 때 SQL 마이그레이션을 이 폴더의 `supabase/migrations/`에 남기고 실제 DB 적용 여부를 검증합니다.
