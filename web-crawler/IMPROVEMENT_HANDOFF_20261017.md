# 개선·인수인계 — 웹 크롤링 자동화 v1.07 디자인 리뉴얼 · 2026-10-17 Claude Code(맥미니)

## 한 일
- 스마트 매트릭스(다크) 적용: 색 토큰·히어로·KPI 카드 이식, 화면 15개 파일 색 일괄 치환, 로그인 다크.
- 사이드바 교체(스텝퍼 + 📖 매뉴얼 + 휴대폰 ☰), 대시보드 재구성, `/guide` 신설.
- 버전 `webapp/src/lib/version.ts` v1.06 → **v1.07**. 서버 로직·파이썬 수집 서비스·DB 변경 없음.
- 검수: 맥미니 `tsc --noEmit` 오류 0. 비용 없음.

## 윈도우 CLI 검수 및 배포 완료 (2026-10-17 Antigravity)
1. `npm run build` Turbopack 프로덕션 빌드 성공.
2. Vercel 프로덕션 배포 완료 (`dpl_6cWcbNhhxvUZ4hWFRj4b2dUkZ36a` → alias `web-crawler-saas.buylife.xyz`).
3. Supabase DB `programs` 테이블 `slug = 'web-crawler-saas'`의 `version = 'v1.07'` 갱신 완료.
4. Microsoft Edge 포그라운드(화면 노출 `headless: false`) 실세션 검수 완료 (데스크톱 1440px / 모바일 390px, `buylifemall@naver.com` 세션). 대시보드 지표 5종, 4단계 파이프라인, /guide 매뉴얼(말풍선·5단계·팝업 4종·FAQ), ☰ 모바일 메뉴 정상 확인. (수집 실행 버튼 미클릭, 비용 0원).
5. `DESIGN.md` 42번 → ✅ 1차 작업완료 (`v1.07`, 스마트 매트릭스 스타일).


## 남은 일 (IMPROVEMENTS.md)
- #5 30일 자동 삭제(최상위 규칙) 미적용 — DB 예약 작업이 필요해 주인님 승인 후 진행.
- #6 진행 중 자동 새로고침, #7 결과 미리보기·타 프로그램 연결.

---

# v1.08 — 생성 데이터 30일 자동 삭제 (2026-10-17 Claude Code 맥미니, 주인님 승인)

## 한 일
- 새 경로 `webapp/src/app/api/cron/purge-expired/route.ts` + `webapp/vercel.json` cron(매일 03:17 KST). 30일 지난 작업의 결과 엑셀(Storage)과 기록(`web_crawler_jobs`)을 함께 삭제.
- 매뉴얼 FAQ에 30일 삭제 안내. 버전 v1.07 → **v1.08**. 맥미니 tsc 0.
- 현재 데이터(2026-10-17 조회): 작업 2건 중 30일 지난 것 1건(2026-09-04), 결과 파일 1개 → **첫 실행에서 1건 삭제 예정**.

## 윈도우 CLI 다음 첫 단계
1. Vercel 프로젝트(web-crawler/webapp)에 `CRON_SECRET`이 있는지 확인: `vercel env ls production`. 없으면 임의의 긴 값으로 추가(주인님 승인 범위). 값은 문서·코드에 적지 않는다.
2. `cd web-crawler/webapp && npm run build` → `vercel deploy --prod --yes`
3. DB: `update programs set version='v1.08', updated_at=now() where slug='web-crawler-saas';`
4. 첫 실행 확인: `curl -s -H "Authorization: Bearer $CRON_SECRET" https://web-crawler-saas.buylife.xyz/api/cron/purge-expired` → `{"deletedJobs":1,"deletedFiles":1}` 기대. 비밀값 없이 호출하면 401.
5. DB 확인: `select count(*) from web_crawler_jobs where created_at < now()-interval '30 days';` → 0, `storage.objects`(bucket `web-crawler-results`)에서 해당 파일 사라짐.
6. Vercel 대시보드 Cron Jobs에 `/api/cron/purge-expired` 등록 확인.

