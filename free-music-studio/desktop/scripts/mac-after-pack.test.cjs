const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const afterPack = require('./mac-after-pack.cjs');

test('윈도우 빌드는 파일 접근 없이 그대로 둔다', async () => {
  await afterPack({ electronPlatformName: 'win32' });
});

test('맥 보조 앱 4종의 폴더·실행 파일·plist 이름을 함께 맞춘다', { skip: process.platform !== 'darwin' }, async () => {
  const cache = path.resolve(__dirname, '../.mac-build');
  await fs.mkdir(cache, { recursive: true });
  const dir = await fs.mkdtemp(path.join(cache, 'helper-test-'));
  try {
    const frameworks = path.join(dir, 'FreeMusicEngine.app/Contents/Frameworks');
    const suffixes = [' Helper', ' Helper (GPU)', ' Helper (Plugin)', ' Helper (Renderer)'];
    for (const suffix of suffixes) {
      const name = `한글 엔진${suffix}`;
      const contents = path.join(frameworks, `${name}.app/Contents`);
      await fs.mkdir(path.join(contents, 'MacOS'), { recursive: true });
      await fs.writeFile(path.join(contents, 'MacOS', name), '진단용 실행 파일');
      await fs.writeFile(path.join(contents, 'Info.plist'), `<?xml version="1.0"?><plist version="1.0"><dict><key>CFBundleExecutable</key><string>${name}</string><key>CFBundleDisplayName</key><string>한글 표시명</string></dict></plist>`);
    }
    const context = { electronPlatformName: 'darwin', appOutDir: dir, packager: { appInfo: { productFilename: 'FreeMusicEngine' } } };
    await afterPack(context);
    for (const suffix of suffixes) {
      const name = `Electron${suffix}`;
      const contents = path.join(frameworks, `${name}.app/Contents`);
      assert.equal(await fs.readFile(path.join(contents, 'MacOS', name), 'utf8'), '진단용 실행 파일');
      const plist = path.join(contents, 'Info.plist');
      assert.equal(execFileSync('/usr/bin/plutil', ['-extract', 'CFBundleExecutable', 'raw', '-o', '-', plist], { encoding: 'utf8' }).trim(), name);
      assert.equal(execFileSync('/usr/bin/plutil', ['-extract', 'CFBundleDisplayName', 'raw', '-o', '-', plist], { encoding: 'utf8' }).trim(), '한글 표시명');
    }
    await afterPack(context);
    assert.equal((await fs.readdir(frameworks)).length, 4);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
