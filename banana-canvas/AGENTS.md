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

## 2026-10-21 v1.12 — 이미지 병합 A: AI 포토 리메이크 → 바나나 캔버스 (Claude Code 윈도우)
- 근거: [이미지 카테고리 병합 분석](../docs/analysis-image-consolidation-20261021/REPORT.md) 묶음 A(주인님 결정). 옛 앱 `photo-remake-studio`(v1.10)의 고유 기능을 옮김.
- **옛 사진 복원**(새 작업 `restore`): 손상 복원·흑백 컬러화 선택, 기본/실제 2배/4배 확대(기존 sharp `upscale`, 긴 변 8192px), 원본 비율 유지(구도 그대로) 또는 비율 확장, 추가 요청. 프롬프트는 포토 리메이크의 보존 복원 지시를 `restorePrompt`(src/lib/bnc/prompts.ts)로 옮김.
- **합성**: 소스별 지시(최대 5개, `sourceNotes`)와 배경 처리(`background`: 자동=기존 동작/원본 유지/변경). 지시가 비어 있고 배경이 자동이면 프롬프트는 기존과 똑같음(시험으로 확인). 프롬프트 제안 API에도 반영.
- **원본·완성 비교 슬라이더**(`Compare`): 원본이 있는 단일 결과에서 이미지 자리에 비교 화면을 보여 줌(모든 작업 공통).
- DB 변경 없음(`banana_canvas_results.kind`에 제한 없음, options에 새 값 기록). 매뉴얼 `/guide`에 옛 사진 복원·합성 지시 설명 추가.
- 검수: tsc·`npm test` 14개(새 시험 2개)·build, 배포 Ready, 크롬 일반 회원으로 흑백 시험 사진 업로드 → 옛 사진 복원(2배) **실제 1회**(`gemini-3.1-flash-lite-image`, 시험 계정 본인 키, 결과 2390×1792) → 비교 슬라이더 동작 확인. 합성 실제 호출은 하지 않음(같은 실행 경로, 시험으로 프롬프트 확인).
- DB(같은 묶음, 백업 `docs/analysis-image-consolidation-20261021/backup-programs-before-merge-A.json`): **FREE 배지 해제**(주인님 결정 「일반으로 돌려」 — 이제 권한 있는 회원만 사용, 일반 회원 시험 계정은 접근 확인), `version=v1.12`, 상세 설명·특징 카드에 옛 사진 복원·소스별 지시·비교 슬라이더 반영(480자). 포토 리메이크 권한 회원 148명은 모두 이미 이 앱 권한을 같거나 긴 기간으로 보유해 추가 부여 없음. 기록 `supabase/migrations/20261021_v1_12_merge_photo_remake.sql`.

