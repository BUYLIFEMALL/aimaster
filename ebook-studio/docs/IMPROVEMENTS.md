# 20번 eBook Studio (ebook-studio) — 개선사항 및 발전 아이디어 (IMPROVEMENTS)

## 1. 개요
- **프로그램**: eBook Studio (`ebook-studio`, 20번)
- **최신 버전**: `v1.10`
- **라이브 도메인**: [https://ebook-studio.buylife.xyz](https://ebook-studio.buylife.xyz)

---

## 2. 필수 3대 관점별 개선사항 및 아이디어

### 관점 ①: 프로그램 개발·유지보수 (기능/로직/안정성/재사용)
1. **대용량 도서 챕터별 병렬 AI 집필 엔진 (Web Worker 활용)**:
   - 10장 이상의 장편 서적이나 전문 서적 작성 시, 순차 호출로 인한 대기 시간을 단축하기 위해 3~4개 챕터를 동시 병렬 요청하는 클라이언트 Worker 파이프라인 구축.
2. **EPUB 3.0 오디오북 미디어 오버레이(TTS) 패키징 지원**:
   - Web Speech API 또는 Gemini 오디오 TTS 엔진을 연동하여 시각 장애인 및 오디오북 독자를 위한 싱크 맞춤 오디오 오버레이가 포함된 멀티미디어 EPUB 3.0 규격 생성 지원.
3. **로컬 자동 임시 저장(IndexedDB Auto-Save) 및 버전 타임머신**:
   - 브라우저 비정상 종료나 새로고침 시에도 단 1자의 손실 없이 원고를 복원할 수 있도록 10초 단위 로컬 스냅샷 및 3단계 이전 버전 되돌리기(History Undo/Redo) 엔진 구현.

### 관점 ②: 디자인 (가독성/조작/작업 흐름)
1. **듀얼 뷰포트 맞춤 분할(Splitter) 드래그 바**:
   - 좌측 작업대와 우측 실시간 독서 뷰어의 비율을 마우스 드래그로 자유롭게 5:5, 7:3, 3:7 등 사용자의 모니터 환경에 맞춰 유동 조절할 수 있는 반응형 스플리터 UI 탑재.
2. **독서 뷰어 내 폰트 렌더링 앤티앨리어싱 및 미세 조판 컨트롤**:
   - 글자 자간(Letter Spacing), 문단 간격(Paragraph Spacing), 들여쓰기(Indent), 양쪽 맞춤(Justify) 등 출판 전문 조판 옵션을 실시간 슬라이더로 조작하는 타이포그래피 툴바 고도화.
3. **가이드북 인터랙티브 테마 시뮬레이터**:
   - 가이드북 내에서 21종 테마를 마우스 클릭만으로 실시간 문단 샘플에 미리 적용해보고 최적의 분위기를 선택할 수 있는 인라인 인터랙티브 테마 프리뷰어 탑재.

### 관점 ③: 기존 AIMaster에 없던 구현 가능한 사용자 중심의 창의적 자동화 시스템
1. **'원클릭 크몽/탈잉 전자책 판매용 패키지 번들러'**:
   - 본문 PDF뿐만 아니라 판매 등록에 필수적인 '3:4 상세페이지용 목차 카드 이미지', '전자책 3D 목업 렌더링 3종(태블릿, 모바일, 종이책 책등)', '상품 등록용 요약 소개문'을 원클릭으로 일괄 자동 생성하는 수익화 패키징 자동화 시스템.
2. **노션(Notion) / 옵시디언(Obsidian) 원클릭 전자책 변환 브릿지**:
   - 노션 공개 페이지 URL이나 옵시디언 마크다운 폴더를 드래그앤드롭하면 즉시 소제목과 코드블록을 완벽하게 인식하여 한 권의 고품질 전자책으로 3초 만에 엮어내는 지식 관리 도구 연동 시스템.
3. **'AI 퇴고 및 출판 맞춤법 교정 코파일럿'**:
   - 완성된 원고의 오탈자 교정은 물론, 국립국어원 표준어 규정 검사, 문맥상 어색한 번역투 문장 개선, 문단별 가독성 지수(Flesch-Kincaid)를 시각화해 주는 AI 전문 교정 교열 자동화 엔진.

---

## 3. 처리 상태 요약
- `v1.10` 완료: 포커스 스튜디오 스타일 전면 리뉴얼, `.studio-hero` 배너 및 3대 KPI 지표 카드 탑재, 독립 비주얼 가이드북 (`/guide`) 신설, Vercel 배포 및 Edge 포그라운드 실세션 검수 완료.
- 향후 과제: 상기 아이디어 백로그 검토 및 단계적 적용.


> **미배포 대기 (2026-11-11 배포 뒤, 세션 claude-win-blog)** — 화면에 남은 옛 「Gemini 전용」 문구 3곳 수정: 좌측 메뉴 「API 키 등록 (Gemini)」→「API 키·모델 설정」(`Sidebar.tsx`), 원문 입력 안내(`SourceInputPanel.tsx`), 가이드 저장 문답(`guide/page.tsx`). tsc 통과, 다음 배포 때 함께(급하지 않음). 남은 관찰: 첫 화면 소개 배지가 아직 「v1.10 Focus Publishing Studio」로 보임(디자인 담당 몫).

> [역할: blog] **✅ v1.15 배포 완료 (2026-11-11, 배포 `ebook-studio-hyjwx2cw6`, DB v1.12→v1.15)** — 아래 항목이 나감. 검수: ego 화면에서 설정 창 모델 9개(OpenAI→Claude→Gemini) 표시, Claude 고르면 「본인 키 등록됨」(메인 사이트 등록 키 재사용), 시험 계정 본인 Claude 키로 Haiku 5.5 목차 생성 1회 200(15초), 로그인 없는 AI 호출 401, 저장공간 위젯 표시. 원래 기록: (2026-11-11, 주인님 지시 「OpenAI / Claude / Gemini 순으로 각각 플랫폼별 최신 모델을 사용자가 골라서 사용할 수 있게」, 세션 claude-win-blog)** — 다음 배포 때 v1.15로 함께 나감(배포 승인 대기).
>
> - **글 모델 3개 플랫폼**: `src/lib/textModels.ts` — OpenAI → Claude → Gemini 순, 플랫폼마다 `docs/AI_MODEL_CATALOG.md` 추천 3개(가성비·균형·최고 품질). 기본값은 그대로 Gemini 3.8 Flash. 목록 기준 `blog-neighbor-care/src/lib/analysis/models.ts`.
> - **서버 호출**: 새 `src/lib/ai/textLlm.ts`(호출 기준 `blog-neighbor-care/src/lib/analysis/provider.ts`) + 공용 모듈 `openai-request-params` 사본 `src/lib/ai/openaiRequestParams.ts`(`scripts/check-shared-modules.mjs` 사본 목록에 추가). 회원 본인 키만, 재시도 0, Gemini 키는 주소가 아닌 머리(`x-goog-api-key`)로.
> - **키**: OpenAI·Claude 키는 공용 `user_api_keys`(`openai`·`anthropic`)에만 저장·조회(브라우저에 남기지 않음, 화면엔 등록 여부만). `/api/user/key` GET이 `providers` 등록 여부를, POST가 `provider`를 받음(없으면 기존처럼 gemini). 표지 이미지는 계속 Gemini 키.
> - **화면**: 설정 창 모델 칸 플랫폼별 묶음 + 고른 플랫폼 키 상태·등록 칸·발급 링크, 스타일 단계 모델 칸 묶음, 상단 「○○ 준비됨」, 목차 제안·전체 집필의 키 확인을 고른 플랫폼 기준으로. 매뉴얼 Q5·도움말 문구 정리.
> - **보안 보완**: `/api/ai/outline`·`/api/ai/chapter`·`/api/ai/cover`·`/api/scrape`·`/api/user/key`에 프로그램 권한 확인(`checkProgramAccessApi`)과 캐시 방지 2줄이 없어 추가(그전엔 로그인·권한 없이도 호출 가능했음).
> - **검수**: 임시 폴더 모의 응답 시험 8개 통과(세 플랫폼 요청 모양·키 판정·오류·JSON 꺼내기, 유료 호출 0) · `tsc` · `npm run build` 통과. 실제 OpenAI·Claude 호출과 화면 검수는 배포 뒤.
> - **디자인 담당께**: v1.14 화면은 그대로 두고 설정 창 안 칸만 추가했습니다. 모양 손볼 곳이 있으면 이어서 다듬어 주세요.

## 다른 프로그램 연계 메모 — 2026-10-19 Claude Code(윈도우, ai-doc-chatbot 작업 중 발견)
- **AI 문서 챗봇(`ai-doc-chatbot`)과 파일로 연계 가능**: 「인쇄/PDF」로 저장한 원고를 https://ai-doc-chatbot.buylife.xyz/documents 에 올리면 원고 내용을 근거로 질문할 수 있다(100쪽 초과 PDF도 챗봇 v1.05 비동기 읽기). 독자용 공개 Q&A 챗봇은 비로그인 공개가 필요해 플랫폼 규칙과 맞지 않아 보류(챗봇 `docs/IMPROVEMENTS.md` C2).

## 2026-10-23 Claude Code(윈도우) — Next.js 보안 업데이트 (세션 claude-win-20261023-next-security)
- v1.12 배포(Next.js 16.4.2 보안 업데이트). **확인 필요: `/login` 404(배포는 Ready) — 실제 로그인 경로·메인 사이트 바로가기 확인(분담표 묶음 C)**. 상세·명령: [`docs/HANDOFF_20261023_NEXTJS_SECURITY_SPLIT.md`](../../docs/HANDOFF_20261023_NEXTJS_SECURITY_SPLIT.md)
