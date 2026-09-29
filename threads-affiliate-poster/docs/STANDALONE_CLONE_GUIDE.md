# Threads 쇼핑제휴 자동화 — 별도 서버로 통째 복제하는 절차

> 작성: 2026-09-29 (복제 기준 버전 **v1.01**, 커밋 `ec89767` 이후)
> 대상: 이 프로그램을 **다른 사람(또는 다른) GitHub·Vercel·Supabase 계정**으로 옮겨 AIMaster와 무관하게
> 독립 운영하려는 경우. AIMaster 회원에게 사용 권한만 주는 경우는 이 문서가 아니라 관리자 화면에서
> 이용 권한을 부여하면 된다.

---

## 0. 먼저 알아둘 것

| 항목 | 내용 |
|---|---|
| 원본은 그대로 | 복제본은 **별개의 프로그램**이 된다. 원본(AIMaster 안의 `threads-affiliate-poster/`)은 계속 이 저장소에서 개발·운영된다. |
| 업데이트는 자동으로 따라가지 않음 | 복제 이후 원본에서 고친 내용은 복제본에 자동 반영되지 않는다. 필요하면 버전(`src/lib/version.ts`)과 커밋을 기준으로 바뀐 파일을 골라 수동으로 옮긴다(§6). |
| AIMaster 기능은 빠짐 | 회원가입 화면, 결제(페이앱), 구독 기간 관리, 관리자 화면, 연동 매뉴얼 게시판, 카탈로그는 **AIMaster에 있는 기능**이라 복제본에 따라가지 않는다. |
| 데이터는 복사하지 않음 | 회원 정보, API 키, 연결된 Threads 토큰, 게시글은 개인 데이터라 **빈 DB로 새로 시작**한다. |
| 연료는 여전히 각자 것 | 복제본을 쓰는 사람도 OpenAI/Gemini/Claude 키, 쿠팡·알리·토스 키, **본인 Meta(Threads) 앱**을 설정 화면에서 직접 등록해서 쓴다. |
| 운영자 인프라 3가지 | 네이버 데이터랩(`NAVER_TREND_*`), 토스 고정 IP 프록시(`FIXIE_URL`), 예약 게시 크론(`CRON_SECRET`)은 복제본 운영자가 **자기 계정으로 새로 만들어야** 한다. 원본의 값은 넘겨주지 않는다. |
| Meta 앱 심사 | 원본 운영자 앱의 심사 진행 상황은 옮겨지지 않는다. 타인 공개 글 검색이 필요하면 복제본 쪽 앱이 처음부터 심사를 받아야 한다(`docs/META_APP_REVIEW.md` 참고). |

---

## 1. 준비물 (복제받는 쪽 계정)

1. **GitHub 계정**: 코드를 올릴 새 저장소 1개
2. **Supabase 계정**: 새 프로젝트 1개 (무료 플랜으로 시작 가능)
3. **Vercel 계정**: 새 프로젝트 1개 (예약 게시를 쓰려면 함수 실행 시간이 긴 Pro 플랜 권장)
4. **도메인**(선택): 없으면 `<프로젝트명>.vercel.app` 주소를 쓴다
5. **Meta 개발자 계정**: Threads 계정을 연결하려면 사용하는 사람마다 본인 Meta 앱이 필요하다
6. 선택 기능용: 네이버 클라우드(데이터랩 트렌드), Fixie(토스 쉐어링크 고정 IP), cron-job.org(예약 게시)

---

## 2. 코드 복사

원본 저장소에서 `threads-affiliate-poster/` 폴더만 복사한다. **아래는 빼고 복사**:

- `node_modules/`, `.next/`, `.vercel/`(원본 Vercel 프로젝트 연결 정보), `.env.local`(원본 비밀값)

```bash
# 예: 새 폴더로 복사한 뒤 새 저장소로 올리기
robocopy threads-affiliate-poster D:\clone\threads-affiliate-poster /E /XD node_modules .next .vercel /XF .env.local
cd D:\clone\threads-affiliate-poster
git init && git add . && git commit -m "init: clone of threads-affiliate-poster v1.01"
git remote add origin https://github.com/<새계정>/<새저장소>.git
git push -u origin main
npm install
```

---

## 3. 새 Supabase 준비 (SQL 3단계)

