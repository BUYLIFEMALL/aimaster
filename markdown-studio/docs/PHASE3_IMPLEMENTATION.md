# 3단계 구현·검수 기록 — 가져오기·백업·변환 내보내기

2026-10-13, Claude Code. 앱 표시 버전 **v1.02**(운영 배포·DB 갱신 완료). 기준 플랜: [DEVELOPMENT_PLAN](DEVELOPMENT_PLAN.md) 3단계. 2단계는 [PHASE2_IMPLEMENTATION](PHASE2_IMPLEMENTATION.md).

## 먼저 한 기술 검증 (결과로 엔진 확정)

| 항목 | 결정 | 근거 |
|---|---|---|
| PDF | **pdfmake 0.3.11 + Noto Sans KR(SIL OFL)**, 텍스트 PDF | 한글·희귀 음절(똠·쀍·뷁)·기호·표 정렬이 실제로 그려지고(PyMuPDF 렌더링 육안 확인) 글자 추출 가능, 공백 없는 긴 문자열도 줄바꿈 |
| DOCX | **docx 9.10.0**로 표준 OOXML 생성 | 문단·제목·번호/글머리 목록·표가 실제 요소. 원본 방식(altChunk/MHT) 아님 |
| ZIP | jszip 3.10.1 | 기존 사용 패턴 |
| 글꼴 배포 | `@expo-google-fonts/noto-sans-kr`(devDependency)의 TTF를 `scripts/copy-fonts.mjs`가 `prebuild`/`predev`에서 `public/fonts`(Git 제외)로 복사. PDF 만들 때만 약 12MB를 내려받고 30일 캐시 | 바이너리를 Git에 넣지 않음 |

## 구현한 것

| 영역 | 내용 | 위치 |
|---|---|---|
| 공용 중간 모델 | 마크다운(알파벳 목록 확장 포함)을 블록·글 조각으로 변환. PDF·DOCX가 같은 해석을 사용. 위험한 링크 주소(javascript: 등) 제거, 원본 HTML은 글자만 남김(script/style 내용 제외), 이미지는 `[이미지: 설명]` 글자 | `src/lib/export/blocks.ts` |
| PDF | A4/Letter·세로/가로·여백 3종·글자 크기 4종, 쪽 번호, 표 정렬, 코드·인용 상자, 알파벳/숫자/글머리/체크 목록 | `src/lib/export/pdf.ts`, `options.ts` |
| DOCX | 같은 용지 옵션, 제목 스타일, 목록 3종 번호, 표(열 정렬·머리글 음영), 인용·코드 음영, 하이퍼링크, 쪽 번호 | `src/lib/export/docx.ts` |
| HTML | 완전한 문서. 본문은 DOMPurify 정제 조각, 제목 이스케이프, **CSP 메타로 스크립트·외부 연결 차단**, 합칠 때 파일별 구역 | `src/lib/export/html.ts` |
| 수집·ZIP 이름 | 문서·폴더(하위 포함)·전체 수집(휴지통 제외), ZIP 경로 안전화·중복 `(2)` | `src/lib/export/collect.ts` |
| 실행기 | 한 문서/합치기/문서별 ZIP. **ZIP은 일부 실패해도 성공한 파일을 전달하고 실패 목록을 정확히 표시**(모두 실패면 오류) | `src/lib/export/run.ts` |
| 가져오기 | `.md/.markdown/.txt` 파일·폴더. UTF-8 우선, 아니면 EUC-KR(CP949)로 해석하고 안내. BOM·CRLF 정리. 5MB 초과·바이너리·형식 외·숨김/상위 경로는 이유와 함께 건너뜀. **기존 문서를 덮어쓰지 않고** 같은 이름은 `(2)` | `src/lib/documents/backup.ts`, `ImportCard.tsx` |
| 백업·복원 | JSON(형식·버전 표기, 이름·본문·구조만; 이력·휴지통·회원 정보 없음). 복원은 **새 폴더 안에 추가**, 형식·버전·중복 ID·경로 문자·부모 누락·순환·깊이 30·5000개·50MB·본문 100만 자를 검증하고 **한 트랜잭션(원자적)** | `backup.ts`, `repository.importTree`, `BackupCard.tsx` |
| 화면 | 1단계 `파일 가져오기`, 3단계 `내보내기` 패널(대상·형식·합치기/ZIP·페이지 설정·결과·실패 목록·변환 안내), 4단계 `백업·복원`. 안내·매뉴얼·사이드바 문구 갱신 | `ExportPanel.tsx` 외 |
| 운영 | `/fonts/*`는 프록시에서 제외(`no-store` 덮어쓰기 방지)하고 30일 캐시 | `src/proxy.ts`, `next.config.ts` |

