# web-crawler-saas 백엔드 (FastAPI)

이 폴더는 이 저장소 최상위의 크롤링 엔진(`scripts/`)을 그대로 재사용하는 얇은 웹 API다.
`web-crawler/webapp/`(Next.js 프론트엔드, 같은 `web-crawler/` 서브프로젝트 폴더 안에 위치 —
개발·유지보수·업그레이드는 전부 `web-crawler/` 폴더 하나에서 이뤄진다)가 회원의 작업
요청을 받아 여기로 넘기면, 이 서비스가 실제 크롤링을 수행하고 Supabase에 결과를 직접
기록한다.

## 왜 별도 서비스로 분리했나

Playwright 헤드리스 브라우저 실행은 Vercel Node 서버리스에 맞지 않는다. 이미 완성된
Python 크롤링 엔진(안티봇 사다리, 도메인 프로필, PII 감지, 엑셀 출력 등)을 그대로 살리기
위해 별도의 관리형 컨테이너 호스팅(Render.com 등)에 이 서비스만 배포한다. 자세한 배경은
`C:\Users\Administrator\.claude\plans\imperative-sparking-flute.md`(설계 계획, 승인됨)
참고 — 요약하면 threads-affiliate-poster의 Fixie 고정IP 도입과 같은 성격의 트레이드오프다.

## Phase 1 범위 — 중요한 제약

- **"사다리 A"(자동 접근 차단이 없는 사이트)만 지원한다.** robots.txt가 막았거나
  CAPTCHA/WAF 등 소프트블록이 감지되면 즉시 작업을 실패 처리한다 — 원본 CLI 도구처럼
  "우회할지 확인"을 묻는 대신, 사람이 실시간으로 없는 자동화 서비스라 아예 시도하지
  않는다. 통지-확인 UI(사다리 B 대응)는 Phase 2.
- **정찰(사이트 구조 파악)을 LLM 1회 호출로 자동화한다** (`llm.py`의
  `extract_selectors()`) — 회원 본인의 AI 키(OpenAI/Gemini)로 페이지 HTML을 분석해
  반복 아이템 셀렉터 + 필드 매핑을 뽑아낸다. 원본 도구는 이 판단을 AI 에이전트가
  대화하며 했지만, 이 서비스는 사람 개입 없이 1회 호출로 대체한다 — **이 저장소에서
  가장 새로운/미검증 로직**이다. 실제 다양한 사이트로 테스트하며 프롬프트를 계속
  다듬어야 할 가능성이 높다.
- 도메인 프로필 캐시(`fingerprints/`)는 Phase 1에서 아직 연동하지 않았다(재정찰 비용을
  줄이는 최적화이지 정확성 문제는 아니라서 후순위로 미룸) — Phase 2 후보.

## 로컬 실행

```bash
# 저장소 루트(web-crawler/)의 .venv를 그대로 재사용
cd web-crawler
./.venv/Scripts/python.exe -m pip install -r service/requirements.txt
cd service
set SUPABASE_URL=...
set SUPABASE_SERVICE_ROLE_KEY=...
set WEB_CRAWLER_SERVICE_SECRET=...
..\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

## 배포 (Render.com) — ✅ 배포 완료 (2026-09-05)

`web-crawler-saas-service`라는 이름으로 Render Web Service(Docker, Oregon 리전,
$7/month·0.5 CPU·512MB RAM 플랜)에 배포됨. Live URL: `https://web-crawler-saas-service.onrender.com`.

**실제 동작한 설정값** (Render가 "Next.js 감지, 필드 자동 채움"을 하면서 최초 시도 때
아래 실수가 있었다 — 다음에 재배포/재설정할 때 참고):
- **Root Directory는 반드시 빈칸으로 둘 것.** `web-crawler`를 넣으면 Render가 그 뒤
  Dockerfile Path/Docker Build Context Directory까지 전부 그 기준 상대경로로 다시
  해석해서 `web-crawler/web-crawler`라는 존재하지 않는 경로를 찾다가 빌드가
  `exit status 1`로 실패한다 (`lstat ... no such file or directory`).
- Root Directory를 비우면 Render의 "Verify Settings" 팝업이 Docker Build Context
  Directory를 `.`(레포 루트)로 자동 리셋하는데, 이것도 틀린 값이다 — 다시
  **`web-crawler/`**로 고쳐야 한다 (Dockerfile의 `COPY requirements.txt`,
  `COPY scripts/` 등이 이 폴더 기준 상대경로이기 때문).
- 최종 정답: Root Directory 빈칸 / Dockerfile Path `web-crawler/service/Dockerfile` /
  Docker Build Context Directory `web-crawler/` — 전부 저장소 실제 루트(`aimaster`) 기준
  경로다.
- Health Check Path는 `/health`(코드의 실제 라우트)로 지정. 화면에 예시로 뜨는
  `/healthz`는 placeholder일 뿐 실제 경로가 아니다.

환경변수(Render 대시보드에 등록 완료): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
(service role — RLS 우회), `WEB_CRAWLER_SERVICE_SECRET`(Next.js와 공유하는 시크릿,
`threads`의 `CRON_SECRET`과 동일한 패턴).

`webapp/`은 Vercel `buylife` 팀에 `web-crawler-saas` 프로젝트로 배포됨
(`https://web-crawler-saas.vercel.app`) — `vercel deploy --prod`(CLI 업로드) 방식,
이 저장소의 다른 서브프로젝트와 동일. Production 환경변수 6종(`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_MAIN_SITE_URL`,
`WEB_CRAWLER_SERVICE_URL`, `WEB_CRAWLER_SERVICE_SECRET`)은 Vercel 프로젝트 설정에
등록 완료.

`programs` 카탈로그(루트 AIMaster 사이트)도 완성 처리함: `is_active=true`,
`required_grade_id`=일반 등급(가입한 모든 회원이 등급과 무관하게 이용 가능 — 이 플랫폼에
일반보다 낮은 등급이 없어 사실상 "일반 이상"이면 전체 허용과 동일), `description`/`app_url`
(`https://web-crawler-saas.vercel.app`)/`badge`("new") 채움, `thumbnail_url`은
`docs/PLATFORM_PATTERNS.md` §12·§13 방식(Gemini 나노바나나 직접 호출 → `program-images`
버킷 업로드 → 실사 스타일 프롬프트 템플릿)으로 생성해 반영함 — 재생성 시 동일 스크립트
(`scripts/generate-program-thumbnail.mjs <slug> <geminiUserId> "<프롬프트>"`) 재사용.
DB 값이라 root 앱 재배포 없이 바로 `buylife.xyz/programs/web-crawler-saas`에 반영 확인함
(2026-09-05).

**참고**: 루트 `.env.local`의 `SUPABASE_SERVICE_ROLE_KEY`가 신형(`sb_secret_...`) 포맷으로
바뀌어 있는데, 이 값으로 `scripts/generate-program-thumbnail.mjs`를 실행하면
"Unregistered API key" 오류가 난다 — 원인 미확인(다른 서브프로젝트의 구형 JWT 포맷
service_role 키는 동일 프로젝트에 정상 동작함). 다음에 이 스크립트를 다시 쓸 때는 루트
`.env.local`의 키가 여전히 안 먹으면, `threads/.env.local` 등 다른 서브프로젝트의 JWT
포맷 `SUPABASE_SERVICE_ROLE_KEY`를 임시로 대신 써서 실행할 것.
