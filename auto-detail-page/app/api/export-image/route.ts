import { NextRequest, NextResponse } from "next/server";
import { getPage } from "@/lib/store";
import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: NextRequest) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
    }

    const supabase = await createClient();
    const html = await getPage(supabase, access.user.id, id);
    if (!html) {
      return NextResponse.json({ error: "페이지를 찾을 수 없습니다." }, { status: 404 });
    }

    let browser;

    if (process.env.NODE_ENV === "production") {
      // Vercel 환경: @sparticuz/chromium-min 사용
      const chromium = await import("@sparticuz/chromium-min");
      const puppeteerCore = await import("puppeteer-core");

      browser = await puppeteerCore.default.launch({
        args: chromium.default.args,
        executablePath: await chromium.default.executablePath(
          "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar"
        ),
        headless: true,
      });
    } else {
      // 로컬 환경: puppeteer-core + 설치된 Chrome 사용
      const puppeteerCore = await import("puppeteer-core");

      // Windows Chrome 경로
      const executablePath =
        process.env.CHROME_PATH ||
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

      browser = await puppeteerCore.default.launch({
        executablePath,
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      await page.setViewport({ width: 600, height: 800, deviceScaleFactor: 2 });

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const fullHeight = await page.evaluate(
        () => document.documentElement.scrollHeight
      );
      await page.setViewport({ width: 600, height: fullHeight, deviceScaleFactor: 2 });

      const buffer = await page.screenshot({
        fullPage: true,
        type: "png",
      });

      const filename = encodeURIComponent("상세페이지.png");
      return new NextResponse(Buffer.from(buffer), {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="detail-page.png"; filename*=UTF-8''${filename}`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("Export image error:", error);
    return NextResponse.json(
      { error: "이미지 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
