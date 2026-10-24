# 영상 프로그램 부분 통합·기능 확장 순차 작업목록

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션(video) 확인 전.** 담당 세션이 확인하기 전까지는 참고 자료로만 쓴다. 이 문서 작성으로 운영 코드·DB·키·회원 권한·버전·배포는 바뀌지 않았다. 담당 세션이 세운 플랜·로드맵·대기 목록을 그대로 옮겼고, 기존 결정을 바꾸는 제안은 넣지 않았다.

대상은 **AIMaster 운영**이다. 공통 DB ref `esgxyikcnnvmlhygjkth`. 담당 역할: [`docs/roles/video.md`](roles/video.md)(`claude-win-video`). 맥 실물 확인은 맥미니 세션(`[역할: mac-mini]`), `video-to-gif` 화면은 이커머스 담당·디자인은 agy 세션이 함께 고쳐 왔다(아래 「여쭐 것」).

## 현재 위치와 읽는 순서

1. [영상 자동화 완성 기준](VIDEO_COMPLETION_POLICY.md) — 끝났다고 말할 조건·회원 선택 항목·하지 않을 것.
2. [영상 기능 상세 비교표](VIDEO_FEATURE_MATRIX.md) — 지금 코드에 있는 기능·기준 코드 위치. 항목을 시작하기 전에 읽고, 배포한 기능은 그 표의 칸을 고친다.
3. [무료 영상 렌더링 플랜](PLAN_20261023_FREE_VIDEO_RENDERING.md)(§9 최종 추천, §10·11 Remotion 확인·R1 원인) · [내 PC 고속 변환 로드맵](analysis-pc-renderer-20261024/ROADMAP.md)(§3-0 영상 담당 진행) · [내 PC 렌더러 2.0 플랜](../ai-video-studio/docs/PLAN_20261024_LOCAL_RENDERER_V2.md).
4. 프로그램별 기록: `ai-video-studio/AGENTS.md`·`docs/IMPROVEMENTS.md`·`docs/IMPROVEMENT_BACKLOG.md`, `infinite-loop-video/AGENTS.md`·`docs/IMPROVEMENTS.md`, `video-to-gif/AGENTS.md`·`docs/IMPROVEMENTS.md`·`docs/IMPROVEMENT_HANDOFF_20261024.md`, 맥 확인 절차 `video-to-gif/local-renderer/test/MAC_CHECK.md`.

**2026-10-24 요약:** AI 영상 v1.20·무한 루프 v1.08·영상렌더 v1.25(실행기 1.30). 무료 렌더 플랜의 A(합치기, AI 영상 v1.04~v1.09)·B(공용 등록, 뮤직비디오 v1.15)와 로드맵 영상 A~C는 끝났다. 남은 것은 아래 「우선 처리」·「대기·후속」 표다.

## 우선 처리 (회원에게 실제 피해가 갈 수 있는 것)

