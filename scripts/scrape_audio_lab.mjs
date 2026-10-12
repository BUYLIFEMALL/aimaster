import fs from 'node:fs';

async function scrape() {
  const targetUrl = 'https://gpt-park-ai-audio-lab.vercel.app/';
  console.log('Fetching HTML from:', targetUrl);
  const res = await fetch(targetUrl);
  const html = await res.text();
  fs.writeFileSync('scripts/audio_lab.html', html, 'utf8');
  console.log('Saved HTML (length:', html.length, ')');

  // Find all script tags
  const scriptRegex = /<script[^>]+src=["']([^"']+)["']/g;
  let match;
  const scripts = [];
  while ((match = scriptRegex.exec(html)) !== null) {
    scripts.push(match[1]);
  }
  console.log('Found scripts:', scripts);

  // Also find stylesheet links
  const cssRegex = /<link[^>]+href=["']([^"']+\.css[^"']*)["']/g;
  const stylesheets = [];
  while ((match = cssRegex.exec(html)) !== null) {
    stylesheets.push(match[1]);
  }
  console.log('Found stylesheets:', stylesheets);

  // Download all JS files
  for (const src of scripts) {
    const fullUrl = src.startsWith('http') ? src : new URL(src, targetUrl).toString();
    console.log('Fetching script:', fullUrl);
    try {
      const sRes = await fetch(fullUrl);
      const code = await sRes.text();
      const filename = 'scripts/audio_' + src.split('/').pop().split('?')[0];
      fs.writeFileSync(filename, code, 'utf8');
      console.log('Saved', filename, 'length:', code.length);
    } catch (e) {
      console.error('Failed to fetch script', src, e);
    }
  }
}

scrape();
