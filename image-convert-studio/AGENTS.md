# AIMaster — 이미지 변환 스튜디오 (image-convert-studio) 인수인계 문서 (AGENTS.md)

> **공식 서비스 URL**: https://image-convert-studio.buylife.xyz
> **관리자 계정**: `buylifemall@gmail.com` | **일반 회원 테스트 계정**: `buylifemall@naver.com`
> **배포 플랫폼**: Vercel (`image-convert-studio`, 팀 `buylife`, `dpl_53c8Li6LeZtecM3HFf2aBThWTbkj`)
> **최신 버전**: `v1.07` (2026-10-18 디자인 리뉴얼 완료)

---

## 1. 프로그램의 사용 목적 및 대상
- **사용 목적**:
  - 외부 서버나 유료 소프트웨어 없이, 브라우저 안에서 100% 온디바이스로 여러 장의 이미지를 WebP, AVIF, PNG, JPEG 형식으로 초고속 일괄 변환·압축·업스케일링하고, 다양한 레이아웃의 고화질 콜라주 이미지를 생성하는 전문 크리에이터 도구.
- **주요 대상**:
  - 웹사이트/쇼핑몰 로딩 속도 최적화(LCP 개선)를 위해 이미지 용량을 다이어트해야 하는 웹 마스터 및 셀러.
  - 블로그 및 SNS(인스타, 스레드)에 올릴 사진을 고화질로 일괄 변환하거나 콜라주로 합성해야 하는 콘텐츠 크리에이터.
  - 개인정보 및 사내 기밀 이미지를 외부 서버로 전송하지 않고 안전하게 로컬에서만 변환해야 하는 전문 디자이너.

---

## 2. 개발 구현에 사용된 도구 / 개발 기법 / 플러그인 / 스킬
- **프레임워크 및 런타임**: Next.js 16.2.11 (App Router, Turbopack), React 19.2.4, TypeScript 5
- **스타일링**: TailwindCSS v4 (`@import "tailwindcss"`), Lucide React 아이콘 팩
- **이미지 프로세싱 엔진**:
  - `HTML5 Canvas` & `createImageBitmap`: 하드웨어 가속 기반 초고속 이미지 디코딩/인코딩.
  - `pica v9.0.1`: Lanczos3 고급 리샘플링 알고리즘 및 언샵 마스크(Unsharp Mask) 샤프닝 엔진 (`features: ["js", "wasm"]`로 초기화하여 번들러 멈춤 방어).
  - `JSZip v3.10.2`: 변환된 이미지들을 브라우저 메모리상에서 1-Click ZIP 아카이브로 묶어 다운로드 제공.
- **인증 및 다국어 지원**:
  - `@supabase/ssr` & `@supabase/supabase-js`: AIMaster 통합 회원 인증 및 권한 확인 (`src/lib/access.ts`, FREE 배지).
  - 다국어 지원: 한국어(KO) 및 영어(EN) 지원 (`src/lib/i18n.ts`, `localStorage` 연동).

---

## 3. 핵심 기능 및 시스템 로직 / 아키텍처, 장점 및 단점

### 핵심 기능
1. **1단계: 일괄 변환 & 업스케일링 (`/convert`)**:
   - 최대 300장 대용량 파일 드래그앤드롭 업로드 (100장 초과 시 안정성 가이드 표시).
   - WebP, AVIF, PNG, JPEG 출력 포맷 선택 및 실시간 품질(10~100%) 슬라이더 제어.
   - 0.5×(축소), 1×(원본), 1.5×, 2×, 3×, 4×(초고화질 확대) 업스케일링 및 Lanczos3 필터, 언샵 마스크 샤프닝.
   - 최대 너비/높이 상한 제한(Max Width/Height) 안전망 제공 (최대 16,384px / 1.2억 화소 방어).
   - 파일별 절감 용량 실시간 계산(%) 및 개별 다운로드 / 전체 ZIP 일괄 다운로드.
2. **2단계: 콜라주 스튜디오 (`/collage`)**:
   - 다중 이미지 업로드 및 순서 변경 카드 갤러리 (좌우 이동 및 개별 삭제).
   - 격자(Grid) / 가로(Horizontal) / 세로(Vertical) 레이아웃 전환, 열(Column) 개수, 셀 크기, 간격(Gap), 여백(Padding), 배경색 컬러 피커, 맞춤(Cover/Contain) 실시간 조절.
   - 실시간 Canvas 렌더링 프리뷰 및 초고화질 단일 파일 다운로드.
