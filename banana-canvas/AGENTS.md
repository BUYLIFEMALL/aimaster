# AI 바나나 캔버스 자동화 (`banana-canvas`) — AI 에이전트 인수인계 지침

> **공식 서비스 URL**: https://banana-canvas.buylife.xyz  
> **공식 디자인 템플릿**: **크리에이티브 아틀리에 스타일 — 바나나 팝 차콜 변형 (Creative Atelier Style — Banana Pop Charcoal Edition)**  
> **현재 버전**: `v1.11` (2026-10-19 깨진 사진은 서버에 올리기 전에 안내)  
> **담당 CLI**: Antigravity (윈도우)

---

## 1. 프로그램의 사용 목적 및 대상
- **사용 목적**: 단 한 장의 사진 또는 텍스트 아이디어만으로 고화질 이미지 생성, 정밀 편집(복원/컬러화/업스케일), 멀티 소스 합성, 배경 제거(누끼), 부분 수정(인페인팅), 증명사진, 3D 평면도 렌더링, 8컷 연속 스토리 및 요리 레시피 카드까지 브라우저 한 화면에서 완결 짓는 올인원 이미지 창작 작업실.
- **대상 사용자**: 
  - SNS 마케터, 유튜브/블로그 크리에이터, 웹툰/스토리 작가, 디자이너.
  - 포토샵 등 무거운 소프트웨어 없이 브라우저에서 원클릭으로 고급 사진 편집과 AI 일러스트 합성을 원하는 일반 회원.

---

## 2. 개발 도구 및 기술 스택
- **프레임워크**: Next.js 16.4.0 (Turbopack, App Router, React 19).
- **언어 및 런타임**: TypeScript 5, Node.js v24.
- **스타일링**: CSS Variables 기반 단일 토큰 테마 시스템 (바나나 팝 차콜 팔레트, 제로 런타임 CSS 덮어쓰기 기법).
- **이미지 프로세싱**: Sharp (서버단 Lanczos3 업스케일, 가장자리 기반 지능형 ChromaKey 크로마키 투명 알파 추출).
- **AI 엔진**: Google Gemini / Nano Banana (`gemini-nano-banana-2.1`, `gemini-3-pro-image`, `gemini-2.5-flash`).
- **데이터베이스 & 스토리지**: Supabase Database (`banana_canvas_results`, RLS 적용), Supabase Private Storage (`banana-canvas-files`).
- **배포 환경**: Vercel Serverless Functions (`--scope buylife`, maxDuration 300초).
- **검수 환경**: Microsoft Edge 전용 포그라운드 자동화 실세션 검수 (Playwright).

---

## 3. 핵심 기능, 시스템 아키텍처, 장단점

### 1) 핵심 기능
1. **한 화면 3열 대시보드 (`/studio`)**:
   - 1열: 원본 이미지 업로드 (JPG/PNG/WEBP 15MB 이하), AI 신규 이미지 생성, 빠른 작업(배경 제거/인페인팅/증명사진/3D 평면도), 8컷 연속 스토리/레시피 카드.
   - 2열: 정밀 이미지 편집(복원·컬러화·채색·업스케일 + 20종 프리미엄 스타일 프리셋), 5장 멀티 소스 합성, 인생 앨범 콜라주, 3개 언어 만화 패널.
   - 3열: 화면 우측 상단 고정 결과 뷰어 (실시간 고해상도 프리뷰, 확대경 모달, 1클릭 다운로드, "이 결과로 계속 편집" 연결).
2. **빠른 작업 지도 칩 띠 (`.bc-nav-chips`)**:
   - 상단 원터치 앵커 칩(🖼️ 원본 · ✨ 생성 · ⚡ 빠른 작업 · 🎞️ 스토리 · 🛠️ 편집 · 🧩 합성 · 📖 인생 앨범 · 💬 만화 패널 · 🌟 결과).
3. **비주얼 연동 & 사용 매뉴얼 (`/guide`)**:
   - 바나나 캐릭터 배지와 친근한 말풍선 히어로 배너, 3단계 워크플로우 비주얼, 20종 스타일 프리셋 칩, FAQ 6종 아코디언.
4. **결과 기록 보관소 (`/history`)**:
   - 최근 작업 30건 회원별 독립 격리 보관 및 즐겨찾기 보존.

