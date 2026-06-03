/**
 * carousel-lite renderer (theme-driven)
 * Reads theme.json (the look, built once during setup) + slides.json (the content)
 * and renders each slide to a 1080x1440 PNG.
 *
 * Usage:
 *   npm install
 *   node build.js                 # reads ./theme.json + ./slides.json -> ./out/*.png
 *   node build.js my-slides.json  # custom content file
 *   node build.js --sample        # render 3 built-in sample slides (for previewing a theme)
 *
 * theme.json is OPTIONAL. If absent, the default look is used. Build it during
 * setup (see SKILL.md) so the carousels match the user's taste.
 */

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const DEFAULT_THEME = {
  name: "Default",
  fonts: {
    heading: { family: "Space Grotesk", weights: "500;700", css: "'Space Grotesk', sans-serif" },
    body: { family: "Space Grotesk", weights: "500;700", css: "'Space Grotesk', sans-serif" },
    mono: { family: "JetBrains Mono", weights: "500;700", css: "'JetBrains Mono', monospace" },
  },
  colors: {
    bg: "#F4EFE6",
    bgEdge: "#EBE3D4",
    ink: "#2A1F14",
    inkDim: "rgba(42,31,20,0.62)",
    inkMute: "rgba(42,31,20,0.40)",
    accent: "#C15F3C",
    accentBright: "#E8945A",
    term: "#241D16",
    termText: "#EAD9C5",
  },
  headline: { case: "upper", weight: 700, size: 96, letterSpacing: -2 },
  useTerminal: true,
  radius: 18,
};

function deepMerge(base, over) {
  if (!over) return base;
  const out = Array.isArray(base) ? base.slice() : { ...base };
  for (const k of Object.keys(over)) {
    if (
      over[k] &&
      typeof over[k] === "object" &&
      !Array.isArray(over[k]) &&
      base[k] &&
      typeof base[k] === "object"
    ) {
      out[k] = deepMerge(base[k], over[k]);
    } else {
      out[k] = over[k];
    }
  }
  return out;
}

function loadTheme() {
  const p = path.resolve(process.cwd(), "theme.json");
  if (!fs.existsSync(p)) return DEFAULT_THEME;
  try {
    return deepMerge(DEFAULT_THEME, JSON.parse(fs.readFileSync(p, "utf8")));
  } catch (e) {
    console.warn("theme.json could not be parsed, using default look.", e.message);
    return DEFAULT_THEME;
  }
}

function fontLinks(theme) {
  const seen = new Set();
  const links = [];
  for (const role of ["heading", "body", "mono"]) {
    const f = theme.fonts[role];
    if (!f || !f.family) continue;
    const key = `${f.family}:${f.weights}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const fam = f.family.replace(/\s+/g, "+");
    links.push(
      `<link href="https://fonts.googleapis.com/css2?family=${fam}:wght@${
        f.weights || "400;700"
      }&display=swap" rel="stylesheet">`
    );
  }
  return links.join("\n");
}

function esc(s) {
  return String(s == null ? "" : s);
}

function accentize(text, accent) {
  return esc(text).replace(
    /\[\[(.+?)\]\]/g,
    `<span style="color:${accent};">$1</span>`
  );
}

function terminalBlock(lines, theme) {
  if (!theme.useTerminal || !lines || !lines.length) return "";
  const rows = lines.map((l) => `<div class="t-line">${esc(l)}</div>`).join("\n");
  return `<div class="terminal">${rows}</div>`;
}

function shell(inner, theme) {
  const c = theme.colors;
  const h = theme.headline;
  const hCase = h.case === "upper" ? "uppercase" : "none";
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fontLinks(theme)}
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1080px; height: 1440px; }
  body {
    font-family: ${theme.fonts.body.css};
    background: radial-gradient(120% 90% at 50% 0%, ${c.bg} 0%, ${c.bgEdge} 100%);
    color: ${c.ink};
    position: relative;
    overflow: hidden;
  }
  .frame { position: absolute; inset: 0; padding: 70px 64px; display: flex; flex-direction: column; }
  .top { display: flex; justify-content: space-between; align-items: center;
    font-family: ${theme.fonts.mono.css}; font-size: 18px; font-weight: 700;
    letter-spacing: 2px; color: ${c.inkMute}; text-transform: uppercase; }
  .step { margin-top: 70px; font-family: ${theme.fonts.mono.css}; font-size: 30px;
    font-weight: 700; letter-spacing: 6px; color: ${c.accent}; text-transform: uppercase; }
  .headline { margin-top: 26px; font-family: ${theme.fonts.heading.css};
    font-weight: ${h.weight}; font-size: ${h.size}px; line-height: 0.98;
    letter-spacing: ${h.letterSpacing}px; text-transform: ${hCase}; }
  .subline { margin-top: 30px; font-family: ${theme.fonts.body.css}; font-size: 38px;
    font-weight: 500; line-height: 1.32; color: ${c.inkDim}; max-width: 880px; }
  .spacer { flex: 1; }
  .terminal { background: ${c.term}; color: ${c.termText}; border-radius: ${theme.radius}px;
    padding: 34px 38px; font-family: ${theme.fonts.mono.css}; font-size: 28px;
    line-height: 1.85; box-shadow: 0 24px 60px rgba(0,0,0,0.18); }
  .t-line { white-space: pre-wrap; }
  .bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 40px;
    font-family: ${theme.fonts.mono.css}; font-size: 20px; font-weight: 700; color: ${c.inkMute}; }
  .swipe { color: ${c.accent}; }
  .cta { position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center; padding: 0 90px; }
  .cta .kicker { font-family: ${theme.fonts.mono.css}; font-size: 22px; font-weight: 700;
    letter-spacing: 6px; color: ${c.accent}; text-transform: uppercase; margin-bottom: 34px; }
  .cta .headline { font-size: ${Math.round(h.size * 1.25)}px; margin-top: 0; }
  .cta .subline { margin: 30px auto 56px; text-align: center; }
  .pill { display: inline-block; padding: 26px 70px; border-radius: ${theme.radius}px;
    border: 3px solid ${c.accent}66; background: ${c.accent}12;
    font-family: ${theme.fonts.heading.css}; font-weight: 700; font-size: 56px;
    letter-spacing: 10px; color: ${c.accent}; }
