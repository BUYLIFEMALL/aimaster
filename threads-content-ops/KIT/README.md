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
| `패키지설치마법사.cmd` / `.command` | **패키지 설치마법사** 실행 파일(윈도우 / 맥 — 더블클릭) |
| `KIT/setup.ps1` / `KIT/setup.sh` | 마법사 본체(직접 열 필요 없음) |

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

## 1. 압축 풀기 · 폴더 정하기

1. 압축 파일을 풉니다. 이 프로그램은 `threads-content-ops` 폴더입니다.
2. 원하는 곳으로 옮깁니다. 예: 윈도우 `D:\work\my-threads`, 맥 `~/work/my-threads`
   - **경로에 한글·공백 없이, 짧게**(윈도우는 경로가 길면 빌드가 실패합니다). **GitHub 저장소 폴더 안에는 풀지 마세요.**

---

## 2. 패키지 설치마법사 실행 (DB 만들기부터 인터넷에 올리기까지 한 번에)

프로그램 폴더 맨 위에 있는 실행 파일을 **더블클릭**합니다.

- **윈도우**: `패키지설치마법사.cmd` 더블클릭 (「Windows의 PC 보호」 창이 뜨면 [추가 정보] → [실행])
- **맥**: `패키지설치마법사.command` 더블클릭 (「확인되지 않은 개발자」 창이 뜨면 마우스 오른쪽 클릭 → [열기] → [열기], 처음 한 번만)

마법사가 8단계를 차례로 안내합니다. **필요한 화면은 마법사가 브라우저로 직접 열어 주고, 붙여 넣을 내용은 클립보드에 복사해 둡니다.**

| 단계 | 마법사가 하는 일 | 내가 할 일 |
|---|---|---|
| ① Node.js | 설치돼 있는지 확인(윈도우는 없으면 자동 설치 제안) | 설치 후 마법사 다시 실행 |
| ② Supabase 프로젝트 | 새 프로젝트 화면 열기 | 이름·DB 비밀번호(Generate 후 메모)·지역 **Northeast Asia (Seoul)** → 생성 → **주소창 주소 붙여넣기** |
| ③ Supabase 키 | API Keys 화면 열기, **맞는 키인지 자동 확인** | Publishable key → Secret key 순서로 붙여넣기(화면에 안 보임) |
| ④ DB 만들기 | 설치 SQL을 **클립보드에 복사**하고 SQL Editor 열기, 끝나면 **성공 여부 자동 확인** | 빈 칸 클릭 → 붙여넣기 → [Run] |
| ⑤ 이메일 확인 끄기 | Sign In / Providers 화면 열기 | Email → **Confirm email 끄기** → Save |
| ⑥ 내 사이트 설정 | 주소·비밀값 자동 생성 | 사이트 이름(영문, 주소가 됨) · 화면에 표시할 내 이름/브랜드 |
| ⑦ 설치·빌드 | 프로그램 설치·확인(3~5분) | 기다리기 |
| ⑧ 인터넷에 올리기 | Vercel 연결·설정 등록·배포, **실제 주소 자동 확인** | 브라우저에서 Vercel 로그인(처음이면 무료 가입) |

- 중간에 창을 닫아도 **다시 더블클릭하면 이어서** 진행합니다(처음부터 하려면 질문에 `n`).
- 끝나면 내 사이트가 열리고, 프로그램 폴더에 **`설치결과.txt`**(내 사이트 주소·Meta 앱에 등록할 콜백 주소)가 생깁니다. 콜백 주소는 클립보드에도 복사돼 있습니다.

---

## 3. 설치 확인 · (선택) 관리자 지정

- Supabase **Table Editor**에 `tco_posts` 등이 보이고, `https://내주소/login`에서 **회원가입 → 로그인**이 되면 설치 성공입니다.

**(선택) 내 계정을 관리자로**: Supabase SQL Editor에서
`update public.profiles set is_admin = true where email = '내이메일@example.com';`

> 마법사가 안 될 때만(고급): `KIT/env.example`을 `.env.local`로 복사해 값을 채우고 `npm install` → `npm run build` → `npx vercel@latest deploy --prod` 후 Vercel **Settings → Environment Variables**에 같은 값을 넣고 다시 배포합니다. **AI 코딩 도구에 설치를 맡기지 말고** 마법사를 직접 실행하세요(마법사는 사람이 답을 입력하는 방식입니다).

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

> **공지 — 예약 발행은 1분마다 「올릴 시각이 된 글」을 확인해 주는 곳이 있어야 동작합니다.**
> Vercel **무료(Hobby)** 요금제는 자동 실행을 하루 1번만 허용하므로, Vercel로 1분 확인을 하려면 **Vercel 유료(Pro) 구독**이 필요합니다.
> 그래서 이 배포판의 **기본 방식은 B(내 cron-job.org)** 이고, Vercel 유료(Pro)라면 A를 켠 뒤 설정에서 「Vercel 예약 호출」을 고를 수도 있습니다(회원마다 선택). 「지금 발행」(즉시 발행)은 아무 연결 없이도 됩니다.

