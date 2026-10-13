# blog-keyword CLI 인수인계 (2026-10-14, v1.02)

| 항목 | 값 |
|---|---|
| 이름 / slug | AI 블로그 키워드 자동화 / `blog-keyword` |
| 운영 주소 | https://blog-keyword.buylife.xyz (Vercel `buylife/blog-keyword`, Git 미연동) |
| 배포 | 폴더에서 `vercel deploy --prod --yes --scope buylife` |
| DB | `blog_keyword_reports`(0001, RLS owner-only), `programs` 등록·요금제 3종·VIP 등급 접근·썸네일(0002), 카테고리 블로그 |
| 환경변수 | 공용 Supabase 3종만(`scripts/add-blog-keyword-vercel-env.mjs`로 등록 완료). 운영자 AI 키는 등록하지 않음 |
| 매뉴얼 | `platform_guides`에 2건 추가(카테고리 네이버): 검색·데이터랩 키 `8f201233-…`, 검색광고 키 `8be38787-…`. Gemini는 기존 `f442cd37-…` |
| 버전 | v1.02 (코드 `src/lib/version.ts`, package.json 1.0.2, DB `programs.version`) |

## 완료·검증 (2026-10-14)
- 이름: 사용자 선택 "AI 블로그 키워드 자동화"(플랜 추천명은 "AI 키워드 파이터 자동화"였으나 주인님이 변경). 폴더는 plan 때 `keyword-fighter`였다가 `blog-keyword`로 이름 변경.
- 단위 13/13, 보이는 Chrome 14/14(모의 API), 빌드, 운영 화면 로그인 상태에서 자동완성→주제 만들기 실행(기록 저장 확인 후 테스트 기록 삭제).
- **실제 호출(운영자 본인 계정 키: Gemini·네이버 검색 API·검색광고)**: 자동완성(네이버·구글, 월간 검색수 병기) / 주제 / 연관검색어 / 경쟁력(블로그 문서 수·월간 검색수·12개월 추이 실측) / 오늘의 전략 / 다각도 / 프롬프트 / **상위 블로그·뉴스·카테고리 트렌드(블로그 100건 빈출어 + 데이터랩 주간 추이)** 모두 정상.
- `X-Vercel-Cache: MISS`, `Cache-Control: private, no-store` 확인.
- SDK 확인: 환경변수에 `GOOGLE_API_KEY`가 있어도 생성자에 넘긴 `apiKey`가 우선한다(가짜 키로 호출하면 실패 — `test-artifacts/env-override.mts`).
- v1.02: 카테고리 트렌드 빈출어 품질 개선(불용어 보강, 표본 50→100건, 날짜·숫자 토큰 제외).

## 남은 일
1. 일반 회원(buylifemall@naver.com) 계정으로 로그인한 확인(비밀번호 입력은 하지 않음). 회원 본인 네이버 키가 없을 때 안내 문구가 나오는지(`needNaver`) 한 번 확인.
2. 키워드 빈출어는 "최신순 100건" 표본이라 스팸성 글이 섞이면 노이즈가 남는다. 필요하면 불용어(`src/lib/kw/util.ts` STOPWORDS)를 계속 보강.
3. 후속 아이디어: 블로그 글 초안 연결(naver-blog-allinone), 키워드 클러스터 맵, 정기 리포트.
