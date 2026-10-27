# 크롬 확장 프로그램 운영·업로드 규칙 (모든 CLI 공통 핵심 지침)

**2026-10-27 신규등록대기:** `blog-neighbor-care/extension`·`public/downloads/blog-neighbor-care-extension-latest.zip`·`prebuild`/버전동기화 준비. 계획 v1.01, 검수스크립트목록추가. 운영programs/다운로드URL/배포는아직없어라이브정합성검수는미완료([인계](../blog-neighbor-care/docs/IMPROVEMENT_HANDOFF_20261027_READER_EXTENSION.md)). 미등록경고를숨기지않고첫배포때DB/ZIP/사이트를함께확인합니다.

> 2026-10-09 주인님 지시. 루트 `CLAUDE.md` 핵심 원칙 10번 / `AGENTS.md` 11번의 상세판이다.
> Claude Code · Codex · Gemini 등 어떤 도구든 **확장이 있는 프로그램을 배포하기 전에 이 문서를 읽고, 배포 후 검증 스크립트를 실행한다.**

## 1. 한 줄 규칙

**프로그램을 업데이트·배포하는 같은 작업(같은 커밋·같은 배포)에서 ① `extension/` 폴더, ② 다운로드 ZIP, ③ DB 버전 정보를 모두 같은 버전으로 맞추고, ④ 배포 후 실물 검증까지 한다. 하나라도 빠지면 작업이 끝난 것이 아니다.**

<a id="extension-program-name-match"></a>
## 1-1. 본 프로그램명과 확장 프로그램명 일치

2026-10-27 주인님 지시: 「항상 본 프로그램명하고 확장 프로그램 명은 이름을 맞춰 그래야 안 헷갈리지」. 모든 카테고리·CLI·세션·장비의 신규 확장, 이름 변경, 릴리스에 적용한다.

- **기준명:** 운영 `programs.name`에 등록된 공식 프로그램명. 운영 등록 전에는 사용자가 확정한 본 프로그램명으로 맞춘다.
- **확장 표시명:** `manifest.json`의 `name`을 기준명과 동일하게 쓴다. 별도 브랜드 접두사·기능 접미사·약칭을 임의로 붙여 다른 이름을 만들지 않는다. `short_name`을 쓰면 같은 공식명을 사용하고, 플랫폼 길이 제한에 맞지 않으면 생략한다.
- **화면과 안내:** 확장 목록·툴팁·팝업의 프로그램명, 웹 설치/다운로드 안내에 표시하는 이름도 같은 공식명으로 맞춘다. 현재 기능(예: 본인 글 읽기)은 내부 설명·기능 제목·버튼으로 구분하고 버전은 별도로 표시한다. 예: 본 프로그램이 **AI 블로그 이웃 소통 자동화**이면 확장 이름도 **AI 블로그 이웃 소통 자동화**다.
- **기존 확장:** 다른 이름이 남아 있으면 해당 프로그램의 개선 목록에 명칭 불일치를 기록하고 이름 수정/다음 릴리스 때 함께 바로잡는다. 공식 프로그램명을 바꾸면 확장과 설치 안내도 같은 작업에서 동기화한다. 파일명·slug·확장 ID·연결 정보까지 바꿀 필요는 없다.
- **완료 확인:** 공식명 ↔ 소스 manifest `name` ↔ 다운로드 ZIP 내부 manifest `name` ↔ 실제 설치된 확장 이름을 대조한다. 설치본을 확인하지 못했으면 그 상태를 명시한다. 아래 버전 검사 스크립트의 `OK`만으로 이름 일치까지 검수했다고 보고하지 않는다. 소스 수정과 실제 배포·설치 반영을 구분하고, 작은 수정은 기존 배포 묶음/비용 승인 규칙을 따른다.

## 2. 해야 할 일 (배포마다)

