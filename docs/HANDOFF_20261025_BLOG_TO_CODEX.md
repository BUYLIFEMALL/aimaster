# 블로그 담당 인수인계 — Claude Code → Codex (2026-10-25)

- 넘기는 세션: [역할: blog] Claude Code(윈도우, 메인 크롬) `claude-win-20261024-blog3`
- 받는 쪽: **Codex** (주인님 지시 2026-10-25: 「너가 하던걸 codex가 이어서 할꺼니까 인수인계 문서 만들어줘」)
- 역할 ID: `blog` · 역할 파일 [`docs/roles/blog.md`](roles/blog.md) · 앞 인계 [`HANDOFF_20261024_BLOG_SESSION.md`](HANDOFF_20261024_BLOG_SESSION.md) → [`HANDOFF_20261023_BLOG_SESSION.md`](HANDOFF_20261023_BLOG_SESSION.md)
- 맡은 폴더: `ai-auto-blog` `blog-keyword` `blog-workroom` `naver-blog-agent` `naver-blog-allinone` `naver-blog-auto-poster_web`(비공개) `naver-blog-seo-studio` `tistory-auto-blog` `blog-content-maker` + 신규 `blog-neighbor-care`(아직 폴더 없음)
- 넘길 때 상태: 이 세션의 코드·문서는 **모두 커밋·푸시 완료**(미커밋 0). 운영 DB `esgxyikcnnvmlhygjkth`.

## 0. 시작 전에 꼭 읽을 것 (순서)
1. 루트 `AGENTS.md`의 맨 위 지침 — 특히 「🧭 블로그 작업 최우선 핵심 지침」: 웹에서 원문·이미지 완성 → 확장이 글쓰기 화면에 자동 입력 → 회원이 고른 방식(ⓐ 발행 전까지 ⓑ 실제 포스팅 ⓒ 예약 포스팅) → 결과 기록.
2. `node scripts/dev-requests.mjs list --role blog` — 관리자 지시는 절대 지시. (2026-10-24 기준 `report`·`ask`는 DB 마이그레이션 0044 미적용이라 실패했음. 지금 되는지 한 번 확인)
3. [`docs/BLOG_FEATURE_MATRIX.md`](BLOG_FEATURE_MATRIX.md) — 블로그 8개 프로그램 기능표·기준 코드 위치. 기능을 배포하면 같은 커밋에서 칸을 고친다.
4. `naver-blog-agent/docs/IMPROVEMENTS.md` 맨 아래, `naver-blog-seo-studio/docs/PLAN_20261024_RESERVE_POSTING.md`.
5. `docs/ACTIVE_WORK.md`의 `naver-blog-agent/` 줄을 Codex 세션 이름으로 바꾼다(아래 6번).

## 1. 지금 멈춰 있는 일 ① — 에이전트 간편 모드 실제 입력 시험 (최우선)

| 항목 | 값 |
|---|---|
| 프로그램 | `naver-blog-agent` v2.21 (운영 배포됨) |
| 시험 원고 | `48f06db1-6e01-4099-b151-1ac5f90519cc` 「2026 가을 캠핑 준비물 체크리스트…」 (시험 계정 `buylifemall@naver.com`, 블로그 `buylifemall`) |
| 방식 | ⓐ 「발행 전까지」(입력만, 발행 버튼은 누르지 않음) · 비공개 |
| 화면 | 보관함 https://naver-blog-agent.buylife.xyz/queue → 맨 위 원고 「발행 전송」 |
| AI 비용 | 없음(이미 만든 원고) |

**지금까지 결과**: 3번 실패 — 10-24 11:44·12:52 `EDITOR_PREPARATION_FAILED`, 12:05 `EDITOR_TAB_CLOSED`.

**원인(확인함)**: 보관함 화면에서 확장에 `categories` 신호(`postMessage {source:'nba-publishing-app', type:'categories', requestId, userId, blogId}`)를 보내 보니, 메인 크롬의 에이전트 확장은 설치돼 있지만 **응답이 `{"error":"확장을 본인 계정으로 먼저 연결해 주세요."}`** — 계정 연결(토큰)이 안 된 상태였다. DB에 있는 활성 연결(기기 이름 「Chrome」, 2026-10-21 연결)은 **다른 브라우저·다른 PC의 확장**이고, 그쪽 확장이 작업을 가져가 실패한 것으로 판단한다(Claude는 그 브라우저를 볼 수 없었음).

