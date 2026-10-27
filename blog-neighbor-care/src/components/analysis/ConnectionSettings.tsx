'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { request, date } from '../../lib/analysis/client';
import { ModelPicker } from './ModelPicker';
import { selectionForProvider } from '../../lib/analysis/modelSelection';

type Device = { id: string; blog_id: string; device_name: string; revoked_at: string | null; expires_at: string };
export function ConnectionSettings() {
  const [devices, setDevices] = useState<Device[] | null>(null), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [model, setModel] = useState(() => selectionForProvider('openai'));
  const lock = useRef(false);
  async function refresh() {
    if (lock.current) return; lock.current = true; setBusy(true); setMessage('');
    try { setDevices(await request<Device[]>('/api/reader/member', 'devices')); } catch (e) { setDevices(null); setMessage(e instanceof Error ? e.message : '연결을 확인하지 못했습니다.'); } finally { lock.current = false; setBusy(false); }
  }
  return <section className="panel"><h2>블로그·읽기 확장</h2><p>AI 블로그 이웃 소통 자동화</p><button disabled={busy} onClick={refresh}>{busy ? '확인 중…' : '현재 연결 확인'}</button><div role="status">{message}</div>{devices === null ? <p>버튼을 눌러 현재 연결을 확인하세요.</p> : devices.length === 0 ? <p>연결된 기기가 없습니다.</p> : devices.map(device => <dl className="facts" key={device.id}><dt>블로그</dt><dd>{device.blog_id}</dd><dt>기기</dt><dd>{device.device_name}</dd><dt>상태</dt><dd>{device.revoked_at ? '연결 해제됨' : `연결됨 · 기한 ${date(device.expires_at)}`}</dd></dl>)}<Link className="secondary-link" href="/reader">설치·연결·받은 글 확인 ↗</Link><div className="divider" /><h2>플랫폼별 모델 확인</h2><ModelPicker value={model} onChange={setModel} /><p>이곳은 모델 목록을 확인하는 화면입니다. 선택은 이 화면에만 적용되며, 실제 분석 모델은 내 블로그·후보 비교에서 각각 고릅니다.</p><a className="primary" href="https://www.buylife.xyz/api-settings" target="_blank" rel="noopener noreferrer">회원 API 연동 설정 ↗</a><small>키 등록 여부를 확인했다고 표시하지 않으며, 키 값을 이 화면에 가져오지 않습니다.</small></section>;
}
