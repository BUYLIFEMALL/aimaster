# 수강생 배포 키트 3종 — Lab(AIMaster_dev) 설치 안내 (주인님 직접 진행용)

> 2026-11-16 · 작성 Claude(Support) `CC-SUPPORT-01` · 주인님 결정: 키트 3개를 AIMaster_dev에 **사이트마다 별도 Supabase·Vercel 프로젝트**로 올려 관리, 그 설치 과정이 곧 리허설.
> 운영 DB(`esgxyikcnnvmlhygjkth`)·운영 Vercel 프로젝트는 쓰지 않습니다. 키·비밀번호는 마법사 숨김 입력으로만 넣고 문서·채팅에 적지 마세요.

## 1. 설치할 파일 (모두 `D:\PDS\AIMater_KIT\`)

| 순서 | 키트 | 폴더 이름 | SHA-256 | 비고 |
|---|---|---|---|---|
| 1 | `Threads_Auto_Posting_Kit_v1.02.zip` | `threads` | `799f4d74f65e8a3c44856d41d8376888fa4c0d0cfa128cc4d654f25ec923b3e6` | v1.01은 내부 시험본 — 쓰지 마세요 |
| 2 | `Insta_Auto_Posting_Kit_v1.11.zip` | `insta_auto_poster` | `85169512871f5f109dc255e84d2e805be0f7326171aa2e4e930ba176cfbe9507` | v1.10 이하 쓰지 마세요(프로필 권한 보완 전) |
| 3 | `Blog_Posting_Kit_v1.07.zip` | `ai-auto-blog` | `fdb73b426e58614656291d0f3686635277d29ef20221e3fe540b730afc35c5d9` | v1.04~v1.06 쓰지 마세요(확장 주소 문제) |

해시 확인(PowerShell): `Get-FileHash D:\PDS\AIMater_KIT\<파일>.zip -Algorithm SHA256`

## 2. 사이트별 프로젝트 배치 (결정됨)

| 사이트 | Supabase (조직 `BUYLIFE-DEV`, 무료) | Vercel (팀 `buylife`) |
|---|---|---|
| Threads | 기존 `kit-threads` — **표를 비운 빈 상태로** 쓰거나, 비우기 어려우면 새 프로젝트 | 마법사 ⑥단계 사이트 이름을 `dev-`로 시작(예: `dev-kit-threads`) |
| INSTA | **새 프로젝트**(예: `kit-insta`) | 예: `dev-kit-insta` |
| 블로그 | 기존 `kit-blog`(ref `phbxvmjielzmvkbvkqvy`) — 예전 콘텐츠 전용판이 설치돼 있으면 아래 「기존 프로젝트 재사용」 참고 | 예: `dev-kit-blog` |

- 무료 조직은 **활성 프로젝트 수 제한**(보통 2개)이 있습니다. 새로 만들 때 막히면 안 쓰는 프로젝트를 Pause하세요.
- ⚠ 각 키트의 `schema.sql`은 **빈 새 프로젝트용**입니다. 다른 키트가 쓰던 표가 남아 있으면 같은 이름 표(`user_api_keys`·`newsblur_accounts` 등)와 부딪힙니다.
- **기존 프로젝트 재사용**: 블로그는 예전 설치(`Blog_Content_Kit`) 위에 **업데이트**도 됩니다 — 그때는 `schema.sql` 대신 `KIT/upgrade-20261116-extension.sql`만 실행. Threads는 예전 `kit-threads`가 다른 프로그램(`threads-content-ops`) 구조라 **새로 비우거나 새 프로젝트**가 안전합니다.

## 3. 설치 순서 (사이트마다 같음 — 한 사이트씩)

1. ZIP을 **짧은 영문 경로**에 풉니다(예: `D:\lab\threads`). GitHub 저장소 폴더 안에 풀지 마세요.
2. 프로그램 폴더 맨 위 **`패키지설치마법사.cmd`** 더블클릭 → 8단계 진행
   - ② Supabase 프로젝트: 위 표의 프로젝트(BUYLIFE-DEV 조직) 주소창 주소 붙여넣기
   - ③ 키: Publishable → Secret 순서(숨김 입력)
   - ④ DB: 마법사가 복사한 SQL을 SQL Editor에 붙여넣고 Run → 자동 확인
   - ⑤ Confirm email 끄기(또는 켜 두고 ⑧의 URL Configuration 저장)
   - ⑥ 사이트 이름 `dev-…`, 브랜드 이름
   - ⑦ 내 PC 설치·빌드(3~5분) — **공용 3210 서버 등 다른 작업이 무거우면 끝난 뒤에**
   - ⑧ Vercel: **팀 `buylife`(Lab)** 선택 확인 — 「유료 팀」 경고가 나오면 멈추고 확인. 배포·실제 주소 확인·URL Configuration
