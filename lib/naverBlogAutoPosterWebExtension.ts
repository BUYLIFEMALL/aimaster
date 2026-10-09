// 네이버 블로그 자동화(Web) 크롬 확장의 최신 버전과 다운로드 주소 — 한 곳에서 관리한다.
// 확장을 새로 배포할 때(docs/EXTENSION_RELEASE_RULES.md): extension/manifest.json의 version_name, programs.version/extension_version과
// 이 값을 같은 버전으로 함께 올린다. 다운로드 주소는 이 사이트 public/downloads의 고정 파일명이다(2026-10-09 v1.03부터. GitHub 릴리스는 저장소를 비공개로 바꿔도 받을 수 있게 사이트로 옮김).
// ZIP은 `node naver-blog-auto-poster_web/scripts/build-extension-archive.mjs`가 extension/ 폴더에서 만든다.
export const POSTER_WEB_EXTENSION_VERSION = "v1.03";
export const POSTER_WEB_EXTENSION_DOWNLOAD_URL =
  "https://www.buylife.xyz/downloads/naver-blog-auto-poster-web-extension-latest.zip";
