# AGENTS.md — 감성 글귀 이미지 (emotion-writer)

> 작업 전 루트 `CLAUDE.md`, `GEMINI.md`, `docs/HANDOFF.md`, `docs/ERROR_LESSONS.md`와 이 폴더 `README.md`를 필독한다.

---

## 1. 프로그램의 사용목적 및 대상
- **사용목적**: 인생 명언, 따뜻한 위로, 새벽 감성 글귀를 AI(Gemini 2.5)로 즉시 창작하고, Unsplash 무료 고해상도 감성 사진 또는 Gemini 나노바나나(`gemini-nano-banana-2.1`) 독창 AI 배경과 결합하여 나눔명조, 나눔손글씨 펜, 고운돋움 등 아름다운 한글 서체로 캘리그라피 카드뉴스를 100% 온디바이스(Canvas)로 렌더링·저장하는 감성 비주얼 제작 자동화 플랫폼.
- **주요 대상**:
  - 인스타그램 감성 계정, 스레드, 틱톡, 핀터레스트 등에 매일 감성 시/명언/힐링 카드를 발행하는 1인 크리에이터 및 SNS 마케터.
  - 카카오톡 프로필, 배경화면, 지인 안부 인사를 위한 따뜻한 감성 캘리그라피 이미지를 손쉽게 만들고자 하는 일반 사용자.
  - 별도의 포토샵이나 무거운 그래픽 툴 없이 브라우저에서 몇 번의 클릭만으로 세련된 타이포그래피 카드뉴스를 제작하려는 콘텐츠 제작자.

---

## 2. 개발 구현에 사용된 도구 / 개발기법 / 플러그인 / 스킬
- **프레임워크 및 런타임**: Next.js 16.4.0 (App Router, Turbopack), React 19, TypeScript 5, Tailwind CSS v4.
- **디자인 테마 템플릿**: **포커스 스튜디오 스타일 — 감성 캘리그라피 에디션 (Focus Studio Style — Emotion Calligraphy Edition)**
  - 소프트 크림 / 웜 페이퍼 화이트(`#fdfbf7`, `#fbf8f1`) 배경 및 퓨어 페이퍼 서피스(`#ffffff`).
  - 감성 딥 로즈 & 코랄(`#e11d48`, `#f43f5e`), 캘리그라피 잉크 차콜(`#1c1917`), 앰버 골드(`#d97706`).
  - 375px 모바일 전용 56px 슬림 헤더 + 슬라이딩 드로어 메뉴.
- **폰트 시스템 (@fontsource)**:
  - `@fontsource/nanum-myeongjo`: 시, 명언, 철학적 격조 높은 서체
  - `@fontsource/nanum-pen-script`: 감성 손글씨, 위로와 힐링 편지 서체
  - `@fontsource/gowun-dodum` & `Pretendard`: 모던 에세이, 깔끔한 가독성 서체
- **온디바이스 렌더링 엔진**:
  - HTML5 Canvas API (`QuoteCanvas.tsx`): 100% 브라우저 클라이언트에서 텍스트 섀도우, 딤드(Dimmed) 오버레이, 폰트 비율 계산, 워터마크 등을 무손실 합성 렌더링.
- **외부 API 및 백엔드 연동**:
  - Google Gemini 2.5 (`gemini-2.5-flash`): 한국 시간(KST) 계절/현재 월을 반영한 감성 글귀 5종 실시간 생성.
  - Gemini 나노바나나 (`gemini-nano-banana-2.1`, 공용 기준 코드 사본): 글귀 무드에 맞춘 독창적인 AI 예술 배경 생성.
  - Unsplash API: 실사 풍경, 카페, 노을, 일상 등 고화질 감성 사진 무료 큐레이션 검색.
  - Supabase SSR (`@supabase/ssr`): AIMaster 통합 세션 및 안전한 본인 API 키 암호화 관리.

---

## 3. 핵심 기능 및 시스템 로직 / 아키텍처, 장점 및 단점

