# 인수인계 — API 키 저장 정리: 브라우저 → 회원 본인 계정 (2026-11-01)

> [역할: mac-mini] Claude Code(맥미니) `claude-mac-20261101-blog` · 주인님 승인(블로그 병합 결정 4번 「추천대로 진행해」 → 「4번 진행해」). 상태: **코드·로컬 시험 완료, ⏸ 미배포 대기**(다음 올인원 배포 때 v1.56으로).

## 왜
올인원은 Gemini·OpenAI·Claude·Replicate 키를 이 브라우저(`localStorage`)에만 저장했다 → 다른 PC·브라우저에서 다시 입력, 「키는 공용 저장(`user_api_keys`)에 한 번 등록하고 모든 프로그램이 재사용」 규칙과 어긋남. 「내 계정 키 불러오기」로 가져와도 결국 브라우저에 복사됐다.

## 범위
키를 **어디에 저장하는지만** 바꿨다. AI를 회원 브라우저에서 직접 부르는 구조(키가 메모리로 브라우저에 오는 것)는 그대로 — 서버 호출로 바꾸는 것은 큰 작업이고 올인원은 신규 개발 중단(블로그 병합 결정)이라 하지 않음. 모델 선택 등 일반 설정은 계속 브라우저에 저장.

## 한 일
| 단계 | 내용 | 파일 |
|---|---|---|
| 1 | 저장할 때 키 칸을 항상 비움(`withoutKeys`), 읽을 때 키는 항상 빈 값. 예전 키는 한 번 「옮기기 대기」 칸(`naver_blog_allinone_legacy_keys`)으로 옮기고 설정에서 지움 | `src/lib/storage.ts` |
| 2 | 첫 화면이 `/api/my-keys`로 본인 계정 키를 불러와 메모리 설정에 채움(`withAccountKeys`). 예전 키가 있고 계정에는 없으면 설정 창을 자동으로 엶 | `src/app/page.tsx` |
| 3 | `/api/my-keys` `POST` — 회원 본인 행에만 `upsert`(`user_id,provider`), 4개 공급사만, 빈 값·공백 포함·500자 초과는 무시. **계정 키 삭제는 하지 않음**(다른 프로그램도 씀 → 메인 사이트 API 설정) | `src/app/api/my-keys/route.ts` |
| 4 | 설정 창: 열 때 계정 키 자동 채움 + 예전 키 「옮기기」 안내 상자(「옮기지 않고 브라우저 사본만 지우기」), [내 계정에 저장]은 계정 값과 달라진 키만 저장 후 예전 사본 삭제, 「키 삭제」 → 「입력 지우기」(계정 키는 지우지 않음), 문구 6곳 정리 | `src/components/SettingsModal.tsx` |
| 5 | 시험 `tests/key-storage.test.mjs` 4개, `npm test`에 추가 | `tests/`, `package.json` |

## 검수(맥미니)
- `tsc --noEmit` 통과.
- `node --test tests/key-storage.test.mjs` **4/4 통과**(저장 때 키 제외, 예전 키 옮기기 대기·두 번 읽어도 같음·지우기, 옮기기 대상 판정, 계정 키 메모리 채움).
- **맥에서 `npm test`(`node --import tsx`)는 안 됨** — `node_modules/@esbuild`가 윈도우용(`win32-x64`)만 설치됨. 기존 `blog.test.mjs`도 같은 이유로 맥에서 실패(코드 문제 아님). 윈도우에서 `npm test`로 전체 확인 필요.

## 다음에 올인원을 배포하는 세션의 순서
0. `src/lib/version.ts` `APP_VERSION` v1.56, 확장 `extension/manifest.json` 버전 맞추기(확장 코드 변경 없음)
1. `npm test`(윈도우, 새 시험 포함) → `npm run build` → 확장 ZIP 재생성(기존 방식)
2. `vercel deploy --prod --yes`(동시 빌드 없을 때)
3. DB `programs` `version`·`extension_version` v1.56 → `node scripts/check-extension-release.mjs naver-blog-allinone`
4. 맥미니에 화면 검수 요청(시험 계정): 설정 창 계정 키 표시·저장, 예전 키 옮기기(브라우저에 키를 넣어 둔 상태 재현), 글 1편 생성(본인 키 약 0.01달러, 승인됨)

## 회원 영향
- 계정에 키가 있는 회원: 바뀌는 것 없음(오히려 다른 기기에서도 바로 사용).
- 이 브라우저에만 키를 넣어 둔 회원: 첫 접속 때 설정 창이 열리고 [내 계정에 저장] 한 번으로 옮김.
