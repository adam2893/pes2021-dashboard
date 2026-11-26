// Research explorer for the public generated data.json.
(async () => {
  "use strict";
  const mount = document.getElementById("research");
  if (!mount) return;
  const make = (tag, cls, value) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined && value !== null) node.textContent = String(value);
    return node;
  };
  const add = (parent, ...children) => { children.forEach(c => parent.appendChild(c)); return parent; };
  const fmt = n => Number(n).toLocaleString("en-US");
  const heading = make("div", "section-title");
  const title = make("h2", null, "Function reconstruction map");
  title.id = "h-research";
  add(heading, title, make("span", "section-index", "08 / PUBLISHED RESEARCH INVENTORY"));
  mount.appendChild(heading);
  mount.appendChild(make("p", "smallnote",
    "One cell per named function in the published research subset (plus any separately listed ports). " +
    "Green and amber reflect the port inventory's fidelity label, not independent verification of every function. " +
    "Grey means named without a recorded port; it does not mean the function was never implemented."));

  const controls = make("div", "research-controls");
  const search = make("input");
  search.type = "search";
  search.placeholder = "Search address, function or evidence";
  search.setAttribute("aria-label", "Search functions and research");
  const subsys = make("select");
  subsys.setAttribute("aria-label", "Filter by inferred subsystem");
  const fidelity = make("select");
  fidelity.setAttribute("aria-label", "Filter by fidelity");
  const kind = make("select");
  kind.setAttribute("aria-label", "Research record type");
  const option = (select, value, label) => { const o = make("option", null, label); o.value = value; select.appendChild(o); };
  option(subsys, "all", "All subsystems");
  for (const name of ["Master League", "Competition", "Match", "Player", "Platform", "Other"]) option(subsys, name, name);
  for (const [v,t] of [["all","All labels"],["exact","Exact-labelled"],["behavioural","Behavioural"],["other","Other ports"],["named","Named only"]]) option(fidelity,v,t);
  for (const [v,t] of [["functions","Functions & ports"],["findings","Research findings"],["data","Data seeds"]]) option(kind,v,t);
  add(controls, search, subsys, fidelity, kind);
  mount.appendChild(controls);
  const metrics = make("div", "research-metrics");
  const grid = make("div", "coverage-grid");
  grid.setAttribute("aria-label", "Clickable map of recorded functions");
  const note = make("p", "coverage-note");
  const detail = make("div", "panel");
  detail.setAttribute("aria-live", "polite");
  const list = make("div", "research-list");
  const pager = make("div", "research-pager");
  const prev = make("button", null, "Previous");
  const next = make("button", null, "Next");
  const pageText = make("span");
  add(pager, prev, pageText, next);
  add(mount, metrics, grid, note, detail, list, pager);

  function category(value) {
    const s = (value || "").toLowerCase();
    if (/\bml\b|master.?league|career|season.switch|transfer|renewal|retire|youth|squad/.test(s)) return "Master League";
    if (/competition|fixture|league|cup|tournament|regulation/.test(s)) return "Competition";
    if (/match|lineup|ball|physics|referee|foul|goalkeeper|dribbl|animation/.test(s)) return "Match";
    if (/player|develop|condition|stamina|injury|ability/.test(s)) return "Player";
    if (/platform|render|dx|vulkan|archive|texture|file|memory|script/.test(s)) return "Platform";
    return "Other";
  }
  function stat(label,value,caption) {
    const root = make("div", "stat");
    add(root, make("div", "stat-label", label), make("div", "stat-value", fmt(value)), make("div", "stat-caption", caption));
    return root;
  }
  function showDetail(record) {
    detail.replaceChildren();
    add(detail, make("div", "eyebrow", record.group + " / " + record.state),
      make("h3", "mono", record.name + " · " + record.address),
      make("p", "smallnote", record.description || "No public evidence excerpt recorded."));
    if (record.source) detail.appendChild(make("p", "research-meta", "Source: " + record.source));
  }

  try {
    const response = await fetch("data.json", {cache:"no-store"});
    if (!response.ok) throw Error("HTTP " + response.status);
    const data = await response.json();
    const byAddress = new Map();
    (data.functions || []).forEach(f => {
      const key = String(f.address || "").toLowerCase();
      if (!key) return;
      byAddress.set(key, {
        address:f.address, name:f.name || "Unnamed", state:"named", group:category((f.name || "") + " " + (f.source || "")),
        description:[f.confidence ? "Confidence: " + f.confidence : "", f.reviewed === "yes" ? "Reviewed" : "Not marked reviewed", f.evidence].filter(Boolean).join(" · "),
        source:f.source || ""
      });
    });
    (data.ports || []).forEach(p => {
      const key = String(p.address || "").toLowerCase();
      if (!key) return;
      const f = byAddress.get(key);
      const state = p.fidelity === "exact" ? "exact" : p.fidelity === "behavioural" ? "behavioural" : "other";
      const item = f || { address:p.address, name:p.implementation || "Port record" };
      Object.assign(item, {
        state, group:category((p.implementation || "") + " " + (f?.name || "")),
        description:[p.status, "Fidelity label: " + (p.fidelity || "unclassified"),p.implementation,p.evidence].filter(Boolean).join(" · "),
        source:p.source || (f?.source || "")
      });
      byAddress.set(key,item);
    });
    const records = [...byAddress.values()].sort((a,b) => a.address.localeCompare(b.address));
    const findings = (data.findings || []).map(f => ({
      name:f.title || "Finding", address:f.date || "",description:f.body || "",source:"Research findings",state:"finding",group:"Research"
    }));
    const seeds = (data.data_seeds || []).map(f => ({
      name:[f.field1,f.field2,f.field3].filter(Boolean).join(" · ") || "Data record",
      address:f.address || "",description:f.evidence || "",source:f.source || "Data seeds",state:"data",group:"Data"
    }));
    metrics.replaceChildren();
    add(metrics,
      stat("Named only",records.filter(r=>r.state==="named").length,"No port linked here"),
      stat("Exact-labelled",records.filter(r=>r.state==="exact").length,"Port fidelity metadata"),
      stat("Behavioural",records.filter(r=>r.state==="behavioural").length,"Port fidelity metadata"),
      stat("Recorded functions",records.length,"Published inventory subset"));

    let page=0;
    const size=25;
    const matches = r => {
      if (subsys.value!=="all" && r.group!==subsys.value && kind.value==="functions") return false;
      if (fidelity.value!=="all" && r.state!==fidelity.value && kind.value==="functions") return false;
      const q=search.value.trim().toLowerCase();
      return !q || [r.name,r.address,r.description,r.source,r.group,r.state].join(" ").toLowerCase().includes(q);
    };
    function render() {
      const pool = kind.value==="functions" ? records : kind.value==="findings" ? findings : seeds;
      const filtered=pool.filter(matches);
      note.textContent = fmt(filtered.length) + " matching " + (kind.value==="functions" ? "function records" : "research records") +
        ". Subsystems are inferred from public names and implementation paths; classifications may be incomplete.";
      grid.hidden = kind.value!=="functions";
      detail.hidden = kind.value!=="functions";
      if (kind.value==="functions") {
        grid.replaceChildren();
        filtered.forEach(r=>{
          const btn=make("button","coverage-cell " + r.state);
          btn.type="button";
          btn.title=r.name + " · " + r.address + " · " + r.state;
          btn.setAttribute("aria-label",btn.title);
          btn.addEventListener("click",()=>showDetail(r));
          grid.appendChild(btn);
        });
        if (filtered.length) showDetail(filtered[0]);
        else detail.replaceChildren(make("p","smallnote","No matching function records."));
      }
      const pages=Math.max(1,Math.ceil(filtered.length/size));
      page=Math.min(page,pages-1);
      list.replaceChildren();
      filtered.slice(page*size,(page+1)*size).forEach(r=>{
        const article=make("article","research-entry");
        add(article,make("h3",null,r.name + " · " + r.address),
          make("p","research-meta",r.group + " · " + r.state),
          make("p",null,r.description));
        list.appendChild(article);
      });
      pageText.textContent="Page " + (page+1) + " of " + pages;
      prev.disabled=page<=0;
      next.disabled=page>=pages-1;
    }
    [search,subsys,fidelity,kind].forEach(control=>control.addEventListener(control===search?"input":"change",()=>{page=0;render();}));
    prev.addEventListener("click",()=>{page--;render();});
    next.addEventListener("click",()=>{page++;render();});
    render();
  } catch (error) {
    metrics.replaceChildren(make("p","notice","Research database unavailable: " + error.message));
    grid.hidden=true;detail.hidden=true;pager.hidden=true;
  }
})();
