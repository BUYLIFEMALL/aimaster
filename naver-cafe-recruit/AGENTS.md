# naver-cafe-recruit — 네이버 카페 회원 모집 자동화 (개발 중, v1.01 뼈대)

> 상태(2026-11-06 윈도우 `claude-win-blog`): **v1.01 첫 배포 완료(비공개 `is_active=false`).** Vercel 프로젝트 `naver-cafe-recruit`·도메인·환경변수 6개, 배포 `naver-cafe-recruit-krzqcvoj2`(첫 배포는 프레임워크 「Other」라 404 → Next.js로 고쳐 재배포), DB 확장 버전·다운로드 주소, `check-extension-release` OK, ego 화면 확인. 다음: 시험 계정으로 아는 아이디 1명 실제 초대 → 판정 규칙 확정 → 공개 · 모드 A 주인님 결정 대기.
> 이전 상태(2026-11-05 윈도우 `claude-win-blog`): **운영 DB 적용 + 웹 뼈대(v1.01) 완료, 미배포·확장 미구현.** `programs`에 비공개(`is_active=false`)로 등록·요금제 3단계. 다음: 맥미니 ego로 네이버 초대·카페 화면 실물 확인([`docs/REQUEST_20261105_MACMINI_DOM.md`](docs/REQUEST_20261105_MACMINI_DOM.md)) → 확장 → 빌드(주인님 승인)·Vercel 프로젝트·도메인. 플랜 [`docs/PLAN_20261105_NEW.md`](docs/PLAN_20261105_NEW.md) · 외부 원본 분석 [`../docs/analysis-cafe-recruit-20261105/DETAIL.md`](../docs/analysis-cafe-recruit-20261105/DETAIL.md).
> 공통 지침은 루트 [`CLAUDE.md`](../CLAUDE.md)·[`AGENTS.md`](../AGENTS.md)를 함께 읽는다(회원 본인 계정·본인 키 최상위 규칙, 마케팅 수집 예외 지침).

## 1. 사용 목적 및 대상
- **누구를 위해**: 네이버 카페를 운영·활동하며 내 카페 회원을 늘리려는 회원.
- **핵심 가치**: 회원이 **본인 네이버 계정으로 직접 로그인한 상태**에서, 세 가지 방식으로 모은 대상에게 내 카페 초대·홍보를 **최소 조작**으로 자동 진행. 처음 설정 뒤 사람 클릭을 줄인다(자동화 최소 설정 지침).
- **세 방식**: A 카페 활동 회원 추출(관리자 지정 예외) · B 아는 사람(직접 입력 + 블로그 서로이웃) · C 카페 홍보 글(`naver-cafe-poster` 재사용).

## 2. 개발 도구/기술 스택/스킬
- Next.js 14 App Router + TypeScript + Tailwind + 공용 Supabase(운영 ref esgxyikcnnvmlhygjkth) — `naver-cafe-poster` 뼈대 기반.
- 크롬 확장(MV3) — `blog-neighbor-care/extension` 토대(기기 연결·동의 한 번·실행 탭 순회·사람 같은 입력·하루 상한·동작 시간대·중복 차단·결과 불확실 시 재실행 금지).
- 회원 연동: `member_platform_accounts`·`user_api_keys` 공용 저장(네이버 연동 재사용).

## 3. 핵심 기능·시스템 로직·장단점
- **로직**: 웹에서 모드·카페·상한 설정 → 확장이 회원 로그인 세션에서 대상 수집(A)·초대·게시(B·C) → 웹 목록 검토 승인 → 확장 실행 → 결과 기록. 서버는 명단·설정·결과만 저장하고 네이버에 직접 접속하지 않는다(마케팅 예외 §3-1).
- **DB**: `ncr_settings`(모드·상한·시간대·A 동의) · `ncr_targets`(대상 명단, 회원 안 아이디 중복 제거) · `ncr_sent`(보낸 기록·중복 초대 방지). 모두 소유자 격리·RLS·security-definer RPC(`ncr_dispatch`)로만 접근. 보관 기본 30일 + 관리자·시험 계정 열외.
- **장점**: 회원 본인 로그인 세션만 씀(비밀번호 안 다룸) · 가입 카페·게시판 자동 불러오기(포스팅 프로그램 약점 보강) · 상한·시간대·사람 같은 속도 · 제한 뜨면 그날 중지.
- **단점·한계**: 네이버 내부 화면 변경에 따라 유지보수 필요 · 초대는 카페 운영진 권한·네이버 한도에 묶임 · 모드 A는 관리자 지정·회원 책임 동의 필요.