3. **비주얼 연동 & 사용 매뉴얼 (`/guide`)**:
   - 5단계 원스톱 파이프라인 다이어그램, 포맷별 매트릭스 비교표, 전문가 팁 4종, 실전 체크리스트, 트러블슈팅 FAQ 5종.

### 장점 및 단점
- **장점**:
  - **100% 무손실/무유출 온디바이스 보안**: 모든 이미지 연산이 사용자의 로컬 브라우저에서 수행되므로 서버 대역폭 비용이 0원이며 데이터 유출 위험이 원천 차단됨.
  - **차세대 압축 표준(AVIF/WebP) 완벽 지원**: 최신 웹 환경에 맞춘 초고효율 압축 제공.
  - **크리에이티브 아틀리에 딥 나이트 템플릿**: 디자이너 감성의 세련된 다크 테마와 375px 모바일 슬라이딩 드로어 반응형 완비.
- **단점**:
  - 대용량(수백 장) 동시 변환 시 클라이언트 PC/모바일 기기의 메모리 및 CPU 성능에 따라 처리 시간이 달라질 수 있음.

---

## 4. 현재 버전 및 버전별 변경 히스토리
- **v1.01 (2026-10-12)**: 신규 제작·등록·Vercel 배포.
- **v1.02 (2026-10-12)**: pica 번들러 웹워커 멈춤 현상 수정 (`features: ["js", "wasm"]`).
- **v1.03 (2026-10-12)**: 일본어(JA) 삭제 — 한국어/English 지원 확정.
- **v1.04 (2026-10-12)**: 한국어 사용 안내 가이드 본문 보강.
- **v1.05 (2026-10-12)**: 핸드폰 번호 필수 정책 적용.
- **v1.06 (2026-10-16)**: 최상위 DB 연동 변수 호환 (`PUBLISHABLE/SECRET` 지원).
- **v1.07 (2026-10-18, 현재)**:
  - **크리에이티브 아틀리에 스타일 — 이미지 스튜디오 에디션** 디자인 전면 리뉴얼.
  - 단일 테마 일체화: 딥 나이트 옵시디언 (`#0b0f17`) + 서피스 (`#111726`) + 바이올렛 (`#8b5cf6`) & 인디고 (`#6366f1`) 포인트.
  - 375px 모바일 전용 56px 슬림 헤더 및 슬라이딩 드로어(Drawer) 구축 (가로 넘침 0px 방어).
  - 비주얼 가이드북 (`/guide`) 전면 신설: 5단계 파이프라인, 포맷 매트릭스, 전문가 팁, FAQ 5종 완비.
  - 로그인 페이지 테마 일체화 및 DB `programs.version` v1.07 동기화.
  - Microsoft Edge 포그라운드(`headless: false`) 실세션 검수 완료 (6종 캡처 보존).

---

## 5. 남아 있는 추가 프로그램 및 디자인 작업 대기 내용
- `image-convert-studio/docs/IMPROVEMENT_BACKLOG.md` 참고:
  - 이미지 전/후 비포&애프터 스플릿 뷰어 모달
  - 순서 변경 시 마우스 드래그앤드롭(Drag & Drop) 핸들러
  - Web Worker 기반 멀티스레드 백그라운드 렌더링 지원

---

## 6. 기존 다른 프로그램과의 연계 / 기능 병합 제안
- **`ai-image-studio` (34번)**: AI 이미지 생성기에서 만든 고화질 이미지를 본 스튜디오로 원클릭 전달하여 WebP 압축 및 콜라주 제작.
- **`four-cut-comics` (81번)**: 생성된 4컷 만화를 본 스튜디오 콜라주 엔진으로 불러와 2×2 / 세로 스크롤 합본 이미지 자동 렌더링.
- **`shop-detail-page` (7번)**: 15단 상세페이지 롱 이미지 병합 모듈과 캔버스 렌더링 엔진 코드 공용화.

---

## 7. 사용자 편의성 증대를 위한 디자인 UI 개선안
- **변환 옵션 프리셋 버튼 (SNS 맞춤 규격)**:
  - '인스타그램 피드 (1:1, 1080px)', '유튜브 썸네일 (16:9, 1280px)', '블로그 본문 (가로 800px, WebP 85%)' 원클릭 세팅 칩 제공.
- **퀵 크롭 & 회전 툴바**:
  - 각 썸네일 위에서 90도 회전 및 1:1 자르기를 즉시 수행할 수 있는 미니 툴바 오버레이.

