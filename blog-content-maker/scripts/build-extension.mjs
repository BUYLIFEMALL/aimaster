import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
const root=process.cwd(),dir=path.join(root,'extension');
const manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
const version=/APP_VERSION\s*=\s*"(v\d+\.\d+)"/.exec(await fs.readFile(path.join(root,'src/lib/version.ts'),'utf8'))?.[1];
if(manifest.version_name!==version)throw new Error('앱과 확장 버전이 다릅니다.');
const zip=new JSZip();for(const name of await fs.readdir(dir)){const file=path.join(dir,name);if((await fs.stat(file)).isFile())zip.file(name,await fs.readFile(file));}
const out=path.join(root,'public/downloads');await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'blog-content-maker-extension-latest.zip'),await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
console.log('Extension archive ready:',version);
