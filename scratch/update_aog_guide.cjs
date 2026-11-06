const fs = require('fs');
let guide = fs.readFileSync('allinone-graphic/src/app/guide/page.tsx', 'utf8');

// 1. Badges & links
guide = guide.replaceAll('text-amber-400', 'text-indigo-400');
guide = guide.replaceAll('bg-amber-500/10', 'bg-indigo-500/10');
guide = guide.replaceAll('border-amber-500/30', 'border-indigo-500/30');
guide = guide.replaceAll('hover:text-amber-400', 'hover:text-indigo-300');
guide = guide.replaceAll('selection:bg-amber-500', 'selection:bg-indigo-500');

// 2. Headings & Gradients
guide = guide.replace(
  'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent',
  'bg-gradient-to-r from-indigo-400 via-pink-300 to-indigo-300 bg-clip-text text-transparent'
);
guide = guide.replace(
  '크리에이티브 아틀리에 가이드',
  '피그마 프로 캔버스 아틀리에 가이드'
);
guide = guide.replace(
  'px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-110 transition-all shadow-md shadow-amber-500/20',
  'px-4 py-2 btn-3d-indigo text-xs flex items-center justify-center cursor-pointer'
);

fs.writeFileSync('allinone-graphic/src/app/guide/page.tsx', guide, 'utf8');
console.log('Successfully updated guide/page.tsx');
