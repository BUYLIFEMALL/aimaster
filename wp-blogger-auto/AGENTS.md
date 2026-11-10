# AI 워드프레스·구글블로그 자동화 (`wp-blogger-auto`) — 인수인계

> 담당: [역할: blog] Claude Code(윈도우) · 세션 `claude-win-blog` · 플랜 [`../docs/PLAN_20261110_WORDPRESS_BLOGGER_API.md`](../docs/PLAN_20261110_WORDPRESS_BLOGGER_API.md)(결정 완료 2026-11-10)
> 상태: **v1.02 배포·비공개(2026-11-11)** — 커밋98d1390d2 요청4항목 맥미니 관리자 실물 재검수 통과·WP 정상 재연결 복구. 상세는 시험 요청서 맨 아래 최종 완료표. 공개 전환은 관리자·윈도우 담당 판단.

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

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


## 2026-11-11 Codex 맥미니 실물 시험 인수인계
- 운영 v1.01 관리자 계정, ego 공간20. 두 플랫폼 초안/예약취소/즉시발행 통과, 최종 원고7=초안4·공개3·예약0·확인필요0. WP 대표미디어 및 두 공개글의 재사용 이미지 정상. Blogger 브라우저 오프라인 후 복구 시 서버 발행결과 복원·외부 같은 글1건 확인.
- 전체 검수 완료 아님: 사용자 해제→재연결 대기(현재 두 연결 유지), uncertain 정리 버튼은 상태가 발생하지 않아 미검수, 생성자산 keep_images 30일 실측·오류입력·정확30분 예약입력도 미검수. 공개 전환은 윈도우 담당/사용자 결정.
- 상세·공개글·원고ID·캡처·비용은 `docs/REQUEST_20261111_MACMINI_REAL_TEST.md` 종합 결과. 개선은 `docs/IMPROVEMENTS.md`. 소스/직접DB/빌드/배포/커밋/푸시 변경 없음. 유료9회(원고7·장면1·이미지1), 예상 약0.1달러+30원·실청구 미확인. 사용자 재연결 완료 뒤 같은 공간20에서 확인이 다음 첫 단계.


## 2026-11-11 사용자 후속 확정 — 발행 이미지 1년·윈도우 개선/공개 판단
- 연결해제재연결/확인필요두버튼은 사용자「잘되」로통과. API오류3종은맥미니400/400/401확인·전후연결동일(폼표시실물별도).
- **최신정책: Blogger실제발행이미지만실제발행일로부터1년**. 기존상한없음·예약포함keep_images/정리함수는구현변경대기. TOP_RULE §8변경, 코드·운영DB·배포아직미반영. 관리자/시험열외는기존대로.
- 윈도우6번사용성개선/7번공개전환판단전달문은시험요청서아래와IMPROVEMENTS맨위. 정책수정/격리DB경계시험·수정후검수뒤공개전환결정. 이번맥미니에서공개전환/빌드/배포/직접DB쓰기는안함.


## 2026-11-11 v1.02 맥미니 재검수(커밋98d1390d2)
- 운영화면v1.02·관리자계정. 양쪽기존초안→공개전환·동일ID/글1건, 초안예약→취소→재예약·최종취소 통과. 정확30분입력/확인창/외부시간대조양쪽통과, WP상한초과한국어안내차단.
- 실제WP폼http/없는주소/가짜틀린비밀번호3오류표시, 카테고리조회실패/다시불러오기회복, 저장/reload뒤Test/schedule/05:07/본문이미지0유지 통과. 신규Haiku원고1건·예상5원·이미지0(승인3건중1), 소스/직접DB/빌드/배포/커밋/푸시0.
- **WP정상연결복구대기**: 폼오류시험으로WP를해제했으며정상응용비밀번호는사용자직접입력필요. 공간20p1사이트/아이디채움·가짜값비움·사용자인계. Blogger연결유지, 예약0. 복구확인전완료표시안함.
- P2안내후보: Blogger재연결후블로그미선택이면기존초안패널이안내없이버튼만비활성화. 상세표/캡처/추가검수범위는 `docs/REQUEST_20261111_MACMINI_REAL_TEST.md` 맨아래v1.02표.


## 2026-11-11 v1.02 맥미니 재검수 최종 완료
- 사용자요청4항목실물통과: 양쪽기존글ID유지초안→공개·중복없음, 예약취소재예약, 정확30분/상한초과차단, 실제폼오류3종/카테고리재조회/저장선택값유지. WP재연결복구·실제카테고리조회통과·Blogger정상. 예약0/확인필요0.
- 신규Haiku원고1건(승인3건중1)·예상5원·이미지0. 공간20종료·ACTIVE내줄정리. 소스/직접DB/빌드/배포/커밋/푸시없음. 상세/캡처는 `docs/REQUEST_20261111_MACMINI_REAL_TEST.md` 최종완료표. 다음은윈도우담당의관리자공개전환/소개·썸네일결정요청.


## 2026-11-11 맥미니 잔여 정리·윈도우 인수
- 사용자 지시로 비교표/블로그 공식API표/카테고리지도/플랜 현 상태 정리 완료. PublishPanel의 기존초안 Blogger대상미선택안내+/connect링크 보완(코드완료·미배포). 타입검사/diff check통과, 빌드/실브라우저는배포뒤검수.
- 윈도우 인수 요청 `de21e15b-4f82-460a-968c-e2c1232c3932` 등록. 자세한 실행표/변경파일은 IMPROVEMENTS맨위. 기존OAuth안내와v1.03묶음배포·소개/썸네일/공개결정은윈도우. 공개뒤시험·일반회원접근은맥미니후속.
- 공유폴더미커밋, 커밋/푸시/빌드/배포/유료호출없음. 공통문서의다른세션변경을포함하지말것. 다른역할의ACTIVE줄은그담당이정리.
