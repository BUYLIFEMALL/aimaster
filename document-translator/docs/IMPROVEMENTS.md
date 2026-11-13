# AI 문서번역 자동화 (document-translator) 개선 제안 및 백로그

## 1. 최근 적용 완료 내역 (v1.20 - 2026-10-19)
- **포커스 스튜디오 소프트 크림 문서번역 에디션 전면 개편**:
  - 소프트 크림(`#fdfbf7`), 딥 인디고(`#4f46e5`), 웜 앰버(`#d97706`)를 조화시킨 현대적 서재 톤앤매너 적용.
  - 대시보드 `.studio-hero` 프리미엄 배너 및 3대 핵심 KPI 통계 카드 도입.
  - 4단계 파이프라인 가이드 바(원문 입력 ➔ 용어집 매칭 ➔ AI 분할 번역 ➔ 역번역/내보내기) 신설.
- **`📖 연동 & 사용 매뉴얼` (`/guide`) 독립 비주얼 가이드북 구축**:
  - 지원 포맷(TXT, PDF, Word DOCX, Markdown)별 기능 매트릭스 표 제공.
  - 전문 번역 품질 극대화 7대 황금 수칙 및 5종 인터랙티브 FAQ 아코디언 제공.
- **모바일 375px 완벽 반응형 대응**:
  - 상단 56px 모바일 헤더 및 햄버거 토글 슬라이드 오버레이 드로어 장착.
- **버전 3중 동기화**:
  - `package.json` (`1.20.0`), `version.ts` (`v1.20`), Supabase `programs` (`v1.20`).

---

## 2. 향후 추가 개선 제안 3대 항목 (Next Backlog)
1. **스캔본 PDF OCR 원클릭 자동 텍스트 추출 엔진 탑재**:
   - Tesseract.js 또는 Gemini Multimodal API를 활용하여 스캔된 이미지 PDF나 사진 형태의 문서에서도 텍스트와 표를 원클릭으로 정밀 추출해 번역창으로 자동 전달하는 기능.
2. **다국어 전문 용어집 자동 추천 & AI 용어집 추출기**:
   - 원문 문서를 업로드했을 때, 본문에서 반복 등장하는 핵심 고유명사 및 기술 용어를 AI가 사전 스캔하여 [추천 용어집 목록]을 자동 제시하고 원클릭으로 추가할 수 있는 스마트 번역 보조 도구.
3. **타 자동화 프로그램과의 워크플로우 결합 파이프라인**:
   - 20번 `ebook-studio`(전자책 스튜디오) 또는 59번 `ai-auto-blog`(블로그 원문)에서 작성된 국문 콘텐츠를 64번 `document-translator`로 즉시 연계하여 글로벌 다국어(영문/일문) 전자책 및 블로그 글로 번역 발행하는 옴니채널 퍼블리싱 파이프라인.


## 다른 프로그램 연계 메모 — 2026-10-19 Claude Code(윈도우, ai-doc-chatbot 작업 중 발견)
- **AI 문서 챗봇(`ai-doc-chatbot`)과 파일로 바로 연계 가능**: 이 프로그램의 TXT·MD·DOCX 다운로드 파일을 https://ai-doc-chatbot.buylife.xyz/documents 에 올리면 번역본을 근거로 질문·요약할 수 있다(코드 변경 없음). 원클릭 「챗봇으로 보내기」는 프로그램끼리 서로 호출하지 않는 원칙 때문에 보류 — 진행하려면 공용 「회원 문서함」 설계부터(챗봇 `docs/IMPROVEMENTS.md` C1).