## 4. 현재 버전 및 변경 이력
- v0(2026-11-05): 플랜 + DB 마이그레이션 2개 초안(`ncr_init`·`ncr_dispatch`, 미적용). 아직 화면·확장·배포 없음.
- v1.01(2026-11-05, 윈도우, 미배포): **DB 검토 보완 후 운영 적용**(ref esgxyikcnnvmlhygjkth) — 하루 상한을 한국 날짜로, 초대 전에 `next_target`(시간대·상한·제한·이미 보낸 사람 확인), 「보냄」 기록 덮어쓰기 금지, 모든 회원 대상 매일 정리 `ncr_cleanup()`, 아이디 형식·200줄·500줄 제한, 상한 최대 25. 격리 DB 시험 8개(`npm run test:database`). **웹 뼈대**: `naver-cafe-poster`에서 로그인·화면 틀·메뉴·공용 UI만 골라 복사, `lib/access.ts`는 권한 표 조회를 서비스 키로(공통 판정 순서), `/api/recruit`(설정·아는 사람 넣기·검토·기록, 네이버 요청 없음), `/api/cron/cleanup`(매일 03:40, `CRON_SECRET`), 화면 🏠 오늘의 모집·⚙️ 모집 방식·설정(세 방식, A 책임 고지)·👥 모으기·승인(붙여넣기·한 번에 승인)·📊 결과·엑셀(맥미니 초안 `api/export`)·📖 가이드. 단위 시험 4. `programs` 비공개 등록.
- v1.01 추가(2026-11-06, 윈도우, 미배포): **확장 모드 B 초대** — 맥미니 실물 확인([`docs/DOM_CHECK_20261105.md`](docs/DOM_CHECK_20261105.md)) 반영. `extension/`(manifest 표시명 = 프로그램명, `version_name` v1.01): 회원이 연 내 카페 탭에서 「초대」 메뉴 링크로 카페 번호를 찾고 → `next_target` → 초대 화면 「아이디」 → `input._naverIdList`에 한 글자씩 입력 → 「초대하기」 → 누른 뒤 **새로 생긴 문구·알림창만**으로 판정(`invite.mjs` `classify`: sent/failed/limited/uncertain, 화면에 늘 있는 「한 달 최대 300명」 안내는 판정에서 제외) → `sent_mark`. 사람 간격 60~120초, 탭이 앞에 없으면 잠시 멈춤, 로그인·보안문자·제한·모르는 화면·**결과 불확실이면 멈추고 다시 보내지 않음**(불확실은 `failed`+「결과 확인 못 함」으로 기록 → `next_target`이 그 사람을 다시 주지 않음). 서버 `/api/recruit/extension`(회원 로그인 쿠키, `chrome-extension://` 또는 같은 주소만, `next_target`·`sent_mark` 두 가지만 — 명단 넣기·승인·설정은 웹에서만). 인증은 `competitor-analysis` v1.10에서 맥미니가 동작 확인한 쿠키 방식(기기 토큰 방식 대신). ZIP `public/downloads/naver-cafe-recruit-extension-v1.01.zip`·`-latest.zip`(7,099바이트), 오늘의 모집 화면에 「확장 내려받기」·설치 3단계, 가이드 4단계·초대 메뉴/월 300명/정보통신망법 안내. 시험 `tests/extension.test.mjs` 7개(EX01~07) 추가 → 단위 11개 통과, tsc 0, 로컬 빌드 통과. **모드 A 수집은 주인님 재결정 전이라 만들지 않음.** 보낸 뒤 성공·제한 문구는 아직 실물로 못 봐서 판정 규칙은 추정 — 첫 실물 시험(시험 계정이 아는 아이디 1명, 주인님 승인)에서 실제 문구로 맞춘다.
- **로컬 설치 주의**: 이 PC npm은 `allow-remote=none`이라 `xlsx`(SheetJS CDN tgz)를 받지 못함 → 지역 설치는 xlsx를 빼고 하고 `kakao_auto_poster/node_modules/xlsx`(0.20.3)를 복사해 시험. `package.json`에는 0.20.3 그대로(Vercel 빌드가 설치). `package-lock.json`에는 xlsx가 없음.