## 2026-10-21 v1.13 — 이미지 병합 B: AI 올인원 그래픽 → 바나나 캔버스 「📐 템플릿 그래픽」 (Claude Code 윈도우)
- 근거: [이미지 카테고리 병합 분석](../docs/analysis-image-consolidation-20261021/REPORT.md) 묶음 B(주인님 결정). 옛 앱 `allinone-graphic`(v1.08)의 고유 기능을 옮김.
- **템플릿 그래픽**(새 작업 `graphic`, 카드 `src/components/studio/GraphicCard.tsx`): 19개 직군 123종 템플릿(데이터 `src/lib/bnc/graphicTemplates.ts` — 원본에서 옮겨 이제 이곳이 기준), 직군 필터·검색, 칸 입력(선택지 칸 포함), 화풍 11종, 이미지 안 글자 언어, 종횡비, 해상도 1K/2K/4K(정밀 모델만 — `imageModel`에 `imageSize`, 빠른 lite 모델은 1K 고정), 원본 이미지가 있으면 참고 이미지(인물·제품 유지/분위기만). **프롬프트는 서버가 조립**(`graphicPrompt`: 템플릿에 있는 칸·목록의 화풍/언어만 받음, 당해 연도·한국인 기본 규칙 추가).
- **기획서·메모로 칸 자동 입력**(`/api/graphic-fill`): 원래 앱은 이 API에 프로그램 권한 검사가 없었고 PDF를 글자로 읽어 내용이 깨졌다 → `guardAi`(권한·본인 키) + .txt·.md·.json·.csv·메모만, 칸 목록은 서버 템플릿, 돌려주는 값도 그 칸·선택지만.
- **비율 확장**(새 작업 `expand`, 빠른 작업): 원본을 그대로 두고 주변만 그려 16:9·9:16·1:1·4:3·3:4로. **부분 수정**: 빠른 작업의 「부분 수정 지시」를 적고 칠하면 그 자리를 바꾸거나 추가(`inpaintEditPrompt`, 올인원 인페인팅 지시), 비우면 기존 「부분 삭제」 그대로.
- DB 변경 없음. 매뉴얼 `/guide`에 두 설명 추가. 결과는 기존 기록(30건)·비교 슬라이더를 그대로 씀(올인원은 저장이 없어 새로고침하면 사라졌음).
- 검수: tsc·`npm test` 16개(새 시험 2개: 123종·입력 정리·서버 조립 / 비율 확장·부분 수정)·build, 배포 Ready, 크롬 일반 회원 「AI로 칸 채우기」 실제 1회(텍스트 모델, 메모 → 디바이스 Tablet·앱 종류 채움) + 「그래픽 만들기」 실제 1회(`gemini-3.1-flash-lite-image` 1K, 시험 계정 본인 키). 비율 확장·부분 수정 실제 호출은 하지 않음(같은 단일 이미지 경로, 시험으로 프롬프트 확인).
- DB(같은 묶음, 백업 `docs/analysis-image-consolidation-20261021/backup-programs-before-merge-B.json`): `version=v1.13`, 한 줄 요약(56자)·상세 설명(493자)·특징 카드 4번째(📐 템플릿·스페셜) 갱신. 올인원 그래픽 권한 회원 148명 모두 이 앱 권한 기존 보유 → 추가 없음. 기록 `supabase/migrations/20261021_v1_13_merge_allinone_graphic.sql`.

## 2026-10-21 v1.14 — 결과 30일 자동 삭제 + 바로가기 칩 묶음 + 다른 프로그램 연결 (Claude Code 윈도우)
- **30일 정리**: `src/app/api/cron/cleanup`(Vercel cron 매일 03:00 KST, `Bearer CRON_SECRET`·비밀값 비면 거부). 생성일 30일 지난 결과를 **즐겨찾기 포함** 삭제(회원 생성 데이터 30일 규칙) — 결과·남은 입력 파일 먼저 지우고 행 삭제. 30건 개수 제한(`api/run`)은 그대로. 기록 화면·매뉴얼 안내 문구 갱신. 환경변수 `CRON_SECRET` 추가(Production, Sensitive, 임의값).
- **바로가기 칩**: 「만들기(생성·템플릿 그래픽·스토리) / 고치기(원본·옛 사진 복원·편집·합성·빠른 작업) / 스페셜(인생 앨범·만화)」 묶음(`.bc-nav-group`).
- **연결**: 결과마다 「🔁 형식 바꾸기」 → 이미지 변환 스튜디오 `/convert?src=<서명 주소>`(새 창). AI 이미지 스튜디오의 「바나나 캔버스로 보내 편집」 → `/studio?import=<서명 주소>` → `api/import`가 **우리 Supabase 저장소 서명 주소 + 허용 버킷(`ai-image-generations`) + 본인 폴더**만 받아 본인 `in/` 폴더로 복사해 원본으로 넣음(임의 주소를 서버가 받지 않도록, 15MB·JPG/PNG/WEBP, 리다이렉트 금지).
- 검수: tsc·`npm test` 16개·build, 배포 Ready, DB v1.14, 정리 주소 비밀값 없음 401. 연결 버튼 화면 검수는 상대 프로그램 배포 후(아래 기록).
- 연결 검수(2026-10-21): 크롬(관리자 계정)으로 AI 이미지 스튜디오 갤러리 🍌 → `/studio?import=` → 원본으로 들어옴, 그 이미지 서명 주소로 이미지 변환 스튜디오 `/convert?src=` → 목록 자동 추가 확인. 결과 카드의 「형식 바꾸기」 버튼 자체는 결과가 있어야 보여 같은 주소 형식으로만 확인.

