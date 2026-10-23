# 병합 D 개발 플랜 — AI 웹 UI 제작 자동화 → UI Canvas 자동화 (2026-10-21, Claude Code 윈도우)

근거: 루트 `docs/analysis-scraping-consolidation-20261021/REPORT.md` §2 D·§4 절차. 대상 DB: 운영 `esgxyikcnnvmlhygjkth`.
기준 앱 `ui-canvas` v1.10 → v1.11 · 옛 앱 `react-ui-showcase`(slug `ai-web-ui`) v1.05 → v1.06.

## 1. 문제
- UI Canvas는 화면을 설계·복원하지만 **코드(HTML/React)로 내보낼 수 없다.**
- AI 웹 UI는 컴포넌트 갤러리·데모·TSX 코드·AI 생성이 있지만 **만든 것을 보관하지 않고**, 화면 설계 도구가 없다. AI 생성 API가 브라우저가 보낸 키(`apiKey`)도 받는다.

## 2. 범위
| 항목 | 결정 |
|---|---|
| 갤러리 이식 | UI Canvas 새 메뉴 「🧩 컴포넌트 갤러리」(`/gallery`): 12종 갤러리 · 10종 인터랙티브 데모 · TSX 코드 라이브러리 · AI 컴포넌트 생성기(옛 앱 코드 이식) |
| 스타일 충돌 | UI Canvas는 Tailwind가 없고 전역 CSS가 `button`·`input`·`label`·`h1` 같은 태그에 직접 스타일을 준다 → Tailwind를 **갤러리 화면에서만**, 기본 리셋(preflight) 없이, 갤러리 폴더 클래스만, `important`로 불러오고 `.gallery-scope` 안에서만 태그 스타일을 무력화. 기존 캔버스 화면은 그대로 |
| 테마 | 한 프로그램 한 배경 규칙에 따라 UI Canvas 딥 네이비 배경 유지, 컴포넌트 미리보기는 흰 「미리보기 보드」 |
| 코드 내보내기(신규) | 편집기 「</> 코드」 → 캔버스 화면을 React + Tailwind TSX 한 파일로(위치·크기는 Tailwind 임의값, 스타일은 `style`, 아이콘은 lucide-react) 복사·.tsx 받기 |
| AI 생성 보관(신규) | 생성한 컴포넌트를 「캔버스 프로젝트에 저장」(기존 프로젝트 선택 또는 새 프로젝트) → 프로젝트 문서의 `snippets`(최대 50개, 코드 6만 자). 편집기 코드 창의 「저장한 AI 컴포넌트」 탭에서 복사·삭제. DB 표 변경 없음 |
| 키 | AI 생성은 서버에서 회원 본인 Gemini 키만(브라우저 키 전달 제거), 캐시 방지 두 줄 |
| 권한 | AI 웹 UI 권한 175명 중 UI Canvas 권한이 없는 **32명에게 같은 기간으로 부여**(기간이 더 짧은 회원 0명). 백업 `D:\Antigravity\AIMaster_backup\merge-d-20261021\` |
| 옛 앱 | 작업 화면 → 이전 안내(저장 데이터가 없어 옮기기 없음), AI API 410, 카탈로그 숨김, 주소 유지 |

## 3. 구현 순서
1. UI Canvas: `ProjectDoc.snippets`·검증, 저장 API가 없는 `snippets`를 보존, `/api/projects/[id]/snippets`(추가·삭제, 수정 시각 유지).
2. UI Canvas: `lib/canvas/codegen.ts`(캔버스 → TSX) + 편집기 코드 창.
3. UI Canvas: 갤러리 이식(`components/gallery/*`, `/gallery`, `/api/ai/component`), Tailwind 설정, 메뉴.
4. 옛 앱 안내 화면·API 410, 버전.
5. DB: 권한 32명 부여(백업 뒤), 버전·상세 소개·숨김.
6. 문서(AGENTS·README·IMPROVEMENTS·역량 지도·보고서·HANDOFF).

## 4. 검수
두 앱 `tsc`·빌드 → 순차 배포 → 크롬(일반 회원): 갤러리 4탭·데모 1개·코드 복사, AI 생성 1회 → 프로젝트에 저장 → 편집기 「저장한 AI 컴포넌트」 확인, 캔버스 코드 내보내기 복사·내용 확인, 편집기 자동 저장 뒤에도 snippets 유지, 기존 캔버스 화면 스타일 변화 없음, 390px. 옛 앱 안내·410.

## 5. 비용
| 구분 | 내용 |
|---|---|
| 개발·시험 | 회원 본인 Gemini Flash: AI 컴포넌트 생성 1~2회 |
| 운영자 인프라 | 없음(배포 2회, DB 표 변경 없음) |
| 회원 부담 | 기존과 같음(AI 생성만 본인 키) |
