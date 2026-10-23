# 개발 플랜 — INSTA DM답변 자동화 (v1.14 3대 고도화 기능 구현)

- **작성일**: 2026-10-17
- **작성자**: Antigravity CLI (agy, Windows)
- **대상 프로그램**: `instagram-dm-reply` (https://instagram-dm-reply.buylife.xyz)
- **현재 버전**: v1.13 → **목표 버전**: v1.14

---

## 1. 목적 및 배경
주인님 지시사항에 따라, INSTA DM답변 자동화의 실사용 효용과 운영 안정성을 극대화하기 위해 다음 3대 추가개선 항목을 고도화합니다:
1. **24시간 응답 기한 임박(4시간 미만) 미응답 DM 텔레그램 긴급 알림 기능**: Meta 정책상 24시간 초과 시 API 응답 불가 문제를 사전에 방지.
2. **DM 검토 카드 내 이전 대화 스레드 맥락(최근 2~3건) 표시**: 단건 메시지만으로는 파악하기 힘든 고객과의 대화 맥락을 카카오톡/인스타 DM 스레드 형태로 시각화.
3. **INSTA 댓글자동화(`instagram-comment-reply`)와의 연계/시너지 체계 구축**: 동일 Meta 앱 ID 활용 안내 및 사이드바/대시보드 상호 연계 바로가기 제공.

---

## 2. 작업 범위 및 세부 구현 내용

### ① 로직·기능: 24시간 4시간 미만 기한 임박 텔레그램 긴급 알림
- **대상 파일**: `app/api/cron/check-connection/route.ts`, `lib/telegram/client.ts`, `app/(dashboard)/dashboard/page.tsx`
- **구현 내용**:
  - `checkImpendingDMs(admin)` 함수 구현:
    - `dm_messages` 중 `status = 'pending_review'`이고 `direction = 'in'`인 메시지 확인
    - 연관된 `dm_conversations`의 `last_inbound_at` 기준 남은 시간 계산
    - `0 < 남은시간 <= 4시간`인 대화가 감지되면, 회원의 개인 텔레그램 봇으로 긴급 알림 발송:
      `⚠️ [DM 기한 임박] @고객명 고객과의 24시간 응답 기한이 {X}시간 {Y}분 남았습니다! 지금 바로 검토 후 승인해 주세요.`
  - 대시보드 화면 상단에도 4시간 임박 대화 존재 시 눈에 띄는 앰버/오렌지 긴급 배너 표출.

### ② UI·편의성: DM 검토 카드에 고객과의 직전 대화 2~3건 스레드 맥락 표시
- **대상 파일**: `app/(dashboard)/conversations/page.tsx`, `components/conversations/ConversationReviewItem.tsx`
- **구현 내용**:
  - 대화 목록 조회 시 `dm_messages`에서 해당 `conversation_id`의 최근 히스토리(수신/발신 포함 직전 3건)를 함께 fetch.
  - `ConversationReviewItem` 상단에 "💬 이전 대화 맥락" 아코디언/스레드 영역을 추가:
    - 이전 고객 메시지: 좌측 연회색 말풍선
    - 이전 관리자/AI 발송 답장: 우측 연하늘색 말풍선
    - 시간 및 내용 표시로 맥락을 즉시 파악 후 아래 초안 검토 가능.

### ③ 다른 프로그램과의 연계: INSTA 댓글자동화(`instagram-comment-reply`) 교차 연계
- **대상 파일**: `components/layout/Sidebar.tsx`, `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/guide/page.tsx`
- **구현 내용**:
  - 사이드바 하단에 `🔗 연계 프로그램` 메뉴 그룹 추가: `💬 INSTA 댓글자동화` 바로가기 링크.
  - 대시보드에 `💡 댓글·DM 옴니채널 연계 안내` 카드 탑재.
  - 매뉴얼에 Meta 앱 ID 공동 사용 및 댓글 유입 고객의 DM 대응 팁 보강.

---

## 3. 구현 순서
1. **플랜 문서 작성 및 승인 보고**: 본 플랜 작성 후 사용자께 안내.
2. **대화 스레드 히스토리 데이터 조회 및 UI 구현**:
   - `conversations/page.tsx` 및 `ConversationReviewItem.tsx` 수정.
3. **4시간 임박 텔레그램 긴급 알림 및 대시보드 긴급 배너 구현**:
   - `api/cron/check-connection/route.ts` 및 `dashboard/page.tsx` 수정.
4. **INSTA 댓글자동화 상호 연계 구현**:
   - `Sidebar.tsx`, `dashboard/page.tsx`, `guide/page.tsx` 수정.
5. **버전 업데이트**:
   - `lib/version.ts` `v1.14`로 변경.
6. **로컬 빌드 검증 (`npm run build`)**.
7. **Vercel 프로덕션 배포 및 DB `programs.version` `v1.14` 갱신**.
8. **Microsoft Edge 브라우저 실세션 검수 (데스크톱 및 모바일 375px)**.
9. **인수인계 문서 갱신 및 Git 커밋/푸시**.

---

## 4. 비용 및 안전 규칙
- **API 비용**: 0원 (기존 DB 쿼리 및 무료 텔레그램 Bot API 전송 활용, 유료 AI 호출 없음).
- **외부 발송 금지**: 화면 검수 시 「답변승인 · 발송」 버튼은 누르지 않음.
- **DB 스키마 변경**: 없음 (기존 테이블 구조 100% 호환 활용).
