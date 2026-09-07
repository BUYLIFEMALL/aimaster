# 📨 카카오톡 정보 콘텐츠 자동화 (kakao_auto_poster)

관심 주제/키워드를 등록해두면, 관련 최신 뉴스·정보·정책·트렌드·분석 자료를 AI가 자동으로
찾아 정리해서 카카오톡 채널로 발송해주는 AIMaster 서브프로젝트입니다.

## 핵심 흐름 (Phase 1, 현재 구현)

1. `/settings`에서 본인 Perplexity/OpenAI 키를 등록
2. `/topics`에서 관심 주제 이름 + 관련 키워드(콤마 구분, 최대 10개)를 등록
3. 등록한 주제에서 "✨ 지금 생성" 버튼을 누르면:
   - Perplexity(`sonar-pro`)로 해당 주제/키워드 관련 최근 1~2주 뉴스·정책·트렌드를 검색
   - OpenAI(`gpt-4o-mini`)가 제목 + 카카오톡 발송용 짧은 요약(300자 이내) + 웹 리포트용
     전체 본문(1200~2000자)으로 구조화
4. `/reports`에서 생성된 리포트 목록/상세를 확인

## 설계 배경 — 왜 "카카오 채널"이고 "오픈채팅방"이 아닌가 (2026-09-07)

처음 이 프로젝트를 구상할 때는 "운영 중인 오픈톡방/카카오채널에 정기 포스팅"을 목표로
잡았다. 조사 결과:

- **카카오톡 오픈채팅방에는 외부 봇/webhook 연동용 공식 API가 없다.** 카카오 공식 문서
  (developers.kakao.com/docs/latest/kakaotalk-channel) 기준으로 카카오톡 채널 API는 친구
  관계 조회·고객파일(타겟 메시지용) 관리·메시지 발송만 제공하고, 오픈채팅방 콘텐츠 자동
  게시 기능은 없다. 오픈빌더도 카카오 채널에만 연동되고 오픈채팅방엔 연동되지 않는다.
- Make.com 등 노코드 툴의 카카오 관련 앱도 SOLAPI 하나뿐이고 메시지 발송(알림톡/브랜드메시지)
  기능만 제공한다 — 채널 피드나 오픈채팅방 포스팅 모듈 자체가 없다.
- `node-kakao` 같은 커뮤니티 비공식 라이브러리는 카카오 PC/모바일 클라이언트를 리버스엔지니어링해서
  흉내내는 방식이라, 카카오 이용약관 위반으로 **계정 영구정지 실사례**가 있다. 이 저장소는
  "공식 API + BYOK만 사용, 비공식 스크래핑/계정 자동화는 배제"하는 원칙(`trending-product-finder`가
  공식 API 없는 소싱처를 전부 제외했던 것과 동일 기준)을 이미 확립해왔고, 정지되면 회원 본인의
  실제 카톡 계정이 막히는 리스크까지 있어 이 방향은 채택하지 않았다.

반면 **카카오톡 "채널"** 메시지 발송(친구톡→2026-01-01부로 브랜드메시지로 자동 대체 /
알림톡)은 공식 API로 지원되고, AIMaster의 여러 서브프로젝트(`trending-product-finder`,
`crm-google-form`, `booking-reminder`, `real_estate_sales`)가 SOLAPI 경유로 이미 실사용
검증까지 마쳤다. 그래서 이 프로젝트는 **카카오톡 채널 발송**을 실제 배포 채널로 삼는다 —
오픈채팅방은 (원한다면) 그 안에 채널 링크를 걸어두는 안내 용도로만 쓸 수 있다.

## 재사용한 기존 패턴

