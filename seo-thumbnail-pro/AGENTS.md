# 🛡️ AI 유튜브 썸네일 프로 (`seo-thumbnail-pro`) — AI 에이전트 작업 지침 (AGENTS.md)

> **프로그램 공식 URL**: https://seo-thumbnail-pro.buylife.xyz  
> **현재 버전**: `v1.10`  
> **적용 디자인 템플릿**: **크리에이티브 아틀리에 스타일 — 프로 썸네일 캔버스 변형 (Creative Atelier Style — Pro Thumbnail Canvas Edition)**  
> **최근 업데이트 일자**: 2026-10-19  
> **담당 에이전트**: Antigravity CLI (agy)

---

## 1. 프로그램의 사용목적 및 대상

- **사용 목적**:
  - 유튜브 대본이나 아이디어 요약본을 입력받아, 시청률과 클릭률(CTR)을 극대화하는 **3대 A/B SEO 전략(호기심 유발형, 가치/혜택형, 감성 후킹형)**을 자동 수립합니다.
  - 최적화된 영상 제목, SEO 설명문, 핵심 해시태그, 유튜브 스튜디오 500자 태그, 시청자 댓글 참여 유도용 고정 댓글 질문을 일괄 생성합니다.
  - Nano Banana 2.1 기반의 16:9 초고화질 시네마틱 썸네일 이미지를 즉시 렌더링하고, 대화형 피드백 수정 루프를 통해 완성도 높은 썸네일을 제작합니다.
- **주요 대상**:
  - 유튜브 업로드 준비 시간(기획, 메타데이터 작성, 썸네일 제작)을 90% 이상 단축하고 싶은 크리에이터.
  - 클릭률(CTR)과 알고리즘 노출을 극대화하기 위해 A/B 테스트 전략을 체계적으로 수립하고자 하는 전문 유튜버 및 MCN.
  - 본인의 얼굴이나 특정 캐릭터 레퍼런스를 살려 일관된 썸네일 브랜딩을 구축하려는 인플루언서.

---

## 2. 개발 구현에 사용된 도구/개발기법/플러그인/스킬

- **프레임워크 & 런타임**: Next.js 16.2.11 (App Router, Turbopack 가속), React 19.2.4, TypeScript 5.x.
- **스타일링 & UI 테마**: Tailwind CSS v4, Lucide React 아이콘 세트, 커스텀 CSS 디자인 토큰 시스템.
- **인증 및 데이터베이스**: Supabase Auth (매직링크 & SSO 인증), `@supabase/ssr`, PostgreSQL.
- **AI 엔진 & 모델**:
  - 텍스트 전략 분석: Google Gemini 2.5/3 Flash API.
  - 이미지 렌더링: Google Gemini Nano Banana 2.1 (`gemini-nano-banana-2.1`) 및 Gemini 3 Pro Image (공용 기준 코드 `lib/providers/` 사본 연동).
- **브라우저 검수 도구**: Playwright (Microsoft Edge 전용 포그라운드 최전면 실세션 자동화).

---

## 3. 핵심 기능 및 시스템 로직/아키텍처, 장점 및 단점

### 핵심 기능 및 아키텍처
1. **STEP 1. 기획 및 전략 (Strategy Column)**:
   - 텍스트 대본 직접 입력 또는 `.txt`/`.md` 파일 드래그앤드롭 업로드.
   - 호기심 유발형, 가치 중심형, 스토리 후킹형의 3대 A/B 전략 자동 분기.
   - 기존 영상 메타데이터 역분석기 탑재.
2. **STEP 2. 썸네일 상세 설정 (Settings Column)**:
   - 썸네일 텍스트 문구(헤드카피) 및 핵심 비주얼 키워드 설정.
   - 10대 장르 프리셋(일상/브이로그, 지식/정보, 게임, 테크/IT, 먹방/요리 등).
   - 10대 조명/분위기 프리셋(선명한, 네온/사이버펑크, 시네마틱 무드 등).
   - 피사체 인물 정밀 설정(성별, 연령대, 표정, 인물 특징, 본인 사진 레퍼런스 업로드).
3. **STEP 3. 결과물 & 피드백 (Result Column)**:
   - 16:9 고화질 썸네일 실시간 렌더링.
   - 풀스크린 고화질 뷰어 및 1080p 원클릭 다운로드.
   - 사용된 AI 프롬프트 복사.
   - 자연어 피드백 수정 루프 (이전 이미지 맥락을 유지한 채 디테일 부분 재합성).
