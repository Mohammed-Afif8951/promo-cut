// Trim a voice take: drop leading silence, cut at the first pause after `hint` seconds
// (or the trailing silence when no hint is given), 10 ms fade-in / 40 ms fade-out.
import { ffmpeg, ffmpegStderr, duration } from "./ff.js";

export function trimTake(src, dest, { hint = null, noise = "-36dB", minSilence = 0.12 } = {}) {
  const r = ffmpegStderr(["-v", "info", "-i", src, "-af", `silencedetect=noise=${noise}:d=${minSilence}`, "-f", "null", "-"]);
  const starts = [...r.matchAll(/silence_start: (-?[\d.]+)/g)].map((m) => parseFloat(m[1]));
  const ends = [...r.matchAll(/silence_end: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
  const full = duration(src);

  let head = 0;
  if (starts.length && starts[0] <= 0.01 && ends.length) head = Math.max(0, ends[0] - 0.06);

  let end = null;
  if (hint != null) {
    const cand = starts.filter((s) => s > hint + 0.1);
    if (cand.length) end = cand[0] + 0.08;
  } else {
    // Last silence that runs to the end of the file (no silence_end after it, or one at EOF:
    // newer ffmpeg builds report a closing silence_end at the end of the stream).
    const last = starts[starts.length - 1];
    const after = ends.filter((e) => e > last);
    if (last != null && last > head && (after.length === 0 || after[0] >= full - 0.05)) end = last + 0.08;
  }
  if (end == null || end > full) end = full;

  const d = end - head;
  ffmpeg(["-ss", head.toFixed(3), "-t", d.toFixed(3), "-i", src,
    "-af", `afade=t=in:d=0.01,afade=t=out:st=${Math.max(0, d - 0.04).toFixed(3)}:d=0.04`, "-ar", "48000", dest]);
  return { head, end, dur: Math.round(d * 1000) / 1000 };
}
