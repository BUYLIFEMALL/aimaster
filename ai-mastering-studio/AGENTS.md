# AI 마스터링 스튜디오 — 인수인계 (AGENTS.md)

> 다른 CLI가 대화 없이 이어서 작업할 수 있도록 작성된 인수인계 문서입니다. 작업 전에 루트 `CLAUDE.md`, `docs/HANDOFF.md`, `docs/ERROR_LESSONS.md`를 먼저 읽습니다. 작업 기록은 아래 "8. 작업 기록"에 **추가만** 합니다.

## 1. 프로그램 개요 및 서비스 링크
| 항목 | 내용 |
|---|---|
| 프로그램명 / slug | AI 마스터링 스튜디오 / `ai-mastering-studio` |
| 카탈로그 번호 | 77번 |
| 현재 버전 | **v1.10** (`package.json` = `src/lib/version.ts` = Supabase DB `programs.version`) |
| 서비스 라이브 링크 | [AI 마스터링 스튜디오 바로가기](https://ai-mastering-studio.buylife.xyz) |
| 디자인 콘셉트 | **사이버 네온 다크 콘솔 스타일 — 오디오 마스터링 콘솔 에디션 (Cyber Neon Dark Console Style — Audio Mastering Console Edition)** |
| 배포 플랫폼 | Vercel (팀 `buylife`, 프로젝트 `ai-mastering-studio`, 배포 ID: `dpl_E6JZSt7m9z33pgdnA1bDV9nDRg9a`) |
| 배지 및 카테고리 | FREE + new, 음악, 최소 등급 일반 |
| 오디오 신호 엔진 | 100% 브라우저 무손실 Web Audio API (`OfflineAudioContext`), 0-서버 트래픽 비용 |

---

## 2. 핵심 기능 및 워크플로우
1. **무손실 오디오 일괄 업로드**: 44.1kHz / 16-24bit 이상의 WAV 또는 MP3 파일을 최대 20곡(파일당 150MB)까지 드래그앤드롭 업로드.
2. **12종 프로페셔널 사운드 프로필**:
   - 범용 마스터, 스트리밍 최적화(-14 LUFS), 클럽 펀치, 파이어 하모닉스, 선명한 보컬, 팟캐스트, 빈티지 온기, 테이프 새추레이션, 내추럴 어쿠스틱, 와이드 공간감, 시네마틱 앰비언스, 어그레시브 락.
3. **AI 로직 생성기 (AI Tuning Engineer)**:
   - "선명한 고음과 깊은 저음 펀치감이 있는 K-Pop 사운드" 등 자연어 입력 시 AI가 파라미터 제안 및 설명 제공.
   - 회원 본인 API 키 원칙(BYOK) 적용: Gemini / OpenAI / Claude 공급사 지원.
4. **5대 하드웨어 아날로그 랙 실시간 튜닝**:
   - ① 3-Band Parametric EQ (저·중·고역대 부스트/컷 및 Q 팩터)
   - ② Harmonic Saturation (진공관/테이프 배음 혼합)
   - ③ Dynamic Compressor (Threshold, Ratio, Attack, Release)
   - ④ Stereo Imager (Mid/Side 폭 조절, 센터 모노 유지)
   - ⑤ True Peak Limiter (Lookahead 10ms, Ceiling -1.0dBFS 고정 방어)
5. **무손실 렌더링 & ZIP 일괄 다운로드**:
   - 브라우저 오프라인 연산으로 수 초 내 렌더링.
   - 개별 트랙 WAV 다운로드 또는 날짜별 압축 ZIP 일괄 다운로드.

---

## 3. 디자인 시스템 및 UI 구조 (v1.10 리뉴얼)
- **배경 테마**: `#060911` (Deep Space Dark) 및 `#0d121f` 랙마운트 섀시.
- **포인트 컬러**: `#00f0ff` (사이버 시안 네온), `#7000ff` (네온 퍼플), `#f59e0b` (앰버 골드).
- **상단 히어로 배너 (`.studio-hero`)**:
  - `Cyber Neon Audio Mastering Console` 타이틀과 발광 보더라인.
  - `v1.10 MASTER CONSOLE`, `12종 프로페셔널 사운드 프로필`, `5대 하드웨어 마스터링 랙` 뱃지 탑재.
  - 가이드북 및 API 키 설정 퀵 링크 버튼.
- **3대 핵심 KPI 지표 카드**: 12종 사운드 프로필, 5대 정밀 아날로그 랙, 무손실 브라우저 렌더.
- **사이드바 표준화**:
  - 브랜드 뱃지 `v1.10 MASTER CONSOLE` 네온 시안 발광.
  - 1-2-3 넘버링 단계 메뉴 (마스터 WAV 올리기 ➔ 프로필 & 랙 튜닝 ➔ 일괄 렌더 & 저장).
  - `📖 연동 & 사용 매뉴얼` (`/guide`) 골드 뱃지 및 모바일 반응형 햄버거 메뉴.
- **독립 비주얼 가이드북 (`/guide/page.tsx`)**:
  - 4단계 마스터링 파이프라인, 12종 사운드 프로필 비교 매트릭스, 5대 랙 원리 해설, FAQ 5종 아코디언.

---

## 4. 파일 및 디렉터리 아키텍처
```
ai-mastering-studio/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx         # 다크 테마 글로벌 레이아웃
│   │   │   ├── guide/page.tsx     # 독립 비주얼 가이드북
│   │   │   ├── settings/page.tsx  # API 키 및 연동 설정
│   │   │   └── studio/page.tsx    # 마스터링 스튜디오 라우트
│   │   ├── api/
│   │   │   ├── ai-preset/route.ts # AI 로직 생성기 엔드포인트
│   │   │   └── user-key/route.ts  # BYOK 키 관리 API
│   │   └── globals.css            # 사이버 네온 다크 콘솔 스타일 토큰
│   ├── components/
│   │   ├── layout/Sidebar.tsx     # v1.10 표준 다크 사이드바
│   │   ├── studio/
│   │   │   ├── MasteringStudio.tsx# 메인 콘솔 UI, 히어로, KPI 카드
│   │   │   ├── Rack.tsx           # 5대 아날로그 하드웨어 랙 컴포넌트
│   │   │   └── Waveform.tsx       # 다크 캔버스 오디오 파형 시각화
│   │   └── settings/ApiKeySettings.tsx
│   └── lib/
│       ├── mastering/             # 순수 신호처리 및 브라우저 DSP 엔진
│       │   ├── dsp.ts             # 스테레오 폭, 리미터, 16bit WAV 인코더
│       │   ├── engine.ts          # OfflineAudioContext Web Audio 파이프라인
│       │   ├── models.ts          # 데이터 타입 정의
│       │   └── params.ts          # 슬라이더 범위, 12종 프리셋
│       └── version.ts             # APP_VERSION = "v1.10"
└── tests/                         # 단위 테스트 (신호처리, 접근제어 21종)
```

---

## 5. 보안 및 데이터 보호 원칙 (BYOK)
- **오디오 데이터 100% 로컬 격리**: 오디오 파일은 어떤 서버로도 전송되지 않으며, 사용자 브라우저의 Web Audio API에서만 렌더링 후 폐기됩니다.
- **회원 본인 API 키 원칙 (BYOK)**: AI 로직 추천 기능 호출 시 운영자 또는 타인의 키를 공유하지 않고 본인이 등록한 Gemini/OpenAI 키로만 안전하게 구동됩니다.

---

## 6. 브라우저 실세션 검수 결과 (Microsoft Edge 전용)
- **검수 일시**: 2026-10-19
- **검수 환경**: Microsoft Edge 포그라운드 최전면(`headless: false`, `--start-maximized`)
- **검수 계정**: 일반 회원 테스트 계정 (`buylifemall@naver.com`, SSR 세션 쿠키 주입)
- **검수 증빙 캡처 (6종 보존)**:
  1. `edge_mastering_desktop_studio_v110.png`: 메인 스튜디오 히어로 배너, 3대 KPI 카드, 프리셋 그리드, AI 로직 생성기
  2. `edge_mastering_desktop_rack_v110.png`: 5대 마스터링 아날로그 랙, 정밀 슬라이더, 일괄 처리/ZIP 버튼
  3. `edge_mastering_desktop_guide_v110.png`: 비주얼 가이드북 상단, 4단계 워크플로우 카드, 5대 랙 원리
  4. `edge_mastering_desktop_guide_faq_v110.png`: 12종 사운드 프로필 매트릭스 및 FAQ 5종 아코디언 오픈 상태
  5. `edge_mastering_desktop_settings_v110.png`: BYOK API 키 등록/관리 다크 콘솔 화면
  6. `edge_mastering_mobile_guide_v110.png`: 모바일 375px 뷰포트 반응형 레이아웃 및 햄버거 메뉴
- **화면 유지**: 검수 완료 후 메인 스튜디오 대시보드를 최전면에 10분간 유지.

---

## 7. 남은 과제 및 개선 제안 (IMPROVEMENTS)
1. **24-bit / 32-bit Float 무손실 출력 지원**: 방송/스튜디오 프로페셔널 마스터링을 위한 24bit WAV 익스포트 옵션 추가.
2. **EBU R128 통합 라우드니스 (LUFS) 실시간 미터**: 단순 RMS 외에 정밀한 LUFS 및 True Peak 인터샘플 미터 탑재.
3. **사용자 커스텀 랙 프리셋 로컬 저장**: 자주 사용하는 랙 튜닝 값을 브라우저 로컬스토리지에 저장하고 불러오는 프리셋 매니저 구현.

---

## 8. 작업 기록 (추가만)
- **2026-10-13 v1.01**: 신규 구축, FREE+new 등록, 도메인 연결, 첫 배포.
- **2026-10-13 v1.02**: ZIP 파일 이름 날짜 포맷 적용, 인수인계 매뉴얼 작성.
- **2026-10-15 v1.03**: 한국 시간 현재 연·월 기준 반영.
- **2026-10-16 v1.04**: Supabase DB 연동 변수 호환성 강화.
- **2026-10-19 v1.10 (사이버 네온 다크 콘솔 스타일 전면 리뉴얼)**:
  - 다크 콘솔 테마 토큰 시스템 및 네온 발광 CSS 구축.
  - 상단 `.studio-hero` 웰컴 배너 및 3대 핵심 KPI 카드 추가.
  - 사이드바 표준화 (`v1.10 MASTER CONSOLE`, 1-2-3 넘버링, `/guide` 골드 뱃지, 모바일 햄버거 메뉴).
  - 5대 마스터링 하드웨어 랙 다크 랙마운트 UI 리뉴얼.
  - 독립 비주얼 가이드북 (`/guide/page.tsx`) 전면 리뉴얼 (4단계 파이프라인, 12종 프로필 매트릭스, 5대 랙 해설, FAQ 5종 아코디언).
  - 버전 3중 동기화 (`v1.10`: `package.json`, `src/lib/version.ts`, Supabase DB `programs`).
  - Next.js Turbopack 빌드 성공 및 21종 단위 테스트 100% 통과.
  - Vercel 프로덕션 배포 완료 (`dpl_E6JZSt7m9z33pgdnA1bDV9nDRg9a`).
  - Microsoft Edge 최전면 포그라운드 실세션 검수 (6종 캡처 보존 및 10분 화면 유지).

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-23 v1.12 — 좌측 메뉴 계정·로그아웃 위치 (Claude Code 윈도우 · 세션 claude-win-20261023-bgm, 음악 담당)
- 미배포 대기 `22c6cda35`(클래스만)를 배포. 배포 `ai-mastering-studio-560vmpqod` Ready·DB v1.12. 크롬(시험 회원) `/studio`: 데스크톱(창 높이 1214px) 마지막 메뉴 「API키등록·플랫폼연동」 아래 493px → 계정 이메일 522px(예전엔 맨 아래로 밀림). 390px 틀: 좌측 메뉴 숨김·☰ 펼치면 계정이 마지막 메뉴 바로 아래, 가로 넘침 없음(문서 폭 375px). 비용: 빌드 1회(승인).

## 2026-10-23 v1.13 — 「연동 & 사용 매뉴얼」 메뉴 한 줄 (Claude Code 윈도우 · 세션 claude-win-20261023-bgm)
- 아이콘과 겹치던 📖 이모지 제거 + 한 줄 고정(`a33fd63ff`). 배포 `ai-mastering-studio-5yboet05u` Ready·DB v1.13. 크롬: 메뉴 「연동 & 사용 매뉴얼 GUIDE」 높이 58→42px, 글자 잘림 없음. 비용: 빌드 1회(승인).
