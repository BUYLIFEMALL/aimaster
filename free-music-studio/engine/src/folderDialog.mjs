// PC에 「폴더 고르기」 창을 띄우고, 저장 폴더를 탐색기(Finder)로 연다.
// 브라우저는 보안상 실제 폴더 경로를 알 수 없어서, 엔진이 회원 PC에서 직접 창을 띄운다.
import { spawn } from "node:child_process";

function run(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { windowsHide: false });
    let out = "";
    child.stdout?.on("data", (d) => (out += String(d)));
    child.on("error", () => resolve({ code: -1, out: "" }));
    child.on("close", (code) => resolve({ code, out }));
  });
}

/** 폴더 고르기 창. 고르면 경로, 취소하면 null. 지원하지 않는 PC면 예외. */
export async function pickFolder(startDir, prompt = "노래를 저장할 폴더를 고르세요") {
  if (process.platform === "win32") {
    // 창이 브라우저 뒤에 숨지 않게 맨 위 창을 주인으로 띄운다. 한글 경로를 위해 UTF-8로 출력.
    const esc = (s) => String(s).replace(/'/g, "''");
    const script = [
      "[Console]::OutputEncoding = [Text.Encoding]::UTF8",
      "Add-Type -AssemblyName System.Windows.Forms",
      "$owner = New-Object System.Windows.Forms.Form -Property @{ TopMost = $true; ShowInTaskbar = $false }",
      "$d = New-Object System.Windows.Forms.FolderBrowserDialog",
      `$d.Description = '${esc(prompt)}'`,
      "$d.ShowNewFolderButton = $true",
      `$d.SelectedPath = '${esc(startDir)}'`,
      "if ($d.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($d.SelectedPath) }",
    ].join("; ");
    const r = await run("powershell.exe", ["-NoProfile", "-STA", "-Command", script]);
    return r.out.trim() || null;
  }
  if (process.platform === "darwin") {
    const r = await run("osascript", ["-e", `POSIX path of (choose folder with prompt ${JSON.stringify(prompt)})`]);
    return r.code === 0 && r.out.trim() ? r.out.trim().replace(/\/$/, "") : null;
  }
  throw new Error("이 PC에서는 폴더 고르기 창을 띄울 수 없습니다. 경로를 직접 입력해 주세요.");
}

/** 저장 폴더를 탐색기(Finder)로 연다. */
export async function revealFolder(dir) {
  if (process.platform === "win32") return run("explorer.exe", [dir]);
  if (process.platform === "darwin") return run("open", [dir]);
  return run("xdg-open", [dir]);
}
