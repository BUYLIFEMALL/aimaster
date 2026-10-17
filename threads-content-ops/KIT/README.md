# Threads 콘텐츠 운영 자동화 — 설치 안내서 (독립 운영판)

> 강의용 설치 키트 · 2026-10-18 · 윈도우·맥 공통
> 내 컴퓨터에 압축을 풀고 → 내 계정(Supabase·Vercel·Meta)으로 설정하면 → **내 사이트에서 Threads 글 생성·즉시 게시·예약 게시**까지 됩니다.
> AIMaster와 연결되는 부분은 없습니다. 모든 계정·키·데이터는 수강생 본인 것입니다.

함께 들어 있는 파일

| 파일 | 내용 |
|---|---|
| `KIT/README.md` | 이 설치 안내서(처음부터 끝까지 순서) |
| `KIT/PLATFORMS.md` | 플랫폼별 가입·API 키 발급 상세(Meta·OpenAI·Gemini·쇼핑제휴 등) |
| `KIT/schema.sql` | 새 Supabase DB에 한 번 붙여넣는 전체 구조 |
| `KIT/env.example` | 설정값(환경변수) 목록과 설명 |
| `KIT/setup.ps1` / `KIT/setup.sh` | 대화형 설치 스크립트(윈도우 / 맥) |

---

## 0. 준비물 (처음 한 번)

| 무엇 | 어디서 | 비용 |
|---|---|---|
| **Node.js 22 LTS** | https://nodejs.org → LTS 다운로드·설치 (맥은 .pkg 설치 파일) | 무료 |
| **Supabase 계정** | https://supabase.com (DB·로그인·이미지 저장) | 무료 플랜 |
| **Vercel 계정** | https://vercel.com (웹사이트 서버) | 무료(Hobby) 플랜 |
| **Meta 개발자 계정** | https://developers.facebook.com (내 Threads 앱) | 무료 |
| **Threads 계정** | Instagram 계정으로 Threads 가입 | 무료 |
| **글 생성 AI 키 1개** | OpenAI(권장)·Claude·Gemini 중 하나 | 사용한 만큼(본인 결제) |
| (선택) cron-job.org | 예약 게시를 정해진 시각에 실행 | 무료 |
| (선택) 내 도메인 | 가비아·Cloudflare 등에서 구입 | 연 1~2만 원대 |

> 모든 가입은 **본인 이메일**로 합니다. 같은 이메일을 써 두면 관리하기 쉽습니다.

**Node.js 설치 확인**: 윈도우는 `PowerShell`, 맥은 `터미널`(Spotlight에서 "터미널" 검색)을 열고 `node -v` → `v22...`가 나오면 됩니다.

---

## 1. 압축 풀기 · 프로젝트 폴더 정하기

1. 받은 압축 파일을 풉니다. 이 프로그램은 `threads-content-ops` 폴더입니다.
2. 이 폴더를 원하는 곳으로 옮깁니다. 예: 윈도우 `D:\work\my-threads`, 맥 `~/work/my-threads`
   - **경로에 한글·공백이 없고 짧은 곳**을 권장합니다(윈도우는 경로가 길면 빌드가 실패합니다).
3. (AI 코딩 도구를 쓰면) 이 폴더를 프로젝트 폴더로 열고 "KIT/README.md 대로 설치를 진행해줘"라고 하면 됩니다.

---

## 2. Supabase(DB) 만들기

1. https://supabase.com → **New project**
   - Name: 아무 이름(예: my-threads) · Database Password: 아무 비밀번호(메모) · Region: **Northeast Asia (Seoul)**
2. 만들어지면 왼쪽 **SQL Editor → New query** → `KIT/schema.sql` 파일 내용을 **전부 복사해 붙여넣고 Run**
   - "Success. No rows returned"가 나오면 완료. **Table Editor**에 `tco_posts` 등 테이블, **Storage**에 `ai-image-generations` 버킷이 보이면 성공.
3. **Authentication → Sign In / Providers → Email**: 켜져 있는지 확인하고, **Confirm email을 끕니다**(가입 즉시 로그인되게).
4. **Project Settings → API Keys**에서 아래 3가지를 메모장에 복사해 둡니다.
   - **Project URL** (`https://xxxx.supabase.co`) — Project Settings → Data API 또는 상단 Connect 화면에 있음
   - **Publishable key**(`sb_publishable_...`) 또는 Legacy 탭의 **anon public** key
   - **Secret key**(`sb_secret_...`) 또는 Legacy 탭의 **service_role** key — **절대 남에게 보여 주지 마세요(DB 전체 권한)**

