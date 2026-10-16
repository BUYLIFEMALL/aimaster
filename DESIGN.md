# AIMaster UI/UX 디자인 메인 지침 및 템플릿 카탈로그 (DESIGN.md)

> **최초 제정**: 2026-10-16 (주인님 지시)  
> **상태**: 최상위 불변 디자인 메인 지침 (Living Standard Document)  
> **적용 대상**: Claude Code, Codex, Antigravity(Gemini) 등 **모든 AI 코딩 에이전트 및 CLI 공통 필독**  
> **연계 문서**: [`docs/PROGRAM_DESIGN_STANDARD.md`](docs/PROGRAM_DESIGN_STANDARD.md) (상세 디자인 가이드), [`docs/SIDEBAR_LAYOUT_STANDARD.md`](docs/SIDEBAR_LAYOUT_STANDARD.md) (좌측 메뉴바 표준)

---

## ★★★ 디자인 최상위 불변 원칙 (2026-10-16 주인님 지시)

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
10. **작업 완료 시 결과·추가개선 항목별 정리, 프로그램 링크 제공 및 프로그램별 인수인계 문서 작성 의무 (2026-10-16 주인님 지시)**:
    - 작업이 완료되면 항상 주인님께 결과 보고 시 **① 작업한 내용**과 **② 추가 개선 제안 내용**을 항목별로 체계적으로 정리하여 보고하고, **③ 작업 프로그램의 실제 서비스 배포 링크(URL)**를 반드시 남깁니다.
    - 또한 각각의 항목에 대한 상세 내용을 **해당 프로그램별 서브폴더 안에 인수인계 문서(`<프로그램>/docs/DESIGN_HANDOFF.md`, `<프로그램>/docs/IMPROVEMENTS.md`, `<프로그램>/docs/IMPROVEMENT_HANDOFF_YYYYMMDD.md`)로 반드시 남겨** 다른 CLI가 언제든 이어받을 수 있도록 체계화합니다.

---

## 1. 공식 디자인 템플릿 시스템 (Design Template System) — 현재 7종

> **카탈로그 단일 기준 (2026-10-16 정리)**: 템플릿 목록과 프로그램별 적용 현황은 **이 문서(`DESIGN.md`)에만** 적는다. `docs/PROGRAM_DESIGN_STANDARD.md`·`CLAUDE.md`·`AGENTS.md`의 "4대/5대 템플릿" 표현은 이 표를 가리키는 것으로 읽는다.
> **기준 예시 유무**: `DESIGN_HANDOFF.md`(색상값·부품 구성)가 있는 템플릿만 다른 프로그램에 바로 옮겨 적용할 수 있다. 현재 기준 예시가 있는 것은 1·2·6·7번과 4번(v1.06 운영 검수 완료)이고, 3·5번은 대표 프로그램 1개를 먼저 완성해 `DESIGN_HANDOFF.md`를 만든 뒤 확대 적용한다.
> **새 템플릿을 만드는 기준**: 기존 템플릿의 색상 토큰이나 화면 골격을 조정해 쓸 수 있으면 새 이름을 만들지 않고 기존 템플릿의 「변형」으로 기록한다(예: `사이버 네온 다크 콘솔 스타일 — 수노 오렌지 변형`). 화면 골격(레이아웃)과 색상 토큰이 둘 다 기존 템플릿과 크게 다를 때만 새 이름을 붙인다.

