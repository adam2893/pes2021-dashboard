// Renders summary.json. All text is inserted with textContent (no innerHTML).
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text, kids) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    (kids || []).forEach(function (k) { e.appendChild(k); });
    return e;
  }
  function heading(id, text) { var h = el("h2", null, text); h.id = id; return h; }
  function bar(lo, hi, label) {
    var b = el("div", "bar"); b.setAttribute("role", "img"); b.setAttribute("aria-label", label);
    b.appendChild(el("i", "range")).style.width = hi + "%";
    b.appendChild(el("i")).style.width = lo + "%";
    return b;
  }
  var n = function (x) { return Number(x).toLocaleString("en-US"); };

  function render(d) {
    var h = d.headline, lo = h.sim_percent[0], hi = h.sim_percent[1];
    var s = $("headline");
    s.appendChild(heading("h-head", "Where it stands"));
    s.appendChild(el("div", "big", null, [
      el("div", null, null, [el("strong", null, lo + " to " + hi + " %"),
        el("span", null, "of the Master League simulation logic is done (estimate)"),
        bar(lo, hi, "Simulation logic " + lo + " to " + hi + " percent")]),
      el("div", null, null, [el("strong", null, "about " + h.mode_percent + " %"),
        el("span", null, "of the whole Master League mode is done (estimate)"),
        bar(h.mode_percent, h.mode_percent, "Whole mode about " + h.mode_percent + " percent")])]));
    s.appendChild(el("p", "muted", h.note));

    s = $("areas");
    s.appendChild(heading("h-areas", "What works today"));
    s.appendChild(el("p", "muted", "Exact means it matches the real game on everything we checked. Approximate means it behaves plausibly but does not match number for number."));
    var dl = el("dl", "areas");
    d.areas.forEach(function (a) {
      dl.appendChild(el("div", null, null, [
        el("dt", null, a.name, [el("span", "tag " + a.status, a.status)]), el("dd", null, a.text)]));
    });
    s.appendChild(dl);

    s = $("checks");
    s.appendChild(heading("h-checks", "How we check it"));
    s.appendChild(el("p", null, d.checks.intro));
    var g = el("div", "checks");
    d.checks.items.forEach(function (c) { g.appendChild(el("div", null, null, [el("b", null, c.value), el("span", "muted", c.label)])); });
    s.appendChild(g);

    s = $("left");
    s.appendChild(heading("h-left", "What is left"));
    var cols = el("div", "cols");
    d.left.forEach(function (c) {
      var ul = el("ul");
      c.items.forEach(function (i) { ul.appendChild(el("li", null, i)); });
      cols.appendChild(el("h3", null, c.group)); cols.appendChild(ul);
    });
    s.appendChild(cols);

    s = $("timeline");
    s.appendChild(heading("h-time", "Timeline"));
    var ol = el("ol", "tl");
    d.timeline.slice().reverse().forEach(function (t) {
      var tm = el("time", null, t.date); tm.setAttribute("datetime", t.date);
      ol.appendChild(el("li", null, null, [tm, el("b", null, t.title), el("span", null, t.text)]));
    });
    s.appendChild(ol);

    var c = d.counts, p = c.port_rows_by_status;
    $("footer").textContent = "Last updated " + d.updated + ". " + n(c.named_addresses) + " addresses named, " +
      n(c.tests) + " automated tests, " + n(c.port_rows_total) + " rebuilt routines (" + n(p.reimplemented) +
      " reimplemented, " + n(p["in host"]) + " running in the host program), " + n(c.findings_entries) + " notebook entries.";
  }

  var inline = $("summary-data");
  if (inline && inline.textContent.trim()) { try { render(JSON.parse(inline.textContent)); return; } catch (e) { /* fall through to fetch */ } }
  fetch("summary.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(render)
    .catch(function () {
      var e = $("error"); e.hidden = false;
      e.textContent = "Could not load summary.json. If you opened this file directly, serve the folder instead (python3 -m http.server).";
    });
})();
