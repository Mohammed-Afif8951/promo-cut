import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { loadConfig } from "./config.js";
import { layout } from "./timeline.js";
import { composition } from "./html.js";
import { renderShots, mixVoice, mixMusic } from "./media.js";
import { trimTake } from "./trim.js";
import { checkTools } from "./ff.js";

export { loadConfig, layout, composition, trimTake };

// Trim every entry in config.takes into the voice folder as <id>.wav.
export function trim(configFile, log = console.log) {
  checkTools();
  const cfg = loadConfig(configFile);
  if (!cfg.takes) throw new Error('promo.json has no "takes" to trim');
  fs.mkdirSync(cfg.voiceDir, { recursive: true });
  const durs = {};
  for (const [id, t] of Object.entries(cfg.takes)) {
    if (!fs.existsSync(t.path)) throw new Error(`take "${id}": file not found: ${t.path}`);
    const r = trimTake(t.path, path.join(cfg.voiceDir, `${id}.wav`), { hint: t.hint, noise: t.noise, minSilence: t.minSilence });
    durs[id] = r.dur;
    log(`${id}: head ${r.head.toFixed(2)} end ${r.end.toFixed(2)} dur ${r.dur.toFixed(2)}`);
  }
  return durs;
}

// Lay out the timeline, write index.html + timeline.json; with media: true also cut shots and mix audio.
export function build(configFile, { media = false, log = console.log } = {}) {
  checkTools();
  const cfg = loadConfig(configFile);
  const tl = layout(cfg);
  const out = cfg.outDir;
  const mediaDir = path.join(out, "media");
  fs.mkdirSync(mediaDir, { recursive: true });
  const hasMusic = !!(cfg.music && cfg.music.path);
  if (hasMusic && !fs.existsSync(cfg.music.path)) throw new Error(`music file not found: ${cfg.music.path}`);

  fs.writeFileSync(path.join(out, "index.html"), composition(cfg, tl, { hasMusic }));
  fs.writeFileSync(path.join(out, "hyperframes.json"), JSON.stringify({ paths: { assets: "media" } }, null, 2));
  fs.writeFileSync(path.join(out, "timeline.json"), JSON.stringify({
    DUR: tl.DUR,
    lines: tl.lines.map(({ id, at, dur }) => ({ id, at, dur })),
    shots: tl.shots.map(({ id, src, start, end, tag }) => ({ id, clip: path.basename(src), start, end, item: tag?.item })),
    caps: tl.caps,
  }, null, 1));
  log(`index.html: ${tl.DUR}s, ${tl.shots.length} shots, ${tl.caps.length} captions -> ${out}`);

  if (media) {
    renderShots(cfg, tl.shots, mediaDir, log);
    mixVoice(tl.lines, tl.DUR, mediaDir);
    if (hasMusic) mixMusic(cfg.music, tl.DUR, mediaDir);
    log("audio done");
  }
  return { cfg, tl, out };
}

// Render the built composition to MP4 with HyperFrames.
export function render(configFile, { output, extra = [], log = console.log } = {}) {
  const cfg = loadConfig(configFile);
  const out = cfg.outDir;
  if (!fs.existsSync(path.join(out, "index.html"))) throw new Error(`nothing built in ${out}; run "promo-cut build --media" first`);
  const dest = path.resolve(output ?? path.join(out, "promo.mp4"));
  const args = ["render", out, "-o", dest, ...extra];
  let cmd, argv, shell = false;
  try {
    const req = createRequire(import.meta.url);
    const pkgPath = req.resolve("hyperframes/package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.hyperframes ?? Object.values(pkg.bin ?? {})[0];
    cmd = process.execPath;
    argv = [path.join(path.dirname(pkgPath), bin), ...args];
  } catch {
    // Not installed locally: fall back to npx (a .cmd shim on Windows, so it needs a shell).
    cmd = ["npx", "--yes", "hyperframes", ...args].map((a) => (/^[\w./:\\=-]+$/.test(a) ? a : `"${a.replace(/"/g, "")}"`)).join(" ");
    argv = [];
    shell = true;
  }
  log(`rendering -> ${dest}`);
  const r = shell ? spawnSync(cmd, { stdio: "inherit", shell }) : spawnSync(cmd, argv, { stdio: "inherit" });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`hyperframes render exited with code ${r.status}`);
  return dest;
}
