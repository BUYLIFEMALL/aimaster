# AI 워드프레스·구글블로그 자동화 (`wp-blogger-auto`) — 인수인계

> 담당: [역할: blog] Claude Code(윈도우) · 세션 `claude-win-blog` · 플랜 [`../docs/PLAN_20261110_WORDPRESS_BLOGGER_API.md`](../docs/PLAN_20261110_WORDPRESS_BLOGGER_API.md)(결정 완료 2026-11-10)
> 상태: **개발 중(미배포, v1.01)** — 공용 발행 엔진·시험 완료, DB·화면 진행 전

## 1. 사용 목적·대상
글감부터 원고·이미지까지 웹에서 완성하고, 회원 본인의 **워드프레스(설치형)**·**구글 블로그(블로그스팟)**에 공식 API로 「발행 전까지(초안) / 바로 발행 / 예약」 중 회원이 고른 방식으로 올린다. 구글 검색 노출용 블로그를 운영하는 개인·소상공인·마케터 대상.

## 2. 기술·도구
Next.js 16(App Router) + Supabase 공용 DB + Tailwind 4. 뼈대는 `naver-cafe-recruit`의 공통 부분(로그인·접근 권한 `lib/access.ts`·좌측 메뉴·쿠키 도메인·버전)을 복사. 발행은 확장 없이 서버가 공식 API 호출(블로그 핵심 지침 예외, 루트 `CLAUDE.md` 2026-11-10).

## 3. 핵심 구조
- `src/lib/publish/` — **공용 발행 엔진**(다른 블로그 프로그램이 사본으로 가져다 쓸 수 있게 프로그램 의존 없음)
  - `types.ts` 형식·오류 분류(`PublishError.code`: auth / auth_header_stripped / forbidden / not_found / bad_request / rate_limited / server / network / **uncertain**), 예약 시각 검사(5분 뒤~1년)
  - `http.ts` 시간 제한·오류 분류. **재시도 없음.** 글 만들기 요청이 끊기거나 5xx면 `uncertain`(보냈을 수 있음 → 회원이 플랫폼에서 확인, 자동 재발행 금지), 연결 거부·주소 오류는 `network`(전송 전)
  - `wordpress.ts` 주소 정리(https만), REST 주소 방식 찾기(`/wp-json` → 안 되면 `?rest_route=`), 연결 확인(`users/me`+`publish_posts`), 카테고리, 태그 이름→ID(없으면 만들기), 미디어 업로드, 글 만들기(draft/publish/future+`date_gmt`), 예약 취소. 401 `rest_not_logged_in` = 호스팅이 인증 머리글을 지움 → 전용 안내
  - `blogger.ts` 내 블로그 목록, 글 만들기(초안 `isDraft=true` / 발행 / 예약 = 초안 저장 → `posts/{id}/publish?publishDate=`), 예약 걸기 실패 시 이미 저장된 초안을 `partial`로 알림, https 아닌 이미지는 보내기 전에 거절, 라벨 정리(쉼표 제거·200자), 초안 되돌리기(`revert`)
- 시험 `tests/publish.test.mjs` 17개(WP01~10, BL01~07) — 가짜 응답만, 실제 호출 없음

## 4. 버전
- v1.01(2026-11-10, 미배포): 뼈대 + 공용 발행 엔진 + 시험 17개 통과, tsc 0
- 같은 날: DB 초안 `supabase/migrations/20261110120000_wba_init.sql`(카탈로그 wordpress·blogger, `wba_posts` 회원 읽기·지우기만, 공개 버킷 `wba-images`, `wba_cleanup()` 관리자·시험 계정 제외·구글 발행 글은 본문만 비움) — 격리 Postgres 시험 `npm run test:database` 5개 통과. **운영 미적용(주인님 승인 대기)**

## 5. 남은 일(순서)
1. DB 초안(회원별 RLS): 연결 정보(공용 연동 `member_platform_accounts` 새 항목 `wordpress`·`blogger`, 응용 비밀번호·토큰은 암호화 저장), 원고·발행 기록 표, 30일 정리(`profiles.retention_exempt` 회원 제외, 구글 블로그 **발행된 글 이미지는 발행 기록이 있는 동안 보관** — TOP_RULE §8 지정) → 격리 DB 시험 → 주인님 승인 뒤 운영
2. 구글 연결: 회원 본인 구글 OAuth 앱(유튜브용 등록이 있으면 같은 앱 + `blogger` 범위), 갱신 토큰은 같은 앱으로만
3. 화면: 오늘의 글 / 원고 만들기(회원 본인 Claude 키, 구글 검색용 제목·메타 설명·슬러그·소제목·태그) / 발행 설정(3방식) / 보관함·결과 / 연결 설정 / 매뉴얼(카페24 등 공유 호스팅 `.htaccess` 안내 포함)
4. 실물 시험: 주인님 카페24 워드프레스(응용 비밀번호는 주인님 직접 입력), 구글 시험 블로그(미정)
5. 배포(빌드 승인 받음 2~3회)·`programs` 등록·소개·썸네일·비교표·블로그 기능 비교표

## 6. 연계 아이디어
- 발행 엔진을 공용 기준 코드로 등록해 `naver-blog-agent`·`tistory-auto-blog`에서 「다른 블로그로도 발행」에 재사용
- 이미지 생성은 `ai-image-studio` 연동 방식(모델·호출만, 프롬프트는 이 프로그램 고유)

## 7. UI/UX 메모
- 처음 설정 목표: 워드프레스 3단계 · 구글 블로그 4단계, 매일 조작 0~1번, 동의 1번(구글)
