'use client';
import { useState } from 'react';
import { useFavorites } from '@/components/favorites/FavoritesProvider';

export function PlaylistReference({ id, title }: { id: string; title: string }) {
  const member = useFavorites();
  const [message,setMessage] = useState('');
  async function copy() {
    if(!member?.userId) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify({ format:'aimaster-youtube-reference', version:1, ownerId:member.userId, createdAt:new Date().toISOString(), title:title.slice(0,1000), url:'https://www.youtube.com/watch?v='+encodeURIComponent(id) }));
      setMessage('복사했습니다. 5분 안에 같은 계정의 Playlist 참고 메모 칸에 붙여넣어주세요.');
    } catch { setMessage('복사 권한을 확인한 뒤 다시 눌러주세요.'); }
  }
  return <div className="mt-3 border-t border-yt-border pt-2 text-xs"><button type="button" disabled={!member?.userId} className="text-yt-link underline disabled:opacity-50" onClick={()=>void copy()}>Playlist 참고 메모 복사</button><a href="https://youtube-playlist.buylife.xyz" target="_blank" rel="noopener noreferrer" className="ml-3 text-yt-muted underline">Playlist 열기 ↗</a>{message&&<p role="status" className="mt-1 text-yt-muted">{message}</p>}</div>;
}
