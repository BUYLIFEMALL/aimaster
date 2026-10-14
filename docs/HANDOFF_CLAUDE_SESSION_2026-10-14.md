# Claude Code 작업 인수인계 — 2026-10-14 세션 (신규 프로그램 4종 + 할 일·성과 관리 개선)

> 작성: Claude Code (주인님 지시 "인수인계 문서 만들어줘", 2026-10-14)
> 읽는 순서: 루트 `CLAUDE.md` → `docs/HANDOFF.md`(날짜별 기록) → `docs/ERROR_LESSONS.md` → **이 문서(세션 전체 요약·남은 일)** → 각 프로그램 `AGENTS.md`·`docs/CLI_HANDOFF.md`.
> 이 문서는 추가 전용입니다. 새 작업이 생기면 맨 아래에 날짜 절을 덧붙이고 기존 내용은 지우지 않습니다.

---

## 1. 한눈에 보기

| 프로그램 | 버전 | 운영 주소 | 한 줄 요약 | 커밋 |
|---|---|---|---|---|
| **reverse-prompt** (AI 리버스 프롬프트 자동화) | v1.01 | https://reverse-prompt.buylife.xyz | 이미지·영상·오디오 → 대상 도구별 프롬프트 JSON, 기록·편집·내보내기 | b356d034 |
| **thumbnail-master** (AI 썸네일 마스터 자동화) | v1.01 | https://thumbnail-master.buylife.xyz | 주제·타겟 → A/B 전략·문구가 박힌 유튜브 썸네일 2종, 수정·버전·프로젝트 저장 | 752e9c8b(플랜) da268b36 |
| **banana-canvas** (AI 바나나 캔버스 자동화) | v1.02 | https://banana-canvas.buylife.xyz | 생성·편집·합성·배경 제거·증명사진·인생 앨범·만화·스토리·레시피, 한 화면 대시보드 | 2dc3c6de(플랜) 31009777 d4591b97 |
| **blog-keyword** (AI 블로그 키워드 자동화) | v1.02 | https://blog-keyword.buylife.xyz | 자동완성·연관검색어·상위 블로그·경쟁력·오늘의 전략·다각도·뉴스·트렌드·프롬프트 50 | 16d75017(플랜) 1779c0ab 77010cdc |
| **ai-task-planner** (할 일·성과 관리) | v1.04 → v1.05 | https://ai-task-planner.buylife.xyz | 대시보드 가독성·레이아웃 정리, 성과 노트 세로 확장 | ecd45c72 |

공통 사실: 위 신규 4종은 모두 같은 골격(Next.js 16 App Router, React 19, `@supabase/ssr`, `@google/genai`)이며 `thumbnail-master`에서 복사해 파생했습니다. 새 프로그램을 또 만들 때는 가장 최근 것(`blog-keyword`)을 복사하면 `access.ts`·`proxy.ts`·사이드바·키 관리까지 그대로 따라옵니다.

---

## 2. 프로그램별 핵심

### 2-1. reverse-prompt
- 이미지·영상·오디오(업로드 파일) → 대상 도구(Midjourney·Veo·Suno 등)별 프롬프트 JSON. 결과 편집·기록·내보내기.
- Vercel 4.5MB 본문 제한 때문에 파일은 비공개 Storage를 거치고 서명 URL로 처리합니다.

### 2-2. thumbnail-master
- 원본: "썸네일 마스터 AI Pro"(GPT PARK, 순수 클라이언트 앱). 코드는 복제하지 않고 흐름만 참고.
- 모델: 텍스트 `gemini-3.5-flash → 2.5-flash`, 이미지 `gemini-3-pro-image-preview → gemini-2.5-flash-image`. 이미지는 응답에 싣지 않고 Storage 저장 후 서명 URL.
- 상세: `thumbnail-master/AGENTS.md`, `docs/CLI_HANDOFF.md`.

### 2-3. banana-canvas
- 원본: AI Studio Banana Canvas. v1.02에서 탭을 없애고 1열(원본·생성·빠른 작업) / 2열(편집·합성·앨범·만화) / 3열(결과 고정) 한 화면으로 재구성.
- 모델이 마스크를 흑백이 아니라 회색 사진으로 돌려주는 문제는 초록 배경 치환 + 가장자리 연결 크로마키로 해결(상세는 `banana-canvas/docs/CLI_HANDOFF.md`).

