# 블로그 8개 배포 요청 — 이미지·모델 종료 대응 + 30일 열외 (2026-11-03, 맥미니 → 윈도우)

작성: Claude Code(맥미니) `claude-mac-20261101-blog` [역할: mac-mini]
배경: 오전 MAC 7개 배포(08:32~08:45) 뒤에 커밋된 블로그 수정이 실리지 않았다(`docs/DEPLOY_REQUEST_20261103_MAC.md` 정정). 주인님 지시 「블로그는 모았다가」에 따라 한 묶음으로 낸다.
**빌드 8회 — 주인님 승인 뒤에만 시작**(요청함 「🙋 해 줄 일」 비용 승인). 한 번에 하나씩, 앞 배포 Ready 확인 뒤 다음.

## 왜 지금인가 (급한 순)
1. **`gpt-image-1`은 2026-10-23에 이미 종료** — `naver-blog-allinone`·`naver-blog-agent`는 교체 커밋 `87b12267e`(11-03 08:56)가 오전 배포보다 늦어 **아직 옛 모델로 호출한다.** 그 모델을 저장해 둔 회원은 지금 OpenAI 이미지 생성이 실패한다(회원 피해 → 즉시 배포 대상).
2. `gpt-5`는 2026-12-11 호출 실패 — `ai-auto-blog`·`tistory-auto-blog`·`naver-blog-seo-studio`.
3. 나머지(Gemini 2.5 12-01 자동 연결, 30일 열외)는 급하지 않지만 같은 묶음으로.

## 순서·버전·들어가는 커밋
| 순서 | 프로그램 | 현재 → 새 버전 | 들어가는 커밋 | 시험(로컬, 무료) | 확장 |
|---|---|---|---|---|---|
| 1 | `naver-blog-allinone` | v1.59 → v1.60 | 이미지 종료 모델 교체 `87b12267e` · 30일 열외 `0e46894fb` | `npm test` | 있음 |
| 2 | `naver-blog-agent` | v2.26 → v2.27 | 이미지 종료 모델 교체 `87b12267e` · 30일 열외(글감) `27795e295` · 30일 열외(비공개 사진, 화면 「무기한 보관」) `01d973bf6` | `node --test scripts/test-private-photos.cjs scripts/test-private-photo-input.cjs scripts/test-photo-review-save.cjs scripts/test-extension-bridge.cjs`(맥에서 46 통과) — `test-editor-mode.cjs` 실패 3건은 고치기 전에도 같음 | 있음 |
| 3 | `ai-auto-blog` | v1.86 → v1.87 | gpt-5·2.5 교체 `142cb45ec` | `npm run test:extension-api`·`test:generation` | 있음 |
| 4 | `tistory-auto-blog` | v1.95 → v1.96 | gpt-5·2.5 교체 `7eb961fbd` · 30일 열외 `00481371a` · 시험 `8ce1156a9` | `node --test tests/extension-api.test.cjs tests/retention-exempt.test.cjs`(맥에서 46 통과) | 있음 |
| 5 | `naver-blog-seo-studio` | v2.25 → v2.26 | gpt-5·2.5-pro 교체 `6103af9a8` · 30일 열외 `4e1eab489` | `node --test tests/*.test.mjs`(맥에서 158 통과) | 있음 — **manifest를 손으로** `2.26.0`/`v2.26`(빌드 스크립트가 안 맞춤) |
| 6 | `blog-keyword` | v1.11 → v1.12 | 2.5 교체 `fb1d16075` · 30일 열외(기록 숨김) `6c9f6d8a1` | `npm test` | 없음 |
| 7 | `blog-content-maker` | v1.14 → v1.15 | Gemini 선택 칸 교체 `bacde857b` · 30일 열외 `9198c0da8` | `npm test` | 있음 |
| 8 | `blog-workroom` | v1.16 → v1.17 | Gemini 선택 칸 교체 `bf5587fbb` · 30일 열외 `f1d9e7dcc` | `npm test`(윈도우 11-03 통과 기록) | 없음 |

함께 실리는 다른 대기분: `blog-workroom`은 API 키 문구 `b16550ad4`(`docs/PENDING_DEPLOYS.md` 35줄) — 지울 때 그 줄에서 이 프로그램만 뺀다.

## 프로그램마다 (기존 절차)
1. `git pull`, 팀 `buylife`에 빌드 중·대기 중 없음 확인, `docs/ACTIVE_WORK.md`에 「연속 배포 중(8개)」.
2. `lib/version.ts`(또는 `src/lib/version.ts`·`utils/version.ts`) 버전 +0.01.
3. 확장이 있으면 manifest `version`/`version_name` 새 버전 확인 → ZIP 재생성(`extension:archive`·`prebuild`).
4. 시험 → `npx tsc --noEmit` → `npm run build` → `vercel deploy --prod --yes` → Ready(시간 초과면 `vercel inspect`).
5. DB(ref `esgxyikcnnvmlhygjkth`): `update programs set version='<새>'[, extension_version='<새>'], updated_at=now() where slug='<slug>';`
6. 확장 있으면 `node scripts/check-extension-release.mjs <slug>` → OK.
7. `docs/PENDING_DEPLOYS.md`: 「12월 모델 교체」 A·B·C 줄과 「30일 보관 열외 블로그 7개」 줄에서 해당 프로그램 지우고 배포 기록 줄 추가. 이미지 `87b12267e`는 대기 표에 없던 것이라 배포 기록에만 적는다.

## 배포 뒤 확인 (맥미니)
- 시험 계정 본인 키로 대표 1회씩(비용 1달러 미만, 실행 전 다시 여쭘): 올인원 OpenAI 이미지 1장(`gpt-image-2.5-flare`), `ai-auto-blog` 글 1편(`gpt-5.6-sol`).
- 회원 안내: 확장이 바뀐 6개는 ZIP 다시 받기 → 덮어쓰기 → 확장 관리에서 새로고침.

## 남는 것
- `blog-neighbor-care`: 모델 교체·30일 열외 모두 미적용(윈도우 blog 세션이 미커밋 작업 중).
- `threads-affiliate-poster` o3 교체 `0caadc5ee` — 블로그 아님, 12-05 점검.
