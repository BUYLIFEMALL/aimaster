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
export function DriveSettings() {
  const drive = useDrive();
  const [value, setValue] = useState("");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  useEffect(() => { setValue(drive.clientId); }, [drive.clientId]);
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); setCopied("복사했습니다."); } catch { setCopied("복사하지 못했습니다. 직접 선택해 복사해 주세요."); } };

  return <section className="card stack" aria-labelledby="drive-heading">
    <h2 id="drive-heading">Google Drive 연결</h2>
    <p className="muted">문서를 <strong>내 Google Drive</strong>에 올리고 가져옵니다. 운영자의 앱이 아니라 <strong>내가 만든 Google Cloud 앱(OAuth Client ID)</strong>과 내 Google 계정으로만 연결하며, 이 프로그램은 앱이 만든 파일만 볼 수 있는 ‘Drive 파일 접근(drive.file)’ 권한만 요청합니다. 접근 토큰은 이 브라우저 메모리에만 있고 저장되지 않습니다.</p>

    <ol className="manual-list">
      <li><strong>Google Cloud 프로젝트에서 준비</strong><p>① Google Drive API 사용 설정 ② OAuth 동의 화면 만들기(테스트 상태면 내 Google 계정을 ‘테스트 사용자’로 추가) — 주소 오류(origin_mismatch)가 나오면 아래 2번 원본 주소가 빠진 것입니다 ③ 사용자 인증 정보 → OAuth 클라이언트 ID → 유형 <em>웹 애플리케이션</em> 만들기.</p></li>
      <li><strong>승인된 JavaScript 원본에 아래 주소 추가</strong><p><code>{origin || "…"}</code> <button type="button" onClick={() => copy(origin)}>주소 복사</button> {copied ? <small role="status">{copied}</small> : null}</p></li>
      <li><strong>발급된 Client ID를 아래에 저장</strong><p>Client Secret은 필요하지 않습니다. 입력하지 마세요.</p></li>
    </ol>

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
    </div>
    {drive.error ? <p className="error" role="alert">{drive.error}</p> : null}

    <div className="notice">
      <strong>📖 연동 매뉴얼</strong>
      <p>화면 순서대로 따라 할 수 있는 단계별 안내와 오류별 해결 방법이 있습니다. 모든 회원이 <strong>본인 Google Cloud 앱</strong>으로 연결하며, 운영자 앱은 사용하지 않습니다.</p>
      <GuideLinkButton/>
      <ul>
        <li>연결을 끊어도 Drive의 파일은 지워지지 않습니다. 이 프로그램은 Drive 파일을 삭제하지 않습니다.</li>
        <li>Google 계정 설정(myaccount.google.com/permissions)에서도 언제든 접근 권한을 취소할 수 있습니다.</li>
        <li>Drive의 ‘마크다운 문서 자동화’ 폴더 아래에만 올리며, 다른 폴더나 내 Drive 최상위에는 올리지 않습니다.</li>
      </ul>
    </div>
  </section>;
}
