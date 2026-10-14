# 참고 앱 정밀 분석 — 번역의 정석

조사일: 2026-10-14. 대상: [Google AI Studio 공유 앱](https://aistudio.google.com/apps/9596827a-a428-415c-aaae-8547cbe137ea?fullscreenApplet=true&showAssistant=true&showPreview=true). 외부 앱의 기능 구조를 조사한 기록이며 새 프로그램의 구현 완료 기록이 아닙니다.

## 1. 조사 범위와 근거

로그인된 Aside 브라우저에서 외부 앱 안내를 확인하고 Preview·Code를 열었습니다. Export → ZIP으로 프로젝트 전체를 내려받았습니다. 앱 프리뷰 HTML, import map, 실제 `/assets/index-DClkYqUC.js` 번들도 확보했습니다. Google AI Studio 편집 도우미의 제안은 참고 앱의 기능으로 세지 않았습니다.

| 조사 대상 | 결과 |
|---|---|
| 프로젝트 ZIP | 파일19개, 77,015 bytes. 디렉터리 항목2개 별도 |
| 실행 JS | 1,684,474 bytes, SHA256 `eaf646824259571391119869611560a76683c883ce9a6da97d01c626871098e2` |
| 설정 | 언어10개, 분야 표시11개, 격식 표시3개, 어조 표시17개, 분석 종류3개 |
| AI 코드 | 번역+분석, 역번역, 문서 구조화의 함수3개·프롬프트3개·응답 스키마 |
| 화면 | 원문·번역문·분석 패널, 도움말, 다운로드, 수정, 모바일 |
| 검증 범위 | 실제 UI 관찰·로컬 DOCX XML. 실제 생성 호출0회, AI 품질 미검증 |

[파일별 크기·해시](evidence/reference/source-manifest.json), [화면 관찰](evidence/reference/browser-observations.json)을 남겼습니다. 원본 ZIP·HTML·번들은 로컬 조사 자료이며 공개 Git에는 원본 코드 대신 증거·분석을 남깁니다.

## 2. 파일·구조

| 파일 | 역할 |
|---|---|
| `App.tsx` | 고정 높이 작업 공간, 헤더·푸터·원본 제작자 외부 링크 |
| `components/TranslatorWorkspace.tsx` | 619줄. 입력·언어·파일 파싱·AI 실행·수정·하이라이트·동기 스크롤·저장 |
| `components/AnalysisPanel.tsx` | 문맥/용어/문체 탭, 점수1~10, 용어 복사·TXT/CSV |
| `components/AnalysisPopover.tsx` | 번역문에 표시된 용어의 마우스 팝업 |
| `components/HelpModal.tsx` | 사용 가이드 전문·입력/분석/검토/저장 설명 |
| `components/ReverseTranslationModal.tsx` | 번역문과 역번역 결과 비교 |
| `components/Header.tsx`, `Loader.tsx`, `Icon.tsx` | 제목·로딩·정적 SVG13종 |
| `services/geminiService.ts` | Gemini SDK 초기화, 요청3종, JSON 응답 파싱 |
| `types.ts` | 분석·용어·문체·번역 응답 타입 |
| `index.html`, `index.tsx` | React 시작점, CDN Tailwind·import map |
| `vite.config.ts` | 개발 포트3000, 환경변수의 클라이언트 치환 |
| `package.json`, `tsconfig.json` | 의존성·Vite 빌드·TypeScript 설정 |
| `metadata.json`, `.gitignore`, `README.md` | 원본 앱 소개·제외 규칙·실행 안내 |

React19.1, Vite6.2, Google GenAI SDK1.9 계열을 사용합니다. 파일 처리 패키지는 Mammoth1.7, PDF.js4.4.168, DOCX8.5, file-saver2.0.5입니다. jsPDF는 의존성에 있지만 앱에서 PDF 내보내기를 구현하지 않았습니다. 별도 서버·DB·회원 인증·저장소는 소스에 없습니다.

## 3. 기능·설정 데이터

번역 대상 언어는 한국어, 영어, 일본어, 중국어 간체, 스페인어, 프랑스어, 독일어, 러시아어, 베트남어, 인도네시아어입니다. 기본값은 영어입니다. 원문 언어는 AI가 감지합니다.

분야 표시 사전은 IT·법률·의학·일반·비즈니스·금융·마케팅·예술·과학·교육·기술입니다. 분야를 강제하는 선택 기능은 없으며 AI 응답을 한국어로 표시하는 매핑입니다. 격식3종과 어조17종도 표시 사전이며 별도 번역 프리셋이 아닙니다.

문맥 분석은 원문 표현·추천 번역·대안을, 용어 분석은 원문 용어·번역 용어·설명을 반환합니다. 문체 분석은 격식·어조·일치도1~10·피드백입니다. 필드 이름에 Korean/English가 남아 있지만 AI 프롬프트는 선택 언어로 번역하게 되어 있어 다국어 명칭과 타입 이름이 일치하지 않습니다.

번역문 용어를 정규식으로 찾아 색칠하고 마우스 위치에 팝업을 띄웁니다. 문맥과 용어가 중복되면 먼저 찾은 항목이 적용됩니다. 마우스 이벤트만 있으며 터치·키보드 전용 접근은 없습니다. 단어 경계·겹치는 용어의 긴 표현 우선 처리가 없어 짧은 용어가 긴 용어의 일부를 먼저 잡을 수 있습니다.

원문·번역문 스크롤은 전체 스크롤 거리의 비율을 맞춥니다. 문단별 대응·정밀 정렬 기능은 없습니다. 원문/번역문에 Markdown 표시를 보존하도록 AI에 요구하지만, 보기 화면은 Markdown 파서 없이 텍스트와 용어 강조만 출력합니다.

## 4. 실제 AI·파일 경로

1. 직접 입력 → `analyzeAndTranslate` → 번역·언어·분야·분석을 한 JSON으로 반환.
2. TXT → `file.text()`, DOCX → `mammoth.convertToHtml`, PDF → PDF.js에서 각 페이지 텍스트를 공백으로 결합.
3. **파일 불러오기만 해도** 추출 내용이 `structureTextAsMarkdown`으로 보내집니다. TXT도 AI 구조화 대상입니다.
4. 구조화 후 번역+분석을 실행하면 AI를 한 번 더 호출합니다.
5. 역번역은 현재 번역문을 감지된 원문 언어로 번역하는 별도 호출입니다.

따라서 파일 입력→번역→역번역은 기본적으로 AI3회입니다. 사용자가 원문을 직접 넣어 번역·역번역을 하면2회입니다. 세 함수 모두 `gemini-2.5-flash`를 고정 호출합니다. 번들에도 같은 모델 문자열3곳과 관련 프롬프트·스키마가 있습니다.

번역 요청은 분야/언어 감지, Markdown 유지, 가능한 많은 전문 용어 추출, 문맥/문체 평가를 요구합니다. 역번역은 번역문만 반환하고, 구조화는 DOCX HTML 또는 PDF/TXT 텍스트에서 Markdown을 추론합니다. 현재 연도, 사용자 용어집, 문서 분할, 검토 언어 지정은 없습니다. JSON 응답 스키마는 있지만 `JSON.parse` 뒤 런타임 값 검증은 없습니다.

키는 `process.env.API_KEY`로 SDK를 초기화하고, 로컬 Vite 설정이 GEMINI_API_KEY를 클라이언트 코드에 치환합니다. **우리 배포에 그대로 사용하면 브라우저에 키가 포함될 수 있는 구조**입니다. AI Studio 실행 환경의 키·프록시 내부를 노출하거나 실제 키 유출을 확인한 것은 아닙니다. 별도 자동 API 폴백은 보이지 않습니다.

## 5. 화면·다운로드 관찰

흰색 Google AI Studio 외곽 안에 앱 자체는 다크 테마입니다. 본문은 gray900/gray800, 경계 gray700, 번역 버튼 indigo600, 용어 teal, 역번역 green, 도움말 sky 계열입니다. AIMaster 작업 화면의 흰색 기준으로 재설계해야 합니다.

| 실제 관찰 | 결과·의미 |
|---|---|
| 입력 전 | 번역·역번역·원문 저장 비활성, 언어10종 표시 |
| 원문 입력 | 번역·원문 복사·원문 저장 활성 |
| 번역문 직접 입력 | AI 분석 없이도 텍스트 입력·다운로드 가능 |
| 영어 번역문을 남기고 언어를 일본어로 변경 | 기존 영어 문장이 그대로 남음. 현재 선택과 결과 기준을 구분하지 않음 |
| 원문 한 글자 수정 | 기존 번역문과 분석·감지 정보가 즉시 사라짐 |
| 원문 DOCX 다운로드 | Word ZIP/XML 확인. `# 업무 안내`, `- 담당자 확인`이 일반 문단으로 저장되고 제목 스타일·목록 번호가 없음 |
| 375px 모바일 미리보기 | 원문/번역문은 세로지만 오른쪽 분석 패널이 좁게 눌리고 입력·본문 영역이 잘림. 문서 전체 가로 폭 초과는375px로 측정되지 않았으므로 '가로 오버플로'로 단정하지 않음 |
| 새로고침 후 다시 진입 | 원문·번역문 초기화, 선택 언어도 영어로 복귀 |

실제 번역 버튼·역번역·파일 구조화는 누르지 않았습니다. 수동으로 넣은 영어 문장은 UI 관찰용이며 AI 생성 결과가 아닙니다. PDF/DOCX 입력 파서 경로는 소스 확인이지 실제 입력 성공 증거가 아닙니다.

## 6. 새 버전에서 해결할 문제

| 문제 | 근거 | 해결 방향 |
|---|---|---|
| 파일 선택 시 AI 자동 호출 | Workspace196~250줄 | 로컬 추출·미리보기, 명시적 구조화/번역 버튼 |
| 실패 전에 기존 결과 제거 | Workspace146~178줄 | 새 응답 검증 후 교체, 기존 수정본 보존 |
| 원문 수정 시 번역 유실 | Workspace518~524줄 | 결과 기준 revision 표시·재번역 안내 |
| 언어/번역문 수정 후 분석이 오래됨 | 언어 변경은 상태만 설정, 번역문 변경도 상태만 설정 | 분석 유효성 표시와 현재 수정본 재검수 |
| 파일/페이지/글자·호출 한도 없음 | file.size/maxLength/AbortController 없음 | 추출·문서 분할·시간 제한·중복 실행 제한 |
| JSON 파싱만 성공하면 타입을 신뢰 | Gemini 서비스·AnalysisPanel | Zod 값·블록 ID·점수·완료 상태 검증 |
| DOCX 서식 유실 | 실제 저장 XML | 지원하는 Markdown 구조를 Word 서식으로 변환 |
| 용어 CSV 보호 부족 | AnalysisPanel 저장 함수 | BOM·따옴표·개행·수식 시작 문자 보호 |
| 새로고침 시 유실 | useState만, 저장 코드 없음 | 회원별 선택 저장·revision·재조회 검수 |
| 모바일 분석 패널 압축 | 실제375px 캡처 | 모바일 원문/번역/검수 탭 |
| 용어 표시 접근성 부족 | 마우스 전용 팝업 | 클릭·키보드·모바일 상세 패널 |
| PDF의 스캔 이미지·복잡한 배치 | getTextContent만, 공백 병합 | 텍스트 없음 안내, OCR은 후속 단계 |
| 품질 점수의 오해 가능성 | AI가 자신의 일치도 점수를 반환 | AI 참고 평가로 표시, 번역 정확성 인증으로 사용하지 않음 |

일부는 코드로 확인한 설계 문제이며 실제 공급사 응답 실패로 재현한 기록이 아닙니다. 새 프로그램의 모든 개선은 아직 제안입니다.

## 7. 기존 프로그램과의 비교·명칭

저장소에서 번역 기능을 검색한 결과 sourcing은 공급업체 질문·영중문 연락문 작성의 일부 기능입니다. shop-detail-page의 다국어 생성은 상품 상세페이지 이미지/레이아웃 작업이며 문서 번역·검수 공간과 다릅니다. Markdown 편집기는 문서 편집·내보내기 구조를 참고할 수 있지만 전용 다국어 번역·문맥/용어/문체 검수 제품은 확인되지 않았습니다. 검색 범위에서의 판단이며 운영 DB 전수 기능 검증은 아닙니다.

| 후보 | 장점·선택 기준 |
|---|---|
| **AI 문서번역 자동화** | 1순위. 문서 입력·번역·검토·저장이라는 기능을 쉽게 이해하고 카탈로그 명명 관례와 맞음 |
| AI 번역검수 자동화 | 용어·문맥·역번역 검수가 주요 판매 포인트일 때 적합 |
| AI 다국어 번역 스튜디오 | 작업 공간의 성격은 잘 드러나지만 플랫폼의 '자동화' 명명과 다름 |

추천 폴더·slug·프로젝트·도메인 후보는 `document-translator` / `document-translator.buylife.xyz`. 이름·도메인 선점 여부는 확정되지 않았습니다. 원본 브랜드를 새 프로그램명으로 사용하지 않습니다.

## 8. 현재 공식 자료와 설계 반영

- [Gemini 모델](https://ai.google.dev/gemini-api/docs/models): 새 프로젝트에3.5 Flash-Lite/3.8 Flash를 안내하며2.5 계열은 이전 이용자 접근 제한이 있음. 원본의2.5 모델을 새 기본값으로 고정하지 않음.
- [Gemini 구조화 출력](https://ai.google.dev/gemini-api/docs/structured-output): JSON 스키마와 별도로 애플리케이션에서 값 검증 필요.
- [Mammoth 공식 문서](https://github.com/mwilliamson/mammoth.js): 변환 HTML을 자동 정화하지 않음. HTML→Markdown 경로에는 정화·외부 파일 접근 차단·시간/크기 제한을 적용.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): 저장 데이터는 owner 정책과 서버 user_id 필터를 함께 계획.
- [2026-10-12 TLS 변경](https://supabase.com/changelog/cbc-tls-ciphers-deprecated): 구현 시 현재 Node/SDK를 사용하고 구형 TLS 클라이언트를 복사하지 않음.

개발 단계와 설계는 [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md), 조사 한계와 재개 절차는 [CLI_HANDOFF.md](CLI_HANDOFF.md)를 참고합니다.