### 2) 시스템 아키텍처
- `src/lib/bnc/`: 순수 비즈니스 로직 및 파라미터 유효성 검사 (`tasks`, `styles`, `prompts`, `paths`).
- `src/lib/gemini.ts` & `src/lib/geminiImage.ts`: 공용 기준 이미지 어댑터 사본 (`ai-image-studio` 기준 연동), 시간 제한(120s/280s) 엄수 및 이중 과금 방지(`retries: 0`).
- `src/lib/runner.ts`: 8컷 스토리 및 레시피 단계별 병렬/순차 안전 파이프라인.
- `src/lib/files.ts`: 회원별 격리 서명 URL(`isOwnPath`) 및 1시간 자동 만료 임시 저장소 관리.

### 3) 장점 및 단점
- **장점**:
  - 탭 전환 없는 단일 대시보드로 작업 생산성 극대화.
  - Sharp 기반 정밀 크로마키로 AI 마스크 실패 없는 깔끔한 투명 배경 PNG 생성.
  - "이 결과로 계속 편집" 워크플로우로 생성 ➔ 편집 ➔ 합성 무한 루프 가능.
  - 100% 개인 회원 본인 API 키 사용 원칙으로 운영 비용 제로화.
- **단점**:
  - 8컷 연속 스토리 생성 시 Vercel 300초 제한에 근접할 수 있어 네트워크 상태에 민감.
  - 브라우저 온디바이스 캔버스가 아닌 서버 API 중심 렌더링이므로 키 발급이 필수적임.

---

## 4. 현재 버전 및 변경 히스토리

- **v1.11 (2026-10-19, Claude Code 윈도우)** — 깨진 사진을 서버에 올리기 전에 막음:
  - 공용 부품 `image-file-check` 사본 `src/lib/imageFileCheck.ts`(+ `tests/imageFileCheck.test.mjs`) — **직접 고치지 말 것**, 기준 `portrait-photo/src/lib/imageFileCheck.ts` 수정 후 `node scripts/check-shared-modules.mjs --sync`.
  - `uploadFile`이 서명 주소 요청 전에 `checkImageFile` → 깨졌으면 「사진을 읽지 못했어요…」, 서버 업로드 0회(전에는 올린 뒤 AI 단계에서야 실패). 원본·합성 소스·마스크 모두 같은 함수.
  - 검수: 브라우저 20/20(깨진 사진 → 안내·업로드 호출 없음 검사 추가), 단위 12/12, tsc, 빌드, Vercel READY(`banana-canvas-edcuyhw2f`), DB v1.11, 운영 실측(업로드 호출 0회·안내 표시·업로드 영역 유지). AI 비용 없음.
- **v1.10 (2026-10-19, Claude Code 윈도우)** — v1.09 보고의 추가개선 제안 1·2:
  - **업로드 대기 해제**: `pickBase`·`addSource`를 `try/finally`로 감싸고, `uploadFile`의 저장소 업로드(`uploadToSignedUrl`)·클라이언트 생성 예외를 잡아 오류 안내로 바꿈 → 예외가 나도 「업로드 중…」에 멈추지 않음(이 멈춤은 v1.09 작업 중 테스트 설정 누락으로 실제 재현됐던 상황). 마스크 업로드도 같은 함수라 함께 보호.
  - **꺼진 노란 버튼 색 통일**: 잠김 카드 규칙(`.bc-card.locked>*` 투명도 0.55)이 앨범·만화 카드에서는 버튼 자신에 걸려 꺼짐 투명도(0.45)를 덮어써 밝게(0.55) 보였고, 편집·합성은 겹쳐서 0.25였음 → `.primary:disabled`를 꺼진 색(`--card2` 배경·`--muted` 글자·그림자 없음)으로 그려 카드와 상관없이 같게.
  - 검수: 브라우저 19/19(새 검사: 꺼진 버튼 같은 색, 저장소 연결 끊김 시 안내 후 업로드 영역 복귀), 단위 7/7, tsc, 빌드, Vercel READY(`banana-canvas-iziylqinj`), DB v1.10, 메인 크롬 운영: 꺼진 버튼 5개 모두 `rgb(42,38,29)`, 앨범·만화 카드 화면 확인. AI 비용 없음.
- **v1.09 (2026-10-19, Claude Code 윈도우)** — 브라우저 테스트 실패 판정:
  - **테스트 설정 낡음**: 2026-10-16 공용 변수 호환(`b3d5fc92`) 뒤 브라우저 클라이언트가 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 먼저 읽는데, `tests/browser.mjs`의 esbuild `define`에 이 이름이 없어 테스트 화면에서만 `process` 미정의 오류 → 「업로드 중…」에서 멈춤. 운영은 Next가 값을 채우므로 정상. `define`에 추가.
  - **실제 화면 문제(수정)**: [빠른 작업]의 「부분 삭제」를 누르면 편집기가 맨 위 원본 카드 안에 열려 화면 밖이라 아무 반응이 없어 보임(테스트 붓질도 빗나감) → `MaskEditor.tsx`가 열릴 때 `scrollIntoView({ block: "center" })`.
  - 검수: 브라우저 17/17(크롬 포그라운드, 모의 API), 단위 7/7, tsc, 빌드, Vercel READY(`banana-canvas-mti7b3pl2`), DB v1.09, 메인 크롬 운영 화면 v1.09. AI 비용 없음.
