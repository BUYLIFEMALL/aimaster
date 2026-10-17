# 디자인 개발완료 인수인계 — YOUTUBE CHANNEL CONSULTANT (v1.10)

- **적용 템플릿**: **유튜브 다크 콘솔 스타일 — 스튜디오 변형** — `youtube-viral-studio` v1.13과 같은 `globals.css`(`@theme` `yt-*` + `.yt-btn-red`/`.yt-card`/`.yt-chip`) · 같은 사이드바 구조. 기준: [`youtube-viral-studio/docs/DESIGN_HANDOFF.md`](../../youtube-viral-studio/docs/DESIGN_HANDOFF.md)
- **작업**: Claude Code(맥미니 v1.07) + 맥미니(v1.10 사이드바 긴 이름 두 줄 표시) + Antigravity(윈도우 빌드·배포·DB·포그라운드 Edge 실세션 검수), 2026-10-17 · 상태: ✅ 1차 작업완료 (v1.10, Windows 운영 검수 완료)
- **라이브**: https://youtube-channel-consultant.buylife.xyz

## 화면
| 화면 | 내용 |
|---|---|
| 사이드바 | 유튜브 로고 + 「YOUTUBE CHANNEL CONSULTANT / Studio · v1.10」(2줄 표시), 빨간 막대·STEP 1~3·휴대폰 ☰, 📖 매뉴얼 메뉴, 하위 경로 선택 표시 |
| 🏠 대시보드 | 채널 배너식 머리말 + 시작/매뉴얼 버튼, 기능 카드 3개·키 상태·쿼터 안내(초기화 시각 겨울철 5시 보강) |
| 분석 3화면·설정 | 색 토큰 일괄 치환 + 제목 크기. 기능·문구 그대로. CSS 차트 색 배열(`SHARE_COLORS`) 유지 |
| 📖 `/guide` | 캐릭터 · 4단계 · 숫자 읽는 법 · TIP/주의 · 키 매뉴얼 팝업 4개 · FAQ 4개 |
| 로그인 | `#0f0f0f` + 붉은 빛, 빨간 로고, 알약 탭·버튼 |

## 주의
- YouTube·AI 호출, 지표 계산, 내보내기 변경 없음. 검수 때 분석·AI 버튼은 누르지 않는다.

## 배포·검수 기록
| 항목 | 값 |
|---|---|
| 정적 검사 | 맥미니 `tsc --noEmit` 오류 0, 윈도우 `npm run build` 성공 |
| 빌드·배포 | 윈도우 Next16.2.11 빌드 통과 → `vercel deploy --prod` (`dpl_6G8exTR7tieFjaP79Y8KnyuVeCEi` → https://youtube-channel-consultant.buylife.xyz) |
| DB `programs.version` | `v1.10` 업데이트 완료 (Supabase) |
| 화면 검수 | Microsoft Edge 포그라운드(실제 화면 창 노출) 실세션 검수 완료 (데스크톱 1440px 및 모바일 375px 정상, 사이드바 긴 이름 두 줄 표시 확인, 대시보드·메뉴 확인. 분석·AI 버튼 미클릭) |
