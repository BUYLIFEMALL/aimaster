# 개발 플랜 — 쇼츠 원스톱에 「유튜브에 올리기」 (v1.19, 2026-10-21 Claude Code 윈도우)

> 유튜브 병합 분석 보고서의 보류 F 「엔진 공유」 1번(`docs/analysis-youtube-consolidation-20261020/REPORT.md`). 주인님 「진행해줘」(2026-10-21).
> 대상: 운영 ① AIMaster, DB ref `esgxyikcnnvmlhygjkth`. **DB 구조 변경 없음**(버전 칸만).

## 1. 문제
원스톱은 브라우저에서 MP4를 만든 뒤 회원이 파일을 내려받아 유튜브에 직접 올려야 한다. 업로드 문구(제목·설명·해시태그·태그)도 손으로 복사해 붙여야 한다.

## 2. 범위
- 렌더 화면 ⑤ 업로드 문구 아래 **⑥ 유튜브에 올리기** 카드: 연결된 채널 표시, 제목(문구 후보 중 선택·고쳐 쓰기), 설명란+해시태그, 태그, 공개 범위(비공개 기본·일부 공개·공개·예약 공개), [유튜브에 올리기] 버튼, 진행 막대, 결과 링크.
- 올린 기록(영상 ID·주소·시각·공개 범위)은 대본 데이터 `youtube`에 저장(기존 `shorts_onestop_items`, 구조 변경 없음).
- 유튜브 연결은 이 프로그램에서 하지 않는다 — **공용 연결 계정(`member_platform_accounts`, platform `youtube`)을 그대로 쓴다**(최상위 공용 연동 규칙). 연결이 없으면 「유튜브 댓글 자동화 또는 YOUTUBE Shots에서 한 번 연결해 주세요」 안내(카탈로그 `connect_program_url`).
- 업로드 권한: `youtube.upload` · `youtube.force-ssl` · `youtube` 중 하나(구글 `videos.insert` 공식 허용 권한). 갱신 토큰은 발급한 Google 앱으로만 쓸 수 있어 공용 계정의 `app_ref` = 회원 `google_client_id`일 때만 사용.

## 3. 구현 순서
1. 공용 부품
   - `shots/src/lib/youtube/client.ts`를 기준 코드 `youtube-upload-client`로 등록하고 `createYoutubeResumableSession()`(재개 가능 업로드 세션 주소 만들기) 추가 — Shots 동작은 그대로(새 함수 미사용).
   - 사본: `shorts-onestop-studio/src/lib/youtube/client.ts`. `member-integrations` 사본에 원스톱 추가.
2. 원스톱 서버
   - `src/lib/youtube/account.ts`: 공용 계정 + 회원 Google 키 확인, 접근 토큰 갱신(공용 표에 저장), 갱신 실패 시 「다시 연결 필요」 표시.
   - `GET /api/youtube/status`: 연결 채널·상태(연결 없음/권한 없음/다른 Google 앱/다시 연결/정상).
   - `POST /api/youtube/upload-session`: 제목·설명·태그·공개 범위·예약 시각·파일 크기를 받아 유튜브 업로드 주소를 만들어 돌려준다. **영상 파일은 서버를 거치지 않는다**(Vercel 요청 4.5MB 한도). 접근 토큰은 브라우저로 보내지 않는다(업로드 주소는 그 영상 한 개에만 쓸 수 있음).
3. 원스톱 화면: 브라우저가 업로드 주소로 MP4를 바로 보낸다(진행률 표시) → 영상 ID를 대본에 저장.
4. 매뉴얼(/guide)·설정 안내에 업로드 단계 추가, 버전 v1.19(코드+DB), 상세 소개 문구에 업로드 반영.

## 4. 검수
- `npx tsc --noEmit`, 기존 테스트, `npm run build`, `node scripts/check-shared-modules.mjs`.
- 크롬 실화면: 관리자 계정(채널 연결됨)으로 상태 표시 확인 → **비공개**로 1회 업로드(주인님 확인 후) → 유튜브 스튜디오에서 영상 확인. 시험 계정(연결 없음)으로 「한 번 연결」 안내 확인.
- 실패 경로: 연결 없음·권한 없음·다른 앱·만료 문구.

## 5. 비용
- 운영자 인프라: 없음(서버는 주소만 만들고, 영상은 브라우저→유튜브 직접).
- 회원: 유튜브 Data API 무료 할당량(업로드 1회 약 1,600 단위, 하루 10,000 단위 → 하루 약 6편). 별도 요금 없음.
- 시험: 무료. 비공개 업로드 1~2회.

## 6. 버전·배포·인수인계
- 원스톱 v1.19 배포. Shots는 기준 파일에 새 함수만 추가(동작 같음) → 다음 Shots 배포 때 함께(미배포 사본 표에 기록).
- 이 문서·`AGENTS.md`·`docs/IMPROVEMENTS.md`·`docs/SHARED_MODULES.md`·`docs/SHARED_FEATURE_MAP.md`·역량 지도 카드·루트 HANDOFF·보고서 §6.

## 7. 다음(2번, 별도 작업)
Shots에 원스톱의 「브라우저에서 만들기」(MP4 묶기 `lib/render/export.ts`) 선택지.