## 검수 결과 (2026-10-13)

| 구분 | 결과 |
|---|---|
| TypeScript·프로덕션 빌드 | 정상 |
| 단위 시험 | **45/45** (기존 31 + 내보내기 8 + 백업·가져오기 6). PDF는 실제 생성 후 pdf.js로 글자·쪽 수·용지 크기 추출, DOCX는 압축을 열어 XML 올바름·구조 검사 |
| 기존 화면 검사 `test:browser` | 11/11 |
| 편집기 화면 검사 `test:editor` | 13/13 |
| **신규 화면 검사 `test:export`** | **10/10** · [증거](evidence/phase3-export-ui-results.json) — 보이는 Chrome에서 폴더/파일 가져오기(EUC-KR·중복 이름·건너뜀), PDF 합치기 다운로드(한글 글자·쪽 나눔)·Letter 가로, DOCX, HTML(CSP·script 없음), ZIP(md·pdf, 폴더 구조), 백업 다운로드→새 폴더 복원, 순환 백업 거절(아무것도 만들지 않음), 새로고침 유지, 390px 모바일 |
| 실제 서버 `test:runtime` | 9/9 |
| `npm audit` | 취약점 0건 |
| **실제 Next 프로덕션 번들에서 변환 실행** | 임시 시험 화면(배포·커밋하지 않음, 삭제)으로 PDF(%PDF-)·DOCX·ZIP(PDF 2개) 생성 확인 — esbuild 시험 번들과 별개로 실제 Next 번들에서 pdfmake·docx·jszip 동작 확인 |
| 육안 확인 | 내려받은 PDF를 이미지로 렌더링해 한글·표 정렬·알파벳 목록·코드 상자·체크 목록·쪽 번호 확인 |
| 운영 배포 | `markdown-studio.buylife.xyz` v1.02, 글꼴 `/fonts/*` 200·`public, max-age=2592000`, 비로그인 `/editor` → 로그인 이동, 일반 회원 계정으로 `/export` 화면 표시 확인 |

### 알려진 한계·미확인

- **운영 사이트에서 실제 PDF/DOCX 파일을 내려받는 시험은 하지 않음**(사용자 PC에 파일을 저장하는 동작이라 허락 전). 위 임시 Next 번들 시험과 로컬 Chrome 다운로드 시험으로 갈음.
- **Word·Google Docs·Pages 등 대상 앱에서 DOCX가 보이는 모양은 미확인**(XML 구조·올바름만 검사). 한글 글꼴은 맑은 고딕을 지정하며 없으면 대체 글꼴.
- PDF의 **기울임꼴은 구분되지 않음**(Noto Sans KR에 이탤릭 없음). 체크 표시는 PDF에서 `[✓]`/`[  ]`(글꼴에 ☑·☐ 없음), Word·HTML은 ☑·☐.
- 이미지는 파일에 임베드하지 않음(`[이미지: 설명]` 글자). 로컬 이미지 첨부는 미구현.
- 중첩 목록·인용 안 표 등 복잡한 구조는 기본 동작만 시험(중첩 목록 DOCX 번호 단계는 6단계까지).
- 수백 개 이상 문서·아주 긴 문서의 변환 시간·메모리는 측정하지 않음. 변환은 브라우저 메인 스레드에서 실행.
- 실제 운영의 일반 회원 가져오기 파일 선택 시험은 브라우저 파일 선택 창 때문에 자동화하지 못함(보이는 Chrome 시험은 파일 입력 직접 지정).
- 복원은 이력·휴지통을 포함하지 않음. 같은 회원이 다시 복원하면 새 폴더로 중복 추가됨(의도).

## 실행 방법

```powershell
Set-Location D:/Antigravity/AIMaster/markdown-studio
npm ci; node scripts/copy-fonts.mjs; npm run build; npm test; npm run test:browser; npm run test:editor; npm run test:export; npm run test:runtime; npm audit
```
