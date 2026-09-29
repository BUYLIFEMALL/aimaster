# Threads 쇼핑제휴 자동화 — 설치 매뉴얼 (독립 운영 복제본)

쿠팡파트너스·알리익스프레스·토스쇼핑·네이버 브랜드커넥트 제휴 상품으로 Threads 홍보 글을 AI가 써 주고,
회원 본인의 Threads 계정에 바로 게시하거나 예약 게시하는 웹 프로그램입니다.
이 문서는 **새 GitHub·Supabase·Vercel 계정에 처음부터 설치해서 운영**하는 순서를 설명합니다.

- 소요 시간: 약 1~2시간 (Meta 앱 만들기 제외)
- 필요 비용: Supabase·Vercel 무료 플랜으로 시작 가능. AI·제휴 API 요금은 각 회원이 본인 키로 부담합니다.
- 함께 들어 있는 파일

| 위치 | 내용 |
|---|---|
| `README.md` | 이 설치 매뉴얼 |
| `AGENTS.md` | 운영·개발 기본지침 (사람과 AI 코딩 도구 공통) |
| `setup/DB_DESIGN.md` | DB 설계 (테이블·관계·권한 판정) |
| `supabase/schema.sql` | 새 DB에 한 번에 붙여넣는 전체 스키마 |
| `supabase/migrations/` | 스키마의 원본 조각 (이후 변경 이력 관리용) |
| `.env.example` | 환경변수 목록과 설명 |
| `setup/manuals/*.html` | 회원용 연동 매뉴얼 8종 (OpenAI·Gemini·Threads 연동·Meta 앱 심사·쿠팡·알리·토스·네이버) |

---

## 0. 준비물

| 준비물 | 용도 | 비고 |
|---|---|---|
| GitHub 계정 | 코드 보관 | 비공개 저장소 권장 |
| Supabase 계정 | DB·로그인·이미지 저장 | https://supabase.com |
| Vercel 계정 | 웹 서버 | https://vercel.com (예약 게시를 많이 쓰면 Pro 권장) |
| Node.js 20 이상 | 내 컴퓨터에서 빌드 확인 | https://nodejs.org |
| Meta 개발자 계정 | 회원마다 본인 Threads 앱 | 회원이 각자 만듭니다 (6단계) |
| (선택) cron-job.org | 예약 게시 실행 | 무료 |
| (선택) 네이버 클라우드 API HUB | 검색어 트렌드 차트 | 운영자 키 |
| (선택) Fixie | 토스 쉐어링크(고정 IP 필요) | 운영자 계정 |

---

## 1. 복제본 폴더 만들기 (원본을 가진 쪽에서 1회)

원본 저장소의 `threads-affiliate-poster` 폴더에서 실행합니다.

```bash
node clone-kit/scripts/make-clone.mjs D:\clone\threads-affiliate-poster
```

비밀값(`.env*`), 원본 Vercel 연결(`.vercel`), `node_modules`, 원본 운영자 전용 문서는 복사되지 않습니다.
만들어진 폴더를 새 GitHub 저장소에 올립니다.

```bash
cd D:\clone\threads-affiliate-poster
git init
git add .
git commit -m "init: threads affiliate poster"
git branch -M main
git remote add origin https://github.com/<새계정>/<새저장소>.git
git push -u origin main
```

> 이미 만들어진 복제본 폴더를 받았다면 2단계부터 진행하세요.

---

## 2. Supabase 프로젝트 만들기

1. Supabase → **New project** → 이름·DB 비밀번호·지역(Northeast Asia (Seoul) 권장) 입력 → 생성
2. **SQL Editor → New query** → `supabase/schema.sql` 파일 전체를 붙여넣고 **Run**
   - "Success. No rows returned"가 나오면 완료입니다. 오류가 나면 새 프로젝트인지(빈 DB인지) 확인하세요.
3. 확인
   - **Table Editor**에 `profiles`, `programs`, `tap_posts` 등 15개 테이블이 보이는지
   - **Storage**에 `post-images` 버킷이 **Public**으로 있는지
   - `programs` 테이블에 `threads-affiliate-poster` 행이 있는지
4. **Authentication → Sign In / Providers → Email**이 켜져 있는지 확인
   - 가입 확인 메일 없이 바로 쓰게 하려면 **Confirm email**을 끕니다(소규모 운영 권장).
   - 켜 두면 가입 후 확인 메일의 링크를 눌러야 로그인됩니다.
5. **Authentication → URL Configuration**
   - Site URL: 복제본 주소 (예: `https://my-tap.vercel.app`) — 4단계 배포 후 주소가 정해지면 입력
   - Redirect URLs: `https://my-tap.vercel.app/auth/callback` 추가
