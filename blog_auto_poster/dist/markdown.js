"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatReadableParagraphs = formatReadableParagraphs;
exports.mdLiteToHtml = mdLiteToHtml;
exports.estimateReadingMinutes = estimateReadingMinutes;
exports.extractExcerpt = extractExcerpt;
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function sanitizeUrl(url) {
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('data:image/')) {
        return trimmed;
    }
    return null;
}
function inline(text) {
    let escaped = escapeHtml(text);
    escaped = escaped.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, url) => {
        const cleanUrl = url.replace(/&amp;/g, '&');
        const safe = sanitizeUrl(cleanUrl);
        if (!safe)
            return alt;
        const caption = alt ? `<figcaption class="text-center text-xs text-slate-500 mt-2 font-medium">📷 ${alt} (클릭하여 고화질 확대)</figcaption>` : '';
        return `<figure class="my-6 group cursor-zoom-in"><img src="${safe}" alt="${alt}" data-zoomable="true" class="w-full rounded-2xl border border-slate-200 shadow-sm object-contain max-h-[520px] transition-all duration-200 group-hover:shadow-md hover:brightness-105" />${caption}</figure>`;
    });
    escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, linkText, url) => {
        const cleanUrl = url.replace(/&amp;/g, '&');
        const safe = sanitizeUrl(cleanUrl);
        return safe ? `<a href="${safe}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 underline font-semibold hover:text-indigo-800">${linkText}</a>` : linkText;
    });
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    escaped = escaped.replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono text-xs">$1</code>');
    return escaped;
}
function formatReadableParagraphs(text) {
    if (!text || text.trim().length === 0)
        return text;
    const paragraphs = text.split(/\n\s*\n/);
    const formatted = paragraphs.map((p) => {
        const trimmed = p.trim();
        if (trimmed.length < 200)
            return trimmed;
        const sentences = trimmed.split(/(?<=[.!?])\s+/);
        if (sentences.length <= 2)
            return trimmed;
        const chunks = [];
        let currentChunk = [];
        let currentLen = 0;
        for (const sentence of sentences) {
            currentChunk.push(sentence);
            currentLen += sentence.length;
            if (currentChunk.length >= 2 && currentLen >= 120) {
                chunks.push(currentChunk.join(' '));
                currentChunk = [];
                currentLen = 0;
            }
        }
        if (currentChunk.length > 0) {
            chunks.push(currentChunk.join(' '));
        }
        return chunks.join('\n\n');
    });
    return formatted.join('\n\n');
}
function mdLiteToHtml(raw) {
    const formattedRaw = formatReadableParagraphs(raw || '');
    const lines = formattedRaw.replace(/\r\n/g, '\n').split('\n');
    const blocks = [];
    let paragraphBuf = [];
    let listBuf = [];
    let i = 0;
    const flushParagraph = () => {
        if (paragraphBuf.length > 0) {
            const fullText = paragraphBuf.join(' ');
            const splitText = formatReadableParagraphs(fullText);
            const subParagraphs = splitText.split('\n\n');
            subParagraphs.forEach((subP) => {
                if (subP.trim()) {
                    blocks.push(`<p class="leading-relaxed mb-5 text-slate-800">${inline(subP.trim())}</p>`);
                }
            });
            paragraphBuf = [];
        }
    };
    const flushList = () => {
        if (listBuf.length > 0) {
            blocks.push('<ul class="list-disc list-inside space-y-1.5 mb-4 text-slate-800">' +
                listBuf.map((item) => `<li>${inline(item)}</li>`).join('') +
                '</ul>');
            listBuf = [];
        }
    };
    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.startsWith('```')) {
            flushParagraph();
            flushList();
            const lang = trimmed.replace(/^```/, '').trim() || 'text';
            const codeLines = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith('```')) {
                codeLines.push(lines[i]);
                i++;
            }
            i++;
            const rawCode = codeLines.join('\n');
            blocks.push(`<div class="my-3 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-xl"><div class="flex items-center gap-2 bg-slate-900 px-4 py-2 border-b border-slate-800 text-slate-400 text-xs font-mono font-semibold uppercase tracking-wider"><span class="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500/80"></span><span class="text-slate-300">${escapeHtml(lang)}</span></div><pre class="p-4 overflow-x-auto text-xs font-mono text-slate-200 bg-slate-950 leading-relaxed"><code>${escapeHtml(rawCode)}</code></pre></div>`);
            continue;
        }
        if (/^####\s+/.test(trimmed)) {
            flushParagraph();
            flushList();
            const titleText = trimmed.replace(/^####\s+/, '');
            blocks.push(`<h4 class="text-sm font-bold text-slate-900 mt-6 mb-2">${inline(titleText)}</h4>`);
            i++;
            continue;
        }
        if (/^###\s+/.test(trimmed)) {
            flushParagraph();
            flushList();
            blocks.push(`<h3 class="text-base font-bold text-slate-900 mt-6 mb-2">${inline(trimmed.replace(/^###\s+/, ''))}</h3>`);
            i++;
            continue;
        }
        if (/^##\s+/.test(trimmed)) {
            flushParagraph();
            flushList();
            blocks.push(`<h2 class="text-xl font-extrabold text-slate-900 mt-8 mb-3 pb-1 border-b border-slate-100">${inline(trimmed.replace(/^##\s+/, ''))}</h2>`);
            i++;
            continue;
        }
        if (/^#\s+/.test(trimmed)) {
            flushParagraph();
            flushList();
            blocks.push(`<h1 class="text-2xl font-black text-slate-900 mt-10 mb-4">${inline(trimmed.replace(/^#\s+/, ''))}</h1>`);
            i++;
            continue;
        }
        if (/^>\s?/.test(trimmed)) {
            flushParagraph();
            flushList();
            const quoteLines = [];
            while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
                quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
                i++;
            }
            blocks.push(`<blockquote class="border-l-4 border-indigo-500 bg-indigo-50/60 text-slate-700 p-4 rounded-r-xl my-4 text-sm font-medium leading-relaxed">${inline(quoteLines.join(' '))}</blockquote>`);
            continue;
        }
        if (/^[-*]\s+/.test(trimmed)) {
            flushParagraph();
            listBuf.push(trimmed.replace(/^[-*]\s+/, ''));
            i++;
            continue;
        }
        if (trimmed === '---') {
            flushParagraph();
            flushList();
            blocks.push('<hr class="my-6 border-slate-200" />');
            i++;
            continue;
        }
        if (trimmed === '') {
            flushParagraph();
            flushList();
            i++;
            continue;
        }
        paragraphBuf.push(trimmed);
        i++;
    }
    flushParagraph();
    flushList();
    return blocks.join('\n');
}
function estimateReadingMinutes(text) {
    const clean = text.replace(/!\[.*?\]\(.*?\)/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1');
    const words = clean.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
}
function extractExcerpt(text, maxLength = 160) {
    const clean = text
        .replace(/^#+\s+/gm, '')
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/[*_`>#]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (clean.length <= maxLength)
        return clean;
    return clean.slice(0, maxLength) + '...';
}
