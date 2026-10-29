# 인수인계 — 부동산 역할 작업 (2026-10-26 ~ 2026-10-29)

- 역할: [역할: realty] Claude Code(윈도우) · 세션 `claude-win-20261024-realty` · 역할 파일 [`docs/roles/realty.md`](../../docs/roles/realty.md)
- 대상: 「부동산 실시간 매물 알림」(`realty-listing-alert`, 지금 **v1.36**) · 「부동산 실거래 투자분석 자동화」(`real_estate_sales`, slug `real-estate-sales`, 지금 **v1.22**)
- 운영 DB: ① AIMaster `esgxyikcnnvmlhygjkth`
- 앞 인수인계: [`IMPROVEMENT_HANDOFF_20261025.md`](IMPROVEMENT_HANDOFF_20261025.md)
- 주소: https://realty-listing-alert.buylife.xyz · https://real-estate-sales.buylife.xyz · 메인 상세 https://www.buylife.xyz/programs/realty-listing-alert

---

## 1. 이 기간에 한 일

### 1-1. 매물 알림 (`realty-listing-alert`)
| 버전 | 날짜 | 내용 | 배포 |
|---|---|---|---|
| v1.29 | 10-26 | 결과 표 정렬·거르기, 「층(해당/전체)」, 📉 여러 번 내린 매물, 팝업 계정 강조, AI 요약 글 정리, 실거래 이름 맞추기 보강(마을·○단지 무시, 60% 규칙) | 1회 |
| v1.30 | 10-26 | 카톡 글·버튼(변동 단지 매물 목록), 실거래 저장분(빈 결과 3시간·규칙 버전), 팝업 진단 줄 숨김 | 1회 |
| v1.31 | 10-26 | 시험 계정(관리자·테스트) 하루 300페이지 한도 예외(`lib/limits.ts` `LIMIT_EXEMPT_EMAILS`) | 1회 |
| v1.32 | 10-26 | 끊긴 수집 자동 정리, 시험 계정 노란 배지, 실거래 자료 없는 단지 이름 기록 | 1회 |
| v1.33 | 10-26 | 📅 주간 리포트(D), ⏳ 오래 안 팔린 매물, 휴대폰 설정 카드, 팝업 소개·버전 칩 | 1회 |
| v1.34 | 10-26 | 🔁 다시 올린 매물 묶기(J), 실거래 이름 후보 기록(K), 카톡 주간 리포트 문장 끝 자르기(L) | 1회 |
| (DB만) | 10-26 | **정식 공개** — 주인님 「공개해」. `programs.badges`에서 `coming` 제거. VIP 등급 표에는 이미 있어 VIP 145명 전원 유효 권한 확인 | 빌드 없음 |
| v1.35 | 10-29 | **시공사 여럿인 단지 실거래 이름 맞추기**(K 후속) — 아래 2-1 | 1회 |
| v1.36 | 10-29 | **연계 I 「📝 글로 쓰기」** — 아래 2-2 | 1회 |

### 1-2. 실거래 (`real_estate_sales`)
| 버전 | 날짜 | 내용 |
|---|---|---|
| v1.20 | 10-26 | RE-P3 AI 프롬프트 당해 연도 · RE-P2 예약 수집 권한 확인(만료 회원 제외, `src/lib/accessBatch.ts`) · RE-P1 생성 데이터 1년 정리(주인님 지정) |
| v1.21 | 10-26 | RE-B1 목록 쪽 나누기 · RE-B2 열어 본 실거래 「✔ 확인됨」 · RE-N1 네이버 부동산 바로가기 · RE-N2 CSV 내려받기(`src/lib/actions/export.ts`) |
| v1.22 | 10-26 | RE-B3 브이월드 등록 도메인을 `real-estate-sales.buylife.xyz`로(주인님이 포털 변경, 운영 환경변수 교체) |

---

## 2. 10-29 작업 상세

