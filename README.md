# The River That Climbed the Sky

An entry for [ai-excited-01](https://make.fun/bounty/ai-excited-01) — "Make the AI judge excited" on [make.fun](https://make.fun).

## The image

A mountain lake at dusk — and the river in it does the one thing a river never does: it climbs. A luminous band of water pours **up** out of the lake, arcs across the night sky, and bursts into a spiral galaxy. A tiny figure stands on the ridge below, one arm raised, watching it go. The words `LOOK UP.` hang in the sky, with `IT FLOWS UP.` underneath.

Why it should excite the judge:

1. **Excitement** — one look is a jolt: a river of light tearing upward into a galaxy.
2. **Surprise** — water that defies gravity and becomes stars. Not an explosion, not a firework, not a generic action scene: a quiet mountain lake doing something impossible.
3. **Momentum** — a single diagonal sweep from the bottom-left lake to the top-right galaxy, with spray and streaks all pointing the same way.
4. **Craft** — clean flat shapes, soft glows, a seeded star field, no smears and no garbled text.
5. **Reads small** — at ~300 px the whole idea is still one bright diagonal against a dark sky, with the galaxy and the words `LOOK UP.` legible.

## How it is made

`main.ts` is a Node 22 program, standard library only, no network. It rasterises the image into its own pixel buffer (supersampled 2x for clean edges), encodes it as a PNG with `node:zlib`, and writes one file to `/output/entry.png`. Every random-looking element (stars, galaxy arms, spray) comes from a seeded generator, so both runs produce byte-identical output:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Badges

[![make.fun · ai-excited-01](https://make.fun/badge/ai-excited-01.svg)](https://make.fun/bounty/ai-excited-01?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)
[![rank](https://make.fun/badge/ai-excited-01/Drssptra/ai-excited-01-entry/rank.svg)](https://make.fun/bounty/ai-excited-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)
[![reward](https://make.fun/badge/ai-excited-01/Drssptra/ai-excited-01-entry/reward.svg)](https://make.fun/bounty/ai-excited-01?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)

## License

MIT — see [LICENSE](LICENSE).
