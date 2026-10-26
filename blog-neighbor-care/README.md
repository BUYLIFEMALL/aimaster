# AI 블로그 이웃 소통 자동화

AIMaster 운영 공용회원/DB를 사용하는 신규 독립 기본 프로그램입니다. **현재서버/API·DB소스와로컬검수단계이며 운영서비스는등록·배포하지않았습니다.** 본인계정/키·회원별격리·신청20/공감100/댓글30과이웃당댓글/답글합계하루1개를 유지합니다.

- 서버: `src/app/api/work/route.ts` / `src/lib/work-api.ts`. 인증·프로그램권한확인·동일출처·8KB입력상한·소유자결합·고정오류응답.
- DB: [마이그레이션](supabase/migrations/20261026103202_bnc_server_queue.sql), 신규6표/RLS·비공개보조함수·서버전용RPC. runtime라이브게이트기본false.
- 실제자료: [공식검색API0-B](../docs/analysis-naver-blog-neighbor-20261024/PREVALIDATION_20261026_0B_SEARCH_ACCOUNT_ACCESS.md). 이번백엔드검수는가상자료만사용했습니다.
- 로컬검수: `npm test`(14), `npm run test:database`(28), `npm run build`/`npm run test:http`(6). 실제Supabase로그인·네이버검수가아닙니다.
- [운영SQL 적용안내](docs/APPLY_20261026_SERVER_DATABASE.md) / [검수·인수인계](docs/IMPROVEMENT_HANDOFF_20261026_SERVER_DATABASE.md) / [담당지침](AGENTS.md).

의존성은이폴더에서`npm ci --ignore-scripts`, DB검수는기존`postgres:17-alpine` Docker이미지를사용하며외부포트/네트워크/운영DB없이실행합니다. `test:http`는빌드후loopback서버를띄워세션없는401·동일출처검증만검사하고종료합니다. `.env.example`은빈이름표이며실제키를Git/로그에넣지않습니다.

완성예정흐름은프로필/희망조건→후보→신청/수락→새글→공감·분석→확인후/자동댓글→결과기록. 현재UI/확장/AI·정책허용·운영30일삭제Cron·배포는남아있습니다. 확정된개인키/플랫폼연결은공용구조를재사용합니다. 디자인과다른세션의5번연계는별도담당범위입니다.