### 1) 시스템 워크플로우 (6단계 파이프라인)
```
[1단계: 주제 선택]
  - 인생지혜, 명언, 위로, 새벽감성 등 프리셋 또는 사용자 직접 입력
          ↓
[2단계: 이미지 소스 결정]
  - Gemini 나노바나나 AI 이미지 또는 Unsplash 무료 고해상도 사진 검색
          ↓
[3단계: 비율 선택]
  - 9:16 인스타 릴스/쇼츠/배경화면, 1:1 정방형 피드, 4:5 엽서 비율
          ↓
[4단계: 문구 줄 수 지정]
  - 5줄, 6줄, 7줄, 8줄 분량 선택
          ↓
[5단계: 글귀 만들기 & 편집]
  - Gemini 2.5 기반 감성 글귀 5종 자동 추천, 선택 후 실시간 텍스트 인라인 수정
          ↓
[6단계: 완성 & 캔버스 저장]
  - 폰트 종류, 텍스트 크기, 배경 어둡기(Dimmer), 글자 색상/그림자 실시간 조절
  - HTML5 Canvas 기반 초고화질 무손실 PNG / JPG 1-Click 다운로드
```

### 2) 시스템 장점
- **100% 온디바이스(Canvas) 프라이버시 보안**: 글귀 합성 및 캔버스 렌더링이 서버를 거치지 않고 브라우저 로컬에서 즉시 완성되므로 개인 창작물이 유출되지 않음.
- **문학적 서체 감성 극대화**: 나눔명조, 나눔손글씨 펜 등 한글 캘리그라피 서체가 완벽히 내장되어 있어 디자이너 없이도 수준 높은 감성 카드 완성.
- **철저한 본인 키 원칙**: 회원 본인의 Gemini API 키로 동작하여 운영자나 타 회원과 격리되며, Free Tier로도 무료/저비용 이용 가능.

### 3) 단점 및 한계
- **브라우저 캔버스 다운로드 제약**: 일부 인앱 브라우저(카카오톡, 인스타그램 웹뷰)에서는 캔버스 이미지 직접 다운로드가 제한될 수 있어 Safari나 Chrome 등 외부 브라우저 열기가 권장됨.

---

## 4. 현재 버전 및 버전별 변경 히스토리

- **v1.16 (2026-10-20, Claude Code 윈도우)**: 좌측 메뉴 계정·로그아웃이 화면 맨 아래로 밀리던 문제 수정 — `src/components/Sidebar.tsx` 바깥 묶음의 `justify-between` 제거, 계정 묶음 `shrink-0`(사이드바 표준, 웹툰 v1.23과 같은 원인).
- **v1.15 (2026-10-18 - Antigravity 윈도우)**:
  - **포커스 스튜디오 스타일 — 감성 캘리그라피 에디션** 전면 UI/UX 리뉴얼.
  - 소프트 크림(`#fdfbf7`, `#fbf8f1`) 배경 및 퓨어 페이퍼 서피스 테마 통일.
  - 375px 모바일 56px 슬림 헤더 및 슬라이딩 드로어 메뉴 구축.
  - **비주얼 연동 & 사용 매뉴얼 (`/guide`) 신설**: 5단계 파이프라인, 서체별 매칭 팁, Unsplash vs 나노바나나 가이드, FAQ 5종 수록.
  - 로그인 페이지 표준 2-Tab 웜 크림 레이아웃으로 일체화.
  - DB `programs.version`(`v1.15`), package.json (`1.15.0`) 동기화 및 Vercel 프로덕션 배포 완료.
- **v1.14 (2026-10-18)**: 이미지 시간 초과 안내를 Google 사용량 확인으로 정정.
- **v1.13 (2026-10-18)**: 이미지 시간 초과 자동 재시도 중단 (이중 과금 방지).
- **v1.12 (2026-10-17)**: 이미지 생성 시간 초과 안내 문구 통일.
- **v1.11 (2026-10-17)**: 이미지 생성 호출 및 모델 목록을 공용 기준 코드 사본으로 위임.
- **v1.10 (2026-10-17)**: 나노바나나 최신 모델(`gemini-nano-banana-2.1`) 반영.
- **v1.09 (2026-10-16)**: DB 연동 변수 호환 (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 등).
- **v1.08 (2026-10-15)**: AI 지시문에 한국 시간(KST) 현재 연·월 기준 반영.
- **v1.07 ~ v1.04**: 핸드폰 번호 필수 정책, 사이드바 슬림화 및 컴팩트화 작업.

