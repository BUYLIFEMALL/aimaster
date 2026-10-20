# AIMaster UI/UX 디자인 메인 지침 및 템플릿 카탈로그 (DESIGN.md)

> **최초 제정**: 2026-10-16 (주인님 지시)  
> **상태**: 최상위 불변 디자인 메인 지침 (Living Standard Document)  
> **적용 대상**: Claude Code, Codex, Antigravity(Gemini) 등 **모든 AI 코딩 에이전트 및 CLI 공통 필독**  
> **연계 문서**: [`docs/PROGRAM_DESIGN_STANDARD.md`](docs/PROGRAM_DESIGN_STANDARD.md) (상세 디자인 가이드), [`docs/SIDEBAR_LAYOUT_STANDARD.md`](docs/SIDEBAR_LAYOUT_STANDARD.md) (좌측 메뉴바 표준), [`docs/PROGRAM_CATEGORY_TEMPLATE_MAP.md`](docs/PROGRAM_CATEGORY_TEMPLATE_MAP.md) (카테고리별 템플릿 총람 및 선정 가이드), [`docs/DESIGN_TEMPLATE_GUIDE.md`](docs/DESIGN_TEMPLATE_GUIDE.md) (디자인 템플릿 마스터 가이드 및 레퍼런스 핸드북)

---

## ★★★ 디자인 최상위 불변 원칙 (2026-10-16 주인님 지시)

> **이미지 레퍼런스(2026-10-17 주인님 지시)**: 프로그램을 개발·업그레이드하면서 이미지(배경·썸네일·삽화·카드 이미지 등)를 AI로 생성하거나 편집할 때는 **AI 이미지 자동화(`ai-image-studio/`)에 구현된 모델·엔드포인트·호출 방식·이미지 받아오는 부분을 참고**한다. 이미지 생성 프롬프트(생성 방식·스타일·내용)는 프로그램별 고유 컨셉이라 공유하지 않으며, 새로 만들 때는 `docs/IMAGE_PROMPT_RULES.md`를 따른다(2026-10-17 정정). ai-image-studio가 이미지 자동화의 레퍼런스 프로그램이며 최신 모델을 유지한다(상세: 루트 `CLAUDE.md` 「이미지 생성 레퍼런스 규칙」).

1. **디자인 작업의 템플릿화 및 고유 명칭 의무**:
   - 모든 프로그램의 UI/UX 디자인 작업 시, 작업한 디자인 내용을 템플릿화하여 **"○○○ 스타일 템플릿"으로 고유 명칭(예: `포커스 스튜디오 스타일`, `사이버 네온 다크 콘솔 스타일` 등)을 정해 공식 명시**합니다.
   - 나중에 주인님께서 **"다른 프로그램에도 그 템플릿 스타일로 변경해달라"**고 요청하실 때, 어떤 CLI든 이 문서의 카탈로그를 보고 즉시 100% 동일한 톤앤매너와 완성도로 이식할 수 있도록 체계적으로 관리합니다.
2. **각 서브프로그램 폴더별 디자인 인수인계 문서 의무**:
   - 디자인 작업이 완료되면 반드시 해당 프로그램 폴더에 **`<프로그램>/docs/DESIGN_HANDOFF.md`**(디자인 개발완료 보고서: 적용 템플릿, 컬러 토큰, 컴포넌트 구조, 모바일 반응형 대응점, 주의사항)와 **`<프로그램>/docs/IMPROVEMENTS.md`**(디자인 중 발견된 로직/기능/편의성 개선과제)를 필수로 작성해 남깁니다.
3. **배경색 및 테마 표준**:
   - **기본 메인 테마**: **흰색(Light 테마)**과 **검정색(Dark 테마)**을 기본 메인으로 사용합니다.
   - **유연한 색상 채택**: 프로그램의 성격이나 업무 맥락에 따라 **차콜, 딥 네이비, 미드나잇 블루, 크림/아이보리, 세이지 등 최적의 몰입감을 주는 다른 배경 색상도 유연하게 적용**합니다 (예: 텍스트/문서 ➔ 소프트 화이트/크림, 미디어/캔버스/플레이어 ➔ 퓨어 블랙/다크 네이비).
4. **비주얼 인핸스먼트 & 사용 매뉴얼(/guide) 전면 시각화**:
   - 텍스트만 나열된 딱딱한 화면을 배제하고, **한국인 실사 사진, 프로세스 다이어그램, 친근한 캐릭터/아바타, 생동감 있는 이모티콘, 하이테크 키캡 치트시트**를 적극 활용합니다.
   - `/guide` 페이지는 단순 텍스트 줄글을 금지하며, 최소 4단계 파이프라인 다이어그램, 핵심 콘솔 배치도, 상태 칩을 포함하는 **시각적 비주얼 가이드북**으로 구성합니다.
5. **검수 브라우저 지정 준수**:
   - **Antigravity / Codex**: **Microsoft Edge(엣지) 전용** (`msedge`).
   - **Claude Code**: 메인 전용 Chrome.
   - 반드시 실제 브라우저를 띄워 데스크톱(1440px) 및 모바일(375px~390px, 햄버거 메뉴 ☰ 및 가로 넘침 없음) 화면을 직접 대조 검수합니다.
6. **작업 전 디자인 플랜 제시 및 주인님 사전 수락 의무 (2026-10-16 주인님 지시)**:
   - 어떤 서브프로그램이든 디자인 작업을 시작하기 전에 반드시 **디자인 작업 플랜, 비주얼 컨셉, 스타일 템플릿 명칭, 그리고 그렇게 만들려는 이유**를 명시하여 주인님께 먼저 제시합니다.
   - **항상 주인님의 확인과 수락(승인)을 받은 후에만** 실제 코드 구현을 시작하며, 임의로 플랜 승인 없이 먼저 코드를 수정하지 않습니다.
7. **이모티콘 및 아이콘의 프로그램 스타일 맞춤 색상화 (2026-10-16 주인님 지시)**:
   - 사이드바 메뉴, 헤더, 카드 등에 사용되는 이모티콘 및 아이콘(Lucide Icons 등)의 색상은 무채색(회색/단색)에 머물지 않고, **해당 프로그램의 스타일 템플릿 및 브랜드 컬러(예: 이커머스 로열 블루/오렌지, 수노 앰버/바이올렛, 사이버네온 사이언/퍼플 등)에 맞춰 유연하게 수정·적용**할 수 있습니다.
   - 사용자가 각 기능을 한눈에 직관적으로 이해할 수 있도록 열쇠(API키), 책(사용안내), 스튜디오(핵심기능), 로그아웃 등 상징적인 아이콘을 사용하고, 프로그램 고유의 아이덴티티와 톤앤매너를 살려 시각적 완성도를 극대화합니다.
8. **디자인 리뉴얼 착수 전 프로그램 분석 기반 플랜 및 개선사항 인수인계서 작성 의무 (2026-10-16 주인님 지시)**:
   - 디자인 리뉴얼에 착수하기 전, 반드시 대상 프로그램의 **기존 기능, 라우트, 비즈니스 로직, 데이터 흐름, 외부 연동 상태 등을 심층 분석**합니다.
   - 분석 결과를 바탕으로 **1) 디자인 리뉴얼 개발플랜 문서(`<프로그램>/docs/PLAN_YYYYMMDD_DESIGN_RENEWAL.md`)**와 **2) 프로그램 개선사항 제안 인수인계 문서(`<프로그램>/docs/IMPROVEMENTS.md` 및 `<프로그램>/docs/IMPROVEMENT_HANDOFF_YYYYMMDD.md`)**를 작성하여 **해당 프로그램별 서브폴더 안에 반드시 저장**합니다.
   - 생성된 문서는 해당 프로그램의 `AGENTS.md` 및 `README.md`에 즉시 연결하여, Antigravity CLI(agy)·Codex·Claude Code 등 **어떤 CLI가 작업하더라도 해당 폴더의 문서를 먼저 읽고 작업 흐름이 끊기지 않고 즉시 이어서 개발할 수 있도록 체계화**합니다.
9. **미구현 프로그램 발견 시 매뉴얼 메뉴 및 단계별 사용 매뉴얼 추가 기본 의무 (2026-10-16 주인님 지시)**:
   - 어떤 프로그램이든 작업(디자인 리뉴얼, 기능 수정, 디버깅, 점검 등) 중에 **좌측 사이드바에 사용 매뉴얼 메뉴가 없거나 가이드 페이지가 구현되지 않은 것을 발견하면, 이를 기본 필수 작업으로 간주하여 즉시 추가**합니다.
   - ① 좌측 사이드바 표준 위치(유틸리티 영역)에 **`📖 연동 & 사용 매뉴얼` (또는 `📚 사용 가이드`) 메뉴를 기본 추가**합니다.
   - ② 프로그램 사용법을 누구나 쉽고 자세하게 이해할 수 있도록 **단계별(Step-by-Step, 4~5단계) 시각적 파이프라인 구조로 친절하게 설명하는 프로그램 사용 매뉴얼 페이지(`/guide` 또는 `?tab=guide`)를 전면 구축**합니다.
   - ③ 매뉴얼 페이지에는 단순 줄글 텍스트를 금지하며, 프로세스 다이어그램, 단계별 핵심 설정 팁, 외부 플랫폼/API 연동법, 실전 활용 비법, 트러블슈팅 FAQ 아코디언을 필수로 포함합니다.
10. **작업 완료 시 결과·추가개선 항목별 정리, 프로그램 링크 제공 및 프로그램별 인수인계 문서 작성 의무 (2026-10-16 주인님 지시, 2026-10-17 제안항목 규격화)**:
    - 작업이 완료되면 항상 주인님께 결과 보고 시 **① 작업한 내용**과 **② 「추가개선 제안」(해당 프로그램 및 타 프로그램 탐색 제안)**을 항목별로 체계적으로 정리하여 보고하고, **③ 작업 프로그램의 실제 서비스 배포 링크(URL)**를 반드시 남깁니다.
    - **「추가개선 제안」 필수 3대 항목 (2026-10-17 주인님 지시)**:
      1. **프로그램 로직 및 기능 개선**: 핵심 생성/분석 파이프라인 알고리즘 최적화, 신규 기능 추가, 에러 방어 보강 등
      2. **사용자 인터페이스/UI 가독성, 사용편리성 개선**: 폰트/명도 대비, 컴포넌트 시각적 계층, 반응형 모바일 터치감, 인터랙션 피드백 등
      3. **현재 만들어져 있는 다른 자동화 프로그램과의 연계가능한 기능**: AIMaster 플랫폼 내 타 서브프로그램과의 데이터/워크플로우 연동 파이프라인
    - 또한 각각의 항목에 대한 상세 내용을 **해당 프로그램별 서브폴더 안에 인수인계 문서(`<프로그램>/docs/DESIGN_HANDOFF.md`, `<프로그램>/docs/IMPROVEMENTS.md`, `<프로그램>/docs/IMPROVEMENT_HANDOFF_YYYYMMDD.md`)로 반드시 남겨** 다른 CLI가 언제든 이어받을 수 있도록 체계화합니다.
11. **프로젝트 제안 및 보고 시 클릭 가능한 정확한 링크 제공 의무 (2026-10-16 주인님 지시)**:
    - 앞으로 어떤 프로그램이든 다음 작업 대상을 제안하거나 결과 보고를 할 때는, 사용자가 클릭했을 때 즉각 브라우저에서 열릴 수 있도록 **Supabase 공유 DB(`programs.app_url`) 및 Vercel에 정식 연결된 실제 공식 도메인 URL을 반드시 사전 확인한 후 링크를 제공**합니다.
    - 표(Table) 내부에서 `<br>` 태그로 텍스트와 링크를 함께 넣어 주소와 설명이 한 줄로 찌그러지거나 링크가 깨지는 현상을 엄격히 금지하며, **단독 줄의 명확한 마크다운 하이퍼링크(`[URL](URL)`) 또는 독립 카드형 불릿 레이아웃**으로 작성하여 클릭 한 번으로 새 창에서 안정적으로 접속할 수 있도록 합니다.
    - 새로운 도메인이 지정되거나 도메인 변경 요청이 있을 경우, Vercel Alias 및 SSL 인증서를 즉시 발급·연결하고 DB `programs.app_url`과 인수인계 문서를 동시에 갱신합니다.