## 2026-10-22 v1.15 — 이미지 모델 목록을 공용 사본(기준 ai-image-studio)에서 가져오기 (Claude Code 윈도우, 이미지 재비교 W6)
- 새 `src/lib/imageModelChain.ts`: 모델 이름을 같은 폴더의 공용 사본 `nanoBananaModels.ts`(기준 `ai-image-studio/lib/providers/nanoBananaModels.ts`)에서 가져온다 — 예전엔 `gemini.ts`에 이름을 직접 적어 공용 사본을 쓰지 않았음(기준이 모델을 바꿔도 바나나는 그대로였을 것).
- 대체 순서: 빠른 등급 `[Lite(gemini-3.1-flash-lite-image), nano-banana-2.1]`(예전엔 Lite 실패 시 **Pro — 1장 $0.134, 4배 비쌈**), Pro 등급 `[gemini-3-pro-image, nano-banana-2.1]`(예전엔 Lite). 처음 시도하는 모델은 예전과 같음. 해상도(2K·4K)는 기준 표의 `sizes`로 판단(`supportsImageSize`, Lite는 1K만).
- 바꾸지 않은 것: 프롬프트·작업 종류·화면(이미지 규칙: 연동 부분만). `gemini.ts`는 `IMAGE_MODELS`를 그대로 다시 내보내 다른 코드 영향 없음.
- 백로그 「`ai-image-studio` 연동」 체크 보정(v1.14에서 `?import=`로 구현됨).
- 검수: tsc 0, 시험 19개(새 `tests/imageModelChain.test.mjs` 3개), 공용 사본 일치 OK, build, 배포 `banana-canvas-n47a6tz2m` Ready, DB v1.15, 크롬 v1.15·기록 API 200. 실제 이미지 생성 시험은 하지 않음(처음 모델 동일·대체 순서만 변경, 이미지 규칙상 오류 시에만 시험).

## 2026-10-22 v1.16 — AI 인물사진 받기 + 증명사진 「국가 규격은 AI 인물사진」 안내 (Claude Code 윈도우, 이미지 재비교 L4)
- `api/import` 허용 버킷에 `portrait-photo-files` 추가(본인 폴더·서명 주소·리다이렉트 금지 검사는 그대로), 오류 문구 일반화. 빠른 작업 카드 증명사진 버튼 아래 `.bc-hint`로 「여권·비자·운전면허 등 국가별 규격(21종)·머리 비율 검사는 AI 인물사진」 링크.
- 검수: 시험 20개(새 `tests/importRoute.test.mjs`), build, 배포 `banana-canvas-3qce9pbme` Ready, DB v1.16. 크롬(시험 회원): 인물사진 버킷 시험 그림(본인 폴더) `?import=` → 원본 이미지 320×240로 들어옴, 안내 문구 표시. 시험 그림·입력 사본 2장 삭제.

## 2026-10-22 v1.17 — 결과 「🎬 스토리보드로」 (Claude Code 윈도우, 이미지 재비교 L5)
- 결과 카드의 「🔁 형식 바꾸기」 옆에 `https://cinematic-storyboard-studio.buylife.xyz/studio?src=<결과 서명 주소>` 링크(`STORYBOARD_URL`). 받는 쪽 스토리보드 v1.11.
- 검수: 시험 20개, build, 배포 `banana-canvas-birc6egaz` Ready, DB v1.17. 받는 흐름은 시험 그림으로 크롬 확인.

