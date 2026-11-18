// Public research explorer. Renders text as text, never as HTML.
(async function () {
  const mount = document.getElementById('research');
  if (!mount) return;
  const heading = document.createElement('h2');
  heading.textContent = 'Open reverse-engineering research';
  mount.appendChild(heading);
  const note = document.createElement('p');
  note.textContent = 'Search function names, addresses, evidence and dated research findings. Confidence labels distinguish hypotheses from verified behaviour.';
  mount.appendChild(note);
  const input = document.createElement('input');
  input.type = 'search';
  input.placeholder = 'Search functions, addresses or findings';
  input.setAttribute('aria-label', 'Search research database');
  input.style.cssText = 'width:100%;padding:.75rem;margin:1rem 0;border:1px solid #888;border-radius:6px;background:transparent;color:inherit';
  mount.appendChild(input);
  const counts = document.createElement('p');
  mount.appendChild(counts);
  const list = document.createElement('div');
  mount.appendChild(list);
  function entry(title, description) {
    const box = document.createElement('article');
    box.style.cssText = 'border-bottom:1px solid #9995;padding:1rem 0;overflow-wrap:anywhere';
    const h = document.createElement('h3');
    h.textContent = title;
    box.appendChild(h);
    const p = document.createElement('p');
    p.textContent = description;
    box.appendChild(p);
    return box;
  }
  try {
    const response = await fetch('data.json', {cache:'no-store'});
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    const records = [
      ...(data.functions || []).map(f => ({title: f.name + ' · ' + f.address,
        body: [f.confidence, f.reviewed === 'yes' ? 'reviewed' : 'not reviewed', f.evidence, f.source].filter(Boolean).join(' · ')})),
      ...(data.ports || []).map(p => ({title: 'Port · ' + p.address,
        body: [p.status, p.fidelity, p.implementation, p.evidence].filter(Boolean).join(' · ')})),
      ...(data.data_seeds || []).map(d => ({title: 'Data · ' + d.address,
        body: [d.field1, d.field2, d.field3, d.evidence].filter(Boolean).join(' · ')})),
      ...(data.findings || []).map(f => ({title: f.date + ' · ' + f.title, body: f.body}))
    ];
    function render() {
      const query = input.value.trim().toLowerCase();
      const matches = query ? records.filter(r => (r.title + ' ' + r.body).toLowerCase().includes(query)) : records;
      list.replaceChildren();
      counts.textContent = matches.length + ' matching records (' + records.length + ' total); showing first 100';
      matches.slice(0,100).forEach(r => list.appendChild(entry(r.title, r.body)));
    }
    input.addEventListener('input', render);
    render();
  } catch (err) {
    counts.textContent = 'Research data unavailable: ' + err.message;
  }
})();
