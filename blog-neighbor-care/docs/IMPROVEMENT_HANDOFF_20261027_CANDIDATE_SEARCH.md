# 후보 검색 요약 연결 — 로컬 구현·미배포

[운영(기존 reader)](https://blog-neighbor-care.buylife.xyz/reader) · [Vercel 보조](https://blog-neighbor-care.vercel.app/reader) · [관리자 결과함](https://www.buylife.xyz/admin/dev-docs/requests) · [선택한 디자인 비교](/D:/Antigravity/AIMaster/scratch/blog-neighbor-care_showcase_12views.html) · [영구 자산](/D:/Antigravity/Design/릴레이_데스크_네이버_그린/blog-neighbor-care)

2026-10-27 · Codex `codex-win-20261026-blog-check` [역할: blog]. 사용자 「계속」에 따라 UI 단계 뒤 후보 검색까지 순차 구현. **새 기능은 운영 미반영이고 실제 회원 키로 검색하지 않았습니다.** 앞선 0-B의 실제 HUB 성공 기록과 이번 가상 검색 응답 검수를 구분합니다.

## 이번 기능

1. 확인한 본인 프로필을 고르면 그 프로필의 키워드를 버튼으로 보여줍니다. 버튼으로 검색어를 넣거나 회원이 직접 수정합니다. 검색어 변경만으로 외부 호출하지 않습니다.
2. 검색용 회원 본인 Client ID/Secret과 회원의 검색어 전송·사용량 동의를 확인한 뒤 **HUB 블로그 검색 한 번**을 호출합니다. 최대20개, 첫 페이지, 날짜순, JSON, 12초, 최대512KiB. 리디렉션·구 API 폴백·자동 재시도·자동 페이지 순회 없음. 호출 유실은 회원 한도가 사용됐을 수 있다는 안내로 멈춥니다.
3. 기존 자료미리보기의 안전 주소·본문 아닌 검색 요약·본인/중복블로그/잘못된날짜/키워드 사전선별을 재사용합니다. 블로그별 최신 글 한 개를 표시하므로 반환 후보 수는20보다 적을 수 있습니다. 검색 요약 출처를 `naver-api-hub-search-summary`로 표시합니다. **AI 점수/전문 분석/활동/관계/진위 검증으로 승격하지 않습니다.**
4. 회원이 원문 링크를 직접 열고, 「이 글 주소·제목 사용」으로 후보 입력에 넣을 수 있습니다. **본문은 빈칸, 사용 권한은 미확인으로 유지**합니다. 실제 본문을 블로그당3~5개 제공하고 별도 외부 AI 동의를 해야 잠정 주제 평가로 이어집니다.
5. 검색 결과는 페이지 메모리만 사용하고 서버 DB·공용 캐시·브라우저 저장소·문서에 원문/요약을 보관하지 않습니다. 프로그램에 검색 결과 30일 저장 기능이 생긴 것은 아닙니다.

## 기존 기능·키 재사용

- `blog-keyword/src/lib/kw/naver.ts`의 HUB URL/헤더 계약과 0-B에서 확인한 경로 재사용. 이번은 의도적으로 1회 호출로 제한해 기존 어댑터의 legacy 폴백을 복사하지 않았습니다.
- 키 조회는 `blog-keyword/src/lib/apiKeys.ts`의 정확한 사본 `search/memberNaverKeys.ts`. 공용 사본 `naver-member-api-keys`로 등록/동일성 검사. 호출부는 `getUserApiKeys` 읽기만 사용하며 사본의 저장/삭제 함수를 HTTP에 노출하지 않습니다. 신규 키 발급/저장·운영자/다른 회원 키 대체 없음.
- 공식 규격 재확인: [HUB 블로그 검색](https://api.ncloud-docs.com/docs/naver-api-hub-search-blog), [HUB 이관 가이드](https://guide.ncloud-docs.com/docs/apihub-migration). 검색 결과의 description은 요약이며 본문이 아닙니다. [앞선 실제 시험](../../docs/analysis-naver-blog-neighbor-20261024/PREVALIDATION_20261026_0B_SEARCH_ACCOUNT_ACCESS.md)의 시험회원200·3건을 재호출하지 않았습니다.

`POST /api/candidates/search`: `{profileId,query,quotaConfirmed:true}`만 받습니다. userId/키/검색 URL/성공 상태를 입력받지 않습니다. 프로필은 본인 get RPC로 읽으며 성공·확인본·수명·원본 본인블로그를 검증합니다. 호출 전후 회원 권한, 호출 후 프로필 revision/수명을 다시 확인합니다. 같은 프로세스의 동일 회원 동시검색은409이며 **분산 일일 한도나 다중 서버 중복 방지를 구현했다는 뜻이 아닙니다.** 공급자 일/월 한도와 실제 사용량은 회원 콘솔에서 별도 확인해야 합니다.

## 검수·완료 수준

- 단위 **82개** 통과(기존74+검색8): 인증/출처의프로토콜·호스트/JSON/크기·동의, 본인 프로필/키, 요약/본문 경계, 공급자 인증/429/과대/깨진응답·자동재호출없음, 중복/본인/날짜, 권한·revision변경, 프로세스동시실행, 네트워크오류.
- 타입·최종 Next production build·실제 루프백 **HTTP31개**·ZIP 원본7파일 통과. [HTTP 근거](evidence/search-http-20261027.json). 모델·검색단위는 가상응답이며 실제회원/공급자 성공이 아닙니다.
- 기존 PostgreSQL14개는 앞선 UI/서버 단계의 검수입니다. 이번 DB 스키마/RPC 변경 없음, DB 검수 재실행 없음. 기존 SQL은 여전히 운영 미적용.
- React 품질 점검: 검색은 클릭/동의 뒤 실행, 프로필 키워드 조회는 읽기만, 프로필 변경 시 새 컴포넌트로 결과 초기화, unmount/timeout 처리, 동시 클릭 잠금, 검색 결과는 escaped text, 원문은 고정 네이버 주소로 구성. 실제 로그인한 새 UI의 클릭 전체 검수는 남음.

## 남은 일·배포

**완료: 검색 요약에서 후보 찾기·주소/제목 입력 연결의 로컬 구현.** 미완료: 실제 검색 키/할당량·로그인 새UI 검수, 후보 실제 본문 자동 확보·권리/허용 수단, 활동/관계 근거·종합 점수, 기존 이웃 가져오기·신청/수락·공감/댓글·답방/대댓글·반복. 검색 API 사용은 이 동작들의 허용을 대신하지 않습니다. 허용 근거가 확인되지 않은 타인 본문 자동 수집을 이번 확장에 추가하지 않았습니다.

배포: **미배포 대기**, v1.01유지·미푸시. 명칭70f146a6c·서버9e60dfa21·UI cbb8ac788과 같은 묶음. 적용 전에 분석 신규2표/RPC SQL이 필요합니다. 검색용 신규 SQL/추가 Cron 없음.

비용: 이번 실제 검색API0·유료AI0·Vercel 빌드/배포0·운영SQL/키/권한변경0. 무료 로컬 production build2회(출처/수명 검사 보강 포함), UI 단계의 무료빌드2회/DB2회와 별도. 사용자 새 요청0건.