| # | 할 일 | 방법 |
|---|---|---|
| 0 | 본 프로그램명·확장 이름 대조 | §1-1에 따라 공식 프로그램명과 소스/ZIP/설치본의 확장 이름을 같게 맞춘다. 이름 검수는 아래 버전 검수와 별도로 확인한다. |
| 1 | `extension/` 폴더를 업데이트된 프로그램 내용으로 반영 | 확장이 호출하는 서버 API·원고 형식·화면 흐름·설정값이 바뀌었으면 `<프로그램>/extension/` 안 실제 코드를 함께 수정. 관련이 없어도 2번~4번은 생략하지 않는다. `manifest.json`의 `version`(`메이저.마이너.0`)과 `version_name`(`vX.YY`)은 프로그램 버전(`lib/version.ts`)과 같아야 한다. |
| 2 | 다운로드 ZIP 교체 | 확장 폴더의 **내용물**을 ZIP으로 만든다. 기존 다운로드 주소·파일명 규칙을 유지한다(아래 3번 표). |
| 3 | DB 갱신 | `programs`의 `version`, `extension_version`, `extension_download_url`을 **같은 SQL로** 갱신. 마이그레이션 SQL 파일에도 같은 내용을 남긴다. |
| 4 | 배포 후 검증 | `node scripts/check-extension-release.mjs <slug>` 가 `OK`여야 한다(아래 5번). |
| 5 | 보고 | 완료 보고에 "ZIP 다시 받기 → 기존 폴더에 덮어쓰기 → `chrome://extensions` 새로고침" 안내를 넣는다. 설치된 확장은 자동으로 바뀌지 않는다. |

### DB 갱신 SQL 템플릿

```sql
update public.programs
set version = 'vX.YY',
    extension_version = 'vX.YY',                       -- ZIP 안 manifest version_name 과 동일
    extension_download_url = '<최신 ZIP 라이브 주소>',
    updated_at = now()
where slug = '<slug>';
```

DB 칸(`programs.extension_download_url`, `extension_version`)은 `naver-blog-agent/supabase/migrations/0051_programs_extension_download.sql`로 추가했다. 확장이 없는 프로그램은 NULL이다.

## 3. 확장이 있는 프로그램 현황 (2026-10-09 검증)

| slug | 확장 폴더 | 배포 방식 | 다운로드 주소 | 버전 동기화 |
|---|---|---|---|---|
| `naver-blog-agent` | `naver-blog-agent/extension` | 사이트 포함형(빌드 스크립트) | `https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip` (항상 최신 고정 주소) | `scripts/build-extension-archive.mjs`가 `version.ts`→`manifest.json` 자동 동기화 + ZIP 생성 |
| `blog-content-maker` | `blog-content-maker/extension` | 사이트 포함형(빌드 스크립트) | `https://blog-content-maker.buylife.xyz/downloads/blog-content-maker-extension-latest.zip` | `scripts/build-extension.mjs`가 코드·manifest version_name 일치 확인 후 ZIP 생성. 초기 v1.01, 읽기 전용 연결·네이버 입력만 수행하며 최종 발행 없음. |
| `ai-auto-blog` | `ai-auto-blog/extension` | 사이트 포함형(빌드 스크립트) | `https://ai-auto-blog-one.vercel.app/downloads/ai-auto-blog-extension-latest.zip` (고정 주소 `-latest.zip`, 2026-10-09 통일. 빌드가 버전별 ZIP과 함께 사본을 만든다) | `scripts/build-extension-archive.mjs` |
| `naver-blog-seo-studio` | `naver-blog-seo-studio/extension` | 사이트 포함형(빌드 스크립트) | `https://naver-blog-seo-studio.vercel.app/downloads/naver-blog-seo-studio-extension-latest.zip` (**메인 도메인 buylife.xyz 아래가 아니라 자체 Vercel 주소**. 고정 주소 `-latest.zip`) | `scripts/build-extension-archive.mjs` |
| `tistory-auto-blog` | `tistory-auto-blog/extension` | 사이트 포함형(빌드 스크립트) | `https://tistory-auto-blog-pearl.vercel.app/downloads/tistory-auto-blog-extension-latest.zip` (고정 주소 `-latest.zip`) | `scripts/build-extension-archive.mjs` |
| `naver-blog-auto-poster-web` | `naver-blog-auto-poster_web/extension` | 사이트 포함형(루트 `public/downloads`) | `https://www.buylife.xyz/downloads/naver-blog-auto-poster-web-extension-latest.zip` | `node naver-blog-auto-poster_web/scripts/build-extension-archive.mjs`(저장소 루트에서, manifest `version_name`과 `lib/naverBlogAutoPosterWebExtension.ts` 버전이 같아야 함) → 루트 앱 배포(`vercel deploy --prod --yes`). 2026-10-09 v1.03에서 GitHub 릴리스를 대체(저장소 비공개 전환 대비). 절차: 그 폴더 `AGENTS.md` §9-2 |
| `realty-listing-alert` | `realty-listing-alert/extension` | 사이트 포함형(빌드 스크립트 `prebuild`, 2026-10-24 v1.01) | `https://realty-listing-alert.buylife.xyz/downloads/realty-listing-alert-extension-latest.zip` (고정 주소) | `scripts/build-extension-archive.mjs`가 `lib/version.ts` → manifest 동기화 |

