# Anthropic 예제 앱 모음(claude-quickstarts) — AIMaster 응용 분석 보고서

> **3줄 요약**
> 1. **가장 쓸모 있는 예제는 `financial-data-analyst`(AI가 데이터를 읽고 차트 명세를 도구 호출로 돌려주는 구조)** — `shop-order-report`에 「질문하면 차트로 답하는 AI 분석」을 붙이기 좋고, Next.js + TypeScript라 거의 그대로 옮길 수 있습니다.
> 2. **두 번째는 `customer-support-agent`의 「구조화 응답」**(답변 + 감정 + 분류 + 추천 질문 + 사람 연결 필요 여부를 한 번에) — `comment-inbox`·`instagram-comment-reply` 답변 초안과 `ai-doc-chatbot`(Claude 공급자 추가)에 응용합니다. 원본의 Amazon Bedrock 검색은 가져오지 않습니다.
> 3. **세 번째는 `managed-agents/daily-brief`의 「무인 실행 실패 처리 원칙」**(출처별 책갈피·중복 방지 장부·못 읽은 출처는 「읽지 못함」으로 보고) — 코드 없이 정기 알림 프로그램의 점검표로 씁니다. 나머지는 회원 서비스에 바로 쓰기 어렵거나 AIMaster에 이미 더 나은 것이 있습니다.

- 분석일: 2026-11-11 · 방법: 소스 읽기만(실행·설치·API 호출·빌드 없음, 비용 0) · 작성: 세션 `claude-win-rea`(분석은 하위 에이전트)
- 원본: `C:\Users\Administrator\claude-marketplaces\claude-quickstarts` (커밋 `4a4224b`, 2026-11-06)
- 따른 규칙: `CLAUDE.md` 「외부 소스 분석·이식 규칙」, 「회원 본인 API 키」 최상위 규칙, 「기본 AI = Claude」
- 이 보고서는 분석만 했습니다. 코드·DB·다른 문서는 바꾸지 않았습니다.

## 1. 라이선스 확인

| 범위 | 라이선스 | 근거 파일 | 이식 조건 |
|---|---|---|---|
| 저장소 전체 | MIT (2023 Anthropic) | `LICENSE` | 옮긴 파일 머리 주석에 출처 + 프로그램 폴더 `NOTICE.md`에 MIT 전문 |
| `computer-use-demo/` | MIT (2024 Anthropic, PBC) | `computer-use-demo/LICENSE` | 같음 |
| `browser-use-demo/` 일부 | Playwright 수정본, Apache 2.0 | `browser-use-demo/NOTICE` | 쓰지 않음 |
| `managed-agents/assistant-ui/components/` 등 | assistant-ui 복사 컴포넌트, MIT (AgentbaseAI) | `managed-agents/assistant-ui/components/NOTICE.md` | 쓰면 함께 표기 |
| `managed-agents/self-hosted-sandboxes/openshell-policy/` | NVIDIA OpenShell 별도 | 같은 폴더 `NOTICE`·`third_party/openshell/LICENSE` | 쓰지 않음 |

→ 허용 라이선스이므로 「새로 짜지 말고 원본 코드를 최대한 옮겨 쓴다」에 해당합니다. 단, 원본은 서버 환경변수 `ANTHROPIC_API_KEY` 하나로 모든 요청을 처리하므로 **회원 본인 키(`user_api_keys` provider `anthropic`)로 바꾸는 부분은 반드시 고칩니다.**

## 2. 예제별 비교표

