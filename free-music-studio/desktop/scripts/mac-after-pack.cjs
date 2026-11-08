// Electron 44 미서명 맥 앱: 런타임이 먼저 찾는 원래 보조 실행 파일 이름을 유지한다.
// 이름만 보정하며 앱 표시명·번들 ID·서명 설정·윈도우 패키지는 바꾸지 않는다.
// 근거: Electron OverrideChildProcessPath 및 electron-builder #9771.
// https://github.com/electron/electron/blob/v44.9.2/shell/app/electron_main_delegate_mac.mm
const fs = require("node:fs/promises");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

module.exports = async function macAfterPack(context) {
  if (context.electronPlatformName !== "darwin") return;
  const frameworks = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, "Contents", "Frameworks");
  const suffixes = new Set([" Helper", " Helper (GPU)", " Helper (Plugin)", " Helper (Renderer)"]);
  let corrected = 0;
  for (const item of await fs.readdir(frameworks, { withFileTypes: true })) {
    if (!item.isDirectory() || !item.name.endsWith(".app")) continue;
    const suffix = item.name.slice(item.name.lastIndexOf(" Helper"), -4);
    if (!suffixes.has(suffix)) continue;
    const oldName = item.name.slice(0, -4);
    const runtimeName = `Electron${suffix}`;
    if (oldName === runtimeName) continue;
    const source = path.join(frameworks, item.name);
    const destination = path.join(frameworks, `${runtimeName}.app`);
    // 충돌하거나 바이너리가 없으면 빌드를 멈춘다. 다른 파일을 덮지 않는다.
    try { await fs.access(destination); throw new Error(`보조 실행 파일 이름 충돌: ${runtimeName}`); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    await fs.rename(path.join(source, "Contents", "MacOS", oldName), path.join(source, "Contents", "MacOS", runtimeName));
    execFileSync("/usr/bin/plutil", ["-replace", "CFBundleExecutable", "-string", runtimeName, path.join(source, "Contents", "Info.plist")]);
    await fs.rename(source, destination);
    corrected++;
  }
  console.log(`맥 보조 실행 파일 이름 확인: ${corrected}개 보정`);
};
