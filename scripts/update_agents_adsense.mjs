import fs from "fs";

const file = "AGENTS.md";
let content = fs.readFileSync(file, "utf8");

const target = "3. 참고 스크린샷/문서를 파일명만 듣고 찾아야 하면 먼저 **`D:\\PDS`**(및 하위 폴더)를 검색한다 —\n   사용자에게 되묻기 전에.";
const targetCrlf = "3. 참고 스크린샷/문서를 파일명만 듣고 찾아야 하면 먼저 **`D:\\PDS`**(및 하위 폴더)를 검색한다 —\r\n   사용자에게 되묻기 전에.";

const addition = "\n4. **Google 애드센스(AdSense) 승인 및 광고 운영 지침**: [`docs/ADSENSE_APPROVAL_MANUAL.md`](docs/ADSENSE_APPROVAL_MANUAL.md) — 개인정보처리방침 제13조(광고 쿠키) 보존, 공개 가이드 및 프로그램 상세 리치 콘텐츠 유지, `robots.ts`/`sitemap.xml` 크롤러 설정 유지.";

if (content.includes("ADSENSE_APPROVAL_MANUAL.md")) {
  console.log("Already updated!");
} else if (content.includes(targetCrlf)) {
  content = content.replace(targetCrlf, targetCrlf + addition.replace(/\n/g, "\r\n"));
  fs.writeFileSync(file, content, "utf8");
  console.log("Updated AGENTS.md (CRLF)!");
} else if (content.includes(target)) {
  content = content.replace(target, target + addition);
  fs.writeFileSync(file, content, "utf8");
  console.log("Updated AGENTS.md (LF)!");
} else {
  console.log("Target not found!");
}