</style></head><body>${inner}</body></html>`;
}

function renderSlide(s, theme) {
  const type = s.type || "step";
  const c = theme.colors;
  const top = `<div class="top"><span>${esc(s.handle || "")}</span><span>${esc(
    s.slideNum || ""
  )}</span></div>`;

  if (type === "cta") {
    const pill = s.keyword ? `<div class="pill">${esc(s.keyword)}</div>` : "";
    return shell(
      `<div class="cta">
        <div class="kicker">${esc(s.stepLabel || "FREE")}</div>
        <h1 class="headline">${accentize(s.headline, c.accent)}</h1>
        <p class="subline">${esc(s.subline || "")}</p>
        ${pill}
      </div>`,
      theme
    );
  }

  const step = s.stepLabel ? `<div class="step">${esc(s.stepLabel)}</div>` : "";
  const term = terminalBlock(s.terminal, theme);
  return shell(
    `<div class="frame">
      ${top}
      ${step}
      <h1 class="headline">${accentize(s.headline, c.accent)}</h1>
      <p class="subline">${esc(s.subline || "")}</p>
      <div class="spacer"></div>
      ${term}
      <div class="bottom"><span>${esc(s.handle || "")}</span><span class="swipe">${
      type === "hook" ? "swipe →" : ""
    }</span></div>
    </div>`,
    theme
  );
}

const SAMPLE_SLIDES = [
  {
    type: "hook",
    slideNum: "01 / 03",
    stepLabel: "FREE GUIDE",
    headline: "5 AI tools every [[beginner]] needs",
    subline: "No coding. No jargon. Just the tools that actually move the needle.",
    terminal: ["$ save this post", "> you'll want it later"],
    handle: "@yourhandle",
  },
  {
    type: "step",
    slideNum: "02 / 03",
    stepLabel: "TOOL 01",
    headline: "The one that [[writes for you]]",
    subline: "Drafts emails, captions, and posts in seconds so you stop staring at a blank page.",
    terminal: ["$ open it", "> paste your idea", "ok clean draft"],
    handle: "@yourhandle",
  },
  {
    type: "cta",
    stepLabel: "FREE",
    headline: "Want the [[full list?]]",
    subline: "Comment below and I'll send it to you.",
    keyword: "TOOLS",
  },
];

(async () => {
  const theme = loadTheme();
  const arg = process.argv[2];

  let slides;
  if (arg === "--sample") {
    slides = SAMPLE_SLIDES;
  } else {
    const input = arg || "slides.json";
    const inputPath = path.resolve(process.cwd(), input);
    if (!fs.existsSync(inputPath)) {
      console.error(`No input file at ${inputPath}. Create slides.json first, or run: node build.js --sample`);
      process.exit(1);
    }
    slides = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  }

  if (!Array.isArray(slides) || !slides.length) {
    console.error("slides must be a non-empty array.");
    process.exit(1);
  }

  console.log(`Theme: ${theme.name} | ${theme.fonts.heading.family} / ${theme.fonts.mono.family}`);

  const outDir = path.resolve(process.cwd(), "out");
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  await page.setViewport({ width: 1080, height: 1440, deviceScaleFactor: 1 });

  for (let i = 0; i < slides.length; i++) {
    await page.setContent(renderSlide(slides[i], theme), { waitUntil: "load", timeout: 60000 });
    // wait for web fonts to actually finish loading before screenshotting
    try {
      await page.evaluate(() => document.fonts.ready);
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 400));
    const num = String(i + 1).padStart(2, "0");
    const out = path.join(outDir, `slide-${num}.png`);
    await page.screenshot({ path: out, type: "png" });
    console.log("rendered", out);
  }

  await browser.close();
  console.log(`\nDone. ${slides.length} slides in ./out`);
})();