- **콘텐츠 수집+생성**: `insta_auto_poster/src/lib/ai/collector.ts`의 Perplexity 검색 +
  OpenAI 구조화 2단계 패턴을 그대로 가져왔다. 다만 "인스타그램 SNS 캡션"이 아니라 "뉴스/정보
  콘텐츠"에 맞게 시스템 프롬프트를 바꿨고, 캡션(해시태그 포함 완성글) 대신 title/summary(카카오
  발송용)/content(웹 리포트용) 3필드로 구조화하도록 바꿨다(카카오 메시지 글자수 제약 때문에
  전체 분량은 웹 페이지에, 압축 요약만 메시지로 보내는 설계 — `trending-product-finder`의
  `buildReportText()`와 동일한 이유).
- **DB/RLS/멀티테넌시 골격**: `insta_auto_poster/src/lib/access.ts`(`requireProgramAccess`/
  `checkProgramAccessApi`), `resolveApiKey()`(공용 `user_api_keys`, 관리자 키 폴백 없음),
  Sidebar/레이아웃 구조를 그대로 복사해서 `THIS_PROGRAM_SLUG`만 `kakao-auto-posting`으로
  교체했다.
- **카카오 채널 발송**: `trending-product-finder`/`crm-google-form`이 만든 공용
  `user_solapi_accounts` 테이블과 `lib/solapi/client.ts`(`sendFriendtalk`/`sendAlimtalk`)를
  마이그레이션 없이 그대로 재사용했다. 수신 번호는 `trending-product-finder` Phase 10과 동일하게
  루트 공용 `profiles.phone`을 쓴다(신규 필드 추가 없음) — 리포트 상세 페이지의 "💬 카카오로
  발송" 버튼(`sendReportToKakaoAction`)이 SOLAPI 계정 + 프로필 전화번호가 모두 등록된
  경우에만 노출된다.

## Phase 로드맵

| Phase | 내용 | 상태 |
|---|---|---|
| 1 | 관심 주제 등록, Perplexity 기반 "지금 생성"(수동), 웹 리포트 페이지 | ✅ 구현 완료, 실계정 미검증 |
| 2 | 설정 페이지에 카카오 채널(SOLAPI) 연동 + 리포트 상세 페이지 즉시 발송 버튼 | ✅ 구현 완료, 실계정 미검증 |
| 3 | 주제별 발송 주기 설정 + 5분 tick 크론으로 정기 자동 생성·발송 | ⏸️ 예정 |
| 4 | HTTP/RSS 소스 추가, 이메일/텔레그램 채널 추가, `programs` 정식 등록(4단계 기본 요금제 포함) | ⏸️ 예정 |

## DB 스키마

- `kakao_topics`: 회원이 등록한 관심 주제/키워드. `user_id` + RLS owner-only.
- `kakao_reports`: 주제별로 AI가 생성한 리포트(title/summary/content) + 카카오 발송 여부
  추적(`kakao_sent_at`/`kakao_send_error`, `0002_kakao_send_tracking.sql`). `topic_id`로
  `kakao_topics`를 참조(on delete cascade). `user_id` + RLS owner-only.
- `user_api_keys`/`user_solapi_accounts`는 AIMaster 플랫폼 공용 테이블을 그대로 재사용
  한다 — 이 프로젝트에서 새로 만들지 않는다.

## 환경 변수

`.env.local.example` 참고. Supabase 접속 정보 + `CRON_SECRET`(Phase 3용)뿐이며, AI 키/카카오
연동은 전부 회원 본인이 `/settings`에서 등록하는 BYOK 방식이라 이 앱 자체의 환경변수로는
등록하지 않는다.

## 남은 작업 / 미검증 항목

- Phase 1 전체가 아직 실계정 API 키로 end-to-end 검증되지 않았다. 첫 사용 시 실제로 주제를
  등록하고 "지금 생성"을 눌러 리포트가 정상적으로 만들어지는지 확인이 필요하다.
- `programs` 테이블에 `kakao-auto-posting` slug가 아직 등록되지 않았다 — 등록해야
  `requireProgramAccess()`가 통과해서 실제로 화면에 접근할 수 있다(관리자 화면에서 등록 시
  4단계 기본 요금제가 자동으로 채워진다, `components/admin/ProgramForm.tsx`의
  `DEFAULT_PLANS` 참고).