12. **작업 종료 즉시 상태를 「✅ 1차 작업완료」로 변경 의무 (2026-10-16 주인님 지시)**:
    - 프로그램의 디자인 리뉴얼, 빌드, Vercel 배포, 브라우저 실세션 검수, 인수인계 문서 작성이 완료되면 **작업 종료 즉시 `DESIGN.md` 2절 전체 프로그램 디자인 현황판의 상태를 「✅ 1차 작업완료 (`vX.YY`, 템플릿명)」로 반드시 변경**합니다.
    - 동시에 `docs/ACTIVE_WORK.md`에서 작업 중 행을 삭제하여 다른 CLI(Antigravity, Codex, Claude Code)가 작업 완료 사실을 한눈에 확인하고 대기 없이 다음 프로그램 작업에 즉시 착수할 수 있도록 완벽히 동기화합니다.
13. **프로그램 내 전체 페이지 단일 배경색 및 일관된 테마 스타일 준수 의무 (2026-10-16 주인님 지시)**:
    - **하나의 자동화 프로그램 안의 모든 페이지(대시보드, 작업 스튜디오, 프로젝트/보관함 목록, 가이드/매뉴얼(`/guide`), 설정 등)는 반드시 동일한 배경색상과 통일된 디자인 템플릿 테마 스타일로 일관되게 구축**해야 합니다.
    - 특정 페이지만 다크/라이트 테마가 다르거나(예: 매뉴얼만 블랙이고 스튜디오/프로젝트는 화이트인 경우 등) 배경색이 어긋나는 화면 불일치를 엄격히 금지하며, 사용자가 프로그램 내 어떤 메뉴를 이동하더라도 완벽한 시각적 일체감을 유지하도록 전 화면의 배경색, 카드 서피스, 텍스트 대비, 테두리 스타일을 통일합니다.
14. **★★★ 로그인/회원가입 화면 표준 레이아웃 준수 의무 (2026-10-17 주인님 지시)**:
    - **모든 서브프로그램의 로그인 및 회원가입 안내 화면은 공식 표준 탭 토글 레이아웃(`(auth)/login/page.tsx` & `(auth)/layout.tsx`)을 동일하게 적용**합니다.
    - **핵심 구조**:
      1. **배경 & 헤더**: 은은한 24px 격자 모눈 배경 및 중앙 `max-w-[440px]` 컨테이너, 상단 프로그램 타이틀 + 안내 문구("AIMaster 계정(이메일·비밀번호)으로 로그인하세요.").
      2. **탭 토글 바**: 상단 알약형 `[로그인]` / `[회원가입]` 2버튼 탭 토글 바.
      3. **로그인 모드**: 이메일 주소(좌측 메일 아이콘), 비밀번호(좌측 자물쇠 아이콘 + 우측 "비밀번호 찾기?" 링크), 풀 위드 `로그인 ->` 액션 버튼.
      4. **회원가입 모드**: 안내 문구("이 프로그램은 AIMaster 계정과 구독 권한을 그대로 사용합니다. AIMaster에서 회원가입 후 이 프로그램을 구독하면 이용할 수 있습니다.") + 풀 위드 `AIMaster 회원가입 하러가기` 링크 버튼.
      5. **하단 푸터**: "계속 진행함으로써 귀하는 당사의 이용약관 및 개인정보 처리방침에 동의하게 됩니다." 안내 링크.
    - **테마 자율성**: **배경색, 카드 서피스 색상, 버튼/포인트 컬러, 브랜드 이모티콘 등은 해당 프로그램의 고유 스타일 템플릿(다크/라이트, 브랜드 컬러)에 맞추어 유연하게 변형·적용**할 수 있습니다.
    - **공식 기준 구현체**: [`threads-comment-reply/app/(auth)/login/page.tsx`](threads-comment-reply/app/(auth)/login/page.tsx) 및 [`threads-comment-reply/app/(auth)/layout.tsx`](threads-comment-reply/app/(auth)/layout.tsx).
15. **★★★ 디자인 리뉴얼 작업완료 보고 시 타 프로그램 탐색 기반 추가개선 제안 리포팅 의무 (2026-10-17 주인님 지시)**:
    - **디자인 리뉴얼 및 서브프로그램 작업 완료 보고 시, 완료된 해당 프로그램의 결과 보고에만 머무르지 않고, 전체 플랫폼 내 다른 서브프로그램들을 함께 둘러보며(카탈로그, 라우트, UI/UX, 외부연동, 안내문구, 테마 일치성, 모바일 반응형 등) 발견한 추가적인 프로그램 개선사항 및 고도화 제안 내용을 리포팅하여 결과 보고에 「추가개선 제안」 섹션으로 반드시 함께 포함**합니다.
    - **「추가개선 제안」 필수 3대 제안 항목 (2026-10-17 주인님 지시)**:
      1. **프로그램 로직 및 기능 개선**: 대상 프로그램의 로직 최적화, 신규 기능 제안, 오류 수정 등
      2. **사용자 인터페이스/UI 가독성, 사용편리성 개선**: 디자인 템플릿 일관성, 가독성, 조작성, 반응형 모바일 최적화 등
      3. **현재 만들어져 있는 다른 자동화 프로그램과의 연계가능한 기능**: 플랫폼 내 다른 서브프로그램 간 데이터/파이프라인 결합 연계 아이디어
    - **보고 내용**: 다른 프로그램을 살펴보며 발견한 1) 대상 프로그램명 및 현재 버전/도메인, 2) 구체적인 문제점 및 개선 필요사항, 3) 3대 제안 항목에 입각한 개선 방향 및 기대 효과를 체계적으로 정리하여 브리핑합니다.
    - **인수인계 기록**: 발견된 타 프로그램의 개선 제안사항은 해당 프로그램의 서브폴더 `docs/IMPROVEMENTS.md`에도 선제적으로 기록해 두어, 다음 CLI가 이어받아 작업할 때 대기 없이 즉시 착수할 수 있도록 체계화합니다.

16. **★★★ 모든 프로그램별 루트 문서 규격화 및 기능·로직·아이디어·버전 히스토리 기록 의무 (2026-10-17 주인님 지시)**:
    - **각각의 모든 프로그램 폴더 루트(`AGENTS.md` 및 `README.md`)에는 다른 CLI 프로그램(Antigravity, Codex, Claude Code)이 읽고 언제든지 검토 후 추가 개발·개선작업을 즉시 진행할 수 있도록 아래 7대 핵심 항목을 상세히 정리해서 남겨놓아야 합니다**:
      1. **프로그램의 사용목적 및 대상 (Target & Purpose)**: 누구를 위한 도구이며 어떤 핵심 가치와 문제 해결을 제공하는지 정의
      2. **프로그램 개발 구현에 사용된 도구/개발기법/플러그인/스킬 등 (Tech Stack & Skills)**: Next.js/Tailwind/Canvas/WebCodecs 등 기술 스택, 프롬프트 엔지니어링, 에이전트 스킬, 외부 라이브러리 및 API 연동
      3. **핵심 기능 및 시스템 아키텍처/로직, 장점 및 단점 (Features, Architecture, Pros & Cons)**: 주요 기능 명세, 데이터 파이프라인/컴포넌트 구조, 차별화 강점 및 현재의 기술적 한계점
      4. **현재 버전 및 버전별 변경 히스토리 (Current Version & Changelog)**: 현재 배포 버전(`vX.YY`)과 버전별 추가/수정 내역 빠짐없이 기록
      5. **남아 있는 추가 프로그램 및 디자인 작업 대기 내용 (Pending Tasks & Backlog)**: 우선순위별 대기 과제 및 프로그램 백로그 문서(`<프로그램>/docs/IMPROVEMENT_BACKLOG.md`) 연결
      6. **기존 다른 프로그램과 연계 혹은 구현 기능 병합을 통한 기능 확장 제안 및 다양한 혁신 아이디어 제안 (Integration & Innovative Ideas)**: 플랫폼 내 타 자동화 프로그램과의 파이프라인 결합, 기능 병합, 새로운 AI 기능 보완 아이디어
      7. **프로그램 성격에 맞는 사용자 편의성 증대를 위한 디자인 UI 개선안과 레이아웃, 테마, 스타일 변경 제안 (UI/UX & Style Proposals)**: 직관적인 인터랙션, 모바일 조작성, 테마 및 레이아웃 고도화 방안

17. **★★★ 남은 작업 리스트 및 전체 프로그램 현황 보고 시 카테고리별 표준 포맷 준수 의무 (2026-10-17 주인님 지시)**:
    - **주인님께서 "남은 작업리스트 보여달라" 또는 "현재 디자인/개발 현황 보여달라"고 요청하실 때, 단순 번호 순서 나열이 아닌 AIMaster 공식 카테고리별로 묶어 [작업 된 것 vs 안 된 것]을 명확히 대조하는 2단계 표준 포맷으로 반드시 보고**합니다:
      1. **1단계: 카테고리별 총괄 진척 현황표**: 공식 14개 카테고리(데이터수집|기획, 유튜브, 이미지, 음악, 블로그, 인스타, 쓰레드, 이커머스, 네이버, 마케팅, 멀티미디어, CRM, 부동산, Tools)별 총 프로그램 수, 작업 완료(✅) 수, 작업 예정(⚪) 수, 보류(⏸) 수, 완료율(%)
      2. **2단계: 카테고리별 상세 대조표 [작업 된 것 vs 안 된 것]**: 각 카테고리별로 No, 프로그램명, 폴더명(slug), 적용 디자인 템플릿 및 상태(배포 버전 또는 권장 템플릿)를 완료(✅)와 예정(⚪) 및 보류(⏸)로 명확히 구분하여 표 형태로 제시

18. **★★★ 프로그램 서브폴더별 필수 인수인계 문서 6종 완비 및 타 CLI 연속작업 보장 의무 (2026-10-17 주인님 지시 — 핵심 고정 지침)**:
    - **어떤 서브프로그램이든 개발·디자인·오류수정·리뉴얼 작업이 끝나면, 다른 AI CLI(Antigravity `agy`, Claude Code, Codex)가 언제든 바로 이어서 개발할 수 있도록 해당 프로그램 서브폴더 안에 아래 6종의 규격화된 인수인계 문서를 누락 없이 필수로 남겨야 합니다**:
      1. **`AGENTS.md` (7대 핵심 항목 완벽 규격화)**: 1) 사용목적 및 대상, 2) 개발 도구/기술스택/스킬, 3) 핵심 기능/시스템 로직/장단점, 4) 버전 및 상세 히스토리, 5) 백로그 연결, 6) 타 프로그램 연계/병합 아이디어, 7) UI/UX 개선안
      2. **`README.md`**: 사용자와 개발자를 위한 프로그램 개요 및 위 7대 항목 동기화
      3. **`docs/IMPROVEMENTS.md` (개선 제안서)**: 작업 중 발견된 과제 즉시 기록. 필수 3대 항목(1. 프로그램 로직/기능 개선, 2. UI/UX 가독성/사용편리성 개선, 3. 타 프로그램 연계 가능 기능) + 타 프로그램 탐색 개선안
      4. **`docs/IMPROVEMENT_BACKLOG.md` (작업 대기 백로그)**: 디자인/UX, 비즈니스 로직, 외부 연계 항목별 체크리스트(`- [ ]`) 형태로 구체화
      5. **`docs/DESIGN_HANDOFF.md` (디자인 개발완료 보고서)**: 공식 템플릿 스타일 명칭, 배경 및 메인 컬러 토큰 스펙, 모바일 반응형 대응점, 핵심 컴포넌트 구조 상세화
      6. **`docs/PLAN_YYYYMMDD_*.md` (사전 개발 플랜)**: 작업 착수 전 수립하고 주인님께 보고/승인받은 분석 및 구현 플랜 원본 보존
    - **루트 3대 현황판 동시 동기화 의무**: 위 서브폴더 6종 완비와 동시에 루트의 `DESIGN.md`(마스터 현황판 완료 상태 및 링크 갱신), `docs/ACTIVE_WORK.md`(작업 중 행 삭제), `docs/HANDOFF.md`(최상단에 작업 상세 내역·Edge 포그라운드 실세션 검수 결과·배포 링크 등록)를 반드시 100% 동기화합니다.


