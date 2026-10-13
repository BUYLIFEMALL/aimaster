import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const local = path.join(root, '.local');
const manifestPath = path.join(local, 'launcher-install.json');
const launcher = path.join(process.env.APPDATA, 'npm/node_modules/@openai/codex/bin/codex.js');
const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');
const start = '/* AIMASTER_CODEX_STATUSBAR_START */';
const end = '/* AIMASTER_CODEX_STATUSBAR_END */';
const original = fs.readFileSync(launcher);

if (process.argv.includes('--restore')) {
  const record = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (record.launcher !== launcher || digest(original) !== record.patchedSha256) throw new Error('Launcher changed outside this installer; automatic restore refused.');
  const backup = fs.readFileSync(record.backup);
  if (digest(backup) !== record.originalSha256) throw new Error('Backup integrity mismatch');
  fs.writeFileSync(launcher, backup);
  console.log('Original Codex npm launcher restored. Running sessions were preserved.');
} else {
  const text = original.toString('utf8');
  const anchor = 'const child = spawn(binaryPath, process.argv.slice(2), {';
  if (text.includes(start)) {
    if (!text.includes(end)) throw new Error('Incomplete statusbar installation marker');
    console.log('Codex countdown statusbar is already installed.');
  } else {
    if (text.split(anchor).length !== 2) throw new Error('Unsupported npm launcher layout; no file was changed.');
    const commands = ['exec', 'e', 'review', 'login', 'logout', 'mcp', 'mcp-server', 'app-server', 'app', 'completion', 'sandbox', 'debug', 'doctor', 'apply', 'a', 'cloud', 'features', 'plugins', 'remote-control', 'queue', 'archive', 'delete', '--help', '-h', '--version', '-V'];
    const moduleUrl = pathToFileURL(path.join(root, 'src/run.mjs')).href;
    const block = `${start}\nif (process.stdin.isTTY && process.stdout.isTTY && !process.argv.slice(2).some((arg) => ${JSON.stringify(commands)}.includes(arg))) {\n  let countdownModule;\n  try { countdownModule = await import(${JSON.stringify(moduleUrl)}); }\n  catch { console.error('[Codex countdown unavailable; using standard statusbar]'); }\n  if (countdownModule) {\n    let countdownCode;\n    try { countdownCode = await countdownModule.runStatusbar({ binaryPath, args: process.argv.slice(2), env }); }\n    catch { console.error('[Codex countdown could not start; using standard statusbar]'); }\n    if (countdownCode !== undefined) process.exit(countdownCode);\n  }\n}\n${end}\n\n`;
    const patched = text.replace(anchor, block + anchor);
    fs.mkdirSync(local, { recursive: true });
    const backup = path.join(local, `codex-launcher-${digest(original).slice(0, 16)}.js`);
    if (!fs.existsSync(backup)) fs.writeFileSync(backup, original, { flag: 'wx' });
    fs.writeFileSync(manifestPath, JSON.stringify({ installedOn: new Date().toISOString(), launcher, backup, originalSha256: digest(original), patchedSha256: digest(patched), version: 'v1.01' }, null, 2) + '\n');
    fs.writeFileSync(launcher, patched);
    console.log('Codex countdown installed for new interactive codex/codex.cmd sessions. Original launcher backed up; running sessions preserved.');
  }
}
