# 디자인 개발완료 인수인계 — Threads 댓글자동화 (v1.10)

- **적용 템플릿**: **스튜디오 댓글 콘솔 — 쓰레드 모노 변형** — `youtube-auto-reply` v1.09(유튜브 다크 콘솔 — 스튜디오 댓글 콘솔 변형)의 구성·부품을 이식하고 색만 Threads 다크 흑백으로. 기준: [`youtube-auto-reply/docs/DESIGN_HANDOFF.md`](../../youtube-auto-reply/docs/DESIGN_HANDOFF.md)
- **작업**: Claude Code(맥미니), 2026-10-17 · 주인님 승인(「진행해줘」) · 상태: 🟠 메인(윈도우) CLI 마무리 작업요망
- **라이브**: https://threads-comment-reply.buylife.xyz

## 1. 토큰 (`tailwind.config.ts` → `th-*`, Tailwind v3)
`bg #101010` · `surface #181818` · `raised #262626` · `hover #2f2f2f` · `border #333333` · `text #f3f5f7` · `muted #999999` · **`primary #f3f5f7`(흰 알약 버튼 + 검은 글자 — Threads 「게시」 버튼 모양)** · `link #0095f6` · `success #2ba640` · `warn #f9ab00` · `danger #ff4e45`
- 부품: `.th-btn-primary` · `.th-btn` · `.th-card` · `.th-section-title` · `.th-chip`, `components/ui/ThLogo.tsx`(흰 둥근 사각형 + 검은 「@」, 공식 로고 미사용), `components/ui/StudioHeader.tsx`(youtube-auto-reply와 같음 — `StatCard` 강조색만 링크 파랑)
- 원래 파랑·보라 그라데이션 버튼은 전부 흰 알약 + 검은 글자로 자동 변환(주의: 일괄 치환 때 `hover:bg-white`가 `bg-white` 규칙에 걸려 어두워졌던 것을 바로잡음).

## 2. 화면
| 화면 | 내용 |
|---|---|
| 사이드바 | 로고 + 「Studio · 버전」, 선택 항목 왼쪽 흰 막대, STEP 1 🧵 게시물 관리 · 2 💬 댓글 검토(대기 수 흰 배지), 📊 이력 · 🔑 설정 · 📖 매뉴얼, **휴대폰 위쪽 바 + ☰(신규)** |
| 🏠 `/dashboard`(신규, `/` 기본 이동) | 계정 배너(@아이디·마지막 확인·자동 게시) · 지표 4 · 대기 댓글 3(아바타) · 연결 상태 5(쓰레드 계정·Threads 앱 ID·AI 키·텔레그램·예약 모니터링) · 동작 4단계 |
| 💬 댓글 검토 | 게시물별 카드 안에 쓰레드 답글 모양(아바타·@작성자 → 들여쓴 「↳ 내 답글 · AI 초안」 + 회색 답변제외 / 흰 답변승인·게시) |
| 🧵 게시물 / 📊 이력 / 🔑 설정 | 스튜디오 머리말 + 다크 카드(설정의 Meta 주소 카드·기능 그대로) |
| 📖 `/guide`(신규) | 캐릭터 · 5단계(Meta 앱 → 계정 연결 → AI 키 → 게시물 동기화 → 승인) · 예시 화면 · TIP/주의 · 매뉴얼 팝업 5 · FAQ 4(앱 ID 혼동·텔레그램 봇 충돌 포함) |
| 로그인·회원가입 | `#101010` + 흰 빛, 로고, 흰 알약 탭·버튼(로딩 표시 검은색) |

## 3. 주의
- OAuth·Meta 주소·댓글 수집·게시·Cron·텔레그램·DB 변경 없음.
- 검수 때 「답변승인」(실제 게시)·「지금 새 댓글 확인하기」(AI 비용)·「동기화」는 누르지 않는다.

## 4. 배포·검수 기록
| 항목 | 값 |
|---|---|
| 정적 검사 | 맥미니 `tsc --noEmit` 오류 0 |
| 빌드·배포 | ✅ 윈도우 Antigravity (`npm run build` 성공, `vercel deploy --prod --yes` 성공, alias `threads-comment-reply.buylife.xyz` 연결 완료) |
| DB `programs.version` | ✅ `v1.10` 업데이트 완료 |
| 화면 검수 | ✅ Microsoft Edge 전용 실세션 검수 완료 (1440px 데스크톱 및 375px 모바일 캡처 보존, ☰ 모바일 메뉴, 대시보드, 가이드, 댓글 검토 확인. 답변승인/새댓글확인/동기화 누르지 않음) |

