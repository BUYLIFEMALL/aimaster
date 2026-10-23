"use client";

import { useCallback, useEffect, useState } from "react";
import extensionManifest from "../../extension/manifest.json";
import { askExtension } from "@/lib/extensionBridge";

const EXTENSION_VERSION = extensionManifest.version_name ?? `v${extensionManifest.version}`;
const EXTENSION_ARCHIVE = `/downloads/naver-blog-seo-studio-extension-latest.zip`;
const DOWNLOAD_MARKER_KEY = "naver-blog-seo-studio-extension-downloaded";

// 2026-10-23: 회원이 누른 「설치 완료」 기록 대신, 이 브라우저의 확장(web-bridge.js)에 실제 버전을 물어 표시한다.
export default function ExtensionDownloadCard() {
  const [downloaded, setDownloaded] = useState(false);
  const [installedVersion, setInstalledVersion] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const detect = useCallback(async () => {
    setChecking(true);
    const ping = await askExtension<{ ok?: boolean; version?: string }>("ping", 1500);
    setInstalledVersion(ping?.ok ? String(ping.version || "버전 확인 불가") : null);
    setChecking(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setDownloaded(window.localStorage.getItem(DOWNLOAD_MARKER_KEY) === EXTENSION_VERSION); } catch { /* 저장소를 못 써도 표시만 달라짐 */ }
      void detect();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [detect]);

  const isLatest = installedVersion === EXTENSION_VERSION;
  const isUpdate = installedVersion !== null && !isLatest;

  function markDownloadStarted() {
    try { window.localStorage.setItem(DOWNLOAD_MARKER_KEY, EXTENSION_VERSION); } catch { /* 무시 */ }
    setDownloaded(true);
  }

  const statusText = checking ? "확장 프로그램 확인 중..."
    : isLatest ? `설치됨 · ${EXTENSION_VERSION} (최신)`
    : isUpdate ? `설치됨 · 현재 ${installedVersion} → 최신 ${EXTENSION_VERSION}로 업데이트 필요`
    : downloaded ? "다운로드 완료 · 아직 설치 전이거나 확장이 꺼져 있습니다"
    : "설치 전 · ZIP 다운로드 필요";

  return (
    <section className="extension-download-card" aria-labelledby="extension-download-title">
      <div className="extension-download-copy">
        <div className="extension-download-kicker">Chrome Extension · {EXTENSION_VERSION}</div>
        <h3 id="extension-download-title">SEO Studio 확장 프로그램</h3>
        <p>네이버 블로그 편집기에 제목과 본문을 실제 입력 방식으로 전송합니다.</p>
      </div>
      <div className="extension-status" role="status" aria-live="polite">
        <span className={`extension-status-dot ${isLatest ? "ready" : isUpdate || downloaded ? "progress" : ""}`} />
        {statusText}
        <button type="button" className="extension-recheck-button" onClick={detect} disabled={checking}>다시 확인</button>
      </div>
      {isUpdate && <p className="extension-update-note">새 버전이 준비되었습니다. 아래 ZIP을 다시 내려받아 확장 프로그램 관리 화면에서 새로고침하세요.</p>}
      <a className="extension-download-button" href={EXTENSION_ARCHIVE} download onClick={markDownloadStarted}>
        {isUpdate ? "최신 버전 다시 다운로드" : downloaded ? "ZIP 다시 다운로드" : "확장 프로그램 다운로드"}
      </a>
      {downloaded && installedVersion === null && !checking && (
        <div className="extension-install-progress"><strong>다운로드 완료 · 아직 확장이 보이지 않습니다.</strong><span>압축 해제 → <code>chrome://extensions</code>에서 개발자 모드 → 압축해제된 확장 프로그램을 로드한 뒤 이 화면을 새로고침하거나 「다시 확인」을 누르세요.</span></div>
      )}
      <ol className="extension-download-steps">
        <li>ZIP 파일을 원하는 폴더에 내려받아 압축을 해제합니다.</li>
        <li><code>chrome://extensions</code>에서 개발자 모드를 켭니다.</li>
        <li><strong>압축해제된 확장 프로그램을 로드</strong>를 눌러 압축 해제 폴더를 선택합니다.</li>
        <li>기존 설치본이 있으면 확장 프로그램 카드의 새로고침 버튼을 누릅니다.</li>
      </ol>
      <p className="extension-download-note">Chrome 보안 정책상 웹사이트는 확장을 자동으로 설치할 수 없습니다. 설치 상태는 이 브라우저에 설치된 확장에 직접 물어 표시합니다(다른 브라우저·PC의 설치 여부는 알 수 없습니다). 실제 입력은 네이버 글쓰기 화면을 연 뒤 확장 프로그램에서 실행하세요.</p>
    </section>
  );
}
