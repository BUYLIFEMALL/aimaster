# 개선사항 원장 — 무한루프 영상자동화 (infinite-loop-video)

> 2026-10-17 Claude Code(맥미니)가 `web-crawler` v1.07 작업 중 타 프로그램 탐색(원칙 ⑫)으로 선제 기록. 2026-10-17 디자인 리뉴얼 v1.05(크리에이티브 아틀리에 · 네온 루프 시네마)에서 #1~#3 반영.

| # | 발견일 | 구분 | 내용 | 근거 | 우선순위 | 상태 |
|---|---|---|---|---|---|---|
| 1 | 2026-10-17 | ② UI·편의성 | 기본 흰 화면(Next 기본 `globals.css`) — 영상 작업 성격에 맞는 크리에이티브 아틀리에(다크 캔버스) 권장 | `src/app/globals.css` | 중간 | ✅ 구현(v1.05, 배포 대기) |
| 2 | 2026-10-17 | ② UI·편의성 | 매뉴얼(`/guide`)이 글 목록뿐 — 메뉴 이름도 「사용 안내」(표준은 「📖 연동 & 사용 매뉴얼」), 그림·다이어그램·FAQ 없음(원칙 ⑦·25) | `src/app/(dashboard)/guide/page.tsx`, `Sidebar.tsx` 17행 | 중간 | ✅ 구현(v1.05, 배포 대기) |
| 3 | 2026-10-17 | ② UI·편의성 | 대시보드가 없고 첫 화면이 바로 작업 화면 — 방식 3가지(스마트 루프·강제 오버랩·바운스) 예시 미리보기 카드가 있으면 고르기 쉬움 | `src/app/(dashboard)/studio/page.tsx` | 낮음 | 일부 구현(v1.05: 방식 3가지 도식 카드. 대시보드·실제 예시 영상은 미구현) |
| 4 | 2026-10-17 | ① 로직·기능 | 작업 화면 `LoopTool.tsx` 311줄 한 파일 — 업로드·분석·내보내기 단계별로 나누면 유지보수 쉬움 | `src/components/tool/LoopTool.tsx` | 낮음 | 제안 |
| 5 | 2026-10-17 | ③ 타 프로그램 연계 | 브라우저 안에서만 처리(서버·키 불필요)라 무료 유입용으로 좋음 — 만든 루프 영상을 쇼츠·뮤직비디오 프로그램 배경으로 넘기는 버튼 제안 | `shorts-onestop-studio`, `music-video-studio` | 낮음 | 제안 |

- 휴대폰 ☰ 메뉴는 이미 있음(`Sidebar.tsx` 118행) — 리뉴얼 때 유지.
| 6 | 2026-10-17 | ② UI·편의성 | 루프 방식 도식이 막대 그림뿐 — 방식별 실제 짧은 예시 영상(GIF)을 넣으면 더 직관적 | `src/components/ui/LoopModeDiagram.tsx` | 낮음 | 제안 |
| 7 | 2026-10-17 | ① 로직·기능 | 로그인 화면이 별도 틀(`(auth)/layout`) 없이 단독 — 다른 프로그램의 2탭(로그인·회원가입 안내) 표준과 다름 | `src/app/(auth)/login/page.tsx` | 낮음 | 제안 |
- ~~미배포 대기(2026-10-23, 커밋 `22c6cda35`) 좌측 메뉴 계정 위치~~ ✅ v1.06(2026-10-23 17:43 보안 배포)에 이미 실려 나감 — 2026-10-24 운영 크롬에서 메뉴 클래스 `min-h-0 shrink overflow-y-auto`·계정이 마지막 메뉴 아래 25px(화면 765px 맨 아래 아님) 확인.

## 2026-10-23 Claude Code(윈도우) — Next.js 보안 업데이트 (세션 claude-win-20261023-next-security)
- v1.06 배포(Next.js 16.4.2 보안 업데이트, 빌드 명령 `next build --webpack` — Turbopack이 `@ffmpeg/ffmpeg` Worker를 못 풂). ~~남은 일: 크롬 변환 확인~~ ✅ 2026-10-24 — ffmpeg Worker 정상(소리 있는 영상 변환·다운로드 성공). 대신 아래 소리 없는 영상 실패 버그 발견. 상세·명령: [`docs/HANDOFF_20261023_NEXTJS_SECURITY_SPLIT.md`](../../docs/HANDOFF_20261023_NEXTJS_SECURITY_SPLIT.md)
- **~~소리 없는 영상은 크롬에서 항상 실패~~ ✅ v1.07 수정·운영 확인(2026-10-24, 커밋 `2fb360453`)** — `browser.ts`가 변환 직전 `ffmpeg -i` 기록으로 소리 트랙을 직접 확인(`plan.ts` `hasAudioStream`), 운영 크롬에서 소리 없는 4초 MP4 → 0.8MB 성공, 소리 있는 MiniMax 원본 → 4.5MB(소리 트랙 유지) 성공. (발견 당시 기록:) — `src/components/tool/LoopTool.tsx` 82행 `anyV.audioTracks ? … : anyV.mozHasAudio ?? true`가 크롬(둘 다 없음)에서 늘 `true` → 소리 없는 영상에도 `[0:a]atrim…` 필터(`src/lib/loop/plan.ts`)를 붙여 ffmpeg 실패, 화면 「루프 만들기에 실패했습니다…」. 근거: 소리 없는 4초 MP4(AI 영상 스튜디오 예시) 실패 2회, 소리 있는 MiniMax H3 원본(aac)은 같은 화면에서 성공(`infinite-loop.mp4` 4.5MB). AI 영상 모델 결과 8개 중 7개가 소리 없음 → 회원 피해 큼. 다음 첫 단계: `src/lib/loop/browser.ts`에서 ffmpeg로 입력의 소리 트랙을 직접 확인(`-i` 로그의 `Audio:`)해 `hasAudio`를 정하고, 시험 추가 → 배포(회원 기능 실패라 바로 배포 예외).
