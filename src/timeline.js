// Lay segments out on a timeline and spread captions over each voice line.
import fs from "node:fs";
import { duration } from "./ff.js";

// durs: optional { id: seconds } override (used by tests); otherwise each voice file is probed.
export function layout(cfg, durs = null) {
  let t = 0;
  const shots = [], lines = [], seg = {};
  for (const s of cfg.segments) {
    let d;
    if (durs) d = durs[s.id];
    else {
      if (!fs.existsSync(s.voicePath)) throw new Error(`segment "${s.id}": voice file not found: ${s.voicePath}`);
      d = duration(s.voicePath);
    }
    if (s.maxDur != null) d = Math.min(d, s.maxDur);
    const pre = s.pre ?? 0.15, post = s.post ?? 0.3;
    const at = t + pre, end = at + d + post;
    lines.push({ id: s.id, at, dur: d, voicePath: s.voicePath });
    const base = { zoom: s.zoom, anchor: s.anchor, speed: s.speed };
    if (s.split) {
      shots.push({ ...base, id: `v_${s.id}a`, src: s.clipPath, ss: s.in ?? 0, start: t, end: at + s.split.at });
      shots.push({ id: `v_${s.id}b`, src: s.split.clipPath, ss: s.split.in ?? 0, start: at + s.split.at, end, zoom: s.split.zoom ?? s.zoom, anchor: s.split.anchor });
    } else {
      shots.push({ ...base, id: `v_${s.id}`, src: s.clipPath, ss: s.in ?? 0, start: t, end, tag: s.tag });
    }
    seg[s.id] = { start: t, voice: at, voiceEnd: at + d, end };
    t = end;
  }
  const DUR = +t.toFixed(2);

  // Captions: split on "|" into chunks (keep each to ~3 words), timed by chunk length.
  const caps = [];
  for (const s of cfg.segments) {
    if (!s.caption) continue;
    const l = lines.find((x) => x.id === s.id);
    const chunks = s.caption.split("|").map((c) => c.trim()).filter(Boolean);
    const weights = chunks.map((c) => c.replace(/\*/g, "").length + 4);
    const total = weights.reduce((a, b) => a + b, 0);
    let c0 = l.at;
    chunks.forEach((c, i) => {
      const len = (l.dur * weights[i]) / total;
      caps.push({ t: c0, end: i === chunks.length - 1 ? l.at + l.dur + 0.25 : c0 + len, text: c });
      c0 += len;
    });
  }

  // Resolve a time reference: number (seconds), "end" (film end), or { seg, at: start|voice|voiceEnd|end, offset }.
  const time = (ref, fallback) => {
    if (ref == null) return fallback;
    if (typeof ref === "number") return ref;
    if (ref === "end") return DUR;
    const s = seg[ref.seg];
    if (!s) throw new Error(`time reference: unknown segment "${ref.seg}"`);
    const at = ref.at ?? "start";
    if (!(at in s)) throw new Error(`time reference: "at" must be start, voice, voiceEnd or end (got "${at}")`);
    return s[at] + (ref.offset ?? 0);
  };

  return { DUR, shots, lines, caps, seg, time };
}