4. **프로젝트 백업 & 복원 엔진**:
   - 작업 중인 모든 대본, 3대 전략, 상세 설정을 단일 JSON 파일로 백업/불러오기.

### 장점 및 단점
- **장점**: 대본 입력부터 메타데이터 복사, 16:9 썸네일 렌더링까지 한 화면(3열 모듈러 레이아웃)에서 끊김 없이 완료 가능. 회원 본인 API 키 원칙으로 안전하고 저렴한 비용 구조.
- **단점**: 고화질 렌더링 시 구글 서버 트래픽 상황에 따라 수 초간의 대기 시간이 발생할 수 있으며, 썸네일 내 한글 타이포그래피의 복잡한 폰트 배치는 사후 수정 루프가 필요할 수 있음.

---

## 4. 현재 버전 및 버전별 변경 히스토리

- **`v1.10` (2026-10-19 — 현재 버전, Antigravity CLI)**:
  - **크리에이티브 아틀리에 스타일 — 프로 썸네일 캔버스 변형 전면 리뉴얼**:
    - 딥 미드나잇 다크 네이비(`#0c0f17`) 캔버스와 서피스 카드(`#131824`), 보더(`#222d42`), 유튜브 레드/앰버 액센트 토큰 적용.
  - **사이드바 메뉴 규격화 (`DESIGN.md` 9번 원칙 충족)**:
    - 좌측 사이드바에 **`📖 연동 & 사용 매뉴얼`** 메뉴 신설.
  - **비주얼 에디토리얼 가이드북 전면 고도화 (`GuideModal.tsx`)**:
    - 히어로 배너, 4단계 파이프라인 카드, CTR 300% 극대화 꿀팁 3선, API 키 가이드, FAQ 4종 아코디언 구축.
  - **버전 4중 동기화**: `package.json` (`1.10.0`), `src/lib/version.ts` (`v1.10`), 푸터 문구, Supabase DB `programs.version` (`v1.10`) 일체화.
  - **Vercel 프로덕션 배포** (`dpl_FA36Ey34aWYeYdnsVpYPa4g8dVHb`) 및 **Microsoft Edge 포그라운드 최전면 실세션 6종 검수 완료**.
- `v1.09` (2026-10-18): 이미지 시간 초과 안내를 Google AI Studio 사용량 확인으로 정정.
- `v1.08` (2026-10-18): 이미지 시간 초과 자동 재시도 중단(이중 과금 방지).
- `v1.07` (2026-10-17): 이미지 생성 시간 초과 안내 문구 통일.
- `v1.06` (2026-10-17): 공용 이미지 클라이언트 모듈 사본 동기화.
- `v1.01` (2026-10-11): 신규 서브프로젝트 스캐폴딩 및 3단 워크플로우 최초 릴리즈.

---

## 5. 남아 있는 추가 프로그램 및 디자인 작업 대기 내용

- 상세 백로그는 [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md) 참조:
  - [ ] 썸네일 캔버스 내 실시간 텍스트 타이포그래피 오버레이 편집기 (Fabric.js/Canvas 레이어)
  - [ ] 유튜브 실제 피드 환경(홈 피드, 검색 결과 피드, 추천 동영상 피드) A/B 비교 시뮬레이터
  - [ ] 76번 썸네일 마스터(`thumbnail-master`)와의 템플릿 프리셋 연동

---

## 6. 기존 다른 프로그램과의 연계/기능 병합 제안

1. **76번 AI 썸네일 마스터 (`thumbnail-master`) 연계**:
   - 두 프로그램의 썸네일 생성 엔진과 캔버스 프리셋을 상호 공유하여, 대본 분석은 `seo-thumbnail-pro`에서 진행하고 정밀 텍스트 배치는 `thumbnail-master`에서 이어받는 파이프라인 연계.
2. **75번 AI 블로그 콘텐츠 제작 자동화 (`blog-content-maker`) 연계**:
   - 블로그 콘텐츠 제작 완료 시 메인 타이틀을 `seo-thumbnail-pro`로 전송하여 유튜브 영상화 썸네일을 1클릭 자동 제작.
3. **28번 YOUTUBE VIRAL FINDER (`youtube-viral-studio`) 연계**:
   - 떡상한 경쟁 영상의 썸네일 URL을 즉시 가져와 역분석하고, 내 채널에 맞는 개선된 썸네일 전략을 추출하는 기능 연계.

---

## 7. 사용자 편의성 증대를 위한 디자인 UI 개선안

