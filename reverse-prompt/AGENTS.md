# AI 리버스 프롬프트 자동화 (reverse-prompt) — 작업 지침 및 에이전트 인수인계 문서

<!-- INCREMENTAL_REFERENCE_IDEAS_20261019 -->
> **★★★ 공통 개발 방향 — 기능 안정화 우선·점진 레퍼런스 모듈화·아이디어 등록 (2026-10-19 주인님 확정)**
> 당분간 기존 프로그램 기능 개선·오류 수정·안정화에 집중합니다. 그 과정에서 잘 만들어지고 검증된 기능을 레퍼런스 모듈로 정리하고, 신규 프로그램 또는 기존 프로그램 리뉴얼 때 필요한 모듈을 하나씩 적용합니다.
<!-- /INCREMENTAL_REFERENCE_IDEAS_20261019 -->

## 1. 기본 정보
| 항목 | 내용 |
|---|---|
| 프로그램명 | AI 리버스 프롬프트 자동화 (`reverse-prompt`, 73번) |
| 배포 URL | https://reverse-prompt.buylife.xyz |
| 최신 버전 | `v1.10` (2026-10-19 갱신, 패키지 `1.10.0`, DB `v1.10` 3중 동기화) |
| 적용 디자인 템플릿 | **크리에이티브 아틀리에 스타일 — 리버스 프롬프트 아키텍트 에디션 (Creative Atelier Style — Reverse Prompt Architect Edition)** |
| 담당/기여 에이전트 | Claude Code(윈도우, v1.03/v1.05 업로드 예외 처리) ➔ Antigravity CLI(agy, 윈도우, v1.10 크리에이티브 아틀리에 디자인 리뉴얼 및 가이드북 구축) |

---

## 2. 사용 목적 및 대상
- **사용 목적**: 이미지·동영상·오디오 미디어를 멀티모달 AI로 역분석하여 주요 생성 AI(Midjourney, DALL·E 3, Flux, Sora, Veo 2, Suno 등)에 바로 사용할 수 있는 최적의 프롬프트와 정밀 파라미터를 역도출.
- **주요 대상**:
  - 미드저니, 플럭스 등 이미지 생성 시 레퍼런스 이미지의 조명/구도/스타일을 복제하고 싶은 크리에이터.
  - 소라, 클링, 런웨이용 시네마틱 카메라 무빙 및 영상 프롬프트 설계를 원하는 영상 제작자.
  - 수노, 우디오에서 유사한 분위기의 음악 장르/악기 구성을 추출하고자 하는 사운드 디자이너.

---