| 공식 템플릿 스타일 명칭 | 대표 적용 프로그램 | 배경 및 메인 컬러 | 핵심 레이아웃 & 시그니처 특징 | 추천 대상 프로그램 분야 |
|---|---|---|---|---|
| **1. 포커스 스튜디오 스타일<br>(Focus Studio Style)** | **Markdown Studio** (`v1.10`) | 소프트 크림 / 퓨어 화이트<br>포인트: 딥 인디고 & 바이올렛 | 좌우 분할 스플릿 뷰(원문 vs 실시간 렌더링), 상단 툴바, 접이식 탐색기, 종이 질감 캔버스 | AI 글쓰기 에디터, 문서 변환기, 상세페이지 기획, 텍스트 프롬프트 스튜디오 |
| **2. 사이버 네온 다크 콘솔 스타일<br>(Cyber Neon Dark Console Style)** | **뮤직 플레이어** (`v1.05`) | 퓨어 딥 블랙 (`#060911`)<br>포인트: 네온 사이언 & 퍼플 글로우 | 앰프 랙마운트 콘솔 데크, 센터 네온 발광 플레이 버튼, 8밴드 수직 슬라이더 EQ, 글래스모피즘 플레이리스트 | 음악/오디오 플레이어, 비디오 에디터, 캔버스 그래픽 툴, 하이테크 미디어 스튜디오 |
| **3. 플로우 위저드 스타일<br>(Flow Wizard Style)** | **AI 쇼츠 원스톱** (`shorts-onestop-studio`) | 다크/라이트 듀얼 테마<br>포인트: 일렉트릭 블루 & 에메랄드 | 1단계 입력 → 2단계 AI 생성 → 3단계 검수 → 4단계 발행 단계별 프로그레스 바, 선택형 템플릿 카드 | 원스톱 숏폼/영상 자동화, SNS 자동 포스팅, 단계별 랜딩페이지 기획 |
| **4. 스마트 매트릭스 스타일<br>(Smart Matrix Style)** | **롱테일 키워드분석** (`longtail-keyword-expander` `v1.06`, 기준 구현 — 운영 검수 완료) | 슬레이트 그레이 / 다크 차콜<br>포인트: 모던 블루 & 앰버 | 상단 핵심 지표(KPI) 통계 카드 3~4종, 검색/필터 바, 표/그리드 전환 뷰, 실시간 상태 칩 | 키워드 발굴기, 데이터 스크래핑 대시보드, 성과 분석·통계 프로그램 |
| **5. 크리에이티브 아틀리에 스타일<br>(Creative Atelier Style)** | 썸네일 마스터, 4컷 만화, LP 턴테이블 | 딥 미드나잇 블랙<br>포인트: 비비드 골드 & 네온 핑크 | 대형 캔버스 뷰포트 중심, 좌우 옵션 패널, 프리셋 갤러리 썸네일 그리드, 고화질 뷰어 | AI 이미지 생성기, 웹툰/만화 제작기, 썸네일 마스터, 패션 스타일링 |
| **6. 사이버 수노 다크 스튜디오 스타일<br>(Cyber Suno Dark Studio Style)** | **Suno 음악기획** (`suno-music-studio` `v1.10`) | 퓨어 옵시디언 블랙 (`#09090b`)<br>포인트: Suno 앰버 오렌지 & 일렉트릭 바이올렛 | Suno Create 오리지널 감성, 알약형(Pill) 탭/버튼, 4단계 음악기획 파이프라인 가이드북, 공식 사이트 링크 하이라이트 | 음악 기획/작사 생성기, Suno/Udio 사운드 프롬프트 스튜디오, 앨범 기획기 |
| **7. 이커머스 셀러 스튜디오 스타일<br>(E-commerce Seller Studio Style)** | **AI 상세페이지 자동화** (`shop-detail-page` `v1.06`) | 퓨어 화이트 (`#ffffff`) & 슬레이트 (`#f8fafc`)<br>포인트: 스마트스토어 로열 블루 (`#2563eb`) & 셀러 오렌지 (`#f97316`) | 네이버 스마트스토어/쿠팡 셀러센터 감성, 4단계 파이프라인 가이드북 & 15개 섹션 블록 맵, 점선 드래그앤드롭 업로더, 15단 섹션 넘버링 뷰어 & 롱 이미지 원클릭 병합 바 | 이커머스 상세페이지 생성기, 쇼핑몰 상품 등록기, 오픈마켓 소싱 자동화 |
| **8. 스레드 바이럴 스튜디오 스타일<br>(Threads Viral Studio Style)** | **Threads 콘텐츠 운영 자동화** (`threads-content-ops` `v1.96`) | 클린 화이트 (`#ffffff`) & 슬레이트 (`#f8fafc`)<br>포인트: 바이럴 파이어 앰버 (`#f59e0b`) & 일렉트릭 바이올렛 (`#8b5cf6`) & Threads 블랙 (`#171717`) | Meta Threads 공식 감성, 5단계 파이프라인 가이드북 & Meta 연동 가이드, 모바일 전용 햄버거 헤더, 6종 페르소나 카드 갤러리, 500자 제약 컨트롤 | Threads 운영 자동화, SNS 바이럴 콘텐츠 제작기, 제휴 마케팅 자동 포스팅 |


