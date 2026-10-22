# Step Mail 문자(SMS·LMS) 차수 발송 플랜 — v1.27 (2026-10-23, Claude Code 윈도우)

주인님 결정(2026-10-23): 채널은 **문자(SMS·LMS)만**(알림톡은 광고성 내용 심사 반려라 제외, 브랜드 메시지는 나중), 운영 DB 칸 추가·빌드 1회·실제 문자 1통 시험 승인.
근거: `docs/analysis-marketing-consolidation-20261023/REPORT.md` §3(독립 프로그램 확장 제안).

## 범위
| 단계 | 내용 |
|---|---|
| ① DB | `stepmail_leads.phone`(선택), `stepmail_campaigns.channel`('email'·'sms'·'both', 기본 'email')·`sms_text`·`sms_optout`, `draft_id` 빈칸 허용(문자 전용 캠페인), `stepmail_send_log.channel`·`to_phone`. 기존 행 변경·삭제 없음. |
| ② 엑셀 | 「전화번호·연락처·휴대폰·핸드폰」 열을 읽어 `010-1234-5678`로 맞춤. 고객 기준은 이메일 그대로. 파일에 전화 열이 없으면 기존 번호를 지우지 않음. |
| ③ 설정 | 「📱 SOLAPI 문자 계정」(공용 `user_solapi_accounts`, 예약 리마인드에서 연결했으면 그대로). 화면·저장 함수는 booking-reminder 것을 가져옴. |
| ④ 캠페인 | 채널 선택 + 문자 본문(`{닉네임}` 치환, 90바이트 넘으면 LMS) + 수신거부 안내(필수). 「(광고)」 머리말과 수신거부 문구는 발송 때 자동으로 붙음(정보통신망법 제50조). |
| ⑤ 발송 | 차수·시간·수량 규칙 그대로. 문자는 전화번호가 있는 고객만. 「둘 다」는 메일·문자 중 하나라도 성공하면 차수 +1. 기록은 채널별. |
| ⑥ 공용 코드 | `lib/solapi/client.ts`를 booking-reminder 것과 같게 복사(6곳 공용 모듈 등록은 별도 작업으로 기록). |
| ⑦ 검수 | 모의 시험 · tsc · build · 배포 · 크롬 · 관리자 본인 번호로 실제 문자 1통. |

## 비용
Vercel 빌드 1회 · 실제 문자 1통(관리자 본인 SOLAPI, 약 20~30원) · AI 0회.
