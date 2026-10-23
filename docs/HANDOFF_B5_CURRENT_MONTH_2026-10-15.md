# B5 인수인계 — 나머지 프로그램 현재 월 반영 (2026-10-15)

## 완료 상태

Claude Code 작업 대기 목록 B5를 처리했습니다. AI 프롬프트에 한국 시간(Asia/Seoul) 기준의 현재 연·월을 동적으로 넣어, 계절·시기 표현이 현재 월에 맞도록 했습니다. 필요하지 않은 연도·계절을 답변에 덧붙이지 않도록 지침을 함께 넣었습니다. 고정 날짜는 사용하지 않습니다.

변경 커밋은 `fc507531` (`feat: B5 현재 월 지침 19개 프로그램 반영`)이며, `origin/master`에 푸시했습니다. 19개 프로젝트의 `npm run build`가 모두 통과했습니다. AI 생성/유료 API 호출은 검수에 사용하지 않았습니다.

## 반영 프로그램과 버전

| 프로그램 | DB slug | 이전 → 현재 | 운영 주소 |
|---|---|---:|---|
| ai-audio-analyzer | ai-audio-analyzer | v1.02 → v1.03 | https://audio.buylife.xyz |
| ai-mastering-studio | ai-mastering-studio | v1.02 → v1.03 | https://ai-mastering-studio.buylife.xyz |
| ai-prompt-studio | ai-prompt-studio | v1.02 → v1.03 | https://ai-prompt.buylife.xyz |
| ai-slide-builder | ai-slide-builder | v1.05 → v1.06 | https://ai-slide-builder.buylife.xyz |
| allinone-graphic | allinone-graphic | v1.01 → v1.02 | https://graphic.buylife.xyz |
| banana-canvas | banana-canvas | v1.03 → v1.04 | https://banana-canvas.buylife.xyz |
| fashion-style | fashion-style | v1.04 → v1.05 | https://fashion-style.buylife.xyz |
| ghost-scraper | website-scraper | v1.09 → v1.10 | https://ghost-scraper.buylife.xyz |
| music-video-studio | music-video-studio | v1.03 → v1.04 | https://music-video-studio.buylife.xyz |
| persona-style-studio | persona-style-studio | v1.04 → v1.05 | https://persona-style-studio.vercel.app |
| playlist-channel-studio | playlist-channel-studio | v1.05 → v1.06 | https://playlist-channel-studio.vercel.app |
| prompt-template-studio | prompt-template-studio | v1.01 → v1.02 | https://prompt-template.buylife.xyz |
| reverse-prompt | reverse-prompt | v1.02 → v1.03 | https://reverse-prompt.buylife.xyz |
| seo-thumbnail-pro | seo-thumbnail-pro | v1.02 → v1.03 | https://seo-thumbnail-pro.vercel.app |
| style-dna-analyzer | style-dna-analyzer | v1.13 → v1.14 | https://style-dna-analyzer.buylife.xyz |
| thumbnail-master | thumbnail-master | v1.02 → v1.03 | https://thumbnail-master.buylife.xyz |
| ui-canvas | ui-canvas | v1.05 → v1.06 | https://ui-canvas.buylife.xyz |
| tistory-auto-blog (`shortsAnalysis.ts`) | tistory-auto-blog | v1.69 → v1.70 | https://tistory-auto-blog-pearl.vercel.app |
| ai-auto-blog (`shortsAnalysis.ts`) | ai-auto-blog | v1.62 → v1.63 | https://ai-auto-blog-one.vercel.app |

각 앱의 코드 버전, `programs.version`, 서브프로젝트 인수인계 문서, 버전 이력 파일을 함께 갱신했습니다. 두 블로그는 크롬 확장 manifest/version ZIP도 함께 올렸고, DB `extension_version` 및 고정 다운로드 주소를 갱신했습니다. `prompt-template-studio`에서는 재사용 가능한 `src/lib/koreaNowRule.ts`를 추가해 관련 API 프롬프트에 같은 기준을 적용했습니다.

## 검수·배포 증거

- 로컬: 대상 19개 전부 `npm run build` 통과.
- 운영: 대상 19개 주소 모두 HTTP 200 응답.
- Supabase: 대상 19개 행의 버전이 모두 새 코드 버전과 일치함을 조회로 확인. 블로그 2개의 확장 버전과 다운로드 URL도 확인.
- 확장: `node scripts/check-extension-release.mjs ai-auto-blog` 및 `node scripts/check-extension-release.mjs tistory-auto-blog` 모두 실패 0·경고 0. 각각 ZIP의 `version_name`이 v1.63, v1.70과 일치.
- AI 생성, 외부 발행, 결제는 수행하지 않았습니다.

## 범위 및 남은 일

작업 대기 문서에는 `document-translator`도 있었지만, 당시 별도 Codex 작업 중이라고 표시되어 있어 충돌 방지를 위해 수정하지 않았습니다. 문서 번역기 작업 담당자가 마무리한 뒤 월 기준 적용 여부를 별도 확인해야 합니다. B5의 나머지 19개는 완료했습니다.

다음 담당자는 `docs/WORK_QUEUE_2026-10-15.md`의 B5 상태와 각 프로그램 README/AGENTS 로그를 기준으로 이어가면 됩니다.