| ID | 문제 | 근거 | 영향 | 다음 첫 단계 | 상태 |
|---|---|---|---|---|---|
| VD-U1 | **「진행 중」으로 멈춘 생성 행이 30일 정리에서 영원히 빠질 수 있다.** 정리 작업은 `status = running` 행을 건너뛰고, 20분 시간 초과·접수 유예 판정은 회원이 화면을 열어 상태를 확인할 때(`GET /api/generations` → `advance`)만 일어난다. 회원이 생성 직후 창을 닫고 다시 오지 않으면 행과 시작/끝 장면 사진(`{user}/{id}/start.jpg`)이 남는다 | `ai-video-studio/app/api/cron/cleanup/route.ts`(`.neq("status","running")`), `lib/generations.ts` `advance`(시간 판정), 호출 위치 `app/api/generations/route.ts` 57행뿐 | 최상위 규칙(생성 데이터 30일 삭제) 미충족 가능 | 운영 DB에서 `avs_generations` 중 `status='running'`이고 `created_at`이 1일 넘은 행 수를 읽기만으로 확인 → 있으면 정리 작업이 「오래된 running 행은 실패 처리 후 정리」하도록 하는 플랜을 담당 세션이 제시 | 위험 후보(DB 확인 전) |
| VD-U2 | (확인용) 유료 생성 이중 과금 — **코드상 위험 없음으로 보임**: 접수 자동 재시도 없음, 같은 행 잠금, 동시 4개 제한. Gemini는 백그라운드 방식이 400으로 거절될 때만 한 번 다른 방식으로 다시 보낸다(주석상 「거절은 요금 없음」) | `lib/video/videoProviders.ts` `submitVideoJob`, `lib/generations.ts` `claimLock`, `app/api/generations/route.ts` `MAX_RUNNING` | 거절 응답에 요금이 붙지 않는다는 근거는 코드 주석뿐 | 담당 세션이 Gemini 문서·사용량으로 「백그라운드 거절 = 과금 없음」을 한 번 확인해 기록. 「만들기」 두 번 누르기 방지(버튼 잠금)는 이번에 확인하지 못함 → 화면 확인 | 확인 필요 |
| VD-U3 | (확인용) 운영자 키 폴백·다른 회원 데이터 — **발견 없음**: 키는 `user_api_keys` 본인 행만, 없으면 `null`. 편집본·곡·생성 기록 조회는 모두 `user_id` 조건, 서명 경로는 `{userId}/` 접두 확인 | `lib/access.ts` `getUserApiKey`, `lib/edit/edits.ts`, `app/api/generations/[id]/route.ts` | — | 없음(기록용) | 확인됨(코드) |

## 유지할 역할과 이관 방향

| 유지할 프로그램 | 담당 역할 | 연결 | 원본 처리 |
|---|---|---|---|
| AI 영상 스튜디오 (`ai-video-studio`) | 영상 모델 연동 기준 + 영상 합치기(회원 PC 렌더) | 공용 `ai-video-*`·`video-edit-*` 기준, AI 음악 스튜디오 곡 읽기, 내 PC 렌더러 사본 | 독립(기준) |
| 무한루프 영상자동화 (`infinite-loop-video`) | 영상 하나 → 끝없는 반복 | 내 PC `loop` | 독립 |
| AI 영상렌더 스튜디오 (`video-to-gif`) | 영상 → GIF, 내 PC 렌더러 본체 | 상세페이지로 GIF 보내기(`gif-handoff`), 렌더러 묶음 배포 | 독립 |

병합 예정은 없다. 세 프로그램은 하는 일이 겹치지 않고, 공용 코드 사본과 넘기기로만 연결한다.

## 완료된 묶음 (근거 기록)