---

## 5. 남아 있는 추가 프로그램 및 디자인 작업 대기 내용
- 상세 내용은 `docs/IMPROVEMENT_BACKLOG.md` 참고.
  1. 감성 배경음악(BGM)을 얹어 15초 MP4 쇼츠/릴스 동영상으로 렌더링하는 WebCodecs 모듈 검토
  2. 사용자가 소장한 캘리그라피 서명(낙관/도장) PNG 이미지 오버레이 기능
  3. 날짜, 닉네임, 출처 등 커스텀 서브 텍스트 메타데이터 블록 추가

---

## 6. 기존 다른 프로그램과의 연계 / 기능 병합 제안 및 기능 보완·확장 아이디어
- **`suno-music-studio` (Suno 음악기획)와의 연계**: 감성 글귀에서 추출된 시적 가사를 Suno 음악 기획으로 1클릭 전송하여 어쿠스틱 발라드나 Lo-Fi 인디 음악으로 자동 작곡.
- **`threads-content-ops` (스레드 바이럴 스튜디오)와의 연계**: 완성된 감성 글귀 카드를 스레드 텍스트 본문과 함께 1클릭으로 포스팅하는 SNS 파이프라인 결합.
- **`ai-image-studio` (AI 이미지 자동화)와의 연계**: 이미지 스튜디오에서 생성한 일러스트 엽서나 풍경화를 글귀 이미지의 배경으로 직접 불러오는 에셋 공유 연계.

---

## 7. 사용자 편의성 증대를 위한 디자인 UI개선안과 레이아웃/테마/스타일 변경 제안
- **캘리그라피 낙관(도장) 스탬프 UI**: 우측 하단이나 문구 끝에 붉은색 전각 도장 스타일의 낙관을 찍을 수 있는 그래픽 위젯 제공.
- **한지 텍스처(Hanji Paper Overlay) 효과 토글**: 캔버스 위에 실제 전통 한지나 거친 종이 질감을 입힐 수 있는 텍스처 필터 레이어 추가.
- **글귀 책갈피(보관함) 갤러리**: 마음에 드는 글귀 카드들을 브라우저 로컬 저장소에 책갈피처럼 모아보고 슬라이드로 넘겨보는 미니 북 갤러리 뷰.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-22 v1.17 — 「인스타에 올리기」 → INSTA 포스팅 새 글 (Claude Code 윈도우, 이미지 재비교 L6)
- `QuoteCanvas.tsx` [JPG 저장] 옆 버튼: 완성 이미지를 JPG로 만들어 브라우저에서 **INSTA 「직접 첨부」와 같은 위치**(공개 버킷 `insta-post-images/<본인 ID>/<uuid>.jpg`, 버킷 RLS가 본인 폴더만 허용)에 올린 뒤 `https://auto-instagram-posting.buylife.xyz/posts/new?imageUrl=&caption=<글귀>&postType=feed`를 새 창으로 엶. 새 버킷·DB 변경·서버 경로 없음(처음 계획한 임시 버킷 대신 기존 위치 재사용).
- 인스타 피드 비율(4:5~1.91:1) 때문에 **1:1에서만** 누를 수 있음 — 9:16·3:4는 「1:1로 바꿔 주세요」 안내. 주소 함수 `src/lib/instaHandoff.ts`.
- 검수: tsc 0, 시험 22개(새 `tests/instaHandoff.test.mjs`), build, 배포 `emotion-writer-rgtkgnhhg` Ready, DB v1.17. 받는 쪽은 시험 그림으로 크롬 확인(아래 INSTA v1.47). 버튼에서 실제 업로드는 글귀·배경 생성이 필요해 이번엔 생략 — INSTA 직접 첨부(`uploadImageDirect`)와 같은 업로드 방식.
- 알아 둘 점: 보낸 뒤 INSTA에서 게시하지 않으면 이미지가 버킷에 남음(INSTA 직접 첨부와 같은 동작) — INSTA 쪽 미사용 첨부 정리는 별도 검토 후보.