6. **Project Settings → API**에서 3가지 값을 메모합니다: Project URL, anon(public) key, service_role key
   - service_role key는 **절대 공개하지 마세요** (DB 전체 권한).

---

## 3. 내 컴퓨터에서 빌드 확인 (권장)

```bash
cd D:\clone\threads-affiliate-poster
copy .env.example .env.local      # 값 채우기 (5단계 표 참고)
npm install
npm run build
npm run dev                        # http://localhost:3000 에서 가입·로그인 확인
```

`.env.local`은 비밀값 파일이라 Git에 올라가지 않습니다(.gitignore 처리됨).

---

## 4. Vercel 배포

1. Vercel → **Add New → Project** → 1단계의 GitHub 저장소 선택 → Import
   - Framework: Next.js (자동 인식), Root Directory: 저장소 루트
2. **Environment Variables**에 5단계 표의 값을 입력 → **Deploy**
3. 배포가 끝나면 주소(예: `https://my-tap.vercel.app`)를 확인하고
   - Vercel 환경변수 `NEXT_PUBLIC_SITE_URL`을 그 주소로 맞춘 뒤 **Redeploy**
   - 2-5단계의 Supabase Site URL·Redirect URL도 그 주소로 입력
4. (선택) 자체 도메인: Vercel → Settings → Domains에서 연결 후 위 주소들을 도메인으로 바꿉니다.

CLI로 배포할 때:

```bash
npm i -g vercel
vercel link
vercel env add NEXT_PUBLIC_STANDALONE_MODE production   # 값 입력, 나머지 변수도 같은 방식
vercel deploy --prod
```

---

## 5. 환경변수

