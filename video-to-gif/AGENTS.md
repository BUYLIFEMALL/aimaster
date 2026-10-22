# VideoToGIF 에이전트 작업 지침 (AGENTS.md)

> **최초 제정**: 2026-09-19  
> **최종 개정**: 2026-10-19 (v1.10 디자인 리뉴얼 & 가이드북 신설)  
> **적용 대상**: Claude Code, Codex, Antigravity(Gemini) 등 모든 AI 에이전트  

이 프로젝트는 AIMaster 공용 Supabase 인증·권한 체계를 사용하는 `video-to-gif` 서브프로젝트입니다. 작업 전 루트 `../AGENTS.md`와 `../CLAUDE.md`, `../DESIGN.md`를 반드시 먼저 읽습니다.

---

## 1. 기본 정보 및 서비스 식별자

| 항목 | 내용 |
|---|---|
| **프로그램 번호** | **36번** |
| **프로그램 명칭** | **상세페이지 GIF 자동화 (VideoToGIF)** |
| **프로그램 slug** | `video-to-gif` |
| **현재 버전** | `v1.11` (2026-10-22 배포·크롬 확인, `package.json`, `lib/version.ts`, Supabase DB 3중 동기화) |
| **공식 도메인** | `https://video-to-gif.buylife.xyz` (대시보드: `/dashboard`) |
| **적용 템플릿** | **크리에이티브 아틀리에 스타일 — 이커머스 GIF 랩 에디션** |
| **테마 및 색상** | 다크 차콜 (`#0d1117` + `#161b22`) + 이커머스 앰버 골드 (`#f59e0b`) |

---

## 2. 안전 규칙 (Mandatory Safety Rules)

- 코드 생성, 수정, 로컬 테스트 및 빌드는 자율 진행합니다.
- 파일/폴더 삭제, DB 마이그레이션 적용, 환경변수 변경, 유료 API 호출은 사전 승인을 받습니다.
- **원격 서버 무저장 원칙**: 원본 동영상과 변환된 GIF는 서버나 DB에 영구 저장하지 않고, 100% 브라우저 메모리의 Blob URL로만 유지됩니다.
- 회원 계정 및 권한: 관리자는 `buylifemall@gmail.com`, 일반 테스트 계정은 `buylifemall@naver.com`으로 고정합니다.

---

## 3. 아키텍처 및 핵심 기술 스택

1. **클라이언트 사이드 WASM 변환 엔진**:
   - 서버(Render 워커)가 아닌 사용자 브라우저 내에서 `@ffmpeg/ffmpeg` (v0.12.15) WebAssembly 바이너리로 직접 구동.
   - Vercel 100MB 요청 제한 및 서버 유지비용을 원천 차단.
2. **지능형 8단계 화질 사다리 (Candidates Ladder)**:
   - 결과 GIF가 **8MiB(약 8.3MB)** 이하가 될 때까지 1단계(100% 해상도/256색)부터 8단계(45% 해상도/128색)까지 자동 최적화 탐색.
   - 영상의 전체 재생 시간을 임의로 자르지 않고 100% 보존.
3. **2-Pass 고화질 팔레트 인코딩**:
   - `palettegen` (lanczos 필터, stats_mode=diff) ➔ `paletteuse` (sierra2_4a 디더링).
4. **다중 큐 및 일괄 처리**:
   - 최대 20개 동시 등록, 파일당 최대 200MB 지원. 브라우저 CPU 안전을 위해 순차(1개씩) 인코딩 처리.

---

## 4. 적용 디자인 템플릿 및 UI/UX 구조

- **공식 템플릿**: **크리에이티브 아틀리에 스타일 — 이커머스 GIF 랩 에디션 (Creative Atelier Style — eCommerce GIF Lab Edition)**
- **토큰 시스템 (`app/globals.css`, `tailwind.config.ts`)**:
  - 배경: `--background: #0d1117` (딥 차콜 나이트)
  - 서피스: `--surface: #161b22`, `--surface-hover: #1f2937`, `--border: #30363d`
  - 포인트: `--brand: #f59e0b` (앰버 골드), `--brand-emerald: #10b981`, `--brand-cyan: #38bdf8`
- **사이드바 메뉴 표준화 (`components/layout/Sidebar.tsx`)**:
  - 브랜드 칩: `v1.10 GIF LAB` 앰버 칩 발광
  - 1-2-3단계 넘버링: 1. 동영상 파일 등록 ➔ 2. WASM 8MiB 최적화 ➔ 3. 고화질 GIF 다운로드
  - **`📖 연동 & 사용 매뉴얼` (`/guide`)** 신설 (골드 하이라이트)
  - 모바일 햄버거 토글 드로어 완비 (767px 이하)
- **메인 스튜디오 (`components/ConverterWorkspace.tsx`)**:
  - 상단 `.studio-hero` 웰컴 배너 및 3대 KPI 지표 카드
  - 모던 다크 드롭존, 실시간 진행률 게이지 바, 인라인 GIF 미리보기 모달 지원
  - 40fps/50fps 토글 및 560px/780px/860px 쇼핑몰 프리셋 버튼

---

