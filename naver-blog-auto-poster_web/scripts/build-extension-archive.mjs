// extension/ 폴더를 루트 사이트 public/downloads의 고정 주소 ZIP으로 만든다(2026-10-09 v1.03, GitHub 릴리스 대체).
// 사용: node naver-blog-auto-poster_web/scripts/build-extension-archive.mjs   (저장소 루트에서)
// archiver는 이 폴더에 package.json이 없어 형제 프로젝트(naver-blog-agent)의 node_modules를 빌린다.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const repoRoot = path.resolve(projectRoot, "..");
const extensionRoot = path.join(projectRoot, "extension");
const downloadsRoot = path.join(repoRoot, "public", "downloads");
const require = createRequire(path.join(repoRoot, "naver-blog-agent", "package.json"));
const archiver = require("archiver");

const manifest = JSON.parse(fs.readFileSync(path.join(extensionRoot, "manifest.json"), "utf8"));
const libSource = fs.readFileSync(path.join(repoRoot, "lib", "naverBlogAutoPosterWebExtension.ts"), "utf8");
const libVersion = libSource.match(/POSTER_WEB_EXTENSION_VERSION\s*=\s*"(v\d+\.\d{2})"/)?.[1];
if (!manifest.version_name || manifest.version_name !== libVersion) {
  throw new Error(`manifest version_name(${manifest.version_name})과 lib/naverBlogAutoPosterWebExtension.ts(${libVersion})의 버전이 다릅니다. 같게 맞추세요.`);
}

fs.mkdirSync(downloadsRoot, { recursive: true });
const target = path.join(downloadsRoot, "naver-blog-auto-poster-web-extension-latest.zip");
await new Promise((resolve, reject) => {
  const output = fs.createWriteStream(target);
  const archive = archiver("zip", { zlib: { level: 9 } });
  output.on("close", resolve);
  output.on("error", reject);
  archive.on("error", reject);
  archive.pipe(output);
  archive.directory(extensionRoot, false);
  archive.finalize();
});
console.log(`Created ${path.relative(repoRoot, target)} (${fs.statSync(target).size} bytes, ${manifest.version_name})`);