## 2026-10-19 v1.08 — 깨진 사진을 목록에 넣지 않고 안내 (Claude Code 윈도우)
- 운영 실측: 깨진 JPG가 깨진 미리보기로 변환 목록에 들어가고 안내 없음.
- 공용 부품 `image-file-check` 사본 `src/lib/imageFileCheck.ts`(+ `tests/imageFileCheck.test.mjs`) — **직접 고치지 말 것**, 기준 `portrait-photo/src/lib/imageFileCheck.ts`를 고치고 `node scripts/check-shared-modules.mjs --sync`.
- `src/components/tool/Dropzone.tsx`(변환·콜라주 공용)에서 `splitReadableImages`로 깨진 사진을 빼고, 문구는 이 프로그램 번역 `t.dropzone.unreadable`(한·영) 사용.
- 검수: 단위 21/21(공용 5 포함), tsc, 빌드, Vercel READY(`image-convert-studio-4vgrtzo4p`), DB v1.08, 운영 실측 — 깨진 사진 → 「사진을 읽지 못해 1장을 뺐어요…」, 목록에 안 들어감. AI 비용 없음.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-21 v1.09 — 바나나 캔버스 「형식 바꾸기」로 넘어온 이미지 자동 추가 (Claude Code 윈도우)
- `/convert?src=<서명 주소>`: 우리 Supabase 저장소의 바나나 캔버스 결과 서명 주소(`/storage/v1/object/sign/banana-canvas-files/`)만 받아 브라우저에서 내려받아 목록에 넣음(다른 주소는 무시, 처리는 지금처럼 브라우저 안에서만). 받은 뒤 주소창에서 `?src=` 제거, 안내 문구 표시. 서명 주소는 1시간 뒤 만료 → 안내.
- 검수: tsc·`npm test` 21개·build, 배포 Ready, DB v1.09(package.json 1.07.0 → 1.09.0으로 어긋남도 맞춤). 크롬에서 바나나 캔버스 이미지 주소로 열어 목록 자동 추가·안내 확인.

## 2026-10-22 v1.10 — 「형식 바꾸기」 받는 곳 확대: AI 인물사진·AI 4컷 만화 (Claude Code 윈도우, 이미지 재비교 L3)
- 새 `src/lib/importSource.ts`(`IMPORT_SOURCES`·`importSourceOf`): `?src=`는 우리 Supabase의 `banana-canvas-files`·`portrait-photo-files`·`four-cut-comics-files` **서명 주소만** 받음(공개 주소·다른 버킷·다른 호스트·http는 거부). `ConvertTool`의 안내·파일 이름이 보낸 프로그램 이름을 따름. 이미지는 지금처럼 브라우저 안에서만 처리.
- 검수: 시험 23개(새 `tests/importSource.test.mjs` 2개), build, 배포 `image-convert-studio-losm32qsc` Ready, DB v1.10. 크롬: 인물사진 버킷 시험 그림(320×240, DB 행 없음)의 서명 주소로 열기 → 「AI 인물사진 결과를 목록에 넣었습니다」·목록에 들어옴 → 시험 그림 삭제.
- 남은 일: 이미지 스튜디오(`ai-image-generations`) 결과 받기는 다른 세션의 이미지 스튜디오 작업이 끝난 뒤 보내는 버튼과 함께 추가.

## 2026-10-22 v1.11 — 그라데이션 글로우 버튼(바이올렛) 이식 (Claude Code 윈도우)
- 바나나 캔버스 v1.21 버튼 방식(그라데이션 + 안쪽 하이라이트 + 색 번짐 그림자, 호버 1px 뜸)만 이 프로그램 바이올렛 색으로 이식. 템플릿(크리에이티브 아틀리에 — 이미지 스튜디오 에디션, 다크)은 그대로.
- 방법: Tailwind 클래스는 지우지 않고 버튼에 `ics-primary/ics-secondary/ics-ghost/ics-danger`(공통 `btn`에 `ics-btn`)를 덧붙이고 `globals.css` 끝에서 정의(레이어 밖 CSS가 Tailwind 유틸리티보다 우선). 20곳.
- 대비: 실행 버튼 흰 글자 5.1~6.3:1, 보조 10.4, 고스트 12.6, 삭제 12.8. 시험 23개·build, 배포 `image-convert-studio-dpcqphw1j` Ready, DB v1.11, 크롬 화면 확인.
