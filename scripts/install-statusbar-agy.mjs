#!/usr/bin/env node
// agy(Antigravity CLI) 하단 상태바 설치 (statusLine.command 표시 스크립트, 윈도우·맥 공용)
// 표시: [모델]·[effort] | 5h [남은%] (남은 시간) | weekly [남은%] (남은 시간) | context [남은%]
//
// 사용: node scripts/install-statusbar-agy.mjs [--agy-dir <폴더>    기본: ~/.gemini/antigravity-cli]
// 실제 설치는 통합 스크립트 install-statusbars.mjs가 한다(표시 코드는 그 파일 한 곳에서만 관리).
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const main = path.join(path.dirname(fileURLToPath(import.meta.url)), 'install-statusbars.mjs');
const r = spawnSync(process.execPath, [main, '--only', 'agy', ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status ?? 1);