## 2026-10-22 v1.18 — 「📐 다른 크기로 받기」 (Claude Code 윈도우, 이미지 재비교 F1·D-62-03)
- 완성 화면에 채널 크기 버튼 5개: 인스타 1:1(1080×1080)·4:5(1080×1350)·스토리/릴스 9:16(1080×1920)·3:4(1080×1440)·가로 공유 1.91:1(1200×628). 같은 글귀·배경·디자인을 AI 재호출 없이 다시 그려 JPG로 저장(`src/lib/studio/channels.ts`, `render.ts`의 새 `renderQuoteAt` — 기존 `renderQuote`도 이것을 씀). 배경은 꽉 채워 자르고 글귀는 높이 70% 안으로 자동 축소(기존 `drawQuote`).
- 검수: 시험 24개(새 `tests/channels.test.mjs`), build, 배포 Ready, DB v1.18.

## 2026-10-22 v1.19 — Pixabay 사진 검색 결과가 0장이던 버그 수정 (Claude Code 윈도우, F1 검수 중 발견)
- 원인: Pixabay가 큰·중간 이미지 주소를 `pixabay.com/get/<토큰>.jpg`로 주도록 바뀌었는데 `allowedPhotoUrl`이 `cdn.pixabay.com/photo/`만 허용 → 검색 결과 12장이 모두 걸러져 「검색 결과가 없습니다」(Pixabay 배경 기능 전체가 멈춘 상태). 실제 API 응답·내려받기(200 JPEG)로 확인.
- 수정: `src/lib/studio/validation.ts`에 `pixabay.com` + `/get/` 경로 허용 추가(사칭 호스트·포트·인증정보 거부 검사는 그대로, `tests/studio.test.mjs`에 허용·거부 사례 추가). 배포 `emotion-writer-on94quxjg` Ready, DB v1.19.
- 크롬(시험 회원, AI 비용 0): 글귀 직접 입력 → Pixabay 검색 12장 → 배경 선택 → 완성 → 「인스타 세로 4:5」·「가로 1.91:1」 결과 1080×1350·1200×628 JPG 생성 확인(다운로드는 페이지 안에서 가로채 실제 저장 안 함).

## 2026-10-22 v1.20 — 그라데이션 글로우 버튼(로즈) 이식 (Claude Code 윈도우)
- 바나나 캔버스 v1.21에서 반응이 좋은 버튼 방식(그라데이션 + 안쪽 하이라이트 + 색 번짐 그림자, 호버 1px 뜸)만 감성 캘리그라피 로즈 색으로 이식. 템플릿(포커스 스튜디오 — 감성 캘리그라피 에디션)·바탕·레이아웃은 그대로. `globals.css` 맨 끝 v1.20 블록만 추가, 기능 변경 없음.
- 대비: 로즈 실행 버튼 흰 글자 4.7~8.0:1, 선택 버튼 7.8:1. 시험 24개·build, 배포 `emotion-writer-nztznn9dn` Ready, DB v1.20, 크롬 화면 확인.

## 2026-10-22 v1.21 — 「다른 크기로 받기」 규격을 이미지 변환 스튜디오와 통일 (Claude Code 윈도우)
- `lib/studio/channels.ts`: id·이름·숫자를 변환 스튜디오 게시처 규격과 같게(insta-feed·insta-portrait·story·youtube-thumb·share-og). 가로 공유 1200×628 → 1200×630, 유튜브 썸네일 1280×720 추가, 세로 3:4는 유지(6종). 시험 기대값 갱신 + 통일 시험 추가(25개).
- 배포 `emotion-writer-am8h4mdjz` Ready, DB v1.21. 크롬: 운영 화면이 불러온 스크립트에 새 규격 포함·옛 이름 없음 확인(버튼은 글귀 완성 후 표시 — 실제 다운로드는 v1.18 검수 방식과 같아 이번엔 생략).