### B. 기본 — 내 cron-job.org (무료, API 키만 등록)
1. https://console.cron-job.org/signup 에서 무료 가입 → 이메일 인증 → 로그인
2. 콘솔 **Settings → API** → **Create API key** → 키 복사 (**IP 제한은 켜지 마세요** — Vercel 서버 주소는 계속 바뀝니다)
3. 내 사이트 → **API키등록·플랫폼연동** → **⏰ 예약 발행** → 실행 방식이 「내 cron-job.org · 기본값」인지 확인 → 아래 **cron-job.org API 키** 칸에 붙여 넣고 **저장** → 끝
4. 이제 **콘텐츠 생성(STEP 5)·콘텐츠 보관함에서 글을 예약**하면 프로그램이 내 cron-job.org에 1분 확인 작업을 **자동으로 만들고 켭니다**. 남은 예약이 없으면 **자동으로 끕니다**(cron-job.org 콘솔에서 작업 「Threads 운영 자동화 예약 발행(1분)」이 켜졌다 꺼졌다 하는 것이 정상).
5. 보관함 위 「⏰ 예약 발행」 줄에서 상태(실행 중·대기·일시정지됨)를 보고 **전체 일시정지 / 재개**를 할 수 있습니다.
   - 이 사이트에 가입한 사람마다 **각자 본인 키**로 돌아갑니다(서로의 글은 발행되지 않음).
   - cron-job.org 무료 규칙: 작업당 1분 1회, 응답 30초 초과 시 실패, 실패 25번 넘으면 작업 자동 정지(프로그램이 예약할 때마다 다시 켬), API 하루 100회.

### A. Vercel 유료(Pro) 구독자 — Vercel 예약 호출 켜기 (선택)
1. 프로그램 폴더에서 PowerShell을 엽니다(탐색기 주소창에 `powershell` → Enter).
2. 실행: `powershell -ExecutionPolicy Bypass -File KIT\enable-vercel-cron.ps1` (맥: `bash KIT/enable-vercel-cron.sh`)
3. 스크립트가 `vercel.json`에 1분 예약 호출을 넣고 환경변수 `TCO_PLATFORM_SCHEDULER=on`을 등록한 뒤 다시 배포합니다.
4. 사이트 → **API키등록·플랫폼연동 → ⏰ 예약 발행**에서 「Vercel 예약 호출」을 고르면 cron-job.org 키 없이 예약할 수 있습니다(회원마다 선택, 고르지 않은 회원은 기본 cron-job.org 그대로).
   - 무료 요금제에서 실행하면 배포가 실패합니다 → `KIT\vercel.json`을 프로그램 폴더로 다시 복사해 되돌리고 B를 쓰세요.

> 2026-10-19 이전에 설치했다면 Supabase SQL Editor에서 `KIT/upgrade-20261019-cronjob.sql`을 한 번 실행하세요(키 이름 허용 + 예약 실행 표). 30일 지난 미디어 정리는 `vercel.json`의 하루 1번 자동 실행으로 돌아갑니다(무료 플랜 허용, A·B와 무관).

---

## 7. (선택) 내 도메인 연결

1. Vercel → 프로젝트 → **Settings → Domains → Add** → 내 도메인 입력(예: `threads.hong.com`)
2. 안내대로 도메인 회사 DNS에 기록 추가(보통 `CNAME` → `cname.vercel-dns.com`, 루트 도메인은 `A` → `76.76.21.21`) → Vercel에서 **Valid** 확인
3. 주소가 바뀌었으니 아래를 **새 주소로** 고칩니다.
   - Vercel **Environment Variables**의 `NEXT_PUBLIC_SITE_URL` → 수정 후 **Redeploy**
   - Meta 앱 리디렉션 콜백 URL에 새 주소 콜백 **추가**
   - 사이트 설정 → ⏰ 예약 발행에서 **cron-job.org 키를 한 번 더 저장**(새 주소로 예약 작업이 다시 만들어짐 — cron-job.org 콘솔에 예전 주소의 작업이 남아 있으면 삭제)
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
| 예약 글이 안 올라감 | 설정 → ⏰ 예약 발행에 cron-job.org 키가 「등록됨」인지, 보관함 위 상태 줄이 「일시정지됨」이 아닌지, cron-job.org 콘솔의 예약 작업 최근 실행이 성공(200)인지(401이면 키를 다시 저장하면 새 연결값으로 다시 만들어짐) |
| 빌드 실패 `JavaScript heap out of memory` | 다시 실행하거나 다른 프로그램을 닫고 실행 |
| 설정을 바꿨는데 반영 안 됨 | Vercel 환경변수는 바꾼 뒤 **Redeploy**해야 반영 |
| 빌드 실패 `file is too long` / `TurbopackInternalError` (윈도우) | 폴더 경로가 너무 깁니다. `D:\work\my-threads`처럼 **짧은 경로**로 폴더를 옮긴 뒤 다시 실행 |

---

## 9. 비용 안내

- Supabase·Vercel·Meta·cron-job.org: 무료 플랜으로 시작할 수 있습니다.
- AI(OpenAI·Gemini 등) 요금은 **본인 키로 쓴 만큼** 각 회사가 청구합니다. 이미지 생성은 글보다 비쌉니다.
- 토스쇼핑 연동은 고정 IP 프록시(Fixie, 유료)가 필요해 기본 설치에서는 쓰지 않습니다.

---

## 업데이트 내역 (배포판 번호 기준)

| 배포판 | 프로그램 버전 | 바뀐 점 | DB(SQL) 작업 |
|---|---|---|---|
| v1.02 (2026-10-20) | v2.09 → v2.14 | 예약 안정화 — 「내 cron-job.org」 전환·재개가 실패하면 이전 상태로 되돌림, 일시정지를 먼저 저장(cron-job.org 끄기 실패해도 일시정지 회원은 실행 안 함), 상태 줄이 새로고침 없이 갱신, 방식이 바뀐 뒤 남은 cron-job.org 작업 자동 정리 | **없음** — 새 코드로 다시 배포만 하면 됩니다 |
| v1.01 (2026-10-20) | v2.09 | 첫 번호 배포판 — 패키지 설치마법사, 예약 방식(본인 cron-job.org 기본) | 처음 설치 시 `KIT/schema.sql` (2026-10-19 이전 설치자는 `KIT/upgrade-20261019-cronjob.sql`) |
