import {DOMParser,parseHTML} from 'linkedom';
import {parsePostUrl} from '../material-preview';
export type FeedPost={blogId:string;postId:string;url:string;title:string;body:string;publishedAt:string|null};
export function parseNeighborFeed(xml:string,owner:string):FeedPost[]{
 if(!/^[a-z0-9_-]{1,50}$/.test(owner)||typeof xml!=='string'||Buffer.byteLength(xml)>1048576||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Feed input');
 const doc=new DOMParser().parseFromString(xml,'text/xml'),root=doc.documentElement;
 if(!root||!['rss','feed'].includes(root.localName)||doc.querySelector('parsererror'))throw Error('Feed format');
 const rows=[...doc.getElementsByTagName(root.localName==='feed'?'entry':'item')];if(rows.length>50)throw Error('Feed size');
 const plain=(html:string)=>{const {document}=parseHTML(`<html><body>${html}</body></html>`);document.querySelectorAll('script,style,iframe,object,form').forEach(e=>e.remove());document.querySelectorAll('p,div,br,li,h1,h2,h3').forEach(e=>e.append('\n'));return document.body.textContent.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\ufeff]/g,'').trim();};
 const result=rows.map(row=>{
  const get=(tag:string)=>row.getElementsByTagName(tag)[0]?.textContent?.trim()??'';
  const link=root.localName==='feed'?[...row.getElementsByTagName('link')].find(e=>!e.getAttribute('rel')||e.getAttribute('rel')==='alternate')?.getAttribute('href'):get('link');
  const post=parsePostUrl(link);if(!post||post.blogId!==owner)throw Error('Feed owner');
  const title=plain(get('title'));if(!title||title.length>500)throw Error('Feed title');
  const body=plain(get('content:encoded')||get('content')||get('description')||get('summary'));
  // Never trim a feed excerpt into a purported full article.
  if(body.length>20000)throw Error('Feed body exceeds supported complete-text size');
  const date=Date.parse(get('pubDate')||get('published')||get('updated'));
  return {...post,title,body,publishedAt:Number.isFinite(date)?new Date(date).toISOString():null};
 });
 if(new Set(result.map(p=>p.postId)).size!==result.length)throw Error('Feed duplicates');return result;
}
export async function fetchNeighborFeed(owner:string,fetcher:typeof fetch=fetch){
 if(!/^[a-z0-9_-]{1,50}$/.test(owner))throw Error('Feed owner');
 const r=await fetcher(`https://rss.blog.naver.com/${owner}.xml`,{redirect:'error',cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(10000)});
 if(!r.ok||!r.body)throw Error('Feed unavailable');const reader=r.body.getReader(),chunks=[];let size=0;
 for(;;){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>1048576){await reader.cancel();throw Error('Feed size');}chunks.push(next.value);}
 const xml=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));return {xml,posts:parseNeighborFeed(xml,owner)};
}
