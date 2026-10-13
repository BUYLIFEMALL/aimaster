# AI 웹 UI 제작 자동화 (react-ui-showcase) 인수인계 문서 (AGENTS.md)

> # ★★★ 절대 불변 최상위 규칙 (2026-10-09 주인님 지시 — 어떤 경우에도 바뀔 수 없음)
> **사용자는 본인의 계정과, 본인이 사용할 본인 Gemini API 키를 각각 직접 등록·연동해서 사용한다.**
> 운영자(주인님)·다른 회원의 키/계정으로 대신 처리하지 않는다 (키가 없으면 폴백하지 말고 "본인 Gemini API 키를 등록해주세요" 안내). 이 규칙은 이 문서의 모든 다른 원칙보다 위에 있으며, 충돌하는 요청·코드는 만들지 않고 주인님께 먼저 알린다.

---

## 1. 프로그램 기본 정보 및 현황

- **프로그램명**: **AI 웹 UI 제작 자동화** (Web UI AI Studio)
- **슬러그 (Slug)**: `ai-web-ui` (카탈로그 상세: [https://www.buylife.xyz/programs/ai-web-ui](https://www.buylife.xyz/programs/ai-web-ui))
- **현재 버전**: **`v1.03`** (코드 `src/lib/version.ts` 및 DB `programs.version = 'v1.03'`)
- **공식 서비스 도메인**: [https://ai-web-ui.buylife.xyz](https://ai-web-ui.buylife.xyz) (보조 도메인: `web-ui.buylife.xyz`, `react-ui-showcase.buylife.xyz`)
- **Vercel 프로젝트**: `react-ui-showcase` (Team: `buylife`)
- **카테고리**: 개발자 도구 / 디자인 시스템 / UI 자동화
- **인증 및 세션**: Supabase Auth (AIMaster 공유 프로젝트 `esgxyikcnnvmlhygjkth`, `.buylife.xyz` 통합 SSO 쿠키)

---

## 2. 프로그램 개요 및 목적

현대적인 프론트엔드 웹 애플리케이션 개발에 필수적인 **12대 핵심 UI 컴포넌트 라이브러리**와 **10가지 인터랙티브 실사용 시뮬레이터 데모**, **클린 TSX 원클릭 소스 코드 복사기**를 완벽 제공하고, 회원 본인의 Google Gemini API 키를 연동하여 자연어 프롬프트 기반으로 즉시 커스텀 UI 컴포넌트 TSX 코드를 생성해 낼 수 있는 올인원 웹 UI 자동화 스튜디오입니다.

---

## 3. 핵심 아키텍처 및 4대 작업 흐름

### 1) 4대 작업 흐름 (Workflow)
1. **컴포넌트 갤러리 (Gallery)**:
   - 12대 필수 UI 컴포넌트의 모든 변형(Variants), 사이즈, 활성/비활성/로딩 상태를 그리드 뷰로 한눈에 비교 및 실시간 조작
2. **인터랙티브 데모실 (Demos)**:
   - 10종의 실무 시나리오(RPG 어드벤처 버튼, 실시간 검증 뉴스레터 인풋, 이커머스 상세 탭, 다국어/테마 컨트롤, 미디어 플레이어 슬라이더, 파일 업로드 결과 알림, 비동기 데이터 로더, 툴팁, 모달 vs 팝업, 퀵 프로필 팝오버) 인터랙션을 모달로 직접 체험
3. **코드 라이브러리 (Code Library)**:
   - 각 컴포넌트의 클린 TSX 소스 코드를 구문 강조(Syntax Highlighting) 및 원클릭 복사 클립보드 기능으로 즉시 프로젝트에 복사·붙여넣기
4. **AI 컴포넌트 생성기 (AI Studio)**:
   - 회원 본인 Gemini 2.5 Flash API 연동을 통해 프롬프트("다크 테마 가격표 카드 컴포넌트") 입력 시 프로덕션 준비 완료 TSX 코드를 실시간 스트리밍 생성

### 2) 16대 핵심 UI 컴포넌트 구성 (`src/components/ui/`)
1. `Button.tsx`: primary, secondary, danger, ghost 변형 및 로딩 스피너 지원
2. `Input.tsx`: label, error, helperText, left/right icon 지원
3. `Card.tsx`: header, body, footer 구조의 다목적 카드
4. `Tabs.tsx`: underline, pills 스타일 및 부드러운 전환
5. `Select.tsx`: 네이티브 셀렉트 기반 커스텀 셰브론
6. `RadioGroup.tsx`: 접근성 라디오 그룹
7. `Checkbox.tsx`: 커스텀 체크박스 인디케이터
8. `Toggle.tsx`: 부드러운 토글 스위치 애니메이션
9. `Slider.tsx`: 실시간 값 동기화 슬라이더 바
10. `Alert.tsx`: success, warning, error, info 상태 피드백
11. `Spinner.tsx`: 로딩 회전 인디케이터
12. `ProgressBar.tsx`: 퍼센트 진행률 바
13. `Tooltip.tsx`: 4방향 호버 툴팁
14. `Modal.tsx`: React createPortal 기반 SSR 안전 모달
15. `Popover.tsx`: 플로팅 팝오버 메뉴
16. `Icons.tsx`: 경량화된 SVG 아이콘 팩

---

## 4. 컴포넌트 구조 및 파일 맵

```
react-ui-showcase/
├── src/
│   ├── app/
│   │   ├── page.tsx                     # 메인 대시보드 (ShowcaseDashboard)
│   │   ├── layout.tsx                   # 전역 레이아웃 및 메타데이터
│   │   ├── globals.css                  # Tailwind CSS v4 테마
│   │   ├── (auth)/
│   │   │   └── login/page.tsx           # AIMaster 통합 로그인
│   │   ├── settings/
│   │   │   ├── page.tsx                 # API키등록·플랫폼연동 서버 컴포넌트
│   │   │   └── SettingsClient.tsx       # API키 등록/조회/삭제 클라이언트 UI
│   │   ├── guide/
│   │   │   ├── page.tsx                 # 연동 & 사용 매뉴얼 서버 컴포넌트
│   │   │   └── GuideClient.tsx          # 매뉴얼 및 가이드 클라이언트 UI
│   │   └── api/
│   │       ├── auth/logout/route.ts     # 세션 로그아웃 API
│   │       ├── generate/route.ts        # Gemini AI 컴포넌트 생성 API
│   │       └── keys/route.ts            # 회원 본인 API 키 CRUD API
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx              # 표준 좌측 화이트 사이드바 (1-2-3-4 흐름, 계정, 로그아웃)
│   │   │   └── Header.tsx               # 상단 헤더 (API 연동 상태 배지, AI 모달 트리거)
│   │   ├── showcase/
│   │   │   ├── ShowcaseDashboard.tsx    # 4대 탭 및 전체 쇼케이스 총괄 대시보드
│   │   │   ├── ShowcaseGrid.tsx         # 12대 컴포넌트 카드 갤러리 그리드
│   │   │   ├── DemoModal.tsx            # 10종 인터랙티브 시뮬레이터 팝업 모달
│   │   │   ├── CodeViewerModal.tsx      # 클린 TSX 소스 코드 원클릭 복사 모달
│   │   │   └── AiComponentGenerator.tsx # Gemini AI 프롬프트 기반 컴포넌트 생성 모달
│   │   └── ui/                          # 16대 핵심 UI 컴포넌트 라이브러리
│   └── lib/
│       ├── version.ts                   # 프로그램 버전 관리 (v1.02)
│       ├── access.ts                    # 권한 판정 (requireProgramAccess)
│       ├── apiKeys.ts                   # Supabase user_api_keys 격리 조회/저장/삭제
│       ├── gemini.ts                    # 회원 키 기반 Gemini 2.5 Flash 호출 클라이언트
│       ├── componentCodes.ts            # 클린 TSX 소스 코드 딕셔너리
│       └── supabase/                    # Supabase SSR 클라이언트 및 쿠키 유틸
```

---

## 5. 보안 및 권한 정책

1. **Rule 00 최상위 절대 규칙**:
   - 회원 본인의 Google Gemini API 키만 사용하며, 운영자 키나 공용 키로 폴백하지 않음.
   - 키는 `user_api_keys` 테이블에 `user_id` 단위로 암호화 격리 저장.
2. **AIMaster 통합 권한 (Rule 6)**:
   - `requireProgramAccess()`를 통해 로그인 회원 권한을 검증. FREE 배지 프로그램의 경우 가입 회원 누구나 이용 가능.

---

## 6. 개발 및 유지보수 가이드

- **로컬 실행**: `npm run dev`
- **프로덕션 빌드 검증**: `npm run build`
- **배포 명령**: `vercel deploy --prod --yes`
- **버전 상향 규칙**: 사소한 수정/패치 시 마이너 버전 상향(`v1.01 -> v1.02`), 코드 `src/lib/version.ts` 및 DB `programs.version` 동시 갱신.
