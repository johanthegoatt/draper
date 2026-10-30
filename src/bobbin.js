// Bobbin, the spool of thread who helps you measure up. Bobbin offers a tip
// when tapped, smiles when a plan comes out tidy, looks thoughtful when there's
// a seam or a big pattern repeat, and unspools a little if you tap five times
// fast. Everything Bobbin says goes through the bubble's live region, so a
// screen reader hears it too. Moods are driven by the app, never on a timer of
// its own.
(function () {
  "use strict";
  var btn = document.getElementById("bobbin");
  var bubble = document.getElementById("bobbin-bubble");
  var dock = document.getElementById("bobbin-dock");
  var hide = document.getElementById("bobbin-hide");
  if (!btn) { window.Bobbin = { react: function () {}, context: function () {}, say: function () {} }; return; }

  var still = matchMedia("(prefers-reduced-motion: reduce)");
  var baseMood = "calm", tipKey = "start";
  var bubbleTimer = null, flashTimer = null, taps = [], tipAt = {};

  var TIPS = {
    start: [
      "Hi, I'm Bobbin! Tell me the track width and the drop and I'll work out the fabric.",
      "Measure the track or pole, not the window. The curtain sits on the track.",
      "Pick how the top is gathered first. A fuller heading needs more fabric across."
    ],
    track: [
      "Measure the pole from end to end, between the finials, or the whole track.",
      "A pair meets in the middle and wraps back to the wall at each end. I add a little for both.",
      "The drop is the finished length you want, measured with the track already up."
    ],
    heading: [
      "Pencil pleat and eyelet gather to about twice the track; pinch pleat a bit more.",
      "Not sure? Pencil pleat is the easy all-rounder and takes the middle amount of fabric.",
      "A wider fabric can mean fewer joins. It's worth asking what width the shop stocks."
    ],
    pattern: [
      "A patterned fabric cuts each drop to a whole repeat so the pattern lines up across joins.",
      "The bigger the repeat, the more you waste. A plain fabric wastes the least.",
      "Buy it all from one roll and one batch so the colour and pattern match."
    ],
    result: [
      "Buy a touch extra and keep the offcuts. Tie-backs and cushions love a leftover.",
      "Put any seam towards the outer edge, away from the leading edge you look at most.",
      "These are planning numbers. Check the fabric width with the shop before you cut."
    ]
  };

  function setMood(m) { btn.setAttribute("data-mood", m); }

  function say(text, ms) {
    if (dock.classList.contains("tucked")) return;
    bubble.textContent = text;
    bubble.classList.remove("pop"); void bubble.offsetWidth; bubble.classList.add("pop");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bubble.textContent = ""; }, ms || 7000);
  }

  function flash(m, ms) {
    setMood(m);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { setMood(baseMood); }, ms || 1500);
  }

  function tip() {
    var list = TIPS[tipKey] || TIPS.start;
    var i = tipAt[tipKey] || 0;
    say(list[i % list.length]);
    tipAt[tipKey] = i + 1;
  }

  function unspool() {
    if (still.matches) return;
    var rect = btn.getBoundingClientRect();
    for (var i = 0; i < 6; i++) {
      (function (n) {
        var s = document.createElement("span");
        s.className = "thread-fly";
        s.style.left = (rect.left + 22) + "px";
        s.style.top = (rect.top + 16) + "px";
        s.style.setProperty("--dx", (Math.random() * 150 - 75) + "px");
        s.style.setProperty("--dy", (-40 - Math.random() * 90) + "px");
        s.style.setProperty("--dr", (Math.random() * 500 - 250) + "deg");
        s.style.animationDelay = (n * 0.05) + "s";
        document.body.appendChild(s);
        setTimeout(function () { s.remove(); }, 1200);
      })(i);
    }
  }

  btn.addEventListener("click", function () {
    var now = Date.now();
    taps = taps.filter(function (t) { return now - t < 900; });
    taps.push(now);
    if (taps.length >= 5) { taps = []; unspool(); say("Wheee! Right, winding back on. Where were we?"); flash("happy"); return; }
    tip();
    flash("think", 900);
  });

  hide.addEventListener("click", function () {
    var tucked = dock.classList.toggle("tucked");
    hide.textContent = tucked ? "" : "tuck away";
    if (!tucked) { say("Back! Tap me any time for a tip."); }
  });

  // Eyes track the pointer a little, so Bobbin feels awake. Cheap, eyes only.
  if (!still.matches) {
    document.addEventListener("pointermove", function (e) {
      var r = btn.getBoundingClientRect();
      var dx = Math.max(-2, Math.min(2, (e.clientX - (r.left + r.width / 2)) / 60));
      var face = btn.querySelector(".bobbin-face");
      if (face) face.style.transform = "translateX(" + dx + "px)";
    }, { passive: true });
  }

  // Public hooks the page calls.
  window.Bobbin = {
    // Where the user is, so the next tip fits: "track", "heading", "pattern".
    context: function (key) { tipKey = TIPS[key] ? key : "start"; baseMood = "calm"; setMood(baseMood); },
    // React to a result: "tidy" (one width each), "seam" (joins), "big" (big
    // repeat eats fabric), "bad".
    react: function (kind) {
      tipKey = "result";
      if (kind === "tidy") { flash("happy"); say("Tidy. Each curtain is a single width, no joins to match."); }
      else if (kind === "seam") { flash("think"); say("This one joins widths together. Keep the seam towards the outer edge."); }
      else if (kind === "big") { flash("warn"); say("That's a big pattern repeat, so there's more waste on each drop."); }
      else if (kind === "bad") { flash("think"); say("I couldn't read those sizes. Check the numbers and units?"); }
    },
    say: say
  };

  setTimeout(function () { if (!dock.classList.contains("tucked")) say(TIPS.start[0]); }, 900);
})();