### 2-1. v1.35 — 시공사 여럿인 단지 이름 맞추기
- 근거(확장 기록 10-27·10-28·10-29): `실거래 이름 후보: 백송선경,코오롱8단지 → 백송마을(선경), 백송마을(코오롱), 강촌마을(코오롱), 중산마을2(코오롱), 중산마을7(코오롱)`. 국토부가 한 단지를 시공사별 두 이름으로 신고한다.
- 수정: `lib/trades.ts` `nameMatches` — **네이버 이름에 쉼표가 있을 때만** 국토부 `마을이름(시공사)`의 마을이름으로 시작하고 시공사를 품으면 같은 단지. 쉼표 없는 이름은 기존 규칙 그대로.
- 「흰돌6단지라이프」 후보는 「강촌마을(라이프)」(다른 단지)뿐 → 최근 6개월 매매 신고 없음으로 판단, 고치지 않음.
- 시험 `tests/relist.test.ts` 「K 후속」. 커밋 `294545cdc`(코드)·`39c0919af`(배포).

### 2-2. v1.36 — 연계 I 「📝 글로 쓰기」
- 수집 결과 통계(`app/results/StatsDashboard.tsx`) 「🏢 단지 비교」 표에 「블로그」 칸 → 「📝 글로 쓰기 ↗」.
- `lib/blogDraft.ts` `buildBlogDraftLink` — `https://ai-auto-blog.buylife.xyz/write/ai-form?topic=…&keywords=…`. 블로그 쪽 입구는 원래 있던 것(**블로그 코드 변경 없음**, 같은 입구가 `tistory-auto-blog`에도 있음).
- 주제: 「{연도}년 {월}월 {단지} 아파트 매물 시세 — 매매 평균·전세 평균·실거래 대비·새 매물·가격 내림」(120자 상한, 연도는 `getFullYear()`). 키워드 4개.
- 넘기지 않음: 중개사·전화번호·매물 번호·동호수(전화번호 꼴 숫자는 지움).
- 시험 `tests/blogDraft.test.ts` 4개(전체 81개). 플랜 [`PLAN_20261029_BLOG_DRAFT_I.md`](PLAN_20261029_BLOG_DRAFT_I.md). 커밋 `456351c3b`.
- 확인: 크롬에서 같은 함수로 만든 주소를 열어 블로그 글쓰기 화면 「글감·주제」와 키워드 4개 채움 확인(글 생성은 비용 때문에 안 누름). **매물 알림 화면의 버튼 자체는 아직 못 봄**(아래 4번).

### 2-3. 주인님 결정 (10-29)
| 결정 | 원문 | 반영 |
|---|---|---|
| PC 프로그램(Electron) 만들지 않음 | 「pc프로그램은 만들지마 관리하기 힘들어」 | 백로그 6단계 취소선·`AGENTS.md` 절대 원칙 3 · 다시 제안하지 않음(`610796228`) |
| 실거래 #8 공공데이터 키 | 「우선은 운영자 키로 사용 사용량 보고 나중에 사용자 별로 분리하자」 | `real_estate_sales/docs/IMPROVEMENTS.md` #8 — 일일 한도에 가까워지면 회원별 분리 플랜 보고 |
| 연계 H·I 진행 | 「그 이걸 하자」 | H는 실거래 v1.21에 이미 배포돼 완료 표시(`PROGRAM_IDEA_BACKLOG.md` IDEA-REALTY-01·02), I는 v1.36 |
| 옛 n8n 환경변수 | 「n8n에서 사용하는 것이니 문제가 안된다면 그냥 놔둬」 | 실거래 Vercel의 `N8N_VWORLD_PROXY_URL`·`N8N_VWORLD_PROXY_TOKEN` **지우지 않음** |

---

## 3. 꼭 알아야 할 것 (다음 CLI)

