// Generate placeholder footage, voice lines and music for the demo with ffmpeg test sources.
// Usage: node make-media.mjs   (run inside examples/demo)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ff = (...a) => execFileSync("ffmpeg", ["-v", "error", "-y", ...a]);
const p = (...x) => path.join(here, ...x);
for (const d of ["footage", "vo", "takes"]) fs.mkdirSync(p(d), { recursive: true });

// Landscape and portrait sources, to show both get cropped to 9:16.
// Moving colour gradients stand in for real footage.
ff("-f", "lavfi", "-i", "gradients=size=1920x1080:rate=25:duration=10:speed=0.03:type=radial:nb_colors=4:c0=0x0b132b:c1=0x3a506b:c2=0x5bc0be:c3=0x1c2541",
  "-c:v", "libx264", "-pix_fmt", "yuv420p", p("footage", "street.mp4"));
ff("-f", "lavfi", "-i", "gradients=size=1080x1920:rate=25:duration=10:speed=0.03:type=linear:nb_colors=3:c0=0x2b2d42:c1=0x6d597a:c2=0xb56576",
  "-c:v", "libx264", "-pix_fmt", "yuv420p", p("footage", "shelf.mp4"));

// "Voice" lines: tones of different lengths stand in for recorded speech.
const lines = { intro: 2.0, p1: 1.4, p2: 1.6, hurry: 1.8, outro: 2.0 };
Object.entries(lines).forEach(([id, d], i) =>
  ff("-f", "lavfi", "-i", `sine=frequency=${300 + i * 80}:duration=${d}`, "-ar", "48000", p("vo", `${id}.wav`)));

// An untrimmed take (silence, tone, silence) for `promo-cut trim`.
ff("-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-f", "lavfi", "-i", "sine=frequency=440:duration=1.5:sample_rate=48000",
  "-filter_complex", "[0:a]atrim=0:0.6[a];[0:a]atrim=0:0.9[b];[a][1:a][b]concat=n=3:v=0:a=1", p("takes", "intro.wav"));

ff("-f", "lavfi", "-i", "sine=frequency=110:duration=20", "-ac", "2", "-ar", "48000", p("music.wav"));
console.log("demo media written to", here);
