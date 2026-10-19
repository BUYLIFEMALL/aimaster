# Threads 쇼핑제휴 자동화 — 설치 키트 안내 (수강생용)

쿠팡파트너스·알리익스프레스·토스쇼핑·네이버 브랜드커넥트 제휴 상품으로 Threads 홍보 글을 AI가 써 주고, **내 Threads 계정에 바로 또는 예약 게시**하는 웹 프로그램입니다.
이 안내를 처음부터 순서대로 따라 하면 **내 Supabase·Vercel·Meta 계정**에 나만의 프로그램이 만들어집니다. AIMaster와 연결되는 부분은 없습니다.

- 소요 시간: 약 1시간(Meta 앱 만들기 포함)
- 비용: Supabase·Vercel **무료 요금제로 시작**할 수 있습니다. AI·제휴 API 요금은 각자 본인 키로 냅니다(9장).
- 표준 안내 순서는 AIMaster 배포 키트 공통입니다(다른 프로그램 키트도 같은 순서).

| 키트 안 파일 | 내용 |
|---|---|
| `KIT/README.md` | 이 설치 안내 |
| `KIT/schema.sql` | 새 Supabase에 한 번에 붙여넣는 전체 DB 파일 |
| `패키지설치마법사.cmd` / `.command` | **패키지 설치마법사** 실행 파일(윈도우 / 맥 — 더블클릭) |
| `KIT/setup.ps1` / `KIT/setup.sh` | 마법사 본체(직접 열 필요 없음) |
| `KIT/PLATFORMS.md` + `KIT/manuals/*.html` | 플랫폼별 가입·키 발급 매뉴얼(OpenAI·Gemini·Threads·쿠팡·알리·토스·네이버) |
| `KIT/enable-vercel-cron.ps1` / `.sh` | (Vercel 유료 Pro만) 사이트 단위 1분 예약 호출 켜기 |
| `KIT/DB_DESIGN.md`, `KIT/GUIDELINES.md` | DB 설계, 운영·개발 기본 지침(AI 코딩 도구용) |

---

## 0. 준비물 (처음 한 번)

| 준비물 | 용도 | 비고 |
|---|---|---|
| Node.js 22 LTS | 내 컴퓨터에서 설치·빌드 | https://nodejs.org (`node -v`로 확인) |
| Supabase 계정 | DB·로그인·이미지 저장 | https://supabase.com 무료 |
| Vercel 계정 | 웹 서버 | https://vercel.com 무료(Hobby)로 충분 |
| Meta 개발자 계정 | 본인 Threads 앱 | https://developers.facebook.com |
| AI 키 | 글·이미지 생성 | OpenAI 또는 Gemini(또는 Claude) |
| 제휴 키 | 상품·제휴 링크 | 쓰는 것만: 쿠팡파트너스·알리익스프레스·토스쇼핑(고정 IP 필요 — Fixie) |
| cron-job.org 계정 | 예약 게시 | 무료(6장) |

## 1. 압축 풀기 · 폴더 정하기

1. 압축 파일을 풉니다. 이 프로그램은 `threads-affiliate-poster` 폴더입니다.
2. 원하는 곳으로 옮깁니다. 예: 윈도우 `D:\work\my-tap`, 맥 `~/work/my-tap`
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
| ⑥ 내 사이트 설정 | 주소·비밀값 자동 생성 | 사이트 이름(영문, 주소가 됨) · 화면에 표시할 내 이름/브랜드 · **운영자 이름·연락 이메일**(약관 표시) · (선택) Fixie 주소(토스 안 쓰면 Enter) — 끝나면 Supabase **URL Configuration** 화면도 열어 주니 주소 두 칸을 저장 |
| ⑦ 설치·빌드 | 프로그램 설치·확인(3~5분) | 기다리기 |
| ⑧ 인터넷에 올리기 | Vercel 연결·설정 등록·배포, **실제 주소 자동 확인** | 브라우저에서 Vercel 로그인(처음이면 무료 가입) |

