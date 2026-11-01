import archiver from "archiver";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionRoot = path.join(projectRoot, "extension");
const manifestPath = path.join(extensionRoot, "manifest.json");
const downloadsRoot = path.join(projectRoot, "public", "downloads");

const versionSource = fs.readFileSync(path.join(projectRoot, "lib", "version.ts"), "utf8");
const appVersion = versionSource.match(/APP_VERSION\s*=\s*["'](v(\d+)\.(\d{2}))["']/);
if (!appVersion) throw new Error("lib/version.ts에서 APP_VERSION(vX.YY)을 찾지 못했습니다.");
const [, versionName, major, minor] = appVersion;

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const chromeVersion = `${Number(major)}.${Number(minor)}.0`;
if (manifest.version !== chromeVersion || manifest.version_name !== versionName) {
  manifest.version = chromeVersion;
  manifest.version_name = versionName;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`manifest.json 동기화 완료 -> version ${chromeVersion}, version_name ${versionName}`);
}

fs.mkdirSync(downloadsRoot, { recursive: true });
const latestPath = path.join(downloadsRoot, "trending-product-finder-extension-latest.zip");

await new Promise((resolve, reject) => {
  const output = fs.createWriteStream(latestPath);
  const archive = archiver("zip", { zlib: { level: 9 } });
  output.on("close", resolve);
  output.on("error", reject);
  archive.on("error", reject);
  archive.pipe(output);
  archive.directory(extensionRoot, false);
  archive.finalize();
});

console.log(`Created ${path.relative(projectRoot, latestPath)} (${fs.statSync(latestPath).size} bytes)`);
