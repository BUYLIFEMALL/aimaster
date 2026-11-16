# Threads 포스팅 자동화 — 설치 안내서 (독립 운영판)

> 수강생 배포 키트 · 2026-11-16 · 윈도우·맥 공통
> 내 컴퓨터에 압축을 풀고 → 내 계정(Supabase·Vercel·Meta)으로 설정하면 → **내 사이트에서 Threads 글감 수집·AI 글+이미지 생성, 즉시·예약 게시**까지 됩니다.
> 다른 사이트와 연결되는 부분은 없습니다. 모든 계정·키·데이터는 수강생 본인 것입니다(키트에는 키·비밀번호·데이터가 하나도 들어 있지 않습니다).

함께 들어 있는 파일

| 파일 | 내용 |
|---|---|
| `KIT/README.md` | 이 설치 안내서 |
| `KIT/PLATFORMS.md` | 플랫폼별 가입·API 키 발급 상세(Meta Threads·OpenAI·Gemini·cron-job.org 등) |
| `KIT/schema.sql` | 새 Supabase DB에 한 번 붙여넣는 전체 구조(패키지 설치마법사가 자동 복사) |
| `KIT/enable-vercel-cron.ps1` / `.sh` | (선택) Vercel 유료(Pro)에서 Vercel 예약 호출 켜기 |
| `KIT/env.example` | 설정값(환경변수) 목록과 설명 — 값은 비어 있음 |
| `패키지설치마법사.cmd` / `.command` | **패키지 설치마법사** 실행 파일(윈도우 / 맥 — 더블클릭) |
| `KIT/setup.ps1` / `KIT/setup.sh` | 마법사 본체(직접 열 필요 없음) |

---

## 0. 준비물 (처음 한 번)

| 무엇 | 어디서 | 비용 |
|---|---|---|
| **Node.js 22 LTS** | https://nodejs.org → LTS 설치 (맥은 .pkg) | 무료 |
| **Supabase 계정** | https://supabase.com | 무료 플랜 |
| **Vercel 계정** | https://vercel.com | 무료(Hobby) |
| **Meta 개발자 계정** | https://developers.facebook.com | 무료 |
| **Threads 계정** | 휴대폰 Threads 앱 | 무료 |
| **OpenAI 또는 Gemini 키** | 글 생성(Gemini는 이미지까지) | 사용한 만큼 |
| (선택) Perplexity 키 | 실시간 주제 수집 | 사용한 만큼 |
| (선택) Pixabay·Pexels 키 | 글 첨부 무료 사진 | 무료 |
| (선택) cron-job.org | 예약 게시 실행(기본 방식 — 사이트에 API 키만 등록) | 무료 |
| (선택) 내 도메인 | | 연 1~2만 원대 |

> 모든 가입은 **본인 이메일**로 합니다.

---

## 1. 압축 풀기 · 폴더 정하기

1. 압축 파일을 풉니다. 이 프로그램은 `threads` 폴더입니다.
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
| ② Supabase 프로젝트 | 프로젝트 목록 열기(이미 조직이 있으면 그 조직의 [New project] — 새 조직 만들지 않기) | 이름·DB 비밀번호(Generate 후 메모)·지역 **Asia-Pacific** → 생성 → **주소창 주소 붙여넣기** |
| ③ Supabase 키 | API Keys 화면 열기, **맞는 키인지 자동 확인** | Publishable key → Secret key 순서로 붙여넣기(화면에 안 보임) |
| ④ DB 만들기 | 설치 SQL을 **클립보드에 복사**하고 SQL Editor 열기, 끝나면 **성공 여부 자동 확인** | 빈 칸 클릭 → 붙여넣기 → [Run] |
| ⑤ 이메일 확인 끄기 | Sign In / Providers 화면 열기 | Email → **Confirm email 끄기** → Save |
| ⑥ 내 사이트 설정 | 주소·비밀값 자동 생성 | 사이트 이름(영문, 주소가 됨) · 화면에 표시할 내 이름/브랜드 |
| ⑦ 설치·빌드 | 프로그램 설치·확인(3~5분) | 기다리기 |
| ⑧ 인터넷에 올리기 | Vercel 연결·설정 등록·배포, **실제 주소 자동 확인** | 브라우저에서 Vercel 로그인(처음이면 무료 가입) |

- 중간에 창을 닫아도 **다시 더블클릭하면 이어서** 진행합니다(처음부터 하려면 질문에 `n`).
- 끝나면 내 사이트가 열리고, 프로그램 폴더에 **`설치결과.txt`**(내 사이트 주소·Meta 앱에 등록할 콜백 주소)가 생깁니다. 콜백 주소는 클립보드에도 복사돼 있습니다.
- ⚠ **DB SQL은 반드시 새로 만든 빈 프로젝트에 실행**하세요. 다른 프로그램이 쓰던 프로젝트에 실행하면 같은 이름의 표와 부딪힙니다.