| ID | 대상과 범위 | 근거 커밋·버전 | 상태 |
|---|---|---|---|
| VD-A0 | Remotion 브라우저 렌더 사전 확인 + R1(하드웨어 인코딩 영상 멈춤) 원인 확인 | 무료 렌더 플랜 §10·§11(로컬·무료) | ✅ |
| VD-A | 영상 합치기 2-가·2-나·덕킹·내레이션 맞추기·겹쳐 바꾸기·자르기 막대 | AI 영상 v1.04~v1.09 | ✅ |
| VD-B | 합치기 공용 코드 등록 → 뮤직비디오 최종 합치기 | 뮤직비디오 v1.15 | ✅ |
| VD-M1 | Replicate Kling v2.1 제거(업체 종료, 사본 4곳 포함) | `c2b698db4` · AI 영상 v1.15, Shots v1.43, 원스톱 v1.41, AI 이미지 v1.30, 뮤직비디오 v1.24 | ✅ |
| VD-L1 | 루프 소리 없는 영상 실패 수정 | `2fb360453` · 루프 v1.07 | ✅ |
| VD-R-A | 실행기 1.20 `loop` + 루프 「⚡ 내 PC로 빠르게」 | `e14e958cd`·`e5e9c3441`·`997fec0bb` · 렌더 v1.23 · 루프 v1.08 | ✅(맥 화면 확인 남음) |
| VD-R-B | 실행기 1.30 `normalize`·`compress` + 합치기 연결 | `0492b0cbb`·`72bfaa11f`·`3b94adc78` · 렌더 v1.24 · AI 영상 v1.17 | ✅(맥 터미널 확인 완료, 화면 남음) |
| VD-R-C | 갤러리 카드 「⚡ 내 PC로」 GIF·작게 | `a354d4c56` · AI 영상 v1.18 | ✅ |
| VD-P1 | 영상 프롬프트 게시판 B안 → A안(관리자 편집·내 프롬프트) | `363fc5b6e`·`79d6aed00` · AI 영상 v1.14·v1.19 | ✅(관리자 화면 확인 완료) |
| VD-P2 | 게시판 진행 중 배지 | `5b2c589b5` · AI 영상 v1.20(디자인 리뉴얼 배포에 함께) | ✅ |
| VD-G | GIF 구간·ZIP·썸네일·구간 막대·상세페이지 보내기·속도·진행률·fps 단계·내 PC 고속 변환 | 렌더 v1.11~v1.21(이커머스 담당·맥미니) | ✅ |
| VD-G25 | 이름 「AI 영상렌더 스튜디오」·매뉴얼 7요소·다운로드 센터 | `25666cd82`~`6416d74e5` · 렌더 v1.25(agy) | **배포 기록 확인 필요**(아래 VD-D1) |

## 대기·후속 (담당 세션 대기 목록 그대로)

| ID | 대상과 범위 | 선행·기다리는 것 | 현재 상태 |
|---|---|---|---|
| VD-W1 | 내 PC 렌더러 1.30 맥 크롬 화면 3곳(루프 `/studio`·AI 영상 `/edit`·`/library`) | 맥미니 크롬 프로필에 확장 불러오기 + 시험 계정 로그인(주인님) → 맥미니 세션 | 대기 — 터미널 시험은 통과(`video-to-gif/AGENTS.md` v1.24 맥 확인 절) |
| VD-W2 | 갤러리 「작게 줄이기(720)」 화질 — 「작게」(0.3MB) 유지 / 「균형」(0.5MB) | 주인님 결정(비교 파일 `D:\PDS\영상화질비교_20261024`) | 결정 대기 |
| VD-W3 | 갤러리 목록 불러오기 약 5.7초 → 원인 찾아 줄이기 | 착수 승인(빌드 1회, VD-W2와 묶기 가능) | 승인 대기 |
| VD-W4 | 영상 D — Shots·원스톱 완성본에 내 PC 「용량 줄이기」 | 빌드 2회 승인 | 승인 대기 |
| VD-W5 | 로드맵 4단계 `trim`·`concat`(뮤직비디오 쇼츠 하이라이트·AI 영상 잇기) | 앞 단계 뒤, 뮤직비디오는 음악 담당과 조율 | 대기 |
| VD-W6 | 2.0 플랜 `scale`·`probe` 명령, `video-to-gif` 웹 연결을 공용 `pc-renderer-client`로 | 2.0 플랜 승인 | 대기 |
| VD-W7 | 로드맵 5단계 남은 몫 — 원스톱 내레이션 음량 맞춤(영상 담당 쪽) | 담당 순서 | 대기 |
| VD-W8 | 로드맵 6단계 `frames`(가사 영상 길이 제한 해제 등) | 효과 측정 뒤 | 검토 |
| VD-W9 | 공용 `browser-ffmpeg` 등록만(루프 `getFFmpeg` 기준, 코드 변경 없음) | 없음(문서 작업) | 미진행 — [SHARED_MODULES.md](SHARED_MODULES.md)에 이름 없음 |
| VD-W10 | AI 영상 3차 — 립싱크·업스케일·배경 제거·9:16 자동 맞춤·Runway/Vidu | 주인님 순서 결정 | 대기(`IMPROVEMENT_BACKLOG.md`) |
| VD-W11 | AI 영상 확인 단계에 남은 크레딧 안내 링크 | 다음 배포 때 | 제안(`IMPROVEMENTS.md` 2절) |
| VD-W12 | R1 남은 확인 — 휴대폰 촬영 영상, 1080p·16:9 운영 렌더 시간, 느린 PC | 주인님 휴대폰 파일 | 미확인(`IMPROVEMENTS.md` 2차-가) |
| VD-W13 | 루프 개선 원장 #4(화면 파일 나누기)·#5(쇼츠·뮤직비디오 배경으로 넘기기)·#6(방식별 예시 GIF)·#7(로그인 2탭) + 크로스페이드 실시간 미리보기·밝기 보정·분석 Web Worker | 담당 판단 | 제안 |
| VD-W14 | 보류 묶음 — `mp4-muxer` → Mediabunny, 플레이리스트·LP 인코더 교체, Shots JSON2Video 유지 | 그 프로그램을 고칠 때 | 보류(무료 플랜 §9) |

