"use strict";
var test = require("node:test");
var assert = require("node:assert");
var D = require("../src/core.js");

test("unit conversion to cm", function () {
  assert.strictEqual(D.toCm(2, "m"), 200);
  assert.strictEqual(D.toCm(137, "cm"), 137);
  assert.ok(Math.abs(D.toCm(54, "in") - 137.16) < 0.01);
  assert.ok(Number.isNaN(D.toCm("", "cm")));
  assert.ok(Number.isNaN(D.toCm(2, "furlong")));
});

test("worked example: 2.4 m track, pencil pleat ~2.2, 137 cm fabric, pair -> 2 widths each", function () {
  // From UK curtain-making guidance: (2.4 m / 2 * 2.2) / 1.37 m = 1.93 -> 2 per
  // curtain, 4 widths for the pair.
  var r = D.plan({
    track: { width: 2.4, unit: "m" }, drop: { value: 2.1, unit: "m" },
    heading: "pencil", fullness: 2.2, fabricWidth: 137, pair: true,
    overlap: 0, returnEach: 0
  });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.widthsPerCurtain, 2);
  assert.strictEqual(r.widths, 4);
});

test("a matched pair is an even count and never fewer widths than one curtain", function () {
  // Each curtain of a pair is rounded up to whole widths on its own so the two
  // sides match, so a pair uses an even number and can round to a touch more
  // than a single curtain over the same track.
  var opts = { track: { width: 3, unit: "m" }, drop: { value: 2, unit: "m" }, heading: "pencil", overlap: 0, returnEach: 0 };
  var pair = D.plan(Object.assign({}, opts, { pair: true }));
  var one = D.plan(Object.assign({}, opts, { pair: false }));
  assert.strictEqual(pair.widths % 2, 0);
  assert.strictEqual(pair.widths, pair.widthsPerCurtain * 2);
  assert.ok(pair.widths >= one.widths);
});

test("heading sets fullness and heading allowance", function () {
  var eyelet = D.plan({ track: { width: 2, unit: "m" }, drop: { value: 2, unit: "m" }, heading: "eyelet" });
  var triple = D.plan({ track: { width: 2, unit: "m" }, drop: { value: 2, unit: "m" }, heading: "pinch-triple" });
  assert.strictEqual(eyelet.fullness, 2.0);
  assert.strictEqual(triple.fullness, 2.4);
  // the fuller heading takes at least as much fabric across the same track
  assert.ok(triple.flatCm >= eyelet.flatCm);
  assert.strictEqual(triple.headingAllowCm, 15);
});

test("explicit fullness overrides the heading default", function () {
  var r = D.plan({ track: { width: 2, unit: "m" }, drop: { value: 2, unit: "m" }, heading: "pencil", fullness: 3 });
  assert.strictEqual(r.fullness, 3);
});

test("cut drop = finished drop + heading turn + hem", function () {
  var r = D.plan({ track: { width: 2, unit: "m" }, drop: { value: 220, unit: "cm" }, heading: "pencil", hem: 15 });
  // pencil heading allowance is 10, hem 15 -> 220 + 25 = 245, no pattern
  assert.strictEqual(r.cutDropCm, 245);
});

test("pattern repeat rounds each cut drop up to a whole repeat", function () {
  var plain = D.plan({ track: { width: 2, unit: "m" }, drop: { value: 220, unit: "cm" }, heading: "pencil", hem: 15 });
  var patterned = D.plan({ track: { width: 2, unit: "m" }, drop: { value: 220, unit: "cm" }, heading: "pencil", hem: 15, repeat: 32, repeatUnit: "cm" });
  // plain cut drop 245; with a 32 cm repeat: ceil(245/32)=8 -> 256 cm
  assert.strictEqual(plain.cutDropCm, 245);
  assert.strictEqual(patterned.cutDropCm, 256);
  assert.strictEqual(patterned.patternRounded, true);
  assert.ok(patterned.totalM > plain.totalM);
});

test("returns and overlap add to the flat fabric needed", function () {
  var bare = D.plan({ track: { width: 2, unit: "m" }, drop: { value: 2, unit: "m" }, heading: "pencil", returnEach: 0, overlap: 0 });
  var wrapped = D.plan({ track: { width: 2, unit: "m" }, drop: { value: 2, unit: "m" }, heading: "pencil", returnEach: 7, overlap: 10 });
  assert.strictEqual(wrapped.flatCm, bare.flatCm + 7 * 2 + 10);
});

test("lining is cut shorter than the face fabric and has the same widths", function () {
  var r = D.plan({ track: { width: 3, unit: "m" }, drop: { value: 2, unit: "m" }, heading: "pencil", repeat: 40, repeatUnit: "cm", lining: true });
  assert.ok(r.lining);
  assert.strictEqual(r.lining.widths, r.widths);
  assert.ok(r.lining.cutDropCm < r.cutDropCm); // no repeat, smaller turns
});

test("total metres = widths x cut drop, and price costs it", function () {
  var r = D.plan({ track: { width: 2.4, unit: "m" }, drop: { value: 2, unit: "m" }, heading: "pencil", fullness: 2.2, price: 20, priceUnit: "m", overlap: 0, returnEach: 0 });
  var expectCm = r.widths * r.cutDropCm;
  assert.strictEqual(r.totalCm, expectCm);
  assert.strictEqual(r.cost, D.round2(r.totalM * 20));
});

test("bad input is reported, not guessed", function () {
  assert.strictEqual(D.plan({ track: { width: 0, unit: "m" }, drop: { value: 2, unit: "m" } }).reason, "bad-track");
  assert.strictEqual(D.plan({ track: { width: 2, unit: "m" }, drop: { value: "", unit: "m" } }).reason, "bad-drop");
  assert.strictEqual(D.plan({ track: { width: 2, unit: "m" }, drop: { value: 2, unit: "m" }, fabricWidth: 0 }).reason, "bad-fabric");
});

test("pack / unpack round-trips the form state", function () {
  var s = { tw: "2.4", twu: "m", dr: "2.1", dru: "m", head: "pencil", pair: true };
  assert.deepStrictEqual(D.unpack(D.pack(s)), s);
  assert.strictEqual(D.unpack("not valid!!"), null);
});

test("wide fabric (280 cm) needs fewer widths than 137 cm", function () {
  var narrow = D.plan({ track: { width: 3, unit: "m" }, drop: { value: 2, unit: "m" }, heading: "pencil", fabricWidth: 137 });
  var wide = D.plan({ track: { width: 3, unit: "m" }, drop: { value: 2, unit: "m" }, heading: "pencil", fabricWidth: 280 });
  assert.ok(wide.widths <= narrow.widths);
});
