// 이 PC 사양 읽기 — 운영체제·CPU·메모리·그래픽카드·그래픽 메모리·드라이버·저장 공간·받아 둔 모델.
// 원본 기능을 옮김(2026-11-03). 판정은 device.mjs(순수 함수)에서 한다.
import { execFile } from "node:child_process";
import { readdir, statfs } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const round1 = (n) => Math.round(n * 10) / 10;

/** 저장 공간을 잴 위치 — 아직 없는 폴더면 있는 부모까지 올라간다 */
async function freeSpaceGb(dir, disk) {
  let p = path.resolve(dir);
  for (let i = 0; i < 8; i++) {
    try {
      const s = await disk(p);
      return { freeGb: Math.floor((Number(s.bavail) * Number(s.bsize)) / 2 ** 30), freePath: p };
    } catch {
      const up = path.dirname(p);
      if (up === p) break;
      p = up;
    }
  }
  return { freeGb: null, freePath: dir };
}

/** checkpoints 폴더에 받아 둔 모델 폴더 이름들 */
export async function listInstalledModels(checkpointsDir) {
  try {
    const entries = await readdir(checkpointsDir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory() && !e.name.startsWith(".")).map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * @param {{ storageDir: string, checkpointsDir: string, ffmpeg: boolean }} where
 * @param {object} deps 시험용(platform·exec·os·statfs 바꿔 끼우기)
 */
export async function inspectSystem({ storageDir, checkpointsDir, ffmpeg }, deps = {}) {
  const platform = deps.platform ?? process.platform;
  const run = deps.exec ?? exec;
  const host = deps.os ?? os;
  const disk = deps.statfs ?? statfs;
  const sys = {
    platform,
    arch: deps.arch ?? process.arch,
    os: `${host.type()} ${host.release()}`,
    cpu: host.cpus()[0]?.model?.trim() || "확인 불가",
    cores: host.cpus().length || null,
    ramGb: Math.round(host.totalmem() / 2 ** 30),
    gpu: "",
    gpuVendor: "",
    vramGb: null,
    driver: "",
    ffmpeg,
  };
  if (platform === "win32") {
    try {
      const { stdout } = await run("nvidia-smi", ["--query-gpu=name,memory.total,driver_version", "--format=csv,noheader,nounits"], { windowsHide: true, timeout: 10000 });
      const [name, mib, driver] = String(stdout).trim().split(/\r?\n/)[0].split(",").map((s) => s.trim());
      Object.assign(sys, { gpu: name, gpuVendor: "NVIDIA", vramGb: round1(Number(mib) / 1024), driver });
    } catch {
      try {
        const { stdout } = await run("powershell.exe", ["-NoProfile", "-Command", "(Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name) -join ', '"], { windowsHide: true, timeout: 10000 });
        // 원격 접속·기본 디스플레이 같은 가상 장치는 뺀다
        sys.gpu = String(stdout).split(",").map((s) => s.trim()).filter((s) => s && !/remote display|basic display|virtual|parsec|mirage/i.test(s)).join(", ");
      } catch {}
    }
    try {
      const { stdout } = await run("powershell.exe", ["-NoProfile", "-Command", "(Get-CimInstance Win32_OperatingSystem).Caption"], { windowsHide: true, timeout: 10000 });
      if (String(stdout).trim()) sys.os = String(stdout).trim();
    } catch {}
  } else if (platform === "darwin") {
    try {
      const { stdout } = await run("/usr/bin/sw_vers", ["-productVersion"], { timeout: 5000 });
      sys.os = `macOS ${String(stdout).trim()}`;
    } catch {}
    try {
      const { stdout } = await run("/usr/sbin/sysctl", ["-n", "machdep.cpu.brand_string"], { timeout: 5000 });
      if (String(stdout).trim()) sys.cpu = String(stdout).trim();
    } catch {}
    if (sys.arch === "arm64") Object.assign(sys, { gpu: "Apple Silicon 그래픽", gpuVendor: "Apple" });
  }
  Object.assign(sys, await freeSpaceGb(storageDir, disk));
  sys.installedModels = await listInstalledModels(checkpointsDir);
  return sys;
}
