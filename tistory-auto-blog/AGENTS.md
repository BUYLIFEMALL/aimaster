# tistory-auto-blog — 티스토리 자동화 (BLOG 원문생성 + 크롬 확장)

## v1.14 (2026-10-02)

- 확인한 `#post-title-inp`, iframe `body#tinymce`, `#category-btn`, `#tagText`로 제목·본문·카테고리·태그를 사람 속도로 입력합니다.
- 확장 화면은 BLOG(원문) 네이버 입력기와 같은 카드형 레이아웃(계정 연결 → 보낸 글·진행 상황 → 카테고리 설정 → 화면 구조 분석)으로 구성합니다. 화면 구조 분석·수집 결과는 맨 아래에 유지합니다.
- 카테고리 설정 카드의 태그 입력칸은 보낸 글 태그를 자동으로 채우고, 회원이 쉼표·줄바꿈 구분으로 직접 수정한 값을 최대 30개까지 티스토리 태그 칩으로 입력합니다.
- 티스토리 사진 메뉴는 파일 입력을 DOM에 남기지 않는 운영체제 선택창 방식이므로, 본인 Supabase Storage 이미지 URL을 PNG로 정규화해 본문 iframe의 파일 포함 `paste` 이벤트로 직접 전달합니다. 시스템 클립보드를 전혀 쓰지 않아 문서 포커스와 무관하며, 각 이미지가 `body#tinymce > figure > img`가 됐는지 최대 90초 동안 확인합니다.
- 최종 `#publish-btn`은 탐색하거나 누르지 않습니다. 입력기는 `#publish-layer-btn`으로 발행 설정창까지만 엽니다.

> **상태: 확장 계정 연동 완료, 제목·본문·카테고리·태그·이미지 입력 구현 완료 (2026-10-02)** — 운영 주소는 `https://tistory-auto-blog-pearl.vercel.app`, 프로그램·DB·확장 ZIP 버전은 모두 `v1.14`다. 최종 저장·발행은 자동화하지 않는다.
> **카탈로그:** 공용 `programs`의 블로그 카테고리에서 활성 상태이며 `COMING` 배지는 제거했습니다. 실사형 카탈로그 썸네일은 `program-images/catalog/tistory-auto-blog-thumbnail.png`에 저장돼 있습니다.
> 반드시 루트 `../CLAUDE.md`(핵심 원칙 7가지)·`../docs/HANDOFF.md`·`../docs/ERROR_LESSONS.md`를 먼저 읽고, 브라우저 자동화이므로
> `../docs/PLATFORM_PATTERNS.md` **§20(봇 탐지 회피)·§28(웹→확장→편집기)** 를 그대로 지킨다.

