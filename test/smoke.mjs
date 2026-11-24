// Smoke test: generate demo media, trim a take, build with media, check the outputs. No browser render.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { build, trim, loadConfig, layout } from "../src/index.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const demo = path.join(root, "examples", "demo");
const cfgFile = path.join(demo, "promo.json");
const quiet = () => {};

execFileSync(process.execPath, [path.join(demo, "make-media.mjs")], { stdio: "ignore" });

// Pure layout with fixed durations.
const cfg = loadConfig(cfgFile);
const tl = layout(cfg, { intro: 2, p1: 1, p2: 1, hurry: 1, outro: 1 });
assert.equal(tl.shots.length, 5);
assert.equal(tl.shots[0].start, 0);
assert.ok(Math.abs(tl.seg.intro.voice - 0.4) < 1e-9, "pre padding");
assert.ok(tl.caps.length >= 8, "captions split on |");
assert.equal(tl.time({ seg: "p1", at: "end", offset: 0.1 }), tl.seg.p1.end + 0.1);
assert.equal(tl.time("end"), tl.DUR);

// Trim: 0.6 s silence + 1.5 s tone + 0.9 s silence -> about 1.5 s.
const d = trim(cfgFile, quiet);
assert.ok(Math.abs(d.intro - 1.6) < 0.12, `trimmed take ${d.intro}s`);
// Restore the untrimmed-length placeholder voice for intro so the build below is deterministic.
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=300:duration=2", "-ar", "48000", path.join(demo, "vo", "intro.wav")]);

const { out, tl: t2 } = build(cfgFile, { media: true, log: quiet });
for (const f of ["index.html", "timeline.json", "media/vo.wav", "media/music.wav", ...t2.shots.map((s) => `media/${s.id}.mp4`)])
  assert.ok(fs.existsSync(path.join(out, f)), `missing ${f}`);
const probe = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", path.join(out, "media", "v_p2.mp4")], { encoding: "utf8" }).trim();
assert.equal(probe, "1080,1920");
const html = fs.readFileSync(path.join(out, "index.html"), "utf8");
assert.ok(html.includes("window.__timelines"));
assert.ok(html.includes("Tote Bags") && html.includes("ALL OFFERS"));
console.log(`ok: ${t2.DUR}s, ${t2.shots.length} shots, ${t2.caps.length} captions`);
