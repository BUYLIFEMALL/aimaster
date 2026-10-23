import path from 'node:path';
import { createRatesClient } from './src/rates.mjs';
import { countdown } from './src/format.mjs';

const binaryPath = path.join(process.env.APPDATA, 'npm/node_modules/@openai/codex/node_modules/@openai/codex-win32-x64/vendor/x86_64-pc-windows-msvc/bin/codex.exe');
const client = createRatesClient(binaryPath, process.env);
try {
  const value = await client.ready;
  if (!value || (!value.fiveHour && !value.weekly)) throw new Error('No verified quota windows returned for this Codex account.');
  console.log(JSON.stringify({ fiveHour: value.fiveHour ? { ...value.fiveHour, countdown: countdown(value.fiveHour.resetsAt) } : null, weekly: value.weekly ? { ...value.weekly, countdown: countdown(value.weekly.resetsAt) } : null }, null, 2));
} finally { client.close(); }
