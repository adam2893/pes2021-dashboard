/**
 * PES 2021 RE Dashboard - Main Application Module
 * Handles data loading, view rendering, search, and interactivity
 * Uses Blueprint theme variables
 */

export class Dashboard {
    constructor() {
        this.data = null;
        this.currentView = 'overview';
        this.searchQuery = '';
        this.coverageQuery = '';
        this.publicSummary = null;
        this.selectedWorkflowItem = null;
    }

    async init() {
        await this.loadData();
        await this.loadPublicSummary();
        this.setupEventListeners();
        this.renderCurrentView();
        this.updateLastUpdated();
    }

    async loadPublicSummary() {
        try {
            const response = await fetch('summary.json?v=20261113');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            this.publicSummary = await response.json();
        } catch (e) {
            console.warn('Current project summary unavailable; using the detailed dashboard snapshot.', e);
            this.publicSummary = null;
        }
    }

    async loadData() {
        try {
            const response = await fetch('data.json');
            this.data = await response.json();
            console.log('Data loaded:', {
                findings: this.data.findings?.length,
                seeds: Object.keys(this.data.seeds || {}).length,
                tests: this.data.cmake?.tests?.length,
                functions: this.data.functions_db?.count,
                milestones: this.data.milestones?.length
            });
        } catch (e) {
            console.error('Failed to load data:', e);
            this.showError('Failed to load dashboard data. Run `python3 docs/build_data.py` first.');
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchView(tab.dataset.view));
        });

        const searchInput = document.getElementById('global-search');
        let searchDebounce;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => {
                this.searchQuery = e.target.value.toLowerCase();
                this.renderCurrentView();
            }, 150);
        });

        this.setupViewFilters();
        document.getElementById('coverage-query')?.addEventListener('input', (event) => {
            this.coverageQuery = event.target.value.trim().toLowerCase();
            this.renderCoverage();
        });
        document.getElementById('coverage-status-filter')?.addEventListener('change', () => this.renderCoverage());
        document.addEventListener('keydown', (event) => {
            if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
                event.preventDefault();
                document.getElementById('global-search')?.focus();
            }
            if (event.key === 'Escape' && document.activeElement?.id === 'global-search') {
                document.getElementById('global-search').value = '';
                this.searchQuery = '';
                this.renderCurrentView();
            }
        });
    }

    setupViewFilters() {
        const findingsTrackFilter = document.getElementById('findings-track-filter');
        const findingsConfidenceFilter = document.getElementById('findings-confidence-filter');
        if (findingsTrackFilter) findingsTrackFilter.addEventListener('change', () => this.renderView('findings'));
        if (findingsConfidenceFilter) findingsConfidenceFilter.addEventListener('change', () => this.renderView('findings'));

        const namingSeedFilter = document.getElementById('naming-seed-filter');
        const namingConfidenceFilter = document.getElementById('naming-confidence-filter');
        if (namingSeedFilter) namingSeedFilter.addEventListener('change', () => this.renderView('naming'));
        if (namingConfidenceFilter) namingConfidenceFilter.addEventListener('change', () => this.renderView('naming'));

        const testCategoryFilter = document.getElementById('test-category-filter');
        if (testCategoryFilter) testCategoryFilter.addEventListener('change', () => this.renderView('tests'));

        const exportBtn = document.getElementById('export-naming');
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportNamingCSV());
    }

    switchView(viewName) {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === viewName);
            tab.setAttribute('aria-selected', tab.dataset.view === viewName);
        });

        document.querySelectorAll('.view').forEach(view => {
            view.classList.toggle('active', view.id === `view-${viewName}`);
        });

        this.currentView = viewName;
        this.renderCurrentView();
    }

    renderCurrentView() {
        this.renderView(this.currentView);
    }

    renderView(viewName) {
        if (!this.data) return;

        switch (viewName) {
            case 'overview': this.renderOverview(); break;
            case 'coverage': this.renderCoverage(); break;
            case 'findings': this.renderFindings(); break;
            case 'naming': this.renderNaming(); break;
            case 'tests': this.renderTests(); break;
            case 'milestones': this.renderMilestones(); break;
            case 'workflow': this.renderWorkflow(); break;
            case 'platforms': this.renderPlatforms(); break;
            case 'questions': this.renderQuestions(); break;
        }
    }

    renderCoverage() {
        const host = document.getElementById('coverage-content');
        if (!host) return;
        const summary = this.publicSummary;
        const counts = summary?.counts || {};
        const ports = counts.port_rows_by_status || {};
        const fidelity = counts.port_rows_by_fidelity || {};
        const matchMetrics = summary?.match_metrics || {};
        const checks = summary?.checks?.items || [];
        const areas = summary?.areas || [];
        const stamp = document.getElementById('summary-updated');
        if (stamp) stamp.textContent = summary?.updated ? `Source snapshot · ${summary.updated}` : 'Detailed archive snapshot';

        const statusFilter = document.getElementById('coverage-status-filter')?.value || '';
        const visibleAreas = areas.filter(area => !statusFilter || area.status === statusFilter);
        const pairedChecks = checks.filter(check => /\bof\b/.test(check.value)).length;
        const areasMarkup = visibleAreas.map(area => `
            <article class="coverage-area">
                <div class="coverage-area-top"><h4>${this.escapeHtml(area.name)}</h4><span class="state-tag ${this.escapeHtml(area.status)}">${this.escapeHtml(area.status)}</span></div>
                <p>${this.escapeHtml(area.text)}</p>
            </article>`).join('') || '<p class="empty-state">No subsystems match this status.</p>';
        const checkMarkup = checks.map(check => {
            const isComparison = /\bof\b/.test(check.value);
            return `<div class="validation-row ${isComparison ? 'comparison' : 'standalone'}"><strong>${this.escapeHtml(check.value)}</strong><span>${this.escapeHtml(check.label)}${isComparison ? '' : ' · standalone run, not a comparison'}</span></div>`;
        }).join('');

        const evidence = [];
        (summary?.timeline || []).forEach(entry => evidence.push({date: entry.date, title: entry.title, text: entry.text, source: 'Current project summary'}));
        areas.forEach(area => evidence.push({date: summary?.updated || '', title: area.name, text: area.text, source: 'Subsystem summary'}));
        checks.forEach(check => evidence.push({date: summary?.updated || '', title: check.value, text: check.label, source: 'Validation result'}));
        Object.entries(matchMetrics).forEach(([key, metric]) => evidence.push({date: metric.as_of || '', title: metric.label || key, text: `${metric.matched} of ${metric.total}. ${metric.scope || ''}`, source: 'Function / byte match record'}));
        (this.data?.findings || []).forEach(entry => evidence.push({date: entry.date, title: entry.title, text: entry.body, source: 'Detailed findings archive'}));
        const query = this.coverageQuery;
        const matching = query
            ? evidence.filter(item => `${item.title} ${item.text} ${item.date}`.toLowerCase().includes(query))
            : evidence.slice(0, 6);
        const evidenceMarkup = matching.slice(0, 10).map(item => `
            <article class="evidence-result">
                <div class="evidence-meta"><span>${this.escapeHtml(item.source)}</span><time>${this.escapeHtml(item.date)}</time></div>
                <h4>${this.escapeHtml(item.title)}</h4><p>${this.escapeHtml(item.text)}</p>
            </article>`).join('') || '<p class="empty-state">No evidence matches that search. Try a subsystem, validation name, or keyword.</p>';

        host.innerHTML = `
            <div class="coverage-intro">
                <div><p class="coverage-deck">A traceable view of what has been named, rebuilt, hosted and checked. Estimates, port records and measured comparisons are kept separate.</p>
                    <p class="coverage-caveat">${this.escapeHtml(summary?.headline?.note || 'Percentages are owner estimates, not measured test coverage.')}</p></div>
                <div class="coverage-estimates">
                    <div><span>Simulation scope</span><strong>${summary?.headline?.sim_percent?.[0] ?? '—'}–${summary?.headline?.sim_percent?.[1] ?? '—'}%</strong><small>owner estimate · not a test result</small></div>
                    <div><span>Whole mode scope</span><strong>${summary?.headline?.mode_percent ?? '—'}%</strong><small>owner estimate · not a test result</small></div>
                </div>
            </div>

            <section class="metric-ledger" aria-label="Function matching and port inventory">
                <div class="ledger-heading"><h3>Function & byte evidence</h3><span>Project summary · ${this.escapeHtml(summary?.updated || 'date unavailable')}</span></div>
                <div class="ledger-grid">
                    <div class="ledger-cell"><span>Named function addresses</span><strong>${counts.named_addresses ?? '—'}</strong><small>Curated unique addresses</small></div>
                    <div class="ledger-cell"><span>Port records</span><strong>${counts.port_rows_total ?? '—'}</strong><small>${ports.reimplemented ?? 0} reimplemented · ${ports['in host'] ?? 0} in host</small></div>
                    <div class="ledger-cell"><span>Fidelity targets</span><strong>${fidelity.exact ?? 0} / ${fidelity.behavioural ?? 0}</strong><small>Exact / behavioural labels</small></div>
                    <div class="ledger-cell"><span>Unique signatures found</span><strong>${matchMetrics.unique_signatures ? `${matchMetrics.unique_signatures.matched} / ${matchMetrics.unique_signatures.total}` : 'Not tracked'}</strong><small>${this.escapeHtml(matchMetrics.unique_signatures?.scope || 'Signature lookup result not recorded.')}</small></div>
                    <div class="ledger-cell"><span>Function-start address overlap</span><strong>${matchMetrics.function_start_overlap ? `${matchMetrics.function_start_overlap.matched} / ${matchMetrics.function_start_overlap.total}` : 'Not tracked'}</strong><small>${this.escapeHtml(matchMetrics.function_start_overlap?.scope || 'Cross-version address overlap not recorded.')}</small></div>
                    <div class="ledger-cell"><span>Version-comparator bytes</span><strong>${matchMetrics.version_comparator_bytes ? `${matchMetrics.version_comparator_bytes.matched} / ${matchMetrics.version_comparator_bytes.total}` : 'Not tracked'}</strong><small>${this.escapeHtml(matchMetrics.version_comparator_bytes?.scope || 'Version comparison byte count not recorded.')}</small></div>
                    <div class="ledger-cell not-measured"><span>Reconstructed functions verified</span><strong>Not tracked</strong><small>No aggregate count of ported functions proven equivalent to the target.</small></div>
                    <div class="ledger-cell not-measured"><span>AOT output bytes matched</span><strong>Not tracked</strong><small>No aggregate native-output byte comparison is recorded.</small></div>
                    <div class="ledger-cell not-measured"><span>Observed-block coverage</span><strong>No denominator</strong><small>The function catalogue is not runtime block coverage. Per-block hit counts are absent.</small></div>
                </div>
            </section>

            <section class="cycle-section" aria-labelledby="cycle-heading">
                <div class="ledger-heading"><h3 id="cycle-heading">Lift → build → verify</h3><span>${counts.findings_entries ?? '—'} dated notes · ${counts.port_rows_total ?? '—'} port records · ${pairedChecks} paired results</span></div>
                <div class="cycle-rail">
                    <article><span class="cycle-index">LIFT</span><h4>Observe on Windows x64</h4><p>Runtime snapshots and logged draws anchor target behavior. Coordination and evidence indexing happen on the MacBook Air M1.</p><b>${counts.findings_entries ?? '—'} dated findings</b></article>
                    <article><span class="cycle-index">BUILD</span><h4>Reconstruct in native C++</h4><p>Readable, buildable portable code, with no interpreter, JIT or Wine fallback.</p><b>${ports.reimplemented ?? 0} reimplemented · ${ports['in host'] ?? 0} in host</b></article>
                    <article><span class="cycle-index">VERIFY</span><h4>Compare against captures</h4><p>${this.escapeHtml(summary?.checks?.intro || 'Compare portable output with recorded target behavior.')}</p><b>${pairedChecks} paired result rows below</b></article>
                </div>
            </section>

            <section class="validation-section" aria-labelledby="validation-heading">
                <div class="ledger-heading"><h3 id="validation-heading">Differential validation</h3><span>Paired comparisons and standalone measurements are labelled</span></div>
                <div class="validation-list">${checkMarkup}</div>
            </section>

            <section class="areas-section" aria-labelledby="areas-heading">
                <div class="ledger-heading"><h3 id="areas-heading">Subsystem reconstruction status</h3><label class="filter-label" for="coverage-status-filter">Show <select id="coverage-status-filter" class="btn"><option value="">All statuses</option><option value="exact">Exact</option><option value="mixed">Mixed</option><option value="approximate">Approximate</option></select></label></div>
                <div class="areas-list">${areasMarkup}</div>
            </section>

            <section class="lane-section" aria-labelledby="lane-heading">
                <div class="ledger-heading"><h3 id="lane-heading">Research lanes</h3><span>MacBook Air M1 coordinates · Windows x64 executes and debugs authoritatively</span></div>
                <div class="lane-list"><div><b>A</b><strong>Data & formats</strong><span>Readers, tables and assets</span></div><div><b>B</b><strong>Oracle & lift</strong><span>Target observations and behavioral captures</span></div><div><b>C</b><strong>Portable host</strong><span>Native C++ ports and platform integration</span></div></div>
            </section>

            <section class="gaps-section" aria-labelledby="gaps-heading">
                <div class="ledger-heading"><h3 id="gaps-heading">Next gaps to close</h3><span>Current project work list</span></div>
                <div class="gap-columns">${(summary?.left || []).map(group => `<article><h4>${this.escapeHtml(group.group)}</h4><ul>${group.items.map(item => `<li>${this.escapeHtml(item)}</li>`).join('')}</ul></article>`).join('')}</div>
            </section>

            <section class="evidence-section" aria-labelledby="evidence-heading">
                <div class="ledger-heading"><h3 id="evidence-heading">Search evidence & notes</h3><span>${query ? `${matching.length} matches` : 'Latest summary and detailed archive'}</span></div>
                <label class="coverage-search"><span class="sr-only">Search project evidence and notes</span><input id="coverage-query" type="search" placeholder="Search checks, subsystem notes, findings…" value="${this.escapeHtml(this.coverageQuery)}"><kbd>/</kbd></label>
                <div class="evidence-results">${evidenceMarkup}</div>
                <p class="archive-note">Dated counts and validation results use the ${this.escapeHtml(summary?.updated || 'available')} project summary. The detailed findings archive is an earlier dashboard snapshot.</p>
            </section>
        `;

        const search = document.getElementById('coverage-query');
        search?.addEventListener('input', event => {
            this.coverageQuery = event.target.value.trim().toLowerCase();
            const position = event.target.selectionStart;
            this.renderCoverage();
            const nextSearch = document.getElementById('coverage-query');
            nextSearch?.focus();
            nextSearch?.setSelectionRange(position, position);
        });
        document.getElementById('coverage-status-filter')?.addEventListener('change', event => {
            const value = event.target.value;
            this.renderCoverage();
            const nextFilter = document.getElementById('coverage-status-filter');
            if (nextFilter) nextFilter.value = value;
        });
    }

    // ============ OVERVIEW ============
    renderOverview() {
        const statsContainer = document.getElementById('overview-stats');
        const timelineContainer = document.getElementById('recent-timeline');
        const trackProgressContainer = document.getElementById('track-progress');

        if (!statsContainer || !timelineContainer) return;

        const findings = this.data.findings || [];
        const milestones = this.data.milestones || [];
        const seeds = this.data.seeds || {};
        const summaryCounts = this.publicSummary?.counts || {};

        const totalSeeds = summaryCounts.named_addresses ?? Object.values(seeds).reduce((sum, arr) => sum + arr.length, 0);
        const totalTests = summaryCounts.tests ?? this.data.cmake?.tests?.length ?? 0;
        const noteCount = summaryCounts.findings_entries ?? findings.length;
        const scope = document.getElementById('project-scope');
        if (scope) scope.textContent = `${totalSeeds.toLocaleString()} named addresses · ${summaryCounts.port_rows_total ?? '—'} C++ port records · ${totalTests} defined tests · ${milestones.length} milestones · ${noteCount} dated findings`;

        statsContainer.innerHTML = `
            <article class="card">
                <div class="card-header">
                    <h3 class="card-title">Named addresses</h3>
                    <div class="card-meta"><span class="badge track-b">Track B</span></div>
                </div>
                <div class="card-body" style="font-size: 36px; font-weight: 700; font-family: var(--font-outlier); color: var(--color-accent);">
                    ${totalSeeds.toLocaleString()}
                </div>
                <div class="card-body" style="font-size: 12px; margin-top: 8px; color: var(--color-muted);">
                    Curated names from the current project summary
                </div>
            </article>

            <article class="card">
                <div class="card-header">
                    <h3 class="card-title">Portable C++ ports</h3>
                    <div class="card-meta"><span class="badge track-b">Track B</span></div>
                </div>
                <div class="card-body" style="font-size: 36px; font-weight: 700; font-family: var(--font-outlier); color: var(--color-accent);">
                    ${(summaryCounts.port_rows_total ?? 0).toLocaleString()}
                </div>
                <div class="card-body" style="font-size: 12px; margin-top: 8px; color: var(--color-muted);">
                    Portable C++ port records
                </div>
            </article>

            <article class="card">
                <div class="card-header">
                    <h3 class="card-title">Test Suite</h3>
                    <div class="card-meta"><span class="badge track-b">Track B</span><span class="badge track-c">Track C</span></div>
                </div>
                <div class="card-body" style="font-size: 36px; font-weight: 700; font-family: var(--font-outlier); color: var(--color-accent);">
                    ${totalTests}
                </div>
                <div class="card-body" style="font-size: 12px; margin-top: 8px; color: var(--color-muted);">
                    Unit, golden, behaviour & host integration tests
                </div>
            </article>

            <article class="card">
                <div class="card-header">
                    <h3 class="card-title">Milestones</h3>
                    <div class="card-meta"><span class="badge track-a">A</span><span class="badge track-b">B</span><span class="badge track-c">C</span></div>
                </div>
                <div class="card-body" style="font-size: 36px; font-weight: 700; font-family: var(--font-outlier); color: var(--color-success);">
                    ${milestones.length}
                </div>
                <div class="card-body" style="font-size: 12px; margin-top: 8px; color: var(--color-muted);">
                    Defined in the workflow; completion is not inferred
                </div>
            </article>

            <article class="card">
                <div class="card-header">
                    <h3 class="card-title">Findings Entries</h3>
                    <div class="card-meta"><span class="badge track-b">Track B</span><span class="badge track-c">Track C</span></div>
                </div>
                <div class="card-body" style="font-size: 36px; font-weight: 700; font-family: var(--font-outlier); color: var(--color-ink);">
                    ${noteCount.toLocaleString()}
                </div>
                <div class="card-body" style="font-size: 12px; margin-top: 8px; color: var(--color-muted);">
                    Dated research entries in the current project summary
                </div>
            </article>

            <article class="card">
                <div class="card-header">
                    <h3 class="card-title">Open Questions</h3>
                    <div class="card-meta"><span class="badge track-b">Track B</span></div>
                </div>
                <div class="card-body" style="font-size: 36px; font-weight: 700; font-family: var(--font-outlier); color: var(--color-warning);">
                    ${this.data.open_questions?.length || 0}
                </div>
                <div class="card-body" style="font-size: 12px; margin-top: 8px; color: var(--color-muted);">
                    Blocking or unresolved investigations
                </div>
            </article>
        `;

        // Track progress
        if (trackProgressContainer) {
            const tracks = [
                { id: 'a', name: 'Track A: Data', color: 'var(--color-accent)', detail: 'Readers, tables & formats', value: 'DATA' },
                { id: 'b', name: 'Track B: Oracle', color: 'var(--color-ink)', detail: 'Windows x64 observation & debugging', value: 'LIFT' },
                { id: 'c', name: 'Track C: Host', color: 'var(--color-accent)', detail: `${summaryCounts.port_rows_total ?? '—'} port records · ${summaryCounts.port_rows_by_status?.['in host'] ?? 0} in host`, value: 'BUILD' }
            ];
            trackProgressContainer.innerHTML = tracks.map(t => `
                <article class="card">
                    <div class="card-header">
                        <h3 class="card-title">${t.name}</h3>
                        <div class="card-meta"><span class="badge track-${t.id}">${t.id.toUpperCase()}</span></div>
                    </div>
                    <div class="card-body" style="font-size: 28px; font-weight: 700; font-family: var(--font-outlier); color: ${t.color};">
                        ${t.value}
                    </div>
                    <div class="card-body" style="font-size: 12px; margin-top: 8px; color: var(--color-muted);">
                        ${t.detail}
                    </div>
                </article>
            `).join('');
        }

        const currentTimeline = this.publicSummary?.timeline || [];
        timelineContainer.innerHTML = currentTimeline.length
            ? currentTimeline.slice(-6).reverse().map(entry => `
                <div class="timeline-entry track-c summary-line">
                    <div class="timeline-date">${this.escapeHtml(entry.date)} · Current project summary</div>
                    <div class="timeline-title">${this.escapeHtml(entry.title)}</div>
                    <div class="timeline-body">${this.escapeHtml(entry.text)}</div>
                </div>`).join('')
            : findings.slice(0, 6).map(f => this.renderTimelineEntry(f)).join('');
    }

    isMilestoneCompleted(milestone) {
        const doneWhen = milestone.done_when?.toLowerCase() || '';
        const keywords = ['done', 'confirmed', 'pass', 'complete', 'met'];
        return keywords.some(k => doneWhen.includes(k));
    }

    renderTimelineEntry(entry) {
        const confidence = entry.confidence_counts || {};
        const badges = [];
        if (confidence.confirmed) badges.push(`<span class="badge confirmed">${confidence.confirmed} confirmed</span>`);
        if (confidence.probable) badges.push(`<span class="badge probable">${confidence.probable} probable</span>`);
        if (confidence.guess) badges.push(`<span class="badge guess">${confidence.guess} guess</span>`);

        return `
            <div class="timeline-entry track-${entry.track?.toLowerCase() || 'b'}">
                <div class="timeline-date">${entry.date} · Track ${entry.track || '?'}</div>
                <div class="timeline-title">${this.escapeHtml(entry.title)}</div>
                <div class="timeline-body">${this.escapeHtml(entry.body?.substring(0, 300) || '')}...</div>
                <div class="timeline-tags">
                    ${badges.join('')}
                    <span class="badge track-${entry.track?.toLowerCase() || 'b'}">Track ${entry.track || '?'}</span>
                </div>
            </div>
        `;
    }

    // ============ FINDINGS ============
    renderFindings() {
        const container = document.getElementById('findings-timeline');
        const trackFilter = document.getElementById('findings-track-filter')?.value || '';
        const confidenceFilter = document.getElementById('findings-confidence-filter')?.value || '';

        if (!container) return;

        let findings = this.data.findings || [];

        if (trackFilter) {
            findings = findings.filter(f => f.track === trackFilter);
        }

        if (confidenceFilter) {
            findings = findings.filter(f => (f.confidence_counts?.[confidenceFilter] || 0) > 0);
        }

        if (this.searchQuery) {
            findings = findings.filter(f => 
                f.title.toLowerCase().includes(this.searchQuery) ||
                f.body.toLowerCase().includes(this.searchQuery)
            );
        }

        container.innerHTML = findings.map(f => this.renderFindingsEntry(f)).join('');
    }

    renderFindingsEntry(entry) {
        const confidence = entry.confidence_counts || {};
        const badges = [];
        if (confidence.confirmed) badges.push(`<span class="badge confirmed">${confidence.confirmed} confirmed</span>`);
        if (confidence.probable) badges.push(`<span class="badge probable">${confidence.probable} probable</span>`);
        if (confidence.guess) badges.push(`<span class="badge guess">${confidence.guess} guess</span>`);

        let body = this.escapeHtml(entry.body || '');
        if (this.searchQuery) {
            const regex = new RegExp(`(${this.escapeRegex(this.searchQuery)})`, 'gi');
            body = body.replace(regex, '<mark style="background: var(--color-warning); color: var(--color-accent-ink); padding: 0 var(--space-3xs);">$1</mark>');
        }

        return `
            <div class="timeline-entry track-${entry.track?.toLowerCase() || 'b'}">
                <div class="timeline-date">${entry.date} · Track ${entry.track || '?'}</div>
                <div class="timeline-title">${this.escapeHtml(entry.title)}</div>
                <div class="timeline-body">${body}</div>
                <div class="timeline-tags">
                    ${badges.join('')}
                    <span class="badge track-${entry.track?.toLowerCase() || 'b'}">Track ${entry.track || '?'}</span>
                </div>
            </div>
        `;
    }

    // ============ NAMING DATABASE ============
    renderNaming() {
        const tbody = document.querySelector('#naming-table tbody');
        const seedFilter = document.getElementById('naming-seed-filter');
        const confidenceFilter = document.getElementById('naming-confidence-filter')?.value || '';

        if (!tbody) return;

        if (seedFilter && seedFilter.options.length <= 1) {
            const seeds = this.data.seeds || {};
            Object.keys(seeds).forEach(key => {
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = `${key} (${seeds[key].length})`;
                seedFilter.appendChild(opt);
            });
        }

        const seedFilterValue = seedFilter?.value || '';
        let allRows = [];

        for (const [sourceFile, rows] of Object.entries(this.data.seeds || {})) {
            if (seedFilterValue && sourceFile !== seedFilterValue) continue;
            rows.forEach(row => {
                allRows.push({ ...row, sourceFile });
            });
        }

        if (confidenceFilter) {
            allRows = allRows.filter(r => r.confidence === confidenceFilter);
        }

        if (this.searchQuery) {
            allRows = allRows.filter(r => 
                r.name.toLowerCase().includes(this.searchQuery) ||
                r.pc_addr.toLowerCase().includes(this.searchQuery) ||
                r.evidence.toLowerCase().includes(this.searchQuery)
            );
        }

        allRows.sort((a, b) => parseInt(a.pc_addr, 16) - parseInt(b.pc_addr, 16));

        tbody.innerHTML = allRows.map(row => `
            <tr>
                <td><code class="addr">${row.pc_addr}</code></td>
                <td><code class="name">${this.escapeHtml(row.name)}</code></td>
                <td><span class="badge ${row.confidence}">${row.confidence}</span></td>
                <td>${row.reviewed ? '✓' : '—'}</td>
                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: var(--color-muted);">${this.escapeHtml(row.evidence)}</td>
                <td><code style="font-size: 10px;">${this.escapeHtml(row.sourceFile)}</code></td>
            </tr>
        `).join('');
    }

    exportNamingCSV() {
        let csv = 'Address,Name,Confidence,Reviewed,Evidence,Source File\n';
        for (const [sourceFile, rows] of Object.entries(this.data.seeds || {})) {
            rows.forEach(row => {
                csv += `"${row.pc_addr}","${row.name}","${row.confidence}","${row.reviewed}","${row.evidence.replace(/"/g, '""')}","${sourceFile}"\n`;
            });
        }
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pes2021_naming_seeds.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    // ============ TESTS ============
    renderTests() {
        const container = document.getElementById('tests-grid');
        const categoryFilter = document.getElementById('test-category-filter')?.value || '';

        if (!container) return;

        const tests = this.data.cmake?.tests || [];
        const golden = this.data.golden_tests || {};
        const behaviour = this.data.behaviour_tests || {};

        let cards = [];

        if (!categoryFilter || categoryFilter === 'unit') {
            tests.filter(t => !t.name.includes('golden') && !t.name.includes('host')).forEach(test => {
                cards.push(this.renderTestCard({
                    name: test.name,
                    category: 'Unit',
                    track: this.inferTrackFromTest(test.name),
                    command: test.command
                }));
            });
        }

        if (!categoryFilter || categoryFilter === 'golden') {
            Object.entries(golden).forEach(([name, data]) => {
                cards.push(this.renderTestCard({
                    name: name,
                    category: 'Golden',
                    track: 'C',
                    detail: `${data.count} entries`
                }));
            });
        }

        if (!categoryFilter || categoryFilter === 'behaviour') {
            Object.entries(behaviour).forEach(([cat, files]) => {
                files.forEach(f => {
                    cards.push(this.renderTestCard({
                        name: f.name,
                        category: 'Behaviour',
                        track: 'B',
                        detail: `${cat} · ${this.formatBytes(f.size)}`
                    }));
                });
            });
        }

        if (!categoryFilter || categoryFilter === 'host') {
            tests.filter(t => t.name.includes('host')).forEach(test => {
                cards.push(this.renderTestCard({
                    name: test.name,
                    category: 'Host Integration',
                    track: 'C',
                    command: test.command
                }));
            });
        }

        if (this.searchQuery) {
            cards = cards.filter(c => 
                c.name.toLowerCase().includes(this.searchQuery) ||
                c.category.toLowerCase().includes(this.searchQuery)
            );
        }

        container.innerHTML = cards.join('');
    }

    inferTrackFromTest(name) {
        if (name.includes('host') || name.includes('season') || name.includes('groups') || name.includes('knockouts') || name.includes('continental')) return 'C';
        if (name.includes('pesdb') || name.includes('cpk') || name.includes('ftex') || name.includes('vfs')) return 'C';
        return 'B';
    }

    renderTestCard(test) {
        return `
            <article class="card">
                <div class="card-header">
                    <h3 class="card-title">${this.escapeHtml(test.name)}</h3>
                    <div class="card-meta">
                        <span class="badge track-${test.track?.toLowerCase() || 'b'}">${test.category}</span>
                        <span class="badge track-${test.track?.toLowerCase() || 'b'}">Track ${test.track || 'B'}</span>
                    </div>
                </div>
                <div class="card-body">
                    ${test.detail ? `<div>${this.escapeHtml(test.detail)}</div>` : ''}
                    ${test.command ? `<div style="margin-top: 8px; font-family: var(--font-outlier); font-size: 10px; color: var(--color-muted);">${this.escapeHtml(test.command)}</div>` : ''}
                </div>
            </article>
        `;
    }

    // ============ MILESTONES ============
    renderMilestones() {
        const container = document.getElementById('milestones-grid');
        if (!container) return;

        const milestones = this.data.milestones || [];
        container.innerHTML = milestones.map(m => {
            const status = 'status-unrecorded';
            return `
                <article class="milestone-card ${status}">
                    <div class="milestone-num">${String(m.number).padStart(2, '0')}</div>
                    <span class="milestone-track badge track-${m.track?.toLowerCase()}">Track ${m.track}</span>
                    <div class="milestone-title">${this.escapeHtml(m.milestone)}</div>
                    <div class="milestone-desc">${this.escapeHtml(m.done_when)}</div>
                    <div class="milestone-state">Current completion status is not recorded in the source summary.</div>
                </article>
            `;
        }).join('');
    }

    // ============ WORKFLOW ============
    renderWorkflow() {
        this.renderSubsystemTree();
    }

    renderSubsystemTree() {
        const trackB = document.getElementById('track-b-subsystems');
        const trackC = document.getElementById('track-c-subsystems');
        const trackA = document.getElementById('track-a-subsystems');

        if (!trackB || !trackC || !trackA) return;

        const subsystems = {
            'Track B: Oracle (PC Hook & Verify)': [
                { id: 'referee', name: 'Referee & Card System', status: 'in-progress', confidence: 'probable', deps: [], detail: 'Foul thresholds, severity scoring, DOGSO, card packaging. P1-P4 probes defined. 2/3 matches captured for P1 acceptance.' },
                { id: 'competition', name: 'Competition Engine', status: 'in-progress', confidence: 'probable', deps: ['referee'], detail: 'Season builder, fixture generator, regulation parser, promotion/relegation. FL addresses carried over. Season selection ported to host (exact fidelity).' },
                { id: 'ai', name: 'Match AI & Positioning', status: 'pending', confidence: 'guess', deps: ['competition'], detail: 'Player AI, positioning, match flow. Tier: behavioural. Needs fidelity decision before start.' },
                { id: 'stats', name: 'Stats & Fatigue', status: 'pending', confidence: 'guess', deps: ['referee'], detail: 'Stat modifier pipeline, fatigue thresholds. Aoba names available.' },
                { id: 'ml', name: 'Master League Systems', status: 'pending', confidence: 'guess', deps: ['competition'], detail: 'ML day simulation, transfers, development, finance, continental competitions.' }
            ],
            'Track C: Portable Host (Mac/iPad → All)': [
                { id: 'host-skeleton', name: 'Host Skeleton (SDL3)', status: 'completed', confidence: 'confirmed', deps: [], detail: 'macOS: window, input, GPU clear (Metal). iOS: CMake config ready, needs Xcode signing.' },
                { id: 'vfs', name: 'VFS & CPK Reader', status: 'completed', confidence: 'confirmed', deps: ['host-skeleton'], detail: 'Mounts 29 CPKs, 80k files. CPK reader matches pes-file-tools oracle. CRILAYLA decompression verified.' },
                { id: 'ftex', name: 'FTEX Texture Reader', status: 'completed', confidence: 'confirmed', deps: ['vfs'], detail: 'BC1/3/5/7, chunked zlib. 7/7 golden textures match. Kit texture displayed on Mac.' },
                { id: 'pesdb', name: 'PESDB Table Readers', status: 'completed', confidence: 'confirmed', deps: ['vfs'], detail: 'Player, Team, Competition, CompetitionEntry, CompetitionKind. 5 tables, golden tests pass.' },
                { id: 'fmdl', name: 'FMDL Model Reader', status: 'pending', confidence: 'guess', deps: ['ftex'], detail: 'Needed before anything shows on screen. pt-pc format docs as starting point.' },
                { id: 'gani', name: 'GANI Animation Playback', status: 'pending', confidence: 'guess', deps: ['fmdl'], detail: '4,389 clips, 20-bone rig. pes-gani (MIT) as reference.' },
                { id: 'render', name: 'Render Pipeline', status: 'pending', confidence: 'free', deps: ['fmdl', 'gani'], detail: 'SDL3 GPU API (Metal/Vulkan/D3D12). Shaders cross-compiled. Tier: free.' },
                { id: 'audio', name: 'Audio (CRI)', status: 'pending', confidence: 'free', deps: [], detail: 'CRI middleware. No work started.' },
                { id: 'ui', name: 'UI System', status: 'pending', confidence: 'free', deps: ['host-skeleton'], detail: 'Custom menus. PES menu layouts optional reader later.' }
            ],
            'Track A: Data & Formats': [
                { id: 'leagues', name: 'League/Competition Data', status: 'in-progress', confidence: 'probable', deps: ['pesdb'], detail: 'CompetitionRegulation.bin parsed (212 rows). Include list selection ported to host.' },
                { id: 'teams', name: 'Team & Player Data', status: 'completed', confidence: 'confirmed', deps: ['pesdb'], detail: '17,782 players, 663 teams loaded. Player record 312 bytes documented.' },
                { id: 'stadiums', name: 'Stadium & Scene Data', status: 'pending', confidence: 'guess', deps: ['fmdl'], detail: 'No work started. New format.' },
                { id: 'kits', name: 'Kit Textures (uniparam)', status: 'pending', confidence: 'probable', deps: ['ftex'], detail: 'uniparam reader from pes-file-tools. MIT licence.' }
            ]
        };

        trackB.innerHTML = this.renderSubsystemList(subsystems['Track B: Oracle (PC Hook & Verify)'], 'b');
        trackC.innerHTML = this.renderSubsystemList(subsystems['Track C: Portable Host (Mac/iPad → All)'], 'c');
        trackA.innerHTML = this.renderSubsystemList(subsystems['Track A: Data & Formats'], 'a');

        document.querySelectorAll('.tree-leaf').forEach(leaf => {
            leaf.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectWorkflowItem(leaf.dataset.id, leaf.dataset.track);
            });
        });
    }

    renderSubsystemList(items, track) {
        return items.map(item => `
            <li class="tree-leaf ${item.status}" data-id="${item.id}" data-track="${track}">
                <span>${this.escapeHtml(item.name)}</span>
                <span class="leaf-confidence badge ${item.confidence}">${item.confidence}</span>
                <span class="leaf-status" style="font-size: 9px; color: var(--color-muted); margin-left: auto;">
                    ${item.status === 'completed' ? '✓' : item.status === 'in-progress' ? '⟳' : '○'}
                </span>
            </li>
        `).join('');
    }

    selectWorkflowItem(id, track) {
        document.querySelectorAll('.tree-leaf').forEach(l => l.classList.remove('selected'));
        const leaf = document.querySelector(`.tree-leaf[data-id="${id}"]`);
        if (leaf) leaf.classList.add('selected');

        const allItems = {
            'referee': { name: 'Referee & Card System', track: 'b', status: 'in-progress', confidence: 'probable', deps: [], detail: 'Foul thresholds (40/80/110, 60/80/110), severity scoring (0-4), DOGSO detection, card packaging. P1-P4 probes defined in tests/behaviour/probes.tsv. 2/3 matches captured for P1 acceptance. Portable C++ in src/game/referee/foul_severity.{h,cpp}. Contract tests pass. Next: 3rd match for P1, capture fouling team + attack direction, capture ScoreToSeverity outputs.' },
            'competition': { name: 'Competition Engine', track: 'b', status: 'in-progress', confidence: 'probable', deps: ['referee'], detail: 'Season builder (EventDriver 0x141314FC0), fixture generator, regulation parser (212 rows), promotion/relegation. FL addresses carried over (98/140 match). Season selection ported to host with exact fidelity (91/91 ids match). Next: fixture generator port, regulation parser port, knockout draw.' },
            'ai': { name: 'Match AI & Positioning', track: 'b', status: 'pending', confidence: 'guess', deps: ['competition'], detail: 'Player AI, positioning, match flow. Fidelity tier: behavioural (statistical comparison over many matches). Needs fidelity decision before start. Open question #8: How faithful must match AI be?' },
            'stats': { name: 'Stats & Fatigue', track: 'b', status: 'pending', confidence: 'guess', deps: ['referee'], detail: 'StatModifierPipeline (0x14092AF10), EvaluateFatigueThreshold (0x140512CD0). Aoba names available. Tier: exact for modifiers, behavioural for fatigue feel.' },
            'ml': { name: 'Master League Systems', track: 'b', status: 'pending', confidence: 'guess', deps: ['competition'], detail: 'ML day simulation, transfers, development, finance, continental competitions. Behaviour tests exist for many (see tests/behaviour/competition/).' },
            'host-skeleton': { name: 'Host Skeleton (SDL3)', track: 'c', status: 'completed', confidence: 'confirmed', deps: [], detail: 'macOS: SDL3 window, event loop, GPU clear (Metal), --frames N for headless test. iOS: CMake config fetches SDL3 release-3.4.18 statically. Needs Xcode signing with Apple ID. Milestone 2 (macOS half) done.' },
            'vfs': { name: 'VFS & CPK Reader', track: 'c', status: 'completed', confidence: 'confirmed', deps: ['host-skeleton'], detail: 'Mounts 29 CPKs, 80,516 unique paths, 121 duplicates (last wins). CPK reader: header, TOC, entry extraction. CRILAYLA decompression. Golden tests: 3/3 pass. Peak RSS 44.9 MB.' },
            'ftex': { name: 'FTEX Texture Reader', track: 'c', status: 'completed', confidence: 'confirmed', deps: ['vfs'], detail: 'BC1/3/5/7, versions 2.03/2.04, chunked zlib (64 KiB chunks). 7/7 golden textures match oracle. Kit texture (a0150g1.ftex) displayed on Mac via Metal BC7 support. iPad needs CPU decode check.' },
            'pesdb': { name: 'PESDB Table Readers', track: 'c', status: 'completed', confidence: 'confirmed', deps: ['vfs'], detail: 'WESYS wrapper (ff 10 81 WESYS + zlib). Player.bin: 17,782 × 312 bytes. Team, Competition, CompetitionEntry, CompetitionKind. 5/5 golden tests pass. Oracle: FootballLife pesdb.py (MIT).' },
            'fmdl': { name: 'FMDL Model Reader', track: 'c', status: 'pending', confidence: 'guess', deps: ['ftex'], detail: 'Models in .mtar. pt-pc (P.T.) format docs as starting point (same engine family). Community notes. Needed before anything shows on screen. Milestone 10.' },
            'gani': { name: 'GANI Animation Playback', track: 'c', status: 'pending', confidence: 'guess', deps: ['fmdl'], detail: '4,389 clips, 20-bone rig, Fox StrCode32 names. pes-gani (MIT) decodes. In .mtar archives. Milestone 10.' },
            'render': { name: 'Render Pipeline', track: 'c', status: 'pending', confidence: 'free', deps: ['fmdl', 'gani'], detail: 'SDL3 GPU API: Metal (Apple), Vulkan (Android/Linux), D3D12 (Windows). Shaders written once, cross-compiled via SDL_shadercross/SPIRV-Cross. Tier: free (my own design).' },
            'audio': { name: 'Audio (CRI)', track: 'c', status: 'pending', confidence: 'free', deps: [], detail: 'CRI middleware audio banks. No work started. Later milestone.' },
            'ui': { name: 'UI System', track: 'c', status: 'pending', confidence: 'free', deps: ['host-skeleton'], detail: 'Custom menus in host. PES menu layouts optional reader later. Tier: free.' },
            'leagues': { name: 'League/Competition Data', track: 'a', status: 'in-progress', confidence: 'probable', deps: ['pesdb'], detail: 'CompetitionRegulation.bin: 212 rows × 2352 bytes. Include list selection (91 ids) ported to host with exact fidelity. Regulation table at edit+0xC12E9C, stride 0x314.' },
            'teams': { name: 'Team & Player Data', track: 'a', status: 'completed', confidence: 'confirmed', deps: ['pesdb'], detail: 'Player.bin: 17,782 records, 312 bytes each (6 ability bitfields + 90+ ability fields). Team.bin: 663 teams. FL Mod Studio as reference for data mods.' },
            'stadiums': { name: 'Stadium & Scene Data', track: 'a', status: 'pending', confidence: 'guess', deps: ['fmdl'], detail: 'Stadium models, scene data, collision. New format work needed. PS4 comparison optional.' },
            'kits': { name: 'Kit Textures (uniparam)', track: 'a', status: 'pending', confidence: 'probable', deps: ['ftex'], detail: 'uniparam format for kits. pes-file-tools uniparam.py as oracle (no licence, reference only).' }
        };

        const item = allItems[id];
        if (!item) return;

        this.selectedWorkflowItem = { id, ...item };
        this.renderWorkflowDetail(item);
    }

    renderWorkflowDetail(item) {
        const panel = document.getElementById('workflow-detail');
        if (!panel) return;

        const trackColors = { a: 'var(--color-accent)', b: 'var(--color-ink)', c: 'var(--color-accent)' };
        const trackLabels = { a: 'Track A: Data', b: 'Track B: Oracle', c: 'Track C: Host' };
        const statusIcons = { completed: '✓', 'in-progress': '⟳', pending: '○' };
        const statusColors = { completed: 'var(--color-success)', 'in-progress': 'var(--color-ink)', pending: 'var(--color-muted)' };

        panel.innerHTML = `
            <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; gap: 16px; flex-wrap: wrap;">
                <div>
                    <h3 style="font-size: 18px; margin-bottom: 4px; font-family: var(--font-display); text-transform: uppercase; letter-spacing: var(--tracking-display);">${this.escapeHtml(item.name)}</h3>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                        <span class="badge track-${item.track}" style="background: ${trackColors[item.track]}20; color: ${trackColors[item.track]};">${trackLabels[item.track]}</span>
                        <span class="badge ${item.confidence}">${item.confidence}</span>
                        <span style="display: flex; align-items: center; gap: 4px; color: ${statusColors[item.status]};">
                            <span style="font-size: 14px;">${statusIcons[item.status]}</span>
                            <span style="text-transform: capitalize;">${item.status.replace('-', ' ')}</span>
                        </span>
                    </div>
                </div>
            </div>
            <div style="color: var(--color-muted); line-height: 1.7; margin-bottom: 20px;">${this.escapeHtml(item.detail)}</div>
            ${item.deps.length > 0 ? `
                <div style="padding: 12px; background: var(--color-paper-2); border-radius: var(--radius-card); border: var(--rule-hair) solid var(--color-rule);">
                    <strong style="color: var(--color-ink);">Dependencies:</strong>
                    <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
                        ${item.deps.map(dep => `<span class="badge track-${item.track}">${dep}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
            <div style="margin-top: 20px; padding: 12px; background: var(--color-paper-2); border-radius: var(--radius-card); border: var(--rule-hair) solid var(--color-rule); font-size: 12px; color: var(--color-muted);">
                <strong>Suggested Next Steps:</strong>
                <ul style="margin: 8px 0 0 16px;">
                    ${this.getSuggestedSteps(item).map(s => `<li>${s}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    getSuggestedSteps(item) {
        const steps = {
            'referee': [
                'Complete 3rd match for P1 probe acceptance',
                'Capture fouling team identity and attack direction to settle box meaning',
                'Add ScoreToSeverity exit capture (probe P1b)',
                'Promote foul_severity to confirmed after 3 matches'
            ],
            'competition': [
                'Port fixture generator (league + knockout) to host',
                'Port regulation parser with exact fidelity',
                'Implement knockout draw and continental draws',
                'Verify against behaviour test captures (fixtures, group draws, knockouts)'
            ],
            'ai': [
                'Decide fidelity tier (exact vs behavioural vs free) — Open Question #8',
                'Identify core AI functions via decompilation',
                'Start with behavioural tier: statistical comparison over recorded matches'
            ],
            'host-skeleton': [
                'Complete iOS build: Xcode signing with Apple ID',
                'Add iPad device testing',
                'Set up CI for macOS + iOS builds'
            ],
            'vfs': [
                'Add CPK mount verification on iOS',
                'Implement case-insensitive path handling for Windows compatibility'
            ],
            'ftex': [
                'Verify iPad BC7 support or implement CPU decode fallback',
                'Add cube map and volume texture support',
                'Investigate .ftexs side files'
            ],
            'pesdb': [
                'Add Coach, Stadium, Regulation table readers',
                'Parse remaining ~90 player ability fields',
                'Create src/game types for Player/Team/Competition'
            ],
            'fmdl': [
                'Analyze pt-pc format docs for applicability',
                'Extract model hierarchy from .mtar',
                'Implement skeletal mesh loading'
            ],
            'leagues': [
                'Complete CompetitionRegulation reader golden test (212 rows)',
                'Port include-list selection to src/game/competition/',
                'Add replay test against P3 capture (tests/behaviour/competition/p234_2026-11-03b.txt)'
            ]
        };
        return steps[item.id] || ['Investigate subsystem', 'Define acceptance criteria', 'Write portable C++', 'Verify against game'];
    }

    // ============ PLATFORMS ============
    renderPlatforms() {
        const macContent = document.getElementById('mac-content');
        const winContent = document.getElementById('win-content');

        if (!macContent || !winContent) return;

        const macItems = [
            { title: 'Host Build (pes_host)', desc: 'SDL3 + Metal • cmake -B build && cmake --build build -j2 • --frames N for headless', status: 'completed' },
            { title: 'VFS Mount', desc: '29 CPKs • 80,516 files • 44.9 MB RSS • Duplicate: last wins', status: 'completed' },
            { title: 'CPK Reader', desc: 'Header/TOC/entry extraction • CRILAYLA decomp • 3/3 golden tests', status: 'completed' },
            { title: 'FTEX Reader', desc: 'BC1/3/5/7 • chunked zlib (64 KiB) • 7/7 oracle match • Kit on screen', status: 'completed' },
            { title: 'PESDB Readers', desc: '5 tables • Player 17,782 × 312B • 5/5 golden tests • FL oracle (MIT)', status: 'completed' },
            { title: 'Referee Logic (port)', desc: 'foul_severity.{h,cpp} • exact tier • contract tests pass • replay P1 TSV', status: 'in-progress' },
            { title: 'Competition Logic (port)', desc: 'season_select • exact fidelity • 91/91 ids match P3 capture', status: 'in-progress' },
            { title: 'iOS Build', desc: 'CMake fetches SDL3 3.4.18 static • Needs Xcode signing • Owner approval required', status: 'pending' },
            { title: 'FMDL/GANI', desc: 'Model + animation readers • pt-pc docs • pes-gani (MIT) • Milestone 10', status: 'pending' },
            { title: 'Render Pipeline', desc: 'SDL3 GPU API • Metal/Vulkan/D3D12 • SPIRV-Cross • Tier: free', status: 'pending' }
        ];

        const winItems = [
            { title: 'Windows x64 target VM', desc: 'Original-game execution and debugging authority. Runtime observations are captured here.', status: 'completed' },
            { title: 'Display/Streaming', desc: 'VDD virtual display • Sunshine → Moonlight • Fixed startup crash', status: 'completed' },
            { title: 'cdb Debugger', desc: '10.0.26100.1 • Hardware breakpoints (ba e1) • No code bytes changed', status: 'completed' },
            { title: 'P1: Foul Thresholds', desc: '6 calls • word@0x1482B3DC8=0x00C0 confirmed • T3=110 • bit 11 selects 60/80', status: 'completed' },
            { title: 'P2-P4: ML Creation', desc: 'BuildSeason 91 ids • EventDriver 30 calls • GetOrBlank 400 calls (mode 0→2)', status: 'completed' },
            { title: 'Include List Source', desc: 'Static table @0x14298CB60 (246×20B) • Filtered by EditData regs • FL "static" confirmed', status: 'completed' },
            { title: 'Team Direction', desc: 'Match_Team_SetDirection (0x140A42570) • Flips at half-time • Bit 11 = penalty in own box', status: 'completed' },
            { title: 'Captured validation', desc: 'Windows runtime snapshots and logged random draws provide the reference for differential checks.', status: 'completed' },
            { title: 'Runtime gaps', desc: 'Group-draw values, filing draws, scouting and the computer-club transfer search still need target captures.', status: 'in-progress' }
        ];

        macContent.innerHTML = macItems.map(item => this.renderPlatformItem(item)).join('');
        winContent.innerHTML = winItems.map(item => this.renderPlatformItem(item)).join('');
    }

    renderPlatformItem(item) {
        const statusColors = { completed: 'var(--color-success)', 'in-progress': 'var(--color-ink)', pending: 'var(--color-muted)' };
        const statusIcons = { completed: '✓', 'in-progress': '⟳', pending: '○' };
        return `
            <div class="platform-item">
                <div class="platform-item-title">
                    <span style="color: ${statusColors[item.status]};">${statusIcons[item.status]}</span>
                    ${this.escapeHtml(item.title)}
                </div>
                <div class="platform-item-desc">${this.escapeHtml(item.desc)}</div>
            </div>
        `;
    }

    // ============ QUESTIONS ============
    renderQuestions() {
        const container = document.getElementById('questions-grid');
        if (!container) return;

        const questions = this.data.open_questions || [];

        container.innerHTML = questions.map(q => `
            <article class="card">
                <div class="card-header">
                    <h3 class="card-title">Q${q.number}</h3>
                    <div class="card-meta"><span class="badge track-b">Track B</span></div>
                </div>
                <div class="card-body">${this.escapeHtml(q.question)}</div>
            </article>
        `).join('');
    }

    // ============ UTILITIES ============
    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    formatBytes(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    updateLastUpdated() {
        const el = document.getElementById('last-updated');
        if (el && this.data?.generated_at) {
            const date = new Date(this.data.generated_at);
            el.textContent = this.publicSummary?.updated || date.toLocaleString();
        }
    }

    showError(message) {
        const main = document.getElementById('main-content');
        if (main) {
            main.innerHTML = `
                <div class="empty-state" style="color: var(--color-error);">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <h3 style="font-family: var(--font-display); text-transform: uppercase; letter-spacing: var(--tracking-display);">Error Loading Dashboard</h3>
                    <p>${this.escapeHtml(message)}</p>
                </div>
            `;
        }
    }
}
