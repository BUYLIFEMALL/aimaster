import fs from "fs";

const file = "app/(main)/programs/page.tsx";
let content = fs.readFileSync(file, "utf8");

const banner = `
      {/* 가이드 센터 안내 배너 */}
      <div className="mt-20 glass-card rounded-2xl p-8 border border-gold/30 bg-gradient-to-r from-gold/5 via-surface/40 to-surface/80 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-semibold">
            <BookOpen size={13} />
            초보자를 위한 무료 가이드
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-white">
            API 발급 및 플랫폼 연동이 처음이신가요?
          </h2>
          <p className="text-subtext text-sm">
            OpenAI, Google Gemini, Anthropic Claude, Meta Threads, YouTube Data API 등 서비스별 발급 순서를 상세히 안내해 드립니다.
          </p>
        </div>
        <Link
          href="/guides"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl btn-gold text-sm font-bold shrink-0 hover:scale-105 transition-all shadow-md"
        >
          이용 가이드 보러가기
          <ArrowRight size={16} />
        </Link>
      </div>`;

if (!content.includes("초보자를 위한 무료 가이드")) {
  if (content.includes("    </div>\r\n  );\r\n}")) {
    content = content.replace("    </div>\r\n  );\r\n}", banner.replace(/\n/g, "\r\n") + "\r\n    </div>\r\n  );\r\n}");
  } else {
    content = content.replace("    </div>\n  );\n}", banner + "\n    </div>\n  );\n}");
  }
  fs.writeFileSync(file, content, "utf8");
  console.log("Successfully updated programs/page.tsx with guide banner!");
} else {
  console.log("Already has banner.");
}
