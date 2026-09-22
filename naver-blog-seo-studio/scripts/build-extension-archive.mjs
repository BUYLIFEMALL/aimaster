import archiver from "archiver";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionRoot = path.join(projectRoot, "extension");
const manifestPath = path.join(extensionRoot, "manifest.json");
const downloadsRoot = path.join(projectRoot, "public", "downloads");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const version = String(manifest.version);
const archiveName = `naver-blog-seo-studio-extension-v${version}.zip`;
const archivePath = path.join(downloadsRoot, archiveName);

fs.mkdirSync(downloadsRoot, { recursive: true });
for (const fileName of fs.readdirSync(downloadsRoot)) {
  if (/^naver-blog-seo-studio-extension-v\d+\.\d+\.\d+\.zip$/.test(fileName)) {
    fs.rmSync(path.join(downloadsRoot, fileName), { force: true });
  }
}

await new Promise((resolve, reject) => {
  const output = fs.createWriteStream(archivePath);
  const archive = archiver("zip", { zlib: { level: 9 } });
  output.on("close", resolve);
  output.on("error", reject);
  archive.on("error", reject);
  archive.pipe(output);
  archive.directory(extensionRoot, false);
  archive.finalize();
});

console.log(`Created ${path.relative(projectRoot, archivePath)} (${fs.statSync(archivePath).size} bytes)`);