### 알려진 예외·미해결 (다음 CLI가 이어받을 것)

- `naver-blog-auto-poster-web`: 2026-10-09 v1.02에서 manifest에 `version_name`을 넣어 `vX.YY` 체계로 정렬했다(예외 없음). 단 **ZIP 파일명은 (v1.03부터는 사이트 주소 `naver-blog-auto-poster-web-extension-latest.zip`으로 옮겨 옛 이름 문제가 없다)**이므로 파일명 숫자로 버전을 판단하지 않는다.
- 메인 사이트(buylife.xyz) 프로그램 상세 화면(`app/(main)/programs/[slug]/page.tsx`)에 **확장 다운로드 버튼이 있다(2026-10-09)**. DB `programs.extension_download_url`/`extension_version`을 읽어 **이용 권한이 있는 회원에게만, https 주소일 때만** 보여준다. 그래서 확장이 있는 프로그램은 배포 때 이 DB 칸을 갱신하는 것이 곧 이 버튼의 주소·버전 갱신이다.
- **확장 안 "새 버전이 있습니다" 알림 현황 (2026-10-09 코드로 확인)**:

  | 프로그램 | 알림 | 방식 |
  |---|---|---|
  | `naver-blog-agent` (v1.50) | 있음 | 연결 없이도 동작: 공개 `GET /api/extension/version` + 확장이 6시간마다·시작 시 확인 → 아이콘 `NEW` 배지 + 팝업 배너 |
  | `naver-blog-seo-studio` (v1.60) | 있음 | 토큰 연결 후: `GET /api/extension/whoami`의 `latestVersion`/`downloadUrl` → 사이드패널 배너(더 높을 때만) |
  | `ai-auto-blog` | 있음 | 토큰 연결 후: `whoami`의 `latestVersion`/`downloadUrl` → 사이드패널 배너(버전이 다르면) |
  | `tistory-auto-blog` (v1.54) | 있음 | 토큰 연결 후: `whoami`의 `latestVersion`/`downloadUrl` → 사이드패널 배너(더 높을 때만). DB 갱신은 `npm run sync:program-version`이 `version`·`extension_version`·`extension_download_url`을 함께 처리 |
  | `naver-blog-auto-poster-web` (v1.03) | 있음 | 토큰 연동 후: 루트 `whoami`의 `latestVersion`/`downloadUrl`(출처 `lib/naverBlogAutoPosterWebExtension.ts`) → 사이드패널 배너. 링크는 `https://www.buylife.xyz/downloads/` 아래 주소만 허용 |

  새 확장 프로그램과 크게 고치는 확장에는 `naver-blog-agent` 방식(연결 없이도 동작)을 권장한다. 알림 코드가 들어간 확장을 회원이 한 번은 직접 다시 설치해야 이후부터 알림이 뜬다.
- 버전 파일명(`-vX.YY.zip`)을 쓰는 프로그램은 배포 때마다 다운로드 주소가 바뀌므로 **DB 주소를 빠뜨리면 DB가 옛 파일을 가리킨다.** 가능하면 `naver-blog-agent`처럼 고정 `-latest.zip` 주소를 함께 두는 방식으로 옮긴다.

## 4. 새 확장 프로그램을 만들 때

> **2026-10-24 주인님 지시 — 항상 두 가지를 동시에:** 「모든 자동화 프로그램은 각각 프로그램 이름에 맞는 프로그램 폴더를 생성해서 작업한다」 「확장프로그램이 있는 프로그램은 extension 폴더를 만들고 거기에 확장프로그램을 항상 만들어 올리며 해당 프로그램에서 다운로드 받을 수 있도록 한다」 「항상 이 두 가지는 동시에 진행된다」.
> ① 확장은 `<프로그램 slug>/extension/`에만 만든다(저장소 밖·루트·임시 폴더에 따로 만들지 않는다, 사전 검증용 확장도 이 폴더에서 시작). ② 같은 작업에서 그 프로그램 사이트의 `public/downloads/<slug>-extension-latest.zip`으로 내려받게 하고(빌드 스크립트 `prebuild`), 대시보드 다운로드 센터·좌측 메뉴에 받기 버튼을 둔다. 둘 중 하나만 하면 끝난 것이 아니다. (첫 적용: `realty-listing-alert`)

