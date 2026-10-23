import React from 'react';
import {createRoot} from 'react-dom/client';
import {VideoCard} from '../src/components/common/VideoCard';
import {ChannelCard} from '../src/components/common/ChannelCard';
import {FavoritesProvider} from '../src/components/favorites/FavoritesProvider';
import {FavoriteCounts} from '../src/components/dashboard/FavoriteCounts';
const root=createRoot(document.getElementById('root')!);
const thumb='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#242424"/><text x="180" y="180" fill="white" font-size="40">SYNTHETIC</text></svg>');
const win=window as any;win.bookmarks=0;win.apiCalls=0;
window.fetch=async(input)=>{if(String(input)==='/api/favorites')return new Response(JSON.stringify({favorites:win.fixtureRows,serverNow:new Date().toISOString()}),{headers:{'Content-Type':'application/json'}});win.apiCalls++;throw Error('Fixture must not call an external API');};
win.renderFixture=(mode='cards')=>{
 if(mode==='counts'||mode==='invalid'){
  localStorage.setItem('yvs_fav_videos',mode==='invalid'?'{bad':JSON.stringify([{},{}]));localStorage.setItem('yvs_fav_channels',mode==='invalid'?'{}':JSON.stringify([{}]));
  win.fixtureRows = ['video','video','channel'].map((item_type,i)=>({item_type,item_id:String(i),payload:{},created_at:new Date(Date.now()-(mode==='invalid'?31:0)*86400000).toISOString()}));
  root.render(<FavoritesProvider key={mode} userId='fixture-member'><main className="p-4"><FavoriteCounts/></main></FavoritesProvider>);return;
 }
 root.render(<main className="p-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{(['SUPER_VIRAL','VIRAL','RISING','NORMAL'] as const).map((badge,i)=><section data-badge={badge} key={badge}><VideoCard video={{id:'synthetic-'+i,title:'합성 검수 영상 '+badge,description:'합성 데이터',thumbnailUrl:thumb,publishedAt:new Date().toISOString(),channelId:'synthetic-channel',channelTitle:'합성 검수 채널',channelThumbnailUrl:thumb,channelSubscriberCount:2000,viewCount:300000,isShort:true,vph:10000,vsRatio:150,viralScore:90,viralBadge:badge}} onBookmark={()=>win.bookmarks++}/></section>)}<section data-channel><ChannelCard channel={{id:'synthetic-channel',title:'합성 황금 채널',description:'합성 데이터',thumbnailUrl:thumb,publishedAt:new Date().toISOString(),subscriberCount:2000,videoCount:10,viewCount:3000000,averageViews:300000,viralIndex:92}} onBookmark={()=>win.bookmarks++}/></section></main>);
};win.renderFixture();
