# 📋 CRM Google Form — 구글폼 신청접수 자동 응대 시스템

구글폼(신청서/설문지/참가신청/상품문의 등)에 새 응답이 들어오면, 신청자에게 접수 확인
이메일·문자·카카오 알림톡·카카오 친구톡을 자동으로 보내고, 운영자 본인 텔레그램으로도
신청 내역을 요약해 전달하는 CRM 자동화 프로그램입니다.

**배포 URL**: https://crm-google-form.vercel.app (Vercel 프로젝트: `buylife/crm-google-form`)

기존에 Make.com으로 운영하던 자동화 시나리오
(`D:\PDS\@GoogleForm(신청접수)-Gmail-SOLAPI(SMS)-SOLAPI(알림톡)-SOLAPI(친구톡)-Telegram.blueprint.json`)를
AIMaster 서브프로젝트로 이식한 것입니다 — 원본은 특정 구글 계정 하나가 폼 하나만 감시하는
단일 사용자 구조였지만, 이 프로그램은 AIMaster 회원 각자가 자기 구글폼을 연결해서 쓸 수 있는
멀티테넌트 구조로 다시 설계했습니다. 설계 배경과 원본 시나리오에서 발견한 이슈는
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 참고.

---

## 🎯 핵심 흐름

```
회원의 구글폼 응답
  → (구글시트 연동 + Apps Script 웹훅으로 실시간 감지)
  → 접수 내역 저장/대시보드 표시
  → 신청자에게: 이메일(SMTP) / SMS(SOLAPI) / 카카오 알림톡(SOLAPI) / 카카오 친구톡(SOLAPI) 자동 발송
  → 운영자 본인 텔레그램으로 신청 내역 요약 알림
```

## 📦 Phase 진행 상태

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | 구글폼 연동(시트+Apps Script 웹훅), 접수 내역 대시보드, 운영자 텔레그램 알림(real_estate_sales 패턴 재사용), 신청자 이메일(SMTP) 자동발송 | ✅ 구현 완료 (2026-08-18) |
| 2~3 | SOLAPI 문자(SMS) · 카카오 알림톡 · 카카오 친구톡 발송 (공식 `solapi` Node SDK 사용, 사용자 본인 SOLAPI 계정/카카오 채널·템플릿 등록 필요) | ✅ 구현 완료 (2026-08-18) |
| 4 | 접수 후 N일 경과 팔로우업 자동화(SOLAPI CRM 자동화 사례 벤치마킹) — 폼별로 "N일 후 안내/만족도 조사" 규칙을 여러 개 등록, 매일 도는 cron이 조건에 맞는 접수건에 자동 발송 | ✅ 구현 완료 (2026-08-18) |

한 번에 다 만들지 않고 Phase별로 하나씩 붙여나간다(music/shop-detail-page/stepmail과 동일한 방식).
새 Phase를 시작할 때는 이 표를 갱신할 것.

## 📚 참조 문서
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): 구글폼 연동 설계, SOLAPI 자격증명 모델, DB 스키마, 원본 시나리오 이슈 목록
- [AGENTS.md](AGENTS.md): AI Agent 작업 지침서
- [CLAUDE.md](CLAUDE.md): 개발 환경 가이드
