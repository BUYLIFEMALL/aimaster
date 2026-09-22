import extensionManifest from "../../extension/manifest.json";

const EXTENSION_VERSION = extensionManifest.version;
const EXTENSION_ARCHIVE = `/downloads/naver-blog-seo-studio-extension-v${EXTENSION_VERSION}.zip`;

export default function ExtensionDownloadCard() {
  return (
    <section className="extension-download-card" aria-labelledby="extension-download-title">
      <div className="extension-download-copy">
        <div className="extension-download-kicker">Chrome Extension · v{EXTENSION_VERSION}</div>
        <h3 id="extension-download-title">SEO Studio 확장 프로그램</h3>
        <p>네이버 블로그 편집기에 제목과 본문을 실제 키보드 방식으로 입력합니다.</p>
      </div>
      <a className="extension-download-button" href={EXTENSION_ARCHIVE} download>
        확장 프로그램 다운로드
      </a>
      <ol className="extension-download-steps">
        <li>ZIP 파일을 원하는 폴더에 압축 해제합니다.</li>
        <li><code>chrome://extensions</code>에서 개발자 모드를 켭니다.</li>
        <li><strong>압축해제된 확장 프로그램을 로드</strong>를 눌러 압축 해제한 폴더를 선택합니다.</li>
        <li>업데이트 후에는 확장 관리 화면에서 새로고침합니다.</li>
      </ol>
      <p className="extension-download-note">Chrome 확장은 웹사이트 배포와 별도로 업데이트됩니다. 네이버 글쓰기 화면을 연 뒤 확장 프로그램을 실행하세요.</p>
    </section>
  );
}
