// 원본 litpage는 Vite의 import.meta.glob('**/*.block.tsx' / '**/*.view.tsx')으로 블록·데이터베이스 보기를 자동 등록했다.
// Next.js에는 이 문법이 없어서, 빌드 전에 같은 파일 목록(경로 순서, Vite와 같은 순서)으로 import 파일을 만든다.
// 새 *.block.tsx / *.view.tsx를 추가하면 npm run build·typecheck가 이 스크립트를 먼저 돌려 자동으로 포함된다.
import { readdirSync, statSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const features = join(import.meta.dirname, '..', 'src', 'litpage', 'web', 'features');
const outDir = join(features, 'editor', 'blocks');
const out = join(outDir, 'registry.generated.ts');

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

// Vite는 glob 기준 경로(../../<features 아래 경로>)로 정렬하므로 같은 키로 정렬한다
const all = walk(features).map((p) => ({ key: '../../' + relative(features, p).split(sep).join('/'), file: p }));
const toImport = (p) => {
  const r = relative(outDir, p).split(sep).join('/');
  return r.startsWith('.') ? r : './' + r;
};
const pick = (suffix) => all.filter((x) => x.key.endsWith(suffix)).sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)).map((x) => toImport(x.file));
const lines = [
  '// 자동 생성 파일(scripts/gen-registry.mjs) — 직접 고치지 않는다.',
  '// 원본의 import.meta.glob(\'../../**/*.block.tsx\') / (\'../../**/*.view.tsx\')와 같은 목록·순서.',
  ...pick('.block.tsx').map((p) => `import '${p}';`),
  ...pick('.view.tsx').map((p) => `import '${p}';`),
  '',
];
const text = lines.join('\n');
if (!existsSync(out) || readFileSync(out, 'utf8') !== text) writeFileSync(out, text);
console.log(`registry.generated.ts: block ${pick('.block.tsx').length}개, view ${pick('.view.tsx').length}개`);

// 서버: 원본 api/extra.ts는 실행 중에 api/modules 폴더를 읽어 동적으로 불러왔다(번들 배포에서는 폴더가 없다).
// 같은 순서(파일 이름 정렬)의 정적 import 목록을 만든다.
const modDir = join(import.meta.dirname, '..', 'src', 'litpage', 'server', 'api', 'modules');
const modFiles = readdirSync(modDir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts')).sort();
const modOut = join(modDir, '..', 'modules.generated.ts');
const modText = [
  '// 자동 생성 파일(scripts/gen-registry.mjs) — 직접 고치지 않는다. api/modules/*.ts를 파일 이름 순서로 불러온다.',
  ...modFiles.map((f, i) => `import * as m${i} from './modules/${f}';`),
  `export const moduleList: { handlers?: Record<string, unknown> }[] = [${modFiles.map((_, i) => `m${i}`).join(', ')}];`,
  '',
].join('\n');
if (!existsSync(modOut) || readFileSync(modOut, 'utf8') !== modText) writeFileSync(modOut, modText);
console.log(`modules.generated.ts: 서버 기능 파일 ${modFiles.length}개`);