---

## 2. 전체 프로그램 디자인 작업 현황판 (Master Design Registry) — 중복 작업 방지

> **2026-10-16 주인님 지시**: 개발된 전체 프로그램(83개, `docs/PROGRAM_CAPABILITY_MAP.md` 기준)의 디자인 작업 상태를 이 표 하나로 관리한다. **작업을 시작하기 전에 반드시 이 표와 `docs/ACTIVE_WORK.md`를 함께 확인**하고, 「✅ 1차 완료」·「🔵 작업 중」인 프로그램은 다른 CLI가 새로 리뉴얼하지 않는다(추가 개선은 그 프로그램 `docs/IMPROVEMENTS.md`에 적고 주인님 승인 후 진행).
>
> **상태 구분** (2026-10-16 기준: ✅ 9개 · ⚪ 72개 · ⏸ 2개):
> - ✅ **1차 완료**: 디자인 템플릿 적용·배포까지 끝남 (가능하면 `docs/DESIGN_HANDOFF.md` 있음)
> - 📋 **플랜 수립 완료**: 기능/로직 분석 기반 디자인 리뉴얼 플랜 및 개선사항 인수인계서 작성 완료 (구현 착수 대기)
> - 🔵 **작업 중**: 지금 어떤 CLI가 디자인 작업 중 — 같은 프로그램 착수 금지
> - ⚪ **작업 예정**: 아직 디자인 리뉴얼 전. 템플릿 칸의 「(권장)」은 추천일 뿐 확정 아님
> - ⏸ **보류**: 비활성 프로그램 등 당장 대상 아님
>
> **상태 바꾸는 법**: 착수할 때 ⚪→🔵 「🔵 작업 중 (CLI(장비), 날짜)」로 고치고 `docs/ACTIVE_WORK.md`에 줄 추가 → 배포·검수 후 「✅ 1차 완료 (`vX.YY`)」 + 인수인계 문서 링크로 고치고 ACTIVE_WORK 줄 삭제. 상태 칸 외의 다른 줄은 건드리지 않는다.
>
> **★ 작업이 끝나면 즉시 「✅ 1차 완료」로 바꾼다 (2026-10-16 주인님 지시)** — 다른 CLI가 같은 프로그램을 다시 작업하지 않도록, 디자인 작업을 마친 CLI는 같은 커밋에서 이 표의 상태를 「✅ 1차 완료 (`vX.YY`, CLI(장비) 날짜)」로 바꾸고 `docs/ACTIVE_WORK.md`의 자기 줄을 지운다. 빌드·배포·검수가 남았으면(예: 맥미니 작업) 상태 칸에 「— 빌드·배포·검수는 윈도우 대기」를 덧붙이고, 그 남은 일은 `docs/HANDOFF.md` 대기 항목으로만 처리한다(새 리뉴얼 착수 금지).

