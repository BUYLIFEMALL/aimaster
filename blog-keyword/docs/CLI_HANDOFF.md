# blog-keyword CLI 인수인계 (2026-10-14, v1.01)

| 항목 | 값 |
|---|---|
| 이름 / slug | AI 블로그 키워드 자동화 / `blog-keyword` |
| 운영 주소 | https://blog-keyword.buylife.xyz (Vercel `buylife/blog-keyword`, Git 미연동) |
| 배포 | 폴더에서 `vercel deploy --prod --yes --scope buylife` |
| DB | `blog_keyword_reports`(0001, RLS owner-only), `programs` 등록·요금제 3종·VIP 등급 접근·썸네일(0002), 카테고리 블로그 |
| 환경변수 | 공용 Supabase 3종만(`scripts/add-blog-keyword-vercel-env.mjs`로 등록 완료). 운영자 AI 키는 등록하지 않음 |
| 매뉴얼 | `platform_guides`에 2건 추가(카테고리 네이버): 검색·데이터랩 키 `8f201233-…`, 검색광고 키 `8be38787-…`. Gemini는 기존 `f442cd37-…` |
| 버전 | v1.01 (코드 `src/lib/version.ts`, package.json 1.0.1, DB `programs.version`) |

## 완료·검증 (2026-10-14)
- 이름: 사용자 선택 "AI 블로그 키워드 자동화"(플랜 추천명은 "AI 키워드 파이터 자동화"였으나 주인님이 변경). 폴더는 plan 때 `keyword-fighter`였다가 `blog-keyword`로 이름 변경.
- 단위 13/13, 보이는 Chrome 14/14(모의 API), 빌드, 실제 Gemini 호출(자동완성 네이버·구글 / 주제 / 연관검색어 / 경쟁력 / 오늘의 전략 / 다각도 / 프롬프트), 운영 화면 로그인 상태에서 자동완성→주제 만들기 실행(기록 저장 확인 후 테스트 기록 삭제).
- `X-Vercel-Cache: MISS`, `Cache-Control: private, no-store` 확인.
- SDK 확인: 환경변수에 `GOOGLE_API_KEY`가 있어도 생성자에 넘긴 `apiKey`가 우선한다(가짜 키로 호출하면 실패 — `test-artifacts/env-override.mts`).

## 남은 일
1. **네이버 키가 필요한 3기능(상위 블로그·뉴스·카테고리 트렌드)과 데이터랩·검색광고 실측은 실계정으로 아직 확인하지 못했다.** 운영자 계정에 네이버 검색 API 키가 없어 모의 응답으로만 검증했다. API HUB(`naverapihub.apigw.ntruss.com/search/v1/{blog|news}`, `search-trend/v1/search`) 경로·헤더는 threads-affiliate-poster 구현(공개 MCP 소스 근거)을 따랐고 401/403/404면 구방식으로 폴백한다. 회원이 키를 등록해 실제 응답이 다르면 `src/lib/kw/naver.ts`부터 확인.
2. 일반 회원(buylifemall@naver.com) 계정으로 로그인 확인(비밀번호 입력은 하지 않음).
3. 후속 아이디어: 블로그 글 초안 연결(naver-blog-allinone), 키워드 클러스터 맵, 정기 리포트.