- 중간에 창을 닫아도 **다시 더블클릭하면 이어서** 진행합니다(처음부터 하려면 질문에 `n`).
- 끝나면 내 사이트가 열리고, 프로그램 폴더에 **`설치결과.txt`**(내 사이트 주소·Meta 앱에 등록할 콜백 주소)가 생깁니다. 콜백 주소는 클립보드에도 복사돼 있습니다.

---

## 3. 설치 확인 · (선택) 관리자 지정

- Supabase **Table Editor**에 `profiles`·`tap_posts` 등이 보이고, `https://내주소/login`에서 **회원가입 → 로그인**이 되면 설치 성공입니다.

**(선택) 내 계정을 관리자로**: Supabase SQL Editor에서
`update public.profiles set is_admin = true where email = '내이메일@example.com';`

> 마법사가 안 될 때만(고급): `KIT/env.example`을 `.env.local`로 복사해 값을 채우고 `npm install` → `npm run build` → `npx vercel@latest deploy --prod` 후 Vercel **Settings → Environment Variables**에 같은 값을 넣고 다시 배포합니다. **AI 코딩 도구에 설치를 맡기지 말고** 마법사를 직접 실행하세요(마법사는 사람이 답을 입력하는 방식입니다).

---

## 4. Meta(Threads) 앱 만들기 — 상세 `KIT/manuals/03_threads_connect.html`
1. developers.facebook.com → **앱 만들기** → 이름(「Threads」 같은 Meta 상표는 넣지 않기, 예 `my-tap-app`) → 이용 사례 **Threads API 액세스** → 비즈니스 **「아직 연결하고 싶지 않음」** → **앱 만들기**(Meta 약관 동의)
2. 이용 사례 → Threads API 액세스 → **설정**:

| 칸 | 값 |
|---|---|
| 리디렉션 콜백 URL | `https://<내 주소>/api/threads/callback` — 입력 뒤 **아래 뜨는 제안 항목을 클릭**해야 들어갑니다(Enter 아님) |
| 제거 콜백 URL | `https://<내 주소>/api/threads/uninstall` |
| 삭제 콜백 URL | `https://<내 주소>/api/threads/delete` |
| 개인정보처리방침·서비스 약관·데이터 삭제 안내 | `https://<내 주소>/legal/privacy` · `/legal/terms` · `/legal/data-deletion` |

3. 권한 `threads_basic`·`threads_content_publish`, **Threads 테스터**로 내 계정 추가 → Threads 앱 설정에서 초대 **수락**
4. 같은 설정 화면 맨 위 **Threads 앱 ID / Threads 앱 시크릿 코드**를 복사(맨 위의 일반 「앱 ID」가 아님 — 넣으면 4476002 오류)
   - 이미 Meta 앱이 있다면 새로 만들지 말고 리디렉션 콜백에 위 주소만 **추가**(기존 주소는 지우지 않기)

## 5. 키 등록 · 계정 연결 · 첫 게시
1. 내 사이트 `/signup`에서 가입 → 로그인 → 대시보드
   - (선택) 나를 관리자로: Supabase SQL Editor에서 `update profiles set is_admin = true where email = '내@이메일';`
2. **API키등록·플랫폼연동**: Threads 앱 ID·시크릿 → **계정 연결하기**, AI 키(OpenAI/Gemini/Claude), 쓰는 제휴 키(`KIT/PLATFORMS.md`)
3. **상품 관리**에서 상품 등록(제휴 링크 생성) → **새 게시글**: 상품 선택 → AI 글·이미지 생성(처음엔 가장 싼 모델로) → **즉시 게시** → 내 Threads에 올라오면 완료

## 6. 예약 게시 연결
> Vercel **무료(Hobby)는 자동 실행이 하루 1번뿐**이라, 1분마다 예약 글을 확인하려면 별도 연결이 필요합니다. 이 배포판의 **기본 방식은 「내 cron-job.org」(무료)** 입니다.

