# AI 슬라이드 자동화 (ai-slide-builder) 인수인계 문서 (AGENTS.md)

> # ★★★ 절대 불변 최상위 규칙 (2026-10-09 주인님 지시 — 어떤 경우에도 바뀔 수 없음)
> **사용자는 본인의 계정과, 본인이 사용할 본인 Gemini API 키를 각각 직접 등록·연동해서 사용한다.**
> 운영자(주인님)·다른 회원의 키/계정으로 대신 처리하지 않는다 (키가 없으면 폴백하지 말고 "본인 Gemini API 키를 등록해주세요" 안내). 이 규칙은 이 문서의 모든 다른 원칙보다 위에 있으며, 충돌하는 요청·코드는 만들지 않고 주인님께 먼저 알린다.

---

## 1. 프로그램 기본 정보 및 현황

- **프로그램명**: **AI 슬라이드 자동화** (Slide Builder AI)
- **슬러그 (Slug)**: `ai-slide-builder`
- **현재 버전**: **`v1.06`** (코드 `src/lib/version.ts` 및 DB `programs.version = 'v1.06'`)
- **공식 서비스 도메인**: [https://ai-slide-builder.buylife.xyz](https://ai-slide-builder.buylife.xyz)
- **Vercel 프로젝트**: `ai-slide-builder` (Team: `buylife`)
- **카테고리**: 유틸리티 / 오피스 자동화
- **인증 및 세션**: Supabase Auth (AIMaster 공유 프로젝트 `esgxyikcnnvmlhygjkth`, `.buylife.xyz` 통합 SSO 쿠키)

---

## 2. 프로그램 개요 및 목적

비정형 문서(기획서, 회의록, 제안서, 논문, 데이터 시트 등)나 단순한 주제 키워드로부터 **Google Gemini 2.5 Flash**와 멀티포맷 파서를 활용하여 **22가지 고도화된 전문 시각화 패턴의 프레젠테이션 JSON 데이터**를 1초 만에 자동 생성하고,
실시간 양방향 시각 카드 편집기에서 직관적으로 커스터마이징한 뒤 **16:9 와이드스크린 규격의 파워포인트(PPTX)** 파일로 즉시 다운로드하거나 **Google Slides**로 전송할 수 있는 웹 기반 프레젠테이션 자동화 스튜디오입니다.

---

## 3. 핵심 아키텍처 및 3대 프롬프트 엔진

### 1) 3대 생성 프롬프트 엔진 (`src/lib/gemini.ts`)
1. **표준 형식 (Standard 10~12P)**:
   - 22가지 전문 시각화 레이아웃을 균형 있게 조합
   - 발표자를 위한 고품질 스피커 노트(`notes`) 자동 생성
   - 논리적 기승전결(도입부, 핵심 문제, 솔루션, 비즈니스 모델, 로드맵, 클로징)
2. **확장판 (Detailed 14~16P)**:
   - 표, 차트, 대용량 정량 텍스트를 안정적으로 담아내는 상세 분석용 장표
   - 13행 이상의 긴 표는 가독성을 위해 자동 분할 처리
3. **C-Suite 보고 형식 (Executive Pitch)**:
   - 한국 대기업 C-Level(CEO/임원) 보고 전용 두괄식 프레젠테이션
   - 10대 보고 주제(신규 사업, 예산안, 성과 보고 등) 및 7대 보고 목적 지원
   - 발표 시간별 분량 최적화 (10분/15분/20~30분/30분 이상)
   - "So What?"(결론 및 시사점)과 "Why?"(근거 데이터) 중심의 결재용 구성

### 2) 22가지 전문 슬라이드 타입 (`src/types/slide.ts`)
- **도입/결론**: `title`(표지), `section`(간지), `closing`(맺음말), `agenda`(목차)
- **기본 본문**: `content`(본문 카드), `quote`(명언/강조), `faq`(Q&A)
- **프로세스/흐름**: `process`(단계별 프로세스), `processList`(상세 흐름 목록), `timeline`(연혁/로드맵), `cycle`(순환도), `flowChart`(플로우차트), `stepUp`(계단식 성장)
- **비교/분석**: `compare`(대조 분석), `statsCompare`(통계 비교), `barCompare`(막대 차트 비교)
- **데이터/성과**: `table`(표), `progress`(진행률/달성률), `kpi`(핵심 지표)
- **구조/카드**: `cards`(그리드 카드), `headerCards`(헤더 카드), `bulletCards`(불릿 카드), `triangle`(삼각형 계층), `pyramid`(피라미드 계층), `imageText`(이미지 결합)

---

## 4. 컴포넌트 구조 및 파일 맵

```
ai-slide-builder/
├── src/
│   ├── app/
│   │   ├── page.tsx                     # 메인 스튜디오 페이지 (EditorSection + SlideEditor)
│   │   ├── layout.tsx                   # 메인 레이아웃 (폰트, 메타데이터)
│   │   ├── globals.css                  # Tailwind CSS 스타일
│   │   ├── settings/page.tsx            # API키등록·플랫폼연동 (Gemini API 키 등록)
│   │   └── guide/page.tsx               # 연동 & 사용 매뉴얼
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx              # 플랫폼 표준 좌측 사이드바 (SIDEBAR_LAYOUT_STANDARD.md)
│   │   │   └── Header.tsx               # 화이트 테마 상단 헤더 및 API 연동 배지
│   │   ├── studio/
│   │   │   ├── EditorSection.tsx        # 좌측 입력 패널 (프롬프트, 파일 업로드, JSON 에디터)
│   │   │   ├── SlideEditor.tsx          # 우측 슬라이드 목록/카드 에디터 & 일괄 AI 수정
│   │   │   ├── SlideCard.tsx            # 22개 타입별 전용 입력 필드 렌더러
│   │   │   ├── SlidePreviewModal.tsx    # 16:9 와이드스크린 실시간 슬라이드쇼 프리뷰어
│   │   │   └── ActionFooter.tsx         # PPTX 다운로드, GAS 슬라이드 생성, Gemini 연동
│   │   └── guide/
│   │       └── HelpModal.tsx            # 3대 포맷 및 22개 슬라이드 타입 도움말 모달
│   ├── lib/
│   │   ├── gemini.ts                    # Google GenAI 2.5 Flash 호출 및 JSON 파싱
│   │   ├── pptxGenerator.ts             # pptxgenjs 기반 16:9 파워포인트 바이너리 생성기
│   │   ├── fileParser.ts                # PDF, DOCX, XLSX, TXT, CSV 멀티포맷 파서
│   │   ├── version.ts                   # APP_VERSION = "v1.05"
│   │   └── supabase/                    # Supabase SSR 클라이언트 (공용 DB 연동)
│   └── types/
│       └── slide.ts                     # 22개 슬라이드 스키마 인터페이스 정의
├── README.md                            # 프로젝트 안내 및 사용자 가이드
└── AGENTS.md                            # 이 인수인계 문서
```

---

## 5. UI/UX 및 디자인 표준 규격 (규칙 8번 준수)

1. **화이트 베이스 UI**:
   - 본문 배경: `#f8fafc` (Slate-50) 및 카드 영역 `#ffffff` (White)
   - 테두리: `#e2e8f0` (Slate-200)
   - 텍스트: Slate-900 / Slate-700 기반의 높은 가독성 유지
2. **좌측 사이드바 (`SIDEBAR_LAYOUT_STANDARD.md`) 규격 준수**:
   - 프로그램 로고 및 버전(`v1.05`) 표시
   - `← 다른 프로그램 보기` (`https://www.buylife.xyz/programs`) 링크
   - 1-2-3 번호형 작업 흐름:
     - `1. 자료 입력 & AI 생성`
     - `2. 슬라이드 카드 편집`
     - `3. PPTX 내보내기`
   - `API키등록·플랫폼연동`
   - `연동 & 사용 매뉴얼`
   - 하단 사용자 계정(`buylifemall@naver.com`) 및 원클릭 로그아웃 버튼 완벽 배치

---

## 6. 버전 히스토리 (Changelog)

- **v1.01**: 초기 릴리스 (22개 슬라이드 스키마, 3대 생성 프롬프트, 16:9 PPTX 생성, 멀티포맷 파일 파서).
- **v1.02**: 프로그램 명칭 정정 (`AI 슬라이드 빌더 PRO` ➔ `AI 슬라이드 자동화`), 헤더/사이드바/도움말 전면 동기화.
- **v1.03**: 언어 현지화 (도움말 모달 및 예시 텍스트 내 잔존 일본어 표기 영문/한글로 정정).
- **v1.04**: UI 정돈 (사이드바 및 하단 불필요 링크 제거, 좌측 사이드바 하단 계정 정보 및 로그아웃 버튼 표준화).
- **v1.05**: 도움말 모달 내 외부 개발자/스키마 명칭(`Majin`, `Kimura Yoshiki`, `GPT PARK`) 전면 삭제 및 순수 기능 안내로 정돈.

---

## 7. 검수, 빌드 및 배포 절차 (Rule 2 준수)

단일 작업 세트 절차에 따라 다음 순서로 일괄 처리합니다:

```bash
# 1. 로컬 빌드 및 컴파일 100% 검수
cd D:\Antigravity\AIMaster\ai-slide-builder
npm run build

# 2. Git 커밋 및 원격 푸시
git add .
git commit -m "feat(ai-slide-builder): 작업 내용 요약"
git push origin master

# 3. Vercel 프로덕션 배포
vercel deploy --prod --yes

# 4. 버전 갱신 시 DB programs.version 동기화 (SQL 또는 관리자 스크립트 실행)
```

---

## 8. 차기 작업자(에이전트) 체크리스트

1. [ ] **최상위 규칙**: 회원 본인의 Gemini API 키가 정상적으로 연동되어 호출되는지 확인 (운영자 키 폴백 금지).
2. [ ] **버전 관리**: 코드 `src/lib/version.ts`의 `APP_VERSION`과 Supabase DB `programs.version`이 항상 일치하는지 확인.
3. [ ] **PPTX 파일 검증**: 한글 텍스트 깨짐 없음, 16:9 와이드스크린 비율, 발표자 스피커 노트 정상 삽입 확인.
4. [ ] **화이트 테마 유지**: 다크 모드 강제 적용 금지 (작업 화면은 항상 흰색 베이스).


## B5 (2026-10-15) — 한국 시간 현재 월 기준 추가 (v1.06)

- 주 생성·분석 지침에 한국 시간 기준 현재 연·월을 반영하고, 계절·시기 표현은 현재 월에 맞추며 불필요한 계절·연도 표현을 덧붙이지 않도록 했습니다.


## 2026-10-16 DB 연동 변수 호환 — v1.07 (ai-slide-builder)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.