## 5. 독립 비주얼 가이드북 (`/guide/page.tsx`) 구조

- 4단계 이커머스 GIF 출판 파이프라인 (등록 ➔ 세팅 ➔ WASM 사다리 ➔ 즉시 삽입)
- 쇼핑몰 플랫폼별 규격 비교 매트릭스 (스마트스토어 860px, 쿠팡 780px, 자사몰, 와디즈)
- 8단계 화질 사다리 최적화 알고리즘 심층 해설
- 100% 브라우저 메모리 구동 & 프라이버시 보호 배너
- 자주 묻는 질문 FAQ 5종 골드 아코디언 인터랙션

---

## 6. 검증 및 배포 절차

1. 로컬 무결성 검증: `npm run build` (Next.js Turbopack 빌드 성공 확인)
2. 프로덕션 배포: `npx vercel --prod --yes`
3. 브라우저 실세션 검수:
   - **Antigravity / Codex**: **Microsoft Edge(엣지) 전용** (`msedge.exe`, `headless: false`, 10분 창 최전면 유지).
   - 일반 회원 테스트 계정(`buylifemall@naver.com`) SSR 세션 쿠키 주입.
   - 데스크톱(1440px) 및 모바일(375px) 6종 스크린샷 아티팩트 보존.

---

## 7. 작업 히스토리

- **v1.00 ~ v1.03 (2026-09-20)**: Render 워커 구조 폐기, 브라우저 클라이언트 `@ffmpeg/ffmpeg` WASM 직접 변환 구조 전환.
- **v1.04 (2026-10-12)**: 회원 핸드폰 번호 필수 정책 적용.
- **v1.05 (2026-10-16)**: DB 연동 변수 호환 (`NEXT_PUBLIC_SUPABASE_URL` 등).
- **v1.06 (2026-10-16)**: 도메인 통일(SSO) `https://video-to-gif.buylife.xyz`.
- **v1.10 (2026-10-19, Antigravity CLI)**:
  - 크리에이티브 아틀리에 다크 스타일 전면 리뉴얼.
  - `/guide` 독립 비주얼 가이드북 전면 신설.
  - 사이드바 표준화 (1-2-3 넘버링, `/guide` 골드 칩, 모바일 햄버거 메뉴).
  - 메인 워크스페이스 `.studio-hero` 배너, 3대 KPI 카드, GIF 인라인 미리보기 모달 탑재.
  - Vercel 프로덕션 배포 및 Microsoft Edge 최전면 포그라운드 실세션 검수 완료.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-22 ⏸ 미배포 — 좁은 칸 버튼 줄바꿈/잘림 수정 (Claude Code 윈도우, 커밋 f0871e568)
- components/ConverterWorkspace.tsx(미리보기 하단): 버튼·짧은 문구에 whitespace-nowrap, 버튼 묶음 shrink-0(필요하면 flex-wrap). 기능·문구 변경 없음. **급하지 않아 배포하지 않음(주인님 B안) — 다음에 이 프로그램을 배포하는 CLI가 함께 내보내고 버전 +0.01, 이 항목을 「배포됨(버전)」으로 바꿀 것.** 근거: 루트 docs/UI_WRAP_AUDIT_20261022.md, 규칙 DESIGN.md 원칙 19.

## 2026-10-22 v1.11 — 구간 자르기 · 완료된 GIF 전체 ZIP · 변환 엔진 불러오기 실패 복구 (Claude Code 맥미니 · 배포 대기, 이커머스 2차 재비교 작업 ④)
- **구간 자르기**: 파일 줄마다 「✂️ 구간 시작·끝(초)」(변환 전·오류 때만, 빈칸이면 처음·끝까지) + 영상 길이 표시(파일을 넣을 때 브라우저 video 요소로 읽음). ffmpeg 두 단계(팔레트·GIF) 모두 입력 앞에 `-ss 시작`·`-t 길이`. 잘못된 값(음수, 끝 ≤ 시작, 시작 ≥ 길이)은 변환 전에 그 줄을 오류로 표시.
- **전체 ZIP**: 완료가 2개 이상이면 「변환 시작」 아래 「📦 완료된 GIF 전체 ZIP」 → `gif-all.zip`(브라우저 안에서, 서버로 안 보냄). **공용 기준 코드 `store-zip` 사본 `lib/zip.ts`**(기준 `portrait-photo/src/lib/portrait/zip.ts`, 직접 고치지 말 것), 같은 이름은 `uniqueNames`로 구분.
- **D-47-01**: `getFFmpeg` 불러오기가 한 번 실패하면 실패한 약속이 남아 이후 변환도 계속 실패 → 실패 때 비우고 다음 시도에 다시 불러옴, 안내 문구 「변환 엔진을 불러오지 못했습니다…」.
- 화면 위 배지가 「v1.10」 고정 글자였던 것을 `APP_VERSION`으로.
- 버전 v1.11(`lib/version.ts`·`package.json` 1.11.0, SQL `supabase/migrations/20261022_trim_zip_v1_11.sql` — 버전만). 검수: tsc 0, eslint 0, 구간 함수 무료 시험 7가지 통과(빈칸·시작만·끝만·둘 다·끝<시작·음수·길이 초과), 공용 코드 점검 사본 일치.
- **윈도우 CLI 다음 첫 단계**: SQL `20261022_trim_zip_v1_11.sql` → `video-to-gif` 배포 1회. 크롬 확인은 맥미니(짧은 시험 영상 2개로 구간 변환·전체 ZIP).

