# 2단계 구현·검수 기록 — 고급 편집기

2026-10-13, Claude Code. 기준 플랜: [PHASE2_PLAN](PHASE2_PLAN.md). **로컬 구현·자동 검수까지 완료. 환경변수 미등록으로 운영 배포·실제 회원 검수는 하지 않았습니다.** 앱 표시 버전은 v1.01 후보 그대로입니다(아직 운영 등록 전).

## 구현한 것

| 영역 | 내용 | 위치 |
|---|---|---|
| 순수 서식 명령 | 제목 토글, 굵게/기울임/취소선(해제·중첩 구분), 목록 4종(글머리·숫자·알파벳·체크, 적용/해제/교체), 들여쓰기·내어쓰기, 인용, 코드 블록(언어 선택), 링크·이미지(안전 주소만), 구분선, 기호 32개, 표 삽입·행/열 추가·삭제·열 정렬, 목록 Enter 이어쓰기 | `src/lib/editor/commands.ts` |
| 공용 마크다운 변환 | Marked + 알파벳 목록 확장(`a.`로 시작하는 연속 줄 → `<ol type="a">`). 3단계 PDF/DOCX도 이 모듈을 사용해야 함 | `src/lib/markdown/parser.ts` |
| 편집기 | CodeMirror 6(고정 버전), 한글 찾기·바꾸기, 실행 취소/다시 실행, 단축키, Esc→Tab 탈출. 문서 전환·이력 복원·충돌 불러오기 때는 편집기 상태를 새로 만들고, 입력 중에는 건드리지 않음 | `src/components/editor/MarkdownEditor.tsx` |
| 도구 모음 | 원본 20개 명령 + 목록 3종 + 알파벳 + 표 삭제/정렬 + 실행 취소/찾기, 링크·이미지·코드·표·기호 패널, 모바일 가로 스크롤(터치 40px) | `src/components/editor/EditorPane.tsx` |
| 미리보기 보조 | HTML 소스 보기·복사, MD 복사, 목차(클릭 이동), 글자·단어 수, 링크 `target=_blank rel=noopener noreferrer` | `src/components/workspace/PreviewPanel.tsx`, `MarkdownPreview.tsx` |
| 저장 계층 | **변경 없음**(자동 저장 750ms·충돌·이력·휴지통 그대로) | `WorkspaceProvider`/`repository` |

단축키: Ctrl/⌘ +B 굵게, +I 기울임, +K 링크, +S 저장, +Z/Shift+Z 실행 취소/다시, +F 찾기·바꾸기, Tab/Shift+Tab 들여쓰기·내어쓰기.

## 원본 20개 명령 비교 (모두 구현·시험 통과)

제목1·2·3, 굵게, 기울임, 취소선, 목록 스타일(글머리·숫자·알파벳 3종 버튼), 체크리스트, 들여쓰기, 내어쓰기, 인용, 코드 블록(+언어), 링크(+주소 입력), 이미지(+주소 입력), 표 삽입, 표 행 추가, 표 열 추가, 구분선, 특수기호 32개(원본 목록과 동일), 복사. 원본에 없던 보완: 서식 토글(해제), 체크리스트 Enter 이어쓰기, 표 행/열 삭제·열 정렬, 알파벳 목록 의미 렌더링, 코드 언어 선택, 찾기에서 `[` 오류 없음.

## 검수 결과 (2026-10-13)

| 구분 | 결과 |
|---|---|
| TypeScript, 프로덕션 빌드 | 정상 |
| 단위 시험 | **31/31** (기존 14 + 명령 13 + 마크다운 4) |
| 기존 화면 검사 `test:browser` | **11/11** 재통과 (입력 방식만 편집기용으로 수정) · [증거](evidence/phase2-browser-regression-results.json) |
| 신규 화면 검사 `test:editor` | **13/13** · [증거](evidence/phase2-editor-results.json) — 한글 입력, 제목/굵게 단축키, 실행 취소/다시, 목록 Enter 4종, 버튼 목록·들여쓰기·인용, Esc→Tab, 링크/이미지 위험 주소 차단·링크 속성, 코드 언어·구분선·기호 32개, 표 삽입/추가/삭제/정렬, 찾기·바꾸기(`[`), IME 조합, HTML 소스·목차·글자 수·복사, 새로고침 복원, 390px 모바일(가로 넘침 없음) |
| 실제 프로덕션 서버 `test:runtime` | 9/9 (설정 미등록 차단 유지) |
| `npm audit` | 취약점 0건 |
| 번들 | 편집기는 지연 로드되는 단일 청크(약 572KB, 압축 전). 다른 청크는 256KB 이하 |
| 스크린샷 | `test-artifacts/editor-desktop.png`, `editor-mobile.png` (Git 제외, 재생성 가능) |

### 검수 한계 — 확인한 것과 하지 않은 것

- **자동 시험 한정**: 화면 검사는 보이는 Chrome에서 실행했지만 **회원 세션 응답은 시험값**입니다. 실제 일반 회원 로그인·운영 Supabase 권한은 **미검수**.
- **한글 IME**: Chrome DevTools Protocol의 조합 이벤트와 한글 문자 입력으로 확인했습니다. **실제 한글 키보드로 직접 타이핑하는 시험은 하지 않았습니다**(미확인).
- Word/Docs 등 외부 앱 호환·PDF·DOCX는 3단계 대상으로 이번에 다루지 않았습니다.
- 알파벳 목록은 이 앱 전용 표현입니다. 다른 마크다운 앱에서는 일반 문단으로 보일 수 있습니다.
- 큰 문서(1MB급) 성능 측정은 하지 않았습니다.
- 편집기는 줄바꿈을 `\n`으로 통일합니다. 가져온 `\r\n` 문서는 처음 편집할 때 `\n`으로 저장됩니다.
- 스크롤 동기화(선택 항목)는 구현하지 않았습니다.
- 미리보기의 외부 이미지는 방문자 IP를 외부에 노출할 수 있습니다(안내 문구는 3단계 자산 관리와 함께 추가 예정).

## 실행 방법

```powershell
Set-Location D:/Antigravity/AIMaster/markdown-studio
npm ci; npm run build; npm test; npm run test:browser; npm run test:editor; npm run test:runtime; npm audit
```

## 다음 단계

3단계(가져오기·백업·HTML/PDF/DOCX/ZIP 변환)가 다음 순서입니다. 시작 때 PDF/DOCX 작은 기술 검증을 먼저 하고, 변환은 `src/lib/markdown/parser.ts`를 공용으로 사용하세요. 운영 연결은 인증 환경변수 3개 등록 승인 후입니다([PROVISIONING_PLAN](PROVISIONING_PLAN.md)).