## 2026-10-22 v1.18 — 「📌 내 작업 레시피」 + 「이 컷만 다시」 (Claude Code 윈도우, 이미지 재비교 F2)
- 레시피: 편집·옛 사진 복원·만화 패널 카드 설정을 이름 붙여 저장(DB `banana_canvas_presets`, 회원당 20개, 설정값이라 30일 삭제 대상 아님) → 다른 사진에서 불러오면 카드 값만 채움(실행은 회원이). 기록 상세에서 「이 설정을 레시피로 저장」도 가능.
- 컷 다시: 연속 스토리 컷·이미지 레시피 단계마다 「이 컷만 다시/이 단계만 다시」 → `api/run/recut`이 본인 키로 이미지 1장만 다시 그려 그 칸만 바꿈. 같은 기록의 동시 요청은 `busy_until` 선점으로 유료 생성 전에 409(이중 과금 방지). 새 스토리는 등장인물 설명(`options.storyCharacter`), 새 레시피는 단계 그림 지시(`options.stepPrompts`)를 남긴다.
- 파일: `lib/bnc/presets.ts`·`recut.ts`, `api/presets`, `api/run/recut`, `components/studio/PresetRow.tsx`, Studio·HistoryList, 시험 `tests/f2RecipeRecut.test.mjs`. 플랜 `docs/PLAN_20261022_F2_RECIPE_RECUT.md`.
- 검수: 시험 30개·build, 배포 `banana-canvas-bix8dl937` Ready, DB v1.18, 크롬 확인(409 안내·레시피 저장/불러오기/삭제). **실제 컷 다시 만들기 1장은 미확인**(시험 회원에 스토리 기록 없음).
- ⏸ 미배포 코드 수정: 기록 상세를 열 때 앞 기록의 오류 문장 지우기 + 상세 창 오류 글자색을 밝게(`HistoryList.tsx`) — 다음 배포 때 함께.

## 2026-10-22 v1.19 — 레시피를 「📐 템플릿 그래픽」까지 + 레시피 이름 바꾸기 (Claude Code 윈도우, F2 후속 제안)
- 템플릿 그래픽 카드 설정(템플릿·칸 값·화풍·언어·추가 요청·비율·해상도·원본 인물 유지)도 레시피로 저장·불러오기. 서버는 실행 경로와 같은 `graphicParams`(tasks.ts에서 export)로 목록에 있는 템플릿·화풍·언어, 그 템플릿에 있는 칸만 남긴다. 불러오면 직군·검색 필터를 풀고 템플릿·값을 채움(실행은 회원이). 기록 상세 「레시피로 저장」도 템플릿 그래픽 기록에서 동작.
- 레시피를 고르면 ✏️(이름 바꾸기)·✕(지우기). `PATCH /api/presets`(본인 레시피만).
- DB(`esgxyikcnnvmlhygjkth`): kind 제약에 'graphic' 추가, 본인 수정 RLS — `supabase/migrations/20261022_v1_19_presets_graphic_rename.sql`(크롬 SQL Editor 실행 성공).
- v1.18에서 미뤘던 기록 상세 오류 문장 초기화·글자색도 이번 배포에 포함.
- 검수: 시험 33개·build, 배포 `banana-canvas-j33vtzgdy` Ready, DB v1.19, 비로그인 PATCH 401, 크롬(시험 회원) 채널 아트/배너·칸 값·9:16 저장 → 새로 고침 → 불러오기 정확히 복원 → 이름 바꾸기(DB 반영) → 삭제(DB 0개).

## 2026-10-22 v1.20 — 디자인 리뉴얼 「나노바나나 크림 팝 스타일」(새 템플릿 11번) + 가독성 (Claude Code 윈도우)
- 주인님 지시로 다크 차콜(v1.08) → 연한 바나나 크림 바탕의 새 템플릿. `globals.css` 토큰·덮어쓰기 블록 교체, 화면 파일 직접 색 4곳을 토큰으로. 기능 코드 변경 없음. 토큰·규칙: `docs/DESIGN_HANDOFF.md` 맨 위, 플랜 `docs/PLAN_20261022_DESIGN_RENEWAL.md`, DESIGN.md 카탈로그 11번.
- 가독성: 본문 15px, 보조 글자 대비 7.4:1, 노란 바탕 노란 글씨 금지(`--brand-text`), 잠긴 카드 흐림 완화, 560px 이하 버튼 한 열.
- 배포 2회(`banana-canvas-kq3fva2jm` → 실화면 보정 `banana-canvas-birbfc0sb`) Ready, DB v1.20. 크롬 검수: 스튜디오·매뉴얼·API 설정, 휴대폰 폭은 390px 틀(iframe)로 규칙 확인(창 최대화로 실제 축소 불가).
- ⏸ 미배포: 초록 「스토리 8컷 생성」 버튼 흰 글자 대비 4.4 → `#256f2f`로 보정(다음 배포 때 함께).

