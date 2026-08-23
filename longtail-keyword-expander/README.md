# 🧩 Longtail Keyword Expander — 롱테일 키워드분석 자동화

키워드를 입력하면 네이버(또는 구글) 검색결과를 분석해서 연관 키워드 → 롱테일 키워드까지
계층적으로 확장하고, 블로그 담당자에게 "이번 주 뭘 써야 하는지" 작업 지시 메시지를 만들어주는
콘텐츠 기획 프로그램.

## 설계 배경

기존에 Make.com으로 운영하던 자동화 시나리오(`D:\PDS\01🟣네이버 키워드분석-SERP-💰.blueprint.json`,
연동 Airtable `appWzz3bi7r4INt0G`)를 AIMaster 서브프로젝트로 이식했다. 방금 완성한
[competitor-analysis](../competitor-analysis)와는 목적이 다르다 — competitor-analysis는 "누가
상위노출되고 있나"(경쟁사 식별), 이 프로그램은 "어떤 키워드를 더 노려야 하나"(콘텐츠 키워드
발굴)다.

### 원본 대비 바뀐 점

- **Airtable → Supabase**: 회원별 `user_id` + RLS로 완전히 격리
- **개인 API 키 → `user_api_keys`**: 본인 키만 쓰고 관리자 키로 폴백하지 않음. SerpApi
  provider는 competitor-analysis와 공유되므로 이미 등록한 사용자는 재등록 불필요
- **Google Docs 중간 저장 제거**: SerpApi 응답을 바로 텍스트로 정리해서 GPT에 전달
- **고정 이메일(nailnbody@naver.com)+Discord 채널 발송 제거**: 결과는 앱 화면에 기본 표시,
  **텔레그램 알림(선택)** 추가 — 예약 리마인드 등 다른 프로그램이 이미 쓰는 공용
  `user_telegram_links`를 재사용
- **"연관 키워드"가 전역 유니크였던 것 → (seed_id, keyword) 단위로 스코프**: 원본 Airtable
  수식이 부모 키워드 스코프 없이 전역 검색을 해서, 서로 다른 Seed끼리도 같은 텍스트면 병합되는
  비의도적 버그가 있었다. 멀티테넌시에서는 특히 치명적이라 재현하지 않았다
- **GPT 프롬프트의 "현재 연도는 2025년" 하드코딩 제거**: 호출 시점의 실제 날짜를 동적으로 주입
  (competitor-analysis의 Claude 리포트 "© 2024" 하드코딩 버그와 동일한 문제)
- **롱테일 키워드마다 GPT 원본 응답 전체를 중복 저장하던 것 제거**: 깔끔한 키워드 텍스트 +
  연관 키워드 연결만 저장

## 데이터 모델

- `longtail_seed_keywords` — 추적 키워드(검색엔진 선택: 구글/네이버, 모니터링 on/off)
- `longtail_related_keywords` — 1차 확장(연관 키워드), Seed별로 스코프, relevance_score
- `longtail_expansions` — 2차 확장(롱테일 키워드), 연관 키워드 하위 또는 Seed 직속
- `longtail_runs` — 실행 1회 기록(연관/롱테일 개수, 블로그 작업 지시 요약)

## 확장 흐름 (`lib/actions/expansion.ts`의 `runKeywordExpansionAction`)

1. SerpApi로 검색(네이버는 자연검색/연관검색어/뉴스/쇼핑/동영상/인플루언서 6종, 구글은
   자연검색/PAA/연관검색어 3종) → 카테고리별 텍스트로 정리
2. GPT-4o-mini로 연관 키워드 추출(relevance_score 포함) → upsert
3. GPT-4o-mini로 Seed+연관 키워드 각각을 롱테일 키워드로 확장 → upsert
4. GPT-4o로 전체를 종합해 블로그 담당자용 작업 지시 메시지 생성
5. 텔레그램 연동돼 있으면 요약을 발송(선택, 실패해도 실행 자체는 성공 처리)

## Phase 진행 상태

[AGENTS.md](AGENTS.md)의 Phase 표 참고.

## 명령어

```bash
npm run dev       # 로컬 개발 서버
npm run build     # 프로덕션 빌드
```

## 환경변수 (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_MAIN_SITE_URL=
```