**Codex가 이어서 할 일**
1. Codex 작업 브라우저는 **엣지**다(루트 CLI별 브라우저 규칙). 크롬을 건드리지 않는다. 그래서 시험도 엣지에서 한다:
   - 엣지에 에이전트 확장 설치(압축 해제 방식, `naver-blog-agent/extension/` 또는 최신 ZIP) → 시험 계정으로 **확장 계정 연결** → 같은 엣지에서 네이버 `buylifemall` 로그인. **비밀번호·연결 버튼은 주인님이 직접**(에이전트는 입력하지 않음).
2. 같은 계정에 연결된 확장이 둘이면 작업을 어느 쪽이 가져갈지 알 수 없다. 옛 연결(「Chrome」, 10-21)을 정리할지 **주인님께 먼저 여쭙는다**(토큰 폐기 = DB 쓰기).
3. 보관함에서 `48f06db1` 「발행 전송」 → 보이는 엣지 창에서 보관함 새로고침·캡처로 진행 확인(숨은 DB 폴링 스크립트 금지, DB는 짧은 대조만). 네이버 글쓰기 화면에 제목·본문·이미지·태그가 들어가고 **발행 버튼은 누르지 않은 상태**면 성공.
4. 결과(성공/실패 사유)를 `naver-blog-agent/docs/IMPROVEMENTS.md`, 역할 파일, `BLOG_FEATURE_MATRIX.md`(실제 입력 검수 칸)에 기록.

참고 — 확장 연결 확인 방법(보관함 페이지 콘솔에서 읽기만): `/api/posts/48f06db1-6e01-4099-b151-1ac5f90519cc/publishing` 응답 키 `userId, blogId, save_revision, executionMode, reserved, scheduledAt, category, defaultCategory, tags`. 그 `userId`·`blogId`로 위 `categories` 신호를 보내고 `source:'nba-publishing-extension'` 응답을 본다.

## 2. 멈춰 있는 일 ② — SEO 스튜디오 예약 포스팅 실제 시험
- `naver-blog-seo-studio` v2.19 예약 포스팅 배포 완료(커밋 `bbd6d771a`·`92fb0bb7a`, 플랜 `naver-blog-seo-studio/docs/PLAN_20261024_RESERVE_POSTING.md`).
- 자동 시험·빌드는 통과, **실제 네이버 예약은 미검수** — 주인님 직접 시험 대기: 확장 ZIP 다시 받기 → 비공개 원고 1건 30분 뒤 「예약 포스팅 시작」 → 웹에 「예약 완료」 → 네이버 예약 목록에서 취소.
- Codex가 엣지로 `blog.naver.com`을 열 수 있으면 주인님 승인 받고 직접 시험해도 된다(예약은 반드시 취소).

## 3. 다른 CLI 변경 — 이어받을 때 확인할 것
- **agy가 2026-10-25 디자인 변경**: `naver-blog-seo-studio` v2.20(`8564809c9`, 사이드바 3D 확장 다운로드 버튼·API키 퀵액션·`/guide`), `blog-content-maker` v1.12(`148e0a5e5`). 화면·CSS·manifest·ZIP만 바뀌었고 예약 포스팅 로직은 그대로다.
  - 확인할 것: 두 프로그램이 실제 배포됐는지, `node scripts/check-extension-release.mjs naver-blog-seo-studio` / `blog-content-maker`가 `OK`인지, DB `programs.version`·`extension_version`이 맞는지. 안 맞으면 agy 쪽 기록(HANDOFF 맨 위)을 먼저 보고 주인님께 알린다.
  - 작업 폴더에 `naver-blog-seo-studio/public/downloads/naver-blog-seo-studio-extension-v2.19.zip` **삭제(미커밋)**가 남아 있다 — Claude가 지운 게 아니다(agy 빌드 정리로 추정). 임의로 커밋·되돌리지 말고 agy 기록 확인 뒤 처리.

## 4. 남은 일 (순서대로)
| 순서 | 프로그램 | 할 일 | 비용·승인 | 근거 |
|---|---|---|---|---|
| 1 | `naver-blog-agent` | 위 1번 실제 입력 시험 | 없음 | 위 |
| 2 | `blog-content-maker` | ③-2 실제 포스팅·예약 포스팅·결과 기록 추가(핵심 지침 ③ — 지금 「발행 전까지」만). **플랜 먼저 주인님께** | 빌드 1회 승인 | `BLOG_FEATURE_MATRIX.md` 2-6, `docs/BLOG_CONSOLIDATION_TASKS.md` |
| 3 | 블로그 5개 | ④ 묶음 E Next.js 보안 업데이트 | 프로그램마다 빌드 1회 승인 | `docs/HANDOFF_20261023_NEXTJS_SECURITY_SPLIT.md`, `docs/PLAN_20261023_NEXTJS_SECURITY.md` |
| 4 | `blog-neighbor-care`(신규) | AI 블로그 이웃 소통 자동화 — 0단계 사전 검증(임시 확장, 주인님 설치) → 1~5단계. 주인님 결정 D1~D9는 절대 지시. **착수 시점을 주인님께 여쭙기** | 빌드 4~5회·AI 시험 사전 승인 | `docs/analysis-naver-blog-neighbor-20261024/HANDOFF_20261024_BLOG_NEIGHBOR_CARE.md`·`PLAN_…`·`REPORT.md` |
| — | `naver-blog-agent` | **미배포 대기 `89d135c4b`**(「발행 전까지」로 바꾸면 예약 미리 넣기 끄기) — 다음 에이전트 배포 때 함께, 그때 v2.22 | — | `naver-blog-agent/docs/IMPROVEMENTS.md`, `docs/PENDING_DEPLOYS.md` |