## 2026-10-22 v1.21 — 그라데이션 글로우 버튼 · 어두운 로고 · 공식 로그인 탭 레이아웃 (Claude Code 윈도우)
- 주인님 지시(「버튼 가독성 높게, 촌스럽지 않게, 그라데이션 넣고 화려하게」, 「로고 배경 어둡게·노란 바나나 가독성」, 로그인 공식 레이아웃 제안 승인). `globals.css` 맨 끝 v1.21 블록, `components/auth/LoginForm.tsx`(탭·아이콘 입력칸, 로그인 처리 동일), `app/login/page.tsx`(격자 바탕·중앙 440px·로고). 회원가입 링크 `/signup` → `/register`.
- 배포 `banana-canvas-cbrkvf54l` → 로그인 입력칸 아이콘 겹침(CSS 우선순위) 수정 `banana-canvas-mj8dparu8` Ready, DB v1.21. 토큰·대비 수치: `docs/DESIGN_HANDOFF.md` 맨 위.
- ✅ v1.22 배포(2026-10-22, `banana-canvas-a2vcyybds`): 「🔁 형식 바꾸기」 링크에 결과 비율이 1:1·4:5·9:16·16:9(±3%)면 `&preset=` 붙임(변환 스튜디오 v1.13이 받음). 시험 33개, 운영 스크립트에 규격 코드 포함 확인(링크는 새 결과에만 나와 화면 확인 생략).
- ⏸ 미배포(2026-10-22): 형식 바꾸기 규격 고르기를 공용 사본 `src/lib/bnc/postPresets.ts`(`presetIdForSize`)로 교체(동작 같음). 다음 배포 때 함께.

## v1.23 (2026-10-22, Claude Code 윈도우) — 전후 비교 그림 위 끌기 + 공용 사본 2종 배포
- 원본↔완성 비교(`Compare`)에서 그림 위를 직접 누르거나 끌면 선이 그 자리로 옴(pointer capture, 손가락 가능, `.bc-compare` 커서 ew-resize·touch-action none). 기존 슬라이더 막대(키보드)는 그대로. 위치 계산은 새 공용 기준 코드 `compare-slider` 사본 `src/lib/bnc/compare.ts`(기준 `style-dna-analyzer/src/lib/dna/compare.ts`).
- 함께 나감: 보류였던 post-presets 사본 교체(형식 바꾸기 규격 고르기, 동작 같음).
- 시험 33개·tsc·build 통과, 배포 `banana-canvas-gkvishjrs` Ready, DB v1.23. 크롬: 운영 v1.23, 운영 CSS·스크립트에 끌기 코드 포함 확인. **비교 화면 자체는 실제 결과가 있어야 보여 화면 끌기 확인은 미완료** — 다음에 결과가 있을 때 확인.

## ⏸ 미배포 (2026-10-22, Claude Code 윈도우) — `/studio?idea=` 받기 (다음 배포 때 v1.24, compare-slider 사본 추가분과 함께)
- 주인님 지시로 코드만 반영하고 배포는 보류. 다른 프로그램(이미지 스타일 분석기 추세 회차 등)이 `/studio?idea=`로 보낸 글을 「이미지 생성」 아이디어 칸에 채움(앞뒤 공백 정리·600자 자름·글이 아니면 버림, **자동 생성 없음**), 채웠으면 칸 아래 「다른 프로그램에서 보낸 아이디어를 채웠습니다」 안내. `src/lib/bnc/ideaParam.ts`(`cleanIdeaParam`), 시험 `tests/ideaParam.test.mjs`(2개, 전체 35개)·tsc·build 통과.
- (같은 미배포 v1.24에 추가) **받은 아이디어 카드 강조**: `?idea=`로 열리면 「이미지 생성」 카드(`#card-generate`)로 한 번 내려가고 테두리를 약 2.4초 강조(`.bc-card.bc-flash`), 움직임 줄이기 설정이면 바로 이동·테두리만. 시험 36개·tsc·build 통과.

