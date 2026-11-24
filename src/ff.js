// Thin ffmpeg / ffprobe wrappers.
import { execFileSync, spawnSync } from "node:child_process";

export function ffmpeg(args) {
  execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: ["ignore", "inherit", "inherit"] });
}

// ffmpeg run whose stderr we want to parse (e.g. silencedetect).
export function ffmpegStderr(args) {
  const r = spawnSync("ffmpeg", args, { encoding: "utf8" });
  if (r.error) throw r.error;
  return r.stderr;
}

export function duration(file) {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
  const d = parseFloat(out);
  if (!Number.isFinite(d)) throw new Error(`ffprobe: no duration for ${file}`);
  return d;
}

export function checkTools() {
  for (const t of ["ffmpeg", "ffprobe"]) {
    const r = spawnSync(t, ["-version"], { encoding: "utf8" });
    if (r.error || r.status !== 0) throw new Error(`${t} not found on PATH. Install ffmpeg first: https://ffmpeg.org/download.html`);
  }
}