1. **매물 알림 확장이 실제로 도는 곳은 크롬이 아니라 「ego lite」 브라우저**(Citro Labs)다. 시험 계정 `buylifemall@naver.com`에 연결, 하루 1회 저녁(지터 있음 — 10-27 19:08, 10-28 19:04, 10-29 17:28 KST). 크롬에도 같은 확장(번호 `ebjedhppgjcagfehkokmbegencmebmnk`, 저장소 `extension/` 폴더 그대로)이 있지만 10-27 이후 수집이 없다.
2. **수집 기록 읽는 법**(확장 팝업을 Claude가 열 수 없음 — `chrome://`·`chrome-extension://` 이동 차단): 저장 파일에서 줄만 뽑는다.
   ```bash
   D="$LOCALAPPDATA/Citro Labs/ego lite/User Data/Profile 1/Local Extension Settings/ebjedhppgjcagfehkokmbegencmebmnk"
   for f in "$D"/*.log "$D"/*.ldb; do grep -aoE '2026-10-[0-9]{2}T[0-9:.]+Z (실거래|수집|예약|🔁)[^"\\]{0,220}' "$f"; done | sort -u | tail -15
   ```
   서버 쪽 마지막 수집은 `realty_alert_device_status`(`last_run_at`·`last_count`·`last_result`·`ext_version`)로 대조한다.
3. **통계 표는 확장 연결 계정 = 웹 로그인 계정일 때만** 웹에 보인다(web-bridge `stats`). 크롬은 관리자 계정이라 표가 안 나오는 게 정상이다.
4. 배포 절차(이번에 쓴 그대로): `list_deployments`(팀 `team_orq6xPe9P3c1uMQdKlJsQ6k9`, BUILDING·QUEUED·INITIALIZING 0건) → `lib/version.ts` 올림 → `node scripts/build-extension-archive.mjs` → `supabase/migrations/2026MMDD…_version_vX_YY.sql` → 경로 지정 커밋 → `node scripts/deploy.mjs realty-listing-alert --go --owner claude-win-20261024-realty` → `git checkout -- realty-listing-alert/next-env.d.ts` → `--version-only --set-version` → **크롬 SQL 편집기에서 `extension_version`까지 갱신**(`--set-version`은 `version`만 바꿈) → `node scripts/check-extension-release.mjs realty-listing-alert` OK → 공용 문서는 `safe-commit --as deploy-realty-listing-alert --push`.
5. 공용 스테이징 주의: 10-29 플랜 커밋이 다른 세션 커밋과 겹쳐 조용히 실패한 일이 있었다(`2>/dev/null`로 오류가 가려짐). 커밋 뒤 `git show --stat HEAD`가 **내 파일 수**인지 꼭 본다.

---

## 4. 남은 일 (다음 첫 단계부터)

| 순서 | 할 일 | 기다리는 것 |
|---|---|---|
| 1 | **다음 수집(10-30 저녁 무렵) 기록 확인** — 실거래 「10/10곳」(흰돌6단지 신고 없으면 9/10), 「🔁 다시 올림」 표시 | 예약 수집(또는 주인님이 ego lite 팝업 「지금 수집」) |
| 2 | 시험 계정 화면에서 「📝 글로 쓰기」 버튼 실물 확인 | 시험 계정 로그인 화면 |
| 3 | 남은 시험: 월세(`B2`), 매물 20건 넘는 단지 2페이지, 예약 연속 회차, 차단 화면 나오면 그날 멈춤 | 해당 상황 |
| ~~4~~ | ~~RLS(다른 회원 설정 안 보임)·「기존 부동산 봇 가져오기」 시험~~ | **완료** — v1.27(2026-10-25) 관리자·테스트 두 계정으로 통과(2026-10-29 문서 정리 때 확인) |
| 5 | 실거래 v1.22: 다음 새 실거래 때 `official_price` 채워지는지 | 새 실거래 수집 |
| 6 | 실거래 RE-B4 경기·인천 확장(플랜 없음) / RE-B5 → lint 경고는 사라졌고 운영 의존성 `zod` high 1건 남음(2026-10-29 `npm audit`) | 플랜 보고 → 주인님 순서 결정 |
| ~~6-1~~ | ~~매물 알림 추가개선 5·6·7~~ | **v1.37 배포 완료(2026-10-29)** — 아래 §7 |
| 6-2 | 쉼표 든 단지 이름 키워드 쪼개짐 수정 | **미배포 대기** — 다음 배포 때 함께 |
| 7 | 실거래 #8 공공데이터 사용량 지켜보기 | 한도 근접 시 플랜 |
| ⏸ | 건물·상가·토지 매물 알림(새 프로그램) | 주인님 재개 지시 · 인수인계 [`HANDOFF_20261025_BUILDING_LISTING_ALERT.md`](../../docs/analysis-naver-realty-collector-20261024/HANDOFF_20261025_BUILDING_LISTING_ALERT.md) |
| ✖ | PC 프로그램(Electron) | 만들지 않음(주인님 결정) |

