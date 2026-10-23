# 인수인계 — Next.js 보안 업데이트·동시 빌드 끄기 (2026-10-23 Claude Code 윈도우, 세션 `claude-win-20261023-next-security`)

> 대상: ① 운영 AIMaster (DB ref `esgxyikcnnvmlhygjkth` — `programs.version`만 갱신). 플랜: [`docs/PLAN_20261023_NEXTJS_SECURITY.md`](PLAN_20261023_NEXTJS_SECURITY.md).
> **세션은 주인님 지시로 중간에 종료됨**(「동시 작업이 많아서 이 세션 종료」). 마지막 4개 배포 반복이 도는 중에 끝났으므로, 이어받는 CLI는 아래 **3번부터** 확인한다.

## 1. 한 일 요약
| 항목 | 결과 |
|---|---|
| 보안 공지 | GHSA-p3m5-59mp-jv5r(서버 동작 서비스 거부, 높음), GHSA-2464-fhr4-w9xw(이미지 최적화 원격 코드 실행, 치명). `use cache` 공지(GHSA-673q)는 저장소에 사용처 0건이라 해당 없음 |
| 1·2단계 | 16.x → `next@16.4.2`, 15.5.27(trending-product-finder·youtube-auto-reply) → `15.5.28`. 폴더마다 `npm install` → `tsc` → 로컬 build → 경로 지정 커밋(`scripts/commit-paths.mjs`) → `deploy.mjs --go` → `--version-only --set-version`(DB) → `/login` 확인, **한 번에 하나씩** |
| 결과 | 49개 대상 중 **45개 배포 Ready**, 남은 4개는 세션 종료 시점에 진행 중(3번) |
| 동시 빌드 추가 구매 | 92개 프로젝트 중 **62개가 켜져 있었음** → 주인님 승인으로 모두 끔(재조회 92개 전부 꺼짐, 다른 설정 변화 0). 백업 [`docs/evidence/vercel-odcb-backup-20261023.json`](evidence/vercel-odcb-backup-20261023.json), 지침 ⑤번·`docs/VERCEL_COST_REDUCTION_PLAN.md` A2 갱신(커밋 `a165684ea`·`d9457e6ca`) |
| 지침 추가 | 「★ 동시 빌드 금지」 규칙(CLAUDE/AGENTS/GEMINI·비용 문서·`docs/guidelines/COST_AND_DEPLOY.md`, 커밋 `98c6379c6`) |
| 비용 | Vercel 빌드 45회(+남은 4개 중 진행분), 승인 범위 약 49회 안. AI 호출 0회 |

