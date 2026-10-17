# 디자인 개발완료 인수인계 — YOUTUBE CHANNEL CONSULTANT (v1.07)

- **적용 템플릿**: **유튜브 다크 콘솔 스타일 — 스튜디오 변형** — `youtube-viral-studio` v1.13과 같은 `globals.css`(`@theme` `yt-*` + `.yt-btn-red`/`.yt-card`/`.yt-chip`) · 같은 사이드바 구조. 기준: [`youtube-viral-studio/docs/DESIGN_HANDOFF.md`](../../youtube-viral-studio/docs/DESIGN_HANDOFF.md)
- **작업**: Claude Code(맥미니), 2026-10-17 · 주인님 승인(「진행해줘」) · 상태: 🟠 메인(윈도우) CLI 마무리 작업요망
- **라이브**: https://youtube-channel-consultant.buylife.xyz

## 화면
| 화면 | 내용 |
|---|---|
| 사이드바 | viral-studio 사이드바 이식(빨간 막대·STEP 1~3·휴대폰 ☰), **📖 매뉴얼 메뉴 추가**, 하위 경로도 선택 표시(`startsWith`) |
| 🏠 대시보드 | 채널 배너식 머리말 + 시작/매뉴얼 버튼, 기능 카드 3개·키 상태·쿼터 안내(초기화 시각 겨울철 5시 보강) |
| 분석 3화면·설정 | 색 토큰 일괄 치환(공통 스크립트) + 제목 크기. 기능·문구 그대로. CSS 차트 색 배열(`SHARE_COLORS`)은 다크에서도 잘 보여 유지 |
| 📖 `/guide`(신규) | 캐릭터 · 4단계 · 숫자 읽는 법(AGENTS §4 지표 정의 그대로) · TIP/주의 · 키 매뉴얼 팝업 4개 · FAQ 4개(쿼터 수치는 대시보드 안내와 동일) |
| 로그인 | `#0f0f0f` + 붉은 빛, 빨간 로고, 알약 탭·버튼(viral-studio와 동일) |

## 주의
- YouTube·AI 호출, 지표 계산, 내보내기 변경 없음. 검수 때 분석·AI 버튼은 누르지 않는다.

## 배포·검수 기록
| 항목 | 값 |
|---|---|
| 정적 검사 | 맥미니 `tsc --noEmit` 오류 0 |
| 빌드·배포 | 윈도우 `npm run build` 통과 → `vercel deploy --prod` 완료(2026-10-17, Claude Code 윈도우) |
| DB `programs.version` | v1.07 반영 완료 |
| 화면 검수 | 크롬, 시험 계정 `buylifemall@naver.com`. 1440px: 대시보드·채널 분석·키워드 분석·공략 채널 찾기·API키등록·매뉴얼 6화면 다크 일관, 키 상태 "연동 완료" 표시. 휴대폰: 크롬 창 최소 500px에서 ☰ 메뉴(데스크톱과 같은 항목·순서) 확인, 375px는 iframe으로 6화면 가로 넘침 없음(scrollWidth ≤ 375)·배경 rgb(15,15,15) 동일. 로그인 화면은 로그인 상태라 직접 보지 못하고 서버 HTML의 `bg-yt-bg` 토큰으로 확인. 분석·AI 버튼은 누르지 않음 |
