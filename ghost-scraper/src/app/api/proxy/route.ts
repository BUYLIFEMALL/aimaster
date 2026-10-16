import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { safeFetch, BlockedUrlError } from "@/lib/safeFetch";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return new NextResponse(access.error, { status: access.status });
  }

  const urlParam = req.nextUrl.searchParams.get("url");
  if (!urlParam) {
    return new NextResponse("URL 파라미터가 누락되었습니다.", { status: 400 });
  }

  let targetUrl = urlParam.trim();
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    targetUrl = "https://" + targetUrl;
  }

  try {
    const originUrl = new URL(targetUrl);
    const { response } = await safeFetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 WebsiteScraper/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return new NextResponse(`프록시 대상 사이트 응답 오류: HTTP ${response.status}`, {
        status: response.status,
      });
    }

    let html = await response.text();

    // 1. Base 태그 주입 (상대 경로 리소스 자동 해결)
    const baseTag = `<base href="${originUrl.origin}/">`;
    if (html.includes("<head>")) {
      html = html.replace("<head>", `<head>${baseTag}`);
    } else if (html.includes("<html>")) {
      html = html.replace("<html>", `<html><head>${baseTag}</head>`);
    }

    // 2. 하이라이트 CSS 및 인터셉트 스크립트
    const injectedScript = `
      <style>
        .ais-selector-highlight {
          outline: 2px solid #6366f1 !important;
          outline-offset: -2px !important;
          background-color: rgba(99, 102, 241, 0.15) !important;
          cursor: crosshair !important;
          transition: outline 0.1s ease !important;
        }
        .ais-selector-label {
          position: fixed !important;
          z-index: 2147483647 !important;
          background: #0f172a !important;
          color: #f8fafc !important;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          pointer-events: none !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2) !important;
        }
      </style>
      <script>
        (function() {
          let lastEl = null;
          const label = document.createElement('div');
          label.className = 'ais-selector-label';
          label.style.display = 'none';
          document.body.appendChild(label);

          document.addEventListener('mouseover', (e) => {
            let target = e.target;
            if (e.shiftKey && target.parentElement && target.parentElement !== document.body) {
              target = target.parentElement;
            }

            if (lastEl && lastEl !== target) {
              lastEl.classList.remove('ais-selector-highlight');
            }
            target.classList.add('ais-selector-highlight');
            lastEl = target;

            const rect = target.getBoundingClientRect();
            label.style.display = 'block';
            label.style.top = Math.max(4, rect.top - 24) + 'px';
            label.style.left = Math.max(4, rect.left) + 'px';
            const tag = target.tagName ? target.tagName.toLowerCase() : '';
            const cls = target.className && typeof target.className === 'string' ? '.' + target.className.split(' ').filter(Boolean).slice(0, 2).join('.') : '';
            label.textContent = (e.shiftKey ? 'PARENT: ' : '') + tag + cls;
          });

          document.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            let target = e.target;
            
            // Ctrl/Cmd + 클릭: 해당 링크로 이동
            if (e.ctrlKey || e.metaKey) {
              const link = target.closest('a');
              if (link && link.href) {
                window.parent.postMessage({
                  type: 'AIS_NAVIGATE_REQUEST',
                  url: link.href
                }, '*');
                return;
              }
            }

            if (e.shiftKey && target.parentElement && target.parentElement !== document.body) {
              target = target.parentElement;
            }

            const data = {
              type: 'AIS_SECTOR_SELECTED',
              tagName: target.tagName,
              className: target.className && typeof target.className === 'string' ? target.className : '',
              id: target.id || '',
              text: (target.innerText || target.textContent || '').trim().slice(0, 500),
              html: (target.outerHTML || '').slice(0, 3000)
            };
            
            window.parent.postMessage(data, '*');
          }, true);

          // 기본 모든 링크 클릭 방지
          document.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', e => e.preventDefault());
          });
        })();
      </script>
    `;

    if (html.includes("</body>")) {
      html = html.replace("</body>", `${injectedScript}</body>`);
    } else {
      html += injectedScript;
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // 남의 사이트 HTML·스크립트를 우리 도메인 권한과 분리한다(쿠키·localStorage·API 접근 차단).
        // 주입한 선택 스크립트와 postMessage는 sandbox 안에서도 동작한다.
        "Content-Security-Policy": "sandbox allow-scripts",
        "X-Frame-Options": "SAMEORIGIN",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    if (err instanceof BlockedUrlError) {
      return new NextResponse(err.message, { status: 400 });
    }
    console.error("Proxy error:", err);
    return new NextResponse(`프록시 요청 실패: ${err.message}`, { status: 500 });
  }
}
