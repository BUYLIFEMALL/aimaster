# V6 「내 채널 진짜 지표 보기」 — 개발 플랜 (2026-11-11)

- 담당: [역할: video] Claude Code(윈도우) `claude-win-video` — 주인님 2026-11-11 「너가해」(유튜브 쪽). 인스타 쪽은 인스타 담당 몫(아래 §8).
- 근거: `docs/analysis-ecommerce-bundle-20261024/HANDOFF_20261024_VIDEO.md` D4·V6 — 숫자 조작(SMM 패널)은 만들지 않고, 대신 회원 본인 OAuth·본인 앱으로 **내 채널의 진짜 지표**를 보여 준다.
- 상태: **v1.27 배포 완료(2026-11-11) — 실제 채널 연결 확인은 주인님 구글 클라우드 설정 대기.** 결정: 1 이 프로그램에서 직접 연결 · 2 화면 전부 · 3 DB 한 줄+빌드 1회 승인.
- 구현 확정: 콜백 주소는 `/api/youtube/my-channel/callback`(§3의 `/api/youtube/callback`에서 바뀜), 노출수·CTR은 공식 문서상 API에 없음 → 안내만.

## 1. 지금 상태
- `youtube-viral-studio`(v1.26)의 「채널 심층 분석」은 **공개 데이터(YouTube Data API 키)** 만 씀 — 조회수·구독자 수·영상 목록 수준. 시청 시간·유지율·유입 경로·구독 증감 같은 **채널 주인만 보는 지표는 없음**.
- 이 프로그램에는 유튜브 계정 연결(OAuth)이 없음.
- 저장소에는 이미 **회원 본인 구글 앱(`google_client_id`·`google_client_secret`)으로 유튜브를 연결해 공용 표 `member_platform_accounts`(platform `youtube`)에 저장**하는 흐름이 있음(`youtube-auto-reply`·`shots`, 공용 코드 `lib/memberIntegrations.ts`). 지금 받는 권한은 `youtube.force-ssl`·`youtube.upload`·`youtube.readonly` — **분석 권한(`yt-analytics.readonly`)은 아무 프로그램도 받지 않음**.

## 2. 만들 것 — 새 메뉴 「📈 내 채널 진짜 지표」
| 칸 | 내용(YouTube Analytics API v2 `reports`, `ids=channel==MINE`) |
|---|---|
| 기간 고르기 | 최근 7일 · 28일 · 90일 |
| 요약 카드 | 조회수 · 시청 시간(시간) · 평균 시청 길이 · 평균 시청 비율(%) · 구독자 순증(얻음−잃음) · 좋아요·댓글·공유 |
| 날짜별 그래프 | 조회수·시청 시간·구독 순증 |
| 잘 된 영상 10개 | 조회수 순 + 영상별 평균 시청 비율·시청 시간 |
| 유입 경로 | 검색·추천·탐색·외부·쇼츠 피드 등 비율 |
| 시청자 | 나이·성별 비율, 국가 상위 |
| 쇼츠 vs 일반 영상 | 크리에이터 콘텐츠 유형별 조회수(문서 확인 후 — 안 되면 뺌) |
| 다음 할 일 힌트 | 숫자 기반 규칙 문장(예: 「평균 시청 비율 30% 미만 영상 3개 — 앞 15초 다시 보기」). AI 요약은 넣지 않음(비용 0 유지, 원하시면 나중에 Claude로) |
- **노출수·클릭률(CTR)은 공식 분석 API에서 제공되지 않는 것으로 알고 있음** → 구현 첫 단계에서 공식 문서로 확인, 안 되면 화면에 「유튜브 스튜디오에서만 보이는 지표」로 안내.
- 데이터는 **화면을 열 때 바로 불러와 보여 주고 DB에 저장하지 않음**(새 표 없음 → 30일 정리 대상 없음).