## ✅ v1.24 배포 (2026-10-22, Claude Code 윈도우)
- 위 「⏸ 미배포」 항목(`?idea=` 받기·카드 강조·compare-slider·post-presets 사본·버튼 대비·기록 오류 문장)이 이 버전으로 나감. **새로 추가**: 보낸 프로그램 표시 — `?src=`를 `ideaSourceName`(`src/lib/bnc/ideaParam.ts`)이 정해 둔 3개 이름(이미지 스타일 분석기·감성 글귀·리버스 프롬프트)만 받아 「「리버스 프롬프트」에서 보낸 아이디어를 채웠습니다」로 표시, 모르는 값은 「다른 프로그램에서」. `from`은 저장 작업 불러오기(uuid)라 `src`를 씀. 시험 37개. 크롬 검수: `?idea=…&src=reverse-prompt` → 칸 채움·안내 문구·카드로 204px 이동·강조 0.3초~2.8초, `src=evil-site` → 기본 문구. 새 보내는 프로그램을 늘리면 `SOURCE_NAMES`에 이름 추가.
- 배포 묶음(2026-10-22, Claude Code 윈도우): 바나나 v1.24 → 스타일 분석기 v1.35 → 감성 글귀 v1.24 → 리버스 프롬프트 v1.12 → 변환 스튜디오 v1.18 → 인물사진 v1.37 → 4컷 v1.30 순차 배포(빌드 7회, 실패 0), DB `programs.version` 갱신, 크롬에서 화면 버전 확인.

## ✅ v1.25 배포 (2026-10-22, Claude Code 윈도우) — 공용 사본·돌아가기 링크·보낸 곳 기록
- **공용 사본 사용**: `src/lib/bnc/bananaIdeaLink.ts`(공용 기준 코드 `banana-idea-link`, 기준 `style-dna-analyzer/src/lib/dna/bananaIdeaLink.ts` — 직접 고치지 않음). `ideaParam.ts`의 `MAX_IDEA`와 아이디어 칸 `maxLength`가 이 사본의 `MAX_BANANA_IDEA`(600)를 씀 → 보내는 쪽과 한도가 항상 같음. 보낸 곳 이름·주소 표 `BANANA_SOURCES`도 이 사본에 있음(새 보내는 프로그램은 기준 파일에만 추가 후 사본 반영).
- **↩ 보낸 곳으로 돌아가기**: 안내 문구 끝에 「↩ ○○ 화면으로 돌아가기」(`data-idea-back`, 공용 표의 주소만, 모르는 `src`는 링크 없음). 밑줄·굵게(`globals.css` `.bc-hint a[data-idea-back]`, 대비 7.7:1).
- **보낸 곳 기록**: 받은 아이디어로 「이미지 생성」을 누르면 요청에 `ideaSource`가 실리고, `cleanParams`가 `generate` + 공용 표에 있는 이름일 때만 받아 `banana_canvas_results.options.ideaSource`에 저장(DB 칸 추가 없음). 기록 API가 `options->>ideaSource`를 읽어 「내 결과 기록」 카드에 「· 🔗 감성 글귀」 표시.
- 집계(관리자 SQL): `select options->>'ideaSource' src, count(*) from banana_canvas_results where options ? 'ideaSource' group by 1 order by 2 desc;` (결과 행은 30일 뒤 자동 삭제되므로 최근 30일 기준)
- 검수: 시험 38개, tsc·빌드. 크롬: `?idea=…&src=emotion-writer` → 안내·돌아가기 링크(감성 글귀 주소)·칸 한도 600, `/api/run`을 가로채(생성 안 함) 요청 본문에 `ideaSource: "emotion-writer"` 확인, `/api/history` 200·`ideaSource` 키. 실제 생성 후 기록 카드 표시는 AI 비용이 들어 미확인(다음에 실제 생성할 때 확인).
- 빌드 2회: 첫 배포 후 돌아가기 링크가 밑줄 없이 글자와 같은 색이라 CSS 보정 후 같은 버전으로 재배포.

