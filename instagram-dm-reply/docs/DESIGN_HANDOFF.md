# 디자인 개발완료 인수인계 — INSTA DM답변 자동화 (v1.14)

- **적용 템플릿**: **스튜디오 댓글 콘솔 — 인스타 라이트 변형 (DM 대화 화면)** — `instagram-comment-reply` v1.14와 같은 `ig-*` 토큰·`globals.css`·`IgLogo`·`StudioHeader`·사이드바, 검토 화면만 인스타 DM 말풍선. 기준: [`instagram-comment-reply/docs/DESIGN_HANDOFF.md`](../../instagram-comment-reply/docs/DESIGN_HANDOFF.md)
- **작업**: Antigravity(윈도우), 2026-10-17 · 주인님 승인(「진행해」) · 상태: ✅ 1차 작업완료 (v1.14, 3대 추가개선 완료)
- **라이브**: https://instagram-dm-reply.buylife.xyz

## 1. 이 프로그램만의 화면 (v1.14 고도화)
| 화면 | 내용 |
|---|---|
| 사이드바 | 로고 「DM답변 자동화 Studio · v1.14」, 🏠 대시보드 · 💬 DM 검토/발송(대기 배지) · 📊 발송 이력 · 🔑 설정 · 📖 매뉴얼, **🔗 연계 자동화(INSTA 댓글자동화 바로가기 ↗)**, 휴대폰 ☰ |
| 🏠 `/dashboard` | **⚠️ 4시간 이내 기한 만료 임박 긴급 배너(신규)** · 계정 배너 · 지표 4 · 답장 기한 가까운 대화 · 연결 상태 5 · **💬 INSTA 댓글자동화 옴니채널 연계 시너지 카드(신규)** |
| 💬 DM 검토/발송 | **💬 이전 대화 스레드 맥락(최근 2~3건 아코디언/말풍선 스레드, 신규)** → 고객 신규 수신 메시지(좌측 회색 말풍선) → 내 답장 초안(우측 파랑 말풍선 수정칸) + 24시간 배지 |
| 📊 발송 이력 | 같은 말풍선 모양 + 「✓ 발송됨」 |
| 📖 `/guide` | 5단계 파이프라인 · 예시 대화 · 5종 연결 매뉴얼 · FAQ 5종(**INSTA 댓글자동화 연계 질문 신규**) · **하단 INSTA 댓글자동화 추천 연계 섹션(신규)** |
| 설정·로그인 | 스튜디오 머리말 + 흰 카드, 인스타 라이트 로그인 |

## 2. 주의
- DM 웹훅 수신·echo 필터·자동 응답 고지·24시간 규칙·발송·텔레그램·DB 구조 변경 없음.
- `api/cron/check-connection`에 4시간 미만 기한 임박 미응답 대화 감지 시 텔레그램 긴급 알림 로직 통합.
- 검수 때 「답변승인 · 발송」은 실제 고객에게 DM이 나가므로 누르지 않는다.

## 3. 배포·검수 기록
| 항목 | 값 |
|---|---|
| 정적 검사 | 윈도우 `npm run build` 오류 0건 통과 |
| 빌드·배포 | Vercel 프로덕션 배포 완료 (`dpl_8BzZNCPCoDJrsimJkEhoH1ybJK4v` → https://instagram-dm-reply.buylife.xyz) |
| DB `programs.version` | v1.13 → v1.14 업데이트 완료 (Supabase) |
| 화면 검수 | Microsoft Edge 실세션 검수 완료 (데스크톱 1440px, 모바일 375px 정상 / 대시보드 긴급배너·스레드맥락·연계카드·매뉴얼) |