---

## 1. 공식 디자인 템플릿 시스템 (Design Template System) — 6대 대분류 체계 및 상세 카탈로그

> **★★★ 디자인 템플릿 마스터 카탈로그 & 스타일 분류 체계 표 신설 (2026-10-19 주인님 지시)**:
> 전체 83개 프로그램에 적용된 모든 디자인 스타일을 **유사한 성격끼리 6대 대분류 스타일군(포커스 스튜디오/에디터군, 미디어/사운드/콘솔군, 크리에이티브/아트/캔버스군, 스마트 매트릭스/데이터분석군, 플로우 위저드/단계별파이프라인군, 소셜 바이럴/SNS오퍼레이션군)**으로 분류하고, **각 템플릿의 스타일·주요 레이아웃 특징·추천 카테고리·현재 적용 프로그램·발견된 인사이트·UI 개선사항·기능확장 발전 로드맵**을 총망라한 독립 마스터 문서를 신설했습니다:
> 📖 **상세 카탈로그 전문 열람**: [`docs/DESIGN_TEMPLATE_CATALOG.md`](docs/DESIGN_TEMPLATE_CATALOG.md)
> 모든 CLI(Claude Code, Codex, Antigravity)는 신규 프로그램 개발이나 리뉴얼 시 위 문서를 함께 보고 참고·수정·업그레이드해 나갑니다.

> **기준 예시 유무**: `DESIGN_HANDOFF.md`(색상값·부품 구성)가 있는 템플릿만 다른 프로그램에 바로 옮겨 적용할 수 있다. 현재 기준 예시가 있는 것은 1·2·6·7·8번과 4번(v1.06 운영 검수 완료), 그리고 9번(v1.06 유튜브 다크 콘솔 스타일), 10번(v1.07 스마트 매트릭스 다크 스타일)이고, 3·5번은 대표 프로그램 1개를 먼저 완성해 `DESIGN_HANDOFF.md`를 만든 뒤 확대 적용한다.
> **새 템플릿을 만드는 기준**: 기존 템플릿의 색상 토큰이나 화면 골격을 조정해 쓸 수 있으면 새 이름을 만들지 않고 기존 템플릿의 「변형」으로 기록한다(예: `사이버 네온 다크 콘솔 스타일 — 수노 오렌지 변형`). 화면 골격(레이아웃)과 색상 토큰이 둘 다 기존 템플릿과 크게 다를 때만 새 이름을 붙인다.

| 공식 템플릿 스타일 명칭 | 대표 적용 프로그램 | 배경 및 메인 컬러 | 핵심 레이아웃 & 시그니처 특징 | 추천 대상 프로그램 분야 |
|---|---|---|---|---|
| **1. 포커스 스튜디오 스타일<br>(Focus Studio Style)** | **Markdown Studio** (`v1.10`) | 소프트 크림 / 퓨어 화이트<br>포인트: 딥 인디고 & 바이올렛 | 좌우 분할 스플릿 뷰(원문 vs 실시간 렌더링), 상단 툴바, 접이식 탐색기, 종이 질감 캔버스 | AI 글쓰기 에디터, 문서 변환기, 상세페이지 기획, 텍스트 프롬프트 스튜디오 |
| **2. 사이버 네온 다크 콘솔 스타일<br>(Cyber Neon Dark Console Style)** | **뮤직 플레이어** (`v1.05`) | 퓨어 딥 블랙 (`#060911`)<br>포인트: 네온 사이언 & 퍼플 글로우 | 앰프 랙마운트 콘솔 데크, 센터 네온 발광 플레이 버튼, 8밴드 수직 슬라이더 EQ, 글래스모피즘 플레이리스트 | 음악/오디오 플레이어, 비디오 에디터, 캔버스 그래픽 툴, 하이테크 미디어 스튜디오 |
| **3. 플로우 위저드 스타일<br>(Flow Wizard Style)** | **AI 쇼츠 원스톱** (`shorts-onestop-studio`) | 다크/라이트 듀얼 테마<br>포인트: 일렉트릭 블루 & 에메랄드 | 1단계 입력 → 2단계 AI 생성 → 3단계 검수 → 4단계 발행 단계별 프로그레스 바, 선택형 템플릿 카드 | 원스톱 숏폼/영상 자동화, SNS 자동 포스팅, 단계별 랜딩페이지 기획 |
| **4. 스마트 매트릭스 스타일<br>(Smart Matrix Style)** | **롱테일 키워드분석** (`longtail-keyword-expander` `v1.06`, 기준 구현 — 운영 검수 완료)<br>Website Scraper (`website-scraper` `v1.12`, Tailwind v4 이식·운영 검수 완료)<br>경쟁사 키워드분석 (`competitor-analysis` `v1.07`, 동일 뼈대·운영 검수 완료) | 슬레이트 그레이 / 다크 차콜<br>포인트: 모던 블루 & 앰버 | 상단 핵심 지표(KPI) 통계 카드 3~4종, 검색/필터 바, 표/그리드 전환 뷰, 실시간 상태 칩 | 키워드 발굴기, 데이터 스크래핑 대시보드, 성과 분석·통계 프로그램 |
| **5. 크리에이티브 아틀리에 스타일<br>(Creative Atelier Style)** | 썸네일 마스터, 4컷 만화, LP 턴테이블<br>**코믹 파스텔 변형(라이트, 기준 구현)**: AI 4컷 만화 자동화 (`four-cut-comics` `v1.12`, 2026-10-18 구현·10-19 배포 예정, 토큰 `four-cut-comics/docs/DESIGN_HANDOFF.md`)<br>**포토 스튜디오 그래파이트 변형(다크·중립 회색, 사진 색 판단용)**: AI 인물사진 자동화 (`portrait-photo` `v1.22`, 2026-10-18 배포, 토큰 `portrait-photo/docs/DESIGN_HANDOFF.md`) | 딥 미드나잇 블랙<br>포인트: 비비드 골드 & 네온 핑크<br>(코믹 파스텔 변형: 크림 `#fffaf2` · 먹선 `#1f2430` · 코랄 `#ff6b57` · 머스타드 `#ffc94d`, 2px 먹선 테두리 + `3px 3px 0` 어긋난 그림자)<br>(포토 스튜디오 그래파이트 변형: 배경 `#121316` · 카드 `#1b1d21` · 라이트 블루 `#7cc4fa` · 텅스텐 앰버 `#f6c177`, 결과 무대 격자 + 네 귀퉁이 초점 표시) | 대형 캔버스 뷰포트 중심, 좌우 옵션 패널, 프리셋 갤러리 썸네일 그리드, 고화질 뷰어 | AI 이미지 생성기, 웹툰/만화 제작기, 썸네일 마스터, 패션 스타일링 |
| **6. 사이버 수노 다크 스튜디오 스타일<br>(Cyber Suno Dark Studio Style)** | **Suno 음악기획** (`suno-music-studio` `v1.10`) | 퓨어 옵시디언 블랙 (`#09090b`)<br>포인트: Suno 앰버 오렌지 & 일렉트릭 바이올렛 | Suno Create 오리지널 감성, 알약형(Pill) 탭/버튼, 4단계 음악기획 파이프라인 가이드북, 공식 사이트 링크 하이라이트 | 음악 기획/작사 생성기, Suno/Udio 사운드 프롬프트 스튜디오, 앨범 기획기 |
| **7. 이커머스 셀러 스튜디오 스타일<br>(E-commerce Seller Studio Style)** | **AI 상세페이지 자동화** (`shop-detail-page` `v1.06`) | 퓨어 화이트 (`#ffffff`) & 슬레이트 (`#f8fafc`)<br>포인트: 스마트스토어 로열 블루 (`#2563eb`) & 셀러 오렌지 (`#f97316`) | 네이버 스마트스토어/쿠팡 셀러센터 감성, 4단계 파이프라인 가이드북 & 15개 섹션 블록 맵, 점선 드래그앤드롭 업로더, 15단 섹션 넘버링 뷰어 & 롱 이미지 원클릭 병합 바 | 이커머스 상세페이지 생성기, 쇼핑몰 상품 등록기, 오픈마켓 소싱 자동화 |
| **8. 스레드 바이럴 스튜디오 스타일<br>(Threads Viral Studio Style)** | **Threads 콘텐츠 운영 자동화** (`threads-content-ops` `v1.96`) | 클린 화이트 (`#ffffff`) & 슬레이트 (`#f8fafc`)<br>포인트: 바이럴 파이어 앰버 (`#f59e0b`) & 일렉트릭 바이올렛 (`#8b5cf6`) & Threads 블랙 (`#171717`) | Meta Threads 공식 감성, 5단계 파이프라인 가이드북 & Meta 연동 가이드, 모바일 전용 햄버거 헤더, 6종 페르소나 카드 갤러리, 500자 제약 컨트롤 | Threads 운영 자동화, SNS 바이럴 콘텐츠 제작기, 제휴 마케팅 자동 포스팅 |
| **9. 유튜브 다크 콘솔 스타일<br>(YouTube Dark Console Style)** | **Youtube Playlist 자동화** (`yt-playlist-studio` `v1.06`)<br>스튜디오 댓글 콘솔 변형: 유튜브 댓글자동화 (`youtube-auto-reply` `v1.11`, 관리 화면·댓글 모양)<br>쓰레드 모노 변형: Threads 댓글자동화 (`threads-comment-reply` `v1.11`, 같은 구성·흑백 색)<br>인스타 라이트 변형: INSTA 댓글자동화 (`instagram-comment-reply` `v1.15`, 같은 구성·인스타 라이트 색) · INSTA DM답변 자동화 (`instagram-dm-reply` `v1.14`, DM 말풍선)<br>스튜디오 변형: YOUTUBE VIRAL FINDER (`youtube-viral-studio` `v1.19`, Tailwind v4 `@theme` 이식) · YOUTUBE CHANNEL CONSULTANT (`youtube-channel-consultant` `v1.10`) | 퓨어 옵시디언 블랙 (`#0f0f0f`) & 다크 서피스 (`#181818`)<br>포인트: 유튜브 공식 레드 (`#ff0000`) | 유튜브 공식 다크 감성, 유튜브 레드 플레이 로고(▶), 알약형(Pill) 칩 버튼, 5단계 파이프라인 가이드북, 16:9 영화관 캔버스 & 오디오 스펙트럼 10종, WebCodecs GPU 가속 1080p MP4 고속 렌더링 콘솔 | 유튜브 영상 제작기, 플레이리스트 자동화, 오디오 비주얼라이저, 비디오 에디터 |
| **10. 스마트 매트릭스 다크 스타일<br>(Smart Matrix Dark Style)** | **AI 할 일·성과 관리** (`ai-task-planner` `v1.07`) | 딥 나이트 네이비 (`#0b0f19`) & 다크 서피스 (`#161d2b` / `#1a2234`)<br>포인트: 스마트 인디고 (`#4f46e5`) & 에메랄드 그린 (`#10b981`) & 스카이블루 (`#38bdf8`) | 딥 나이트 네이비 생산성 콘솔 감성, 3열 매트릭스 레이아웃(좌측 할 일 목록 + 중앙 할 일 추가/오늘의 성과 + 우측 시간대별 차트/AI 성과 분석/성과 노트), 한 화면 전체 조망, KPI 요약 바, 5단계 파이프라인 가이드북 | 개인/팀 생산성 매트릭스, 주간/월간 업무 플래너, 성과/KPI 대시보드 |

