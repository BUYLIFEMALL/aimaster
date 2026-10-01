# 티스토리 자동화 구현 계획 (2026-10-01 작성, 클라우드 세션)

## 1. 배경과 전제
- 티스토리 Open API는 2024-02까지 순차 종료되어 글 작성·수정·이미지 첨부 API가 없다(공식 공지 https://notice.tistory.com/2664).
- 따라서 `ai-auto-blog`(웹 + 크롬 확장 입력기, `ai-auto-blog/AGENTS.md`, `docs/PLATFORM_PATTERNS.md` §28)와 같은 구조로 만든다. 주인님 확정(2026-10-01).
- 이 문서의 기본값(별도 확인이 없어 추천안으로 진행): ① **새 서브프로젝트 `tistory-auto-blog`** ② **본문은 기본모드에서 §20대로 한 글자씩 입력(A안)**, HTML 모드 붙여넣기(B안)는 1차 완성 뒤 별도 결정 ③ 1차 범위 = 제목·본문·이미지·카테고리·태그 입력 + 발행 설정창 열기, **최종 발행은 사람**.
  주인님이 다르게 정하면 이 문서를 먼저 고친다.

## 2. ai-auto-blog 대비 재사용 범위
| 영역 | 처리 |
|---|---|
| 글 생성(수집·본문·이미지 장수·30일 삭제·API 키·권한) | 그대로 복사 |
| 서버 API 4개·토큰 인증(`extensionAuth`) | 복사 후 slug·문구만 변경 |
| 글→입력 블록 변환기(`extensionContent.ts`) | 티스토리용으로 수정(서식·링크 정책은 조사 결과 후) |
| 확장 껍데기(토큰 연결·목록·미리보기·예상 시간·버전 안내·추천태그) | 재사용 |
| 확장 편집기 조작(`sidepanel.js` 약 295~760줄 부근) | **티스토리용 새로 작성** |
| manifest | host_permissions `*.tistory.com`, 이름·아이콘 변경 |

## 3. 단계
0. **화면 조사**(`inspector-extension/`): 주인님이 로그인 후 상태별로 분석 → JSON 전달. 이 결과 없이 4단계 코드는 쓰지 않는다(§20 규칙 3).
1. 서브프로젝트 뼈대: `ai-auto-blog/` 복제 → 이름·slug(`tistory-auto-blog`)·사이드바·`utils/version.ts`(v1.01)·루트 `.vercelignore` 추가.
2. DB: 전용 테이블(`user_id` + RLS) + 입력 상태 칸 4개. **기존 `blog_posts` 공유 여부는 복제 전에 현재 격리 상태를 다시 확인**(예전 AGENTS 기록은 "공유 블로그"). 30일 삭제 크론은 프로그램별 분리. SQL은 `supabase/migrations/`에 파일로만 두고 적용은 로컬(승인 후).
3. 서버: 티스토리용 입력 블록 변환기, 확장 API 4개.
4. 확장: §20 속도(70~170ms, 가끔 250~700ms 쉼), 클릭 전 hover, 상태 변경 주입은 대상 프레임 하나(`allFrames` 금지), 이미지는 파일로 업로드, 발행 설정창은 열고 값만 채우며 **최종 발행 버튼은 찾지도 누르지도 않음**. "구조 분석" 버튼 포함.
5. 설정 화면 "API키등록·플랫폼연동" + 하단 "📖 연동 매뉴얼"(`platform_guides` 티스토리 안내 신규 등록), 확장 설치 안내·ZIP.
6. 로컬: 단독 `npm run build` → DB 적용 → `programs` 등록(`version='v1.01'`) → 배포. 실제 화면 확인은 주인님 PC, 일반 회원 흐름은 `buylifemall@naver.com`.

## 4. 알려진 미확인 사항 (조사로 확정)
- 에디터 종류(새/옛), 기본모드·마크다운·HTML 모드 전환 방법
- 제목·본문 요소(iframe 여부), 사진 버튼과 파일 입력, 이미지 업로드 후 구조
- 완료(발행) 설정창: 공개 범위·태그·카테고리 위치, 마지막 발행 버튼 식별
- 링크 입력 방식(붙여넣기 HTML 허용 여부), 블로그가 여러 개인 계정의 처리, 커스텀 도메인 블로그의 글쓰기 주소

## 5. 위험
- 편집기 구조 변경 → "구조 분석" 버튼 유지, 애매하면 오류로 중단.
- 계정 안전: 티스토리의 자동 입력 판정 기준은 비공개 → §20 보수적 적용.

## 6. 로컬에서 이어서 작업하기 (2026-10-01 주인님 지시: "관련 작업은 나중에 로컬에서 이어서")

### 지금까지 끝난 것 (cloud-work 커밋 `0cf2fb1` 및 이 문서 커밋)
- 0단계 완료: `inspector-extension/`(읽기 전용 조사 확장). 가짜 화면(headless Chromium)으로 수집 함수 동작·내용 미누출 확인. **실제 티스토리 화면에서는 아직 실행하지 않았다.**
- 계획·결정 기본값(§1)·단계(§3)·미확인 사항(§4) 문서화.
- **1단계 완료**(뼈대·복제·치환·단독 빌드 통과, `APP_VERSION v1.01`), **2단계 완료**(`0001_tistory_init.sql`: 로컬 PG16 적용·격리 테스트 통과, 운영 DB는 PG 17.6 확인). 보안·격리 차이는 `AGENTS.md`의 "ai-auto-blog와 달라진 점".
- 아직 안 한 것: 서버 변환기(3단계)·확장 입력 코드(4단계, 지금 `extension/`은 네이버용 복사본이라 티스토리에서 동작 안 함), 매뉴얼, `programs` 등록, 배포.

### 로컬 시작 순서
1. `git fetch origin && git merge --no-ff origin/cloud-work`(master에서, 다른 CLI의 미커밋 변경이 없는지 `git status`로 먼저 확인 — `docs/CLOUD_SESSION.md` 5번). 이번 변경은 `tistory-auto-blog/`(신규)와 `PROGRESS.md`·`docs/HANDOFF.md`뿐이라 충돌 가능성이 낮다.
2. 작업 전 `CLAUDE.md` → `docs/HANDOFF.md` → `docs/ERROR_LESSONS.md` → `tistory-auto-blog/AGENTS.md` → 이 문서 순서로 읽는다.
3. **조사 실행(주인님 PC)**: `inspector-extension/README.md` 순서대로 확장 로드 → 티스토리 직접 로그인 → 화면 상태별 분석 → "JSON 파일로 저장" → 결과를 대화에 첨부. 발행 버튼은 누르지 않는다.
4. 결과 JSON을 읽고 §4 미확인 사항을 하나씩 확정해 이 문서에 기록한다(확정된 셀렉터는 `tistory-auto-blog/extension/`에 쓰기 전 이 문서나 `AGENTS.md`에 "조사로 확인함"이라고 근거를 남긴다).
5. 이후 §3의 1 → 2 → 3 → 4 → 5 → 6 순서로 진행. 1단계는 조사 결과를 기다리지 않고 먼저 해도 된다.

### 로컬에서 해야 하는 일 (클라우드가 못 하는 것)
- DB 마이그레이션 적용(주인님 승인 후), `programs` 등록(slug `tistory-auto-blog`, `version = 'v1.01'`, 카테고리·요금제·이용 권한은 핵심 원칙 6번 기준), Vercel 프로젝트 생성·`vercel.json {"framework":"nextjs"}`·환경변수(루트 `.env.local`의 공용 DB 값, **AI 키는 넣지 않음**)·배포.
- 새 프로그램 체크리스트(루트 `CLAUDE.md` "멀티테넌시 원칙" 5번)와 "API키등록·플랫폼연동" 표준 확인, 루트 `.vercelignore`에 `/tistory-auto-blog` 추가.
- `platform_guides`에 티스토리 확장 설치·연동 매뉴얼 등록(`/admin/guides`).
- 실제 티스토리 화면에서 확장 입력 테스트(주인님 PC), 일반 회원 흐름 확인(`buylifemall@naver.com`).

### 잊지 말 것
- 빌드가 `ai-auto-blog`처럼 `prebuild`로 확장 manifest·ZIP을 만드는 구조를 복사한다면 프로그램 버전 = 확장 버전 = ZIP 버전 규칙(`PLATFORM_PATTERNS` §28)을 지킨다.
- 이 폴더의 작업이 끝날 때마다 `AGENTS.md` 진행 상태 표, `docs/HANDOFF.md`, 에러·점검 사항은 `docs/ERROR_LESSONS.md`에 같은 커밋으로 기록한다(핵심 원칙 7번).
- 결정 ①(새 서브프로젝트) ②(A안: 기본모드 한 글자씩) ③(1차 범위)는 **추천안으로 정한 임시 기본값**이다. 주인님이 바꾸면 §1부터 고친다. B안(HTML 모드 붙여넣기)은 §20과 충돌 소지가 있어 1차 완성 뒤 별도 결정.

### 로컬 작업 목록 (2026-10-01 최종 정리 — 이 순서대로)
**상태 기준**: `cloud-work` 최신 커밋 `97b8295` 이후. 이 시점에 master(`02641f1`)와 병합 시 충돌 없음을 `git merge-tree`로 확인함(master가 그 사이 움직였다면 다시 확인).

| 순서 | 할 일 | 비고 |
|---|---|---|
| 1 | `git fetch origin && git status` → master에서 `git merge --no-ff origin/cloud-work -m "merge: cloud-work (tistory-auto-blog)"` | 다른 CLI 미커밋 변경 확인 먼저. 병합 후 `git push origin master`, 이어서 `git push origin master:cloud-work`(클라우드 브랜치도 맞춤) |
| 2 | `cd tistory-auto-blog && npm ci && npm run build` | 빌드 시 `public/downloads/tistory-auto-blog-extension-v1.01.zip`이 생긴다 — **확장 완성 전에는 커밋하지 말고 지운다**(지금 `extension/`은 네이버용 복사본) |
| 3 | **조사 확장 실행(주인님 PC)**: `inspector-extension/README.md` → JSON을 Claude 대화에 첨부 | 3·4단계의 선행 조건 |
| 4 | DB 마이그레이션 적용(주인님 승인): `supabase/migrations/0001_tistory_init.sql`을 MCP `apply_migration`(또는 SQL Editor)으로 | 운영 DB 이미 확인: PostgreSQL 17.6, `public.set_updated_at()` 있음, `tistory_*` 테이블 아직 없음. 적용 후 `pg_policies`로 `tistory_*` 정책이 전부 `auth.uid() = user_id`인지, `anon` 정책이 없는지 확인(`PLATFORM_PATTERNS` §18: 파일 ≠ 적용) |
| 5 | `programs` 등록: slug `tistory-auto-blog`, 이름 "티스토리(원문)생성 자동화"(가칭), `version='v1.01'`, 카테고리·요금제·이용 권한(핵심 원칙 6번), 썸네일(§13 실사 원칙), `app_url`은 배포 주소 | 관리자 `/admin` 프로그램 등록 화면 또는 SQL |
| 6 | Vercel 프로젝트 생성(`cd tistory-auto-blog && npx vercel link --scope buylife`), 환경변수 `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`·`SUPABASE_SERVICE_ROLE_KEY`(값은 루트 `.env.local` 기준 — `ERROR_LESSONS` C: 옛 Supabase 주소 주의)·`NEXT_PUBLIC_MAIN_SITE_URL`·`CRON_SECRET`, 배포 후 주요 경로 `curl`로 200/307 확인 | `vercel.json`의 `framework: nextjs`·크론(03시 KST) 유지. AI 키는 넣지 않음 |
| 7 | 배포 주소가 정해지면 확장 `BASE`·`host_permissions`·`sidepanel.html` 링크의 임시 주소 `https://tistory-auto-blog.vercel.app` 교체 | 4단계 코드 작성 때 함께 |
| 8 | 3단계(서버 변환기 `utils/extensionContent.ts` 티스토리용 수정) → 4단계(확장 `extension/` 티스토리 교체: 이름·아이콘·host_permissions·편집기 조작) → 5단계(`platform_guides` 매뉴얼, 설정 화면 박스) | 조사 JSON 근거 필수(§20 규칙 3) |
| 9 | 루트 `app/api/admin/system-usage/route.ts`의 `post-images` 사용량 표에 티스토리 반영 확인 | 같은 버킷 `<회원id>/tistory-auto-blog/` 사용 |
| 10 | **별도 작업**: ai-auto-blog 운영 DB 정책·`GET /api/posts/[id]` 점검(`docs/HANDOFF.md` #5, `docs/ERROR_LESSONS.md` C 2026-10-01 cloud 항목) | 티스토리와 무관하게 진행 가능. 영향 범위(공개 글 보기, 카탈로그) 확인 후 정책 교체, BLOG 버전 +0.01·DB `programs.version` 동기화, 주인님 승인 |

작업이 끝날 때마다 `AGENTS.md` 진행 상태 표, `docs/HANDOFF.md`, `PROGRESS.md` 5번 표(로컬 병합·배포 결과 칸)를 같은 커밋으로 갱신한다.