## 문서·기록 정리 (코드 변경 없음, 담당 세션 확인용)

| ID | 내용 | 근거 | 상태 |
|---|---|---|---|
| VD-D1 | `video-to-gif` v1.25 배포 여부 — `AGENTS.md` 표는 「배포 준비」, `DESIGN.md`는 「✅ 1차 작업완료(v1.25)」, [PENDING_DEPLOYS.md](PENDING_DEPLOYS.md)에는 v1.25 줄이 없다. 저장소의 `manifest.json`·`version.json`은 이미 v1.25 | `video-to-gif/AGENTS.md` 18행, `DESIGN.md` 210행 | 확인 필요(Vercel·DB `programs.version`·`check-extension-release`) |
| VD-D2 | `infinite-loop-video/AGENTS.md` 1절 표가 v1.03·카테고리 「멀티미디어」로 남음(실제 v1.08·「영상」). 외부 개발분석표 EXT-MM-02는 「AGENTS.md 표는 v1.01」이라 적어 둘 다 어긋남 | `infinite-loop-video/AGENTS.md` 1절, `docs/EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md` EXT-MM-02 | 정리 후보 |
| VD-D3 | `ai-video-studio/AGENTS.md` 3절 모델 목록에 Kling v2.1이 남음(v1.15에서 제거) | `ai-video-studio/AGENTS.md` 3절 「모델(1차-가)」 | 정리 후보 |
| VD-D4 | `video-to-gif/AGENTS.md` 3절 「8단계 화질 사다리」 — 코드는 v1.19부터 10단계(fps 25·20 추가). 4절 템플릿 이름(크리에이티브 아틀리에·「v1.10 GIF LAB」)이 1절·`DESIGN.md`(시네마틱 렌더 스튜디오)와 다름 | `video-to-gif/lib/gifLadder.ts` `CANDIDATES` | 정리 후보 |
| VD-D5 | `ai-video-studio/docs/IMPROVEMENT_BACKLOG.md` 게시판 A안 줄 「관리자 화면 편집 확인만 남음」 — 역할 파일·`AGENTS.md` v1.19는 확인 완료 | `docs/roles/video.md` 최근 완료 | 정리 후보 |
| VD-D6 | 역할 파일 카테고리 「유튜브·멀티미디어(영상)」 — 카테고리 지도는 「영상」 | `docs/roles/video.md`, `docs/CATEGORY_GUIDE_MAP.md` | 정리 후보 |
| VD-D7 | `video-to-gif/components/LocalRendererHub.tsx` 「공식 최신 v1.25 (Host 1.30)」 글자 고정 — 다음 판에서 `version.json`과 어긋날 수 있음 | 같은 파일 82·183·219행 | 작은 수정 후보(미배포 대기로 모을 것) |

## 항목마다 지킬 완료 조건