| 예제 | 하는 일 | 기술 | 핵심 기능 목록 | AIMaster 비슷한 프로그램 | 상위 쪽 | 적용 가능성 | 비용·키 요소 |
|---|---|---|---|---|---|---|---|
| `financial-data-analyst` | 파일을 올리고 질문하면 분석 + 차트로 답하는 채팅 | Next.js 14, TS, `@anthropic-ai/sdk` v1, Recharts, shadcn/ui, pdf.js | 도구 `generate_graph_data`(차트 6종) JSON 스키마 / 차트 종류별 쓰임새 지시문 / 파일 base64 첨부 / 브라우저 PDF 글자 추출 / 차트 렌더러(추세 %·제목·바닥글) / 모델 선택 | `shop-order-report`(자체 SVG 위젯, AI는 리뷰 요약만·Gemini), `ai-task-planner`(성과 차트 + Gemini) | AI가 질문을 해석해 차트를 돌려주는 기능은 **원본**(AIMaster에 없음). 집계 정확도·개인정보는 **AIMaster** | **높음** | 회원 본인 Claude 키, 운영자 비용 없음 |
| `customer-support-agent` | 지식 문서 근거로 답하는 고객 응대 챗봇 | Next.js, TS, Claude, **Amazon Bedrock KB**, zod | 근거 검색(상위 3) / 근거 없으면 사람 연결 / JSON 응답: `response`·`thinking`·`user_mood`(6종)·`suggested_questions`·`matched_categories`·`redirect_to_agent` / 분류표 JSON / 출처 표시 / 단계별 소요 시간 | `ai-doc-chatbot`(Upstage 임베딩·Tavily·출처·커스텀 봇, Claude 없음), `comment-inbox`·`instagram-comment-reply` | 검색·출처·웹검색은 **AIMaster**, 감정·분류·사람 연결 응답 구조는 **원본** | **높음**(응답 구조만) | 회원 Claude 키. Bedrock(AWS 유료)은 제외 |
| `agents/` | 300줄 교육용 에이전트 뼈대 | Python, `anthropic`, `mcp` | 도구 반복 루프 / 토큰 기준 대화 자르기 / 프롬프트 캐시 / 서버 도구(웹검색·코드 실행) / MCP / think 도구 | `ai-work-workspace`(맞춤 에이전트·MCP·정시 실행·회원 키·월 상한) | **AIMaster** | 낮음(코드) / 중간(자르기·캐시 아이디어) | 회원 키 |
| `autonomous-coding` | Agent SDK로 여러 세션에 걸쳐 앱 자동 개발 | Python, Claude Agent SDK | 초기화 + 코딩 2단 에이전트 / git 진행 저장 / 명령어 허용 목록 훅 | 회원 프로그램 없음 | 회원 서비스와 무관 | 낮음 | 몇 시간 실행, 비용 큼 |
| `browser-toolset` | 브라우저 도구 묶음(`browser_toolset_20260801`) 최소 예제 | Py·TS, CDP | 탭 조작 5종 / 주소 허용 정책 / 실행 전 확인 | 크롬 확장 자동 입력(결정적) | 목적 다름, 안정성은 **AIMaster** | 낮음 | 화면 토큰 비용 큼 |
| `browser-use-demo` | Playwright 브라우저 조작 도커 데모 | Py, Streamlit, Playwright, Docker | DOM 참조 클릭·폼·글자 추출·캡처 | `web-crawler-saas`(구조 재사용·robots 준수) | **AIMaster** | 낮음 | 운영자 서버 필요 |
| `computer-toolset` | 컴퓨터 도구 묶음 최소 예제(VNC) | Py·TS | 화면 조작 10종 / 실행 전 확인 | 없음 | — | 낮음 | 가상 데스크톱 필요 |
| `computer-use-demo` | 리눅스 데스크톱 조작 도커 데모 | Py, Streamlit, Docker | 컴퓨터·편집기·셸 도구 | 없음 | — | 낮음 | 서버·토큰 비용 큼 |
| `computer-use-best-practices` | 맥 화면 조작 에이전트 교본 | Py, pyautogui, Playwright | 도구 명시 / 화면 크기 맞춤 / 오래된 이미지 제거 / 캐시 / 대화 압축 / 묶음 동작 / 실행 기록 | 없음 | — | 낮음(회원) / 중간(나중 참고서) | 비용 큼 |
| `managed-agents/assistant-ui` | 엑셀·CSV를 샌드박스 pandas로 분석, 명령마다 승인 | Next.js, assistant-ui, Managed Agents, Files API | 세션=대화 목록 / 이벤트 재생 / 도구별 카드 / bash 승인 / 파일 연결 | `shop-order-report`, `file-merge` | 분석 깊이 **원본**, 개인정보·비용 통제 **AIMaster** | 중간(보류) | 회원 키 + 샌드박스, 회원 조직마다 에이전트 생성 필요 |
| `managed-agents/chat-sdk` | 웹검색 연구원 채팅 | Vercel Chat SDK, Managed Agents | 대화 ID=세션 ID / 다른 메신저로 이동 | `ai-doc-chatbot`, `kakao-auto-posting` | 비슷 | 낮음 | 회원 키 |
| `managed-agents/copilot-kit-ag-ui` | 재무 상담 + 대화형 차트 | CopilotKit, AG-UI | 도구 호출=화면 컴포넌트 / 즉시 재계산 | `shop-order-report` | 아이디어는 **원본** | 낮음~중간 | 회원 키 |
| `managed-agents/daily-brief` | 매일 아침 Slack·GitHub 요약 예약 에이전트 | 예약 실행, 기억 저장소, 금고 | **출처별 책갈피 / 중복 방지 장부 / 못 읽은 출처는 「읽지 못함」 / 게시 확인 후 기록 / 설정은 읽기 전용** | `kakao-auto-posting`, `realty-listing-alert`, `commercial-land-trade-alert`, `ai-work-workspace` 정시 비서 | 원칙은 **원본**, 실행 기반은 **AIMaster** | **높음(원칙만)** | 비용 없음 |
| `managed-agents/knowledge-wiki` | 문서 묶음을 위키로 정리 후 질문 응답 | Py 노트북, 기억 저장소 | `[출처 \| 기준일]` / 충돌 보존 / 대체된 수치 보존 / 질문당 비용 약 1/15 | `ai-doc-chatbot` | 큰 문서 **원본**, 작은 개인 문서 **AIMaster** | 중간(나중) | 구축 1회 약 $16~19 |
| `managed-agents/linear`·`slack` | @부르면 답하는 연결 다리 | Bun, 웹훅 | metadata 경로 저장 | 없음 | — | 낮음 | 회원 키 |
| `managed-agents/mcp-server-typescript` | 세션 API를 MCP 도구 9개로 | Bun, MCP | 세션 생성·전송·대기 | 없음 | — | 낮음 | — |
| `managed-agents/roadtrip-planner` | 여행 계획 + 검토 에이전트 | Next.js, Managed Agents | 실시간 미리보기 / 외부 키 위치 주입 / 세션별 모델 / 두 번째 에이전트 검토 | 블로그 검수 단계 | 검토 아이디어 **원본** | 낮음~중간 | 회원 키 ×2 |
| `managed-agents/self-hosted-sandboxes` | 자체 서버 샌드박스 | 다양 | 작업 대기열 | 없음 | — | 낮음 | 운영자 인프라 |
| `managed-agents/sentry`·`sentry-autofix` | 오류 순위·자동 수정 PR | Sentry MCP | 매일 보고 / 수정 PR | 없음(Sentry 미사용) | — | 낮음 | Sentry 유료 |

