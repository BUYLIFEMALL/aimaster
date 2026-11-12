// Member PCs drift from the server clock. The database compares snapshot times with its own clock,
// so every time the extension sends is shifted by the offset measured from the server's own reply.
// The server still enforces the same freshness, nonce and deadline checks.
export function createServerClock(local=Date.now,offset=0){
 const clock={
  get offset(){return offset;},
  note(v){if(Number.isSafeInteger(v?.serverNow))offset=v.serverNow-local();return v;},
  now:()=>local()+offset,
  fix:s=>s&&typeof s==='object'&&Number.isSafeInteger(s.checkedAt)?{...s,checkedAt:s.checkedAt+offset}:s,
  toLocal:iso=>{const t=Date.parse(iso);return Number.isFinite(t)?new Date(t-offset).toISOString():iso;},
 };
 return clock;
}