## 3. 개발 도구 및 기술 스택
- **프레임워크**: Next.js 16.4.0 (App Router, Turbopack)
- **라이브러리**: React 19.3.0, Lucide React 1.48.0
- **AI 엔진**: `@google/genai` (Google Gemini 2.5/3.5 Flash & 3.1 Pro 체인)
- **백엔드/인프라**: Supabase SSR (`@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.117.3), Storage 비공개 버킷 `reverse-prompt-tmp`
- **테스트 & 검증**: Node.js test runner (`npm test`), Microsoft Edge 최전면 포그라운드(headless: false) 실세션 검수

---

## 4. 핵심 기능 및 시스템 아키텍처
1. **멀티모달 3종 미디어 역분석 엔진**:
   - `src/lib/rpa/media.ts`: MIME 타입 감지, 크기 제한(이미지 20MB, 영상/음악 50MB), 임시 경로 검증(`isOwnTempPath`).
   - `src/lib/gemini.ts`: 이미지는 인라인 분석, 영상·오디오는 Files API 업로드 후 처리 폴링 및 분석 완료 즉시 원격 파일 자동 삭제.
2. **10대 타겟 AI 도구별 프롬프트 최적화**:
   - Midjourney(명령어 및 파라미터 조립), DALL·E 3(상세 서술형), Flux/SD(태그형), Sora/Veo/Runway/Kling(카메라 및 연속 동작), Suno/Udio(장르/BPM/악기 메타태그).
3. **독립 비주얼 가이드북 (`/guide`)**:
   - 4단계 파이프라인(미디어 업로드 ➔ 멀티모달 AI 분석 ➔ 타겟 최적화 ➔ 실시간 재조합).
   - 10대 도구별 프롬프트 특성 비교표 및 FAQ 5종 아코디언 제공.
4. **절대 불변 최상위 원칙 (BYOK Standard)**:
   - 회원 본인의 Google Gemini API 키로만 동작하며, 다른 회원과 키 및 분석 데이터가 일절 공유되지 않고 격리 보관.

---

## 5. 버전 히스토리
- **`v1.03`** (2026-10-14, Claude Code): 767px 모바일 셸 전환 스타일 보완.
- **`v1.04`** (2026-10-16, Claude Code): DB 연동 변수 호환성 보강.
- **`v1.05`** (2026-10-19, Claude Code): 분석 중 예외 발생 시 안내 없이 종료되던 문제를 `catch` 안내 처리로 개선.
- **`v1.10`** (2026-10-19, Antigravity CLI):
  - **크리에이티브 아틀리에 스타일 전면 리뉴얼**: 딥 미드나잇 다크 테마(`#0b0e14`), 아틀리에 앰버 골드(`#f59e0b`), 인디고 바이올렛(`#8b5cf6`), 시안(`#06b6d4`) 토큰 체계 적용.
  - **사이드바 메뉴 표준화 (`DESIGN.md` 9번 원칙 충족)**: 브랜드 뱃지 `v1.10 ARCHITECT`, 1-2-3 넘버링, `📖 연동 & 사용 매뉴얼` (`/guide`) 골드 뱃지 신설.
  - **메인 스튜디오 고도화**: `.studio-hero` 웰컴 배너 및 3대 KPI 지표 카드 신설.
  - **독립 비주얼 가이드북 (`/guide`) 전면 개편**: 4단계 파이프라인, 10대 AI 도구 비교 카드, BYOK 보안 안내, FAQ 5종 아코디언 탑재.
  - **버전 3중 동기화 완료**: `package.json` (`1.10.0`), `src/lib/version.ts` (`v1.10`), Supabase DB `programs` (`v1.10`).
  - **Vercel 프로덕션 배포 및 Edge 최전면 포그라운드 실세션 검수 완료 (6종 캡처 보존)**.

---

## 6. 개선 과제 및 타 프로그램 연계 아이디어
- `docs/IMPROVEMENTS.md` 참조:
  1. 역분석된 프롬프트와 원본 미디어를 동시에 비교하는 듀얼 스플릿 뷰어 지원.
  2. 프롬프트 내 특정 단어의 가중치(Weight)를 슬라이더로 조절하는 인터랙티브 UI 제공.
  3. `thumbnail-master`(76번), `banana-canvas`(80번), `fashion-style`(82번)로 원클릭 프롬프트 전송 연계.

---

## 7. 검수 가이드
- 단위 테스트: `npm test` (15/15 통과)
- 빌드 검증: `npm run build` (Turbopack 최적화 프로덕션 빌드 무결)
- 브라우저 실세션 검수: `node scripts/capture_edge_reverse_prompt_v110.cjs` (Microsoft Edge 최전면 포그라운드, 일반 회원 테스트 계정 `buylifemall@naver.com`)

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-21 v1.11 — 이미지 스타일 분석기와 서로 연결 + 30일 자동 삭제 + 버전 맞추기 (Claude Code 윈도우)
- 근거: [이미지 카테고리 분석 §7](../docs/analysis-image-consolidation-20261021/REPORT.md) — 주인님 결정 A안(두 프로그램 유지 + 연결·보강). 리버스 프롬프트 = 매체 3종·도구 9종의 「넓은」 변환, 스타일 분석기 = 이미지 스타일의 「깊은」 분석.
- **보내기**: 이미지 결과에 「🎨 스타일 정밀 분석으로 보내기」(이번 작업에서 올린 원본이 있을 때만 — 기록에서 다시 연 결과는 원본이 없어 숨김). `GET /api/upload?path=`가 본인 임시 파일의 10분 서명 주소를 주고, 새 창으로 `style-dna-analyzer.buylife.xyz/analyze?src=`를 연다.
- **받기**: `/analyze?src=` — 우리 Supabase 저장소의 `style-dna-images` 서명 주소만 받아 브라우저에서 내려받아 파일을 고른 것처럼(`pick`) 넣음(기존 업로드 흐름 그대로).
- **30일 정리**: `src/app/api/cron/cleanup`(Vercel cron 매일 03:00 KST, `Bearer CRON_SECRET`, 비밀값 비면 거부) — 생성일 30일 지난 기록(즐겨찾기 포함) 삭제 + 모든 회원 폴더의 1시간 지난 임시 파일 정리(예전엔 다음 업로드 때만 정리). 환경변수 `CRON_SECRET` 추가(Sensitive, 임의값).
- **버전**: DB가 v1.03에 머물러 있던 것을 코드와 함께 v1.11로(기록 `supabase/migrations/20261021_v1_11_version_sync.sql`), package.json 1.11.0.
- 검수: tsc·`npm test` 15개·build, 배포 Ready, 정리 주소 비밀값 없음 401. 크롬(관리자 계정 — 그때 크롬 로그인 계정, 본인 키)으로 시험 이미지 분석 1회 → 보내기 → 스타일 분석기에 원본 들어옴 → 그쪽 분석 1회 → 「다른 도구 문법으로 바꾸기」 → 리버스 프롬프트에 원본 들어옴(안내 문구) 양방향 확인. 시험 기록 2개 삭제.
