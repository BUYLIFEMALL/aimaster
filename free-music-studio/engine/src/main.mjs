#!/usr/bin/env node
// AI 무료음악 자동화 엔진 0.1 — 실행: `node src/main.mjs`
// 순서: 연결 문 열기(상태 「설치 중」) → ACE-Step 설치 확인 → 내부 서버 실행 → 「준비됨」.
// 시험용: FMS_ACESTEP_DIR(이미 설치된 ACE-Step 폴더) + FMS_PYTHON(그 폴더의 파이썬)이 있으면 설치를 건너뛰고 그 파이썬으로 띄운다.
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ensureInstalled, hasNvidia, launch, waitHealthy } from "./acestep.mjs";
import { chooseDevice } from "./device.mjs";
import { createGateway, GATEWAY_PORT } from "./gateway.mjs";
import { newToken } from "./security.mjs";

const VERSION = "0.1.0";
const ACESTEP_PORT = 47822;

const dataDir =
  process.env.FMS_DATA_DIR ||
  (process.platform === "win32"
    ? path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "FreeMusicEngine")
    : path.join(os.homedir(), "Library", "Application Support", "FreeMusicEngine"));
const tokensFile = path.join(dataDir, "paired.json");
const logLine = (s) => process.stdout.write(s.endsWith("\n") ? s : s + "\n");

const device = chooseDevice({ platform: process.platform, arch: process.arch, nvidia: process.platform === "win32" && hasNvidia() });
const state = { ready: false, stage: "시작 중", mode: device.mode, device: device.device, note: device.reason, error: "" };

await mkdir(dataDir, { recursive: true });
let tokens = new Set();
try {
  tokens = new Set(JSON.parse(await readFile(tokensFile, "utf8")).tokens ?? []);
} catch {}
const saveTokens = () => writeFile(tokensFile, JSON.stringify({ tokens: [...tokens] }, null, 2));

const acestepKey = newToken(); // 실행할 때마다 새로 — 연결 문만 안다
const gateway = createGateway({
  version: VERSION,
  getState: () => ({ ...state, paired: tokens.size > 0 }),
  tokens,
  saveTokens,
  acestepPort: ACESTEP_PORT,
  acestepKey,
  onPairCode: (code) => logLine(`\n  🔑 연결 코드: ${code}  (사이트 「내 PC 엔진」 화면에 입력)\n`),
});
gateway.listen(GATEWAY_PORT, "127.0.0.1", () => logLine(`AI 무료음악 자동화 엔진 ${VERSION} — 연결 문 http://127.0.0.1:${GATEWAY_PORT}  · ${device.mode}`));

if (!device.supported) {
  state.stage = "미지원";
  state.error = device.reason;
  logLine(`⚠ ${device.reason}`);
} else {
  try {
    let child;
    if (process.env.FMS_ACESTEP_DIR && process.env.FMS_PYTHON) {
      state.stage = "음악 엔진 켜는 중";
      const dir = process.env.FMS_ACESTEP_DIR;
      child = spawn(process.env.FMS_PYTHON, ["-c", "from acestep.api_server import main; main()"], {
        cwd: dir,
        windowsHide: true,
        env: {
          ...process.env,
          PYTHONPATH: dir,
          ACESTEP_API_HOST: "127.0.0.1",
          ACESTEP_API_PORT: String(ACESTEP_PORT),
          ACESTEP_API_KEY: acestepKey,
          ACESTEP_DEVICE: device.device,
          ACESTEP_INIT_LLM: device.initLlm ? "true" : "false",
        },
      });
      child.stdout.on("data", () => {});
      child.stderr.on("data", () => {});
    } else {
      const dir = await ensureInstalled(dataDir, { onStage: (s) => ((state.stage = s), logLine(`… ${s}`)) });
      state.stage = "음악 엔진 켜는 중";
      child = launch(dir, { port: ACESTEP_PORT, apiKey: acestepKey, device: device.device, initLlm: device.initLlm });
    }
    child.on("exit", (code) => {
      state.ready = false;
      state.stage = "멈춤";
      state.error = `음악 엔진이 멈췄습니다(코드 ${code}). 엔진을 다시 실행해 주세요.`;
      logLine(`⚠ ${state.error}`);
    });
    const ok = await waitHealthy(ACESTEP_PORT);
    if (!ok) throw new Error("음악 엔진이 3분 안에 켜지지 않았습니다.");
    state.ready = true;
    state.stage = "준비됨";
    logLine("✔ 준비됨 — 사이트에서 노래를 만들 수 있습니다.");
    const stop = () => {
      child.kill();
      process.exit(0);
    };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
  } catch (err) {
    state.stage = "오류";
    state.error = err.message;
    logLine(`⚠ ${err.message}`);
  }
}
