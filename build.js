/**
 * carousel-lite renderer
 * Reads slides.json and renders each slide to a 1080x1440 PNG.
 *
 * Usage:
 *   npm install
 *   node build.js                 # reads ./slides.json, writes ./out/*.png
 *   node build.js my-slides.json  # custom input file
 *
 * slides.json schema (array of slide objects):
 *   {
 *     "type": "hook" | "step" | "cta",   // default "step"
 *     "slideNum": "01 / 06",              // optional, shown top-right
 *     "stepLabel": "STEP 01",            // small label above headline
 *     "headline": "Big bold line with an [[accent]] word",  // [[ ]] = terracotta
 *     "subline": "Supporting sentence under the headline.",
 *     "terminal": ["$ run this", "> doing the thing", "ok done"], // optional code lines
 *     "handle": "@yourhandle"            // optional, shown bottom-left
 *   }
 *
 * For type "cta": headline + subline are centered, and `keyword` renders a pill.
 */

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const COLORS = {
  bg: "#F4EFE6",
  bgEdge: "#EBE3D4",
  ink: "#2A1F14",
  inkDim: "rgba(42,31,20,0.62)",
  inkMute: "rgba(42,31,20,0.40)",
  accent: "#C15F3C",
  accentBright: "#E8945A",
  term: "#241D16",
  termText: "#EAD9C5",
};

function esc(s) {
  return String(s == null ? "" : s);
}

// Convert [[word]] markers into accent spans.
function accentize(text) {
  return esc(text).replace(
    /\[\[(.+?)\]\]/g,
    `<span style="color:${COLORS.accent};">$1</span>`
  );
}

function terminalBlock(lines) {
  if (!lines || !lines.length) return "";
  const rows = lines
    .map((l) => `<div class="t-line">${esc(l)}</div>`)
    .join("\n");
  return `<div class="terminal">${rows}</div>`;
}

function shell(inner, extraBodyClass = "") {
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1080px; height: 1440px; }
  body {
    font-family: 'Space Grotesk', sans-serif;
    background:
      radial-gradient(120% 90% at 50% 0%, ${COLORS.bg} 0%, ${COLORS.bgEdge} 100%);
    color: ${COLORS.ink};
    position: relative;
    overflow: hidden;
  }
  .frame { position: absolute; inset: 0; padding: 70px 64px; display: flex; flex-direction: column; }
  .top { display: flex; justify-content: space-between; align-items: center;
    font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 700;
    letter-spacing: 2px; color: ${COLORS.inkMute}; text-transform: uppercase; }
  .step { margin-top: 70px; font-family: 'JetBrains Mono', monospace; font-size: 30px;
    font-weight: 700; letter-spacing: 6px; color: ${COLORS.accent}; text-transform: uppercase; }
  .headline { margin-top: 26px; font-weight: 700; font-size: 96px; line-height: 0.98;
    letter-spacing: -2px; text-transform: uppercase; }
  .subline { margin-top: 30px; font-size: 38px; font-weight: 500; line-height: 1.32;
    color: ${COLORS.inkDim}; max-width: 880px; }
  .spacer { flex: 1; }
  .terminal { background: ${COLORS.term}; color: ${COLORS.termText}; border-radius: 18px;
    padding: 34px 38px; font-family: 'JetBrains Mono', monospace; font-size: 28px;
    line-height: 1.85; box-shadow: 0 24px 60px rgba(42,31,20,0.22); }
  .t-line { white-space: pre-wrap; }
  .bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 40px;
    font-family: 'JetBrains Mono', monospace; font-size: 20px; font-weight: 700;
    color: ${COLORS.inkMute}; }
  .swipe { color: ${COLORS.accent}; }
  /* CTA */
  .cta { position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center; padding: 0 90px; }
  .cta .kicker { font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 700;
    letter-spacing: 6px; color: ${COLORS.accent}; text-transform: uppercase; margin-bottom: 34px; }
  .cta .headline { font-size: 120px; margin-top: 0; }
  .cta .subline { margin: 30px auto 56px; text-align: center; }
  .pill { display: inline-block; padding: 26px 70px; border-radius: 18px;
    border: 3px solid rgba(193,95,60,0.45); background: rgba(193,95,60,0.07);
    font-weight: 700; font-size: 56px; letter-spacing: 10px; color: ${COLORS.accent}; }
  .${extraBodyClass} {}
</style></head><body>${inner}</body></html>`;
}

function renderSlide(s) {
  const type = s.type || "step";
  const top = `<div class="top"><span>${esc(s.handle || "")}</span><span>${esc(
    s.slideNum || ""
  )}</span></div>`;

  if (type === "cta") {
    const pill = s.keyword
      ? `<div class="pill">${esc(s.keyword)}</div>`
      : "";
    return shell(`<div class="cta">
      <div class="kicker">${esc(s.stepLabel || "FREE")}</div>
      <h1 class="headline">${accentize(s.headline)}</h1>
      <p class="subline">${esc(s.subline || "")}</p>
      ${pill}
    </div>`);
  }

  const step = s.stepLabel ? `<div class="step">${esc(s.stepLabel)}</div>` : "";
  const term = terminalBlock(s.terminal);
  return shell(`<div class="frame">
    ${top}
    ${step}
    <h1 class="headline">${accentize(s.headline)}</h1>
    <p class="subline">${esc(s.subline || "")}</p>
    <div class="spacer"></div>
    ${term}
    <div class="bottom"><span>${esc(s.handle || "")}</span><span class="swipe">${
    type === "hook" ? "swipe →" : ""
  }</span></div>
  </div>`);
}

(async () => {
  const input = process.argv[2] || "slides.json";
  const inputPath = path.resolve(process.cwd(), input);
  if (!fs.existsSync(inputPath)) {
    console.error(`No input file at ${inputPath}. Create slides.json first.`);
    process.exit(1);
  }
  const slides = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  if (!Array.isArray(slides) || !slides.length) {
    console.error("slides.json must be a non-empty array.");
    process.exit(1);
  }

  const outDir = path.resolve(process.cwd(), "out");
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1440, deviceScaleFactor: 1 });

  for (let i = 0; i < slides.length; i++) {
    const html = renderSlide(slides[i]);
    await page.setContent(html, { waitUntil: "networkidle0" });
    // give web fonts a beat to paint
    await new Promise((r) => setTimeout(r, 350));
    const num = String(i + 1).padStart(2, "0");
    const out = path.join(outDir, `slide-${num}.png`);
    await page.screenshot({ path: out, type: "png" });
    console.log("rendered", out);
  }

  await browser.close();
  console.log(`\nDone. ${slides.length} slides in ./out`);
})();
