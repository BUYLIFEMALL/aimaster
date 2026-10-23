// v1.20: 「⚡ 내 PC 고속 변환」 내려받을 파일을 public/downloads/local-renderer/ 에 만든다.
//   gif-renderer-extension-latest.zip — 크롬 확장(압축 풀어 「압축해제된 확장 프로그램 로드」)
//   gif-renderer-windows-latest.zip   — 윈도우 렌더러(풀고 install-windows.bat 더블클릭)
//   install-mac.sh · host.pl          — 맥 터미널 한 줄 설치(curl … | bash)가 받아 가는 파일
//   version.json                      — 확장·렌더러 버전
// 새 패키지 없이 공용 기준 코드 store-zip 사본(lib/zip.ts, 직접 고치지 말 것)을 불러 쓴다. Node 22.18+ (TS 형 지우기 기본).
// 사용: node scripts/build-local-renderer.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createZip } from "../lib/zip.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "local-renderer");
const out = path.join(root, "public", "downloads", "local-renderer");
fs.mkdirSync(out, { recursive: true });

const read = (rel) => new Uint8Array(fs.readFileSync(path.join(src, rel)));
const write = (name, data) => {
  fs.writeFileSync(path.join(out, name), data);
  console.log(`✔ ${name} (${data.length} bytes)`);
};

const manifest = JSON.parse(fs.readFileSync(path.join(src, "extension", "manifest.json"), "utf8"));
const extFiles = fs.readdirSync(path.join(src, "extension")).filter((f) => !f.startsWith("."));
write(
  "gif-renderer-extension-latest.zip",
  createZip(extFiles.map((f) => ({ name: `gif-renderer-extension/${f}`, data: read(`extension/${f}`) })))
);

write(
  "gif-renderer-windows-latest.zip",
  createZip([
    { name: "gif-renderer-windows/install-windows.bat", data: read("install/install-windows.bat") },
    { name: "gif-renderer-windows/install-windows.ps1", data: read("install/install-windows.ps1") },
    { name: "gif-renderer-windows/uninstall-windows.bat", data: read("install/uninstall-windows.bat") },
    { name: "gif-renderer-windows/host/host.ps1", data: read("host/host.ps1") },
    { name: "gif-renderer-windows/host/host.bat", data: read("host/host.bat") },
  ])
);

write("install-mac.sh", read("install/install-mac.sh"));
write("uninstall-mac.sh", read("install/uninstall-mac.sh"));
write("host.pl", read("host/host.pl"));

const hostVersion = fs.readFileSync(path.join(src, "host", "host.pl"), "utf8").match(/HOST_VERSION\s*=\s*"([^"]+)"/)?.[1];
write("version.json", new TextEncoder().encode(JSON.stringify({ extension: manifest.version_name, host: hostVersion }, null, 2) + "\n"));