개선 후보(우선순위 결정 대기, `naver-blog-agent/docs/IMPROVEMENTS.md`): 간편 회원용 간편 원고 목록(실패·지난 원고 다시 보내기) · 간편 결과 화면이 확장 상태 변경 뒤 최신 원고 다시 불러오기(지금은 재전송 때 저장 충돌) · **확장 연결 기기 표시**(지금 「Chrome」뿐이라 PC·브라우저 구분 불가 — 1번 실패가 실제 근거) · 본문 첫 줄 제목 반복. 공용 기준 코드 후보: 네이버 예약 설정·예약 목록 확인 코드(에이전트·SEO 두 곳, `docs/SHARED_FEATURE_MAP.md` 후보).

## 5. 주인님 결정 대기
- 워드프레스·블로그스팟은 공식 발행 API가 있다 — 확장 대신 공식 API로 발행해도 되는지(핵심 지침 예외 한 줄).
- BLOG(`ai-auto-blog`) 정리 시점(이동 안내·비공개·FREE 배지 이전), `naver-blog-agent/docs/PLAN_20261024_MAEPSI_E1_E4.md` E-4 5번.
- E-2 회원 선택 빠른 입력 재개 여부(보류 중).
- 도톨이 2차(이전 글 비교·스타일 점수·이미지 노드), N7·N13 — `naver-blog-seo-studio/docs/PLAN_20261024_DOTORI_D1_D4.md`.

## 6. 작업 규칙 메모 (이 역할에서 실제로 걸렸던 것)
- **커밋**: 일반 파일 `node scripts/commit-paths.mjs "<msg>" <경로…> --as <세션>`, 공용 문서는 `node scripts/safe-commit.mjs --begin <파일…> --as <세션>` → 수정 → `safe-commit.mjs "<msg>" <파일…> --as <세션> [--push]`. 커밋 뒤 `git show --stat HEAD | tail -1`. `git add -A`·`--no-verify`·경로 없는 커밋 금지.
- **배포**: Vercel 팀 `buylife`에 BUILDING/QUEUED 0건 확인 → `node scripts/deploy.mjs <폴더> --go --owner <세션>` → DB `update programs set version='vX.YY', extension_version='vX.YY', extension_download_url='<최신 ZIP>', updated_at=now() where slug='<slug>';` → `node scripts/check-extension-release.mjs <slug>` OK. 빌드는 비용이라 **사전 승인**, 작은 수정은 모았다가 배포. 푸시는 작업 단위 끝에 한 번.
- **포그라운드**: 시험·검수는 보이는 엣지 창에서, 탭을 숨기지 않는다. 지금 조작하는 탭이 앞에 보여야 한다.
- **시험**: `naver-blog-agent/scripts/test-*.cjs`, SEO `tests/`(브라우저 가짜 편집기 시험 포함). 확장 코드를 바꾸면 manifest·ZIP·DB 버전을 함께 맞춘다.
- 회원 본인 키·계정 원칙: 시험은 시험 계정이 등록한 본인 키만, 비밀번호는 입력하지 않는다.
- 끝날 때: 역할 파일 갱신, HANDOFF 맨 위 `[역할: blog]` 항목, 비용 리포트.

## 7. 다음 첫 단계
1. 0번 문서들을 읽고 `docs/ACTIVE_WORK.md` 줄을 Codex 세션 이름으로 바꾼다.
2. 3번(agy v2.20·v1.12 배포·확장 일치) 확인.
3. 주인님께 엣지 확장 계정 연결·네이버 로그인을 요청하고(옛 연결 정리 여부도), 1번 실제 입력 시험을 보이는 엣지 창에서 다시 한다.

프로그램 링크:

https://naver-blog-agent.buylife.xyz

https://naver-blog-seo-studio.buylife.xyz

https://blog-content-maker.buylife.xyz
