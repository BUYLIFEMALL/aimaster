# INSTA 포스팅 자동화 — 설치 안내서 (독립 운영판)

> 강의용 설치 키트 · 2026-10-18 · 윈도우·맥 공통
> 내 컴퓨터에 압축을 풀고 → 내 계정(Supabase·Vercel·Meta)으로 설정하면 → **내 사이트에서 인스타 캡션·이미지 생성, 즉시·예약 게시**까지 됩니다.
> AIMaster와 연결되는 부분은 없습니다. 모든 계정·키·데이터는 수강생 본인 것입니다.

함께 들어 있는 파일

| 파일 | 내용 |
|---|---|
| `KIT/README.md` | 이 설치 안내서 |
| `KIT/PLATFORMS.md` | 플랫폼별 가입·API 키 발급 상세(Meta·Instagram·OpenAI·Gemini 등) |
| `KIT/schema.sql` | 새 Supabase DB에 한 번 붙여넣는 전체 구조 |
| `KIT/env.example` | 설정값(환경변수) 목록과 설명 |
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
| **인스타그램 프로페셔널 계정** | 인스타 앱 → 설정 → 계정 유형 → **비즈니스 또는 크리에이터**로 전환 | 무료 |
| **Gemini API 키** | 카드뉴스·피드 이미지 생성(결제 연결 필요) | 사용한 만큼 |
| **OpenAI 또는 Claude 키** | 캡션·해시태그 생성 | 사용한 만큼 |
| (선택) Perplexity 키 | 실시간 주제 수집 | 사용한 만큼 |
| (선택) cron-job.org | 예약 게시 실행 | 무료 |
| (선택) 내 도메인 | | 연 1~2만 원대 |

> ⚠ **개인 인스타 계정은 자동 게시가 안 됩니다**(Meta 정책). 반드시 비즈니스/크리에이터 계정으로 전환하세요.
> 모든 가입은 **본인 이메일**로 합니다.

---

## 1. 압축 풀기 · 폴더 정하기

1. 압축 파일을 풉니다. 이 프로그램은 `insta_auto_poster` 폴더입니다.
2. 원하는 곳으로 옮깁니다. 예: 윈도우 `D:\work\my-insta`, 맥 `~/work/my-insta`
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

- Supabase **Table Editor**에 `insta_posts` 등이 보이고, `https://내주소/login`에서 **회원가입 → 로그인**이 되면 설치 성공입니다.

**(선택) 내 계정을 관리자로**: Supabase SQL Editor에서
`update public.profiles set is_admin = true where email = '내이메일@example.com';`

> 마법사가 안 될 때만(고급): `KIT/env.example`을 `.env.local`로 복사해 값을 채우고 `npm install` → `npm run build` → `npx vercel@latest deploy --prod` 후 Vercel **Settings → Environment Variables**에 같은 값을 넣고 다시 배포합니다. **AI 코딩 도구에 설치를 맡기지 말고** 마법사를 직접 실행하세요(마법사는 사람이 답을 입력하는 방식입니다).

---

## 4. Meta 앱 만들기 (Instagram 로그인 방식 권장) — 상세는 `KIT/PLATFORMS.md` 1번

요약:
1. developers.facebook.com → **앱 만들기** → 이용 사례 **"Instagram에서 메시지 및 콘텐츠 관리"** → 앱 생성
2. 이용 사례 → 맞춤 설정 → **Instagram 로그인이 포함된 API 설정**
   - **4. Instagram 비즈니스 로그인 설정 → OAuth 리디렉션 URI**: `https://내주소/api/instagram/callback/byok` → 저장
   - 같은 화면 위쪽 **Instagram 앱 ID / Instagram 앱 시크릿 코드** 복사
3. **앱 역할 → 역할 → Instagram 테스터**에 내 인스타 계정 추가 → 인스타 **설정 → 앱 및 웹사이트 → 테스터 초대 → 수락**
4. **앱 설정 → 기본 설정 → 앱 도메인**: `내주소의 도메인`(예: `hong-insta.vercel.app`) → 저장

