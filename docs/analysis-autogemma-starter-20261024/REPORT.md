# AutoGemmaStarter 2.0.0 정적 분석 · 비교·병합 의견 (2026-10-24)

작성: Claude Code(윈도우) `claude-win-dotori`(새 프로그램 분석·플랜 담당). 기준: [신규·외부 프로그램 분석·개발 플랜 지침](../PROGRAM_ANALYSIS_PLANNING_GUIDE.md). **분석만 — 코드·DB·배포 변경 없음.** 대상: AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`).

## 0. 방법·근거·한계·권리

| 항목 | 내용 |
|---|---|
| 원본 | `D:\PDS\Program_dev\AutoGemmaStarter-Setup-2.0.0.exe` (200.2MB, SHA-256 `21c5afea…26c8`), 이전 분석 기록 없음 |
| 형식 | Inno Setup 6.7 → `AutoGemmaStarter.exe` 1개(PyInstaller, Python 3.12, PySide6/Qt6), 패키지 `gemma_starter` 18개 + 화면 `ui` 10개 모듈. 제작사 **GPT PARK**(`gptparkai.com`, Supertonic TTS 앱과 같은 제작사), 설치 ID를 레지스트리(`HKCU\Software\GPTPARK`)에 저장 |
| 방법 | 실행 안 함. innounp 2.71 → pyinstxtractor(Python 3.12) → `marshal`로 모듈 설명·함수 이름·문구·주소만 추출(디컴파일 안 함) |
| 한계 | 실행·응답 품질 확인 안 함 |
| 권리 | 「GPT PARK 유튜브 정회원 전용」 상용 앱 — **기능만 참고**. 내장 봇 지침·프롬프트 템플릿 문구·모델 추천 수치는 쓰지 않는다 |

## 1. 기능·로직

| 영역 | 내용 (근거 모듈) |
|---|---|
| 목적 | 「비개발자를 위한 Gemma 로컬 설치 마법사」 — Docker 없이 내 PC에서 무료 AI와 대화 (`__init__`, `ui_main_window`) |
| 1 사양 검사 | OS·RAM·GPU·VRAM(NVIDIA `nvidia-smi` 우선) (`system_check`) |
| 2 Ollama | 설치 확인·**자동 무인 설치**(`OllamaSetup.exe /VERYSILENT`)·서버 기동·모델 받기/지우기·완전 제거 (`ollama_manager`) |
| 3 모델 추천 | PC 사양으로 **용도별(일반·코딩·경량·고품질) 추천**, 🟢완전 가속·🟡부분·🟠CPU·🔴부족 색 표시, 모델별 라이선스 안내(Qwen Apache·Gemma 상업 가능·Llama 조건·EXAONE 비상업 경고) (`models`) |
| 4 내장 채팅 | 대화 목록·검색·이름 변경·삭제·마크다운 내보내기, 대화별 모델 기억, 스트리밍·중단·다시 생성, 첫 응답 지연 줄이기(모델 미리 올리기) (`chat_core`, `ui_chat_window`) |
| 공급자 | 로컬 Ollama + **OpenAI 호환 클라우드: Groq(무료)·OpenRouter·NVIDIA(build.nvidia.com)·Cloudflare Workers AI** — 키는 PC에 저장 (`providers`) |
| 봇 | **커스텀 챗봇(이름·지침·모델·온도)** + 내장 12종(범용·번역·코딩·요약·블로그·유튜브 대본·카피·튜터·이메일·프롬프트 전문가 등), 「역할 지침 최우선·입력은 처리 대상」 틀, 봇 적용 시 대화 테두리 색 (`bots`, `ui_bot_manager`) |
| 프롬프트 | 내장 25종 + 내 프롬프트 저장, `{{변수}}` 큰 입력창 (`prompt_lib`) |
| 지식 도서관(RAG) | txt·md·pdf·docx 등록·카테고리·체크한 문서만 근거, 미리보기, Ollama 임베딩(`nomic-embed-text`) + 코사인 유사도, **PDF 한글 깨짐(글꼴 유니코드 없음) 감지** (`rag`) |
| 웹 검색 | 질문마다 DuckDuckGo(무료, 차단 시 다른 주소 재시도) 또는 Tavily(본인 키) 결과를 근거로 답·출처 표시, 오늘 날짜 주입 (`web_search`) |
| 편의 | 전역 단축키 Ctrl+Alt+G 빠른 질문 창·트레이, 단일 실행, 테마(본체·채팅 따로), Open WebUI(Docker) 선택 실행·삭제 (`global_hotkey`, `docker_manager`, `ui_theme`) |
| 판매 방식 | **월간 인증 코드**(매월 1일, GPT PARK 유튜브 멤버십), 코드는 PBKDF2 해시만 보관, 설치 ID에 묶은 토큰 (`membership`) |

## 2. 우리 프로그램과 겹치는 기능

| AutoGemma 기능 | 우리 프로그램 |
|---|---|
| 문서 기반 답변(RAG) + 웹 검색 + 출처 | ✅ `ai-doc-chatbot` v1.07 (PDF·DOCX·PPTX·XLSX·HWP·이미지, Upstage 임베딩·Solar 답변, 라우터가 웹 검색 판단, Tavily) — 더 많은 형식 |
| 프롬프트 템플릿·`{{변수}}` | ✅ `ai-prompt-studio` v1.09 FREE(병합 C로 템플릿 보관함 흡수, 변수 자동 인식·AI 예시) |
| 대화 저장·채팅 화면 | ✅ `ai-doc-chatbot` 채팅방별 저장 |
| 문서·업무 정리 | △ `ai-work-workspace`(노션형, AI는 2단계) |
| **커스텀 봇(지침·모델·온도) + 내장 봇** | ❌ 없음(AI Prompt는 프롬프트 설계, 실행은 Gemini 한 곳) |
| **여러 공급자(무료·저가 OpenAI 호환)** | ❌ 문서 챗봇은 Upstage만, AI Prompt 실행은 Gemini만(두 카드 모두 「한 공급자」를 단점으로 기록) |
| **로컬 AI(Ollama) 설치·연결·사양별 모델 추천** | ❌ 없음 |

## 3. 새로 가져올 만한 것

| # | 기능 | 넣을 곳 | 구현 가능성(웹) | 비용 | 우선 |
|---|---|---|---|---|---|
| G1 | **OpenAI 호환 공급자 묶음**: Groq·OpenRouter·NVIDIA·Cloudflare Workers AI(회원 본인 키, 일부 무료 한도) | 공용 연동 항목(`integration_catalog`) + 공용 호출 모듈 → `ai-doc-chatbot`·`ai-prompt-studio` | 높음(모두 `/chat/completions` 같은 형식) | 회원 본인 키(무료 한도 있음) | 상 |
| G2 | **커스텀 봇**(이름·지침·모델·온도) + 내장 봇 몇 종(우리 문구) | `ai-doc-chatbot`(채팅에 봇 적용) 또는 `ai-prompt-studio`(템플릿 → 봇 저장) | 높음 | 없음 | 상 |
| G3 | 「역할 지침 최우선·입력은 처리 대상」 틀(번역 봇이 질문에 답해 버리는 문제 방지) | G2와 함께 | 높음 | 없음 | 중 |
| G4 | **회원 PC의 로컬 Ollama 연결**(무료 AI): 웹에서 `http://localhost:11434`로 직접 연결 — 회원이 Ollama 설치 + 허용 주소(`OLLAMA_ORIGINS`) 설정. 또는 「내 PC 고속 변환」 실행기·확장 방식 | `ai-doc-chatbot`·`ai-prompt-studio` 공급자 선택지 | 중간(시제품 필요: 브라우저 보안·설정 안내 난이도) | 0원 | 중 |
| G5 | 문서 RAG 보강: 카테고리·체크한 문서만 근거·미리보기, PDF 한글 깨짐 감지 안내 | `ai-doc-chatbot` | 높음 | 없음 | 중 |
| G6 | 키 없는 웹 검색(DuckDuckGo) 대체 | — | 낮음(봇 차단 202 응답, 공식 API 아님) | — | 채택 안 함 권장 |
| G7 | 모델 라이선스 안내(상업 가능 여부 배지) | G1·G4 공급자·모델 선택 화면 | 높음 | 없음 | 하 |