---

## 2. 전체 프로그램 디자인 작업 현황판 (Master Design Registry) — 중복 작업 방지

> **2026-10-16 주인님 지시**: 개발된 전체 프로그램(84개, `docs/PROGRAM_CAPABILITY_MAP.md` 및 `docs/PROGRAM_CATEGORY_TEMPLATE_MAP.md` 기준)의 디자인 작업 상태를 이 표 하나로 관리한다. **작업을 시작하기 전에 반드시 이 표와 `docs/ACTIVE_WORK.md`를 함께 확인**하고, 「✅ 1차 작업완료」·「🔵 작업 중」인 프로그램은 다른 CLI가 새로 리뉴얼하지 않는다(추가 개선은 그 프로그램 `docs/IMPROVEMENTS.md`에 적고 주인님 승인 후 진행).
>
> **상태 구분** (2026-10-19 기준: ✅ 82개 · ⚪ 0개 · 🟠 0개 · ⏸ 2개 — 총 84개 — **97.6% 달성 / 정상 운영 프로그램 82개 100% 1차 전수 완료!**):
> - ✅ **1차 작업완료**: 디자인 템플릿 적용·배포까지 끝남 (가능하면 `docs/DESIGN_HANDOFF.md` 있음)
> - 📋 **플랜 수립 완료**: 기능/로직 분석 기반 디자인 리뉴얼 플랜 및 개선사항 인수인계서 작성 완료 (구현 착수 대기)
> - 🔵 **작업 중**: 지금 어떤 CLI가 디자인 작업 중 — 같은 프로그램 착수 금지
> - 🟠 **메인(윈도우) CLI 마무리 작업요망**: 맥미니 CLI가 코드·문서·커밋을 마쳤고, 윈도우 CLI가 빌드·배포·화면 검수만 하면 됨 — 새 리뉴얼 착수 금지, 윈도우 CLI만 이어받음
> - ⚪ **작업 예정**: 아직 디자인 리뉴얼 전. 템플릿 칸의 「(권장)」은 추천일 뿐 확정 아님
> - ⏸ **보류**: 비활성 프로그램 등 당장 대상 아님
>
> **상태 바꾸는 법**: 착수할 때 ⚪→🔵 「🔵 작업 중 (CLI(장비), 날짜)」로 고치고 `docs/ACTIVE_WORK.md`에 줄 추가 → 배포·검수 후 「✅ 1차 작업완료 (`vX.YY`, 템플릿명)」 + 인수인계 문서 링크로 고치고 ACTIVE_WORK 줄 삭제. 상태 칸 외의 다른 줄은 건드리지 않는다.
>
> **★ 상태 표시 규칙 (2026-10-16 주인님 지시)** — ① **시작할 때 먼저** 「🔵 작업 중 (CLI(장비), 날짜)」로 바꿔 저장하고 `docs/ACTIVE_WORK.md`에 줄 추가(이미 🔵·🟠·✅이면 착수하지 말고 주인님께 알린다). ② **맥미니 CLI가 작업을 마치면**(맥미니는 빌드·배포 금지) 같은 커밋에서 「🟠 메인(윈도우) CLI 마무리 작업요망 (`vX.YY`, CLI(맥미니) 날짜)」로 바꾸고 ACTIVE_WORK 자기 줄 삭제, 남은 일은 `docs/HANDOFF.md` 대기 항목에 적는다. ③ **윈도우 CLI가 빌드·배포·검수까지 끝내면**(또는 윈도우에서 처음부터 끝까지 한 작업) **반드시 상태를 「✅ 1차 작업완료 (`vX.YY`, CLI(윈도우) 날짜)」로 바꾼다**. 다른 CLI가 같은 프로그램을 중복 작업하지 않게 하는 것이 목적이다.