### 2-4. blog-keyword (이번 세션 마지막 작업)
- 원본: AI Studio "키워드 파이터 for Gemini" 2종(원본, 네이버 API 버전; 개발자 AIFACT GPT-PARK). 코드는 복제하지 않고 기능 구조만 참고. 열린 프록시·브라우저 키 난독화·접속마다 날씨 호출은 가져오지 않음.
- 이름은 주인님이 "AI 블로그 키워드 자동화"로 확정. 플랜 때 폴더 `keyword-fighter` → `blog-keyword`로 변경(플랜 문서의 옛 이름은 승인 전 표기).
- 구조: `src/lib/kw/`(순수 로직·프롬프트·네이버·기능 실행), `src/app/api/analyze`(기능 실행+저장), `/api/history`, `/api/keys`(+`/test`), 작업대 `components/kw/Workbench.tsx`.
- 키: 회원 본인 `gemini`, `naver_client_id/secret`, 선택 `naver_ads_*`(공용 `user_api_keys`의 기존 provider, 제약 변경 없음). 폴백 없음. 자동완성 목록만 Gemini 키 없이 허용.
- 네이버: API HUB를 먼저 호출하고 401/403/404면 구방식(openapi.naver.com)으로 폴백(`kw/naver.ts`). 운영자 본인 키로 상위 블로그·뉴스·트렌드·실측 지표 실호출 확인 완료.
- AI 추정(점수)과 실측(문서 수·월간 검색수·검색 추이)을 화면에서 구분 표기.
- v1.02: 카테고리 트렌드 빈출어 불용어 보강·표본 100건.

### 2-5. ai-task-planner v1.05
- 3열 재배치(왼쪽 할 일 목록 / 가운데 추가+성과+차트 / 오른쪽 AI 분석+성과 노트). 성과 노트 `min-height: max(560px, 100dvh - 380px)`.
- 테스트가 의존하는 클래스(`.overview-task-list` 등)와 저장 문구는 유지. 차트 높이는 126px로 맞춰야 눈금 검사가 통과.

---

## 3. 등록·운영 공통 절차 (신규 프로그램 체크리스트 — blog-keyword 기준)

1. 폴더 복사 → `src/lib/version.ts`(이름·slug·v1.01)·`src/lib/access.ts`(slug) **반드시 수정**(과거 두 번 옛 이름이 남아 재배포한 사고 있음, `ERROR_LESSONS.md`).
2. DB: `supabase/migrations/0001_*.sql`(테이블, RLS owner-only) 적용 → `0002_register_program.sql`(`programs` + 요금제 3종 1/2/3개월 10,000/20,000/30,000 + VIP 등급 접근).
3. `vercel link --yes --project <slug> --scope buylife` → `scripts/add-<slug>-vercel-env.mjs`(공용 Supabase 3종) → `vercel deploy --prod --yes --scope buylife` → `vercel domains add <slug>.buylife.xyz <slug> --scope buylife`.
4. 썸네일: `node scripts/generate-program-thumbnail.mjs <slug> 168ac841-2223-4a24-930d-c789cd79c8c9 "<§13 템플릿 프롬프트>"` (한국인 실사 16:9, 이미지 안 글자 없음).
5. 키 매뉴얼: `platform_guides`에 게시글 등록 후 id를 `src/lib/guides.ts`에 연결(네이버 키 2건: 검색·데이터랩 `8f201233-b2f6-4da0-851c-f045bdb5f9c7`, 검색광고 `8be38787-dacf-4921-9800-83159c9001be`; Gemini `f442cd37-f1e0-42a7-a3de-f9a9acf47cc4`).
6. 검수: 단위 시험 → 보이는 Chrome 하네스(모의 API) → 실제 호출(운영자 본인 계정 키) → 운영 화면 로그인 상태 실행 → 테스트 데이터 삭제.
7. 문서: 프로그램 `AGENTS.md`·`docs/CLI_HANDOFF.md`, 루트 `docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`(추가만) — 다른 CLI의 미커밋 변경이 섞이지 않게 HEAD 블롭에 삽입하는 스크립트 방식(`<프로그램>/test-artifacts/stage-docs*.mjs`)을 사용.

---

## 4. 이번 세션에서 배운 점 (상세는 `docs/ERROR_LESSONS.md` 2026-10-14 절)