- **v1.08 (2026-10-18, Antigravity 윈도우)**:
  - **공식 템플릿 리뉴얼**: **크리에이티브 아틀리에 스타일 — 바나나 팝 차콜 변형** 전면 적용.
  - 전 화면 따뜻한 차콜(`#16140f`) 및 바나나 옐로(`#ffd84d`), 잎사귀 그린(`#7ed38a`) 테마 통일.
  - 스튜디오 상단 **작업 지도 칩 띠**(`bc-nav-chips`) 및 카드별 `id` 앵커 네비게이션 신설.
  - 좌측 사이드바 🍌 브랜드 아이콘 테마화 및 `📖 연동 & 사용 매뉴얼` 메뉴명 표준화.
  - 비주얼 가이드북(`/guide`) 히어로 배너, 3단계 워크플로우 카드, 20종 스타일 칩 고도화.
  - 375px 모바일 56px 슬림 헤더 및 오버레이 메뉴 터치 최적화 (가로 넘침 0px 방어).
  - Vercel 프로덕션 배포 완료 (`https://banana-canvas.buylife.xyz`) 및 Microsoft Edge 포그라운드 실세션 검수 완료 (`headless: false`).
- **v1.07 (2026-10-18, Claude Code 윈도우)**:
  - 이미지 생성 호출부를 공용 기준 코드 사본(`ai-image-studio` 기준)으로 통합.
  - 마감 시간(deadline 280초) 검사 및 이중 과금 방지.
- **v1.06 (2026-10-17, Claude Code 윈도우)**:
  - 최신 정식 모델(`gemini-nano-banana-2.1`, `gemini-3-pro-image`) 교체.
- **v1.05 (2026-10-16, Codex)**:
  - Supabase DB 연동 변수 호환성 강화 (`PUBLISHABLE_KEY`, `SECRET_KEY`).
- **v1.04 (2026-10-14, Claude Code)**:
  - 모바일 767px 셸 접는 메뉴 CSS 추가.
- **v1.00 ~ v1.03**:
  - 초기 Banana Canvas 3열 대시보드 런칭 및 기능 구현.

---

## 5. 작업 대기 백로그
상세 목록은 [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md)를 참조하십시오.
- [ ] 8컷 스토리 컷별 프롬프트 개별 수정 및 재생성(Regenerate) 버튼 지원.
- [ ] 부분 삭제(Inpaint) 브러시 크기 단축키(`[` / `]`) 및 되돌리기(Undo/Redo) 단축키 추가.
- [ ] 다크/라이트 테마 토글 스위처 검토.

---

## 6. 타 프로그램 연계 및 기능 병합 제안
1. **`ai-image-studio` (AI 이미지 자동화, https://ai-image-studio.buylife.xyz)**:
   - 이미지 자동화에서 생성된 고화질 결과물을 바나나 캔버스의 원본으로 1클릭 전송하여 바로 부분 삭제 및 합성을 이어가는 워크플로우.
2. **`four-cut-comics` (AI 4컷 만화 자동화, https://four-cut-comics.buylife.xyz)**:
   - 만화 패널 기능에서 생성된 컷들을 4컷 만화 스튜디오로 전송하여 4컷 만화 템플릿 프레임에 자동 배치.
3. **`portrait-photo` (AI 인물사진 자동화, https://portrait-photo.buylife.xyz)**:
   - 증명사진/프로필 사진 생성 후 바나나 캔버스에서 정밀 인페인팅 및 스타일 변환 연계.

---

## 7. UI/UX 개선 및 디자인 고도화 제안
1. **드래그 앤 드롭 캔버스 뷰어**: 결과 이미지 3열 카드에서 캔버스로의 줌/패닝 제스처 지원.
2. **사이드바 워크플로우 칩 실시간 진행 상태 표시**: 현재 업로드된 이미지 및 결과 유무에 따라 사이드바 1·2·3단계 뱃지에 체크(✓) 아이콘 동적 활성화.
3. **모바일 하단 플로팅 퀵 액션 바**: 모바일에서 결과 카드로 한 번에 스크롤되는 플로팅 버튼 제공.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->