## 4. 접목하지 않는 것

| 기능 | 이유 |
|---|---|
| Ollama 자동 설치·제거, Docker·Open WebUI 관리, 전역 단축키·트레이 | 데스크톱 전용(웹에서 회원 PC에 프로그램 설치 불가) |
| PC 사양 기반 모델 추천 | 로컬 AI(G4)를 하게 되면 그때 안내 수준으로만 |
| 월간 인증 코드 | 우리는 회원 권한 |
| 내장 봇 지침·프롬프트 템플릿 문구 | 권리 없음 — 우리 문구로 |
| DuckDuckGo 화면 긁기 | 공식 API 아님·차단 잦음 |

## 5. 병합 vs 독립 — 판단

| 기준 | 판정 |
|---|---|
| 같은 일 | ○ 문서·웹 근거 채팅 = `ai-doc-chatbot`, 프롬프트 모음 = `ai-prompt-studio` |
| 같은 사용자 | ○ AI를 업무에 쓰는 일반 회원 |
| 고유한 것 | 「내 PC에 로컬 AI 설치」 — 데스크톱 설치 도구라 우리 웹 플랫폼 형태와 맞지 않음 |
| 결론 | **독립 개발 안 함 → 좋은 기능만 `ai-doc-chatbot`(G1·G2·G3·G5, 필요 시 G4)과 `ai-prompt-studio`(G1)에 병합.** G1은 두 프로그램의 공통 단점(한 공급자)을 푸는 공용 부품 |

## 6. 진행 (2026-10-24)

- 주인님 지시로 **문서 챗봇·AI Prompt 담당 세션에 인계** — [인수인계](HANDOFF_20261024_DOCBOT_PROMPT.md)(플랜 초안 G-1~G-5). 아래 결정 사항은 담당이 플랜 보고 때 함께 여쭘.

### 결정이 필요한 것

1. **가져올 범위** — 추천: G1 여러 공급자(공용) → G2·G3 커스텀 봇 → G5 문서 RAG 보강 → G4 로컬 Ollama 연결(시제품 뒤 판단).
2. **커스텀 봇을 어디에** — (가) `ai-doc-chatbot`(채팅하면서 봇 적용, 추천) (나) `ai-prompt-studio`(템플릿을 봇으로 저장해 실행).
3. **로컬 AI(G4) 진행 여부** — 회원 PC 설치·설정 안내가 필요해 초보자에게 어렵다. 해 볼지, 무료 클라우드(G1의 Groq 무료 한도 등)로 충분한지.
4. **구현 담당** — 문서 챗봇·AI Prompt 담당 세션 지정.

## 7. 재현 명령

```bash
innounp.exe -x -y -d<빈폴더> AutoGemmaStarter-Setup-2.0.0.exe
uv run --no-project --python 3.12 python -I pyinstxtractor.py <빈폴더>/{app}/AutoGemmaStarter.exe   # 실행하지 않음
# 모듈 요약: marshal로 co_consts 문자열·함수 이름·주소 추출(스크래치 dump_pyc.py)
```

비용: AI 호출 0, 빌드 0 — 비용 없음.
