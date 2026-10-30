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
  var HEADINGS = {
    pencil: { label: "Pencil pleat", fullness: 2.25, heading: 10,
      note: "Pencil pleat gathers to about 2 to 2.5 times the track width." },
    eyelet: { label: "Eyelet", fullness: 2.0, heading: 8,
      note: "Eyelet panels hang in even waves at about 2 times the track width." },
    "pinch-double": { label: "Pinch pleat (double)", fullness: 2.2, heading: 15,
      note: "Double pinch pleats take about 2 to 2.3 times the track width." },
    "pinch-triple": { label: "Pinch pleat (triple)", fullness: 2.4, heading: 15,
      note: "Triple pinch pleats are the fullest, about 2.3 to 2.5 times the track width." },
    wave: { label: "Wave / S-fold", fullness: 2.1, heading: 8,
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
    if (repeatCm > 0) {
      var r = Math.ceil((cutDrop - 1e-6) / repeatCm) * repeatCm;
      patternRounded = r > cutDrop + 1e-6 || widths > 1;
      cutDrop = r;
    }

    var totalCm = widths * cutDrop;
    var totalM = round2(totalCm / 100);

    // What the gather actually covers once made up, as a sense-check: the made
    // width is the fabric width times widths, over the fullness.
    var madeFullness = round2((widths * fabricCm - returnEach * 2 - overlap) / trackCm);

    var out = {
      ok: true,
      heading: h,
      headingLabel: head.label,
      fullness: round2(fullness),
      madeFullness: madeFullness,
      pair: pair,
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
      patternRounded: patternRounded
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
    if (r.widths > (r.pair ? 2 : 1)) {
      tips.push("More than one width per curtain means a seam down each curtain. Put the joins towards the outer edges, not the leading edge you see most.");
    }
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
    plan: plan, advise: advise, pack: pack, unpack: unpack
  };
});