## 5. 남은 작업 (백로그)
- [x] DB 적용(윈도우, 2026-11-05) · [x] 프로그램 뼈대 v1.01 · [x] 웹 서버 라우트(설정·대상·검토·기록) · [x] 화면(오늘·설정·모으기·결과·가이드) · [x] 엑셀 내려받기 버튼(결과 화면)
- [x] 맥미니 ego 실물 확인(2026-11-05, [`docs/DOM_CHECK_20261105.md`](docs/DOM_CHECK_20261105.md)) — 회원 화면에 작성자 아이디 없음
- [x] 확장 모드 B(`next_target`→초대→`sent_mark`) + 확장용 서버 라우트(로그인 쿠키) — 2026-11-06, 미배포
- [x] 주인님 결정(2026-11-06): 모드 A = **A-1** 명단(닉네임·등급·게시판)만 모으기 + 초대링크. 플랜 [`docs/PLAN_20261106_MODE_A1.md`](docs/PLAN_20261106_MODE_A1.md)
- [ ] A-1 구현 — **DB 변경(새 표 `ncr_members`·`invite_link` 칸, 추가만) 주인님 승인 대기**
- [ ] 첫 실물 초대 1건 — 주인님 지시로 맥미니에 요청([`docs/REQUEST_20261106_MACMINI_INVITE_TEST.md`](docs/REQUEST_20261106_MACMINI_INVITE_TEST.md)), 받을 아이디는 주인님이 맥미니 채팅에서 지정 → 결과 `docs/INVITE_TEST_20261106.md` → 윈도우가 `invite.mjs` 판정 규칙 확정
- [ ] 모드 C(카페 홍보 글) 연결 — `naver-cafe-poster` 게시 재사용 방식 결정
- [ ] 모드 B 자동 채우기: `blog-neighbor-care` 서로이웃 가져오기
- [x] 빌드(주인님 승인, 2회) · Vercel 프로젝트·환경변수(`CRON_SECRET` 포함) · 도메인 `naver-cafe-recruit.buylife.xyz` — 2026-11-06
- [ ] 공개: `programs.is_active=true`·`detail_sections`·썸네일 · 비교표·분석표(EXT-MKT-08·10) 갱신 · VIP 자동 부여 확인 — 첫 실물 초대 확인 뒤
- [x] 작은 수정: 좌측 메뉴 묶음 이름 「4단계 포스팅 파이프라인」(원본 복사) → 「3단계 모집 순서」 — **미배포 대기**(다음 배포 때 함께, 버전은 그때 v1.02)
- [x] 보관 기간: 30일 확정(2026-11-05 주인님 「30일 기준으로 만들어도 되는 프로그램이야」), 연장 없음

## 6. 타 프로그램 연계·병합 아이디어
- `blog-neighbor-care`: 서로이웃 수락한 이웃을 모드 B 대상으로(관계 있는 사람).
- `naver-cafe-poster`: 모드 C 카페 글 게시 재사용 + **가입 카페·게시판 자동 불러오기 개선을 역수출**(그 프로그램의 club_id·menu_id 직접 입력 약점 해소).
- 외부 분석 `EXT-MKT-08·10`(아이디 추출·초대 발송)을 합쳐 이 한 프로그램으로.

## 7. UI/UX 개선안
- 한 화면 모드 선택(A·B·C 큰 카드) + 오늘 할 일(모은 수·승인 대기·보낸 수·확인 필요) + 전체 일시정지 1개.
- 초보자용 가이드(`/guide`): 네이버 로그인 → 카페 고르기 → 모드 고르기 → 승인 → 결과, 시각 카드.

## 지킬 것 (요약)
회원 본인 로그인 세션·본인 계정 · 비밀번호 안 다룸 · IP 바꾸기·탐지 회피·보안 확인 자동 통과 ❌ · 상한·시간대·사람 속도 · 제한 뜨면 그날 중지 · 동의 없는 대량 발송 ❌ · 결과 회원 소유 격리 · 모드 A는 관리자 지정 + 회원 책임 동의.