**기본 — 내 cron-job.org (가입한 회원마다 각자)**
1. https://console.cron-job.org/signup 가입 → 로그인 → **Settings → API → Create API key** → 복사(**IP 제한은 켜지 마세요**)
2. 내 사이트 **설정 → ⏰ 예약 발행** → 실행 방식 「내 cron-job.org · 기본값」 확인 → 아래 **cron-job.org API 키**에 저장
3. 새 게시글에서 예약하면 프로그램이 내 cron-job.org에 1분 작업을 **자동으로 만들고 켜며**, 남은 예약이 없으면 **자동으로 끕니다**. 게시글 목록 위 「⏰ 예약 발행」 줄에서 상태 확인·전체 일시정지/재개.

**선택 — Vercel 유료(Pro)**: `powershell -ExecutionPolicy Bypass -File KIT\enable-vercel-cron.ps1`(맥 `bash KIT/enable-vercel-cron.sh`) → 1분 예약 호출 + `TAP_PLATFORM_SCHEDULER=on` 등록·재배포 → 설정에서 「Vercel 예약 호출」을 고른 회원은 키 없이 예약.

> 30일 지난 글·이미지 정리는 무료 요금제 하루 1번 자동 실행으로 돌아갑니다(설정 불필요).

## 7. (선택) 내 도메인 연결
Vercel → Settings → Domains에 도메인 추가 → 안내대로 DNS 설정 → 그 주소로 `NEXT_PUBLIC_SITE_URL`(Vercel 환경변수) 변경·재배포, Supabase URL Configuration, Meta 콜백 주소를 모두 새 주소로 맞춥니다.

## 8. 자주 막히는 곳
| 증상 | 원인·해결 |
|---|---|
| 가입 후 로그인이 안 됨 | Confirm email이 켜져 있음 → 2-3단계 |
| 로그인 후 「이용 권한이 없습니다」 | `programs`에 `threads-affiliate-poster` 행이 없거나 `is_active=false` → `KIT/schema.sql`을 다시 확인 |
| 화면에 AIMaster 문구·링크 | `NEXT_PUBLIC_STANDALONE_MODE=true` 누락 또는 재배포 안 함 |
| Threads 연결 시 4476002 / 앱 ID 인식 불가 | 일반 앱 ID를 넣음 → 「Threads 앱 ID」로 |
| Threads 연결 후 원래 화면으로 안 돌아옴 | `NEXT_PUBLIC_SITE_URL`과 Meta 리디렉션 콜백 주소가 다름 |
| 이미지 생성은 되는데 게시 실패 | Storage `post-images`가 Public이 아님 |
| 예약 글이 안 올라감 | cron-job.org 키 미등록·IP 제한 켜짐, 실행 방식 확인(6장) |
| 토스 상품 조회 실패 | `FIXIE_URL` 미설정(토스는 고정 IP만 허용) |
| 사이트에 엉뚱한 화면이 뜸 | 폴더가 GitHub 저장소 안 → 저장소 밖으로 옮겨 다시 설치, 또는 `npx vercel@latest git disconnect --yes` |
| 빌드 실패 | 폴더 경로가 길거나 한글·공백 포함 → 짧은 경로로 옮기기 |

## 9. 비용 안내
- Supabase·Vercel·cron-job.org: 무료 요금제로 운영 가능(사용량이 커지면 각 서비스 요금제 확인)
- AI(OpenAI·Gemini·Claude)·이미지 생성: **본인 키로 사용량만큼** — 처음엔 가장 저렴한 모델로 시험
- 제휴 API(쿠팡·알리·토스): 무료(토스용 Fixie는 Fixie 요금제)

## 업데이트 내역
| 날짜 | 내용 | 이미 설치한 사람이 할 일 |
|---|---|---|
| 2026-10-19 | AIMaster 표준 `KIT/` 방식으로 개편(설치 스크립트·키 숨김 입력·GitHub 자동 연결 해제), 예약 발행 방식 선택(기본 cron-job.org) | DB: Supabase SQL Editor에서 새 `KIT/schema.sql`의 `tap_member_scheduler` 부분과 허용 목록(`cronjob_org_api_key`) 반영 — 새 설치는 해당 없음 |
