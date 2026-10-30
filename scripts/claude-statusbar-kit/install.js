// Claude Code 상태바 설치·제거. 사용: node install.js / node install.js --uninstall
// settings.json 의 statusLine 항목만 바꾸고 다른 설정은 그대로 둡니다.
const fs = require('fs');
const os = require('os');
const path = require('path');

const dir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const settingsPath = path.join(dir, 'settings.json');
const scriptPath = path.join(dir, 'statusline-kit.js');
const previousPath = path.join(dir, 'statusline-kit-previous.json');

function fail(message) {
  console.error(`\n[실패] ${message}`);
  process.exit(1);
}

function readSettings() {
  if (!fs.existsSync(settingsPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8').replace(/^﻿/, ''));
  } catch {
    fail(`${settingsPath} 파일의 형식이 잘못돼 아무것도 바꾸지 않았습니다. 파일을 고친 뒤 다시 실행해 주세요.`);
  }
}

function writeSettings(settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
}

function uninstall() {
  if (!fs.existsSync(scriptPath)) return console.log('\n설치된 상태바가 없습니다. 바꾼 것은 없습니다.');
  const settings = readSettings();
  const previous = fs.existsSync(previousPath) ? JSON.parse(fs.readFileSync(previousPath, 'utf8')) : {};
  if (previous.statusLine) settings.statusLine = previous.statusLine;
  else delete settings.statusLine;
  writeSettings(settings);
  fs.rmSync(scriptPath, { force: true });
  fs.rmSync(previousPath, { force: true });
  console.log('\n상태바를 제거했습니다. Claude Code를 다시 시작하면 적용됩니다.');
}

function install() {
  fs.mkdirSync(dir, { recursive: true });
  const settings = readSettings();
  const already = fs.existsSync(scriptPath);
  if (!already) {
    fs.writeFileSync(previousPath, JSON.stringify({ statusLine: settings.statusLine ?? null }, null, 2));
    if (fs.existsSync(settingsPath)) fs.copyFileSync(settingsPath, `${settingsPath}.before-statusbar`);
  }
  fs.copyFileSync(path.join(__dirname, 'statusline.js'), scriptPath);
  settings.statusLine = { type: 'command', command: `node "${scriptPath.replace(/\\/g, '/')}"`, padding: 0 };
  writeSettings(settings);
  console.log('\n상태바를 설치했습니다.');
  console.log('Claude Code를 완전히 닫았다가 다시 시작해 주세요.');
  console.log('처음에는 사용량이 안 보일 수 있으며, 질문을 한 번 보내면 나타납니다.');
}

if (process.argv.includes('--uninstall')) uninstall();
else install();