| No | 서브프로그램명 | slug | 적용 디자인 템플릿 스타일 | 배경 테마 | 디자인 상태 | 인수인계 문서 |
|:---:|---|---|---|---|:---:|:---:|:---:|
| 1 | 마크다운 문서 자동화 | `markdown-studio` | **포커스 스튜디오 스타일** | 라이트(크림) | ✅ 1차 작업완료 (`v1.11`, 포커스 스튜디오 스타일) | [`markdown-studio/docs/DESIGN_HANDOFF.md`](markdown-studio/docs/DESIGN_HANDOFF.md) |
| 2 | 뮤직 플레이어 자동화 | `music-player` | **사이버 네온 다크 콘솔 스타일** | 다크(딥블랙) | ✅ 1차 작업완료 (`v1.07`, 사이버 네온 다크 콘솔 스타일) | [`music-player/docs/DESIGN_HANDOFF.md`](music-player/docs/DESIGN_HANDOFF.md) |
| 3 | AI 쇼츠 원스톱 제작 자동화 | `shorts-onestop-studio` | **플로우 위저드 스타일** | 다크/라이트 | ✅ 1차 작업완료 (`v1.13`, 플로우 위저드 스타일) | [`shorts-onestop-studio/docs/DESIGN_HANDOFF.md`](shorts-onestop-studio/docs/DESIGN_HANDOFF.md) |
| 4 | AI 블로그 작업실 자동화 | `blog-workroom` | **포커스 스튜디오 스타일** | 라이트(크림/화이트) | ✅ 1차 작업완료 (`v1.06`, 포커스 스튜디오 스타일) | [`blog-workroom/docs/DESIGN_HANDOFF.md`](blog-workroom/docs/DESIGN_HANDOFF.md) |
| 5 | AI 올인원 그래픽 자동화 | `allinone-graphic` | **크리에이티브 아틀리에 스타일** | 다크(미드나잇) | ✅ 1차 작업완료 (`v1.05`, 크리에이티브 아틀리에 스타일) | [`allinone-graphic/docs/DESIGN_HANDOFF.md`](allinone-graphic/docs/DESIGN_HANDOFF.md) |
| 6 | 플레이리스트 채널 제작 | `playlist-channel-studio` | **사이버 네온 다크 콘솔 스타일** | 다크(딥블랙 `#060911`) | ✅ 1차 작업완료 (`v1.10`, 사이버 네온 다크 콘솔 스타일) | [`playlist-channel-studio/docs/DESIGN_HANDOFF.md`](playlist-channel-studio/docs/DESIGN_HANDOFF.md) |
| 7 | 시네마틱 스토리보드 자동화 | `cinematic-storyboard-studio` | **크리에이티브 아틀리에 스타일** (시네마틱 아틀리에) | 다크(시네마틱 차콜 `#0b0f17`) | ✅ 1차 작업완료 (`v1.07`, 크리에이티브 아틀리에 스타일) | [`cinematic-storyboard-studio/docs/DESIGN_HANDOFF.md`](cinematic-storyboard-studio/docs/DESIGN_HANDOFF.md) |
| 8 | AI 12단 상세페이지 자동화 | `detail-page-12p` | **포커스 스튜디오 스타일** (이커머스 상세페이지) | 라이트(클린 슬레이트 `#f8fafc`) | ✅ 1차 작업완료 (`v1.05`, 포커스 스튜디오 스타일) | [`detail-page-12p/docs/DESIGN_HANDOFF.md`](detail-page-12p/docs/DESIGN_HANDOFF.md) |
| 9 | AI 프롬프트 템플릿 자동화 | `prompt-template-studio` | **포커스 스튜디오 스타일** (프롬프트 템플릿 스튜디오) | 라이트(클린 슬레이트 `#f8fafc`) | ✅ 1차 작업완료 (`v1.05`, 포커스 스튜디오 스타일) | [`prompt-template-studio/docs/DESIGN_HANDOFF.md`](prompt-template-studio/docs/DESIGN_HANDOFF.md) |
| 10 | 페르소나 문체 자동화 | `persona-style-studio` | **포커스 스튜디오 스타일** (문체 변환 스튜디오) | 라이트(클린 슬레이트 `#f8fafc`) | ✅ 1차 작업완료 (`v1.08`, 포커스 스튜디오 스타일) | [`persona-style-studio/docs/DESIGN_HANDOFF.md`](persona-style-studio/docs/DESIGN_HANDOFF.md) |
| 11 | AI Prompt 자동화 | `ai-prompt-studio` | **포커스 스튜디오 스타일** (프롬프트 엔지니어링 스튜디오) | 라이트(클린 슬레이트 `#f8fafc`) | ✅ 1차 작업완료 (`v1.06`, 포커스 스튜디오 스타일) | [`ai-prompt-studio/docs/DESIGN_HANDOFF.md`](ai-prompt-studio/docs/DESIGN_HANDOFF.md) |
| 12 | Youtube Playlist 자동화 | `yt-playlist-studio` | **유튜브 다크 콘솔 스타일** (YouTube Dark Console Style) | 다크(옵시디언 블랙 `#0f0f0f` + 유튜브 레드 `#ff0000`) | ✅ 1차 작업완료 (v1.08, 유튜브 다크 콘솔·참고 메모) | [`yt-playlist-studio/docs/DESIGN_HANDOFF.md`](yt-playlist-studio/docs/DESIGN_HANDOFF.md) |
| 13 | LP 턴테이블 자동화 | `vinyl-lp-studio` | **크리에이티브 아틀리에 스타일** (바이닐 다크 레트로 콘솔 변형) | 다크(옵시디언 `#0c0d12` + 바이닐 골드/앰버 `#f59e0b`) | ✅ 1차 작업완료 (`v1.08`, 크리에이티브 아틀리에 스타일) | [`vinyl-lp-studio/docs/DESIGN_HANDOFF.md`](vinyl-lp-studio/docs/DESIGN_HANDOFF.md) |
| 14 | 무한루프 영상자동화 | `infinite-loop-video` | **크리에이티브 아틀리에 스타일** (네온 루프 시네마 변형) | 다크(차콜 `#0b0d12` + 네온 핑크 `#ec4899`→시안 `#22d3ee`) | ✅ 1차 작업완료 (`v1.05`, 크리에이티브 아틀리에 스타일) | [`infinite-loop-video/docs/IMPROVEMENT_HANDOFF_20261017.md`](infinite-loop-video/docs/IMPROVEMENT_HANDOFF_20261017.md) · [`infinite-loop-video/docs/DESIGN_HANDOFF.md`](infinite-loop-video/docs/DESIGN_HANDOFF.md) |
| 15 | AI 인플루언서 자동화 | `ai-influencer-studio` | **크리에이티브 아틀리에 스타일** (핑크 화보 스튜디오 변형) | 다크(미드나잇 `#0d0b12` + 핑크 `#ec4899`→로즈 `#f43f5e`) | ✅ 1차 작업완료 (`v1.10`, 크리에이티브 아틀리에 스타일) | [`ai-influencer-studio/docs/IMPROVEMENT_HANDOFF_20261017.md`](ai-influencer-studio/docs/IMPROVEMENT_HANDOFF_20261017.md) · [`ai-influencer-studio/docs/DESIGN_HANDOFF.md`](ai-influencer-studio/docs/DESIGN_HANDOFF.md) |
| 16 | 뮤직비디오 자동화 | `music-video-studio` | **사이버 네온 다크 콘솔 스타일 — 뮤직비디오 앰프 데크 에디션** | 다크(딥블랙 `#060911` + 네온 시안 `#00f2fe`·핑크 `#f43f5e`) | ✅ 1차 작업완료 (`v1.11`, 사이버 네온 다크 콘솔 스타일) | [`music-video-studio/docs/DESIGN_HANDOFF.md`](music-video-studio/docs/DESIGN_HANDOFF.md) |
| 17 | 이미지 변환 스튜디오 | `image-convert-studio` | **크리에이티브 아틀리에 스타일** (이미지 스튜디오 에디션) | 다크(딥 옵시디언 `#0b0f17` + 바이올렛 `#8b5cf6`) | ✅ 1차 작업완료 (`v1.07`, 크리에이티브 아틀리에 스타일) | [`image-convert-studio/docs/DESIGN_HANDOFF.md`](image-convert-studio/docs/DESIGN_HANDOFF.md) |
| 18 | Suno 음악기획 자동화 | `suno-music-studio` | **사이버 수노 다크 스튜디오 스타일** | 다크(옵시디언 블랙) | ✅ 1차 완료 | [`suno-music-studio/docs/DESIGN_HANDOFF.md`](suno-music-studio/docs/DESIGN_HANDOFF.md) |
| 19 | 감성 글귀 이미지 | `emotion-writer` | **포커스 스튜디오 스타일 — 감성 캘리그라피 에디션** | 라이트(소프트 크림 `#fdfbf7` + 웜 페이퍼 & 로즈 엑센트 `#be185d`) | ✅ 1차 작업완료 (`v1.15`, 포커스 스튜디오 스타일) | [`emotion-writer/docs/DESIGN_HANDOFF.md`](emotion-writer/docs/DESIGN_HANDOFF.md) · [`emotion-writer/docs/IMPROVEMENTS.md`](emotion-writer/docs/IMPROVEMENTS.md) |
| 20 | eBook Studio | `ebook-studio` | **포커스 스튜디오 스타일 — 전자책 퍼블리싱 에디션** | 라이트(소프트 크림 `#fbfbf9` + 딥 인디고 `#4f46e5`) | ✅ 1차 작업완료 (`v1.10`, 포커스 스튜디오 스타일) | [`ebook-studio/docs/DESIGN_HANDOFF.md`](ebook-studio/docs/DESIGN_HANDOFF.md) · [`ebook-studio/docs/IMPROVEMENTS.md`](ebook-studio/docs/IMPROVEMENTS.md) |
| 21 | Website Scraper | `website-scraper` | **스마트 매트릭스 스타일** (Tailwind v4 이식) | 다크(차콜 `#0f1115` + 블루 `#2563eb`·앰버 `#f59e0b`) | ✅ 1차 작업완료 (`v1.12`, 스마트 매트릭스 스타일) | [`ghost-scraper/docs/DESIGN_HANDOFF.md`](ghost-scraper/docs/DESIGN_HANDOFF.md) |
| 22 | AI 유튜브 썸네일 프로 | `seo-thumbnail-pro` | **크리에이티브 아틀리에 스타일 — 프로 썸네일 캔버스 변형** | 다크(미드나잇 다크 `#0c0f17` + 유튜브 레드 `#ff0000`·골드 앰버 `#f59e0b`) | ✅ 1차 작업완료 (`v1.10`, 프로 썸네일 캔버스 변형) | [`seo-thumbnail-pro/docs/DESIGN_HANDOFF.md`](seo-thumbnail-pro/docs/DESIGN_HANDOFF.md) · [`seo-thumbnail-pro/docs/IMPROVEMENTS.md`](seo-thumbnail-pro/docs/IMPROVEMENTS.md) |
| 23 | 이미지 스타일 분석기 | `style-dna-analyzer` | **크리에이티브 아틀리에 스타일 — 스타일 DNA 랩 에디션** | 다크(미드나잇 다크 `#0c0f17` + 시안 블루 `#06b6d4`·바이올렛 `#8b5cf6`) | ✅ 1차 작업완료 (`v1.22`, 스타일 DNA 랩 에디션) | [`style-dna-analyzer/docs/DESIGN_HANDOFF.md`](style-dna-analyzer/docs/DESIGN_HANDOFF.md) · [`style-dna-analyzer/docs/IMPROVEMENTS.md`](style-dna-analyzer/docs/IMPROVEMENTS.md) |
| 24 | INSTA Cardnews 자동화 | `cardnews-studio` | **크리에이티브 아틀리에 스타일** (인스타 카드뉴스 변형) | 다크(인스타 선셋 그라디언트 & 미드나잇 `#0d0f17`) | ✅ 1차 작업완료 (`v1.15`, 크리에이티브 아틀리에 스타일) | [`cardnews-studio/docs/DESIGN_HANDOFF.md`](cardnews-studio/docs/DESIGN_HANDOFF.md) · [`cardnews-studio/docs/IMPROVEMENTS.md`](cardnews-studio/docs/IMPROVEMENTS.md) |
| 25 | AI 웹툰 자동화 | `ai-webtoon-studio` | **크리에이티브 아틀리에 스타일** (웹툰 스튜디오 다크 변형) | 다크(딥블랙 나이트 `#0a0d14` + 인디고 `#6366f1`·바이올렛 `#8b5cf6`) | ✅ 1차 작업완료 (`v1.14`, 크리에이티브 아틀리에 스타일) | [`ai-webtoon-studio/docs/DESIGN_HANDOFF.md`](ai-webtoon-studio/docs/DESIGN_HANDOFF.md) |
| 26 | 네이버 블로그 올인원 자동화 | `naver-blog-allinone` | **플로우 위저드 스타일** (네이버 그린 라이트 변형) | 라이트(클린 슬레이트 `#f8fafc` + 네이버 그린 `#03c75a`) | ✅ 1차 작업완료 (`v1.49`, 플로우 위저드 라이트 테마 & 가이드북 신설) | [`naver-blog-allinone/docs/DESIGN_HANDOFF.md`](naver-blog-allinone/docs/DESIGN_HANDOFF.md) |
| 27 | YOUTUBE CHANNEL CONSULTANT | `youtube-channel-consultant` | **유튜브 다크 콘솔 스타일 — 스튜디오 변형** (viral-studio와 동일, Tailwind v4) | 다크(`#0f0f0f` + 유튜브 레드 `#ff0000`) | ✅ 1차 작업완료 (`v1.07`, 유튜브 다크 콘솔 스타일 — 스튜디오 변형 · 맥미니 구현, 윈도우 빌드·배포·검수 2026-10-17) | [`youtube-channel-consultant/docs/DESIGN_HANDOFF.md`](youtube-channel-consultant/docs/DESIGN_HANDOFF.md) |
| 28 | YOUTUBE VIRAL FINDER | `youtube-viral-studio` | **유튜브 다크 콘솔 스타일 — 스튜디오 변형** (+ 스마트 매트릭스 구성, Tailwind v4) | 다크(`#0f0f0f` + 유튜브 레드 `#ff0000`) | ✅ 1차 작업완료 (`v1.14`, 유튜브 다크·회원별 즐겨찾기/30일 보관, Codex 2026-10-17) | [`youtube-viral-studio/docs/DESIGN_HANDOFF.md`](youtube-viral-studio/docs/DESIGN_HANDOFF.md) |
| 29 | 네이버 블로그 에이전트 | `naver-blog-agent` | **플로우 위저드 스타일** (네이버 그린 라이트 변형) | 라이트(클린 슬레이트 `#f8fafc` + 네이버 그린 `#03c75a`) | ✅ 1차 작업완료 (`v1.94`, 플로우 위저드 라이트 테마 & 가이드북 신설) | [`naver-blog-agent/docs/DESIGN_HANDOFF.md`](naver-blog-agent/docs/DESIGN_HANDOFF.md) |
| 30 | Threads 콘텐츠 운영 자동화 | `threads-content-ops` | **스레드 바이럴 스튜디오 스타일** | 라이트(화이트/앰버) | ✅ 1차 완료 (`v1.97`) | [`threads-content-ops/docs/DESIGN_HANDOFF.md`](threads-content-ops/docs/DESIGN_HANDOFF.md) |
| 31 | 쇼츠 떡상 분석·대본 자동화 | `shorts-viral-studio` | **플로우 위저드 스타일 (다크 차콜 변형)** | 다크(차콜 `#0d1117` + 서피스 `#161b22` + 쇼츠 레드 `#ef4444`) | ✅ 1차 작업완료 (`v1.11`, 플로우 위저드 다크 테마 & 가이드북 신설) | [`shorts-viral-studio/docs/DESIGN_HANDOFF.md`](shorts-viral-studio/docs/DESIGN_HANDOFF.md) |
| 32 | Threads AI 기획 자동화 | `threads-easy-planner` | **스레드 바이럴 스튜디오 스타일 — 기획기 변형** | 라이트(화이트/블랙/앰버) | ✅ 1차 작업완료 (`v1.45`, 스레드 바이럴 스튜디오 스타일) | [`threads-easy-planner/docs/DESIGN_HANDOFF.md`](threads-easy-planner/docs/DESIGN_HANDOFF.md) |
| 33 | 티스토리(원문)생성 자동화 | `tistory-auto-blog` | **플로우 위저드 스타일 — 티스토리 오렌지 앰버 에디션** | 라이트(클린 슬레이트 `#f8fafc` + 티스토리 오렌지 `#f97316`) | ✅ 1차 작업완료 (`v1.82`, 플로우 위저드 앰버 테마 & 가이드북 신설) | [`tistory-auto-blog/docs/DESIGN_HANDOFF.md`](tistory-auto-blog/docs/DESIGN_HANDOFF.md) |
| 34 | AI 이미지 스튜디오 | `ai-image-studio` | **크리에이티브 아틀리에 럭셔리 다크 스타일** | 다크(옵시디언 `#09090b` + 골드/앰버 `#f59e0b`) | ✅ 1차 작업완료 (`v1.12`, 크리에이티브 아틀리에 럭셔리 다크 템플릿) | [`ai-image-studio/docs/DESIGN_HANDOFF.md`](ai-image-studio/docs/DESIGN_HANDOFF.md) |
| 35 | 네이버 블로그 SEO 스튜디오 | `naver-blog-seo-studio` | **스마트 매트릭스 스타일 — 라이트 변형 · 네이버 그린 포인트** (일반 CSS 변수) | 라이트(`#f6f7f9` + 네이버 그린 `#009b4d`/`#03c75a`) | ✅ 1차 작업완료 (`v1.69`, 파일나누기+네이버그린 리뉴얼, 윈도우 배포·확장검증·Edge포그라운드검수 2026-10-17) | [`naver-blog-seo-studio/docs/DESIGN_HANDOFF.md`](naver-blog-seo-studio/docs/DESIGN_HANDOFF.md) |
| 36 | 상세페이지 GIF 자동화 | `video-to-gif` | **크리에이티브 아틀리에 스타일 — 이커머스 GIF 랩 에디션** | 다크(차콜 `#0d1117` + 앰버 골드 `#f59e0b`) | ✅ 1차 작업완료 (`v1.10`, 크리에이티브 아틀리에 스타일) | [`video-to-gif/docs/DESIGN_HANDOFF.md`](video-to-gif/docs/DESIGN_HANDOFF.md) · [`video-to-gif/docs/IMPROVEMENTS.md`](video-to-gif/docs/IMPROVEMENTS.md) |
| 37 | AIMaster 타로점 | `tarot-reading` | **크리에이티브 아틀리에 스타일 — 신비로운 미드나잇 퍼플 랩 에디션** | 딥 미드나잇 퍼플 (`#090614` + 바이올렛 `#a855f7`) | ✅ 1차 작업완료 (`v1.20`, 크리에이티브 아틀리에 스타일) | [`tarot/docs/DESIGN_HANDOFF.md`](tarot/docs/DESIGN_HANDOFF.md) · [`tarot/docs/IMPROVEMENTS.md`](tarot/docs/IMPROVEMENTS.md) |
| 38 | 캐릭코드(MBTI) 측정기 | `mbti-character` | **크리에이티브 아틀리에 스타일 — 파스텔 크림 에디션** | 파스텔 크림 (`#fefcf9`) & 코랄 로즈/라벤더 | ✅ 1차 작업완료 (`v1.20`, 크리에이티브 아틀리에 파스텔 에디션) | [`mbti-character/docs/DESIGN_HANDOFF.md`](mbti-character/docs/DESIGN_HANDOFF.md) · [`mbti-character/docs/IMPROVEMENTS.md`](mbti-character/docs/IMPROVEMENTS.md) |
| 39 | 성격코드(MBTI) 측정기 | `personality-code` | **크리에이티브 아틀리에 스타일 — 파스텔 퍼스널리티 랩 에디션** | 파스텔 크림 (`#faf8f5`) & 4대 지표 컬러 | ✅ 1차 작업완료 (`v1.20`, 크리에이티브 아틀리에 스타일) | [`mbti/docs/DESIGN_HANDOFF.md`](mbti/docs/DESIGN_HANDOFF.md) · [`mbti/docs/IMPROVEMENTS.md`](mbti/docs/IMPROVEMENTS.md) |
| 40 | 네이버 카페 포스팅 자동화 | `naver-cafe-poster` | **플로우 위저드 스타일 — 네이버 카페 그린 에디션** | 라이트(클린 슬레이트 `#f8fafc` + 네이버 그린 `#03c75a`) | ✅ 1차 작업완료 (`v1.20`, 플로우 위저드 스타일) | [`naver-cafe-poster/docs/DESIGN_HANDOFF.md`](naver-cafe-poster/docs/DESIGN_HANDOFF.md) · [`naver-cafe-poster/docs/IMPROVEMENTS.md`](naver-cafe-poster/docs/IMPROVEMENTS.md) |
| 41 | 카카오톡 뉴스레터 자동화 | `kakao-auto-posting` (폴더 `kakao_auto_poster`) | **플로우 위저드 스타일 — 카카오 옐로우 뉴스레터 에디션** | 클린 화이트 (카카오 옐로우 `#fee500` / 다크 차콜 `#191919`) | ✅ 1차 작업완료 (`v1.20`, 플로우 위저드 카카오 옐로우 에디션) | [`kakao_auto_poster/docs/DESIGN_HANDOFF.md`](kakao_auto_poster/docs/DESIGN_HANDOFF.md) · [`kakao_auto_poster/docs/IMPROVEMENTS.md`](kakao_auto_poster/docs/IMPROVEMENTS.md) |
| 42 | 웹 크롤링 자동화 | `web-crawler-saas` (폴더 `web-crawler/webapp`) | **스마트 매트릭스 스타일** (다크 슬레이트, Tailwind v4) | 다크(차콜 `#0f1115` + 블루 `#2563eb`·앰버 `#f59e0b`) | ✅ 1차 작업완료 (`v1.07`, 스마트 매트릭스 스타일) | [`web-crawler/IMPROVEMENT_HANDOFF_20261017.md`](web-crawler/IMPROVEMENT_HANDOFF_20261017.md) · [`web-crawler/DESIGN_HANDOFF.md`](web-crawler/DESIGN_HANDOFF.md) |
| 43 | 상품소싱 자동화 | `trending-product-finder` | **스마트 매트릭스 스타일** (다크 슬레이트, Tailwind v3) | 다크(차콜 `#0f1115` + 블루 `#2563eb`·앰버 `#f59e0b`) | ✅ 1차 작업완료 (`v1.08`, 스마트 매트릭스 다크, Windows 빌드/배포/DB/Edge1440·375 2026-10-17) | [`trending-product-finder/docs/DESIGN_HANDOFF.md`](trending-product-finder/docs/DESIGN_HANDOFF.md) |
| 44 | Threads 쇼핑제휴 자동화 | `threads-affiliate-poster` | **스레드 바이럴 스튜디오 스타일** (쇼핑제휴 변형) | 다크(모노블랙 `#171717` + 앰버 `#f59e0b`·블루 `#3b82f6`) | ✅ 1차 작업완료 (`v1.61`, 스레드 바이럴 스튜디오 — 쇼핑제휴 변형) | [`threads-affiliate-poster/docs/DESIGN_HANDOFF.md`](threads-affiliate-poster/docs/DESIGN_HANDOFF.md) |
| 45 | INSTA DM답변 자동화 | `instagram-dm-reply` | **스튜디오 댓글 콘솔 — 인스타 라이트 변형 (DM 대화 화면)** (47번 이식, Tailwind v3) | 라이트(`#fafafa` + 인스타 파랑 `#0095f6`·그라데이션 포인트) | ✅ 1차 작업완료 (`v1.14`, 3대 추가개선 완료 2026-10-17) | [`instagram-dm-reply/docs/DESIGN_HANDOFF.md`](instagram-dm-reply/docs/DESIGN_HANDOFF.md) |
| 46 | Threads 댓글자동화 | `threads-comment-reply` | **스튜디오 댓글 콘솔 — 쓰레드 모노 변형** (youtube-auto-reply 구성 이식, Tailwind v3) | 다크(`#101010` 흑백 + 흰 알약 버튼) | ✅ 1차 작업완료 (`v1.11`, 사이드바 타이틀 정리 + 빌드·배포·DB·Edge 검수 2026-10-17) | [`threads-comment-reply/docs/DESIGN_HANDOFF.md`](threads-comment-reply/docs/DESIGN_HANDOFF.md) |
| 47 | INSTA 댓글자동화 | `instagram-comment-reply` | **스튜디오 댓글 콘솔 — 인스타 라이트 변형** (threads v1.10 구성 이식, Tailwind v3) | 라이트(`#fafafa` + 인스타 파랑 `#0095f6`·그라데이션 포인트) | ✅ 1차 작업완료 (`v1.15`, 사이드바 타이틀 정리 + 빌드·배포·DB·포그라운드 Edge 검수 2026-10-17) | [`instagram-comment-reply/docs/DESIGN_HANDOFF.md`](instagram-comment-reply/docs/DESIGN_HANDOFF.md) |
| 48 | 유튜브 댓글자동화 | `youtube-auto-reply` | **유튜브 다크 콘솔 스타일 — 스튜디오 댓글 콘솔 변형** (+ 스마트 매트릭스 지표 구성) | 다크(`#0f0f0f` + 유튜브 레드 `#ff0000`) | ✅ 1차 작업완료 (`v1.11`, 사이드바 타이틀 정리 + 빌드·배포·DB·포그라운드 Edge 검수 2026-10-17) | [`youtube-auto-reply/docs/DESIGN_HANDOFF.md`](youtube-auto-reply/docs/DESIGN_HANDOFF.md) |
| 49 | 롱테일 키워드분석 자동화 | `longtail-keyword-expander` | **스마트 매트릭스 스타일** (기준 구현) | 다크(차콜 `#0f1115` + 블루 `#2563eb`·앰버 `#f59e0b`) | ✅ 1차 완료 (`v1.06`) | [`longtail-keyword-expander/docs/DESIGN_HANDOFF.md`](longtail-keyword-expander/docs/DESIGN_HANDOFF.md) |
| 50 | 경쟁사 키워드분석 자동화 | `competitor-analysis` | **스마트 매트릭스 스타일** (기준 구현과 같은 뼈대) | 다크(차콜 `#0f1115` + 블루 `#2563eb`·앰버 `#f59e0b`) | ✅ 1차 작업완료 (`v1.07`, 스마트 매트릭스 스타일) | [`competitor-analysis/docs/DESIGN_HANDOFF.md`](competitor-analysis/docs/DESIGN_HANDOFF.md) |
| 51 | 예약(취소)방지 리마인드 | `booking-reminder` | **플로우 위저드 스타일 — 캘린더 리마인드 에디션** | 라이트/화이트 (에메랄드/인디고 액센트) | ✅ 1차 작업완료 (`v1.20`, 플로우 위저드 캘린더 리마인드 에디션) | [`booking-reminder/docs/DESIGN_HANDOFF.md`](booking-reminder/docs/DESIGN_HANDOFF.md) |
| 52 | 구글폼 CRM 자동화 | `crm-google-form` | **스마트 매트릭스 스타일 — 라이트 변형** (Tailwind v3 첫 적용) | 라이트(`#f6f7f9`/`#ffffff` + 블루 `#2563eb`·앰버 `#b45309`) | ✅ 1차 작업완료 (`v1.09`, 맥미니 구현 + 윈도우 빌드·배포·DB·Edge 검수 2026-10-17) | [`crm-google-form/docs/DESIGN_HANDOFF.md`](crm-google-form/docs/DESIGN_HANDOFF.md) |
| 53 | 대량 메일발송 자동화 | `stepmail` | **플로우 위저드 스타일 — 스텝메일 마케팅 에디션** | 라이트/화이트 (스카이블루 `#0284c7` / 인디고 `#4f46e5`) | ✅ 1차 작업완료 (`v1.20`, 플로우 위저드 스텝메일 마케팅 에디션) | [`stepmail/docs/DESIGN_HANDOFF.md`](stepmail/docs/DESIGN_HANDOFF.md) · [`stepmail/docs/IMPROVEMENTS.md`](stepmail/docs/IMPROVEMENTS.md) |
| 54 | 음악(SUNO)자동화 | `music-automation` | 사이버 수노 다크 스튜디오 스타일 | 다크(딥블랙 `#09090b` + 오렌지 `#f97316`) | ✅ 1차 완료 (`v1.08`) | [`music/docs/DESIGN_HANDOFF.md`](music/docs/DESIGN_HANDOFF.md) |
| 55 | 상세페이지 자동화(15p) | `shop-detail-page` | **이커머스 셀러 스튜디오 스타일** | 퓨어 화이트 (`#ffffff` + 블루 `#2563eb`·오렌지 `#f97316`) | ✅ 1차 완료 (`v1.08`) | [`shop-detail-page/docs/DESIGN_HANDOFF.md`](shop-detail-page/docs/DESIGN_HANDOFF.md) |
| 56 | INSTA 포스팅 자동화 | `auto-instagram-posting` (폴더 `insta_auto_poster`) | **플로우 위저드 스타일 (인스타 바이럴 변형)** | 다크(인스타 딥나이트 `#0d0f17` + 로즈/핑크 그라디언트) | ✅ 1차 작업완료 (`v1.23`, 플로우 위저드 스타일) | [`insta_auto_poster/docs/DESIGN_HANDOFF.md`](insta_auto_poster/docs/DESIGN_HANDOFF.md) |
| 57 | 부동산 실거래 투자분석 | `real-estate-sales` | **스마트 매트릭스 스타일** (다크 슬레이트, Tailwind v4) | 다크(차콜 `#0f1115` + 블루 `#2563eb`·앰버 `#f59e0b`) | ✅ 1차 작업완료 (`v1.11`, 블랙 확정·Windows 빌드/배포/DB/Edge 1440·375 검수 2026-10-17) | [`real_estate_sales/docs/DESIGN_HANDOFF.md`](real_estate_sales/docs/DESIGN_HANDOFF.md) |
| 58 | YOUTUBE Shots 자동화 | `auto-shorts-posting` | **유튜브 다크 콘솔 스타일 — 쇼츠 스튜디오 에디션** | 다크(옵시디언 블랙 `#0f0f0f` + 유튜브 레드 `#ff0000`) | ✅ 1차 작업완료 (`v1.20`, 유튜브 다크 콘솔 스타일) | [`shots/docs/DESIGN_HANDOFF.md`](shots/docs/DESIGN_HANDOFF.md) · [`shots/docs/IMPROVEMENTS.md`](shots/docs/IMPROVEMENTS.md) |
| 59 | BLOG(원문)생성 자동화 | `ai-auto-blog` | **플로우 위저드 스타일 — 블로그 퍼블리싱 에디션** | 라이트/화이트 (에메랄드/인디고 액센트) | ✅ 1차 작업완료 (`v1.75`, 플로우 위저드 블로그 퍼블리싱 에디션) | [`ai-auto-blog/docs/DESIGN_HANDOFF.md`](ai-auto-blog/docs/DESIGN_HANDOFF.md) · [`ai-auto-blog/docs/IMPROVEMENTS.md`](ai-auto-blog/docs/IMPROVEMENTS.md) |
| 60 | Threads 포스팅 자동화 | `auto-threads-posting` (폴더 `threads/`) | **스레드 바이럴 스튜디오 스타일** | 다크(모노블랙 `#171717` + 앰버 `#f59e0b`) | ✅ 1차 작업완료 (`v1.17`, 스레드 바이럴 스튜디오 스타일) | [`threads/docs/DESIGN_HANDOFF.md`](threads/docs/DESIGN_HANDOFF.md) · [`threads/docs/IMPROVEMENTS.md`](threads/docs/IMPROVEMENTS.md) |
| 61 | 상세페이지 자동생성기 v1 | `auto-detail-page` | **이커머스 셀러 스튜디오 스타일 — 상세페이지 기획 에디션** | 퓨어 화이트 (로열 블루 `#2563eb` / 셀러 오렌지 `#f97316`) | ✅ 1차 작업완료 (`v1.20`, 이커머스 셀러 스튜디오 스타일) | [`auto-detail-page/docs/DESIGN_HANDOFF.md`](auto-detail-page/docs/DESIGN_HANDOFF.md) · [`auto-detail-page/docs/IMPROVEMENTS.md`](auto-detail-page/docs/IMPROVEMENTS.md) |
| 62 | AI 할 일·성과 관리 | `ai-task-planner` | **스마트 매트릭스 다크 스타일** | 다크(딥 나이트 네이비 `#0b0f19`) | ✅ 1차 작업완료 (`v1.07`, 스마트 매트릭스 다크 스타일) | [`ai-task-planner/docs/DESIGN_HANDOFF.md`](ai-task-planner/docs/DESIGN_HANDOFF.md) |
| 63 | AI 종합 성격 진단 자동화 | `personality-suite` | **크리에이티브 아틀리에 스타일 — 미스틱 미드나잇 퍼플 랩 에디션** (2026-10-20 타로점 템플릿 이식) | 딥 미드나잇 퍼플 (`#090614` + 바이올렛 `#a855f7`·골드 `#f59e0b`) | ✅ 1차 작업완료 (`v1.25`, 타로점 미드나잇 퍼플 스타일 · 이미지 스튜디오식 좌측 메뉴) | [`personality-suite/docs/DESIGN_HANDOFF.md`](personality-suite/docs/DESIGN_HANDOFF.md) · [`personality-suite/docs/IMPROVEMENTS.md`](personality-suite/docs/IMPROVEMENTS.md) |
| 64 | AI 문서번역 자동화 | `document-translator` | **포커스 스튜디오 스타일 — 소프트 크림 문서번역 에디션** | 라이트(소프트 크림 `#fdfbf7` + 딥 인디고 `#4f46e5`) | ✅ 1차 작업완료 (`v1.20`, 포커스 스튜디오 스타일) | [`document-translator/docs/DESIGN_HANDOFF.md`](document-translator/docs/DESIGN_HANDOFF.md) · [`document-translator/docs/IMPROVEMENTS.md`](document-translator/docs/IMPROVEMENTS.md) |
| 65 | AI 엑셀·텍스트 합치기 자동화 | `file-merge` | **스마트 매트릭스 스타일 — 라이트 변형** (라이트 토큰 기준값) | 라이트(`#f6f7f9`/`#ffffff` + 블루 `#2563eb`·앰버 `#b45309`) | ✅ 1차 작업완료 (`v1.07`, 스마트 매트릭스 라이트 변형) | [`file-merge/docs/DESIGN_HANDOFF.md`](file-merge/docs/DESIGN_HANDOFF.md) |
| 66 | 네이버 블로그 자동화(App) | `naver-blog-auto-poster` | 플로우 위저드 스타일 (권장) | 라이트(화이트) | ⏸ 보류 (비활성 프로그램) | `naver-blog-auto-poster_app/AGENTS.md` |
| 67 | 네이버 블로그 자동화(Web) | `naver-blog-auto-poster-web` | 플로우 위저드 스타일 (권장) | 라이트(화이트) | ⏸ 보류 (비활성 프로그램) | `naver-blog-auto-poster_web/AGENTS.md` |
| 68 | AI 글쓰기 에디터 자동화 | `ai-writing-editor` | **포커스 스튜디오 스타일 — 글쓰기 에디터 에디션** | 라이트(소프트 크림 `#fdfbf7` + 딥 인디고 `#4f46e5`) | ✅ 1차 작업완료 (`v1.10`, 포커스 스튜디오 스타일) | [`ai-writing-editor/docs/DESIGN_HANDOFF.md`](ai-writing-editor/docs/DESIGN_HANDOFF.md) · [`ai-writing-editor/docs/IMPROVEMENTS.md`](ai-writing-editor/docs/IMPROVEMENTS.md) |
| 69 | AI 랜딩페이지 기획 자동화 | `landing-architect` | **플로우 위저드 스타일 — 단계별 랜딩페이지 기획 에디션** | 라이트(소프트 슬레이트 `#f8fafc` + 인디고 블루 `#2563eb`) | ✅ 1차 작업완료 (`v1.10`, 플로우 위저드 스타일) | [`landing-architect/docs/DESIGN_HANDOFF.md`](landing-architect/docs/DESIGN_HANDOFF.md) · [`landing-architect/docs/IMPROVEMENTS.md`](landing-architect/docs/IMPROVEMENTS.md) |
| 70 | UI Canvas 자동화 | `ui-canvas` | **크리에이티브 아틀리에 스타일 — 캔버스 프로 에디션** | 다크(미드나잇 다크 네이비 `#0c0f17`) | ✅ 1차 작업완료 (`v1.10`, 크리에이티브 아틀리에 스타일) | [`ui-canvas/docs/DESIGN_HANDOFF.md`](ui-canvas/docs/DESIGN_HANDOFF.md) · [`ui-canvas/docs/IMPROVEMENTS.md`](ui-canvas/docs/IMPROVEMENTS.md) |
| 71 | AI 슬라이드 자동화 | `ai-slide-builder` | **플로우 위저드 스타일 — 단계별 슬라이드 기획 에디션** | 라이트(소프트 슬레이트 `#f8fafc` + 인디고 블루 `#2563eb`) | ✅ 1차 작업완료 (`v1.10`, 플로우 위저드 스타일) | [`ai-slide-builder/docs/DESIGN_HANDOFF.md`](ai-slide-builder/docs/DESIGN_HANDOFF.md) · [`ai-slide-builder/docs/IMPROVEMENTS.md`](ai-slide-builder/docs/IMPROVEMENTS.md) |
| 72 | AI 웹 UI 제작 자동화 | `ai-web-ui` | **크리에이티브 아틀리에 스타일 — 리액트 쇼케이스 변형** | 다크(미드나잇 네이비 `#0a0d14` + 리액트 사이언 `#38bdf8`·바이올렛 `#a855f7`) | ✅ 1차 작업완료 (`v1.05`, 리액트 쇼케이스 변형) | [`react-ui-showcase/docs/DESIGN_HANDOFF.md`](react-ui-showcase/docs/DESIGN_HANDOFF.md) · [`react-ui-showcase/docs/IMPROVEMENTS.md`](react-ui-showcase/docs/IMPROVEMENTS.md) |
| 73 | AI 리버스 프롬프트 자동화 | `reverse-prompt` | **크리에이티브 아틀리에 스타일 — 리버스 프롬프트 아키텍트 에디션** | 다크(미드나잇 `#0b0e14` + 앰버 `#f59e0b`·바이올렛 `#8b5cf6`) | ✅ 1차 작업완료 (`v1.10`, 크리에이티브 아틀리에 스타일) | [`reverse-prompt/docs/DESIGN_HANDOFF.md`](reverse-prompt/docs/DESIGN_HANDOFF.md) · [`reverse-prompt/docs/IMPROVEMENTS.md`](reverse-prompt/docs/IMPROVEMENTS.md) |
| 74 | AI 블로그 키워드 자동화 | `blog-keyword` | **스마트 매트릭스 스타일** (일반 CSS 이식) | 다크(차콜 `#0f1115` + 블루 `#2563eb`·앰버 `#f59e0b`) | ✅ 1차 작업완료 (`v1.05`, 스마트 매트릭스 스타일) | [`blog-keyword/docs/DESIGN_HANDOFF.md`](blog-keyword/docs/DESIGN_HANDOFF.md) |
| 75 | AI 블로그 콘텐츠 제작 자동화 | `blog-content-maker` | **플로우 위저드 스타일 — 단계별 블로그 콘텐츠 에디션** | 라이트(소프트 화이트 `#f8fafc` + 인디고 블루 `#2563eb`·에메랄드 `#10b981`) | ✅ 1차 작업완료 (`v1.10`, 플로우 위저드 스타일 — 단계별 블로그 콘텐츠 에디션) | [`blog-content-maker/docs/DESIGN_HANDOFF.md`](blog-content-maker/docs/DESIGN_HANDOFF.md) · [`blog-content-maker/docs/IMPROVEMENTS.md`](blog-content-maker/docs/IMPROVEMENTS.md) |
| 76 | AI 썸네일 마스터 자동화 | `thumbnail-master` | **크리에이티브 아틀리에 스타일 — 썸네일 매거진 변형** | 다크(미드나잇 다크 `#0c0f17` + 썸네일 바이올렛 `#8b5cf6`·코랄 오렌지 `#f97316`) | ✅ 1차 작업완료 (`v1.07`, 썸네일 매거진 변형) | [`thumbnail-master/docs/DESIGN_HANDOFF.md`](thumbnail-master/docs/DESIGN_HANDOFF.md) · [`thumbnail-master/docs/IMPROVEMENTS.md`](thumbnail-master/docs/IMPROVEMENTS.md) |
| 77 | AI 마스터링 스튜디오 | `ai-mastering-studio` | **사이버 네온 다크 콘솔 스타일 — 오디오 마스터링 콘솔 에디션** | 다크(딥블랙 `#060911` + 네온 시안 `#00f0ff`·퍼플 `#7000ff`) | ✅ 1차 작업완료 (`v1.10`, 사이버 네온 다크 콘솔 스타일) | [`ai-mastering-studio/docs/DESIGN_HANDOFF.md`](ai-mastering-studio/docs/DESIGN_HANDOFF.md) · [`ai-mastering-studio/docs/IMPROVEMENTS.md`](ai-mastering-studio/docs/IMPROVEMENTS.md) |
| 78 | AI Audio분석 자동화 | `ai-audio-analyzer` | **사이버 네온 다크 콘솔 스타일 — 오디오 인텔리전스 랩 에디션** | 다크(딥블랙 `#060911` + 네온 시안 `#00f0ff`·바이올렛 `#8b5cf6`) | ✅ 1차 작업완료 (`v1.10`, 사이버 네온 다크 콘솔 스타일) | [`ai-audio-analyzer/docs/DESIGN_HANDOFF.md`](ai-audio-analyzer/docs/DESIGN_HANDOFF.md) · [`ai-audio-analyzer/docs/IMPROVEMENTS.md`](ai-audio-analyzer/docs/IMPROVEMENTS.md) |
| 79 | AI 인물사진 자동화 | `portrait-photo` | 크리에이티브 아틀리에 스타일 — 포토 스튜디오 그래파이트 변형 | 다크(중립 그래파이트) | ✅ 1차 작업완료 (`v1.22`, 포토 스튜디오 그래파이트 변형, Claude Code(윈도우), 2026-10-18) | `portrait-photo/docs/DESIGN_HANDOFF.md` |
| 80 | AI 바나나 캔버스 자동화 | `banana-canvas` | **크리에이티브 아틀리에 스타일 — 바나나 팝 차콜 변형** | 다크(따뜻한 차콜 `#16140f` + 바나나 옐로 `#ffd84d`·리프 그린 `#7ed38a`) | ✅ 1차 작업완료 (`v1.08`, 바나나 팝 차콜 변형) | [`banana-canvas/docs/DESIGN_HANDOFF.md`](banana-canvas/docs/DESIGN_HANDOFF.md) · [`banana-canvas/docs/IMPROVEMENTS.md`](banana-canvas/docs/IMPROVEMENTS.md) |
| 81 | AI 4컷 만화 자동화 | `four-cut-comics` | 크리에이티브 아틀리에 스타일 — 코믹 파스텔 변형 | 파스텔 크림 | ✅ 1차 작업완료 (`v1.12`, 코믹 파스텔 변형, Claude Code(윈도우), 2026-10-18) | `four-cut-comics/docs/DESIGN_HANDOFF.md` |
| 82 | AI 패션스타일 자동화 | `fashion-style` | **크리에이티브 아틀리에 스타일 — 패션 매거진 미드나잇 변형** | 다크(미드나잇 네이비 `#0b0e17` + 로즈 골드 `#f472b6`·일렉트릭 시안 `#38bdf8`) | ✅ 1차 작업완료 (`v1.10`, 패션 매거진 미드나잇 변형) | [`fashion-style/docs/DESIGN_HANDOFF.md`](fashion-style/docs/DESIGN_HANDOFF.md) · [`fashion-style/docs/IMPROVEMENTS.md`](fashion-style/docs/IMPROVEMENTS.md) |
| 83 | AI 포토 리메이크 자동화 | `photo-remake-studio` | **크리에이티브 아틀리에 스타일 — 포토 리메이크 옵시디언 변형** | 다크(옵시디언 딥블랙 `#090a0f` + 리메이크 앰버 `#f59e0b`·에메랄드 `#10b981`) | ✅ 1차 작업완료 (`v1.09`, 포토 리메이크 옵시디언 변형) | [`photo-remake-studio/docs/DESIGN_HANDOFF.md`](photo-remake-studio/docs/DESIGN_HANDOFF.md) · [`photo-remake-studio/docs/IMPROVEMENTS.md`](photo-remake-studio/docs/IMPROVEMENTS.md) |
| 84 | AI 문서 챗봇 자동화 | `ai-doc-chatbot` | **포커스 스튜디오 스타일 — 미드나잇 챗 콘솔 변형** | 다크(미드나잇 `#0d0f17` + 인디고→스카이 포인트) | ✅ 1차 작업완료 (`v1.06`, 포커스 스튜디오 스타일 — 미드나잇 챗 콘솔 변형) | [`ai-doc-chatbot/docs/DESIGN_HANDOFF.md`](ai-doc-chatbot/docs/DESIGN_HANDOFF.md) |

