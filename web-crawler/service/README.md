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

## 배포 (Render.com, 아직 미배포 — 사용자 승인 필요)

`service/Dockerfile`을 루트로 하되 빌드 컨텍스트는 **`web-crawler/` 전체**로 잡아야 한다
(상위 `scripts/`, `requirements.txt`를 함께 COPY하기 때문). Render 대시보드에서 "Root
Directory"는 비워두고 Dockerfile 경로만 `service/Dockerfile`로 지정할 것.

환경변수: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`(service role — RLS 우회),
`WEB_CRAWLER_SERVICE_SECRET`(Next.js와 공유하는 시크릿, `threads`의 `CRON_SECRET`과
동일한 패턴).