---

## 3. 설치 스크립트 실행 (설치·설정값·빌드·배포를 한 번에)

프로그램 폴더에서 실행합니다.

- **윈도우**: 폴더에서 주소창에 `powershell` 입력 → Enter → 아래 실행
  ```
  powershell -ExecutionPolicy Bypass -File KIT\setup.ps1
  ```
- **맥**: 터미널에서 `cd ~/work/my-threads`(내 폴더) → 아래 실행
  ```
  bash KIT/setup.sh
  ```

스크립트가 차례로 묻습니다.

| 질문 | 입력 |
|---|---|
| Vercel 프로젝트 이름 | 영문 소문자·숫자·`-` (예: `hong-threads`) |
| 사이트 주소 | 그대로 Enter (배포 뒤 실제 주소로 다시 맞춤) |
| 화면에 표시할 내 이름/브랜드 | 예: `홍길동 마케팅` (화면 제목·좌측 메뉴에 표시, 비우면 표시 안 함) |
| Supabase URL / Publishable(anon) / Secret(service_role) | 2단계에서 메모한 값 |

그다음 자동으로 `npm install` → `.env.local` 생성 → `npm run build`(빌드 확인) → **Vercel 로그인(브라우저) → 프로젝트 연결 → 환경변수 등록 → 배포**까지 진행합니다.
마지막에 **Vercel 대시보드 → 프로젝트 → Settings → Domains**에 보이는 실제 주소(예: `https://hong-threads.vercel.app`)를 입력하면, 주소가 다를 때 자동으로 고쳐서 한 번 더 배포합니다.

> 스크립트를 쓰지 않고 손으로 하려면: `KIT/env.example`을 `.env.local`로 복사해 값을 채우고 `npm install` → `npm run build` → `npx vercel@latest deploy --prod` 후 Vercel 대시보드 **Settings → Environment Variables**에 같은 값을 넣고 다시 배포합니다.

배포가 끝나면 `https://내주소/login`에서 **회원가입 → 로그인** 해 봅니다. 화면이 열리면 설치 성공입니다.

**(선택) 내 계정을 관리자로**: Supabase **SQL Editor**에서
`update public.profiles set is_admin = true where email = '내이메일@example.com';`

---

## 4. Meta(Threads) 앱 만들기 — 상세는 `KIT/PLATFORMS.md` 1번

요약:
1. developers.facebook.com → **앱 만들기** → 이용 사례 **"Threads API에 액세스"** 선택 → 앱 생성
2. 이용 사례 → Threads API → **권한**: `threads_basic`, `threads_content_publish` 추가
3. **설정**: 리디렉션 콜백 URL에 `https://내주소/api/threads-content-ops/callback` 입력(제거·삭제 콜백 칸에는 `https://내주소` 입력) → 저장
4. **앱 역할 → 역할 → Threads 테스터**에 내 Threads 계정 추가 → Threads 앱(또는 threads.net) **설정 → 계정 → 웹사이트 권한 → 초대**에서 **수락**
5. **앱 설정 → 기본 설정** 맨 아래 **Threads 앱 ID / Threads 앱 시크릿 코드**를 복사 (맨 위 "앱 ID"가 아닙니다!)

> 내 사이트의 **사용 매뉴얼** 화면에도 내 콜백 주소가 복사 버튼과 함께 나옵니다.

---

## 5. 프로그램에 키 등록 · Threads 계정 연결

내 사이트 → 좌측 **API키등록·플랫폼연동**
1. **Threads 앱 ID / Threads 앱 시크릿 코드** 저장 → **Threads 계정 연결하기** 버튼 → Threads 로그인·허용
2. **OpenAI API 키** 저장(글 생성). Claude·Gemini를 쓰려면 해당 키도 저장
3. (선택) 이미지: 나노바나나 = Gemini 키, GPT Image = OpenAI 키, FLUX = Replicate 키
4. (선택) YouTube·Perplexity·쿠팡·알리익스프레스 키 — `KIT/PLATFORMS.md` 참고