---

## 3. 다른 CLI를 위한 작업 및 인수인계 절차

어떤 AI 코딩 에이전트(Claude Code, Codex, Antigravity)가 특정 프로그램의 디자인 작업에 착수하더라도 다음 순서를 반드시 준수합니다:

1. **작업 시작 전 카탈로그 확인**:
   - 본 문서(`DESIGN.md`)의 카탈로그 표에서 해당 프로그램의 권장/적용 템플릿을 확인합니다.
   - 기존 완료된 프로그램의 `docs/DESIGN_HANDOFF.md`를 열어 해당 템플릿의 색상 변수, CSS 클래스, 컴포넌트 구조를 참고합니다.
2. **디자인 구현**:
   - `globals.css` 토큰 정의, 좌측 사이드바 표준(`docs/SIDEBAR_LAYOUT_STANDARD.md`), 우측 메인 워크스페이스, `/guide` 비주얼 매뉴얼을 구현합니다.
3. **실제 브라우저 화면 검수** (Antigravity·Codex = 그 장비의 Microsoft Edge, Claude Code = 그 장비의 Chrome):
   - 일반 회원 테스트 계정(`buylifemall@naver.com`) 세션으로 데스크톱 및 모바일(375px~390px) 화면을 캡처하여 검증합니다.
