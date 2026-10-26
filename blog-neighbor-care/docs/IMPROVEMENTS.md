# 개선·검수 원장

2026-10-26 서버/DB1단계. **운영미적용·미배포대기**: 신규서버/API와6표/RPC, 운영Run·UI/회원프로그램등록·확장/정책검수이후배포. 실제버전상승/확장ZIP/DB버전등록없음.

| ID | 근거·영향 | 처리 |
|---|---|---|
| BNC-SRV-01 | 새폴더에Next설정이없으면상위루트설정/미들웨어를가져와빌드실패 | 명시적next.config.mjs/turbopack.root, 최종로컬빌드통과 |
| BNC-SRV-02 | 실제Next내부URL호스트와전송Host가달라정상동일출처요청도403 | Origin을프로토콜+전송Host와대조, unit회귀+실제HTTP6개통과 |
| BNC-SRV-03 | Supabase기본테이블권한이service_role에도ALL이면runtime변경금지가무력화될수있음 | 해당6표의기본권한을서비스역할까지명시회수후필요권한만부여. 기본권한ALL을가정한실제PG검수통과 |
| BNC-SRV-04 | 공용계정삭제가작업FK에막히거나기록을지우면결과불명중복위험 | 연결삭제시작업.account_id만NULL/기록보존, 관계메타cascade·실행차단검수통과 |
| BNC-SRV-05 | 허가후중단/만료를최종클릭전에다시확인해야함 | 서버전용verify_permit와DB28검수. 실제worker/브라우저적용은미완료 |

근거·명령·비용·미완료는[상세인수인계](IMPROVEMENT_HANDOFF_20261026_SERVER_DATABASE.md), 운영SQL은[적용안내](APPLY_20261026_SERVER_DATABASE.md). 위결과는이신규프로그램로컬검수이며기존다른앱의동일오류재현/수정완료가아닙니다.