---

## 5. 비용 (이 기간)
| 항목 | 횟수 |
|---|---|
| Vercel 빌드 — 매물 알림 | v1.29~v1.36 중 v1.29·v1.30·v1.31·v1.32·v1.33·v1.34·v1.35·v1.36 = 8회 |
| Vercel 빌드 — 실거래 | v1.20·v1.21·v1.22 = 3회 |
| AI·유료 외부 호출 | 없음(시험에서 블로그 글 생성 안 함) |
| DB 값만 바꾼 작업 | 정식 공개(빌드 없음) |

## 6. 추가개선 제안
1. **로직·기능**: 실거래 비교에서 「자료 없음」 단지가 며칠 이어지면 결과 표에 「최근 6개월 매매 신고 없음」을 보여 주기(지금은 「—」만).
2. **UI·사용 편의**: 「📝 글로 쓰기」를 주간 리포트 카드(`app/schedule/WeeklyReportCard.tsx`)에도 두면 한 주 요약을 그대로 글감으로 쓸 수 있다.
3. **다른 프로그램 연계**: 같은 입구로 「티스토리 포스팅 자동화」(`tistory-auto-blog/write/ai-form`)도 고를 수 있게(회원이 쓰는 블로그 선택).

→ 1~3 모두 v1.37에서 구현(아래 §7).

---

## 7. v1.37 (2026-10-29 밤, 세션 `claude-win-realty-docs`, 계정 `mtoptop001@gmail.com` Pro)
- **한 일**: 위 §6 1~3. 2번은 `WeeklyReportCard.tsx`가 켜기/요일 설정 카드라 숫자가 없어서, **수집 결과 화면 「📅 지난 주간 리포트」 칸**에 넣음(확장이 주는 `history`에서 `weekly.from~to` 기간만 더함).
- **바뀐 파일**: `lib/blogDraft.ts`(갈 곳·주간 글감·신고 없음 날수) · `app/results/StatsDashboard.tsx` · `extension/background.js`(`tradeMissing`·`stats` 응답) · `tests/blogDraft.test.ts`(4개 추가 → 전체 85) · 버전 파일·ZIP·마이그레이션 `20261029000300_version_v1_37.sql`.
- **검수**: tsc·린트·시험 85·로컬 빌드 통과. 배포 Ready(`realty-listing-alert-l3gwk9oik`), DB `version`·`extension_version` v1.37(`extension_version`은 `scripts/program-info.mjs` `rest`로 갱신), `check-extension-release` OK. 크롬(시험 계정 `buylifemall@naver.com` 로그인 상태): 사이드바 v1.37, 「📝 글 쓸 곳」 칸, 주간 리포트 끝 버튼 → 블로그 글쓰기 화면에 「2026년 10월 25일~26일 일산요진와이시티(주거복합)·백송풍림,삼호 외 8곳 아파트 매물 주간 동향 — 새 매물 94건, …」 채움 확인, 티스토리 주소도 채움 확인. 글 생성은 안 누름.
- **실물에서 찾은 것**: 키워드가 쉼표로 나뉘어 「백송풍림,삼호」가 둘로 쪼개짐 → `draftLink`에서 쉼표를 「·」로(시험 1개 추가, 전체 86) — **미배포 대기**.
- **못 본 것**: 「신고 없음 n일째」 실물 — 새 확장으로 업데이트한 뒤 이틀째 수집부터 보인다(ego lite 확장 새로고침 필요).
- **비용**: Vercel 빌드 1회(승인 범위 안), AI·유료 호출 0.