---

## 3. 설치 확인

- Supabase **Table Editor**에 `posts`·`threads_accounts` 등이 보이고, `https://내주소/login`에서 **회원가입 → 로그인**이 되면 설치 성공입니다.

> 마법사가 안 될 때만(고급): `KIT/env.example`을 `.env.local`로 복사해 값을 채우고 `npm install` → `npm run build` → `npx vercel@latest deploy --prod` 후 Vercel **Settings → Environment Variables**에 같은 값을 넣고 다시 배포합니다. **AI 코딩 도구에 설치를 맡기지 말고** 마법사를 직접 실행하세요(마법사는 사람이 답을 입력하는 방식입니다).

---

## 4. Meta(Threads) 앱 만들기 — 상세는 `KIT/PLATFORMS.md` 1번

요약:
1. developers.facebook.com → **앱 만들기** → 이용 사례 **"Threads API에 액세스"** → 앱 생성
2. 이용 사례 → 맞춤 설정 → 권한 **`threads_content_publish` 추가**
3. **설정** 탭에 주소 3개 → 저장
   - 리디렉션 콜백 URL: `https://내주소/api/threads/callback`
   - 제거 콜백 URL: `https://내주소/api/threads/uninstall`
   - 삭제 콜백 URL: `https://내주소/api/threads/delete`
4. **앱 설정 → 기본 설정 → 앱 도메인**: `내주소의 도메인`(예: `hong-threads.vercel.app`) → 저장
5. **앱 역할 → 역할 → Threads 테스터**에 내 Threads 계정 추가 → Threads 앱 **설정 → 계정 → 웹사이트 권한 → 초대 → 수락**

> 내 사이트 **API키등록·플랫폼연동** 맨 위 **「내 Meta 앱에 등록할 주소 한눈에 보기」** 카드에 내 주소가 복사 버튼과 함께 나옵니다.

---

## 5. 프로그램에 키 등록 · Threads 계정 연결 · 첫 게시

내 사이트 → 좌측 **API키등록·플랫폼연동**
1. **Threads 앱 ID / Threads 앱 시크릿 코드** 저장 → **Threads 계정 연결하기** → Threads 로그인·허용
2. **OpenAI 또는 Gemini 키** 저장(Gemini 키가 있으면 나노바나나 이미지도 생성)
3. (선택) Perplexity 키, Pixabay·Pexels 키

**첫 게시 시험**: **게시글 관리 → + 새 게시글 작성**에서 주제 입력 → 글·이미지 생성 → **즉시 게시** → 내 Threads에 올라오면 완료.

---

## 6. 예약 게시 연결 (정해진 시각에 자동 게시)

> Vercel **무료(Hobby)** 요금제는 자동 실행을 하루 1번만 허용합니다. 그래서 이 배포판의 **기본 방식은 B(내 cron-job.org)** 이고, Vercel 유료(Pro)라면 A를 켤 수도 있습니다. 「즉시 게시」는 아무 연결 없이도 됩니다.

### B. 기본 — 내 cron-job.org (무료, API 키만 등록)
1. https://console.cron-job.org/signup 에서 무료 가입 → 이메일 인증 → 로그인
2. 콘솔 **Settings → API** → **Create API key** → 키 복사 (**IP 제한은 켜지 마세요** — Vercel 서버 주소는 계속 바뀝니다)
3. 내 사이트 → **API키등록·플랫폼연동** → **⏰ 예약 발행** → 실행 방식이 「내 cron-job.org」인지 확인 → 아래 **cron-job.org API 키** 칸에 붙여 넣고 **저장**
4. 이제 **게시글을 예약**하면 프로그램이 내 cron-job.org에 1분 확인 작업을 **자동으로 만들고 켭니다**. 남은 예약이 없으면 **자동으로 끕니다**(콘솔의 작업 「Threads 포스팅 예약 발행(1분)」이 켜졌다 꺼졌다 하는 것이 정상).
5. **게시글 관리** 위 「⏰ 예약 발행」 줄에서 상태를 보고 **전체 일시정지 / 재개**를 할 수 있습니다.
   - 가입한 사람마다 **각자 본인 키**로 돌아갑니다. cron-job.org에는 사이트 비밀값(`CRON_SECRET`)이 아니라 **회원 전용 연결값**만 들어갑니다(프로그램이 자동으로 넣음 — 직접 작업을 만들지 마세요).
   - 예약 시각이 24시간 넘게 지난 글은 자동으로 올리지 않습니다.