1. **실제 유튜브 모바일/PC 피드 실시간 미리보기 모달**:
   - 썸네일이 유튜브 홈 화면이나 다크 모드 검색 결과 목록에 배치되었을 때의 시인성을 실제 유튜브 UI 위에 띄워 검증하는 피드 시뮬레이터.
2. **썸네일 텍스트 대비(Contrast) 자동 점수 측정기**:
   - 텍스트 배경과 글자색의 명암비를 계산하여 '가독성 우수(A+)' 등의 지표를 뱃지로 실시간 표시.
3. **원클릭 프리셋 스타일 칩**:
   - 국뽕/뉴스, 충격/폭로, 브이로그/감성, 테크/리뷰 등 클릭 한 번으로 모든 10대 옵션을 최적 조합해주는 원클릭 스타일 칩 제공.

## 2026-10-19 v1.11 — 참조 인물 사진 칸에서 깨진 사진을 받지 않고 안내 (Claude Code 윈도우)
- 공용 부품 `image-file-check` 사본 `src/lib/imageFileCheck.ts`(+ `tests/imageFileCheck.test.mjs`) — **직접 고치지 말 것**, 기준 `portrait-photo/src/lib/imageFileCheck.ts` 수정 후 `node scripts/check-shared-modules.mjs --sync`. `npm test` 명령 신설.
- `src/components/SettingsColumn.tsx` `handleImageUpload`: `checkImageFile` → 깨졌으면 받지 않고 사진 칸 아래 `role="alert"` 안내. 같은 파일을 다시 골라도 반응하게 입력값 초기화.
- 검수: 공용 테스트 5/5, tsc, 빌드, Vercel READY(`seo-thumbnail-4buqf6i9l`), DB v1.11, 운영 실측(인물 설정 켬 → 깨진 사진 → 안내·깨진 미리보기 없음 → 설정 원복). AI 비용 없음.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-20 병합 D 예정 — AI 썸네일 마스터(thumbnail-master) 안으로 (Claude Code 윈도우, 플랜 확인 대기)
- 플랜: [`../thumbnail-master/docs/PLAN_20261020_MERGE_D_SEO_PRO.md`](../thumbnail-master/docs/PLAN_20261020_MERGE_D_SEO_PRO.md). 발견: `GET /api/user/key`가 회원 Gemini 키 원문을 브라우저로 반환·`localStorage` 보관, 키 API가 프로그램 이용 권한을 확인하지 않음, 예비 모델에 `gemini-1.5-flash` — 병합(3단계)으로 해소 예정.

## 2026-10-20 v1.12 — 병합됨 → AI 썸네일·SEO 자동화(thumbnail-master) (Claude Code 윈도우)
- 병합 D 3단계(주인님 승인). SEO 전략(제목·설명·해시태그·스튜디오 태그·고정 댓글)이 `thumbnail-master` `/seo`로 이동(서버 API, v1.08~v1.09). 이 앱은 **화면 이동만**: `/`→`thumbnail-master.buylife.xyz/seo`, `/login`→합친 앱 `/login`(`next.config.ts`).
- **`/api/user/key`는 410으로 막음** — 회원 Gemini 키 원문을 브라우저로 돌려주던 API(권한 확인도 없었음). 전달(rewrite)하지 않음. Vercel 프로젝트·도메인은 지우지 않음. 카탈로그 노출 중지.

## 2026-10-21 코드 정리(사용 종료) — 백업 후 삭제 (Claude Code 윈도우)
- 주인님 「백업해놓고 지워」「사용종료 하기로한 프로그램은 백업해서 하나의 폴더로 만든후 진행」. **정리 직전 소스 전체 백업: `D:\Antigravity\AIMaster_backup\retired-programs\<이 폴더>\`**(색인 README) · git 태그 **`backup/old-apps-20261021`**(원격에도 있음, `git checkout backup/old-apps-20261021 -- <폴더>`로 복원) · 압축 `D:\Antigravity\AIMaster_backup\old-apps-20261021.zip`.
- 이 폴더에는 **옛 주소 전달 설정(`next.config`)·안내 화면 1개(layout·page)·빌드 설정·문서·DB 마이그레이션(`supabase/`)만** 남김. 화면·부품·로직·테스트·미들웨어는 삭제(썸네일 프로는 키 차단 API 410만 유지). 로컬 빌드 통과 확인. 운영 배포·Vercel 프로젝트·도메인·DB 표는 그대로(재배포 안 함). 공용 점검 스크립트의 이 폴더 사본 등록 제거.