근거(원본): `financial-data-analyst/app/api/finance/route.ts`(도구 스키마 23~90행, 지시문 209행~), `financial-data-analyst/components/ChartRenderer.tsx`, `financial-data-analyst/utils/fileHandling.ts`, `customer-support-agent/app/api/chat/route.ts`(응답 스키마 22~45행), `customer-support-agent/app/lib/utils.ts`, `customer-support-agent/app/lib/customer_support_categories.json`, `agents/agent.py`, `agents/utils/history_util.py`, `autonomous-coding/security.py`, `managed-agents/README.md`와 하위 README, `managed-agents/assistant-ui/agents/spreadsheet-analyst.md`.
근거(AIMaster): `docs/PROGRAM_CAPABILITY_MAP.md` 목록 표 #3·#28·#84·#86·#89·#92와 카드(`ai-doc-chatbot`, `web-crawler-saas`, `shop-order-report`, `comment-inbox`), `ai-doc-chatbot/src/lib/compatibleChat/config.ts`(Groq·OpenRouter·Cloudflare, Claude 없음), `ai-work-workspace/src/litpage/server/agents/tools.ts`·`src/litpage/server/ai/models.ts`, `shop-order-report/package.json`(차트 라이브러리 없음, `src/components/report/Widgets.tsx`).

## 3. 적용 후보 상세