## 2026-10-22 ✅ v1.11 배포 (Claude Code 윈도우 — 맥미니 v1.11 마무리)
- 맥미니 커밋 `4ebf21518`(파일마다 구간 자르기·완료된 GIF 전체 ZIP·변환 엔진 불러오기 실패 복구 D-47-01·히어로 배지 `APP_VERSION`) 마무리.
- 공용 사본 `store-zip`(`lib/zip.ts`) 일치·tsc·로컬 build 통과 → 배포 READY(`video-to-ojei4n8wq-buylife.vercel.app`) → 운영 DB `programs.version` v1.11(`20261022_trim_zip_v1_11.sql`과 같은 버전 갱신만, DB 구조 변경 없음).
- 크롬(메인 크롬): `/dashboard` 머리에 「이커머스 상세페이지 GIF 랩 v1.11」 표시 확인. 구간 자르기·전체 ZIP 칸은 영상을 올려야 나타나므로 **실제 변환·ZIP 확인은 맥미니 크롬에서 짧은 시험 영상 2개로 진행 예정**(미확인).
- 비용: Vercel 빌드 1회(붙여 넣은 순서 범위), AI 호출 0회.

## 2026-10-22 ✅ v1.11 맥미니 크롬 실검수 — 구간 자르기·전체 ZIP (Claude Code 맥미니) — 이커머스 2차 재비교 작업 ④ 완료
- 회원 파일을 쓰지 않도록 크롬 화면 안에서 4초 시험 영상 2개를 만들어(캔버스 녹화 webm, 색·숫자 움직임) 파일 칸에 넣음. 서버 전송 없음.
- 대기열 2줄·구간 입력 4칸·「길이 3.9초 / 4.0초」 표시 → A만 시작 1·끝 2.5 → 변환 시작 → 둘 다 완료(A 332KB, B 726KB). GIF 내부 확인: **A 60프레임·1.51초**(요청 1.5초), **B 159프레임·3.97초**(전체), 가로 560.
- 「📦 완료된 GIF 전체 ZIP (2개)」 → 내려받기 클릭만 화면 안에서 가로채 내용 확인(컴퓨터 저장 없음): `gif-all.zip` 1.08MB, `시험A.gif`·`시험B.gif` 둘 다 `GIF89a`.
- 미확인: 잘못된 구간 입력의 화면 표시(함수 시험 7가지로만 확인), 변환 엔진 불러오기 실패 복구(인터넷을 끊어야 재현 — 코드 확인만).
- 비용 없음(AI 0회, 서버 전송 없음).

## 2026-10-22 v1.12 — 대기 목록 영상 첫 장면 썸네일 (Claude Code 맥미니 · 배포 대기, 주인님 승인)
- 플랜: [`docs/PLAN_20261022_THUMBNAIL.md`](docs/PLAN_20261022_THUMBNAIL.md).
- `components/ConverterWorkspace.tsx`: `readDuration` → `readVideoInfo`(길이 + 0.1초 지점 장면을 가로 160px JPEG `data:` 주소로, 8초 안에 못 그리면 길이만). `Job.thumbnail` 추가. 목록 왼쪽 번호 칸을 썸네일(가로 64px, 세로 최대 64px)로 바꾸고 번호는 왼쪽 위에 겹침. 썸네일이 없으면(브라우저가 못 읽는 코덱) 예전 번호 칸. 서버·DB·AI·ffmpeg 변경 없음, 썸네일은 서버에 올라가지 않음.
- 버전 v1.12(`lib/version.ts`, `package.json` 1.12.0, SQL `supabase/migrations/20261022_thumbnail_v1_12.sql` — 버전만). 검수: tsc 0, eslint 0.
- **윈도우 CLI 다음 첫 단계**: SQL `20261022_thumbnail_v1_12.sql` → `video-to-gif` 배포 1회. 그 뒤 맥미니 크롬 실검수.

## 2026-10-22 ✅ v1.12 배포 (Claude Code 윈도우 — 맥미니 v1.12 마무리)
- 맥미니 커밋 `eda5c6963`(대기 목록 영상 첫 장면 썸네일, 브라우저 안 생성·서버 저장 없음) 마무리.
- 공용 사본 `store-zip` 일치·tsc·로컬 build 통과 → 배포 READY(`video-to-av8yecfyc-buylife.vercel.app`) → 운영 DB `programs.version` v1.12(`20261022_thumbnail_v1_12.sql`과 같은 버전 갱신만).
- 크롬(메인 크롬): `/dashboard` 머리 배지·사이드바에 v1.12 표시 확인. 썸네일은 영상을 올려야 보이므로 **맥미니 크롬에서 시험 영상 2개로 확인 예정**(미확인).
- 비용: Vercel 빌드 1회(붙여 넣은 순서 범위), AI 호출 0회.
