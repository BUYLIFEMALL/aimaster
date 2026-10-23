// 상태바 「한도 값 보충」 부품 (2026-10-20, 주인님 「상태바가 자동으로 올라오지 않아」)
// 세션 시작 직후(첫 응답 전)에는 Claude Code가 rate_limits를 보내지 않아 5h·weekly 칸이 비었다.
// 이 부품은 상태바 스크립트보다 먼저 입력(JSON)을 읽어서
//   - rate_limits가 있으면 저장하고,
//   - 없으면 초기화 시각(resets_at)이 아직 안 지난 마지막 값을 채워 넣은 뒤
// 원래 스크립트가 평소처럼 읽도록 입력을 다시 넘겨 준다(process.stdin·fs.readFileSync(0) 모두).
// 설치: node scripts/mac-mini/install-statusline-limits.mjs  (상태바 스크립트 맨 앞에 이 파일을 불러오는 한 줄을 붙임)
// 어떤 오류가 나도 원래 입력을 그대로 넘겨 상태바를 막지 않는다.
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { Readable } = require("stream");

let raw = "";
try { raw = fs.readFileSync(0, "utf8"); } catch {}
let out = raw;

try {
  const cache = path.join(os.tmpdir(), "claude-statusline-last-limits.json");
  const data = JSON.parse(raw.replace(/^﻿/, "").trim() || "{}");
  const limits = data.rate_limits;
  if (limits && typeof limits === "object" && Object.keys(limits).length) {
    fs.writeFileSync(cache, JSON.stringify(limits));
  } else if (fs.existsSync(cache)) {
    const saved = JSON.parse(fs.readFileSync(cache, "utf8"));
    const now = Math.floor(Date.now() / 1000);
    for (const key of Object.keys(saved)) {
      if (typeof saved[key]?.resets_at === "number" && saved[key].resets_at <= now) delete saved[key];
    }
    if (Object.keys(saved).length) {
      data.rate_limits = saved;
      out = JSON.stringify(data);
    }
  }
} catch {}

// 원래 스크립트가 어떤 방식으로 읽어도 같은 입력을 받도록 바꿔 끼운다
try {
  const stream = Readable.from([out]);
  Object.defineProperty(process, "stdin", { value: stream, configurable: true, writable: true });
  const originalRead = fs.readFileSync;
  fs.readFileSync = function (file, ...rest) {
    if (file === 0 || file === "/dev/stdin") {
      const opt = rest[0];
      const encoding = typeof opt === "string" ? opt : opt && opt.encoding;
      return encoding ? out : Buffer.from(out);
    }
    return originalRead.call(this, file, ...rest);
  };
} catch {}
