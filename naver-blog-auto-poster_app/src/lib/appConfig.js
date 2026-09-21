"use strict";

const fs = require("node:fs");
const path = require("node:path");

// 앱 로컬 설정(현재는 AIMaster 연동 토큰만) 저장/조회. 토큰은 이 컴퓨터에만 저장되고
// 서버에는 해시만 있으므로, 평문 토큰이 남는 곳은 이 파일 하나뿐이다.

function configPathFor(runtimeRoot) {
  return path.join(runtimeRoot, "config.json");
}

function readConfig(runtimeRoot) {
  try {
    const raw = fs.readFileSync(configPathFor(runtimeRoot), "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeConfig(runtimeRoot, config) {
  fs.mkdirSync(runtimeRoot, { recursive: true });
  fs.writeFileSync(configPathFor(runtimeRoot), JSON.stringify(config, null, 2), "utf8");
}

function getAimasterToken(runtimeRoot) {
  return readConfig(runtimeRoot).aimasterToken || null;
}

function setAimasterToken(runtimeRoot, token) {
  const config = readConfig(runtimeRoot);
  config.aimasterToken = token;
  writeConfig(runtimeRoot, config);
}

module.exports = { getAimasterToken, setAimasterToken };
