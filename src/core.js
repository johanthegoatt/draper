// Draper core: how much fabric to buy to make curtains. No DOM in here, so the
// same file runs in the page and under `node --test`.
//
// The problem a plain "width x height" guess misses: curtain fabric comes off a
// roll of a fixed width (usually 137 cm), and a curtain is gathered, so it needs
// far more flat fabric than the window is wide. You pick a heading (pencil
// pleat, eyelet, pinch pleat, wave), which sets how much "fullness" to gather,
// multiply the track width by that, add the returns and the centre overlap, then
// cut that flat width out of the roll in whole "widths" (drops) joined side by
// side. The cut length of each drop is the finished drop plus a turn at the top
// for the heading and a hem at the bottom; a patterned fabric rounds each drop
// up to a whole pattern repeat so the pattern lines up across the joins, which
// is where patterned fabric wastes the most. Draper does all of that and tells
// you the metres to order, the widths, the cut length and the waste.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Draper = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var IN = 2.54; // cm per inch

  // Everything is held in centimetres inside.
  var TO_CM = { cm: 1, m: 100, mm: 0.1, in: IN };

  function toCm(value, unit) {
    var n = typeof value === "number" ? value : parseFloat(String(value == null ? "" : value).replace(",", "."));
    var k = TO_CM[unit];
    if (!isFinite(n) || !k) return NaN;
    return n * k;
  }

  function round1(x) { return Math.round(x * 10) / 10; }
  function round2(x) { return Math.round(x * 100) / 100; }

  // Headings. `fullness` is how many times the track width of flat fabric the
  // gather needs; `heading` is the turn-down allowance at the top in cm. Ranges
  // come from UK curtain-making guidance (pencil pleat and eyelet about 2x,
  // pinch pleat about 2.3-2.5x, wave about 2-2.3x). The fullness is editable in
  // the page; these are the sensible middle of each range.
  // `stack` is the stack-back: how wide the curtains bunch when pulled fully
  // open, as a fraction of the track width (both curtains of a pair added up).
  // It's what tells you how far past the glass the pole must reach so the open
  // curtains don't cover the window and lose light. A heavier gather stacks
  // wider; a wave heading stacks the tightest. These are typical trade figures
  // for a medium-weight fabric; a thick or interlined fabric stacks wider.
  var HEADINGS = {
    pencil: { label: "Pencil pleat", fullness: 2.25, heading: 10, stack: 0.25,
      note: "Pencil pleat gathers to about 2 to 2.5 times the track width." },
    eyelet: { label: "Eyelet", fullness: 2.0, heading: 8, stack: 0.2,
      note: "Eyelet panels hang in even waves at about 2 times the track width." },
    "pinch-double": { label: "Pinch pleat (double)", fullness: 2.2, heading: 15, stack: 0.22,
      note: "Double pinch pleats take about 2 to 2.3 times the track width." },
    "pinch-triple": { label: "Pinch pleat (triple)", fullness: 2.4, heading: 15, stack: 0.25,
      note: "Triple pinch pleats are the fullest, about 2.3 to 2.5 times the track width." },
    wave: { label: "Wave / S-fold", fullness: 2.1, heading: 8, stack: 0.12,
      note: "Wave headings hang in a soft S at about 2 to 2.3 times the track width." }
  };

  // Common fabric roll widths, as a convenience for the page.
  var FABRIC_WIDTHS_CM = [137, 140, 150, 280, 300];

  // Work out the fabric for a set of curtains over one track.
  //   track:        { width, unit }   the track or pole width
  //   drop:         { value, unit }   the finished length, top of heading to hem
  //   heading:      key into HEADINGS
  //   fullness:     optional override of the heading's fullness
  //   fabricWidth / fabricUnit:       the roll width (default 137 cm)
  //   repeat / repeatUnit:            vertical pattern repeat, 0 for plain
  //   pair:         true for a pair meeting in the middle, false for one curtain
  //   hem:          bottom hem allowance in cm (default 15, a double 7.5 cm hem)
  //   returnEach:   the wrap back to the wall at each end, cm (default 0)
  //   overlap:      the centre overlap where a pair crosses, cm (default 10 for a pair)
  //   lining:       true to also work out lining fabric
  //   price / priceUnit:  optional, per metre of the roll ("m") to cost it
  // Hooks, eyelets or gliders for the heading. Taped headings (pencil, pinch)
  // take a hook about every 8 cm along the flat tape; an eyelet curtain is
  // punched with an even number of eyelets about every 18 cm and needs no hooks;
  // a wave heading runs on a corded track with a glider about every 8 cm. These
  // are typical UK curtain-making spacings; the pack tells you what it holds, so
  // round up to whole packs when you buy.
  function hardware(heading, perCurtainFlatCm, perCurtainTrackCm, pair) {
    var curtains = pair ? 2 : 1;
    if (heading === "eyelet") {
      var n = Math.round(perCurtainFlatCm / 18);
      if (n % 2 !== 0) n += 1;      // eyelets come in even numbers
      if (n < 4) n = 4;
      return { kind: "eyelet", label: "eyelets", spacingCm: 18, perCurtain: n, total: n * curtains };
    }
    if (heading === "wave") {
      var g = Math.max(2, Math.ceil(perCurtainTrackCm / 8) + 1);
      return { kind: "glider", label: "gliders", spacingCm: 8, perCurtain: g, total: g * curtains };
    }
    var hooksPer = Math.max(3, Math.ceil(perCurtainFlatCm / 8) + 1);
    return { kind: "hook", label: "hooks", spacingCm: 8, perCurtain: hooksPer, total: hooksPer * curtains };
  }

  function plan(opts) {
    opts = opts || {};
    var trackCm = toCm(opts.track && opts.track.width, opts.track && opts.track.unit);
    var dropCm = toCm(opts.drop && opts.drop.value, opts.drop && opts.drop.unit);
    var fabricCm = toCm(opts.fabricWidth != null ? opts.fabricWidth : 137, opts.fabricUnit || "cm");
    var repeatCm = opts.repeat ? toCm(opts.repeat, opts.repeatUnit || "cm") : 0;
    if (!isFinite(repeatCm) || repeatCm < 0) repeatCm = 0;

    var h = HEADINGS[opts.heading] ? opts.heading : "pencil";
    var head = HEADINGS[h];
    var fullness = parseFloat(opts.fullness);
    if (!isFinite(fullness) || fullness <= 0) fullness = head.fullness;

    var pair = opts.pair !== false; // default: a pair
    var hem = isFinite(parseFloat(opts.hem)) ? Math.max(0, parseFloat(opts.hem)) : 15;
    var headingCm = isFinite(parseFloat(opts.headingAllow)) ? Math.max(0, parseFloat(opts.headingAllow)) : head.heading;
    var returnEach = isFinite(parseFloat(opts.returnEach)) ? Math.max(0, parseFloat(opts.returnEach)) : 0;
    var overlap = isFinite(parseFloat(opts.overlap)) ? Math.max(0, parseFloat(opts.overlap)) : (pair ? 10 : 0);

    if (!(trackCm > 0)) return { ok: false, reason: "bad-track" };
    if (!(dropCm > 0)) return { ok: false, reason: "bad-drop" };
    if (!(fabricCm > 0)) return { ok: false, reason: "bad-fabric" };

    // Flat fabric the gather needs across the whole track, plus the bits that
    // wrap to the wall at each end and the overlap where a pair crosses.
    var flatCm = trackCm * fullness + returnEach * 2 + overlap;

    // Cut each drop out of the roll in whole widths. For a pair both curtains
    // get the same whole number of widths so they match, so we size one curtain
    // to half the flat fabric and double the count.
    var perCurtainFlat = pair ? flatCm / 2 : flatCm;
    var widthsPer = Math.max(1, Math.ceil(perCurtainFlat / fabricCm - 1e-9));
    var widths = pair ? widthsPer * 2 : widthsPer;

    // Cut length of one drop: finished drop + top turn + bottom hem, then (if
    // patterned) rounded up to a whole pattern repeat so every drop starts on
    // the same point in the pattern and the joins line up.
    var cutDrop = dropCm + headingCm + hem;
    var patternRounded = false;
    var halfDropUsed = false;
    if (repeatCm > 0) {
      var r = Math.ceil((cutDrop - 1e-6) / repeatCm) * repeatCm;
      patternRounded = r > cutDrop + 1e-6 || widths > 1;
      cutDrop = r;
      // A half-drop (offset) pattern steps down half a repeat on every other
      // width, so where two widths are joined one has to start half a repeat
      // further along to match across the seam. Adding half a repeat to each cut
      // spreads that across the job so a join still matches. Only bites when
      // there's more than one width to join.
      if (opts.halfDrop && widths > 1) {
        cutDrop += repeatCm / 2;
        halfDropUsed = true;
      }
    }

    var totalCm = widths * cutDrop;
    var totalM = round2(totalCm / 100);

    // What the gather actually covers once made up, as a sense-check: the made
    // width is the fabric width times widths, over the fullness.
    var madeFullness = round2((widths * fabricCm - returnEach * 2 - overlap) / trackCm);

    // Stack-back: how far the open curtains bunch. A pair splits its stack to
    // the two ends, so each side is half; a single curtain stacks all to one
    // side. This is how far the pole should run past the glass to clear it.
    var stackFactor = isFinite(parseFloat(opts.stack)) && parseFloat(opts.stack) >= 0 ? parseFloat(opts.stack) : head.stack;
    var stackbackCm = trackCm * stackFactor;
    var stackbackSideCm = pair ? stackbackCm / 2 : stackbackCm;

    var out = {
      ok: true,
      heading: h,
      headingLabel: head.label,
      fullness: round2(fullness),
      madeFullness: madeFullness,
      pair: pair,
      stackFactor: round2(stackFactor),
      stackbackCm: Math.round(stackbackCm),
      stackbackSideCm: Math.round(stackbackSideCm),
      trackCm: Math.round(trackCm),
      dropCm: Math.round(dropCm),
      fabricCm: Math.round(fabricCm),
      repeatCm: Math.round(repeatCm),
      flatCm: Math.round(flatCm),
      widths: widths,
      widthsPerCurtain: widthsPer,
      cutDropCm: Math.round(cutDrop),
      hemCm: Math.round(hem),
      headingAllowCm: Math.round(headingCm),
      returnEachCm: Math.round(returnEach),
      overlapCm: Math.round(overlap),
      totalCm: Math.round(totalCm),
      totalM: totalM,
      patternRounded: patternRounded,
      halfDrop: halfDropUsed
    };

    // Lining is cut to the same number of widths but with smaller turns and no
    // pattern to match, so it is always a little shorter than the face fabric.
    if (opts.lining) {
      var liningCut = dropCm + 5 /* small heading turn */ + 10 /* narrower hem */;
      out.lining = {
        widths: widths,
        cutDropCm: Math.round(liningCut),
        totalM: round2((widths * liningCut) / 100)
      };
    }

    var price = parseFloat(opts.price);
    if (isFinite(price) && price > 0) {
      out.cost = round2(totalM * price);
      if (out.lining) out.liningCost = round2(out.lining.totalM * price * 0.6); // lining is cheaper; rough
    } else {
      out.cost = null;
    }

    // Hooks / eyelets / gliders for the heading, per curtain and for the set.
    out.hardware = hardware(h, perCurtainFlat, trackCm / (pair ? 2 : 1), pair);

    out.advice = advise(out);
    return out;
  }

  // The practical advice on top of the numbers.
  function advise(r) {
    var tips = [];
    tips.push("Order " + r.totalM + " m of a " + r.fabricCm + " cm wide fabric: " + r.widths +
      (r.widths === 1 ? " width" : " widths") + " cut at " + round1(r.cutDropCm / 100).toFixed(2) + " m each" +
      (r.pair ? " (" + r.widthsPerCurtain + " per curtain, both sides matching)." : "."));
    if (r.patternRounded) {
      tips.push("Each drop is cut to a whole pattern repeat so the pattern lines up across the joins. That is where a patterned fabric wastes the most, so a big repeat costs more fabric.");
    }
    if (r.halfDrop) {
      tips.push("A half-drop (offset) pattern steps down half a repeat on every other width, so I've allowed half a repeat extra per drop to match it across the joins. It uses more than a straight match.");
    }
    if (r.widths > (r.pair ? 2 : 1)) {
      tips.push("More than one width per curtain means a seam down each curtain. Put the joins towards the outer edges, not the leading edge you see most.");
    }
    tips.push("Open, the curtains bunch to about " + r.stackbackCm + " cm" +
      (r.pair ? " (roughly " + r.stackbackSideCm + " cm at each end)" : " to one side") +
      ". So the pole or track wants to run about that far past the glass each side, or the stacked fabric sits over the window and loses light.");
    tips.push("Double-check the fabric width with the shop before you cut; a few cm less and a drop may not fit, a few more and you may save a width.");
    tips.push("Planning figures. Measure the finished drop with the track already up, and buy it all from one roll and batch so the colour matches.");
    return tips;
  }

  // The whole input goes in the URL fragment, which a browser never sends to a
  // server, so a shared link reopens on the same plan without anything leaving
  // the device.
  function pack(state) {
    var json = JSON.stringify(state);
    var b64 = typeof btoa === "function" ? btoa(unescape(encodeURIComponent(json))) : Buffer.from(json, "utf8").toString("base64");
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function unpack(text) {
    try {
      var b64 = String(text).replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      var json = typeof atob === "function" ? decodeURIComponent(escape(atob(b64))) : Buffer.from(b64, "base64").toString("utf8");
      var o = JSON.parse(json);
      return o && typeof o === "object" ? o : null;
    } catch (e) { return null; }
  }

  return {
    IN: IN, TO_CM: TO_CM, HEADINGS: HEADINGS, FABRIC_WIDTHS_CM: FABRIC_WIDTHS_CM,
    toCm: toCm, round1: round1, round2: round2,
    plan: plan, advise: advise, hardware: hardware, pack: pack, unpack: unpack
  };
});
