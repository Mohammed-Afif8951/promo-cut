#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, render, trim } from "../src/index.js";

const HELP = `promo-cut: raw clips + voice lines -> vertical promo video

Usage:
  promo-cut init [dir]                 write a starter promo.json
  promo-cut trim   [promo.json]        trim voice takes listed in "takes" into the voice folder
  promo-cut build  [promo.json] [--media]
                                       write index.html + timeline.json; --media also cuts clips and mixes audio
  promo-cut render [promo.json] [-o out.mp4] [-- extra hyperframes args]
  promo-cut make   [promo.json] [-o out.mp4]
                                       build --media, then render

Needs ffmpeg/ffprobe on PATH. Rendering uses HyperFrames (Chrome headless).`;

const argv = process.argv.slice(2);
const cmd = argv.shift();
const dashdash = argv.indexOf("--");
const extra = dashdash >= 0 ? argv.splice(dashdash).slice(1) : [];
const flag = (f) => { const i = argv.indexOf(f); if (i < 0) return false; argv.splice(i, 1); return true; };
const opt = (...names) => { for (const n of names) { const i = argv.indexOf(n); if (i >= 0) { const v = argv[i + 1]; argv.splice(i, 2); return v; } } };

try {
  switch (cmd) {
    case "init": {
      const dir = path.resolve(argv[0] ?? ".");
      const dest = path.join(dir, "promo.json");
      if (fs.existsSync(dest)) throw new Error(`${dest} already exists`);
      const here = path.dirname(fileURLToPath(import.meta.url));
      fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(path.join(here, "..", "examples", "demo", "promo.json"), dest);
      console.log(`wrote ${dest}. Edit "footage", "voice" and "segments", then run: promo-cut make`);
      break;
    }
    case "trim": trim(argv[0] ?? "promo.json"); break;
    case "build": { const media = flag("--media"); build(argv[0] ?? "promo.json", { media }); break; }
    case "render": { const o = opt("-o", "--output"); render(argv[0] ?? "promo.json", { output: o, extra }); break; }
    case "make": {
      const o = opt("-o", "--output");
      const f = argv[0] ?? "promo.json";
      build(f, { media: true });
      render(f, { output: o, extra });
      break;
    }
    case undefined: case "-h": case "--help": case "help": console.log(HELP); break;
    default: console.error(`unknown command "${cmd}"\n\n${HELP}`); process.exit(1);
  }
} catch (e) {
  console.error(`promo-cut: ${e.message}`);
  process.exit(1);
}