## 개요
- 티스토리 Open API는 2024-02 종료(글쓰기 API 없음) → `ai-auto-blog`(https://ai-auto-blog-one.vercel.app)와 같은 방식:
  **웹에서 글 생성 → 크롬 확장이 티스토리 글쓰기 화면에 사람처럼 입력 → 마지막 발행은 사람.**
- 상세 계획·결정사항·단계: [`docs/TISTORY_PLAN.md`](docs/TISTORY_PLAN.md)

## 진행 상태 (2026-10-01 클라우드 세션 갱신)
| 단계 | 내용 | 상태 |
|---|---|---|
| 0 | 티스토리 화면 조사 도구 `inspector-extension/` | ✅ 코드 완성. **주인님 PC에서 실행 → JSON 결과 전달 대기** |
| 1 | `ai-auto-blog` 복제 → 서브프로젝트 뼈대 | ✅ 완료: 복제·이름/slug/표 이름 치환(`blog_*`→`tistory_*`, `naver_input_*`→`tistory_input_*`)·UI 문구 티스토리화·`APP_VERSION v1.01`·루트 `.vercelignore`/`tsconfig.json` 제외 등록. 로컬 UI 시안 `/preview`는 Supabase·로그인 없이도 원문 생성→티스토리 입력 흐름을 확인할 수 있다. |
| 2 | DB 마이그레이션 파일 | ✅ `supabase/migrations/0001_tistory_init.sql` — 운영 공용 DB에 적용 완료. `tistory_*` 5개 테이블은 전부 `authenticated` + `auth.uid() = user_id` owner-only RLS 정책을 확인했다. |
| 3 | 서버 변환기(티스토리용 입력 블록) | ⏳ `utils/extensionContent.ts`는 아직 네이버용 그대로(링크 `글자: 주소 `, 해시태그 분리 등). 조사 결과 후 수정 |
| 4 | 확장 편집기 조작 코드 | 🟡 **계정 연동 완료(v1.02)**: 설정에서 발급한 토큰을 확장에 붙여넣으면 `/api/extension/whoami`가 토큰·이용 권한을 검증하고, 성공한 토큰만 확장 저장소에 보관한다. 편집기 조작은 여전히 읽기·구조 조사 모드이며, 실제 글 입력·수정·이미지 업로드·발행은 조사 JSON을 받은 뒤 작성한다. |
| 5 | 설정 화면 연동 매뉴얼 | ⏳ `platform_guides` 티스토리 매뉴얼 신규 등록 필요 |
| 6 | DB 적용·`programs` 등록·Vercel 배포 | ✅ 완료: `programs.version = v1.02`, 블로그 카테고리·기본 3단계 요금제 등록, Production `https://tistory-auto-blog-pearl.vercel.app` 배포 및 `/preview` 200·`/` 307 확인. |

### 로컬 병합 후 기반 검증 (2026-10-01)

- `cloud-work`의 0~2단계 작업을 로컬 `master`에 병합했습니다(`df2f3cd`). 외부 Google Fonts 요청이 막힌 환경에서도 빌드되도록 `next/font/google` 의존을 제거하고 시스템 글꼴을 사용하게 했습니다.
- `extension/`은 이제 티스토리 도메인만 권한으로 요청하는 **티스토리(원문) 입력기 개발 조사 모드**입니다. 티스토리 글쓰기 화면의 구조를 JSON으로 읽기만 하며, 조사 결과를 받기 전까지는 글 입력·수정·업로드·발행을 하지 않습니다.
- 로컬 화면 확인용 정적 시안은 `/preview`입니다. BLOG(원문)생성 자동화와 같은 사이드바·글쓰기·이미지 준비 흐름에 티스토리 입력 단계를 표시하며, DB·인증·AI 호출 없이 동작합니다. 운영 배포나 회원 기능이 아닙니다.
- `npm run build`는 통과했습니다. 다만 복제 원본에서 넘어온 ESLint 오류 53개(React effect의 동기 상태 변경·`any` 등)가 있어 `npm run lint`는 아직 통과하지 않습니다. 편집기 조사 JSON을 받은 뒤 티스토리 전용 구현과 함께 별도 정리합니다.
- 확장 `extension/`은 티스토리 도메인 전용 구조 조사 모드다. `version_name v1.02`과 ZIP 이름은 코드 버전과 자동 동기화된다. 계정 연결은 가능하지만 실제 입력 기능 완성 전에는 입력 자동화로 안내하지 않는다.

## ai-auto-blog와 달라진 점 (보안·격리 — 복제하면서 고침)
운영 DB의 `blog_*` 정책을 읽기 조회로 확인해 보니 BLOG는 "하나의 공유 블로그" 설계가 남아 있다(`docs/ERROR_LESSONS.md` 2026-10-01 항목 참고). 티스토리판은 처음부터 회원별 격리로 만들었다.
- `tistory_categories`·`authors`·`posts`·`post_categories`·`candidates` **전부 `user_id NOT NULL` + RLS 본인만**(anon 접근 없음). 댓글·좋아요 테이블은 만들지 않았다.
- 서로 다른 회원의 행을 엮지 못하게 `(id, user_id)` **복합 외래키**로 DB가 막는다(다른 회원 저자로 글 만들기, 다른 회원 카테고리를 글·후보에 연결 → 모두 거부, 로컬에서 확인). 카테고리 삭제 시 후보는 남고 `category_id`만 비운다(PG15+ `ON DELETE SET NULL (col)`).
- 서비스 롤(API)은 RLS를 우회하므로 코드에서 `user_id`를 직접 건다: `app/api/auto-post`(카테고리 조회 `.eq('user_id')`, 매핑 insert에 `user_id`), `app/api/posts/[id]`(**GET에 로그인·이용 권한·소유자 확인 추가** — BLOG는 GET이 인증 없이 id만으로 글을 돌려준다, PUT/DELETE는 레거시 `user_id` 없는 글 허용 제거 + 쓰기에도 `.eq('user_id')`).
- 브라우저 클라이언트(`HomePage`·`CategoryManagementModal`·`candidates`·`posts/[id]` 등)는 RLS가 자동으로 본인 행만 보여주고, insert의 `user_id`는 `default auth.uid()`로 채워진다(코드 변경 없음).
- **복제 후에도 BLOG 쪽에서 가져온 코드를 고칠 때는 이 차이를 깨지 않게 주의**(예: `blog`에서 쓰던 "카테고리 공용" 가정, 레거시 user_id null 허용).

## 로컬에서 꼭 알아야 할 것
- 루트 `app/api/admin/system-usage/route.ts`의 `post-images` 사용량 표는 프로그램 slug를 `ai-auto-blog` 하나로 센다 — 티스토리도 같은 버킷 `<회원id>/tistory-auto-blog/`를 쓰므로 등록 때 같이 확인.
- 운영 Vercel 별칭은 `https://tistory-auto-blog-pearl.vercel.app`이다. 확장에 웹 API 주소를 붙이는 실제 입력 단계에서 이 주소를 사용한다.
- BLOG 쪽 수정 내역(복사 시점 v1.32까지)은 `../ai-auto-blog/AGENTS.md`에 있다. 글 생성 로직을 BLOG에서 고치면 이 폴더에도 같이 반영할지 판단한다.

## 주의
- 셀렉터는 `inspector-extension` 결과로 **확인된 것만** 쓴다. 후보가 여러 개면 조용히 고르지 말고 오류로 멈춘다.
- 클라우드에서는 DB 적용·버전 DB 갱신·`vercel deploy`·`programs` 등록을 하지 않는다(`../docs/CLOUD_SESSION.md`).

## 로컬에서 이어서 작업할 때
이어가기 절차(병합 → 조사 실행 → 단계별 진행)와 로컬에서만 할 수 있는 일(DB 적용·`programs` 등록·배포)은
[`docs/TISTORY_PLAN.md`](docs/TISTORY_PLAN.md) **§6**에 정리돼 있다. 가장 먼저 할 일은 주인님 PC에서 `inspector-extension/` 실행 후 JSON 결과 확보.

