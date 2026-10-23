import React from 'react';import {createRoot} from 'react-dom/client';
import Dashboard from '../app/(dashboard)/dashboard/page';
import Comments from '../app/(dashboard)/comments/page';
import History from '../app/(dashboard)/history/page';
import Videos from '../app/(dashboard)/videos/page';
import {Sidebar} from '../components/layout/Sidebar';
const root=createRoot(document.getElementById('root')!);
const v1='11111111-1111-4111-8111-111111111111',v2='22222222-2222-4222-8222-222222222222';
window.renderFixture=async(name:string,empty=false)=>{
 const owner='fixture-owner';const now=new Date().toISOString();
 window.fixture={pathname:'/'+name,actions:0,queries:[],data:empty?{}:{
  ytreply_accounts:[{user_id:owner,channel_title:'합성 검수 채널',needs_reconnect:false}],
  ytreply_settings:[{user_id:owner,reply_model:'gpt-5.6-luna',monitoring_enabled:true,monitoring_interval_minutes:60,last_run_at:now,auto_approve:false}],
  user_api_keys:[{user_id:owner,provider:'openai'},{user_id:owner,provider:'google_client_id'},{user_id:owner,provider:'google_client_secret'}],
  user_telegram_links:[{user_id:owner,program_slug:'youtube-auto-reply',bot_username:'fixture_bot'}],
  ytreply_videos:[{id:v1,user_id:owner,youtube_video_id:'fixture_video_1',title:'합성 검수 영상 첫 번째',thumbnail_url:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="red"/></svg>',is_monitored:true,is_hidden:false,custom_link:null},{id:v2,user_id:owner,youtube_video_id:'fixture_video_2',title:'합성 검수 영상 두 번째',thumbnail_url:null,is_monitored:false,is_hidden:false,custom_link:'https://example.test/'}],
  ytreply_comments:[{id:'pending-1',user_id:owner,video_id:v1,status:'pending_review',author_display_name:'합성 민지',comment_text:'제품 소개 감사합니다. '+('https://example.test/'+ 'long'.repeat(30)),generated_reply:'봐 주셔서 감사합니다. 본인 채널 초안입니다.',fetched_at:now},{id:'posted-1',user_id:owner,video_id:v1,status:'posted',author_display_name:'합성 지훈',comment_text:'영상 덕분에 도움이 됐어요.',generated_reply:'도움이 되셨다니 기쁩니다.',replied_at:now,fetched_at:now}]
 }};
 const pages:any={dashboard:Dashboard,comments:Comments,history:History,videos:Videos};const content=await pages[name]();
 root.render(<div className="flex min-h-screen flex-col md:flex-row"><Sidebar userEmail="fixture@example.test" pendingCount={empty?0:1}/><main className="min-w-0 flex-1 bg-yt-bg p-4 md:p-8" data-fixture={name}>{content}</main></div>);
};
window.renderFixture('dashboard');