**첫 게시 시험**: **콘텐츠 생성**에서 주제 입력 → 글 생성 → 초안 저장 → **콘텐츠 보관함**에서 **지금 발행** → 내 Threads에 올라오면 완료.
쇼핑제휴(쿠팡·알리·네이버·토스)를 연동하지 않아도 일반 글 생성·게시는 그대로 됩니다.

---

## 6. 예약 게시 연결 (정해진 시각에 자동 게시)

Vercel 무료 플랜은 자동 실행을 하루 1번만 허용하므로, 무료 **cron-job.org**로 1분마다 예약 확인 주소를 부릅니다.

1. https://cron-job.org 가입 → **CREATE CRONJOB**
2. URL: `https://내주소/api/threads-content-ops/dispatch-scheduled`
3. Execution schedule: **Every 1 minute**(또는 5분)
4. **ADVANCED → Headers** → Key `Authorization`, Value `Bearer 내CRON_SECRET`
   - `CRON_SECRET` 값은 프로그램 폴더의 `.env.local` 파일에 있습니다(설치 스크립트가 자동 생성).
5. 저장 → **TEST RUN** → 응답이 `200`이면 연결 완료(`401`이면 Authorization 값 확인)

> 30일 지난 미디어 정리는 `vercel.json`의 하루 1번 자동 실행으로 돌아갑니다(무료 플랜 허용).

---

## 7. (선택) 내 도메인 연결

1. Vercel → 프로젝트 → **Settings → Domains → Add** → 내 도메인 입력(예: `threads.hong.com`)
2. 안내대로 도메인 회사 DNS에 기록 추가(보통 `CNAME` → `cname.vercel-dns.com`, 루트 도메인은 `A` → `76.76.21.21`) → Vercel에서 **Valid** 확인
3. 주소가 바뀌었으니 아래를 **새 주소로** 고칩니다.
   - Vercel **Environment Variables**의 `NEXT_PUBLIC_SITE_URL` → 수정 후 **Redeploy**
   - Meta 앱 리디렉션 콜백 URL에 새 주소 콜백 **추가**
   - cron-job.org URL
   - 내 컴퓨터 `.env.local`의 `NEXT_PUBLIC_SITE_URL`
4. 프로그램에서 **Threads 계정 연결하기**를 한 번 더 누릅니다.

---

## 8. 자주 막히는 곳

| 증상 | 확인 |
|---|---|
| 로그인 화면에서 "가입 확인 메일" 안내 | Supabase Authentication → Email → **Confirm email 끄기** |
| Threads 연결 시 "앱 ID를 인식할 수 없습니다" / 4476002 | **Threads 앱 ID**(기본 설정 맨 아래)를 넣었는지 — 맨 위 "앱 ID" 아님 |
| Threads 연결 시 "리디렉션 URI" 오류 | Meta 콜백 URL이 `https://내주소/api/threads-content-ops/callback`와 **글자 하나까지** 같은지, `NEXT_PUBLIC_SITE_URL`이 실제 주소인지 |
| "테스터가 아닙니다" | Threads 테스터 초대를 **수락**했는지 |
| 글 생성 시 "API 키 등록 필요" | API키등록·플랫폼연동에 해당 AI 키 저장 |
| 예약 글이 안 올라감 | cron-job.org 응답이 200인지, Authorization 값 |
| 빌드 실패 `JavaScript heap out of memory` | 다시 실행하거나 다른 프로그램을 닫고 실행 |
| 설정을 바꿨는데 반영 안 됨 | Vercel 환경변수는 바꾼 뒤 **Redeploy**해야 반영 |
| 빌드 실패 `file is too long` / `TurbopackInternalError` (윈도우) | 폴더 경로가 너무 깁니다. `D:\work\my-threads`처럼 **짧은 경로**로 폴더를 옮긴 뒤 다시 실행 |

---

## 9. 비용 안내

- Supabase·Vercel·Meta·cron-job.org: 무료 플랜으로 시작할 수 있습니다.
- AI(OpenAI·Gemini 등) 요금은 **본인 키로 쓴 만큼** 각 회사가 청구합니다. 이미지 생성은 글보다 비쌉니다.
- 토스쇼핑 연동은 고정 IP 프록시(Fixie, 유료)가 필요해 기본 설치에서는 쓰지 않습니다.