4. **산출물 인수인계 의무 작성**:
   - `<프로그램>/docs/DESIGN_HANDOFF.md` 신설: 적용 템플릿 명칭 명시, 컬러 토큰, 컴포넌트 구조, 모바일 대응점 기록.
   - `<프로그램>/docs/IMPROVEMENTS.md` 신설: 작업 중 발견된 로직/기능 개선과제 기록.
   - `<프로그램>/AGENTS.md` 기본 정보 표에 `적용 디자인 템플릿` 필드 갱신.
   - 본 문서(`DESIGN.md`) §2 현황판의 상태를 「✅ 1차 완료 (`vX.YY`)」로 업데이트(착수할 때는 「🔵 작업 중」으로 먼저 표시).
5. **버전 +0.01**(`lib/version.ts` + DB `programs.version`, 핵심 원칙 5번) → **빌드, 커밋, 원격 푸시, 프로덕션 배포 완료**. 맥미니 에이전트는 빌드·배포를 하지 않고 `docs/HANDOFF.md`에 윈도우 CLI 요청을 남긴다(원칙 18-④).

## 4. 공통 주의사항 (2026-10-16 정리)

1. **회원 화면 문구에 "주인님"을 쓰지 않는다.** 화면은 모든 회원이 보므로 호칭 없이 쓰거나 "회원님"을 쓴다. "주인님"은 에이전트가 운영자에게 보고할 때만 쓴다.
2. **실사 사진·일러스트 확보**: 저작권이 확인된 무료 스톡(Pexels·Unsplash 등, 라이선스 확인) 또는 AI 생성 이미지를 쓴다. AI로 여러 장 생성할 때는 비용 지침(`docs/TEST_COST_POLICY.md`)에 따라 장수를 먼저 주인님께 승인받는다. 이미지는 WebP 등으로 압축해 한 장 300KB 이하를 목표로 하고, 장식 이미지는 `loading="lazy"`로 둔다.
3. **좌측 메뉴 폭은 `docs/SIDEBAR_LAYOUT_STANDARD.md` 기준(`md:w-60`~`md:w-64`, 240~256px)**을 따른다.
4. **접근성**: 본문 글자와 배경의 명도 대비 4.5:1 이상(WCAG AA), 손가락으로 누르는 버튼은 44px 이상을 목표로 한다(조절 점 최소 24px — CLAUDE.md 원칙 19).
5. **메인 사이트(루트 AIMaster 홈)**는 이 카탈로그 대상이 아니다. 메인 사이트 디자인 기준은 루트 `CLAUDE.md` "Design System"(검정 `#0a0a0f` + 금색)이며, 바꾸려면 주인님 확인 후 별도 절을 추가한다.

