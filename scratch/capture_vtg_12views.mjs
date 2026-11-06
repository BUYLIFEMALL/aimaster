import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const { chromium } = require('D:/Antigravity/AIMaster/ai-image-studio/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const fileUrl = 'file:///' + path.resolve('scratch/vtg_showcase_12views.html').replace(/\\/g, '/');
  console.log('Navigating to:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  
  const views = [
    { id: '#view-c1-main', name: 'vtg_c1_main.png' },
    { id: '#view-c1-detail', name: 'vtg_c1_detail.png' },
    { id: '#view-c1-guide', name: 'vtg_c1_guide.png' },
    { id: '#view-c1-settings', name: 'vtg_c1_settings.png' },
    { id: '#view-c2-main', name: 'vtg_c2_main.png' },
    { id: '#view-c2-detail', name: 'vtg_c2_detail.png' },
    { id: '#view-c2-guide', name: 'vtg_c2_guide.png' },
    { id: '#view-c2-settings', name: 'vtg_c2_settings.png' },
    { id: '#view-c3-main', name: 'vtg_c3_main.png' },
    { id: '#view-c3-detail', name: 'vtg_c3_detail.png' },
    { id: '#view-c3-guide', name: 'vtg_c3_guide.png' },
    { id: '#view-c3-settings', name: 'vtg_c3_settings.png' },
  ];
  
  const artifactDir = 'C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967';
  
  // 영구 저장 디렉터리 준비
  const dir54 = 'D:/Antigravity/Design/54_cinematic_hollywood_rec/video-to-gif';
  const dir55 = 'D:/Antigravity/Design/55_hyper_nle_timeline/video-to-gif';
  const dir56 = 'D:/Antigravity/Design/56_ultra_gpu_engine/video-to-gif';
  fs.mkdirSync(dir54, { recursive: true });
  fs.mkdirSync(dir55, { recursive: true });
  fs.mkdirSync(dir56, { recursive: true });

  for (const v of views) {
    const el = await page.$(v.id);
    if (el) {
      const outPath = path.join(artifactDir, v.name);
      await el.screenshot({ path: outPath });
      console.log('Captured artifact:', v.name);
      
      // 독립 폴더 영구 아카이브 저장
      if (v.name.startsWith('vtg_c1_')) {
        const destName = v.name.replace('vtg_c1_', '01_').replace('01_detail', '02_detail').replace('01_guide', '03_guide').replace('01_settings', '04_settings');
        fs.copyFileSync(outPath, path.join(dir54, destName.startsWith('0') ? destName : '01_main.png'));
      } else if (v.name.startsWith('vtg_c2_')) {
        const destName = v.name.replace('vtg_c2_', '01_').replace('01_detail', '02_detail').replace('01_guide', '03_guide').replace('01_settings', '04_settings');
        fs.copyFileSync(outPath, path.join(dir55, destName.startsWith('0') ? destName : '01_main.png'));
      } else if (v.name.startsWith('vtg_c3_')) {
        const destName = v.name.replace('vtg_c3_', '01_').replace('01_detail', '02_detail').replace('01_guide', '03_guide').replace('01_settings', '04_settings');
        fs.copyFileSync(outPath, path.join(dir56, destName.startsWith('0') ? destName : '01_main.png'));
      }
    } else {
      console.error('Element not found:', v.id);
    }
  }
  
  await browser.close();
  console.log('All 12 views captured and archived successfully!');
})();
