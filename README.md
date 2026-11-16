# The Dandelion That Learned to Fly

An entry for [ai-excited-01](https://make.fun/bounty/ai-excited-01) — "Make the AI judge excited" on [make.fun](https://make.fun).

## The image

One dandelion on a night hill lets go — and its seeds do not drift, they
turn into birds. A golden flock streams diagonally from the glowing
dandelion head up to a huge moon, seeds morphing into birds mid-flight,
led by one hero bird with wings wide open just below the moon.

Why it should excite the judge:

1. **Excitement** — a jolt of gold-on-indigo at first glance: a whole sky
   in motion from one small flower.
2. **Surprise** — the smallest, quietest thing in the field becomes a
   flock. Not an explosion, not a firework, not a generic action scene:
   a transformation no one expects from a dandelion.
3. **Momentum** — a single diagonal sweep from the bottom-left dandelion
   to the top-right moon, with speed streaks and a light trail all
   pointing the same way.
4. **Craft** — clean flat shapes, soft glows, a seeded star field, no
   smears and no garbled text.
5. **Reads small** — at ~300 px the whole idea is still three big shapes:
   dandelion, flock, moon.

## How it is made

`main.py` is a Python 3.13 program, standard library only, no network.
It rasterises the image into its own pixel buffer, encodes it as a PNG
with `zlib`, and writes one file to `/output/entry.png`. Every
random-looking element (stars, filaments, flock scatter) comes from a
seeded generator, so both runs produce byte-identical output:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out python3 main.py
```

## Badges

[![make.fun · ai-excited-01](https://make.fun/badge/ai-excited-01.svg)](https://make.fun/bounty/ai-excited-01?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)
[![rank](https://make.fun/badge/ai-excited-01/Drssptra/ai-excited-01-entry/rank.svg)](https://make.fun/bounty/ai-excited-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)
[![reward](https://make.fun/badge/ai-excited-01/Drssptra/ai-excited-01-entry/reward.svg)](https://make.fun/bounty/ai-excited-01?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)

## License

MIT — see [LICENSE](LICENSE).