---

## 5. 공식 표준 로그인/회원가입 레이아웃 규격 (Standard Auth Layout Specification)

> **2026-10-17 주인님 지시**: 모든 서브프로그램의 로그인 및 회원가입 안내 화면은 아래의 표준 레이아웃과 컴포넌트 규격을 동일하게 적용합니다. 색상, 테마, 이모티콘은 각 프로그램의 스타일에 맞추어 자유롭게 변경할 수 있습니다.

### 5.1 레이아웃 구조 (2-Tab Layout)

```
+-------------------------------------------------------------------------+
| [배경]: 은은한 24px 격자 모눈 배경 (Grid Pattern) + 중앙 440px 컨테이너  |
|                                                                         |
|        [헤더]: 프로그램 타이틀 (28~32px, Bold, 프로그램 브랜드 컬러)      |
|               서브타이틀: AIMaster 계정(이메일·비밀번호)으로 로그인하세요. |
|                                                                         |
| +---------------------------------------------------------------------+ |
| | [카드 컨테이너]: rounded-2xl, border, shadow                        | |
| |                                                                     | |
| |   [상단 탭 바]: [    로그인 (활성)    ] [      회원가입      ]      | |
| |                                                                     | |
| |   --- [로그인 모드일 때] ----------------------------------------   | |
| |   - 이메일 주소: 좌측 메일 아이콘 (Mail), placeholder               | |
| |   - 비밀번호: 라벨 우측 "비밀번호 찾기?", 좌측 자물쇠 아이콘 (Lock) | |
| |   - 로그인 액션 버튼: [ 로그인 -> ] (Full Width, 브랜드 컬러)       | |
| |                                                                     | |
| |   --- [회원가입 모드일 때] --------------------------------------   | |
| |   - 안내 문구: 이 프로그램은 AIMaster 계정과 구독 권한을 그대로       | |
| |                사용합니다. AIMaster에서 회원가입 후 이 프로그램을    | |
| |                구독하면 이용할 수 있습니다.                           | |
| |   - 회원가입 링크 버튼: [ AIMaster 회원가입 하러가기 ]                | |
| |                         (Full Width, 메인 사이트 /register 링크)     | |
| |                                                                     | |
| |   [하단 푸터]: 계속 진행함으로써 귀하는 당사의 이용약관 및             | |
| |                개인정보 처리방침에 동의하게 됩니다.                  | |
| +---------------------------------------------------------------------+ |
+-------------------------------------------------------------------------+
```

### 5.2 테마별 유연성 규칙
1. **라이트 테마 (기본)**:
   - 배경: `#fafbfc` 베이스 + 은은한 격자 그라데이션 (`linear-gradient(...)` 24px x 24px)
   - 카드: `bg-white`, `border-zinc-200`, `shadow-[0_8px_30px_rgb(0,0,0,0.03)]`
   - 탭 활성: 브랜드 컬러 배경 + 흰 글씨 / 비활성: `text-zinc-600`
2. **다크 테마 (미드나잇/옵시디언/네이비 등)**:
   - 배경: 프로그램 고유 다크 배경 (`#0b0f19`, `#0f0f0f`, `#060911` 등) + 다크 모눈선 (`rgba(255, 255, 255, 0.03)`)
   - 카드: 다크 서피스 (`#161d2b`, `#181818` 등), 테두리 (`border-[#253046]` 등)
   - 인풋: 다크 인풋 서피스 + 플레이스홀더 대비 보정
3. **브랜드 컬러 & 이모티콘**:
   - 프로그램 성격에 따라 포인트 컬러(블루, 레드, 인디고, 오렌지, 바이올렛 등) 및 헤더 로고 이모티콘을 자유롭게 채택.

### 5.3 공식 기준 구현체
- **로그인 폼 컴포넌트**: [`threads-comment-reply/app/(auth)/login/page.tsx`](threads-comment-reply/app/(auth)/login/page.tsx)
- **공통 격자 레이아웃**: [`threads-comment-reply/app/(auth)/layout.tsx`](threads-comment-reply/app/(auth)/layout.tsx)