새 프로젝트의 **SQL Editor**에서 아래 순서대로 실행한다. 순서가 바뀌면 실패한다.

| 순서 | 파일 | 하는 일 |
|---|---|---|
| 1 | `docs/standalone-clone/00_core_tables.sql` | AIMaster가 대신 만들어주던 공용 테이블의 **최소 버전**(회원 프로필+가입 트리거, 등급, 프로그램 행, 구독/개별 부여, API 키, 사용 기록, 상세페이지 참조용) |
| 2 | `supabase/migrations/0001` → `0002_aliexpress_tracking_id` → `0002_tap_trends_bookmarks_personas` → `0003` → `0004` → `0005` → `0006` → `0007` | 이 프로그램 전용 테이블(`tap_*`, `affiliate_products`, 네이버 캐시)과 이미지 저장소 버킷 `post-images` |
| 3 | `docs/standalone-clone/99_finalize.sql` | API 키 종류 제한을 이 프로그램이 실제로 쓰는 13종으로 정리 |

실행 후 확인:
- Storage에 `post-images` 버킷이 **Public**으로 생겼는지
- Authentication → Providers → Email이 켜져 있는지
- `programs` 테이블에 `threads-affiliate-poster` 행이 있는지. `required_grade_id`가 비어 있으면 **로그인한 모든 회원이 사용 가능**하다. 특정 사람만 쓰게 하려면 등급을 지정하거나 `subscriptions`/`user_program_access`에 행을 넣는다.

> 주의: `user_program_access`에 "모든 사용자 허용(using true)" 정책을 만들지 말 것. 누구나 스스로 이용 권한을 줄 수 있게 된다.

---

## 4. 코드에서 바꿀 곳

원본은 AIMaster(`buylife.xyz`)와 다른 쓰레드 프로그램 2개를 전제로 만들어져 있어 아래를 고쳐야 한다.

| 파일 | 바꿀 내용 | 이유 |
|---|---|---|
| `src/app/(auth)/signup/page.tsx` | "AIMaster에서 회원가입" 안내 → 자체 가입 폼(`supabase.auth.signUp`)으로 교체하거나, 관리자가 Supabase 대시보드(Authentication → Add user)로 계정을 만들어 주는 안내로 변경 | AIMaster 가입 화면이 없음 |
| `src/lib/access.ts` | `MAIN_SITE_URL` 폴백(`https://buylife.xyz`)과 권한 없을 때 이동 주소(`/programs/<slug>`) → 복제본 안내 페이지로 변경 | 권한 없으면 AIMaster 상품 페이지로 보냄 |
| `src/lib/threads/signedRequest.ts` | `THREADS_ACCOUNT_TABLES`를 `["tap_accounts"]`만 남김 | `threads_accounts`, `th_accounts`는 AIMaster의 다른 쓰레드 프로그램 테이블 |
| `src/app/api/threads/delete/route.ts` | `th_posts` 삭제 줄 제거, `DELETION_STATUS_URL`(`https://www.buylife.xyz/data-deletion`)을 복제본의 데이터 삭제 안내 페이지로 변경 | 다른 프로그램 테이블 / AIMaster 페이지 |
| `src/components/layout/Sidebar.tsx` | "← 다른 프로그램 보기" 링크 제거 또는 변경 | AIMaster 카탈로그로 연결됨 |
| `src/components/settings/GuideLinkButton.tsx`와 이를 쓰는 설정 화면, `src/components/trends/ViralPostDetector.tsx`의 매뉴얼 버튼 | `https://www.buylife.xyz/guides/<id>` 연동 매뉴얼 → 복제본용 매뉴얼 주소로 바꾸거나 버튼 제거 | 매뉴얼은 AIMaster `platform_guides` 게시판에 있음 |
| `src/lib/version.ts` | 필요하면 복제본 자체 버전으로 시작(예: `v1.01` 유지) | 원본과 버전을 따로 관리 |

바꾼 뒤 `npm run build`로 오류가 없는지 확인한다.

**추가로 필요한 페이지**: Meta 앱 등록에 개인정보처리방침·서비스 약관·데이터 삭제 안내 주소가 필요하다. 원본은 AIMaster의
`/privacy`, `/terms`, `/data-deletion`을 쓰고 있으므로, 복제본 운영자 명의의 페이지를 새로 만들어야 한다.

---

