const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ESLint } = require('eslint');
const root = path.resolve(__dirname, '..');
const repo = path.resolve(root, '..');
const files = ['app/layout.tsx', 'app/api/categories/route.ts', 'app/posts/[id]/layout.tsx', 'utils/privateResponse.ts',
  'utils/supabase/admin.ts', 'app/_components/CategoryManagementModal.tsx',
  'app/api/posts/[id]/route.ts', 'app/posts/[id]/page.tsx', 'utils/access.ts', 'app/api/auto-post/route.ts'];
const counts = messages => messages.filter(m => m.severity === 2).reduce((map, m) => {
  // Diagnostic code frames contain changing line numbers; compare rule + message instead.
  const key = `${m.ruleId}: ${m.message.split('\n')[0]}`; map[key] = (map[key] ?? 0) + 1; return map;
}, {});
(async () => {
  const eslint = new ESLint({ cwd: root });
  const report = [];
  for (const file of files) {
    const full = path.join(root, file);
    let previous = '';
    try { previous = execFileSync('git', ['show', `HEAD:ai-auto-blog/${file}`], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true }); } catch {}
    const [currentResult] = await eslint.lintText(fs.readFileSync(full, 'utf8'), { filePath: full });
    const [previousResult] = previous ? await eslint.lintText(previous, { filePath: full }) : [{ messages: [] }];
    const before = counts(previousResult.messages), after = counts(currentResult.messages);
    report.push({ file, errors: currentResult.errorCount, warnings: currentResult.warningCount,
      addedErrors: Object.entries(after).flatMap(([message, count]) => count > (before[message] ?? 0) ? [{ message, count: count - (before[message] ?? 0) }] : []) });
  }
  console.log(JSON.stringify(report, null, 2));
  if (report.some(r => r.addedErrors.length)) process.exitCode = 1;
})().catch(() => { console.error('Security lint comparison failed'); process.exitCode = 1; });