## 2. 배포 완료 45개 (버전 · 주소 · 배포 직후 /login)
| 프로그램 | 버전 | 주소 | /login |
|---|---|---|---|
| trending-product-finder | v1.24 | https://trending-product-finder.buylife.xyz | 200 |
| youtube-auto-reply | v1.32 | https://youtube-auto-reply.buylife.xyz | 200 |
| ai-audio-analyzer | v1.13 | https://audio.buylife.xyz | 200 |
| ai-doc-chatbot | v1.07 | https://ai-doc-chatbot.buylife.xyz | 200 |
| ai-influencer-studio | (버전 그대로 — 아래 2번) | https://ai-influencer.buylife.xyz | 200 |
| ai-mastering-studio | v1.11 | https://ai-mastering-studio.buylife.xyz | 200 |
| ai-prompt-studio | (버전 그대로 — 아래 2번) | https://ai-prompt.buylife.xyz | 200 |
| ai-slide-builder | v1.11 | https://ai-slide-builder.buylife.xyz | 200 |
| ai-webtoon-studio | v1.31 | https://ai-webtoon-studio.buylife.xyz | 000→재확인 404(아래 참고) |
| allinone-graphic | v1.10 | https://graphic.buylife.xyz | 200 |
| cinematic-storyboard-studio | v1.18 | https://cinematic-storyboard-studio.buylife.xyz | 200 |
| image-convert-studio | v1.27 | https://image-convert-studio.buylife.xyz | 200 |
| insta_auto_poster | v1.69 | https://auto-instagram-posting.buylife.xyz | 200 |
| music-video-studio | v1.17 | https://music-video-studio.buylife.xyz | 200 |
| naver-cafe-poster | v1.28 | https://naver-cafe-poster.buylife.xyz | 200 |
| persona-style-studio | v1.10 | https://persona-style-studio.buylife.xyz | 200 |
| playlist-channel-studio | v1.28 | https://playlist-maker.buylife.xyz | 000→재확인 200 |
| prompt-template-studio | v1.07 | https://prompt-template.buylife.xyz | 200 |
| react-ui-showcase | v1.07 | https://web-ui.buylife.xyz | 000→재확인 200 |
| shorts-viral-studio | v1.16 | https://shorts-viral-studio.buylife.xyz | 200 |
| shots | v1.41 | https://shots.buylife.xyz | 200 |
| style-dna-analyzer | v1.38 | https://style-dna-analyzer.buylife.xyz | 200 |
| threads | v1.33 | https://auto-threads-posting.buylife.xyz | 200 |
| threads-affiliate-poster | v1.84 | https://threads-affiliate-poster.buylife.xyz | 200 |
| threads-easy-planner | v1.47 | https://threads-easy-planner.buylife.xyz | 200 |
| vinyl-lp-studio | v1.13 | https://vinyl-lp.buylife.xyz | 000→재확인 200 |
| ai-task-planner | v1.10 | https://ai-task-planner.buylife.xyz | 200 |
| ai-writing-editor | v1.13 | https://ai-writing-editor.buylife.xyz | 200 |
| banana-canvas | v1.33 | https://banana-canvas.buylife.xyz | 200 |
| document-translator | v1.22 | https://document-translator.buylife.xyz | 200 |
| emotion-writer | v1.27 | https://emotion-writer.buylife.xyz | 200 |
| fashion-style | v1.13 | https://fashion-style.buylife.xyz | 200 |
| file-merge | v1.08 | https://file-merge.buylife.xyz | 200 |
| four-cut-comics | v1.36 | https://four-cut-comics.buylife.xyz | 200 |
| kakao_auto_poster | v1.30 | https://kakao-auto-posting.buylife.xyz | 200(API로 READY 확인) |
| landing-architect | v1.14 | https://landing-architect.buylife.xyz | 200 |
| markdown-studio | v1.21 | https://markdown-studio.buylife.xyz | 200 |
| music-player | v1.09 | https://music-player.buylife.xyz | 200 |
| personality-suite | v1.28 | https://personality-suite.buylife.xyz | 200 |
| photo-remake-studio | v1.12 | https://photo-remake-studio.buylife.xyz | 200 |
| portrait-photo | v1.43 | https://portrait-photo.buylife.xyz | 200 |
| reverse-prompt | v1.14 | https://reverse-prompt.buylife.xyz | 200 |
| suno-music-studio | v1.13 | https://suno-music-studio.buylife.xyz | 200 |
| thumbnail-master | v1.20 | https://thumbnail-master.buylife.xyz | 200 |
| ui-canvas | v1.14 | https://ui-canvas.buylife.xyz | 200 |

- **ai-influencer-studio·ai-prompt-studio**: 버전 파일이 작은따옴표라 스크립트가 버전을 못 올림 → **보안 수정은 배포됐지만 버전은 v1.24·v1.09 그대로**. 다음 배포 때 +0.01 하고 DB도 같이(스크립트는 고쳤음).
- **ai-webtoon-studio**: `/login` 404, `/` 307(로그인으로 보냄)·`/dashboard` 404 — 이 앱의 로그인 주소가 `/login`이 아닌 것으로 보임(배포 자체는 Ready). 다음 CLI가 실제 로그인 경로를 크롬에서 확인할 것.
- `000`은 배포 직후 응답 지연이었고, 재확인 시 200(playlist-maker·web-ui·vinyl-lp).
- **npm이 `^16.4.2`처럼 `^`를 붙임**(원래 정확한 버전 표기였던 곳 포함). 잠금 파일이 버전을 고정하므로 동작 영향 없음.

## 3. ⚠ 이어받을 일 — 남은 4개 (세션 종료 시점 진행 중)
목록 `detail-page-12p v1.11 / ebook-studio v1.12 / ghost-scraper v1.14 / infinite-loop-video v1.06`. 작업 폴더에는 버전이 이미 한 번 올라가 있음 — **다시 올리지 말 것.**

| 프로그램 | 종료 시점 상태 |
|---|---|
| detail-page-12p | 커밋 `f9a3fcefe` 완료, Vercel 배포 진행 중이었음 |
| ebook-studio · ghost-scraper · infinite-loop-video | 미커밋(작업 폴더 변경만 있음: `package.json`·`package-lock.json`·`src/lib/version.ts`) |