3. 끝나면 `설치결과.txt`(사이트 주소·콜백 주소)가 생깁니다.
4. **Vercel 빌드 비용**: 사이트당 1~2회(주소가 다르면 마법사가 한 번 더 배포) — 승인 범위 최대 6회. 한 사이트 배포가 Ready가 된 뒤 다음 사이트.

## 4. 사이트별 필수 설정 (설치 후)

| 사이트 | 해야 할 것 | 근거 |
|---|---|---|
| Threads | Meta 앱(Threads API) — 콜백 3개 `https://내주소/api/threads/callback` · `/api/threads/uninstall` · `/api/threads/delete`, 앱 도메인, Threads 테스터 초대 수락 → 사이트에 Threads 앱 ID·시크릿 저장 → 연결. 예약은 cron-job.org 키 | `threads/KIT/README.md` 4~6장, `PLATFORMS.md` 1·6 |
| INSTA | Meta 앱(Instagram 로그인) — OAuth 리디렉션 `https://내주소/api/instagram/callback/byok`, 테스터, 비즈니스/크리에이터 계정 → 앱 ID·시크릿 저장 → 연결. 예약은 cron-job.org 키 | `insta_auto_poster/KIT/README.md` 4~6장 |
| 블로그 | 사이트에서 **⬇ 확장 프로그램 받기**(이 사이트 주소가 들어간 ZIP) → `chrome://extensions` 개발자 모드 → 압축해제 로드 → 사이드패널 [자동 연결] → 네이버 블로그 ID 저장 → 글 보기 [🧩 네이버 입력기로 보내기] | `ai-auto-blog/KIT/README.md` 4·5장 |

공통: 사이트에 가입(누구나 가입) → 좌측 API키등록·플랫폼연동에서 **본인** AI 키(Gemini 등) 저장. 키트에는 키가 하나도 들어 있지 않습니다.

## 5. 리허설에서 확인할 것 (결과를 알려 주시면 기록·수정합니다)

- [ ] 마법사 8단계가 막힘 없이 끝나는가(막힌 단계·문구를 그대로 알려 주세요)
- [ ] `https://dev-…vercel.app`에서 가입·로그인, 화면에 AIMaster/buylife 글자·링크가 없는가
- [ ] Threads: 계정 연결 → 즉시 게시 1건 → 예약 1건(cron-job.org 작업 자동 켜짐/꺼짐)
- [ ] INSTA: 계정 연결 → 피드 즉시 게시 1건(이미지 JPEG) → 예약 1건
- [ ] 블로그: 내려받은 확장의 사이드패널이 **내 Lab 사이트**에 연결되는가, 네이버 입력이 발행 직전까지 되는가, 글 이미지가 들어가는가
- [ ] Supabase 표·버킷이 키트 표와 같은가, 다른 회원 데이터가 안 보이는가(시험 계정 2개면 확인 가능)

## 6. 지금까지 확인된 것 / 아직 아닌 것

- 확인: 세 키트 포장 비밀값 검사·DB 대조 통과, 압축 안 운영·Lab DB 식별자·계정 문자열 0건, `.env`·`.vercel` 없음. Threads·INSTA·블로그 새 폴더 `npm ci`+`build`+`start` 화면·경로 확인(블로그는 v1.05로 빌드, v1.07은 고친 확장 ZIP 스크립트만 재확인). 내 PC 임시 DB(PGlite) 권한 시험 22/22.
- 아직: 실제 Supabase·Vercel 설치, Meta·네이버 연결, 실제 게시·예약, 맥에서의 마법사. 원본 프로그램(운영) 쪽 변경은 동작 같음 — 각 프로그램 다음 배포 때 함께(미배포 대기).
- **미해결(Master 지적, 2026-11-16)**: 블로그 키트의 **프로그램 이름 「블로그 포스팅 자동화」 ≠ 확장 표시 이름 「블로그 포스팅 네이버 입력기」**(브랜드를 넣으면 「… · 브랜드」). 최상위 규칙 「본 프로그램명·확장 프로그램명 일치」([확장 운영 규칙 §1-1](EXTENSION_RELEASE_RULES.md#extension-program-name-match)) 위반 — 운영판 확장도 같은 이름이라 키트만의 문제는 아님. 지금 ZIP(`Blog_Posting_Kit_v1.07`, SHA `fdb73b42…`)은 동결 상태로 그대로이며, 이름을 맞출지(예: 확장 이름 「블로그 포스팅 자동화」)는 주인님·Master 결정 뒤 원본(`ai-auto-blog/extension/manifest.json`·`KIT/extension.manifest.json`)에서 고치고 다음 번호로 다시 포장합니다.

## 7. 관련 문서
- 결과 보고: `.ai/results/SUP-20261116-03-CC-SUPPORT-01.md`, `.ai/results/SUP-20261116-04-CC-SUPPORT-01.md`
- 키트 지침: `docs/DISTRIBUTION_KIT_GUIDE.md` §8·§10, Lab 지침: `docs/AIMASTER_DEV_LAB_GUIDELINES.md`