## 3. 연결 방식(최상위 규칙: 회원 본인 계정·본인 구글 앱)
- 이 프로그램 「API키등록·플랫폼연동」에 **「내 유튜브 채널 연결」** 버튼 추가 → 회원 본인 `google_client_id`/`secret`으로 동의 화면 → 콜백에서 공용 표에 저장.
- 한 번 연결할 때 **분석 권한 + 기존 유튜브 권한(force-ssl·upload·readonly)을 함께** 받아, 유튜브 댓글·shots도 같은 연결을 쓸 수 있게 함(공용 연동 규칙).
- 이미 같은 앱으로 연결돼 있어도 분석 권한이 없으면 「권한 추가 연결」 안내(`getMemberAccount` `missing_scopes`).
- 회원이 구글 클라우드에서 해 줄 일: ① **YouTube Analytics API 사용 설정** ② 승인된 리디렉션 주소에 `https://youtube-viral-studio.buylife.xyz/api/youtube/callback` 추가 — 매뉴얼에 그림 카드로.
- 주의: 구글 앱이 「테스트」 상태면 갱신 토큰이 7일 뒤 만료됨(구글 정책) → 매뉴얼·화면에 「다시 연결」 안내.

## 4. 바꾸는 곳
| 파일 | 내용 |
|---|---|
| `youtube-viral-studio/src/lib/memberIntegrations.ts`(공용 사본) | 공용 기준 코드 사본 추가(`--sync`) |
| `src/lib/youtube/oauth.ts`·`analytics.ts` | 동의 주소·토큰 교환·갱신(기존 `youtube-auto-reply` 방식 그대로), 분석 보고서 호출·숫자 정리(순수 함수 + 시험) |
| `src/app/api/youtube/connect`·`callback`·`analytics` | 연결·콜백(권한 확인·state 검증·force-dynamic)·지표 조회 |
| `src/app/(dashboard)/my-channel/page.tsx` + 메뉴 | 새 화면(기존 스타일 그대로, 휴대폰 폭 대응) |
| 설정·매뉴얼(`/guide`) | 연결 버튼, Analytics API 켜기·리디렉션 주소 등록 단계 카드 |
| 운영 DB | `integration_catalog` youtube `scope_sets`에 `analytics`=yt-analytics.readonly 한 줄 추가(**승인 필요**, 무료) |

## 5. 검수·비용·배포
- 로컬: 시험(보고서 숫자 정리·기간·권한 부족 판정)·tsc·build — 무료.
- 운영: 시험 계정이 본인 채널을 연결해 화면 숫자를 유튜브 스튜디오와 대조. **구글 API는 무료 할당량(요금 없음), AI 호출 없음.**
- 배포: `youtube-viral-studio` v1.27 **빌드 1회**(승인 필요).
- 처음 설정 3단계(Analytics API 켜기 · 리디렉션 주소 추가 · 연결 버튼) · 매일 조작 0~1번(화면 열기) · 동의 1번.

## 6. 하지 않는 것
- 조회수·구독자 늘리기, 다른 사람 채널의 비공개 지표, 운영자 구글 앱·공용 OAuth, 지표 장기 저장.

## 7. 주인님 결정 항목
| 번호 | 결정할 것 | 추천 |
|---|---|---|
| 1 | 연결을 이 프로그램에서 직접(리디렉션 주소 1개 추가) vs 유튜브 댓글 프로그램 연결에 분석 권한만 더하기 | **이 프로그램에서 직접** — 이 프로그램만 쓰는 회원도 쓸 수 있음, 한 번에 모든 유튜브 권한을 받아 다른 프로그램도 재사용 |
| 2 | 화면 범위 | §2 전부(요약·그래프·잘 된 영상·유입·시청자·힌트) |
| 3 | 운영 DB `integration_catalog` 한 줄 추가 + 빌드 1회 + 시험 계정 채널 연결 확인(비용 0) | 승인 |

## 8. 인스타 쪽(다른 담당 몫)
- 인스타 진짜 지표(Instagram Graph API insights, 회원 본인 Meta 앱)는 인스타 담당께 요청으로 넘김 — `insta_auto_poster` 계열에 같은 원칙으로.
