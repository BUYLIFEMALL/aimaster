# SETUP GUIDE (설치 및 배포 가이드)

이 문서는 프로젝트를 처음 실행하는 데 필요한 Supabase / Meta Threads API / Vercel 설정을
순서대로 설명합니다.

## 0. 사전 준비물

- Node.js 20 이상
- Supabase 계정 (https://supabase.com)
- Meta for Developers 계정 및 Threads API 앱 (https://developers.facebook.com)
- (배포 시) Vercel 계정

---

## 1. Supabase 프로젝트 생성

1. https://supabase.com/dashboard 에서 새 프로젝트를 생성합니다.
2. 프로젝트 생성이 완료되면 **Project Settings → API** 메뉴에서 아래 값을 확인합니다.
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` 키 → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ 절대 외부에 노출 금지, 서버 전용)

## 2. 데이터베이스 마이그레이션 적용

`supabase/migrations/` 폴더에 아래 두 마이그레이션이 있습니다. **반드시 파일명
순서(0001 → 0002)대로** 적용하세요.

- `0001_init.sql` — `posts`, `threads_accounts` 테이블 + RLS 정책
- `0002_post_images_storage.sql` — 게시글 이미지 업로드용 `post-images` Storage 버킷 + RLS 정책

**방법 A: Supabase 대시보드 SQL Editor**

1. 대시보드 → **SQL Editor** → New query
2. `0001_init.sql` 내용을 복사해 붙여넣고 실행(Run)
3. 새 query에 `0002_post_images_storage.sql` 내용을 붙여넣고 실행(Run)

**방법 B: Supabase CLI**

```bash
npm install -g supabase
supabase login
supabase link --project-ref <프로젝트 참조 ID>
supabase db push
```

적용 후 **Table Editor**에서 `posts`, `threads_accounts` 테이블과
각 테이블의 **RLS 정책(4개씩: select/insert/update/delete)**이 생성되었는지,
**Storage**에서 `post-images` 버킷(Public)이 생성되었는지 확인하세요.

## 3. Supabase Auth 설정

- 기본값(이메일/비밀번호 로그인)만 사용하면 별도 설정 없이 동작합니다.
- **Authentication → Providers → Email**에서 "Confirm email"(이메일 인증) 여부를 결정하세요.
  - 켜두면 가입 후 인증 메일을 확인해야 로그인 가능합니다.
  - 테스트를 빠르게 하려면 꺼두어도 됩니다(운영 환경에서는 켜는 것을 권장).

## 4. Meta Threads API 앱 생성

Threads API는 Instagram Graph API 계열이며, Meta for Developers에서 앱을 만들고
설정값을 받아와야 합니다. 아래 순서대로 진행하세요.

### ① 개발자 계정 접속

1. 브라우저에서 **https://developers.facebook.com/apps** 접속
2. 평소 쓰는 페이스북/메타 계정으로 로그인 (없으면 그 계정으로 가입)

### ② 새 앱 생성

1. 오른쪽 위 **"앱 만들기(Create App)"** 클릭
2. **"Use case(사용 사례)"** 선택 화면에서 **"Threads API 이용"** 옵션을 선택
   - 안 보이면 검색창에 "Threads" 입력
3. 앱 이름 입력(아무 이름이나 가능, 예: `threads-automation`) → 다음 → 앱 생성 완료

### ③ App ID / App Secret 확인 → 환경변수에 채우기

1. 앱 생성 후 왼쪽 메뉴 **"앱 설정(App settings) → 기본 설정(Basic)"** 클릭
2. 아래 두 값을 복사
   - **앱 ID(App ID)**
   - **앱 시크릿 코드(App Secret)** — "보기(Show)" 버튼을 눌러야 표시됨 (비밀번호 재확인 요구될 수 있음)
3. `threads/.env.local`에 그대로 붙여넣기

   ```
   THREADS_APP_ID=여기에_App_ID_붙여넣기
   THREADS_APP_SECRET=여기에_App_Secret_붙여넣기
   ```

### ④ Threads API 사용 설정 + Redirect URI 등록

1. 왼쪽 메뉴에서 **"Threads API"** 클릭 (안 보이면 왼쪽 메뉴 하단 "제품 추가"에서 Threads API 추가)
2. **"Settings"** 탭으로 이동
3. **"Redirect Callback URLs"** 칸에 아래 주소를 정확히 입력 후 저장

   - 로컬 개발: `http://localhost:3000/api/threads/callback`
   - 배포 후에는 실제 도메인으로 하나 더 추가: `https://<배포 도메인>/api/threads/callback`
   - 로컬 테스트 중이면 `THREADS_REDIRECT_URI`도 로컬 주소와 동일하게 맞춰두기

4. 필요한 권한(Scope)에 `threads_basic`, `threads_content_publish`가 체크되어
   있는지 확인 (기본으로 켜져 있는 경우가 많음)

### ⑤ 테스트할 본인 Threads 계정 등록 (필수, 빠뜨리면 연결 실패)

앱이 아직 "심사 전(개발 모드, Development Mode)"이라서, **등록된 테스터
계정으로만** 로그인/게시가 가능합니다.

1. 왼쪽 메뉴 **"앱 역할(App roles) → 역할(Roles)"** 클릭
2. **"테스터(Testers)"** 탭에서 **"테스터 추가"** 클릭
3. 실제 게시에 사용할 본인 Threads/Instagram 계정을 초대
4. 그 계정으로 로그인해서 **초대를 수락**까지 해야 함 (Threads 앱 또는
   facebook.com 알림에서 확인)

> 실제 서비스로 여러 사용자에게 열려면 Meta 앱 검수(App Review)와 비즈니스
> 인증을 통과해야 합니다. 이는 Meta 사이트에서 별도로 신청해야 하는
> 절차이며, 테스터 계정만으로 계속 운영해도 된다면 지금 단계는 건너뛰어도
> 됩니다.

### ⑥ 로컬에서 연결 확인

값을 모두 채웠으면 아래로 동작을 확인합니다.

```bash
cd threads
npm run dev
```

`localhost:3000` 접속 → 로그인 → **대시보드 → 계정 연결(Threads 계정 연결)**
클릭 → ⑤에서 등록한 테스터 계정으로 로그인 → 연결 성공 화면이 뜨면 완료입니다.

## 5. 환경변수 설정

`.env.local.example`을 복사해 `.env.local`을 만들고 값을 채웁니다.

```bash
cp .env.local.example .env.local
```

| 변수 | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon(public) 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role 키 (서버 전용, 절대 커밋 금지) |
| `THREADS_APP_ID` | Meta Threads API 앱 ID |
| `THREADS_APP_SECRET` | Meta Threads API 앱 Secret |
| `THREADS_REDIRECT_URI` | OAuth 콜백 URL (`/api/threads/callback`) |
| `CRON_SECRET` | 예약 게시 일괄 실행 API(`/api/posts/dispatch-scheduled`) 보호용 임의의 긴 문자열 |
| `NEXT_PUBLIC_SITE_URL` | 배포 도메인 (OAuth 리다이렉트 등에 사용) |
| `OPENAI_API_KEY` | AI 게시글 생성 기능용 OpenAI API 키 (https://platform.openai.com/api-keys) |

`CRON_SECRET`은 아래 명령으로 안전한 임의 문자열을 생성해 사용하세요.

```bash
openssl rand -hex 32
```

## 6. 로컬 실행

```bash
npm install
npm run dev
```

http://localhost:3000 접속 → 회원가입 → 로그인 → **Threads 계정 연결** →
게시글 작성(즉시 게시 / 예약 게시 / 임시저장) 순서로 테스트합니다.

## 7. Vercel 배포

1. GitHub 저장소에 push 후 Vercel에서 Import
2. Vercel 프로젝트 **Settings → Environment Variables**에 위 5번의 환경변수를 모두 등록
   - `SUPABASE_SERVICE_ROLE_KEY`, `THREADS_APP_SECRET`, `CRON_SECRET`은 반드시
     **Production/Preview 환경변수**로만 등록하고, `NEXT_PUBLIC_` 접두사를 붙이지 않습니다.
3. 배포 후 실제 도메인이 정해지면:
   - Meta 앱의 Threads Redirect URI를 `https://<도메인>/api/threads/callback`으로 업데이트
   - `THREADS_REDIRECT_URI`, `NEXT_PUBLIC_SITE_URL` 환경변수를 실제 도메인으로 업데이트 후 재배포

## 8. 예약 게시 자동화 (무료/Hobby 플랜 기준: cron-job.org + Vercel Cron 백업)

**Vercel Hobby(무료) 플랜은 Cron Job이 하루 1회로 제한**되어 있어, 분 단위로
정확한 시각에 게시하려면 외부 무료 스케줄러(cron-job.org)를 메인으로 사용합니다.
`vercel.json`의 Vercel Cron은 **하루 1회 안전망(백업)**으로만 등록되어 있어,
혹시 외부 스케줄러가 멈추더라도 하루에 한 번은 밀린 예약글이 게시되도록 합니다.

```json
{
  "crons": [
    { "path": "/api/posts/dispatch-scheduled", "schedule": "0 0 * * *" }
  ]
}
```

Vercel Cron은 `CRON_SECRET` 환경변수가 설정되어 있으면 자동으로
`Authorization: Bearer <CRON_SECRET>` 헤더를 붙여 호출하므로, Vercel Dashboard의
**Settings → Environment Variables**에 `CRON_SECRET`만 등록하면 됩니다
(별도 코드 수정 불필요).

**메인 자동화: cron-job.org (1~5분 간격, 무료)**

1. https://cron-job.org 가입 후 새 Cronjob 생성
2. URL: `https://<배포 도메인>/api/posts/dispatch-scheduled`
3. Method: `POST`
4. Header 추가: `Authorization: Bearer <CRON_SECRET>`
5. 실행 주기: **1~5분 간격** 권장 (예약 시각과 실제 게시 시각의 오차가 이 간격만큼 발생)

```bash
# 수동 테스트용
curl -X POST https://<배포 도메인>/api/posts/dispatch-scheduled \
  -H "Authorization: Bearer <CRON_SECRET>"
```

추후 Vercel **Pro 플랜**으로 업그레이드하면 `vercel.json`의 `schedule`을
`*/5 * * * *`처럼 분 단위로 바꿔 Vercel Cron만으로 충분히 자동화할 수 있습니다.

## 9. 트러블슈팅

- **로그인 후 계속 `/login`으로 돌아옴**: `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY`가
  올바른지, Supabase 프로젝트의 Auth 설정(이메일 인증)이 가입 흐름과 맞는지 확인하세요.
- **Threads 계정 연결이 `accounts?error=connect_failed`로 실패**: Redirect URI가
  Meta 앱 설정과 `THREADS_REDIRECT_URI` 값이 정확히 일치하는지, 테스터 계정으로
  로그인했는지 확인하세요.

  **`error_code: 1349168` / "차단된 URL입니다: 리디렉션 URI가 앱 클라이언트
  OAuth 설정의 화이트리스트에 없으므로..."** 에러가 뜨는 경우, 이 문구는 Threads
  API 자체가 아니라 Meta의 **"Facebook 로그인(Facebook Login)" 제품**의 OAuth
  검증 로직에서 나옵니다. 앱에 Threads API만 추가하고 Facebook 로그인 제품을
  추가하지 않았다면 아래처럼 해결하세요.

  1. Meta 앱 대시보드 → 왼쪽 메뉴 **"+ 제품 추가(Add Product)"** (안 보이면
     맨 위 앱 이름 옆 **"Dashboard"** 클릭 시 제품 목록이 나옴)
  2. **"Facebook 로그인(Facebook Login)"** 카드 → **"설정(Set up)"** 클릭
  3. 플랫폼 선택에서 **"웹(Website)"** 선택, Site URL에 배포 도메인
     (`https://<배포 도메인>`) 입력
  4. 추가되면 왼쪽 메뉴에 생기는 **"Facebook 로그인 → Settings"**로 이동해
     아래 값을 설정하고 **반드시 페이지 맨 아래 "변경 내용 저장"까지 클릭**:
     - **클라이언트 OAuth 로그인(Client OAuth Login)**: 켜짐
     - **웹 OAuth 로그인(Web OAuth Login)**: 켜짐
     - **유효한 OAuth 리디렉션 URI(Valid OAuth Redirect URIs)**:
       `https://<배포 도메인>/api/threads/callback`
  5. Threads API → Settings의 **Redirect Callback URLs**에도 동일한 주소가
     등록되어 있는지 함께 확인 (두 곳 모두 필요)
- **즉시 게시가 실패로 표시됨**: 게시글 상세 페이지의 오류 메시지를 확인하세요.
  Threads API가 반환한 원문 오류가 `error_message`에 저장됩니다.
- **예약 게시가 실행되지 않음**: 아직 자동 트리거가 연결되지 않은 상태이므로,
  대시보드에서 "예약 게시 실행" 버튼을 누르거나 8번 항목대로 외부 스케줄러를 연결하세요.
