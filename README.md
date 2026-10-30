# Draper

**How much fabric to make your curtains.** A curtain is gathered, so it needs far more fabric than the window is wide, and it is cut off a roll that comes in a fixed width. Draper takes the track width, the finished drop and the heading style and works out the metres to order, the number of widths to join, the cut length of each drop and how much you waste.

Live: **https://draper.johanthegoat.xyz**

## Why a square-metre guess gets it wrong

You don't buy curtain fabric by the window. You buy a length off a roll of a set width (usually 137 cm / 54 in), and a curtain hangs in folds, so it needs several times the window width in flat fabric. The sum is:

1. **Flat width** = track width × fullness + the returns to the wall + the centre overlap. The *fullness* is set by the heading: pencil pleat and eyelet gather to about 2× the track, pinch pleat about 2.3–2.5×, wave about 2–2.3×.
2. **Widths** = that flat width cut out of the roll in whole widths joined side by side. A pair is sized so both curtains get the same whole number of widths, so they match.
3. **Cut length** of each drop = the finished drop + a turn at the top for the heading + a hem at the bottom, then rounded **up to a whole pattern repeat** if the fabric is patterned, because every drop has to start on the same point so the pattern lines up across the joins. A big repeat is where a patterned fabric wastes the most.
4. **Total** = widths × cut length.

It also works out the **lining** (same widths, cut a little shorter, no pattern to match) and a rough **cost** from a price per metre, and it shows the fullness the made-up curtains actually gather to as a sense-check.

## The numbers

Fullness ranges and the method (track × fullness ÷ fabric width, rounded up to whole widths; cut drop rounded up to a whole repeat) follow standard UK curtain-making guidance:

- Pencil pleat and eyelet about 2×, pinch pleat about 2.5× — [Direct Fabrics: understanding curtain fullness](https://www.direct-fabrics.co.uk/understanding-curtain-fullness), [Loome fabric estimator](https://www.loomefabrics.co.uk/pages/curtain-fabric-estimator).
- Cut drop = finished drop + heading + hem, pattern repeat rounded up to a whole repeat — [The Millshop: calculating the cut drop](https://www.the-millshop-online.co.uk/blogs/news/calculating-the-cut-drop).

The default allowances (heading turn by style, a 15 cm double hem, 7 cm returns, 10 cm centre overlap on a pair) are editable, and the fabric width is editable with a "check with the shop" note, because roll widths and workroom standards vary. These are planning figures, not a cutting plan.

## Bobbin

Bobbin, the spool of thread, gives a tip when tapped, smiles when a plan comes out as single widths with no joins, and looks thoughtful when there's a seam or a big pattern repeat. Tap five times fast for a surprise. Everything Bobbin says goes through a live region so a screen reader reads it too, and it all stops if you ask the system for reduced motion.

## Private by design

Everything runs in your browser. Nothing you type is uploaded; the page is served under a Content-Security-Policy with no network access. The "copy a link" button packs the whole form into the URL fragment (the part after `#`), which a browser never sends to a server, so a shared link reopens on the same plan without anything leaving your device.

## Develop

```
npm test        # run the engine tests (node --test, no dependencies)
```

The engine is in [`src/core.js`](src/core.js) with no DOM, so it runs the same in the page and under `node --test`. The page glue is in [`src/app.js`](src/app.js) and Bobbin in [`src/bobbin.js`](src/bobbin.js).

## Licence

MIT. See [LICENSE](LICENSE).