> 내 사이트 **API키등록·플랫폼연동** 맨 위 **「내 Meta 앱에 등록할 주소 한눈에 보기」** 카드에 내 주소가 복사 버튼과 함께 나옵니다.

---

## 5. 프로그램에 키 등록 · 인스타 계정 연결

내 사이트 → 좌측 **API키등록·플랫폼연동**
1. **Instagram 앱 ID / Instagram 앱 시크릿 코드** 저장 → 초록색 **Instagram 로그인 방식으로 연결하기** → 인스타 로그인·허용
2. **Gemini API 키**(이미지), **OpenAI 또는 Claude 키**(캡션) 저장
3. (선택) Perplexity 키(실시간 주제 수집)

**첫 게시 시험**: **게시글 관리 → + 새 게시글 작성**에서 주제 입력 → 캡션·이미지 생성 → **즉시 게시** → 내 인스타 피드에 올라오면 완료.

---

## 6. 예약 게시 연결

1. https://cron-job.org 가입 → **CREATE CRONJOB**
2. URL: `https://내주소/api/posts/dispatch-scheduled`
3. Execution schedule: **Every 5 minutes**
4. **ADVANCED → Headers**: Key `Authorization`, Value `Bearer 내CRON_SECRET` (`.env.local`에 있음)
5. 저장 → **TEST RUN** → `200`이면 완료(`401`이면 Authorization 값 확인)

---

## 7. (선택) 내 도메인 연결

1. Vercel → **Settings → Domains → Add** → 안내대로 DNS 등록(`CNAME` → `cname.vercel-dns.com` / 루트는 `A` → `76.76.21.21`) → **Valid**
2. 새 주소로 고칠 곳: Vercel `NEXT_PUBLIC_SITE_URL`(수정 후 **Redeploy**) · Meta **OAuth 리디렉션 URI 추가** · Meta **앱 도메인 추가** · cron-job.org URL · 내 `.env.local`
3. 프로그램에서 **Instagram 로그인 방식으로 연결하기**를 한 번 더 누릅니다.

---

## 8. 자주 막히는 곳

| 증상 | 확인 |
|---|---|
| "가입 확인 메일" 안내가 뜸 | Supabase Email → **Confirm email 끄기** |
| 연결 시 "Invalid platform app" / 앱 ID 오류 | **Instagram 앱 ID**(Instagram 로그인 API 설정 화면)를 넣었는지 — Meta 앱 ID와 다름 |
| 연결 시 "리디렉션 URI" 오류 | Meta에 등록한 주소가 `https://내주소/api/instagram/callback/byok`와 **완전히 같은지**, `NEXT_PUBLIC_SITE_URL`이 실제 주소인지 |
| 연결은 되는데 게시 실패 | 인스타가 **비즈니스/크리에이터** 계정인지, 테스터 초대를 **수락**했는지 |
| 이미지 생성 실패 | Gemini 키와 **결제 연결**(이미지는 무료 한도 없음), 사용량: https://aistudio.google.com/usage |
| 예약 글이 안 올라감 | cron-job.org 응답 200인지, Authorization 값 |
| 설정을 바꿨는데 반영 안 됨 | Vercel 환경변수는 바꾼 뒤 **Redeploy** |
| 빌드 실패 `file is too long` / `TurbopackInternalError` (윈도우) | 폴더 경로가 너무 깁니다. 바탕화면·다운로드 안 깊은 곳 말고 `D:\work\my-insta`처럼 **짧은 경로**로 폴더를 옮긴 뒤 다시 실행 |

---

## 9. 비용 안내
- Supabase·Vercel·Meta·cron-job.org는 무료 플랜으로 시작할 수 있습니다.
- AI 요금은 본인 키로 쓴 만큼 각 회사가 청구합니다(이미지가 글보다 비쌈).