1. 착수 직전 `docs/ACTIVE_WORK.md`·미커밋 변경·역할 파일·최신 인수인계를 확인하고 **대상 프로그램 하나씩** 진행한다. `ai-video-studio`는 디자인 세션(agy)이 작업 중일 수 있으니 작업 중 표를 먼저 본다. 실행기(`host.ps1`·`host.pl`)는 음악 담당과 함께 고치므로 **명령 하나 = 커밋 하나**, `HOST_VERSION`은 먼저 올린 쪽 다음 번호(+0.10).
2. 코드를 고치기 전에 문제·범위·순서·검수·비용·버전/배포·인수인계 산출물을 플랜으로 제시한다(프로그램 `docs/PLAN_YYYYMMDD_*.md`). 이미 있는 기능은 [비교표](VIDEO_FEATURE_MATRIX.md)로 확인해 중복 구현하지 않는다.
3. 무료·모의 검사부터 하고, 유료 영상 생성 시험은 시험 계정 본인 키로 승인된 횟수만(가장 짧은 길이·낮은 해상도·소리 끔, 이미 만든 클립 재사용).
4. 회원 본인 키만, 회원별 비공개 저장, 생성일 기준 30일 정리, 유료 접수 재시도 없음을 지킨다. 영상 프롬프트는 프로그램 고유로 두고, 공용 사본은 기준만 고친 뒤 `--sync`(다른 세션 사본을 덮지 않는지 먼저 확인 — v1.15 사례).
5. 작은 수정은 「미배포 대기」로 모았다가 배포하고, 배포는 팀 전체에서 한 번에 하나씩 한다. 버전은 실제 배포 때 한 번만 올린다(코드 `lib/version.ts` + DB `programs.version`). 렌더러를 바꾸면 manifest·ZIP·`version.json`·DB `extension_version`을 함께 맞추고 `check-extension-release` OK를 확인한다.
6. 완료 시 이 표의 상태·근거 커밋, 비교표 칸·변경 이력, 프로그램 `AGENTS.md`·`docs/IMPROVEMENTS.md`, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드, 루트 `docs/HANDOFF.md`(제목에 `[역할: video]`), 역할 파일을 갱신한다.

## 새 기능·개선점을 발견했을 때

- 발견한 프로그램의 `docs/IMPROVEMENTS.md`에 날짜·세션·근거 파일·영향·우선순위·상태를 적고, 이 문서 「대기·후속」에 한 줄 추가한다.
- 공통 아이디어 표([`PROGRAM_IDEA_BACKLOG.md`](PROGRAM_IDEA_BACKLOG.md), 영상 항목 `IDEA-VIDEO-*`·`IDEA-PCR-*`)에서 중복을 먼저 확인한다.
- 외부 참고 원본이 있으면 [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md)에 카드를 추가한다(영상 관련 기존 카드: EXT-MM-01 Supertonic, EXT-MM-02 Seamless Loop Studio).

## 주인님께 여쭐 것 (담당 세션 확인 뒤 역할 파일로 옮길 후보)

- `video-to-gif`의 담당 정리 — 렌더러 본체는 영상 담당, 화면은 이커머스 담당(2.0 플랜), v1.25 리뉴얼은 agy가 했다. 이제 「영상」 카테고리로 옮겨졌으니 화면까지 영상 담당이 맡을지.
- VD-U1(멈춘 생성 행 정리) 운영 DB 읽기 확인을 진행할지.

## 프로그램 주소

https://ai-video-studio.buylife.xyz

https://infinite-loop-video.buylife.xyz

https://video-to-gif.buylife.xyz

## 변경 이력

| 날짜 | 바뀐 것 | 작성 |
|---|---|---|
| 2026-10-24 | 문서 처음 작성(초안) — 역할 파일 대기 4줄·로드맵 3-0·무료 렌더 플랜 §9·2.0 플랜·개선 원장으로 우선 처리 3줄·완료 12줄·대기 14줄·문서 정리 7줄 정리 | Claude Code(윈도우) `claude-win-dotori` [역할: analysis-planning] |