## 2026-10-22 v1.22 — 크기 버튼 비율 아이콘 · 공용 기준 코드 post-presets 사본 사용 (Claude Code 윈도우)
- 「다른 크기로 받기」 버튼마다 실제 비율대로 그린 작은 상자(긴 변 16px, `aria-hidden`). 크기 목록은 공용 사본 `src/lib/studio/postPresets.ts`에서 만들고 세로 3:4만 더함(기준 `image-convert-studio/src/lib/imageTools/postPresets.ts` — 사본 직접 수정 금지, `--sync`).
- 배포 `emotion-writer-bt1lbzk7v` Ready, DB v1.22, 시험 26개. 크롬(시험 회원, AI 비용 없음): 글귀 직접 입력 + Pixabay 「nature」 12장 → 완성 화면에서 아이콘 6개 크기(16×16·13×16·9×16·12×16·16×9·16×8) 확인.
- 검수 메모: 검색칸에 기본값 「nature」가 이미 있어 자동 입력 시 「naturenature」→ 0건(앱 문제 아님, 칸을 비우고 입력할 것).

## v1.23 (2026-10-22, Claude Code 윈도우) — 사진 검색칸 기본값을 안내 문구로
- 검색칸에 들어 있던 기본값 「nature」를 빼고 안내 문구(`예: nature, sunrise, flowers (비워 두면 nature)`)로만 보여 줌. 회원이 기본값 뒤에 덧붙여 써서 「naturenature」처럼 결과 0장이 되던 일을 막음. 비운 채 검색하면 `DEFAULT_PHOTO_QUERY`("nature")로 검색(버튼도 빈칸에서 눌림). `src/components/Workspace.tsx`.
- 시험 26개·tsc·build 통과, 배포 `emotion-writer-qoo9xbcto` Ready, DB v1.23. 크롬 검수: 운영 화면 v1.23 표시, 검색칸 값 빈칸·안내 문구 확인, 빈칸 검색 → 본인 Pixabay 무료 키로 사진 12장(비용 없음). 화면 캡처는 확장 오류로 실패해 JS 측정으로 대신함.

## ⏸ 미배포 (2026-10-22, Claude Code 윈도우) — 「다른 크기로 받기」 전체 ZIP (다음 배포 때 v1.24)
- 주인님 지시로 코드만 반영하고 배포는 보류. 「다른 크기로 받기」 줄 끝에 「📦 전체 6가지 ZIP 1개로」 버튼: 6가지 크기를 차례로 다시 그려 JPG로 만든 뒤 ZIP 하나로 저장(AI 호출 없음). ZIP은 공용 기준 코드 `store-zip` 사본 `src/lib/studio/zip.ts`(기준 `portrait-photo/src/lib/portrait/zip.ts`). 이름은 `channelZipNames()`. 시험 1개 추가(전체 27개)·tsc·build 통과. 배포 후 크롬에서 다운로드를 가로채 ZIP 파일 수 확인할 것.