- 셸 here-doc에 한글·따옴표·정규식이 든 파일 내용을 넣으면 깨진다(`"\n"`이 실제 줄바꿈으로 확장, `unexpected EOF`). 파일은 Write/Edit 도구로, python 스크립트도 파일로 저장해 실행.
- Supabase MCP `execute_sql`은 한 번에 한 문장. 삭제는 대상 id를 확인한 뒤 반환값으로 검증.
- `@google/genai`는 환경변수 `GOOGLE_API_KEY`/`GEMINI_API_KEY`가 둘 다 있으면 경고만 하고, 생성자에 넘긴 `apiKey`가 우선한다(가짜 키 실패 시험으로 확인).
- 네이버 검색·데이터랩은 2026-07-31부터 신규 발급이 NAVER API HUB. 개발자센터 문서가 아니라 API HUB 기준으로 구현.
- 구글 검색 그라운딩 호출은 `responseSchema`(JSON 모드)와 함께 쓸 수 없다 → 텍스트에서 JSON을 꺼내 항상 정규화하고 1회 재시도. 정규화 함수는 "값 없음"과 "0"을 구분해야 한다(`num()` 버그 사례).
- 모델이 점수만 주면 실측처럼 보이므로 화면에서 "AI 추정"과 "실측"을 반드시 구분 표기.

---

## 5. 남은 일

| # | 항목 | 비고 |
|---|---|---|
| 1 | 일반 회원(buylifemall@naver.com) 계정으로 로그인한 화면 확인 — 신규 4종 + ai-task-planner | 비밀번호 입력은 에이전트가 하지 않음. 주인님 로그인 후 이어서 확인 |
| 2 | blog-keyword: 회원 본인 네이버 키가 없을 때 `needNaver` 안내 문구 확인 | 모의 시험으로만 확인됨 |
| 3 | blog-keyword: 빈출어 노이즈가 남으면 `src/lib/kw/util.ts` STOPWORDS 보강 | 최신순 100건 표본 특성 |
| 4 | 메인 사이트 카탈로그(`/programs`)에서 신규 4종 카드·썸네일 노출 확인 | DB 값은 확인 완료, 화면은 미확인 |
| 5 | 후속 아이디어 | blog-keyword → naver-blog-allinone 글 초안 연결, 키워드 클러스터 맵, 정기 리포트 |
| 6 | 작업 폴더의 미커밋 변경 | `codex-statusbar/`, `scripts/analyze_*` 등은 다른 CLI 작업물이므로 건드리지 않음 |

---

## 6. 주의
- 작업 폴더는 Codex 등 다른 CLI와 공유한다. 커밋은 항상 명시한 경로만 스테이징하고, `git add -A`를 쓰지 않는다.
- `blog-keyword/.env.local`은 `vercel link` 때 Vercel이 덮어쓴 파일이며 `.gitignore`로 제외돼 있다(커밋 대상 아님).
- `test-artifacts/`는 각 프로그램 `.gitignore`에 있어 커밋되지 않는다(실호출 스크립트·스크린샷 포함).


---

## 7. 추가 작업 — AI 글쓰기 에디터 자동화 (`ai-writing-editor` v1.02, 2026-10-14)

| 항목 | 값 |
|---|---|
| 운영 주소 | https://ai-writing-editor.buylife.xyz |
| 원본 | AI Studio "매직 에디터 (Magic Editor)" — 글쓰기 도구(이미지 편집 아님). 코드는 복제하지 않고 기능 구조만 참고 |
| 핵심 | 형식 9종 초안 생성(+인터넷 검색 출처) · 플로팅 툴바 문장 수정(5동작+직접 지시) · 글 분석 제안(분류·적용 시점 위치 재탐색·모두 적용) · 되돌리기 · 자동 저장 · 내보내기 |
| 검수 | 단위 11/11, Chrome 14/14, 실제 Gemini 5종, 운영 화면 생성·수정·분석 |
| 상세 | `ai-writing-editor/AGENTS.md`, `ai-writing-editor/docs/CLI_HANDOFF.md` |
| 주의 | 사고 토큰이 `maxOutputTokens`에 포함됨 → 짧은 호출도 한도를 넉넉히(수정 6,144) 하고 `truncated`는 적용하지 않는다 |
| 남은 일 | 일반 회원 계정 로그인 확인, 인터넷 검색 출처 보장 한계, 리치 텍스트 서식 에디터(후속) |


### 7-1. v1.03 — 서식 에디터 (2026-10-14)
- Tiptap(`@tiptap/* 3.31.4`) 서식 에디터로 교체. 마크다운 저장 유지, 버블 툴바(AI 수정 5동작+직접 지시+굵게·기울임), 서식 도구줄, 서식 복사(HTML+텍스트), .md/.html/.txt, Tiptap 이력 기반 실행 취소.
- 핵심 구현: `src/lib/we/pmText.ts`(문서 위치 찾기), `components/editor/{Editor,RichToolbar,BubbleToolbar}.tsx`. 검수: 단위 14/14, Chrome 15/15, 운영 확인. 상세는 `ai-writing-editor/AGENTS.md`·`docs/CLI_HANDOFF.md`.
