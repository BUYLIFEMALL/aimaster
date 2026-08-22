# 아키텍처 설계 배경

## 원본 Make.com 시나리오 분석

파일: `D:\PDS\00@🟣경쟁사 키워드분석-SERP-💰.blueprint.json`
연동 Airtable: `appzAYWz0W0j3xEZY` (테이블: 핵심키워드, SERP 검색, SERP 검색결과, 경쟁사, 분석결과)

흐름:
1. `핵심키워드` 테이블에서 `동작중=true`인 키워드 조회
2. 키워드로 SerpApi 호출 → `SERP 검색`(job) 레코드 생성
3. `organic_results` 배열만 순회(⚠️ ad/PAA/local은 Airtable 스키마엔 있지만 실제로는 캡처
   안 됨) → 각 결과에서 정규식으로 도메인 추출 → `SERP 검색결과` 레코드 생성 + Google Docs에
   원본 로그 추가
4. 그 도메인이 `경쟁사` 테이블에 이미 있는지 조회 → 없으면만 Perplexity(sonar 모델)로 회사
   리서치 → GPT-4o-mini로 회사명만 추출 → 새 경쟁사 레코드 생성 (있으면 스킵 = 중복 리서치 방지)
5. 모든 결과 처리 후, Google Docs에 쌓인 원본 데이터를 다시 읽어와 GPT-4o가 "경쟁사/USP/콘텐츠
   아이디어" 분석 보고서 작성 → `분석결과` 레코드 저장
6. Claude Sonnet으로 그 분석을 HTML 뉴스레터로 재가공 → Discord 알림 + 고정 수신자(nailnbody@naver.com)에게 이메일 발송

## 왜 그대로 베끼지 않았는가

원본은 Airtable 1개 베이스 + 개인 API 키 하나 + 고정 이메일 수신자 하나로 동작하는 1인용
자동화다. AIMaster는 회원 여러 명이 각자 자기 계정으로 쓰는 멀티테넌시 플랫폼이라, 이 구조를
그대로는 옮길 수 없다. 자세한 대응표는 [README.md](../README.md)의 "원본 대비 바뀐 점" 참고.

## 전역 공유 캐시(competitor_profiles) 설계 이유

가장 중요한 설계 결정이다. 도메인 → 회사정보(회사명, 사업분야 요약)는 "누가 조회했는지"와
무관한 객관적 사실이다. 만약 이걸 사용자별로 따로 저장했다면, 회원 A와 회원 B가 둘 다 "쿠팡"이
등장하는 키워드를 분석할 때마다 매번 Perplexity+GPT 리서치가 중복 실행되어 비용이 사용자 수에
비례해서 계속 늘어난다. 반대로 전역 캐시로 두면 "쿠팡"은 플랫폼 전체에서 딱 한 번만 리서치하면
된다 — 회원이 늘어날수록 비용 절감 효과가 커지는 구조다.

RLS는 `competitor_profiles`만 예외적으로 "로그인한 사용자면 select/insert/update 전부 허용"으로
열어뒀다. 서버 액션(`runKeywordAnalysisAction`)이 인증된 사용자 세션의 Supabase 클라이언트로
직접 upsert하기 때문에, 서비스 롤(관리자 클라이언트)을 거치지 않고도 이 정책만으로 충분하다.

"이 도메인이 내 경쟁사다"라는 판단만은 주관적이라 `user_tracked_competitors`로 분리해서
사용자별로 격리했다.

## Google Docs 제거

원본이 SERP 결과를 Google Docs에 계속 append했다가 나중에 다시 읽어서 GPT에 넘긴 건, Make.com의
모듈 간 데이터 전달(특히 배열/반복 처리 결과를 모아서 다음 단계로 넘기는 것)이 번거로워서 택한
임시방편으로 보인다. 실제 Next.js 서버 액션 안에서는 그냥 배열 변수에 모아뒀다가 그대로 GPT
프롬프트에 넣으면 되므로, Google Docs 연동 자체가 불필요하다 — OAuth 연동 관리 부담도 같이
사라진다.