1. 확장 소스를 `<프로그램>/extension/`에 둔다. 루트 폴더나 다른 위치에 복제본을 만들지 않는다.
2. `naver-blog-agent/scripts/build-extension-archive.mjs`를 복사해 `prebuild`로 연결한다(버전 동기화 + ZIP 생성 + 이전 버전 ZIP 정리). 고정 `-latest.zip`도 함께 만든다.
3. `programs` 등록 때 `version = 'v1.01'`, `extension_version`, `extension_download_url`을 함께 채운다.
4. `scripts/check-extension-release.mjs`의 `EXTENSION_PROGRAMS` 목록에 slug를 추가하고, 이 문서 3번 표에 한 줄을 추가한다.
5. 확장 ↔ 서버 API는 하위 호환을 유지하거나, 확장이 최소 지원 버전을 알 수 있게 한다(설치된 옛 확장이 깨지지 않게).

## 5. 검증 스크립트

```bash
node scripts/check-extension-release.mjs                 # 확장이 있는 5개 프로그램 전체
node scripts/check-extension-release.mjs naver-blog-agent  # 하나만
```

- 읽기 전용이다. DB 값(`version`, `extension_version`, `extension_download_url`)과 **라이브 ZIP을 실제로 내려받아 열어 본 `manifest.json`**이 모두 같은지 비교한다.
- `FAIL`(종료 코드 1): 주소 오류(HTTP 200 아님), DB 칸 비어 있음, ZIP 버전 ≠ DB `extension_version`, 프로그램 버전 ≠ `extension_version`.
- `WARN`: 알려진 예외(위 `naver-blog-auto-poster-web`)만.
- `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`과 키로 조회한다. 비공개 프로그램 행은 `SUPABASE_SERVICE_ROLE_KEY`가 있어야 읽히며, 키는 출력하지 않는다.
- **배포 → DB 갱신 → 이 스크립트 `OK`** 순서로 끝낸다. 배포 직후 CDN 반영에 잠시 걸릴 수 있으니 `FAIL`이면 1~2분 뒤 한 번 더 실행해 본다.

## 6. 자주 틀리는 점

- 코드만 배포하고 DB `extension_*`를 안 올려서 DB가 옛 ZIP을 가리킨다 → 같은 SQL에서 함께 갱신.
- ZIP을 만들 때 폴더 자체를 묶어 `manifest.json`이 한 단계 깊어진다 → 폴더 **내용물**을 묶는다.
- SEO 스튜디오 ZIP 주소를 `buylife.xyz` 아래로 착각해 404가 난다 → 위 3번 표의 자체 Vercel 주소를 쓴다.
- `manifest.json`의 `version`에 `1.49` 같은 두 자리 규격이나 앞자리 0(`1.01.0`)을 넣는다 → Chrome 규격은 `메이저.마이너.0`(`1.1.0`, `1.49.0`), 회원에게 보이는 `vX.YY`는 `version_name`에 둔다.
- 확장 이식 시 서버 API 응답·원고 형식·테이블 존재를 대조하지 않는다 → `docs/ERROR_LESSONS.md`의 naver-blog-agent v1.43·v1.49 항목 참고(확장은 연결됐지만 DB 테이블이 없어 동작 불가였던 사례).

### 데스크톱 앱 설치 파일(naver-blog-auto-poster, 2026-10-09)
- 설치 파일(`AIMaster-Naver-Blog-Auto-Poster-0.1.0.exe`, 약 69MB)도 GitHub 릴리스 대신 루트 사이트 `public/downloads/`에서 내려받는다(`/downloads/…exe`). 용량 때문에 **git에는 넣지 않고(`.gitignore`) 로컬 파일을 그대로 배포에 포함**한다 — 루트 앱을 배포하는 PC에 이 파일이 `public/downloads/`에 있어야 하며, 없으면 링크가 404가 된다. 새 설치 파일을 만들면 같은 파일명으로 이 폴더에 덮어쓰고 루트를 배포한 뒤 `curl -I https://www.buylife.xyz/downloads/AIMaster-Naver-Blog-Auto-Poster-0.1.0.exe`로 200을 확인한다.
