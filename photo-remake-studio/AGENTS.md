# photo-remake-studio (AI 포토 리메이크 자동화) — AI 에이전트 인수인계 문서

> **최근 업데이트**: 2026-10-18 (v1.09 리뉴얼 완결)  
> **공식 서비스 도메인**: [https://photo-remake-studio.buylife.xyz](https://photo-remake-studio.buylife.xyz)  
> **디자인 템플릿**: **크리에이티브 아틀리에 스타일 — 포토 리메이크 옵시디언 변형 (Creative Atelier Style — Photo Remake Obsidian Edition)**  
> **불변 원칙**: 회원 본인 Gemini API 키 직접 등록 사용 (`docs/TOP_RULE_PERSONAL_ACCOUNT_API.md`), 단일 작업 순차 진행, Edge 브라우저 최전면 포그라운드 실세션 검수.

---

## 1. 프로그램 사용목적 및 대상
- **사용목적**: 손상된 옛날 흑백 사진의 흠집·노이즈 복원, AI 컬러화, 최대 8,192px 초해상도 확대(Upscaling), 자연스러운 다중 사물 합성(Compose)을 원스톱으로 지원하는 AI 사진 복원 및 연출 연구소 스튜디오.
- **주요 대상**:
  - 오래된 부모님·조부모님 사진이나 손상된 가족 앨범을 고화질로 복원하고 선명한 컬러를 입히고 싶은 일반 회원.
  - 소장 중인 인물/풍경 사진에 특정 사물(모자, 안경, 의상, 소품 등)을 정교하게 합성하고자 하는 크리에이터.
  - 사진관, 스튜디오, 디지털 아카이빙 전문가.

---

## 2. 개발 구현에 사용된 도구 / 개발기법 / 기술 스택
- **프레임워크 & 런타임**: Next.js 16.4.0 (App Router, Turbopack 최적화 빌드), React 19.3.0, Node.js.
- **언어 & 타입 시스템**: TypeScript 5.9.3, Strict Type Checking (`npx tsc --noEmit` 통과).
- **이미지 엔진**: `sharp` 0.35.5 (고성능 로컬 이미지 리사이징, 버퍼 변환, 메타데이터 보존).
- **AI 엔진**: Google Gemini API (`gemini-2.5-flash` / `gemini-nano-banana-2.1` 연동).
- **데이터베이스 & 인증**: Supabase (`@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.117.3), 쿠키 기반 SSR 세션 연동.
- **아이콘 & UI**: `lucide-react` 1.48.0, 무결성 CSS 변수 기반 디자인 토큰 시스템.
- **테스트**: Node.js 내장 테스트 러너 (`node --conditions=react-server --import tsx --test tests/*.test.mjs`, 18개 테스트 100% 통과).

---

## 3. 핵심 기능 및 시스템 로직 / 아키텍처, 장점 및 단점

### 3.1 핵심 기능
1. **AI 사진 복원 (Restore)**:
   - 스크래치, 찢김, 빛바램, 노이즈를 AI가 분석하여 원본의 얼굴과 구도를 엄격히 보존하며 복원.
2. **AI 흑백 사진 컬러화 (Colorize)**:
   - 시대적 배경과 의복, 피부 톤을 추론하여 생동감 넘치는 자연스러운 색상 채색.
3. **초해상도 픽셀 확대 (Upscale)**:
   - AI 복원 결과를 2배/4배(최대 8,192px)로 선명하게 확대.
4. **Before / After 실시간 인터랙티브 비교 슬라이더**:
   - 원본 사진과 복원 결과물을 드래그 슬라이더로 전후 비교.
5. **다중 사물 자연 합성 (Compose)**:
   - 기본 사진 1장에 사물 사진 최대 5장을 추가하여 지정 위치에 자연스럽게 융합.
6. **내 보관함 (History)**:
   - 브라우저 로컬 스토리지에 완성작 최대 20개 안전 보관 및 고화질 다운로드.
7. **비주얼 에디토리얼 가이드북 (`/guide`)**:
   - 3-Step 파이프라인, 복원 칩 4종, 목차 앵커 및 FAQ 6종 아코디언 탑재.

### 3.2 장점 및 단점
- **장점**:
  - `globals.css` 상단 토큰과 하단 전용 덮어쓰기 기법으로 리액트 로직 변경 없이 무결하고 안전하게 하이엔드 다크 테마 구현.
  - 서버에 사진을 영구 보관하지 않고 브라우저에만 저장하여 개인정보 보호 및 보안성 우수.
  - 전후 비교 슬라이더를 통한 즉각적인 품질 검증 가능.
- **단점**:
  - 원본 사진의 해상도가 극도로 낮거나 훼손이 90% 이상인 경우 일부 세부 디테일 추론에 한계가 있을 수 있음.

---

## 4. 현재 버전 및 버전별 변경 히스토리

### v1.09 (2026-10-18) — 현재 버전
- **디자인 템플릿 리뉴얼**: 크리에이티브 아틀리에 스타일 — 포토 리메이크 옵시디언 변형 (Creative Atelier Style — Photo Remake Obsidian Edition) 전면 적용.
- **컬러 시스템 개편**: 옵시디언 딥블랙(`--background: #090a0f`), 옵시디언 서피스(`--card: #12141c`), 리메이크 앰버 골드(`--brand: #f59e0b`), 에메랄드 그린(`--ok: #10b981`).
- **가이드북 비주얼 에디토리얼 고도화**: 3-Step 파이프라인 배너, 복원 칩 4종, FAQ 6종 아코디언 완비.
- **사이드바 UI 표준화**: 브랜드 배지 🪄 마법봉 아이콘 적용, `연동 & 사용 매뉴얼` 메뉴 통일, 모바일 헤더 56px 슬림화.
- **품질 검증**: 18개 단위 테스트 100% 통과, TypeScript 오류 0건, Vercel 프로덕션 배포 완료.
- **Edge 최전면 실세션 검수**: 데스크톱/모바일 6개 화면 포그라운드 캡처 아티팩트 보존 및 10분 실세션 유지.

### v1.08 이전
- 초기 사진 복원, 컬러화, 사물 합성, 내 보관함 및 기본 UI 구축.

---

## 5. 남아 있는 추가 프로그램 및 디자인 작업 대기 내용
- `photo-remake-studio/docs/IMPROVEMENT_BACKLOG.md` 참고:
  - 인공지능 부분 지우개(Magic Eraser / Inpainting) 브러시 툴 추가.
  - 훼손 부위 수동 마스킹 브러시 기능.

---

## 6. 기존 다른 프로그램과의 연계 / 기능 병합 아이디어
1. **80번 바나나캔버스 (`banana-canvas`) 연계**:
   - 복원된 추억 사진을 바나나캔버스로 1클릭 전송하여 레트로 감성 인생 앨범 포스터 제작.
2. **82번 AI 패션스타일 (`fashion-style`) 연계**:
   - 복원된 전신/상반신 인물 사진을 패션스타일로 전송하여 최신 현대 의상으로 가상 피팅.
3. **19번 감성 글귀 이미지 (`emotion-writer`) 연계**:
   - 복원된 흑백 가족사진에 부모님께 드리는 감사 문구나 감성 시구를 캘리그라피로 합성.

---

## 7. 사용자 편의성 증대를 위한 UI 개선안 및 스타일 변경 제안
1. **복원 프리셋 원클릭 퀵 칩 바**:
   - "빛바랜 사진 복원", "흑백 사진 컬러화", "얼굴 선명화 4x" 등 원클릭 빠른 실행 버튼 제공.
2. **슬라이더 뷰 모드 전환 (Side-by-Side vs Slider)**:
   - 스와이프 슬라이더 외에도 좌우 나란히 놓고 전체를 비교할 수 있는 듀얼 뷰 토글 추가.
3. **복원 진행률 퍼센트 게이지**:
   - AI 처리 중 단계별 진행 상황을 프로그레스 바로 시각화.

## 2026-10-19 플랫폼 분석 — 추가 검토·개발 제안 (미구현)

F-006(P1)를 운영 설정/코드/조건부 위험과 구분해 기록했습니다. **수정·DB적용·배포는 미실행**입니다. [프로그램별 발견·다음 첫 단계](docs/IMPROVEMENT_HANDOFF_20261019_ANALYSIS.md) · [전체 분석/병합 제안](../docs/analysis-20261019/REPORT.md). 주인님 지정 작업과 최신 구현을 대조한 뒤 플랜부터 제시합니다.

## 2026-10-19 v1.10 — 깨진 사진 안내를 한글로 (Claude Code 윈도우)
- 운영 실측: 깨진 JPG를 올리면 브라우저 영어 원문 「The source image could not be decoded.」이 안내로 보였음.
- 공용 부품 `image-file-check` 사본 `src/lib/imageFileCheck.ts`(+ `tests/imageFileCheck.test.mjs`) — **직접 고치지 말 것**, 기준 `portrait-photo/src/lib/imageFileCheck.ts` 수정 후 `node scripts/check-shared-modules.mjs --sync`.
- `src/lib/remake/clientImages.ts` `preparePhoto`가 `createImageBitmap` 전에 `checkImageFile` → 깨졌으면 공용 한글 안내로 오류.
- 검수: 단위 23/23(공용 5 포함), tsc, 빌드, Vercel READY(`photo-remake-studio-4x9drmmcr`), DB v1.10, 운영 실측 — 「사진을 읽지 못했어요…」, 영어 원문 없음. AI 비용 없음.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->
