"use client";
import { useEffect, useState } from "react";
import { MAIN_SITE } from "@/lib/version";
import { useDrive } from "./DriveProvider";

const GUIDE_ID = "7d473e83-e9ce-4f68-ab52-92015a98148e"; // platform_guides: Google Drive 연동용 OAuth 클라이언트 만들기 (웹 애플리케이션·JavaScript 원본)

/** 연동 매뉴얼을 팝업창으로 연다(옆에 두고 따라 할 수 있게) */
function GuideLinkButton() {
  return <button type="button" onClick={() => window.open(`${MAIN_SITE}/guides/${GUIDE_ID}`, "platform-guide-popup", "width=720,height=860,scrollbars=yes,resizable=yes")}>📄 Drive 연동용 OAuth 클라이언트 만들기 매뉴얼</button>;
}

/** 회원 본인의 Google Cloud 앱(Client ID)을 등록하고 본인 계정에 연결한다. 운영자 앱·키는 사용하지 않는다 */
const STEPS = [
  "구글 클라우드(console.cloud.google.com)에 로그인하고 프로젝트를 만들었다",
  "그 프로젝트에서 Google Drive API를 ‘사용’으로 바꿨다",
  "OAuth 동의 화면(앱 이름·내 이메일)을 만들었다",
  "테스트 사용자에 내 이메일을 추가했다",
  "웹 애플리케이션 클라이언트를 만들고, ‘승인된 JavaScript 원본’에 아래 주소를 넣었다(리디렉션 URI는 비움)",
  "클라이언트 ID를 아래에 저장하고 ‘Google에 연결’에서 Drive 파일 접근을 허용했다",
] as const;
const CHECK_KEY = "md_drive_setup_checklist_v1";

