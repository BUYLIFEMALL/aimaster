# tistory-auto-blog — 티스토리 자동화 (BLOG 원문생성 + 크롬 확장)

> **상태: 뼈대·DB 파일 완료, 조사 결과 대기 (2026-10-01, 클라우드 세션 `cloud-work`)** — 아직 `programs` 등록·배포 전. 서브프로젝트 버전 `v1.01`(코드 `utils/version.ts`; DB `programs.version`은 등록 때).
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
| 1 | `ai-auto-blog` 복제 → 서브프로젝트 뼈대 | ✅ 완료: 복제·이름/slug/표 이름 치환(`blog_*`→`tistory_*`, `naver_input_*`→`tistory_input_*`)·UI 문구 티스토리화·`APP_VERSION v1.01`·루트 `.vercelignore`/`tsconfig.json` 제외 등록. 단독 `npm run build` 통과 |
| 2 | DB 마이그레이션 파일 | ✅ `supabase/migrations/0001_tistory_init.sql` — 로컬 PostgreSQL 16에서 적용·격리 테스트 통과(아래), 운영 DB는 PG 17.6·`set_updated_at()` 있음을 읽기 조회로 확인. **적용은 로컬에서 주인님 승인 후** |
| 3 | 서버 변환기(티스토리용 입력 블록) | ⏳ `utils/extensionContent.ts`는 아직 네이버용 그대로(링크 `글자: 주소 `, 해시태그 분리 등). 조사 결과 후 수정 |
| 4 | 확장 편집기 조작 코드 | ⏳ `extension/`은 **BLOG(네이버) 확장을 그대로 복사한 상태 — 티스토리에서 동작하지 않는다. 4단계 전까지 ZIP 커밋·배포·회원 안내 금지**(manifest 이름·아이콘·host_permissions·`BASE`도 아직 BLOG 것/임시) |
| 5 | 설정 화면 연동 매뉴얼 | ⏳ `platform_guides` 티스토리 매뉴얼 신규 등록 필요 |
| 6 | 로컬: DB 적용·`programs` 등록(`v1.01`)·Vercel 프로젝트·배포 | ⏳ |

### 로컬 병합 후 기반 검증 (2026-10-01)

- `cloud-work`의 0~2단계 작업을 로컬 `master`에 병합했습니다(`df2f3cd`). 외부 Google Fonts 요청이 막힌 환경에서도 빌드되도록 `next/font/google` 의존을 제거하고 시스템 글꼴을 사용하게 했습니다.
- `npm run build`는 통과했습니다. 다만 복제 원본에서 넘어온 ESLint 오류 53개(React effect의 동기 상태 변경·`any` 등)가 있어 `npm run lint`는 아직 통과하지 않습니다. 편집기 조사 JSON을 받은 뒤 티스토리 전용 구현과 함께 별도 정리합니다.
- 확장 `extension/`은 여전히 네이버 복사본이므로 빌드가 만든 ZIP은 검증용 산출물이며 커밋·배포하지 않습니다.

## ai-auto-blog와 달라진 점 (보안·격리 — 복제하면서 고침)
운영 DB의 `blog_*` 정책을 읽기 조회로 확인해 보니 BLOG는 "하나의 공유 블로그" 설계가 남아 있다(`docs/ERROR_LESSONS.md` 2026-10-01 항목 참고). 티스토리판은 처음부터 회원별 격리로 만들었다.
- `tistory_categories`·`authors`·`posts`·`post_categories`·`candidates` **전부 `user_id NOT NULL` + RLS 본인만**(anon 접근 없음). 댓글·좋아요 테이블은 만들지 않았다.
- 서로 다른 회원의 행을 엮지 못하게 `(id, user_id)` **복합 외래키**로 DB가 막는다(다른 회원 저자로 글 만들기, 다른 회원 카테고리를 글·후보에 연결 → 모두 거부, 로컬에서 확인). 카테고리 삭제 시 후보는 남고 `category_id`만 비운다(PG15+ `ON DELETE SET NULL (col)`).
- 서비스 롤(API)은 RLS를 우회하므로 코드에서 `user_id`를 직접 건다: `app/api/auto-post`(카테고리 조회 `.eq('user_id')`, 매핑 insert에 `user_id`), `app/api/posts/[id]`(**GET에 로그인·이용 권한·소유자 확인 추가** — BLOG는 GET이 인증 없이 id만으로 글을 돌려준다, PUT/DELETE는 레거시 `user_id` 없는 글 허용 제거 + 쓰기에도 `.eq('user_id')`).
- 브라우저 클라이언트(`HomePage`·`CategoryManagementModal`·`candidates`·`posts/[id]` 등)는 RLS가 자동으로 본인 행만 보여주고, insert의 `user_id`는 `default auth.uid()`로 채워진다(코드 변경 없음).
- **복제 후에도 BLOG 쪽에서 가져온 코드를 고칠 때는 이 차이를 깨지 않게 주의**(예: `blog`에서 쓰던 "카테고리 공용" 가정, 레거시 user_id null 허용).

## 로컬에서 꼭 알아야 할 것
- 루트 `app/api/admin/system-usage/route.ts`의 `post-images` 사용량 표는 프로그램 slug를 `ai-auto-blog` 하나로 센다 — 티스토리도 같은 버킷 `<회원id>/tistory-auto-blog/`를 쓰므로 등록 때 같이 확인.
- 확장 `BASE`·manifest `host_permissions`·설치 안내 링크의 `https://tistory-auto-blog.vercel.app`은 **임시 주소**다. Vercel 배포 후 실제 별칭(이름이 겹치면 `-one` 등이 붙음)으로 바꾼다.
- BLOG 쪽 수정 내역(복사 시점 v1.32까지)은 `../ai-auto-blog/AGENTS.md`에 있다. 글 생성 로직을 BLOG에서 고치면 이 폴더에도 같이 반영할지 판단한다.

## 주의
- 셀렉터는 `inspector-extension` 결과로 **확인된 것만** 쓴다. 후보가 여러 개면 조용히 고르지 말고 오류로 멈춘다.
- 클라우드에서는 DB 적용·버전 DB 갱신·`vercel deploy`·`programs` 등록을 하지 않는다(`../docs/CLOUD_SESSION.md`).

## 로컬에서 이어서 작업할 때
이어가기 절차(병합 → 조사 실행 → 단계별 진행)와 로컬에서만 할 수 있는 일(DB 적용·`programs` 등록·배포)은
[`docs/TISTORY_PLAN.md`](docs/TISTORY_PLAN.md) **§6**에 정리돼 있다. 가장 먼저 할 일은 주인님 PC에서 `inspector-extension/` 실행 후 JSON 결과 확보.