| No | 서브프로그램명 | slug | 적용 디자인 템플릿 스타일 | 배경 테마 | 디자인 상태 | 인수인계 문서 |
|:---:|---|---|---|:---:|:---:|:---:|
| 1 | 마크다운 문서 자동화 | `markdown-studio` | **포커스 스튜디오 스타일** | 라이트(크림) | ✅ 1차 완료 | [`markdown-studio/docs/DESIGN_HANDOFF.md`](markdown-studio/docs/DESIGN_HANDOFF.md) |
| 2 | 뮤직 플레이어 자동화 | `music-player` | **사이버 네온 다크 콘솔 스타일** | 다크(딥블랙) | ✅ 1차 완료 | [`music-player/docs/DESIGN_HANDOFF.md`](music-player/docs/DESIGN_HANDOFF.md) |
| 3 | AI 쇼츠 원스톱 제작 자동화 | `shorts-onestop-studio` | **플로우 위저드 스타일** | 다크/라이트 | ✅ 1차 완료 (`v1.12`) | [`shorts-onestop-studio/docs/DESIGN_HANDOFF.md`](shorts-onestop-studio/docs/DESIGN_HANDOFF.md) |
| 4 | AI 블로그 작업실 자동화 | `blog-workroom` | **포커스 스튜디오 스타일** | 라이트(크림/화이트) | ✅ 1차 완료 (`v1.05`) | [`blog-workroom/docs/DESIGN_HANDOFF.md`](blog-workroom/docs/DESIGN_HANDOFF.md) |
| 5 | AI 올인원 그래픽 자동화 | `allinone-graphic` | **크리에이티브 아틀리에 스타일** | 다크(미드나잇) | ✅ 1차 완료 (`v1.04`) | [`allinone-graphic/docs/DESIGN_HANDOFF.md`](allinone-graphic/docs/DESIGN_HANDOFF.md) |
| 6 | 플레이리스트 채널 제작 | `playlist-channel-studio` | 사이버 네온 다크 콘솔 스타일 (권장) | 다크(딥블랙) | ⚪ 작업 예정 | `playlist-channel-studio/AGENTS.md` |
| 7 | 시네마틱 스토리보드 자동화 | `cinematic-storyboard-studio` | 크리에이티브 아틀리에 스타일 (권장) | 다크(차콜) | ⚪ 작업 예정 | `cinematic-storyboard-studio/AGENTS.md` |
| 8 | AI 12단 상세페이지 자동화 | `detail-page-12p` | 포커스 스튜디오 스타일 (권장) | 라이트(화이트) | ⚪ 작업 예정 | `detail-page-12p/AGENTS.md` |
| 9 | AI 프롬프트 템플릿 자동화 | `prompt-template-studio` | 포커스 스튜디오 스타일 (권장) | 라이트(크림) | ⚪ 작업 예정 | `prompt-template-studio/AGENTS.md` |
| 10 | 페르소나 문체 자동화 | `persona-style-studio` | 포커스 스튜디오 스타일 (권장) | 라이트(화이트) | ⚪ 작업 예정 | `persona-style-studio/AGENTS.md` |
| 11 | AI Prompt 자동화 | `ai-prompt-studio` | 포커스 스튜디오 스타일 (권장) | 라이트(화이트) | ⚪ 작업 예정 | `ai-prompt-studio/AGENTS.md` |
| 12 | Youtube Playlist 자동화 | `yt-playlist-studio` | 사이버 네온 다크 콘솔 스타일 (권장) | 다크(딥블랙) | ⚪ 작업 예정 | `yt-playlist-studio/AGENTS.md` |
| 13 | LP 턴테이블 자동화 | `vinyl-lp-studio` | 크리에이티브 아틀리에 스타일 (권장) | 다크(미드나잇) | ⚪ 작업 예정 | `vinyl-lp-studio/AGENTS.md` |
| 14 | 무한루프 영상자동화 | `infinite-loop-video` | 크리에이티브 아틀리에 스타일 (권장) | 다크(차콜) | ⚪ 작업 예정 | `infinite-loop-video/AGENTS.md` |
| 15 | AI 인플루언서 자동화 | `ai-influencer-studio` | 크리에이티브 아틀리에 스타일 (권장) | 다크(미드나잇) | ⚪ 작업 예정 | `ai-influencer-studio/AGENTS.md` |
| 16 | 뮤직비디오 자동화 | `music-video-studio` | 사이버 네온 다크 콘솔 스타일 (권장) | 다크(딥블랙) | ⚪ 작업 예정 | `music-video-studio/AGENTS.md` |
| 17 | 이미지 변환 스튜디오 | `image-convert-studio` | 크리에이티브 아틀리에 스타일 (권장) | 다크/라이트 | ⚪ 작업 예정 | `image-convert-studio/AGENTS.md` |
| 18 | Suno 음악기획 자동화 | `suno-music-studio` | **사이버 수노 다크 스튜디오 스타일** | 다크(옵시디언 블랙) | ✅ 1차 완료 | [`suno-music-studio/docs/DESIGN_HANDOFF.md`](suno-music-studio/docs/DESIGN_HANDOFF.md) |
| 19 | 감성 글귀 이미지 | `emotion-writer` | 포커스 스튜디오 스타일 (권장) | 라이트(크림) | ⚪ 작업 예정 | `emotion-writer/AGENTS.md` |
| 20 | eBook Studio | `ebook-studio` | 포커스 스튜디오 스타일 (권장) | 라이트(화이트) | ⚪ 작업 예정 | `ebook-studio/AGENTS.md` |
| 21 | Website Scraper | `website-scraper` | **스마트 매트릭스 스타일** (Tailwind v4 이식) | 다크(차콜 `#0f1115` + 블루 `#2563eb`·앰버 `#f59e0b`) | ✅ 1차 완료 (`v1.12`, Claude Code 맥미니 2026-10-16 — 빌드·배포·검수는 윈도우 대기) | [`ghost-scraper/docs/DESIGN_HANDOFF.md`](ghost-scraper/docs/DESIGN_HANDOFF.md) |
| 22 | AI 유튜브 썸네일 프로 | `seo-thumbnail-pro` | 크리에이티브 아틀리에 스타일 (권장) | 다크(미드나잇) | ⚪ 작업 예정 | `seo-thumbnail-pro/AGENTS.md` |
| 23 | 이미지 스타일 분석기 | `style-dna-analyzer` | 크리에이티브 아틀리에 스타일 (권장) | 다크(미드나잇) | ⚪ 작업 예정 | `style-dna-analyzer/AGENTS.md` |
| 24 | INSTA Cardnews 자동화 | `cardnews-studio` | 크리에이티브 아틀리에 스타일 (권장) | 다크/라이트 | ⚪ 작업 예정 | `cardnews-studio/AGENTS.md` |
| 25 | AI 웹툰 자동화 | `ai-webtoon-studio` | 크리에이티브 아틀리에 스타일 (권장) | 다크(차콜) | ⚪ 작업 예정 | `ai-webtoon-studio/AGENTS.md` |
| 26 | 네이버 블로그 올인원 자동화 | `naver-blog-allinone` | 플로우 위저드 스타일 (권장) | 라이트(화이트) | ⚪ 작업 예정 | `naver-blog-allinone/AGENTS.md` |
| 27 | YOUTUBE CHANNEL CONSULTANT | `youtube-channel-consultant` | 스마트 매트릭스 스타일 (권장) | 다크(슬레이트) | ⚪ 작업 예정 | `youtube-channel-consultant/AGENTS.md` |
| 28 | YOUTUBE VIRAL FINDER | `youtube-viral-studio` | 스마트 매트릭스 스타일 (권장) | 다크(슬레이트) | ⚪ 작업 예정 | `youtube-viral-studio/AGENTS.md` |
| 29 | 네이버 블로그 에이전트 | `naver-blog-agent` | 플로우 위저드 스타일 (권장) | 라이트(화이트) | ⚪ 작업 예정 | `naver-blog-agent/AGENTS.md` |
| 30 | Threads 콘텐츠 운영 자동화 | `threads-content-ops` | **스레드 바이럴 스튜디오 스타일** | 라이트(화이트/앰버) | ✅ 1차 완료 (`v1.97`) | [`threads-content-ops/docs/DESIGN_HANDOFF.md`](threads-content-ops/docs/DESIGN_HANDOFF.md) |
| 31 | 쇼츠 떡상 분석·대본 자동화 | `shorts-viral-studio` | 플로우 위저드 스타일 (권장) | 다크(차콜) | ⚪ 작업 예정 | `shorts-viral-studio/AGENTS.md` |
| 32 | Threads AI 기획 자동화 | `threads-easy-planner` | 플로우 위저드 스타일 (권장) | 다크(미드나잇) | ⚪ 작업 예정 | `threads-easy-planner/AGENTS.md` |
| 33 | 티스토리(원문)생성 자동화 | `tistory-auto-blog` | 플로우 위저드 스타일 (권장) | 라이트(화이트) | ⚪ 작업 예정 | `tistory-auto-blog/AGENTS.md` |
| 34 | AI 이미지 스튜디오 | `ai-image-studio` | 크리에이티브 아틀리에 스타일 (권장) | 다크(미드나잇) | ⚪ 작업 예정 | `ai-image-studio/AGENTS.md` |
| 35 | 네이버 블로그 SEO 스튜디오 | `naver-blog-seo-studio` | 스마트 매트릭스 스타일 (권장) | 라이트(화이트) | ⚪ 작업 예정 | `naver-blog-seo-studio/AGENTS.md` |
| 36 | 상세페이지 GIF 자동화 | `video-to-gif` | 크리에이티브 아틀리에 스타일 (권장) | 다크(차콜) | ⚪ 작업 예정 | `video-to-gif/AGENTS.md` |
| 37 | AIMaster 타로점 | `tarot-reading` | 크리에이티브 아틀리에 스타일 (권장) | 딥 미드나잇 퍼플 | ⚪ 작업 예정 | `tarot/AGENTS.md` |
| 38 | 캐릭코드(MBTI) 측정기 | `mbti-character` | 크리에이티브 아틀리에 스타일 (권장) | 파스텔 크림 | ⚪ 작업 예정 | `mbti-character/AGENTS.md` |
| 39 | 성격코드(MBTI) 측정기 | `personality-code` | 크리에이티브 아틀리에 스타일 (권장) | 파스텔 크림 | ⚪ 작업 예정 | `mbti/AGENTS.md` |
| 40 | 네이버 카페 포스팅 자동화 | `naver-cafe-poster` | 플로우 위저드 스타일 (권장) | 라이트(화이트) | ⚪ 작업 예정 | `naver-cafe-poster/AGENTS.md` |
| 41 | 카카오톡 뉴스레터 자동화 | `kakao-auto-posting` | 플로우 위저드 스타일 (권장) | 옐로우/화이트 | ⚪ 작업 예정 | `kakao-auto-posting/AGENTS.md` |
| 42 | 웹 크롤링 자동화 | `web-crawler-saas` | 스마트 매트릭스 스타일 (권장) | 다크(차콜) | ⚪ 작업 예정 | `web-crawler-saas/AGENTS.md` |
| 43 | 상품소싱 자동화 | `trending-product-finder` | 스마트 매트릭스 스타일 (권장) | 다크(차콜) | ⚪ 작업 예정 | `trending-product-finder/AGENTS.md` |
| 44 | Threads 쇼핑제휴 자동화 | `threads-affiliate-poster` | 플로우 위저드 스타일 (권장) | 다크(미드나잇) | ⚪ 작업 예정 | `threads-affiliate-poster/AGENTS.md` |
| 45 | INSTA DM답변 자동화 | `instagram-dm-reply` | 스마트 매트릭스 스타일 (권장) | 라이트/화이트 | ⚪ 작업 예정 | `instagram-dm-reply/AGENTS.md` |
| 46 | Threads 댓글자동화 | `threads-comment-reply` | 스마트 매트릭스 스타일 (권장) | 다크(미드나잇) | ⚪ 작업 예정 | `threads-comment-reply/AGENTS.md` |
| 47 | INSTA 댓글자동화 | `instagram-comment-reply` | 스마트 매트릭스 스타일 (권장) | 라이트/화이트 | ⚪ 작업 예정 | `instagram-comment-reply/AGENTS.md` |
| 48 | 유튜브 댓글자동화 | `youtube-auto-reply` | 스마트 매트릭스 스타일 (권장) | 다크(차콜) | ⚪ 작업 예정 | `youtube-auto-reply/AGENTS.md` |
| 49 | 롱테일 키워드분석 자동화 | `longtail-keyword-expander` | **스마트 매트릭스 스타일** (기준 구현) | 다크(차콜 `#0f1115` + 블루 `#2563eb`·앰버 `#f59e0b`) | ✅ 1차 완료 (`v1.06`) | [`longtail-keyword-expander/docs/DESIGN_HANDOFF.md`](longtail-keyword-expander/docs/DESIGN_HANDOFF.md) |
| 50 | 경쟁사 키워드분석 자동화 | `competitor-analysis` | 스마트 매트릭스 스타일 (권장) | 다크(차콜) | ⚪ 작업 예정 | `competitor-analysis/AGENTS.md` |
| 51 | 예약(취소)방지 리마인드 | `booking-reminder` | 플로우 위저드 스타일 (권장) | 라이트/화이트 | ⚪ 작업 예정 | `booking-reminder/AGENTS.md` |
| 52 | 구글폼 CRM 자동화 | `crm-google-form` | 스마트 매트릭스 스타일 (권장) | 라이트/화이트 | ⚪ 작업 예정 | `crm-google-form/AGENTS.md` |
| 53 | 대량 메일발송 자동화 | `stepmail` | 플로우 위저드 스타일 (권장) | 라이트/화이트 | ⚪ 작업 예정 | `stepmail/AGENTS.md` |
| 54 | 음악(SUNO)자동화 | `music-automation` | 사이버 수노 다크 스튜디오 스타일 | 다크(딥블랙 `#09090b` + 오렌지 `#f97316`) | ✅ 1차 완료 (`v1.08`) | [`music/docs/DESIGN_HANDOFF.md`](music/docs/DESIGN_HANDOFF.md) |
| 55 | 상세페이지 자동화(15p) | `shop-detail-page` | **이커머스 셀러 스튜디오 스타일** | 퓨어 화이트 (`#ffffff` + 블루 `#2563eb`·오렌지 `#f97316`) | ✅ 1차 완료 (`v1.08`) | [`shop-detail-page/docs/DESIGN_HANDOFF.md`](shop-detail-page/docs/DESIGN_HANDOFF.md) |
| 56 | INSTA 포스팅 자동화 | `auto-instagram-posting` | 플로우 위저드 스타일 (권장) | 라이트/화이트 | ⚪ 작업 예정 | `insta-auto-poster/AGENTS.md` |
| 57 | 부동산 실거래 투자분석 | `real-estate-sales` | 스마트 매트릭스 스타일 (권장) | 다크(슬레이트) | ⚪ 작업 예정 | `real-estate-sales/AGENTS.md` |
| 58 | YOUTUBE Shots 자동화 | `auto-shorts-posting` | 플로우 위저드 스타일 (권장) | 다크(차콜) | ⚪ 작업 예정 | `shots/AGENTS.md` |
| 59 | BLOG(원문)생성 자동화 | `ai-auto-blog` | 플로우 위저드 스타일 (권장) | 라이트/화이트 | ⚪ 작업 예정 | `ai-auto-blog/AGENTS.md` |
| 60 | Threads 포스팅 자동화 | `auto-threads-posting` | 플로우 위저드 스타일 (권장) | 다크(미드나잇) | ⚪ 작업 예정 | `threads/AGENTS.md` |
| 61 | 상세페이지 자동생성기 v1 | `auto-detail-page` | 포커스 스튜디오 스타일 (권장) | 라이트/화이트 | ⚪ 작업 예정 | `auto-detail-page/AGENTS.md` |
| 62 | AI 할 일·성과 관리 | `ai-task-planner` | 스마트 매트릭스 스타일 (권장) | 라이트/화이트 | ⚪ 작업 예정 | `ai-task-planner/AGENTS.md` |
| 63 | AI 종합 성격 진단 자동화 | `personality-suite` | 크리에이티브 아틀리에 스타일 (권장) | 파스텔 크림 | ⚪ 작업 예정 | `personality-suite/AGENTS.md` |
| 64 | AI 문서번역 자동화 | `document-translator` | 포커스 스튜디오 스타일 (권장) | 라이트(크림) | ⚪ 작업 예정 | `document-translator/AGENTS.md` |
| 65 | AI 엑셀·텍스트 합치기 자동화 | `file-merge` | 스마트 매트릭스 스타일 (권장) | 라이트/화이트 | ⚪ 작업 예정 | `file-merge/AGENTS.md` |
| 66 | 네이버 블로그 자동화(App) | `naver-blog-auto-poster` | 플로우 위저드 스타일 (권장) | 라이트(화이트) | ⏸ 보류 (비활성 프로그램) | `naver-blog-auto-poster_app/AGENTS.md` |
| 67 | 네이버 블로그 자동화(Web) | `naver-blog-auto-poster-web` | 플로우 위저드 스타일 (권장) | 라이트(화이트) | ⏸ 보류 (비활성 프로그램) | `naver-blog-auto-poster_web/AGENTS.md` |
| 68 | AI 글쓰기 에디터 자동화 | `ai-writing-editor` | 포커스 스튜디오 스타일 (권장) | 라이트(크림) | ⚪ 작업 예정 | `ai-writing-editor/AGENTS.md` |
| 69 | AI 랜딩페이지 기획 자동화 | `landing-architect` | 플로우 위저드 스타일 (권장) | 라이트(화이트) | ⚪ 작업 예정 | `landing-architect/AGENTS.md` |
| 70 | UI Canvas 자동화 | `ui-canvas` | 크리에이티브 아틀리에 스타일 (권장) | 다크(차콜) | ⚪ 작업 예정 | `ui-canvas/AGENTS.md` |
| 71 | AI 슬라이드 자동화 | `ai-slide-builder` | 플로우 위저드 스타일 (권장) | 라이트(화이트) | ⚪ 작업 예정 | `ai-slide-builder/AGENTS.md` |
| 72 | AI 웹 UI 제작 자동화 | `ai-web-ui` | 크리에이티브 아틀리에 스타일 (권장) | 다크(미드나잇) | ⚪ 작업 예정 | `react-ui-showcase/AGENTS.md` |
| 73 | AI 리버스 프롬프트 자동화 | `reverse-prompt` | 크리에이티브 아틀리에 스타일 (권장) | 다크(미드나잇) | ⚪ 작업 예정 | `reverse-prompt/AGENTS.md` |
| 74 | AI 블로그 키워드 자동화 | `blog-keyword` | 스마트 매트릭스 스타일 (권장) | 다크(차콜) | ⚪ 작업 예정 | `blog-keyword/AGENTS.md` |
| 75 | AI 블로그 콘텐츠 제작 자동화 | `blog-content-maker` | 플로우 위저드 스타일 (권장) | 라이트(화이트) | ⚪ 작업 예정 | `blog-content-maker/AGENTS.md` |
| 76 | AI 썸네일 마스터 자동화 | `thumbnail-master` | 크리에이티브 아틀리에 스타일 (권장) | 다크(미드나잇) | ⚪ 작업 예정 | `thumbnail-master/AGENTS.md` |
| 77 | AI 마스터링 스튜디오 | `ai-mastering-studio` | 사이버 네온 다크 콘솔 스타일 (권장) | 다크(딥블랙) | ⚪ 작업 예정 | `ai-mastering-studio/AGENTS.md` |
| 78 | AI Audio분석 자동화 | `ai-audio-analyzer` | 사이버 네온 다크 콘솔 스타일 (권장) | 다크(딥블랙) | ⚪ 작업 예정 | `ai-audio-analyzer/AGENTS.md` |
| 79 | AI 인물사진 자동화 | `portrait-photo` | 크리에이티브 아틀리에 스타일 (권장) | 다크(미드나잇) | ⚪ 작업 예정 | `portrait-photo/AGENTS.md` |
| 80 | AI 바나나 캔버스 자동화 | `banana-canvas` | 크리에이티브 아틀리에 스타일 (권장) | 다크(차콜) | ⚪ 작업 예정 | `banana-canvas/AGENTS.md` |
| 81 | AI 4컷 만화 자동화 | `four-cut-comics` | 크리에이티브 아틀리에 스타일 (권장) | 파스텔 크림 | ⚪ 작업 예정 | `four-cut-comics/AGENTS.md` |
| 82 | AI 패션스타일 자동화 | `fashion-style` | 크리에이티브 아틀리에 스타일 (권장) | 다크(미드나잇) | ⚪ 작업 예정 | `fashion-style/AGENTS.md` |
| 83 | AI 포토 리메이크 자동화 | `photo-remake-studio` | 크리에이티브 아틀리에 스타일 (권장) | 다크(차콜) | ⚪ 작업 예정 | `photo-remake-studio/AGENTS.md` |

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