| 이름 | 필수 | 값 |
|---|---|---|
| `NEXT_PUBLIC_STANDALONE_MODE` | ✅ | `true` (독립 운영 모드: 자체 회원가입·법적 고지 페이지 사용) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | anon(public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | service_role key |
| `NEXT_PUBLIC_SITE_URL` | ✅ | 복제본 주소 (끝에 `/` 없이) |
| `NEXT_PUBLIC_OPERATOR_NAME` | ✅ | 운영자명(상호) — 개인정보처리방침·약관에 표시 |
| `NEXT_PUBLIC_OPERATOR_EMAIL` | ✅ | 운영자 연락 이메일 |
| `CRON_SECRET` | 예약 게시 시 | 임의의 긴 문자열 (예: 비밀번호 생성기로 40자) |
| `NEXT_PUBLIC_GUIDE_BASE_URL` | 선택 | 연동 매뉴얼을 올린 사이트 주소. 비우면 화면의 매뉴얼 버튼이 숨겨짐 |
| `NAVER_TREND_CLIENT_ID` / `NAVER_TREND_CLIENT_SECRET` | 선택 | 검색어 트렌드 차트 |
| `FIXIE_URL` | 선택 | 토스 쉐어링크 고정 IP 프록시 |
| `GEMINI_IMAGE_MODEL` | 선택 | 이미지 모델 변경 시만 |

`NEXT_PUBLIC_`로 시작하는 값은 **빌드할 때 화면 코드에 들어가므로**, 바꾼 뒤에는 반드시 다시 배포해야 반영됩니다.
`THREADS_APP_ID`·`OPENAI_API_KEY` 같은 값은 넣지 않습니다 — 회원이 설정 화면에서 본인 것을 등록합니다.

---

## 6. 첫 계정 만들기와 동작 확인

1. `https://<복제본 주소>/signup`에서 회원가입 → 로그인 → 대시보드가 열리면 성공
   - "이용 권한이 없습니다"가 나오면 `programs` 행과 `required_grade_id`를 확인 (`setup/DB_DESIGN.md` 2장)
2. 운영자 계정을 관리자로 표시하려면 Supabase SQL Editor에서:
   ```sql
   update profiles set is_admin = true where email = '운영자@이메일';
   ```
3. **API키등록·플랫폼연동** 화면에서 OpenAI(또는 Gemini/Claude) 키 저장 → 새로고침해도 남아 있는지
4. 쿠팡 등 제휴 키 저장 → **상품 관리**에서 상품 등록 → 제휴 링크가 만들어지는지
5. Threads 연동 (아래 7단계) → **게시글 관리**에서 새 글 작성 → AI 캡션·이미지 생성 → 즉시 게시
6. 예약 게시 1건 등록 → 크론(8단계)이 돌면 게시되는지
7. **트렌드 & 떡상 탐지기**: 키워드 검색(Meta 앱 심사 전에는 본인 글만), 떡상글 직접 가져오기, 찜 보관함

---

## 7. Threads(Meta) 연동 — 회원마다 본인 앱

이 프로그램은 운영자 앱을 여러 회원이 같이 쓰지 않습니다(심사 전 Meta 앱은 등록된 테스터만 로그인 가능).
회원 각자가 `setup/manuals/03_threads_connect.html`을 따라 본인 Meta 앱을 만들고 아래 주소를 넣습니다.

| Meta 앱의 Threads 설정 칸 | 값 |
|---|---|
| 리디렉션 콜백 URL | `https://<복제본 주소>/api/threads/callback` |
| 제거 콜백 URL | `https://<복제본 주소>/api/threads/uninstall` |
| 삭제 콜백 URL | `https://<복제본 주소>/api/threads/delete` |
| 개인정보처리방침 URL | `https://<복제본 주소>/legal/privacy` |
| 서비스 약관 URL | `https://<복제본 주소>/legal/terms` |
| 데이터 삭제 안내 URL | `https://<복제본 주소>/legal/data-deletion` |

그 뒤 프로그램 설정 화면에서 **Threads 앱 ID·앱 시크릿**을 저장하고 "계정 연결하기"를 누릅니다.
- 앱 ID는 Meta 화면의 **"Threads 앱 ID"**를 넣어야 합니다(일반 앱 ID를 넣으면 4476002 오류).
- 다른 사람의 공개 글까지 검색하려면 Meta 앱 심사가 필요합니다 → `setup/manuals/04_threads_business_app_review.html`

---

## 8. 예약 게시 크론

cron-job.org → Create cronjob

| 항목 | 값 |
|---|---|
| URL | `https://<복제본 주소>/api/posts/dispatch-scheduled` |
| 실행 간격 | 1~5분 |
| Request method | POST |
| Headers | `Authorization: Bearer <CRON_SECRET 값>` |

응답이 401이면 `CRON_SECRET` 값이 Vercel 환경변수와 다른 것입니다.

---

## 9. 회원용 연동 매뉴얼 제공

`setup/manuals/`의 HTML 8개는 회원이 키를 발급받는 방법입니다. 문서 속 `<복제본-주소>`는 실제 주소로 읽으면 됩니다.
- 가장 간단한 방법: 운영자 사이트나 노션 등에 올려 회원에게 링크 공유
- 프로그램 화면의 매뉴얼 버튼을 쓰려면: 그 매뉴얼들을 `https://<매뉴얼 사이트>/guides/<원래 id>` 주소로 열리게 올리고
  `NEXT_PUBLIC_GUIDE_BASE_URL`에 매뉴얼 사이트 주소를 넣어 재배포 (id 목록: `src/app/(dashboard)/settings/page.tsx`의 `GUIDE_LINKS`)

---

## 10. 자주 생기는 문제

| 증상 | 원인·해결 |
|---|---|
| 가입 후 로그인이 안 됨 | Confirm email이 켜져 있음 → 메일 링크를 누르거나 2-4단계에서 끄기 |
| 로그인 후 "이용 권한이 없습니다" | `programs`에 `threads-affiliate-poster` 행이 없거나 `is_active=false`, 또는 `required_grade_id` 설정 |
| 화면에 AIMaster 문구·링크가 보임 | `NEXT_PUBLIC_STANDALONE_MODE=true`가 빠졌거나, 넣은 뒤 재배포를 안 함 |
| Threads 연결 시 "앱 ID를 인식할 수 없음"/4476002 | 앱 ID 칸에 일반 앱 ID를 넣음 → "Threads 앱 ID"로 교체 |
| Threads 연결 후 원래 화면으로 안 돌아옴 | `NEXT_PUBLIC_SITE_URL`과 Meta 리디렉션 콜백 URL의 주소가 서로 다름 |
| 이미지 생성은 되는데 게시 실패 | `post-images` 버킷이 Public이 아님 |
| 예약 글이 게시되지 않음 | 크론 미등록, 또는 Authorization 헤더 값 불일치 |
| 토스 상품 조회 실패 | `FIXIE_URL` 미설정 (토스는 등록된 고정 IP만 허용) |

---

## 11. 버전과 업데이트

- 화면 좌측 메뉴 제목 밑의 버전(`src/lib/version.ts`)과 `programs.version`을 함께 관리합니다.
  수정해서 배포할 때마다 `v1.01 → v1.02`, 큰 변경은 `v2.01`.
- 원본 프로그램의 개선 사항을 가져올 때는 원본의 버전·커밋 기록을 보고 바뀐 파일만 옮기며,
  새 `supabase/migrations/` 파일이 있으면 복제본 DB에도 순서대로 실행합니다.