### 후보 A — 주문·매출 리포트에 「질문하면 차트로 답하는 AI 분석」 (원본 `financial-data-analyst`)
| 항목 | 내용 |
|---|---|
| 대상 | `shop-order-report`(v1.06), 나중에 `ai-task-planner` 재사용 가능 |
| 가져올 기능 | `generate_graph_data` 스키마(차트 6종) · 차트별 쓰임새 지시문 · 차트 렌더러 · 모델 선택 |
| 가져오지 않을 것 | 원본 파일 통째 전송 → **회원 PC에서 계산된 집계표만** 보냄. pdf.js 원격 로드 |
| 이식 | 가능(MIT). 스키마·지시문·렌더러는 거의 그대로, API 라우트에 회원 키 + `checkProgramAccessApi` 추가. 렌더러는 Recharts 추가 또는 자체 SVG에 맞춤(결정 2). `NOTICE.md`·출처 주석 |
| 회원 키 규칙 | `anthropic` 회원 본인 키만, 없으면 등록 안내(폴백 없음). 질문 기록을 남기면 회원별·30일 정리 |
| 기본 AI | 새 기능은 Claude, 기존 Gemini 리뷰 요약은 그대로 |
| 원본보다 낫게 | 숫자는 집계표 값만 쓰게 지시(환각 방지), `json_schema` 구조화 응답, 재시도 0 |
| 작업량 | 2~3일 · 빌드 1회 |

### 후보 B — 댓글·DM 초안에 「감정·분류·사람 확인 필요」 표시 (원본 `customer-support-agent` 응답 구조)
| 항목 | 내용 |
|---|---|
| 대상 | `comment-inbox`(급한 순 정렬) + `instagram-comment-reply`·`threads-comment-reply`·`youtube-auto-reply` |
| 가져올 기능 | 한 번 호출로 초안 + 감정 6종 + 프로그램별 분류 + 사람 확인 필요 여부·이유 + 추천 후속 질문 |
| 쓰임 | 불만·사람 확인 필요를 맨 위로, 분류 필터, 부정 감정은 자동 게시 제외 |
| 이식 | 스키마·지시문 구조만(MIT). 「`{`로 시작시키기 + 정규식 정리」 대신 `json_schema`. Bedrock 제외 |
| 회원 키 규칙 | 맞음. 세 프로그램의 현재 공급자를 플랜 때 확인 |
| 공용 기준 코드 | 「응대 분류 응답 스키마」를 기준 코드 하나로(`docs/SHARED_MODULES.md` 절차) |
| 작업량 | 기준 1일 + 프로그램당 0.5~1일 · 빌드 3~4회(순차) |

### 후보 C — 문서 챗봇에 Claude 공급자 + 추천 질문·근거 없음 처리
| 항목 | 내용 |
|---|---|
| 대상 | `ai-doc-chatbot`(v1.09) |
| 현재 | Upstage Solar + Groq·OpenRouter·Cloudflare, **Claude 없음**. 검색·출처·웹검색은 이미 원본보다 위 |
| 가져올 기능 | Claude 공급자(회원 `anthropic` 키) · 추천 후속 질문 3개 · 근거 사용 여부 · 봇별 질문 분류 |
| 추가 개선 | `agents/utils/history_util.py`의 토큰 기준 대화 자르기 + 마지막 메시지 캐시를 TS로 이식(MIT) |
| 작업량 | 1~2일 · 빌드 1회 |

### 후보 D — 무인 정기 실행 「실패 처리 원칙」 점검표 (원본 `managed-agents/daily-brief`)
| 항목 | 내용 |
|---|---|
| 대상 | `docs/AUTOMATION_MINIMAL_SETUP_POLICY.md` 동작 조건 절에 추가 → 이후 `kakao-auto-posting`·`realty-listing-alert`·`commercial-land-trade-alert`·`ai-work-workspace` 정시 비서에 적용 |
| 원칙 | 출처별 「어디까지 읽었는지」 책갈피 / 보낸 항목 장부 / 못 읽은 출처는 「읽지 못함」 알림 / 발송 확인 후에만 기록 / 회원 설정은 에이전트가 못 고치는 곳에 |
| 이식 | 코드 없음. 기존 「결과 불확실하면 재실행 금지」「모든 자동 동작 기록」을 구체화 |
| 작업량 | 문서 0.5일 · 빌드 0 |