## 2026-11-13 전체 점검에서 발견 (정책 담당 세션 `claude-win-20261112-policy`)
### 1) 프로그램 로직·기능
- **30일 정리가 관리자·시험 계정도 지움** — `supabase/migrations/20261014094000_document_translator_retention.sql:5`의 크론이 `expires_at<=now()`면 회원 구분 없이 삭제하고, 조회 정책(`20261014082202_document_translator_initial.sql:32`)과 목록 API(`src/app/api/projects/route.ts:28`)도 만료분을 숨긴다. 「`retention_exempt` 회원 제외」 규칙(루트 `docs/PLAN_20261031_RETENTION_EXEMPT_ACCOUNTS.md`)과 다름. 저장 구독으로 기간을 늘린 회원도 이 프로그램에서는 30일 고정. 영향: 관리자·시험 계정·저장 구독 회원 자료가 30일 뒤 삭제됨. 우선순위 높음. **상태: SQL 작성, 적용 대기**(2026-11-13) — `supabase/migrations/20261113120000_document_translator_retention_exempt.sql`(크론·조회 정책·`dt_save_project`에서 예외 회원 제외, 운영 DB 미적용) + 목록 API `src/app/api/projects/route.ts`가 예외 회원은 만료 숨김을 풀도록 고침(`src/lib/retentionExempt.ts`, 미배포).
- **다시 저장해도 만료일이 늘지 않음** — `dt_save_project`의 update가 `expires_at`을 건드리지 않음(초기 마이그레이션 49행). 공통 규칙(생성 기준 30일)과는 맞지만, 회원이 계속 고쳐 쓰는 작업도 처음 저장일 기준으로 사라진다. 매뉴얼에는 이번에 그대로 안내함. 우선순위 낮음. 상태 대기(규칙과 일치, 정책 결정 사항).
- 용어집(`dt_glossaries`)은 만료 칸이 없어 기간 없이 남는다. 생성 데이터 30일 규칙 대상인지 미확인(회원 설정에 가까움). 우선순위 낮음. 상태 제안(정책 확인).
- **버전 표기 불일치** — `src/lib/version.ts` v1.23인데 `package.json` 1.20.0. 화면 영향 없음. 우선순위 낮음. 상태 제안.
### 2) 화면·가독성·사용 편의
- 매뉴얼 히어로·대시보드 문구 「3중 검수」「출판급 번역」은 실제로는 재검수 1회(문맥·용어 제안 + 문체 참고 점수)라 과장 소지. 대시보드(`src/components/Studio.tsx:1046` 부근)는 이번 점검 범위(매뉴얼·설정) 밖이라 그대로 둠. 우선순위 낮음. 상태 제안.
- 매뉴얼 표의 「최대 처리 용량」 등 일부 기술 용어(PDF.js·Mammoth)는 초보 회원에게 어려움. 우선순위 낮음. 상태 제안.
### 3) 다른 자동화 프로그램과 연계
- 업무 워크스페이스 주고받기(v1.23)는 연결됨. 새로 찾은 연계 없음.
### 4) 매뉴얼과 실제 기능의 차이 (이번에 고친 것 / 남은 것)
- 이번에 고침(미배포): 옛 모델·가격 문구(Gemini 2.5 Flash $0.10) → 실제 모델 2종(`src/lib/translation/model.ts:26`)·본인 키 과금, 분할 단위 1,500~2,000자 → 약 4,000자·최대 10묶음(`model.ts` `CHUNK_SIZE`·`MAX_CHUNKS`), MD 파일 불러오기 미지원(`src/lib/translation/import.ts:70`은 txt·pdf·docx만), DOCX 「완벽 복원」 → 「지원」(이미지 제외), 「암호화 보관」「AI 학습에 절대 사용 안 됨」(코드로 확인 불가) → 실제 저장 방식·Google 약관 안내, 숫자·URL 비교는 AI 없이 화면 비교(`Studio.tsx:1501`), JSON 백업 버튼 이름 정정, 화면별 버튼 안내 카드 4개·FAQ 2개(업무 워크스페이스, 시작 전 준비) 추가. 설정 화면에 「📖 Gemini 키 발급 방법」 링크 추가.
- 남은 것: 1번의 `retention_exempt` 처리 후 매뉴얼 보관 안내 재확인.
### 5) 정책 점검 (pending-check 결과)
- 저작권 고지: `NOTICE`·`public/ai.txt`·`public/robots.txt` 있음(배포 대기).
- 저장공간 위젯 한 줄 미적용 — `src/app/layout.tsx`. 중간, 대기.
- 범위 없는 `signOut()` — `src/app/api/auth/logout/route.ts:12` → `signOut({ scope: "local" })`. 중간, 대기.
- 서버 로그인 기기 정보: pending-check에서 지적 없음.
- 30일 정리 예외 회원: 크론이 `retention_exempt`를 빼지 않음(1번 첫 항목, 높음) → SQL 작성, 적용 대기 + 목록 API 이번에 고침(미배포).
