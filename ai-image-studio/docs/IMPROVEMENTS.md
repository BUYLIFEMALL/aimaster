# AI 이미지 스튜디오 (ai-image-studio) 개선사항 관리 대장 (IMPROVEMENTS.md)

> **기준일자**: 2026-10-17  
> **프로그램**: AI 이미지 스튜디오 (`ai-image-studio`)  
> **현재 버전**: `v1.11` → `v1.12`  
> **규칙**: 발견된 모든 기술적 제약, 버그, UI/UX 개선사항을 기록하고, 상태를 관리한다.

---

## 1. 개선 과제 관리 목록

| ID | 구분 | 우선순위 | 상태 | 제목 및 핵심 내용 | 관련 파일 |
|:---:|:---:|:---:|:---:|---|---|
| `UI-01` | 디자인 | 높음 | 진행중 | **전체 화면 단일 배경색 `#09090b` 일체화 및 크리에이티브 아틀리에 스타일 적용**<br>- 대시보드, 갤러리, 프롬프트, 키 설정 등 모든 화면의 다크 글래스모피즘 테마 통일 | `app/globals.css`, `app/(dashboard)/layout.tsx` |
| `UI-02` | 사용성 | 높음 | 진행중 | **사이드바 `📖 연동 & 사용 매뉴얼` 메뉴 추가 및 5단계 비주얼 가이드북(`/guide`) 신설**<br>- 5단계 파이프라인, 4대 골든 팁, 4종 FAQ, 개인 키 보안 안내 및 비로그인 공개 열람 | `components/layout/Sidebar.tsx`, `app/(dashboard)/guide/page.tsx` |
| `UI-03` | 인증표준 | 높음 | 진행중 | **공식 표준 `[로그인] / [회원가입]` 2버튼 탭 토글 레이아웃 적용**<br>- 24px 다크 골드 격자 모눈 배경, 탭 토글 바, 이용약관 푸터 | `app/login/page.tsx` |
| `LOGIC-01` | 기능 | 보통 | 대기 | **최근 생성 이미지 간이 비교 스플릿 뷰어(A/B Comparison)**<br>- 두 모델 간(예: Gemini vs FLUX) 생성된 이미지를 좌우 슬라이더로 직접 비교하는 기능 | `components/ImageResultViewer.tsx` |
| `LOGIC-02` | 기능 | 보통 | 대기 | **프롬프트 네거티브 키워드 원클릭 프리셋 칩 탑재**<br>- 저화질 방지, 텍스트 제외, 워터마크 제외 등 자주 쓰이는 제외 키워드를 원클릭으로 추가 | `components/Step1PromptEnhancer.tsx` |
| `COLLAB-01` | 연계 | 보통 | 대기 | **AI 올인원 그래픽(`allinone-graphic`) 및 쇼츠 스튜디오(`shorts-onestop-studio`)로 에셋 직접 전송**<br>- 생성된 이미지를 다운로드하지 않고 플랫폼 내 타 서브프로그램으로 원클릭 전송 연동 | `components/ImageResultViewer.tsx` |
| `COLLAB-02` | 연계 | 보통 | 대기 | **이미지 스타일 분석기(`style-dna-analyzer`) 역방향 연동**<br>- 스타일 분석기에서 추출한 프롬프트를 AI 이미지 스튜디오로 즉시 전송하여 재창작 | `components/Step1PromptEnhancer.tsx` |

---

## 2. 처리 이력

- **2026-10-17 (`v1.12`)**:
  - `UI-01`, `UI-02`, `UI-03` 착수: 크리에이티브 아틀리에 스타일 전면 리뉴얼, 비주얼 가이드북 신설, 표준 탭 토글 로그인 레이아웃 적용.

| 2026-10-17 | ① 로직 | `scripts/test-access.cjs`가 핸드폰 필수 정책(2026-10-12 `88f2dff1`) 이전 기준이라 FREE 회원 통과 검사(76행)에서 실패한다 — 가짜 회원 정보에 핸드폰 번호 추가 필요. 운영 코드 문제 아님 | `scripts/test-access.cjs` | 낮음 | 제안(미구현) — Claude Code 윈도우 발견 |

## 2026-10-21 Claude Code(윈도우) — v1.23 보안 보강 결과·발견
- ✅ 결과 버킷 비공개 + 서명 주소, 30일 정리 cron 이전(갤러리 열람 때 전체 회원 삭제 제거).
- ⚪ 미사용 표 `user_image_generations`(0012)와 정리 함수(0014) 정리 여부 판단 필요(코드 참조 없음).
- ⚪ 업로드 실패 시 공급사 주소(만료됨) 또는 data URL을 기록에 그대로 남김 — 큰 data URL이 `usage_logs.metadata`에 들어갈 수 있음. 실패 시 재시도 또는 기록 생략 검토.

## 2026-10-23 발견 (Claude Code 윈도우, v1.28 검수 중)
- [x] (2026-10-23 처리, 미배포 대기) 다시 저장한 그림(`image_import`) 카드의 플랫폼 배지가 `getProviderLabel("image-convert-studio")` 기본값으로 「IMAGE-CONVERT-STUDIO」 영문 그대로 나옴 → 「이미지 변환 스튜디오」로 라벨 추가(작은 수정 — 미배포 대기로 모을 것).

## 2026-10-23 ⏸ 미배포 대기(정리 기록) — Claude Code(윈도우), 커밋 `8ad8ea2e5` · `f53021369`
- 생성 기록 30일 정리가 회원별 `usage_logs` `cleanup_expired`(images=이미지가 있던 기록 수) 기록 — 공용 `cleanup-usage-log` 사본. 공용 사본 `cleanupUsageLog.ts`는 직접 고치지 말 것(기준 `four-cut-comics/src/lib/cleanupUsageLog.ts`, `--sync`). 메인 관리자 「운영 상태」 정리 기록 진행률에 들어감. 기록 실패해도 정리는 계속.
- 작은 소스 수정이라 배포하지 않음 — **다음에 이 프로그램을 배포하는 CLI가 함께 내보내고 버전 +0.01**, 이 항목을 「배포됨(버전)」으로 바꾸고 `docs/PENDING_DEPLOYS.md` 줄도 정리.
