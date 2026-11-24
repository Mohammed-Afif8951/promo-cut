// Cut, scale/crop, speed-ramp and grade each shot; mix the voice lines and duck the music.
import fs from "node:fs";
import path from "node:path";
import { ffmpeg } from "./ff.js";

const DEFAULT_GRADE = "eq=contrast=1.06:saturation=1.15:gamma=0.98,unsharp=5:5:0.3";
const even = (n) => Math.round(n / 2) * 2;

// Crop window position for an anchor name.
function cropXY(anchor) {
  switch (anchor) {
    case "top": return ":(iw-ow)/2:0";
    case "bottom": return ":(iw-ow)/2:ih-oh";
    case "left": return ":0:(ih-oh)/2";
    case "right": return ":iw-ow:(ih-oh)/2";
    case "top-right": return ":(iw-ow)*0.7:0";
    default: return "";
  }
}

export function renderShots(cfg, shots, mediaDir, log = console.log) {
  const { width: W, height: H, fps: FPS } = cfg;
  const grade = cfg.grade === false ? "" : `,${cfg.grade ?? DEFAULT_GRADE}`;
  for (const s of shots) {
    if (!fs.existsSync(s.src)) throw new Error(`shot ${s.id}: clip not found: ${s.src}`);
    const z = s.zoom ?? 1, sp = s.speed ?? 1, dur = s.end - s.start + 0.2;
    const fit = `scale=${even(W * z)}:${even(H * z)}:force_original_aspect_ratio=increase,crop=${W}:${H}${cropXY(s.anchor)}`;
    ffmpeg(["-ss", String(s.ss), "-i", s.src, "-t", String(dur * sp),
      "-vf", `setpts=PTS/${sp},fps=${FPS},${fit}${grade},format=yuv420p`,
      "-an", "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-g", "12", path.join(mediaDir, `${s.id}.mp4`)]);
    log(`shot ${s.id}`);
  }
}

export function mixVoice(lines, DUR, mediaDir) {
  const inputs = [], filt = [];
  lines.forEach((l, i) => {
    inputs.push("-t", String(l.dur), "-i", l.voicePath);
    filt.push(`[${i}:a]highpass=f=80,afade=t=out:st=${Math.max(0, l.dur - 0.05).toFixed(3)}:d=0.05,aresample=48000,adelay=${Math.round(l.at * 1000)}:all=1[v${i}]`);
  });
  filt.push(lines.map((_, i) => `[v${i}]`).join("") + `amix=inputs=${lines.length}:normalize=0,alimiter=limit=0.89,apad=whole_dur=${DUR}[o]`);
  ffmpeg([...inputs, "-filter_complex", filt.join(";"), "-map", "[o]", "-t", String(DUR), "-ar", "48000", "-ac", "1", path.join(mediaDir, "vo.wav")]);
}

// Music under the voice: band-limited, faded, sidechain-ducked by the voice mix. Loops if shorter than the film.
export function mixMusic(music, DUR, mediaDir) {
  const vol = music.volume ?? 0.7;
  ffmpeg(["-stream_loop", "-1", "-i", music.path, "-i", path.join(mediaDir, "vo.wav"), "-filter_complex",
    `[1:a]aformat=channel_layouts=stereo,volume=4[sc];[0:a]atrim=0:${DUR},asetpts=N/SR/TB,aformat=channel_layouts=stereo,highpass=f=120,lowpass=f=11000,volume=${vol},afade=t=in:d=0.5,afade=t=out:st=${Math.max(0, DUR - 2)}:d=2[m];[m][sc]sidechaincompress=threshold=0.03:ratio=5:attack=60:release=700[d]`,
    "-map", "[d]", "-t", String(DUR), "-ar", "48000", path.join(mediaDir, "music.wav")]);
}
