// Load promo.json and resolve every path relative to the config file.
import fs from "node:fs";
import path from "node:path";

export function loadConfig(file) {
  const abs = path.resolve(file);
  const cfg = JSON.parse(fs.readFileSync(abs, "utf8"));
  const dir = path.dirname(abs);
  const rel = (p) => (p == null ? p : path.resolve(dir, p));
  cfg.width ??= 1080;
  cfg.height ??= 1920;
  cfg.fps ??= 25;
  cfg.title ??= "Promo";
  cfg.footageDir = rel(cfg.footage ?? ".");
  cfg.voiceDir = rel(cfg.voice ?? "vo");
  cfg.outDir = rel(cfg.out ?? "promo-build");
  if (cfg.music) cfg.music.path = rel(cfg.music.file);
  if (cfg.css) cfg.cssPath = rel(cfg.css);
  if (cfg.takes) for (const t of Object.values(cfg.takes)) t.path = rel(t.file);
  if (!Array.isArray(cfg.segments) || !cfg.segments.length) throw new Error("promo.json: `segments` must be a non-empty array");
  const ids = new Set();
  for (const s of cfg.segments) {
    if (!s.id) throw new Error("promo.json: every segment needs an `id`");
    if (ids.has(s.id)) throw new Error(`promo.json: duplicate segment id "${s.id}"`);
    ids.add(s.id);
    if (!s.clip) throw new Error(`promo.json: segment "${s.id}" needs a \`clip\``);
    s.clipPath = path.resolve(cfg.footageDir, s.clip);
    s.voicePath = path.resolve(cfg.voiceDir, s.voice ?? `${s.id}.wav`);
    if (s.split) s.split.clipPath = path.resolve(cfg.footageDir, s.split.clip);
  }
  return cfg;
}
