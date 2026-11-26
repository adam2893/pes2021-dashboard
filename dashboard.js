// Evidence-first view of the generated summary. No external dependencies or HTML injection.
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const el = (tag, cls, value) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined && value !== null) node.textContent = String(value);
    return node;
  };
  const add = (parent, ...kids) => { kids.forEach(child => parent.appendChild(child)); return parent; };
  const format = value => Number(value || 0).toLocaleString("en-US");
  const section = (host, id, title, caption) => {
    const head = el("div", "section-title");
    const h = el("h2", null, title); h.id = id;
    add(head, h, el("span", "section-index", caption));
    host.appendChild(head);
  };
  const clamped = value => Math.max(0, Math.min(100, Number(value) || 0));
  function segments(percent, upper, colour, label, total = 64) {
    const row = el("div", "segments");
    row.style.setProperty("--segments", total);
    row.setAttribute("role", "img");
    row.setAttribute("aria-label", label);
    const lo = Math.round(clamped(percent) / 100 * total);
    const hi = Math.round(clamped(upper ?? percent) / 100 * total);
    for (let i = 0; i < total; i++) row.appendChild(el("i", i < lo ? colour : i < hi ? "soft" : ""));
    return row;
  }
  function progress(host, name, value, label, colour, upper) {
    const item = el("div");
    const top = el("div", "progress-head");
    add(top, el("strong", null, name), el("span", "progress-count", label));
    add(item, top, segments(value, upper, colour, name + ": " + label));
    host.appendChild(item);
    return item;
  }
  function stat(host, label, value, detail) {
    const node = el("div", "stat");
    add(node, el("div", "stat-label", label), el("div", "stat-value", value), el("div", "stat-caption", detail));
    host.appendChild(node);
  }
  function render(d) {
    const headline = d.headline || {};
    const range = Array.isArray(headline.sim_percent) ? headline.sim_percent : [0, 0];
    const lo = clamped(range[0]), hi = clamped(range[1]);
    const counts = d.counts || {};
    const exact = (counts.port_rows_by_fidelity || {}).exact || 0;
    const ports = counts.port_rows_total || 0;
    $("date-stamp").textContent = "DATA SNAPSHOT " + (d.updated || "UNKNOWN");

    let host = $("headline");
    section(host, "h-head", "Project overview", "01 / ESTIMATES, NOT COVERAGE");
    const overview = el("div", "overview");
    const left = el("div", "hero-panel");
    add(left, el("div", "eyebrow", "Master League simulation rules"),
      el("div", "range-label", lo + "–" + hi + "%"));
    const p1 = el("div"); p1.style.marginTop = "16px";
    progress(p1, "Estimated simulation completeness", lo, lo + "–" + hi + "%", "partial", hi);
    add(left, p1, el("p", "note", headline.note || "Completion figures are estimates, not measured reconstruction coverage."));
    const right = el("div", "panel score-stack");
    add(right, el("div", "eyebrow", "Entire Master League mode"));
    progress(right, "Whole-mode estimate", headline.mode_percent || 0,
      "≈" + (headline.mode_percent || 0) + "%", "partial");
    const caution = el("p", "note", "The whole mode includes user interfaces, negotiation, news, saving and other features beyond the simulation rules.");
    right.appendChild(caution);
    const legend = el("div", "legend");
    for (const [cls, name] of [["exact", "Exact on tested inputs"], ["partial", "Partial / behavioural"], ["blocked", "Blocked"], ["", "Outstanding"]]) {
      const key = el("span", "key"); add(key, el("i", "swatch " + cls), el("span", null, name)); legend.appendChild(key);
    }
    right.appendChild(legend);
    add(overview, left, right); host.appendChild(overview);

    host = $("stats");
    section(host, "h-stats", "Research at a glance", "02 / PUBLISHED DATABASE");
    const metrics = el("div", "stats");
    stat(metrics, "Named addresses", format(counts.named_addresses), "Identity, not implementation");
    stat(metrics, "Port inventory", format(ports), "Tracked port rows");
    stat(metrics, "Exact-labelled ports", format(exact), "Recorded fidelity classification");
    stat(metrics, "Automated tests", format(counts.tests), "Count reported in snapshot");
    host.appendChild(metrics);
    const caution2 = el("p", "smallnote", "An exact fidelity label is not necessarily independent differential verification. The published port inventory is not a denominator for the entire executable.");
    host.appendChild(caution2);

    host = $("areas");
    section(host, "h-areas", "System reconstruction", "03 / REPORTED FIDELITY");
    const areas = el("div", "areas");
    (d.areas || []).forEach(area => {
      const card = el("article", "area");
      const top = el("div", "area-top");
      const label = area.status === "exact" ? "exact on checks" : area.status === "mixed" ? "mixed" : "behavioural";
      add(top, el("h3", null, area.name), el("span", "tag " + area.status, label));
      add(card, top, el("p", null, area.text)); areas.appendChild(card);
    });
    host.appendChild(areas);

    host = $("checks");
    section(host, "h-checks", "Independent verification", "04 / REFERENCE COMPARISONS");
    host.appendChild(el("p", "smallnote", (d.checks || {}).intro));
    const grid = el("div", "checks");
    ((d.checks || {}).items || []).forEach(item => {
      const row = el("div", "check");
      add(row, el("strong", null, item.value), el("span", null, item.label)); grid.appendChild(row);
    });
    host.appendChild(grid);

    host = $("match");
    section(host, "h-match", "Cross-version research", "05 / NARROW CHECKS");
    const metricsData = d.match_metrics || {};
    Object.values(metricsData).forEach(item => {
      if (!item || !Number.isFinite(Number(item.total))) return;
      const row = el("div", "track");
      const top = el("div", "track-head");
      const matched = Number(item.matched || 0), total = Number(item.total || 0);
      add(top, el("strong", null, item.label), el("span", "track-value", format(matched) + " / " + format(total)));
      add(row, top, el("p", "track-text", (item.scope || "") + (item.as_of ? " · " + item.as_of : "")),
        segments(total ? 100 * matched / total : 0, null, "exact", matched + " of " + total + " matches"));
      host.appendChild(row);
    });

    host = $("left");
    section(host, "h-left", "Open work and limitations", "06 / TRACKED OBLIGATIONS");
    const groups = el("div", "left-grid");
    (d.left || []).forEach(group => {
      const card = el("div", "left-group");
      add(card, el("h3", null, group.group));
      const ul = el("ul");
      (group.items || []).forEach(item => add(ul, el("li", null, item)));
      add(card, ul); groups.appendChild(card);
    });
    host.appendChild(groups);

    host = $("timeline");
    section(host, "h-time", "Development history", "07 / REPORTED MILESTONES");
    const timeline = el("div", "timeline");
    (d.timeline || []).slice().reverse().forEach(item => {
      const card = el("article", "event");
      const time = el("time", null, item.date); time.dateTime = item.date;
      add(card, time, el("b", null, item.title), el("p", null, item.text)); timeline.appendChild(card);
    });
    host.appendChild(timeline);
    $("footer").textContent = "Data updated " + (d.updated || "unknown") +
      " · Source: project-published summary.json and data.json · Counts and classifications are scoped to their stated tests.";
  }
  function fail() {
    const err = $("error"); err.hidden = false;
    err.textContent = "Could not load the published summary data. Run this site through a web server rather than opening the HTML file directly.";
  }
  // The generator embeds a snapshot between the SUMMARY markers; honour it to
  // preserve its existing deployment workflow and provide an offline fallback.
  const inline = $("summary-data");
  if (inline && inline.textContent.trim()) {
    try { render(JSON.parse(inline.textContent)); return; } catch (_) {}
  }
  fetch("summary.json").then(response => {
    if (!response.ok) throw Error("HTTP " + response.status);
    return response.json();
  }).then(render).catch(fail);
})();
