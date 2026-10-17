# 디자인 개발완료 인수인계 — INSTA 댓글자동화 (v1.14)

- **적용 템플릿**: **스튜디오 댓글 콘솔 — 인스타 라이트 변형** — `threads-comment-reply` v1.10의 화면·부품(사이드바·대시보드·댓글 검토·이력·매뉴얼)을 이식하고 색만 인스타그램 라이트로. 계열 기준: [`youtube-auto-reply/docs/DESIGN_HANDOFF.md`](../../youtube-auto-reply/docs/DESIGN_HANDOFF.md)
- **작업**: Claude Code(맥미니), 2026-10-17 · 주인님 승인(「진행해줘」) · 상태: 🟠 메인(윈도우) CLI 마무리 작업요망
- **라이브**: https://instagram-comment-reply.buylife.xyz

## 1. 토큰 (`tailwind.config.ts` → `ig-*`, Tailwind v3)
`bg #fafafa` · `surface #ffffff` · `raised #f2f2f2` · `hover #e9e9e9` · `border #dbdbdb` · `text #262626` · `muted #737373` · **`primary #0095f6`(인스타 파랑 알약 + 흰 글자)** / `primary-hover #1877f2` · `link #00376b` · `success #16a34a` · `warn #d97706` · `danger #ed4956`
- `.ig-gradient`(노랑→주황→분홍→보라→파랑 45°): 로고·프로필 테두리·선택 메뉴 막대·매뉴얼 캐릭터
- 부품: `.ig-btn-primary` · `.ig-btn` · `.ig-card` · `.ig-section-title` · `.ig-chip`, `components/ui/IgLogo.tsx`(그라데이션 + 흰 💬, 공식 로고 미사용), `components/ui/StudioHeader.tsx`(`Avatar`는 인스타 스토리처럼 그라데이션 테두리)

## 2. 화면
| 화면 | 내용 |
|---|---|
| 사이드바 | 로고 + 「Studio · 버전」, 선택 항목 왼쪽 그라데이션 막대, STEP 1 🖼️ 게시물 · 2 💬 댓글 검토(대기 수 파랑 배지), 📊 이력 · 🔑 설정 · 📖 매뉴얼, **휴대폰 ☰(신규)** |
| 🏠 `/dashboard`(신규, `/` 기본 이동) | 계정 배너(연분홍→흰), 지표 4, 대기 댓글 3, 연결 상태 5(인스타 계정·Instagram 앱 ID·AI 키·텔레그램·예약 모니터링), 동작 4단계 |
| 💬 댓글 검토 · 📊 이력 | threads v1.10과 같은 구성(게시물별 카드, 들여쓴 「↳ 내 답글 · AI 초안」, 파랑 「답변승인 · 게시」) |
| 🖼️ 게시물 · 🔑 설정 | 스튜디오 머리말 + 흰 카드(Meta 주소 카드·Instagram 앱 ID 안내 상자·기능 그대로) |
| 📖 `/guide`(신규) | 캐릭터 · 5단계(Meta 앱(Instagram 로그인 제품) → 계정 연결 → AI 키 → 동기화 → 승인) · 예시 화면 · TIP/주의 · 매뉴얼 팝업 5 · FAQ 4(**Invalid platform app = Facebook 앱 ID 혼동** 포함) |
| 로그인·회원가입 | `#fafafa` + 분홍 빛, 그라데이션 로고, 파랑 알약 탭·버튼 |

## 3. 주의
- OAuth·Meta 주소·썸네일 저장·댓글 수집·게시·Cron·텔레그램·DB 변경 없음.
- 검수 때 「답변승인」·「지금 새 댓글 확인하기」·「동기화」는 누르지 않는다.

## 4. 배포·검수 기록
| 항목 | 값 |
|---|---|
| 정적 검사 | 맥미니 `tsc --noEmit` 오류 0 |
| 빌드·배포 | 대기(윈도우) |
| DB `programs.version` | v1.13 → 배포 때 v1.14 |
| 화면 검수 | 대기(1440·375px) |
