"use client";

import { useEffect, useState } from "react";
import extensionManifest from "../../extension/manifest.json";

const EXTENSION_VERSION = extensionManifest.version;
const EXTENSION_ARCHIVE = `/downloads/naver-blog-seo-studio-extension-v${EXTENSION_VERSION}.zip`;
const INSTALLED_VERSION_KEY = "naver-blog-seo-studio-extension-version";
const DOWNLOAD_MARKER_KEY = "naver-blog-seo-studio-extension-downloaded";

export default function ExtensionDownloadCard() {
  const [downloaded, setDownloaded] = useState(false);
  const [installedVersion, setInstalledVersion] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDownloaded(window.localStorage.getItem(DOWNLOAD_MARKER_KEY) === EXTENSION_VERSION);
      setInstalledVersion(window.localStorage.getItem(INSTALLED_VERSION_KEY));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const isUpdate = installedVersion !== null && installedVersion !== EXTENSION_VERSION;

  function markDownloadStarted() {
    window.localStorage.setItem(DOWNLOAD_MARKER_KEY, EXTENSION_VERSION);
    setDownloaded(true);
  }

  function markInstalled() {
    window.localStorage.setItem(INSTALLED_VERSION_KEY, EXTENSION_VERSION);
    setInstalledVersion(EXTENSION_VERSION);
  }

  return (
    <section className="extension-download-card" aria-labelledby="extension-download-title">
      <div className="extension-download-copy">
        <div className="extension-download-kicker">Chrome Extension · v{EXTENSION_VERSION}</div>
        <h3 id="extension-download-title">SEO Studio 확장 프로그램</h3>
        <p>네이버 블로그 편집기에 제목과 본문을 실제 입력 방식으로 전송합니다.</p>
      </div>
      <div className="extension-status" role="status" aria-live="polite">
        <span className={`extension-status-dot ${installedVersion === EXTENSION_VERSION ? "ready" : ""}`} />
        {installedVersion === EXTENSION_VERSION ? `설치 완료 · v${EXTENSION_VERSION}` : isUpdate ? `업데이트 필요 · 현재 v${installedVersion}` : "아직 설치되지 않음"}
      </div>
      {isUpdate && <p className="extension-update-note">새 버전이 준비되었습니다. 아래 ZIP을 다시 내려받아 확장 프로그램 관리 화면에서 새로고침하세요.</p>}
      <a className="extension-download-button" href={EXTENSION_ARCHIVE} download onClick={markDownloadStarted}>
        {isUpdate ? "최신 버전 다시 다운로드" : "확장 프로그램 다운로드"}
      </a>
      {downloaded && installedVersion !== EXTENSION_VERSION && (
        <button type="button" className="extension-installed-button" onClick={markInstalled}>
          설치를 완료했어요
        </button>
      )}
      <ol className="extension-download-steps">
        <li>ZIP 파일을 원하는 폴더에 내려받아 압축을 해제합니다.</li>
        <li><code>chrome://extensions</code>에서 개발자 모드를 켭니다.</li>
        <li><strong>압축해제된 확장 프로그램을 로드</strong>를 눌러 압축 해제 폴더를 선택합니다.</li>
        <li>기존 설치본이 있으면 확장 프로그램 카드의 새로고침 버튼을 누릅니다.</li>
      </ol>
      <p className="extension-download-note">설치 완료 버튼은 이 브라우저의 상태만 기록합니다. 실제 입력은 네이버 글쓰기 화면을 연 뒤 확장 프로그램에서 실행하세요.</p>
    </section>
  );
}