## ⏸ 미배포 (2026-10-22, Claude Code 윈도우) — 배경 어둡기 추천 (다음 배포 때 v1.24, 다른 크기 ZIP과 함께)
- 주인님 지시로 코드만 반영하고 배포는 보류. 배경 사진에서 글자 구역(위 12~45%·가운데 30~70%·아래 55~88%, 가로 9~91%)의 평균 색을 검은 막 씌우기 전 기준으로 재서(`src/components/useBandColor.ts`, 결과 크기 1/10로 꽉 채워 그림), 글자색과의 대비(WCAG)를 「배경 어둡기」 슬라이더 아래에 표시: 4.5:1 이상이면 초록 「✓ 잘 읽힙니다」, 모자라면 주황 「배경 어둡기 N% 추천 [적용]」(5% 단위, 최대 75), 글자색이 어두우면 「글자색을 밝게」, 가장 어둡게 해도 모자라면 「글자 위치나 사진을 바꿔 보세요」. 계산 `src/lib/studio/readability.ts`(`adviseOverlay`·`contrastRatio`·`darken`·`textBand`), 시험 `tests/readability.test.mjs`(3개, 전체 30개). CSS `.status-note.good`(7.3:1)·`.warning`(6.8:1). 글자 그림자는 계산에 넣지 않은 보수적 기준.
- 바나나 캔버스는 밝기·어둡기 조절 설정이 없어 이번 제안(배경 밝기 추천)은 적용하지 않음.
- tsc·build 통과. 화면 확인은 배포 후.
- (같은 미배포 v1.24에 추가) **「다른 크기로 받기」 크기별 대비 ⚠**: 6가지 크기마다 배경을 그 비율로 잘라(사진은 한 번만 읽음) 글자 구역 대비를 따로 계산, 4.5:1 미만 크기 버튼에 ⚠와 「글자 대비 N:1 — 배경 어둡기를 올려 보세요」 툴팁, 하나라도 있으면 아래 안내 줄(amber-700, 크림 배경 대비 4.9:1). `useBandColor.ts`를 `bandColorOf` + `useBandColors`(여러 크기)로 정리, 기존 `useBandColor`는 그 위에서 동작. tsc·시험 30개·build 통과.
- (같은 미배포 v1.24에 추가) **전체 ZIP 전 대비 확인**: 「📦 전체 ZIP」을 누를 때 대비 부족 크기가 있으면 화면 안 주황 안내(role=alert)로 「⚠ N가지 크기는 글자가 잘 안 보일 수 있습니다 — [그대로 받기] [어둡기 N%로 올리고 받기] [취소]」. 올리고 받기는 부족한 크기들의 추천값 중 최댓값으로 **ZIP만** 다시 그리고 화면 설정은 그대로(완료 안내에 명시), 어둡게 해도 안 되는 크기뿐이면 그 버튼은 숨김. `zipOverlayPlan`(`readability.ts`). 시험 31개·tsc·build 통과.
- (같은 미배포 v1.24에 추가) **글자 자리 바꿔 받기**: 크기마다 위·가운데·아래 세 자리 배경색을 사진 한 번 읽어 구하고(`useBandGrid`), 대비가 부족한 크기 중 다른 자리가 더 좋은 크기만 그 자리로 글자를 옮겨 ZIP을 그림. 전체 ZIP 확인 안내에 「글자 자리 바꿔 받기(N가지)」, 완료 안내에 옮긴 크기·자리 표시, 화면 설정은 그대로. `bestPosition`·`POSITIONS`(`readability.ts`). 시험 32개·tsc·build 통과.
- (같은 미배포 v1.24에 추가) **자리 옮기고 어둡기도 올리고 받기**: 전체 ZIP 확인 안내에 버튼 추가 — 대비 부족 크기마다 가장 좋은 자리로 옮기고, 그래도 4.5:1 미만이면 그 크기만 필요한 어둡기(5% 단위, 최대 75%)로 ZIP을 그림(화면 설정 그대로, 완료 안내에 크기별 「아래로 · 어둡기 55%」 표시). `fixPlan`(`readability.ts`), ZIP 함수가 크기별 자리·어둡기를 함께 받도록 넓힘.
- (같은 미배포 v1.24에 추가) **바나나에서 배경 만들기**: 미리보기 아래 「🍌 이 글귀 분위기의 배경을 바나나 캔버스에서 만들기」 — 「글자 없이, 이 글귀의 분위기를 담은 감성 배경 이미지: (글귀)」를 바나나 `/studio?idea=`로(600자 이하만, 자동 생성 없음). `src/lib/studio/bananaLink.ts`, 시험 `tests/bananaLink.test.mjs`. 바나나 `?idea=` 받기가 함께 배포돼야 동작. 시험 34개·tsc·build 통과.