### 참고 후보 E — 보류 권장
| 후보 | 원본 | 보류 이유 |
|---|---|---|
| 엑셀 분석 에이전트 | `managed-agents/assistant-ui` | 회원 Anthropic 조직마다 에이전트·환경 생성 필요, 주문이 서버 샌드박스로 올라가 「주문은 회원 PC에만」 결정과 충돌. 후보 A로 충분 |
| 지식 위키 | `managed-agents/knowledge-wiki` | 구축 1회 약 $16~19, 현재 회원 사용 형태(30개·4MB)와 안 맞음 |
| 두 번째 에이전트 검토 | `managed-agents/roadtrip-planner` | 아이디어로만, 호출 2배 |
| AI 화면 조작 | `computer-*`·`browser-*` | 4절 참조 |

## 4. 하지 않을 것과 이유
| 하지 않을 것 | 이유 |
|---|---|
| 서버 환경변수 키 하나로 회원 요청 처리 | 최상위 규칙 위반 |
| 클라이언트가 보낸 `model` 그대로 사용 | 비용 폭증 위험, `docs/AI_MODEL_CATALOG.md` 허용 목록으로 제한 |
| Amazon Bedrock KB 검색 | 회원마다 AWS·IAM·KB 필요·유료, AIMaster Supabase + Upstage가 쉬움 |
| `{`로 시작시키고 정규식으로 JSON 정리 | 최신 모델에서 불안정·미지원 가능, `json_schema`로 대체 |
| 화면 조작 도구로 크롬 확장 자동 입력 대체 | 확장이 더 안정·저렴, 화면 토큰 비용 큼, 원본도 샌드박스 전용 경고(웹페이지 속 지시 위험), 서버 비용 |
| `agents/` 뼈대를 새 기반으로 | `ai-work-workspace`가 상위 |
| `autonomous-coding` 회원 기능화 | 개발 도구, 비용 큼 |
| `browser-use-demo` Playwright 수정본 | Apache 2.0 + 도커 서버, `web-crawler-saas`가 상위 |
| Slack·Linear·Sentry 예제 | 회원 대상 아님, Sentry 미사용 |
| `self-hosted-sandboxes` | 운영자 서버 부담 |

## 5. 주인님 결정 항목
| 번호 | 결정할 것 | 선택지 | 권장 |
|---|---|---|---|
| 1 | 적용 범위 | A만 / A+B / A+B+C / A~D 전부 | A~D 전부, 한 작업씩 D → A → C → B |
| 2 | 후보 A 차트 방식 | Recharts+shadcn 추가 / 자체 SVG에 맞춤 | Recharts(원본 이식 규칙·작업량 절반) |
| 3 | 후보 A 전송 데이터 | 집계표만 / 주문 원본 일부 | 집계표만 |
| 4 | 후보 B 범위 | 받은편지함 표시만 / 세 프로그램 초안까지 | 세 프로그램 초안까지(+ Claude 추가 여부 함께) |
| 5 | 후보 C 모델 | Haiku / Sonnet | 둘 다 선택지, 기본은 중가 균형 |
| 6 | 보류 후보 E | 보류 / 사전 검증 페이지 | 보류 |
| 7 | 외부 개발분석표 등록 | 카드 추가 / 안 함 | 승인 시 총괄표 1줄 + 카드 1개 |

비용(예상): 이번 분석은 비용 없음. 시험 호출은 Haiku로 최소 횟수(1달러 미만 예상, 실행 직전 다시 여쭘). 배포 빌드는 총 5~6회(순차, 실행 전 승인). 운영자 인프라 비용 없음. 회원은 본인 Claude 키 사용료(질문당 수 센트 이하)를 부담하며 화면에 비용을 안내합니다.

## 6. 다음 첫 단계
1. 결정 1~7의 답을 받습니다.
2. 첫 후보 프로그램 폴더에 `docs/PLAN_YYYYMMDD_*.md`(원본 / AIMaster / 채택·이유 표)를 만들어 보여 드립니다.
3. 이식할 때 `NOTICE.md`(MIT 전문, 원본 커밋 `4a4224b`)와 옮긴 파일의 머리 출처 주석을 추가합니다.