export function DriveSettings() {
  const drive = useDrive();
  const [checked, setChecked] = useState<boolean[]>(STEPS.map(() => false));
  useEffect(() => { try { const v = JSON.parse(localStorage.getItem(CHECK_KEY) || "null"); if (Array.isArray(v) && v.length === STEPS.length) setChecked(v.map(Boolean)); } catch { /* 저장소 사용 불가 */ } }, []);
  const toggle = (i: number) => setChecked(prev => { const next = prev.map((v, k) => (k === i ? !v : v)); try { localStorage.setItem(CHECK_KEY, JSON.stringify(next)); } catch { /* 저장소 사용 불가 */ } return next; });
  const done = checked.filter(Boolean).length;
  const [value, setValue] = useState("");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  useEffect(() => { setValue(drive.clientId); }, [drive.clientId]);
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); setCopied("복사했습니다."); } catch { setCopied("복사하지 못했습니다. 직접 선택해 복사해 주세요."); } };

  return <section className="card stack" aria-labelledby="drive-heading">
    <h2 id="drive-heading">Google Drive 연결</h2>
    <p className="muted">문서를 <strong>내 Google Drive</strong>에 올리고 가져옵니다. 운영자의 앱이 아니라 <strong>내가 만든 Google Cloud 앱(OAuth Client ID)</strong>과 내 Google 계정으로만 연결하며, 이 프로그램은 앱이 만든 파일만 볼 수 있는 ‘Drive 파일 접근(drive.file)’ 권한만 요청합니다. 접근 토큰은 이 브라우저 메모리에만 있고 저장되지 않습니다.</p>

    <div className="notice start-box">
      <strong>처음이신가요? 먼저 이 안내를 열어 두고 따라 하세요.</strong>
      <p>구글 클라우드 화면이 처음이어도 괜찮습니다. 메뉴 이름과 입력값을 한 단계씩 자세히 적었고, 막히기 쉬운 곳과 오류별 해결 방법도 있습니다. 소요 시간은 약 10~15분이며 한 번만 하면 됩니다. 비용은 무료입니다.</p>
      <GuideLinkButton/>
    </div>

    <div className="stack">
      <h3>한눈에 보는 순서 <small className="muted">({done}/{STEPS.length} 완료 · 이 브라우저에만 표시됩니다)</small></h3>
      <ul className="check-list">
        {STEPS.map((text, i) => <li key={text}><label className="checkbox-label"><input type="checkbox" checked={checked[i]} onChange={() => toggle(i)} aria-label={`${i + 1}단계 완료`}/><span><strong>{i + 1}.</strong> {text}</span></label></li>)}
      </ul>
      <div>
        <strong>5번에 넣을 내 사이트 주소</strong>
        <p><code>{origin || "…"}</code> <button type="button" onClick={() => copy(origin)}>주소 복사</button> {copied ? <small role="status">{copied}</small> : null}</p>
        <small className="muted">맨 끝에 /를 붙이지 말고, https:// 부터 그대로 붙여 넣으세요. Client Secret(보안 비밀번호)은 필요하지 않으니 입력하지 마세요.</small>
      </div>
    </div>

    <form className="stack" onSubmit={e => { e.preventDefault(); void drive.saveClientId(value); }}>
      <label>Google Client ID<input aria-label="Google Client ID" value={value} onChange={e => setValue(e.target.value)} placeholder="123456789-abcdef.apps.googleusercontent.com" autoComplete="off" spellCheck={false} disabled={drive.busy || drive.connecting}/></label>
      <div className="actions">
        <button className="primary" type="submit" disabled={drive.busy || drive.connecting || !drive.loaded}>Client ID 저장</button>
        {drive.account
          ? <><button type="button" onClick={() => void drive.disconnect()} disabled={drive.busy}>연결 해제</button><button type="button" onClick={() => { if (window.confirm("이 기기에 저장된 Drive 연결 기록(어떤 문서가 어떤 Drive 파일과 연결되어 있는지)을 지울까요? Drive의 파일은 지워지지 않습니다.")) void drive.forget(); }} disabled={drive.busy}>이 기기의 연결 기록 지우기</button></>
          : <button type="button" className="download" onClick={() => void drive.connect()} disabled={!drive.clientId || drive.connecting || drive.busy}>{drive.connecting ? "연결 중…" : "Google에 연결"}</button>}
      </div>
    </form>

    <div role="status" aria-live="polite">
      {drive.account ? <p><strong>연결됨:</strong> {drive.account.email}{drive.account.name ? ` (${drive.account.name})` : ""}</p> : <p className="muted">연결되지 않았습니다.</p>}
      {drive.message ? <p>{drive.message}</p> : null}
      {drive.account ? <p className="muted"><small>이 화면의 연결은 설정이 맞는지 확인하는 용도입니다. 보안을 위해 다른 화면으로 이동하면 연결이 풀리니, 실제로 올릴 때는 <strong>4. 문서 보관함</strong>의 Google Drive 카드에서 다시 연결하세요.</small></p> : null}
    </div>
    {drive.error ? <p className="error" role="alert">{drive.error}</p> : null}

    <div className="notice">
      <strong>📖 연동 매뉴얼</strong>
      <p>모든 회원이 <strong>본인 Google Cloud 앱</strong>으로 연결하며, 운영자 앱은 사용하지 않습니다.</p>
      <GuideLinkButton/>
      <p><strong>자주 나는 오류</strong></p>
      <ul>
        <li><strong>origin_mismatch</strong> — 5번의 ‘승인된 JavaScript 원본’에 주소가 없거나 틀렸습니다(리디렉션 URI 칸이 아닙니다). 저장 후 몇 분 걸릴 수 있습니다.</li>
        <li><strong>액세스 차단됨 / access_denied</strong> — 4번 ‘테스트 사용자’에 내 이메일을 추가하지 않았습니다.</li>
        <li><strong>Drive API가 사용 설정되어 있지 않습니다</strong> — 2번을 클라이언트와 <em>같은 프로젝트</em>에서 했는지 확인하세요.</li>
        <li><strong>구글 창이 바로 닫힘</strong> — 팝업 차단을 허용하고 다시 시도하세요.</li>
      </ul>
      <ul>
        <li>연결을 끊어도 Drive의 파일은 지워지지 않습니다. 이 프로그램은 Drive 파일을 삭제하지 않습니다.</li>
        <li>Google 계정 설정(myaccount.google.com/permissions)에서도 언제든 접근 권한을 취소할 수 있습니다.</li>
        <li>Drive의 ‘마크다운 문서 자동화’ 폴더 아래에만 올리며, 다른 폴더나 내 Drive 최상위에는 올리지 않습니다.</li>
      </ul>
    </div>
  </section>;
}