## ✅ v1.24 배포 (2026-10-22, Claude Code 윈도우)
- 위 「⏸ 미배포」 v1.24 항목들(전체 크기 ZIP·배경 어둡기 추천·크기별 대비·ZIP 전 확인·자리 바꿔/어둡기 받기·바나나 배경 만들기)이 이 버전으로 나감. **새로 추가**: 바나나 주소는 공용 사본 `src/lib/studio/bananaIdeaLink.ts`(기준 스타일 분석기, 직접 고치지 않음)로 만들고 `src=emotion-writer`를 붙임 — 「글자 없이…」 문구는 이 프로그램 `bananaLink.ts`. 시험 34개. 크롬: 운영 화면 v1.24, 묶음 파일에 `&src=`·`emotion-writer` 포함 확인(🍌 링크 클릭은 글귀 생성 AI 비용이 들어 생략).
- 배포 묶음(2026-10-22, Claude Code 윈도우): 바나나 v1.24 → 스타일 분석기 v1.35 → 감성 글귀 v1.24 → 리버스 프롬프트 v1.12 → 변환 스튜디오 v1.18 → 인물사진 v1.37 → 4컷 v1.30 순차 배포(빌드 7회, 실패 0), DB `programs.version` 갱신, 크롬에서 화면 버전 확인.

## ✅ v1.25 배포 (2026-10-22, Claude Code 윈도우) — 이미지 스튜디오에서 만들기
- 미리보기 아래 「🍌 이 글귀 분위기의 배경을 바나나 캔버스에서 만들기」 옆에 「🎨 이미지 스튜디오에서 만들기」(`data-image-studio-bg`). 같은 「글자 없이…」 문구(`quoteBackgroundIdea`)를 `imageStudioBackgroundLink`(`src/lib/studio/bananaLink.ts`)가 공용 사본의 `imageStudioLink(…, "emotion-writer")`로 만든다(6000자 이하, 자동 생성 없음). 이미지 스튜디오가 「감성 글귀에서 보낸 프롬프트」·돌아가기·생성 기록에 씀.
- 같은 배포로 공용 사본 `bananaIdeaLink.ts`의 `BANANA_SOURCES`·`imageStudioLink` 추가분도 나감. 시험 35개, tsc·빌드. 크롬: 운영 화면 v1.25, 묶음 파일에 주소·`emotion-writer`·문구 포함(링크 클릭은 글귀 생성 AI 비용이 들어 생략).

### 2026-10-23 🟡 미배포 대기 (운영 v1.25 그대로) — 사진 검색을 공용 기준 코드 `free-photo-search` 사본으로 (Claude Code 윈도우, 커밋 `428fcdfc3`)
- `src/lib/studio/photoSearch.ts`(사본, 직접 고치지 않음 — 기준 INSTA `src/lib/cardnews/photoSearch.ts` 수정 후 `--sync`). 상세 `docs/IMPROVEMENTS.md` 맨 위. 비용 없음.

## 2026-10-23 v1.26 — 사진 검색 「🔤 영어로」(공용 사전) + 「한국어로 다시 찾기」 (Claude Code 윈도우)
- 6단계 배경 사진 검색칸 옆 「🔤 영어로」: 검색어(비어 있으면 5단계 글귀)를 공용 기준 코드 `photo-keywords` 사본 `src/lib/studio/photoKeywords.ts`(기준 `threads/src/lib/photoKeywords.ts`, 직접 고치지 말 것)로 영어 단어로 바꿈(AI 없음). 영어 결과가 0장이면 「한국어로 다시 찾기」(한글이 있을 때만). `Workspace.tsx` `toEnglish`·`search(override)`.
- 함께 나감: 사진 검색·받기 공용 `free-photo-search` 사본 전환(`428fcdfc3`, 동작 같음).
- 검수: 공용 코드 일치, tsc 0, `npm test` 35, 로컬 build, 배포 `emotion-writer-qg9gjgkjq` Ready, DB v1.26. 크롬: 메뉴 v1.26, 「아침 커피」→ morning coffee, 버튼 위치 확인(실제 검색은 안 함).
- 비용: Vercel 빌드 1회(제안 범위).