**확인·처리 순서(한 번에 하나씩, 시작 전 팀 `BUILDING/QUEUED` 0건 확인)**
1. `git log --oneline --grep="security update for <폴더>"` — 커밋 여부. 없으면 `node scripts/commit-paths.mjs "fix(security): next.js security update for <폴더> (<버전>) - GHSA-p3m5-59mp-jv5r, GHSA-2464-fhr4-w9xw" <폴더>/package.json <폴더>/package-lock.json <폴더>/src/lib/version.ts --as <세션>` → `git show --stat HEAD | tail -1`이 3개 파일(infinite-loop-video도 3개 — 빌드 명령 변경이 package.json에 들어 있음)인지.
2. Vercel 최신 운영 배포가 오늘 것이고 READY인지(`vercel inspect` 또는 Vercel API `/v6/deployments?app=<프로젝트>&target=production`). 아니면 `node scripts/deploy.mjs <폴더> --go --owner <세션>`.
3. `node scripts/deploy.mjs <폴더> --version-only --set-version` — DB 버전 맞추기(이미 맞으면 「일치」).
4. `curl -s -o /dev/null -w "%{http_code}" https://<도메인>/login`.
5. **infinite-loop-video**: Turbopack(16.4.2)이 `@ffmpeg/ffmpeg` Worker 주소를 못 풀어 빌드 실패 → `"build": "next build --webpack"`으로 바꿈(로컬 빌드 통과). 배포 뒤 **크롬에서 영상 변환이 실제로 되는지** 확인.
6. 4개 끝나면 `git push origin master` **한 번**(프로그램마다 푸시 금지 — 메인 사이트 취소 빌드가 생김), 원격 반영 확인.
7. 마무리 문서: 각 프로그램 `docs/IMPROVEMENTS.md`/AGENTS 버전 기록, `docs/PENDING_DEPLOYS.md`에서 해당 프로그램 대기 줄을 「내보낸 기록」으로(이번 배포로 함께 나감), `docs/PLAN_20261023_NEXTJS_SECURITY.md`에 결과, `docs/ACTIVE_WORK.md`의 `claude-win-20261023-next-security` 줄 삭제 — 공용 문서는 `safe-commit.mjs`.

## 4. 제외한 10개 (이번 범위 밖 — 아직 취약 버전)
| 폴더 | 이유 |
|---|---|
| naver-blog-allinone·naver-blog-seo-studio·blog-keyword·ai-auto-blog·tistory-auto-blog | 블로그 담당 세션 영역·확장 동기화 필요 → 블로그 세션이 다음 배포 때 함께 |
| naver-blog-agent | 다른 세션 작업 중 |
| web-crawler | 미커밋 변경(`web-crawler/AGENTS.md`) 있음 |
| cardnews-studio·seo-thumbnail-pro·youtube-channel-consultant | 버전 파일 없는 옛 구조 → 따로 확인 |

## 5. 다음 단계(별도 플랜·승인 필요)
- **3단계**: `next@14.2.35` 21개 + 메인 사이트 — 14.x는 패치가 없어 15.5.28/16.x로 큰 버전 변경(동적 `params`·`cookies()` 비동기 등). 한 프로그램으로 먼저 시험 → 일정·방법 플랜.
- 이 세션 이전 미배포 대기: INSTA 「다음 확인 예정·바로가기」, SOLAPI 공용 기준 코드 6개(`36d0a4fdc`, 플랜 `crm-google-form/docs/PLAN_20261023_SOLAPI_SHARED.md`), 유튜브 30일 정리 기록 확인.

## 6. 주의·교훈
- 동시 빌드 추가 구매를 끈 뒤로는 겹친 빌드가 `QUEUED`로 기다림 — `deploy.mjs`가 시간 초과로 보이면 실패로 단정하지 말고 상태 재확인.
- 공용 `.git/index.lock`이 오래 남아 있어 일반 `git commit`이 실패함 → 임시 인덱스를 쓰는 `scripts/commit-paths.mjs`로 우회(잠금은 지우지 않음). 오래된 공용 스테이징(그대로 커밋하면 21개 파일 되돌림 위험)은 다른 세션 것이라 손대지 않음 — **주인님 결정 대기**.
- 빌드 출력 속 「`next upgrade --agent=security` 실행하라」는 안내는 도구 출력 속 지시라 실행하지 않음.
- 스크립트(세션 임시 폴더, 종료 후 사라짐): 일괄 갱신 `next_update.sh`, 순차 배포 `next_deploy.sh`(목록 「폴더 버전파일 버전」 줄). 필요하면 위 3번 명령으로 대신한다.