### A. Vercel 유료(Pro) 구독자 — Vercel 예약 호출 켜기 (선택)
1. 프로그램 폴더에서 PowerShell을 엽니다(탐색기 주소창에 `powershell` → Enter).
2. 실행: `powershell -ExecutionPolicy Bypass -File KIT\enable-vercel-cron.ps1` (맥: `bash KIT/enable-vercel-cron.sh`)
3. 스크립트가 `vercel.json`에 1분 예약 호출을 넣고 환경변수 `ATP_PLATFORM_SCHEDULER=on`을 등록한 뒤 다시 배포합니다.
4. 사이트 → **⏰ 예약 발행**에서 「Vercel 예약 호출」을 고르면 cron-job.org 키 없이 예약할 수 있습니다.
   - 무료 요금제에서 실행하면 배포가 실패합니다 → B를 쓰세요.

---

## 7. (선택) 내 도메인 연결

1. Vercel → **Settings → Domains → Add** → 안내대로 DNS 등록(`CNAME` → `cname.vercel-dns.com` / 루트는 `A` → `76.76.21.21`) → **Valid**
2. 새 주소로 고칠 곳: Vercel `NEXT_PUBLIC_SITE_URL`(수정 후 **Redeploy**) · Meta **콜백 주소 3개·앱 도메인 추가** · 내 `.env.local` · 사이트 설정 → ⏰ 예약 발행에서 **cron-job.org 키를 한 번 더 저장**(새 주소로 작업이 다시 만들어짐 — 예전 주소 작업은 cron-job.org 콘솔에서 삭제)
3. 프로그램에서 **Threads 계정 연결하기**를 한 번 더 누릅니다.

---

## 8. 자주 막히는 곳

| 증상 | 확인 |
|---|---|
| "가입 확인 메일" 안내가 뜸 | Supabase Email → **Confirm email 끄기**(켜 둘 거면 마법사 마무리의 URL Configuration 저장) |
| 연결 시 "앱 ID를 인식할 수 없음" | **Threads 앱 ID**를 넣었는지 — 앱 대시보드 맨 위 Facebook 앱 ID와 다름 |
| 연결 시 "리디렉션 URI" 오류 | Meta에 등록한 주소가 `https://내주소/api/threads/callback`와 **완전히 같은지**, `NEXT_PUBLIC_SITE_URL`이 실제 주소인지 |
| 연결은 되는데 게시 실패 | 테스터 초대를 **수락**했는지, 권한에 `threads_content_publish`가 있는지 |
| 이미지 생성 실패 | Gemini 키와 **결제 연결**(이미지는 무료 한도 없음), 사용량: https://aistudio.google.com/usage |
| 예약 글이 안 올라감 | ⏰ 예약 발행에 cron-job.org 키가 「등록됨」인지, 상태 줄이 「일시정지됨」이 아닌지, 콘솔의 작업 최근 실행이 성공(200)인지(401이면 키를 다시 저장) |
| 설정을 바꿨는데 반영 안 됨 | Vercel 환경변수는 바꾼 뒤 **Redeploy** |
| 빌드 실패 `file is too long` / `TurbopackInternalError` (윈도우) | 폴더 경로가 너무 깁니다. `D:\work\my-threads`처럼 **짧은 경로**로 옮긴 뒤 다시 실행 |

---

## 9. 비용 안내
- Supabase·Vercel·Meta·cron-job.org·Pixabay·Pexels는 무료 플랜으로 시작할 수 있습니다.
- AI 요금은 본인 키로 쓴 만큼 각 회사가 청구합니다(이미지가 글보다 비쌈).
- 이미지는 매일 한 번 정리됩니다: 게시 완료 30일이 지난 글의 사진, 어떤 글에도 쓰이지 않는 30일 지난 파일(글 내용은 남음).

---

## 업데이트 내역 (배포판 번호 기준)

> **업데이트 방법**: 새 배포판을 예전 폴더 옆에 풀고 `패키지설치마법사`를 더블클릭 → 「예전에 설치한 같은 프로그램을 찾았습니다 … 업데이트할까요?」에 `y`. 아래 표에 SQL 작업이 「없음」이면 그대로 끝, 있으면 마법사가 ④단계에서 그 SQL을 안내합니다.

| 배포판 | 프로그램 버전 | 바뀐 점 | DB(SQL) 작업 |
|---|---|---|---|
| v1.02 (2026-11-16) | v1.34 | 첫 배포판(v1.01은 내부 시험본 — 제거·삭제 콜백에 빈 요청이 오면 오류 500 → 400으로 수정) — 독립 사이트(자체 가입·로그인), 패키지 설치마법사, 예약 방식(본인 cron-job.org 기본), Meta 제거·삭제 콜백 자체 처리 | 처음 설치 시 `KIT/schema.sql` |
