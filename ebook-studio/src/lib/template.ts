import { EbookProject, Chapter, ThemeKey, FontKey } from "./types";
import { THEMES, FONTS } from "./themes";
import JSZip from "jszip";

/**
 * 간단하고 안전한 마크다운 -> HTML 변환기
 */
export function markdownToHtml(md: string): string {
  if (!md) return "";

  let html = md.replace(/\r\n/g, "\n");

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, (_match, code) => {
    return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
  });

  // Headers
  html = html.replace(/^#### (.*$)/gim, "<h4>$1</h4>");
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

  // Blockquotes
  html = html.replace(/^\> (.*$)/gim, "<blockquote>$1</blockquote>");

  // Bold & Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Unordered list
  html = html.replace(/^\s*[-*+]\s+(.*$)/gim, "<ul><li>$1</li></ul>");
  html = html.replace(/<\/ul>\s*<ul>/g, "");

  // Ordered list
  html = html.replace(/^\s*(\d+)\.\s+(.*$)/gim, "<ol><li>$2</li></ol>");
  html = html.replace(/<\/ol>\s*<ol>/g, "");

  // Paragraphs
  const blocks = html.split(/\n{2,}/);
  html = blocks
    .map((b) => {
      const trimmed = b.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<pre") ||
        trimmed.startsWith("<blockquote") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<ol")
      ) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");

  return html;
}

export function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildCssThemeVariables(): string {
  let css = "";
  // Theme rules
  for (const [key, theme] of Object.entries(THEMES)) {
    css += `body[data-theme="${key}"] {
  --bg: ${theme.bg};
  --paper: ${theme.paper};
  --fg: ${theme.fg};
  --muted: ${theme.muted};
  --line: ${theme.line};
  --accent: ${theme.accent};
}\n`;
  }

  // Font rules
  for (const [key, font] of Object.entries(FONTS)) {
    css += `body[data-font="${key}"] {
  --font: ${font.stack};
}\n`;
  }

  return css;
}

/**
 * 완전 독립형 단일 HTML 생성기
 */
export function buildStandaloneHtml(project: EbookProject): string {
  const { title, subtitle, author, chapters, style, coverImage } = project;
  const currentTheme = THEMES[style.theme] || THEMES.warm;
  const currentFont = FONTS[style.font] || FONTS.notoSans;

  const fontLinks = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_twelve@1.0/Ridibatang.woff">
<link rel="stylesheet" href="https://hangeul.pstatic.net/hangeul_static/webfont/MaruBuri/MaruBuri.css">
`;

  const coverSection = coverImage
    ? `<section id="cover" class="chapter cover photo">
        <img src="${coverImage}" alt="${escapeHtml(title)} 표지">
      </section>`
    : `<section id="cover" class="chapter cover">
        <div class="cover-inner">
          <div class="cover-label">
            <span>EBOOK STUDIO COLLECTION</span>
            <span>№ 001</span>
          </div>
          <div class="cover-rule"></div>
          <div class="cover-category">DIGITAL PUBLICATION</div>
          <h1>${escapeHtml(title)}</h1>
          <p class="cover-sub">${escapeHtml(subtitle)}</p>
          <div class="cover-footer">
            <span>${escapeHtml(author)}</span>
            <span>${new Date().getFullYear()}</span>
          </div>
        </div>
      </section>`;

  const tocSection = `
<section id="toc-chapter" class="chapter toc-chapter">
  <p class="eyebrow">TABLE OF CONTENTS</p>
  <h1>목차</h1>
  <ul class="toc-page">
    ${chapters
      .map(
        (ch, i) => `
      <li>
        <button data-go="${i + 2}">
          <b>${String(i + 1).padStart(2, "0")}</b>
          <span>${escapeHtml(ch.title)}</span>
        </button>
      </li>
    `
      )
      .join("")}
  </ul>
</section>
`;

  const chapterSections = chapters
    .map((ch, i) => {
      const summaryHtml = ch.summary.trim()
        ? `<p class="summary">${escapeHtml(ch.summary)}</p>`
        : "";

      const takeawaysHtml =
        ch.takeaways && ch.takeaways.length > 0
          ? `<div class="insight">
              <h3>핵심 인사이트</h3>
              <ul>${ch.takeaways.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
            </div>`
          : "";

      const questionsHtml =
        ch.questions && ch.questions.length > 0
          ? `<div class="questions">
              <h3>생각하고 실천하기</h3>
              <small>원문을 바탕으로 구성한 편집자 질문</small>
              ${ch.questions
                .map(
                  (q) => `
                <label>
                  <input type="checkbox"> ${escapeHtml(q)}
                </label>
              `
                )
                .join("")}
            </div>`
          : "";

      return `
    <section id="chapter-${i}" class="chapter content-chapter" hidden>
      <p class="eyebrow">CHAPTER ${String(i + 1).padStart(2, "0")}</p>
      <h1>${escapeHtml(ch.title)}</h1>
      ${summaryHtml}
      <article>
        ${markdownToHtml(ch.content)}
      </article>
      ${takeawaysHtml}
      ${questionsHtml}
    </section>
    `;
    })
    .join("");

  const themeOptions = Object.entries(THEMES)
    .map(
      ([k, t]) =>
        `<option value="${k}"${k === style.theme ? " selected" : ""}>${escapeHtml(t.label)}</option>`
    )
    .join("");

  const fontOptions = Object.entries(FONTS)
    .map(
      ([k, f]) =>
        `<option value="${k}"${k === style.font ? " selected" : ""}>${escapeHtml(f.label)}</option>`
    )
    .join("");

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(subtitle || title)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(subtitle || title)}">
  ${fontLinks}
  <style>
    ${buildCssThemeVariables()}
    * { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; }
    body {
      background: var(--bg);
      color: var(--fg);
      font-size: var(--size, 17px);
      line-height: var(--leading, 1.7);
      font-family: var(--font, ${currentFont.stack});
      transition: background .2s, color .2s;
    }
    button, select, input { font-family: inherit; font-size: inherit; }
    button, select {
      color: var(--fg);
      background: var(--paper);
      border: 1px solid var(--line);
      padding: 7px 11px;
      border-radius: 6px;
      cursor: pointer;
    }
    button:disabled { opacity: .4; cursor: default; }
    nav {
      position: fixed;
      width: 260px;
      inset: 0 auto 0 0;
      padding: 24px 20px;
      border-right: 1px solid var(--line);
      background: var(--bg);
      overflow-y: auto;
      z-index: 20;
    }
    nav h2 { font-size: 20px; line-height: 1.4; margin: 8px 0; word-break: keep-all; }
    nav button {
      display: block;
      text-align: left;
      width: 100%;
      margin: 4px 0;
      padding: 8px 10px;
      font-size: 14px;
      border: 0;
      background: transparent;
      border-radius: 6px;
      transition: background .15s;
    }
    nav button:hover { background: var(--paper); }
    nav button.active { background: var(--line); font-weight: 700; color: var(--accent); }
    nav input {
      width: 100%;
      background: var(--paper);
      color: var(--fg);
      border: 1px solid var(--line);
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    main { margin-left: 260px; min-height: 100%; display: flex; flex-direction: column; }
    header {
      display: flex;
      justify-content: flex-start;
      gap: 8px;
      padding: 10px 24px;
      border-bottom: 1px solid var(--line);
      background: var(--paper);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    header .controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .slide {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--muted);
      white-space: nowrap;
    }
    .slide input { width: 70px; accent-color: var(--accent); cursor: pointer; }
    .page {
      --pad-x: 48px;
      --pad-y: 44px;
      width: 100%;
      max-width: 860px;
      margin: 24px auto 40px;
      padding: var(--pad-y) var(--pad-x);
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
    }
    .eyebrow { letter-spacing: 2.5px; font-size: 12px; color: var(--accent); font-weight: 700; }
    h1 { font-size: 32px; line-height: 1.35; letter-spacing: -0.5px; margin-top: 6px; word-break: keep-all; }
    .summary {
      color: var(--muted);
      border-bottom: 1px solid var(--line);
      padding-bottom: 24px;
      margin-bottom: 28px;
      font-size: 1.05em;
      line-height: 1.6;
    }
    article h2 { font-size: 22px; margin-top: 36px; border-left: 3px solid var(--accent); padding-left: 12px; }
    article h3 { font-size: 18px; margin-top: 28px; color: var(--accent); }
    article p { margin: 18px 0; }
    strong { font-weight: 700; color: var(--fg); }
    blockquote {
      margin: 24px 0;
      padding: 14px 20px;
      border-left: 3px solid var(--accent);
      background: var(--bg);
      border-radius: 0 6px 6px 0;
    }
    pre {
      background: var(--bg);
      border: 1px solid var(--line);
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
    }
    code { font-family: ui-monospace, Consolas, monospace; font-size: 0.9em; }
    .insight {
      background: var(--bg);
      border: 1px solid var(--line);
      padding: 18px 24px;
      margin-top: 36px;
      border-radius: 8px;
    }
    .insight h3 { margin-top: 0; color: var(--accent); font-size: 16px; }
    .insight ul { margin-bottom: 0; padding-left: 20px; }
    .insight li { margin: 6px 0; }
    .questions {
      margin-top: 32px;
      padding: 18px 24px;
      border-top: 1px dashed var(--line);
    }
    .questions h3 { margin-top: 0; font-size: 16px; }
    .questions small { color: var(--muted); display: block; margin-bottom: 12px; }
    .questions label { display: block; margin: 10px 0; cursor: pointer; }
    .questions input[type="checkbox"] { accent-color: var(--accent); margin-right: 8px; }
    footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-top: 48px;
      padding-top: 20px;
      border-top: 1px solid var(--line);
    }
    .cover {
      position: relative;
      display: flex;
      flex-direction: column;
      min-height: 65vh;
      padding: 40px;
      border-radius: 8px;
      border: 1px solid var(--line);
    }
    .cover-label { display: flex; justify-content: space-between; font-size: 12px; letter-spacing: 2px; color: var(--muted); }
    .cover-rule { height: 1px; background: var(--line); margin-top: 16px; }
    .cover-category { margin-top: 40px; font-size: 13px; letter-spacing: 2.5px; color: var(--accent); font-weight: 700; }
    .cover h1 { font-size: 38px; margin: 16px 0; word-break: keep-all; }
    .cover-sub { color: var(--muted); font-size: 1.1em; line-height: 1.8; }
    .cover-footer {
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      color: var(--muted);
      border-top: 1px solid var(--line);
      padding-top: 16px;
    }
    .cover.photo { padding: 0; overflow: hidden; background: transparent; border: 0; }
    .cover.photo img { width: 100%; height: auto; max-height: 75vh; object-fit: contain; border-radius: 8px; }
    .toc-page { list-style: none; padding: 0; margin: 32px 0 0; }
    .toc-page li { border-bottom: 1px solid var(--line); }
    .toc-page button {
      display: flex;
      gap: 16px;
      align-items: baseline;
      width: 100%;
      text-align: left;
      border: 0;
      background: transparent;
      padding: 16px 8px;
      border-radius: 0;
    }
    .toc-page b { color: var(--accent); font-size: 15px; }
    .toc-page button:hover { background: var(--bg); }
    #mobile-btn { display: none; }
    
    @media(max-width: 850px) {
      nav { display: none; position: fixed; inset: 0 auto 0 0; width: 280px; box-shadow: 4px 0 20px rgba(0,0,0,0.1); }
      body.menu-open nav { display: block; }
      main { margin-left: 0; }
      .page { margin: 12px; padding: 24px 20px; }
      #mobile-btn { display: inline-block; }
    }

    @page { margin: 20mm 18mm; }
    @media print {
      nav, header, footer, #mobile-btn { display: none !important; }
      main { margin: 0; }
      body { background: #fff !important; color: #000 !important; font-size: 11pt; line-height: 1.6; }
      .page { padding: 0; margin: 0; border: 0; max-width: none; background: #fff !important; box-shadow: none; }
      .chapter { display: block !important; break-before: page; }
      .chapter:first-child { break-before: auto; }
      h1, h2, h3 { break-after: avoid; }
      p, li { orphans: 3; widows: 3; }
      blockquote, .insight, .questions { break-inside: avoid; }
    }
  </style>
</head>
<body data-theme="${style.theme}" data-font="${style.font}" data-skin="${style.skin}" style="--leading: ${style.leading}; --size: ${style.size}px;">
  <nav>
    <div class="eyebrow">EBOOK STUDIO</div>
    <h2>${escapeHtml(title)}</h2>
    <p><small>${escapeHtml(author)}</small></p>
    <input id="search" aria-label="책 전체 검색" placeholder="책에서 검색...">
    <div id="toc">
      <button data-index="0" class="active">표지</button>
      <button data-index="1">목차</button>
      ${chapters
        .map(
          (c, idx) => `
        <button data-index="${idx + 2}">
          ${String(idx + 1).padStart(2, "0")}　${escapeHtml(c.title)}
        </button>
      `
        )
        .join("")}
    </div>
  </nav>

  <main>
    <header>
      <button id="mobile-btn">목차</button>
      <div class="controls">
        <select id="theme" aria-label="읽기 테마">${themeOptions}</select>
        <select id="font" aria-label="본문 서체">${fontOptions}</select>
        <label class="slide">줄 간격<input id="leading" type="range" min="1.2" max="2.1" step="0.05" value="${style.leading}"></label>
        <label class="slide">글자<input id="size" type="range" min="14" max="22" step="1" value="${style.size}"></label>
        <button id="print-btn">인쇄 / PDF 저장</button>
      </div>
    </header>

    <div class="page">
      ${coverSection}
      ${tocSection}
      ${chapterSections}
      <footer>
        <button id="prev-btn">← 이전 장</button>
        <small id="progress-text">표지</small>
        <button id="next-btn">다음 장 →</button>
      </footer>
    </div>
  </main>

  <script>
    const sections = [...document.querySelectorAll('.chapter')];
    const navButtons = [...document.querySelectorAll('#toc button')];
    let currentIndex = 0;

    function showChapter(idx) {
      currentIndex = Math.max(0, Math.min(idx, sections.length - 1));
      sections.forEach((s, i) => s.hidden = i !== currentIndex);
      navButtons.forEach((b, i) => b.classList.toggle('active', i === currentIndex));

      const prog = document.getElementById('progress-text');
      if (currentIndex === 0) prog.textContent = '표지';
      else if (currentIndex === 1) prog.textContent = '목차';
      else prog.textContent = (currentIndex - 1) + ' / ' + (sections.length - 2);

      document.getElementById('prev-btn').disabled = currentIndex === 0;
      document.getElementById('next-btn').disabled = currentIndex === sections.length - 1;
      document.body.classList.remove('menu-open');
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    navButtons.forEach(b => b.onclick = () => showChapter(Number(b.dataset.index)));
    document.querySelectorAll('.toc-page button').forEach(b => b.onclick = () => showChapter(Number(b.dataset.go)));
    document.getElementById('prev-btn').onclick = () => showChapter(currentIndex - 1);
    document.getElementById('next-btn').onclick = () => showChapter(currentIndex + 1);

    document.getElementById('theme').onchange = (e) => document.body.dataset.theme = e.target.value;
    document.getElementById('font').onchange = (e) => document.body.dataset.font = e.target.value;

    document.getElementById('leading').oninput = (e) => document.body.style.setProperty('--leading', e.target.value);
    document.getElementById('size').oninput = (e) => document.body.style.setProperty('--size', e.target.value + 'px');

    document.getElementById('print-btn').onclick = () => window.print();
    document.getElementById('mobile-btn').onclick = () => document.body.classList.toggle('menu-open');

    document.getElementById('search').oninput = (e) => {
      const q = e.target.value.toLowerCase().trim();
      navButtons.forEach((b, i) => {
        if (!q) { b.hidden = false; return; }
        b.hidden = !sections[i].textContent.toLowerCase().includes(q);
      });
    };

    showChapter(0);
  </script>
</body>
</html>`;
}

/**
 * 웹 배포용 ZIP 생성 (Vercel Drop 호환 index.html 번들)
 */
export async function buildWebDeployZip(project: EbookProject): Promise<Blob> {
  const zip = new JSZip();
  const htmlContent = buildStandaloneHtml(project);

  zip.file("index.html", htmlContent);
  zip.file(
    "README.md",
    `# ${project.title}
배포 준비가 완료된 웹 전자책입니다.
Vercel(https://vercel.com/new/drop) 또는 GitHub에 업로드하여 어디서나 읽을 수 있는 주소를 생성하세요.
제작 도구: eBook Studio (https://ebook-studio.buylife.xyz)
`
  );

  return await zip.generateAsync({ type: "blob" });
}

/**
 * 표준 EPUB 생성
 */
export async function buildEpubBlob(project: EbookProject): Promise<Blob> {
  const zip = new JSZip();

  // 1. mimetype (압축 안 함)
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  // 2. META-INF/container.xml
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  // 3. CSS
  const css = `
body { font-family: sans-serif; line-height: 1.7; padding: 5%; color: #333; }
h1 { font-size: 1.8em; margin-bottom: 0.5em; }
h2 { font-size: 1.4em; margin-top: 1.2em; }
p { margin: 1em 0; }
.eyebrow { color: #888; font-size: 0.85em; letter-spacing: 2px; }
.summary { color: #666; font-style: italic; border-bottom: 1px solid #ddd; padding-bottom: 1em; }
.insight { background: #f5f5f5; padding: 1em; border-left: 4px solid #333; margin: 1.5em 0; }
.questions { border-top: 1px dashed #ccc; padding-top: 1em; margin-top: 1.5em; }
`;
  zip.file("OEBPS/style.css", css);

  // 4. Chapters XHTML
  const manifestItems: string[] = [
    `<item id="css" href="style.css" media-type="text/css"/>`,
    `<item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
  ];
  const spineItems: string[] = [`<itemref idref="toc"/>`];

  // Table of Contents XHTML
  const tocXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="ko">
<head>
  <title>목차</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>${escapeHtml(project.title)} - 목차</h1>
    <ol>
      ${project.chapters.map((c, i) => `<li><a href="ch${i}.xhtml">${escapeHtml(c.title)}</a></li>`).join("\n")}
    </ol>
  </nav>
</body>
</html>`;
  zip.file("OEBPS/toc.xhtml", tocXhtml);

  // Chapter files
  project.chapters.forEach((ch, idx) => {
    const fileId = `ch${idx}`;
    const fileName = `${fileId}.xhtml`;
    manifestItems.push(`<item id="${fileId}" href="${fileName}" media-type="application/xhtml+xml"/>`);
    spineItems.push(`<itemref idref="${fileId}"/>`);

    const chapterXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="ko">
<head>
  <title>${escapeHtml(ch.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <p class="eyebrow">CHAPTER ${String(idx + 1).padStart(2, "0")}</p>
  <h1>${escapeHtml(ch.title)}</h1>
  ${ch.summary ? `<p class="summary">${escapeHtml(ch.summary)}</p>` : ""}
  <div>${markdownToHtml(ch.content)}</div>
  ${ch.takeaways?.length ? `<div class="insight"><h3>핵심 인사이트</h3><ul>${ch.takeaways.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul></div>` : ""}
  ${ch.questions?.length ? `<div class="questions"><h3>생각하고 실천하기</h3>${ch.questions.map((q) => `<p>□ ${escapeHtml(q)}</p>`).join("")}</div>` : ""}
</body>
</html>`;
    zip.file(`OEBPS/${fileName}`, chapterXhtml);
  });

  // 5. OEBPS/content.opf
  const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeHtml(project.title)}</dc:title>
    <dc:creator>${escapeHtml(project.author)}</dc:creator>
    <dc:language>ko</dc:language>
    <dc:identifier id="BookId">urn:uuid:${project.id}</dc:identifier>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.[0-9]+Z$/, "Z")}</meta>
  </metadata>
  <manifest>
    ${manifestItems.join("\n    ")}
  </manifest>
  <spine>
    ${spineItems.join("\n    ")}
  </spine>
</package>`;
  zip.file("OEBPS/content.opf", opf);

  return await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
}
