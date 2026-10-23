# AI 4컷 만화 자동화 (`four-cut-comics`) — 인수인계 (2026-10-14)

다른 계정·CLI가 바로 이어서 작업할 수 있도록 정리한 요약이다. **상세는 아래 두 문서가 정본**이다.

- 현재 상태·남은 작업 순서: `four-cut-comics/docs/CLI_HANDOFF.md`
- 원본 정밀 분석·전체 플랜·아키텍처 결정: `four-cut-comics/docs/DEVELOPMENT_PLAN.md`
- 작업 지침: `four-cut-comics/AGENTS.md`

## 한눈에
- 요청(주인님): https://4cut-comics-99gg.vercel.app/ 분석 후 개발. 이름 확정 "AI 4컷 만화 자동화" / slug `four-cut-comics`.
- 원본: 서버 없는 Vite SPA, 브라우저에서 Gemini 직접 호출. 4단계(주제→대본→등장인물→만화), 스타일 4·장르 11·말풍선 6·이미지 모델 2, 캐릭터 시트를 컷 생성에 첨부해 일관성 유지, AI가 말풍선 위치 판단, 인스타 문구·후속편·만화 합치기.
- 우리 설계: 서버 라우트 경유 + 회원 본인 Gemini 키(`user_api_keys`) + 권한 판정 + 이미지 비저장, 구조는 `portrait-photo`(v1.17)를 복사해 시작.
- 진행: 스캐폴딩·`src/lib/comic/{options,script,prompt}.ts` 완료. **미완료**: gemini.ts 재작성, API 라우트 3종, 클라이언트(Canvas 합성·Studio UI), 테스트, 프로그램 DB 등록(`programs`에 아직 없음), 썸네일, 배포, 문서 마무리.
- 다음 한 걸음: `four-cut-comics/docs/CLI_HANDOFF.md` §3의 1번(치환)부터 순서대로.

## 이 세션의 다른 결과(참고)
- `portrait-photo` v1.17 배포 완료(규격 21종, 일본 여권·K-ETA 공식 확인 추가), 운영 화면 확인 완료, 인수인계 `docs/HANDOFF_PORTRAIT_PHOTO_2026-10-14.md`.
- 보류 규격(공식 사양 미확인): 태국·이탈리아·솅겐·말레이시아·필리핀·브라질·UAE·튀르키예·스위스·남아공·네덜란드·스웨덴·오스트리아·체코.

## 업데이트 (2026-10-14 후반)
- **v1.01 완료·배포됨**: 코드(서버 라우트 3종·Canvas 합성·4단계 UI·매뉴얼), 단위 테스트 7건·tsc·빌드 통과, 공용 DB `programs` 등록(id `d39acd06-6ee9-4d6f-924a-82382eb8e146`)+요금제 3단계+VIP 접근, Vercel 프로젝트·환경변수·도메인 `four-cut-comics.buylife.xyz`, 프로덕션 READY(미로그인 `/studio` → `/login` 307).
- **남은 일**: ① 주인님 로그인 후 운영 화면 확인·실호출 1세트(본인 Gemini 키 사용량 발생, 그림 모델 ID 가용성 검증) ② 썸네일 등록(§13 템플릿, 주인님 키 비용) ③ v1.02 AI 자동 말풍선 ④ 루트 `docs/HANDOFF.md`·`ERROR_LESSONS.md` 항목 추가.
- 자세한 순서와 배운 점: `four-cut-comics/docs/CLI_HANDOFF.md` §6·§7.
