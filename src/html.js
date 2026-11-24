// Emit a HyperFrames composition (index.html): clips, overlays and GSAP animation.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FONTS = "https://fonts.googleapis.com/css2?family=Outfit:wght@500;700;800;900&family=Archivo+Black&family=Kaushan+Script&display=block";
const THEME = { accent: "#e63946", secondary: "#1d3557", highlight: "#ffd166", ink: "#1d1d1f" };

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function composition(cfg, tl, { hasMusic }) {
  const { width: W, height: H, fps: FPS } = cfg;
  const { DUR, shots, caps, time } = tl;
  const anim = [];
  const a = (sel, vars, at, from) =>
    anim.push(from ? `tl.fromTo(${JSON.stringify(sel)}, ${JSON.stringify(from)}, ${JSON.stringify(vars)}, ${at.toFixed(3)});`
      : `tl.to(${JSON.stringify(sel)}, ${JSON.stringify(vars)}, ${at.toFixed(3)});`);
  const el = (start, end, cls, id) => `id="${id}" class="clip ${cls}" data-start="${start.toFixed(2)}" data-duration="${(end - start).toFixed(2)}"`;
  let html = "";

  // Footage, with a slow push-in, plus an item/price tag where the segment has one.
  for (const s of shots) {
    html += `<video ${el(s.start, s.end, "shot", s.id)} data-track-index="0" src="media/${s.id}.mp4" muted playsinline></video>\n`;
    a(`#${s.id}`, { scale: 1.06, duration: s.end - s.start, ease: "none" }, s.start, { scale: 1.0 });
    if (s.tag) {
      const id = "tag_" + s.id;
      const style = s.tag.top != null ? ` style="top:${+s.tag.top}px"` : "";
      html += `<div ${el(s.start + 0.1, s.end, "tag", id)} data-track-index="4"${style}>` +
        (s.tag.item ? `<div class="tname" id="${id}n">${esc(s.tag.item)}</div>` : "") +
        (s.tag.price ? `<div class="tprice" id="${id}p">${esc(s.tag.price)}</div>` : "") + `</div>\n`;
      if (s.tag.item) a(`#${id}n`, { x: 0, opacity: 1, duration: 0.35, ease: "power3.out" }, s.start + 0.1, { x: -80, opacity: 0 });
      if (s.tag.price) a(`#${id}p`, { scale: 1, opacity: 1, rotation: -4, duration: 0.4, ease: "back.out(2)" }, s.start + 0.35, { scale: 1.8, opacity: 0, rotation: -4 });
    }
  }

  html += `<audio ${el(0, DUR, "", "voice")} data-track-index="5" src="media/vo.wav" data-volume="1"></audio>\n`;
  if (hasMusic) html += `<audio ${el(0, DUR, "", "music")} data-track-index="6" src="media/music.wav" data-volume="1"></audio>\n`;
  html += `<div ${el(0, DUR, "shade", "shade")} data-track-index="2"></div>\n`;

  // Brand bar at the top.
  if (cfg.brand) {
    const b = cfg.brand, s = time(b.from, 0.3), e = time(b.until, DUR);
    html += `<div ${el(s, e, "brand", "brand")} data-track-index="3"><b>${esc(b.name)}</b>${b.tagline ? `<span>${esc(b.tagline)}</span>` : ""}</div>\n`;
    a("#brand", { y: 0, opacity: 1, duration: 0.7, ease: "power2.out" }, s, { y: -20, opacity: 0 });
  }

  // Stamps: "banner" (big skewed blocks) or "badge" (round sticker). Each line of text is one block.
  (cfg.stamps ?? []).forEach((st, i) => {
    const id = "stamp" + i, s = time(st.from), e = time(st.until, DUR);
    const kind = st.style === "badge" ? "badge" : "banner";
    const lines = st.lines ?? [];
    let inner;
    if (kind === "banner") inner = lines.map((l, j) => (j === 0 ? `<b>${esc(l)}</b>` : `<span>${esc(l)}</span>`)).join("");
    else if (lines.length >= 3) inner = `<small>${esc(lines[0])}</small><b>${esc(lines[1])}</b>` + lines.slice(2).map((l) => `<span>${esc(l)}</span>`).join("");
    else inner = `<b>${esc(lines[0] ?? "")}</b>` + lines.slice(1).map((l) => `<span>${esc(l)}</span>`).join("");
    const pos = st.top != null ? ` style="top:${+st.top}px"` : "";
    html += `<div ${el(s, e, "stamp " + kind, id)} data-track-index="4"${pos}>${inner}</div>\n`;
    const rot = st.rotation ?? (kind === "badge" ? 6 : -5);
    a(`#${id}`, { scale: 1, opacity: 1, rotation: rot, duration: 0.45, ease: kind === "badge" ? "back.out(1.8)" : "back.out(1.6)" }, s, { scale: kind === "badge" ? 1.8 : 1.6, opacity: 0, rotation: rot });
    if (st.pulse) a(`#${id}`, { scale: 1.06, duration: 0.45, yoyo: true, repeat: 7, ease: "sine.inOut" }, s + 0.5);
  });

  // Price board: every tagged segment as a row.
  if (cfg.board) {
    const b = cfg.board, s = time(b.from), e = time(b.until, DUR);
    const rows = cfg.segments.filter((x) => x.tag && x.tag.price && x.board !== false);
    html += `<div ${el(s, e, "board", "board")} data-track-index="4"><div class="bh" id="bh">${esc(b.title ?? "")}</div><div class="grid">${rows
      .map((x, i) => `<div class="row" id="br${i}"><span>${esc(x.tag.item ?? "")}</span><b>${esc(x.tag.price)}</b></div>`).join("")}</div></div>\n`;
    a("#bh", { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, s, { opacity: 0, y: -20 });
    rows.forEach((_, i) => a(`#br${i}`, { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }, s + 0.1 + i * 0.08, { opacity: 0, x: i % 2 ? 40 : -40 }));
  }

  // Captions: *word* is highlighted.
  caps.forEach((c, i) => {
    const id = "cap" + i;
    const inner = esc(c.text).replace(/\*([^*]+)\*/g, (_, k) => `<em>${k}</em>`);
    html += `<div ${el(c.t - 0.03, c.end, "cap", id)} data-track-index="7"><span id="${id}s">${inner}</span></div>\n`;
    a(`#${id}s`, { y: 0, opacity: 1, scale: 1, duration: 0.2, ease: "power2.out" }, c.t - 0.03, { y: 14, opacity: 0, scale: 0.92 });
  });

  // End card.
  if (cfg.endcard) {
    const E = time(cfg.endcard.from), lines = cfg.endcard.lines ?? [];
    html += `<div ${el(E, DUR, "endcard", "endcard")} data-track-index="8">\n<div class="endshade" id="endshade"></div>\n` +
      lines.map((l, i) => `<div class="e e-${esc(l.style ?? "line")}" id="e${i}">${esc(l.text)}</div>`).join("\n") + `\n</div>\n`;
    a("#endshade", { opacity: 1, duration: 0.5 }, E, { opacity: 0 });
    lines.forEach((l, i) => a(`#e${i}`, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, E + 0.1 + i * 0.15, { opacity: 0, y: 24 }));
    lines.forEach((l, i) => l.pulse && a(`#e${i}`, { scale: 1.05, duration: 0.5, yoyo: true, repeat: 5, ease: "sine.inOut" }, E + 1.2));
  }

  const theme = { ...THEME, ...(cfg.theme ?? {}) };
  const vars = `:root { --accent: ${theme.accent}; --secondary: ${theme.secondary}; --highlight: ${theme.highlight}; --ink: ${theme.ink}; --w: ${W}px; --h: ${H}px; }`;
  let css = fs.readFileSync(path.join(here, "style.css"), "utf8").replaceAll("__W__", W).replaceAll("__H__", H);
  if (cfg.cssPath) css += "\n" + fs.readFileSync(cfg.cssPath, "utf8");
  const fonts = cfg.fonts === false ? "" : `<link href="${esc(cfg.fonts ?? DEFAULT_FONTS)}" rel="stylesheet">`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=${W}, height=${H}">
<title>${esc(cfg.title)}</title>
${fonts}
<style>
${vars}
${css}
</style></head><body>
<div id="root" data-composition-id="root" data-width="${W}" data-height="${H}" data-start="0" data-duration="${DUR}" data-fps="${FPS}">
${html}</div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script>
const tl = gsap.timeline({ paused: true });
${anim.join("\n")}
tl.set({}, {}, ${DUR});
window.__timelines = window.__timelines || {};
window.__timelines["root"] = tl;
</script></body></html>
`;
}