## 5. 환경변수 · 배포 · 외부 설정

### 5-1. Vercel 환경변수 (Production)

| 이름 | 필수 | 값 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | 새 Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | 새 프로젝트 anon(publishable) 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | 새 프로젝트 service role 키 (절대 브라우저 코드에 노출 금지) |
| `NEXT_PUBLIC_SITE_URL` | ✅ | 복제본 주소 (예: `https://my-tap.vercel.app`) — Threads 로그인 콜백 주소 계산에 쓰임 |
| `NEXT_PUBLIC_MAIN_SITE_URL` | 권장 | 복제본 안내 사이트 주소(없으면 복제본 주소). 비워두면 `buylife.xyz`로 연결됨 |
| `CRON_SECRET` | 예약 게시 시 | 임의의 긴 문자열(새로 생성) |
| `NAVER_TREND_CLIENT_ID` / `NAVER_TREND_CLIENT_SECRET` | 선택 | 네이버 클라우드 API HUB에서 복제본 운영자가 발급 (트렌드 차트) |
| `FIXIE_URL` | 선택 | Fixie 고정 IP 프록시 주소 (토스 쉐어링크 기능) |
| `GEMINI_IMAGE_MODEL` | 선택 | 이미지 모델 이름 바꿀 때만 (기본 `nanobanana-2-2k`) |

`THREADS_APP_ID`/`THREADS_APP_SECRET`는 **넣지 않는다** — 회원이 설정 화면에서 본인 앱 정보를 등록하는 구조다.

### 5-2. 배포

```bash
vercel link          # 새 Vercel 계정의 새 프로젝트로 연결
vercel env add ...   # 또는 대시보드에서 5-1 입력
vercel deploy --prod --yes
```

### 5-3. 예약 게시 크론

cron-job.org 등에서 1~5분 간격으로 아래를 호출하도록 등록한다.

```
POST https://<복제본 주소>/api/posts/dispatch-scheduled
Authorization: Bearer <CRON_SECRET 값>
```

### 5-4. 각 회원의 Meta(Threads) 앱 설정

회원마다 본인 Meta 앱의 Threads 설정에 다음을 넣는다(주소만 복제본 것으로 바뀐다).

| 칸 | 값 |
|---|---|
| 리디렉션 콜백 URL | `https://<복제본 주소>/api/threads/callback` |
| 제거 콜백 URL | `https://<복제본 주소>/api/threads/uninstall` |
| 삭제 콜백 URL | `https://<복제본 주소>/api/threads/delete` |
| 개인정보처리방침 / 약관 / 데이터 삭제 URL | 복제본 운영자가 만든 페이지 (§4) |

그 뒤 복제본 설정 화면(API키등록·플랫폼연동)에서 **Threads 앱 ID / 앱 시크릿**을 등록하고 "계정 연결하기"를 누른다.
앱 ID는 Meta 화면의 "Threads 앱 ID"여야 한다(일반 앱 ID를 넣으면 4476002 오류).

---

## 6. 동작 확인 체크리스트

1. 회원 계정 생성 → `/login` 로그인 → `/dashboard` 진입(권한 거부로 튕기면 §3의 `programs` 행·`required_grade_id` 확인)
2. 설정 화면에서 OpenAI(또는 Gemini/Claude) 키 저장 → 새로고침 후 유지되는지
3. Threads 앱 ID/시크릿 저장 → 계정 연결 → 연결된 계정 이름이 보이는지
4. 쿠팡 등 제휴 키 저장 → 상품 등록 → 제휴 링크 생성
5. 새 게시글 작성 → AI 캡션·이미지 생성 → 즉시 게시 → Threads에 올라갔는지
6. 예약 게시 1건 → 크론 호출 후 게시되는지
7. `/trends` 키워드 검색(앱 심사 전에는 본인 글만) · 떡상글 직접 가져오기 · 찜 보관함

### 원본 업데이트를 옮길 때

- 원본 `src/lib/version.ts`와 이 저장소 `git log -- threads-affiliate-poster/`로 복제 시점 이후 바뀐 커밋을 찾는다.
- 새 DB 마이그레이션(`supabase/migrations/0008~`)이 있으면 복제본 DB에도 순서대로 실행한다.
- §4에서 복제본용으로 고친 파일은 덮어쓰지 말고 차이만 반영한다.
