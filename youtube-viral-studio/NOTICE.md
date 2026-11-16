# 제3자 소스 고지 (Third-party notices)

이 프로그램(youtube-viral-studio, AI 유튜브 떡상 분석 자동화)은 BUYLIFE 저작물이며 저작권 고지는 같은 폴더의 `NOTICE` 파일에 있습니다.
아래는 이 프로그램에 옮겨 쓴 외부 오픈소스와 그 라이선스입니다.

## boks-youtube-finder

- 저장소: https://github.com/boksajang/boks-youtube-finder
- 옮긴 시점의 커밋: `3aacecf` (2026-11-14, v1.0.0)
- 라이선스: MIT — 원본 README 「MIT License © 2026 복사장 (Boksajang)」, package.json `"license": "MIT"`. 원본 저장소에 별도 LICENSE 파일이 없어 표준 MIT 문구를 아래에 적습니다.
- 옮긴 곳(2026-11-16, v1.30 「떡상 시장 탐색」):
  - `src/lib/youtube/boks/core.ts` ← `services/youtube.js` 판정·거르기·시장 분석·서식 함수
  - `src/lib/youtube/boks/search.ts` ← `services/youtube.js` 검색·인기 차트·채널 평소 조회수 수집(HTTP는 AIMaster 공용 `youtubeData.ts`로 바꿈)
  - `src/lib/youtube/boks/trends.ts` ← `services/trends.js`
  - `src/lib/youtube/boks/quota.ts` ← `services/usage.js`의 날짜 계산
  - `src/lib/youtube/boks/plan.ts` ← `services/ai-cli.js`의 프롬프트·스키마·검증
  - `src/components/finder/ScatterPlot.tsx` ← `renderer.js` drawScatter 로직 참고(SVG로 다시 그림)

```
MIT License

Copyright (c) 2026 복사장 (Boksajang)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
