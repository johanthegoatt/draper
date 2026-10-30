// Draper page glue: read the form, run the engine in core.js, draw the plan,
// keep the share link in sync, and tell Bobbin what's going on. All the real
// work lives in core.js so it can be tested without a browser.
(function () {
  "use strict";
  var D = window.Draper;
  var $ = function (id) { return document.getElementById(id); };

  var ids = ["track-w", "track-unit", "drop", "drop-unit", "heading", "fullness",
    "fabric-w", "repeat", "pair", "lining", "price"];
  var el = {};
  ids.forEach(function (id) { el[id] = $(id); });
  var out = $("out");

  function readState() {
    return {
      tw: el["track-w"].value.trim(), twu: el["track-unit"].value,
      dr: el.drop.value.trim(), dru: el["drop-unit"].value,
      head: el.heading.value, full: el.fullness.value.trim(),
      fw: el["fabric-w"].value.trim(), rep: el.repeat.value.trim(),
      pair: el.pair.checked, lining: el.lining.checked, price: el.price.value.trim()
    };
  }

  function writeState(s) {
    if (!s) return;
    if (s.tw != null) el["track-w"].value = s.tw;
    if (s.twu) el["track-unit"].value = s.twu;
    if (s.dr != null) el.drop.value = s.dr;
    if (s.dru) el["drop-unit"].value = s.dru;
    if (s.head) el.heading.value = s.head;
    if (s.full != null) el.fullness.value = s.full;
    if (s.fw != null) el["fabric-w"].value = s.fw;
    if (s.rep != null) el.repeat.value = s.rep;
    if (typeof s.pair === "boolean") el.pair.checked = s.pair;
    if (typeof s.lining === "boolean") el.lining.checked = s.lining;
    if (s.price != null) el.price.value = s.price;
  }

  function m(cm) { return (Math.round(cm) / 100).toFixed(2) + " m"; }

  function cell(k, v, big) {
    return '<div class="cell' + (big ? " big" : "") + '"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>';
  }

  function render(r) {
    if (!r || !r.ok) {
      var msg = r && r.reason === "bad-drop" ? "Enter the finished drop (the length you want)."
        : r && r.reason === "bad-fabric" ? "Enter the fabric width."
        : "Fill in the track width and the drop to start.";
      out.innerHTML = '<div class="result bad"><h3>Can\'t work that out yet</h3><p class="msg">' + msg + '</p></div>';
      return "bad";
    }

    var tag = r.widths > (r.pair ? 2 : 1)
      ? '<span class="seam warn">joins widths together</span>'
      : '<span class="seam good">single width, no joins</span>';

    var grid =
      cell("Order", r.totalM + " m", true) +
      cell(r.pair ? "Widths (pair)" : "Widths", r.widths) +
      cell("Cut each", m(r.cutDropCm)) +
      (r.cost != null ? cell("Rough cost", r.cost) : "");

    var liningBlock = "";
    if (r.lining) {
      liningBlock =
        '<div class="result">' +
          '<h3>Lining</h3>' +
          '<div class="grid">' +
            cell("Order", r.lining.totalM + " m", true) +
            cell("Widths", r.lining.widths) +
            cell("Cut each", m(r.lining.cutDropCm)) +
            (r.liningCost != null ? cell("Rough cost", r.liningCost) : "") +
          '</div>' +
          '<p class="opt-sub">Lining is cut to the same widths but a little shorter, with no pattern to match, so it hangs just above the hem.</p>' +
        '</div>';
    }

    var advice = '<ul class="advice">' + r.advice.map(function (a) { return "<li>" + a + "</li>"; }).join("") + "</ul>";

    out.innerHTML =
      '<div class="result">' +
        '<h3>' + r.headingLabel + ' · ' + (r.pair ? "a pair" : "one curtain") + ' · ' + r.fullness + '× fullness</h3>' +
        '<div class="opt pick">' +
          '<div class="opt-h">Face fabric' + tag + '</div>' +
          '<div class="grid">' + grid + '</div>' +
          '<p class="opt-sub">' + r.widths + (r.widths === 1 ? " width" : " widths") + ' of the ' + r.fabricCm +
          ' cm roll' + (r.pair ? ", " + r.widthsPerCurtain + " per curtain" : "") +
          '. Made up it gathers to about ' + r.madeFullness + '× the track.</p>' +
        '</div>' +
      '</div>' +
      liningBlock +
      '<div class="result"><h3>Making it up</h3>' + advice + '</div>';

    if (r.widths > (r.pair ? 2 : 1)) return "seam";
    if (r.patternRounded && r.repeatCm >= 40) return "big";
    return "tidy";
  }

  function fullnessUnit() { return el["track-unit"].value; }

  function recompute() {
    var s = readState();
    var r = D.plan({
      track: { width: s.tw, unit: s.twu },
      drop: { value: s.dr, unit: s.dru },
      heading: s.head,
      fullness: s.full === "" ? undefined : parseFloat(s.full),
      fabricWidth: s.fw === "" ? 137 : parseFloat(s.fw), fabricUnit: "cm",
      repeat: s.rep === "" ? 0 : parseFloat(s.rep), repeatUnit: "cm",
      pair: s.pair, lining: s.lining,
      returnEach: s.pair ? 7 : 0, overlap: s.pair ? 10 : 0,
      price: s.price, priceUnit: "m"
    });
    var kind = render(r);
    if (window.Bobbin && r.ok) window.Bobbin.react(kind);
    syncLink(s);
  }

  var linkState = "";
  function syncLink(s) {
    linkState = D.pack(s);
    try { history.replaceState(null, "", "#" + linkState); } catch (e) { /* ignore */ }
  }

  $("share").addEventListener("click", function () {
    var url = location.origin + location.pathname + "#" + linkState;
    var done = $("share-done");
    function ok() { done.textContent = "Link copied"; setTimeout(function () { done.textContent = ""; }, 2500); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, function () { done.textContent = url; });
    else { done.textContent = url; }
  });

  // Show the heading's note and prefill a sensible fullness when the heading
  // changes, but never fight a number the user has typed in.
  var lastHeadingFullness = "";
  function onHeading(prefill) {
    var h = D.HEADINGS[el.heading.value] || D.HEADINGS.pencil;
    $("heading-note").textContent = h.note;
    if (prefill && (el.fullness.value.trim() === "" || el.fullness.value.trim() === lastHeadingFullness)) {
      el.fullness.value = h.fullness;
    }
    lastHeadingFullness = String(h.fullness);
  }

  // Tips follow where the eye is.
  ["track-w", "track-unit", "drop", "drop-unit", "pair"].forEach(function (id) {
    el[id].addEventListener("focus", function () { if (window.Bobbin) window.Bobbin.context("track"); });
  });
  ["heading", "fullness", "fabric-w"].forEach(function (id) {
    el[id].addEventListener("focus", function () { if (window.Bobbin) window.Bobbin.context("heading"); });
  });
  el.repeat.addEventListener("focus", function () { if (window.Bobbin) window.Bobbin.context("pattern"); });

  el.heading.addEventListener("change", function () { onHeading(true); recompute(); });

  ids.forEach(function (id) {
    el[id].addEventListener("input", recompute);
    el[id].addEventListener("change", recompute);
  });

  // Open on a shared link if there is one, otherwise a sensible starting point.
  var frag = location.hash.replace(/^#/, "");
  var initial = frag ? D.unpack(frag) : null;
  if (initial) { writeState(initial); }
  onHeading(!initial);
  recompute();
})();
