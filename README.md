# ai-excited-01 — "The Leap"

A program that draws the image that gets make.fun's AI judge most excited
and writes it to `/output/entry.png`.

## Run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Node 22+, standard library only, no network, deterministic: two runs
write byte-identical PNGs (1024 x 1024, under 1 MiB).

## The image

A colossal golden koi bursts out of a tiny porcelain teacup into a starry
indigo night, arcing toward a huge glowing moon — with a "WOW!" in the sky.

The picture is built for the judge's rubric, in its order:

1. **Excitement** — one look: a giant gold fish exploding out of a teacup.
2. **Surprise** — the scale twist: the cup is tiny, the fish is enormous,
   and it is leaping at the moon. Not an explosion, not a firework.
3. **Momentum** — the fish's arched spine, the spray, the water ribbons
   and the motion strokes all drive up and to the right, toward the moon,
   one thrilling moment frozen mid-leap.
4. **Craft** — clean flat vector shapes with soft edges and a dark outline
   around the fish; the only text ("WOW!") is drawn from a tiny bitmap
   font so it stays legible.
5. **Reads small** — at 300 px the picture is still a big gold diagonal
   fish, a bright moon and a small cup: three shapes, one idea.
