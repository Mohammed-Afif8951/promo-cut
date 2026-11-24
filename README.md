# promo-cut

[![npm version](https://img.shields.io/npm/v/promo-cut.svg)](https://www.npmjs.com/package/promo-cut)
[![npm downloads](https://img.shields.io/npm/dm/promo-cut.svg)](https://www.npmjs.com/package/promo-cut)
[![license: MIT](https://img.shields.io/npm/l/promo-cut.svg)](LICENSE)
[![node](https://img.shields.io/node/v/promo-cut.svg)](package.json)

<p align="center">
  <img src="https://raw.githubusercontent.com/Mohammed-Afif8951/promo-cut/main/docs/demo.gif" alt="promo-cut demo: captions, price tags, a stamp, a price board and an end card over placeholder footage" width="300">
</p>

<p align="center"><sub>Built from <code>examples/demo</code> with placeholder footage and tones.</sub></p>

Turn raw phone or drone clips plus recorded voice lines into a vertical (9:16) promo video. The video gets punchy 3-word captions, item and price tags, stamps, a price board and an end card. Everything is driven by one `promo.json`.

Built for shop, real-estate and product promos for Reels, Shorts and TikTok.

```
footage/*.mp4 + vo/<line>.wav + promo.json  ->  promo.mp4 (1080x1920)
```

## Requirements

- Node 22+
- `ffmpeg` and `ffprobe` on your PATH
- Rendering uses [HyperFrames](https://github.com/heygen-com/hyperframes) (Apache-2.0), which drives headless Chrome. It installs as a dependency.

## Quick start

```sh
npm install -g promo-cut
mkdir my-promo && cd my-promo
promo-cut init           # writes a starter promo.json
# put clips in footage/, one voice line per segment in vo/<id>.wav
promo-cut make           # build media + render promo-build/promo.mp4
```

Try the bundled demo, which uses generated test footage and tones:

```sh
cd node_modules/promo-cut/examples/demo   # or the repo's examples/demo
node make-media.mjs
promo-cut make promo.json -o demo.mp4
```

## Commands

| Command | What it does |
| --- | --- |
| `promo-cut init [dir]` | Write a starter `promo.json`. |
| `promo-cut trim [promo.json]` | Trim each take in `takes` (cut leading silence and stop at the first pause after `hint`) into `voice/<id>.wav`. |
| `promo-cut build [promo.json] [--media]` | Lay out the timeline and write `index.html` and `timeline.json`. `--media` also cuts and grades the clips and mixes the voice and music. |
| `promo-cut render [promo.json] [-o out.mp4] [-- hyperframes args]` | Render with HyperFrames. Extra args pass through, e.g. `-- --start 0 --end 8`. |
| `promo-cut make [promo.json] [-o out.mp4]` | `build --media`, then `render`. |

## How timing works

Each segment is one voice line over one clip. The segment lasts `pre` + voice length + `post`, and the clip fills it. Voice length comes from the WAV file, capped by `maxDur` if set. Captions split the segment's `caption` on `|` into chunks of about 3 words and spread them over the spoken time by length. `*word*` is highlighted.

Overlays are placed with **time references**:

- a number, in seconds from the start
- `"end"`, the end of the film
- `{ "seg": "i12", "at": "start" | "voice" | "voiceEnd" | "end", "offset": 0.1 }`

## promo.json

```jsonc
{
  "title": "My Shop Sale",
  "width": 1080, "height": 1920, "fps": 25,
  "footage": "footage",          // folder for segment clips
  "voice": "vo",                 // folder with <segment id>.wav
  "out": "promo-build",          // build folder
  "music": { "file": "music.wav", "volume": 0.7 },  // optional; ducked under the voice, loops if short
  "grade": "eq=contrast=1.06:saturation=1.15",       // optional ffmpeg filter; false = none
  "theme": { "accent": "#e63946", "secondary": "#1d3557", "highlight": "#ffd166", "ink": "#1d1d1f" },
  "css": "extra.css",            // optional CSS appended after the default style
  "fonts": "https://fonts.googleapis.com/css2?...",  // optional; false = no web fonts

  "brand":  { "name": "My Shop", "tagline": "Since 1999", "from": 0.3, "until": { "seg": "p3", "at": "end" } },
  "stamps": [
    { "lines": ["MEGA", "SALE"], "style": "banner", "from": { "seg": "intro", "at": "voice", "offset": 1 }, "until": { "seg": "intro", "at": "end" } },
    { "lines": ["ONLY", "3 DAYS", "LEFT"], "style": "badge", "pulse": true, "from": 20, "until": 24 }
  ],
  "board":   { "title": "ALL OFFERS", "from": { "seg": "p3", "at": "end" }, "until": "end" },
  "endcard": { "from": { "seg": "outro", "at": "voice" }, "lines": [
    { "text": "My Shop", "style": "brand" }, { "text": "Main Street", "style": "line" }, { "text": "Call 000", "style": "cta", "pulse": true }
  ] },

  "segments": [
    { "id": "intro", "clip": "a.mp4", "in": 3.0, "speed": 1.4, "pre": 0.5, "caption": "Big *sale* | starts now!" },
    { "id": "p1", "clip": "b.mp4", "in": 4.3, "zoom": 1.6, "anchor": "bottom",
      "tag": { "item": "Scarf", "price": "$10" }, "caption": "*Scarf,* only *$10*" },
    { "id": "p2", "clip": "c.mp4", "in": 1.0, "split": { "clip": "d.mp4", "in": 7.5, "at": 2.4 } }
  ],

  "takes": { "intro": { "file": "raw/intro_take3.wav", "hint": 2.1 } }
}
```

Segment fields: `clip`, `in` (source start, in seconds), `speed`, `zoom`, `anchor` (`top`, `bottom`, `left`, `right`, `top-right`, or centre by default), `pre`, `post`, `maxDur`, `voice` (file name if not `<id>.wav`), `split` (switch to a second clip `at` seconds after the voice starts), `tag` (`item`, `price`, `top`), `board: false` (leave the tag off the price board), and `caption`.

Any aspect ratio of footage works: clips are scaled to cover the frame and cropped to `width`x`height`.

End card line styles: `brand`, `sub`, `offer`, `days`, `line`, `cta`. Stamp styles: `banner`, `badge`.

## Programmatic use

```js
import { build, render, trim, loadConfig, layout } from "promo-cut";
build("promo.json", { media: true });
render("promo.json", { output: "out.mp4" });
```

## License

MIT
