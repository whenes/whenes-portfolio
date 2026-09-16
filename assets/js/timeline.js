// Builds the horizontal career timeline from a .gitlog. Each commit declares
// data-start="YYYY-MM", data-end="YYYY-MM" (empty = present), data-lane="a|b",
// data-slug and data-label; data-kind="branch" marks the branch itself (drawn as a ref, not a job).

const TIER = 24;
const LANE_GAP = 56;
const CHEVRON = '<svg class="icon" aria-hidden="true"><use href="#i-chevron"/></svg>';

const toMonths = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + (m - 1);
};

const nowMonths = () => {
  const d = new Date();
  return d.getFullYear() * 12 + d.getMonth();
};

function duration(start, end) {
  const months = end - start + 1;
  return i18n.duration(Math.floor(months / 12), months % 12);
}

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

function readJobs(log) {
  return [...log.querySelectorAll(':scope > .commit')].map((item) => {
    const start = toMonths(item.dataset.start);
    const end = item.dataset.end ? toMonths(item.dataset.end) : nowMonths();
    return {
      item,
      start,
      end,
      present: !item.dataset.end,
      lane: item.dataset.lane,
      slug: item.dataset.slug,
      label: item.dataset.label,
      branch: item.dataset.kind === 'branch',
    };
  });
}

// Tiers are placed right to left: a label sits one tier farther from the lane than any label
// that starts under it, so no leader line ever crosses a label.
function assignTiers(buttons, gap = 10) {
  const placed = [];
  buttons
    .sort((a, b) => b.offsetLeft - a.offsetLeft)
    .forEach((button) => {
      const left = button.offsetLeft;
      const right = left + button.offsetWidth + gap;
      const covered = placed.filter((p) => p.left >= left && p.left <= right);
      const tier = covered.length ? Math.max(...covered.map((p) => p.tier)) + 1 : 0;
      placed.push({ left, tier });
      button.dataset.tier = tier;
    });
  return Math.max(1, ...placed.map((p) => p.tier + 1));
}

function buildTimeline(root) {
  const log = document.getElementById(root.dataset.timelineFor);
  const all = readJobs(log);
  const jobs = all.filter((j) => !j.branch).sort((a, b) => a.start - b.start);
  const branch = all.find((j) => j.branch);

  const domainStart = Math.floor(Math.min(...jobs.map((j) => j.start)) / 12) * 12;
  const now = nowMonths();
  // One month of room past today so the lane tip and its node are not clipped.
  const domainEnd = now + 1;
  const pct = (m) => `${((m - domainStart) / (domainEnd - domainStart)) * 100}%`;

  const graph = el('div', 'tl-graph is-drawing');
  const tablist = el('div', 'tl-tabs', { role: 'tablist', 'aria-label': i18n.timeline });
  const panel = el('section', 'card tl-detail', { role: 'tabpanel', id: `${root.id}-panel`, tabindex: '0' });

  const laneStart = { a: Math.min(...jobs.filter((j) => j.lane === 'a').map((j) => j.start)), b: branch.start };
  const lanes = {};
  ['a', 'b'].forEach((lane) => {
    const line = el('div', 'tl-lane', { 'data-lane': lane });
    line.style.left = pct(laneStart[lane]);
    line.style.width = `calc(${pct(now)} - ${pct(laneStart[lane])})`;
    graph.append(line);
    lanes[lane] = line;
  });

  const curve = el('div', 'tl-branch');
  curve.style.left = `calc(${pct(branch.start)} - 24px)`;
  curve.style.width = '24px';
  graph.append(curve);

  const head = el('span', 'ref ref-head tl-ref');
  head.textContent = 'HEAD';
  const branchRef = el('span', 'ref ref-branch tl-ref');
  branchRef.textContent = branch.label;
  graph.append(head, branchRef);

  const parts = jobs.map((job) => {
    const seg = el('div', 'tl-seg', { 'data-lane': job.lane });
    seg.style.left = pct(job.start);
    seg.style.width = `max(8px, calc(${pct(job.end + 1)} - ${pct(job.start)}))`;
    seg.style.setProperty('--draw-delay', `${Math.round(((job.start - domainStart) / (domainEnd - domainStart)) * 500)}ms`);

    const node = el('i', 'tl-node', { 'data-lane': job.lane, 'aria-hidden': 'true' });
    node.style.left = pct(job.start);
    node.style.setProperty('--draw-delay', seg.style.getPropertyValue('--draw-delay'));

    const tab = el('button', 'tl-job', {
      type: 'button',
      role: 'tab',
      id: `job-${job.slug}`,
      'aria-controls': panel.id,
      'aria-selected': 'false',
      tabindex: '-1',
      'data-side': job.lane === 'b' ? 'top' : 'bottom',
    });
    tab.textContent = job.label;
    tab.style.left = pct(job.start);
    tab.style.setProperty('--draw-delay', seg.style.getPropertyValue('--draw-delay'));

    graph.append(seg, node);
    tablist.append(tab);
    return { job, seg, node, tab };
  });
  graph.append(tablist);

  const axis = el('div', 'tl-axis', { 'aria-hidden': 'true' });
  graph.append(axis);

  root.append(graph, panel);
  root.classList.add('is-ready');
  log.classList.add('is-enhanced');

  const layout = () => {
    if (!root.offsetWidth) return;
    const tabsFor = (lane) => parts.filter((p) => p.job.lane === lane).map((p) => p.tab);
    const tiersTop = assignTiers(tabsFor('b'));
    const tiersBottom = assignTiers(tabsFor('a'));
    const laneB = 4 + tiersTop * TIER + 12;
    const laneA = laneB + LANE_GAP;
    const axisY = laneA + 14 + tiersBottom * TIER + 8;

    graph.style.height = `${axisY + 24}px`;
    lanes.b.style.top = `${laneB}px`;
    lanes.a.style.top = `${laneA}px`;
    curve.style.top = `${laneB}px`;
    curve.style.height = `${laneA - laneB + 1}px`;
    head.style.top = `${laneB - 19}px`;
    head.style.left = `calc(${pct(now)} - ${head.offsetWidth}px)`;
    branchRef.style.top = `${laneB + 1}px`;
    branchRef.style.left = `calc(${pct(branch.start)} - ${branchRef.offsetWidth + 40}px)`;
    axis.style.top = `${axisY}px`;

    parts.forEach(({ job, seg, node, tab }) => {
      const laneY = job.lane === 'b' ? laneB : laneA;
      seg.style.top = `${laneY}px`;
      node.style.top = `${laneY + 1}px`;
      const tier = Number(tab.dataset.tier);
      if (job.lane === 'b') {
        const top = laneB - 12 - (tier + 1) * TIER + 2;
        tab.style.top = `${top}px`;
        tab.style.setProperty('--leader', `${laneB - (top + 22) - 5}px`);
      } else {
        const top = laneA + 14 + tier * TIER;
        tab.style.top = `${top}px`;
        tab.style.setProperty('--leader', `${top - laneA - 6}px`);
      }
    });

    axis.replaceChildren();
    const yearWidth = (graph.offsetWidth / (domainEnd - domainStart)) * 12;
    const labelEvery = yearWidth >= 48 ? 1 : 2;
    for (let y = domainStart / 12; y * 12 <= domainEnd; y++) {
      const tick = el('span', 'tl-tick');
      tick.style.left = pct(y * 12);
      axis.append(tick);
      if ((y - domainStart / 12) % labelEvery === 0) {
        const label = el('span', 'tl-year');
        label.textContent = y;
        label.style.left = pct(y * 12);
        axis.append(label);
      }
    }
  };

  const renderPanel = ({ job, tab }, animate) => {
    const { item } = job;
    panel.setAttribute('aria-labelledby', tab.id);
    panel.replaceChildren();

    const headEl = el('header', 'tl-detail-head');
    const who = el('div');
    const org = el('h3', 'tl-detail-org');
    org.textContent = item.querySelector('.commit-org').textContent;
    const role = el('p', 'tl-detail-role');
    role.textContent = item.querySelector('.commit-role').textContent;
    if (job.lane === 'b') {
      const via = el('span', 'ref ref-branch');
      via.textContent = `${i18n.via} ${branch.label}`;
      role.append(via);
    }
    who.append(org, role);
    const when = el('p', 'tl-detail-when');
    const range = el('strong');
    range.textContent = item.querySelector('.commit-date').textContent;
    const span = el('span');
    span.textContent = duration(job.start, job.end);
    when.append(range, span);
    headEl.append(who, when);

    const body = el('div', `tl-detail-body${animate ? ' is-entering' : ''}`);
    const main = el('div');
    const subject = el('p', 'tl-detail-subject');
    subject.textContent = item.querySelector('.commit-subject').textContent;
    main.append(subject);
    const points = item.querySelector('.commit-points');
    if (points) main.append(points.cloneNode(true));
    body.append(main);
    const stack = item.querySelector('.commit-details .tech-list');
    if (stack) {
      const side = el('aside', 'tl-detail-side');
      const title = el('h4', 'tl-detail-side-title');
      title.textContent = i18n.stack;
      side.append(title, stack.cloneNode(true));
      body.append(side);
    }

    const index = parts.findIndex((p) => p.tab === tab);
    const foot = el('footer', 'tl-detail-foot');
    const hint = el('span');
    hint.textContent = i18n.keysHint;
    const nav = el('div', 'tl-detail-nav');
    [[-1, i18n.previous], [1, i18n.next]].forEach(([step, text]) => {
      const target = parts[index + step];
      const button = el('button', 'btn btn-ghost btn-sm', { type: 'button' });
      const label = el('span');
      label.textContent = target ? target.job.label : text;
      button.append(label);
      button.insertAdjacentHTML(step < 0 ? 'afterbegin' : 'beforeend', CHEVRON);
      if (step < 0) button.firstElementChild.classList.add('icon-flip');
      button.disabled = !target;
      button.setAttribute('aria-label', target ? `${text}: ${target.job.label}` : text);
      if (target) button.addEventListener('click', () => {
        select(target, true, true);
        history.replaceState(null, '', `#${target.tab.id}`);
      });
      nav.append(button);
    });
    foot.append(hint, nav);

    panel.append(headEl, body, foot);
  };

  const select = (part, animate, focus) => {
    parts.forEach((p) => {
      const on = p === part;
      p.tab.setAttribute('aria-selected', String(on));
      p.tab.tabIndex = on ? 0 : -1;
      p.seg.classList.toggle('is-selected', on);
      p.node.classList.toggle('is-selected', on);
    });
    renderPanel(part, animate);
    if (focus) part.tab.focus();
  };

  parts.forEach((part, i) => {
    part.tab.addEventListener('click', () => {
      select(part, true);
      history.replaceState(null, '', `#${part.tab.id}`);
    });
    part.tab.addEventListener('keydown', (event) => {
      const moves = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: parts.length - 1 };
      if (!(event.key in moves)) return;
      event.preventDefault();
      const target = parts[Math.max(0, Math.min(parts.length - 1, moves[event.key]))];
      select(target, true, true);
      history.replaceState(null, '', `#${target.tab.id}`);
    });
  });

  // #job-<slug> targets the graph tab; #log-<slug> targets the vertical log entry, which is hidden while the graph shows.
  const fromHash = () => parts.find((p) => [`#${p.tab.id}`, `#log-${p.job.slug}`].includes(location.hash));
  const initial = fromHash() || parts.find((p) => p.job.slug === root.dataset.timelineSelected) || parts[parts.length - 1];
  layout();
  select(initial, false);
  if (root.offsetWidth && location.hash.startsWith('#log-') && fromHash()) root.scrollIntoView({ block: 'start' });
  // A repeated click on the same #log- link fires no hashchange, so links are handled directly while the graph shows.
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#log-"]');
    if (!link || !root.offsetWidth) return;
    const part = parts.find((p) => `#log-${p.job.slug}` === link.getAttribute('href'));
    if (!part) return;
    event.preventDefault();
    history.replaceState(null, '', link.getAttribute('href'));
    select(part, true);
    root.scrollIntoView({ block: 'start' });
  });
  window.addEventListener('hashchange', () => {
    const p = fromHash();
    if (!p) return;
    select(p, true);
    if (root.offsetWidth && location.hash.startsWith('#log-')) root.scrollIntoView({ block: 'start' });
  });
  new ResizeObserver(layout).observe(root);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    graph.classList.add('is-drawn');
    graph.classList.remove('is-drawing');
    // Drop the staggered entrance timing so later selections respond immediately.
    setTimeout(() => graph.classList.remove('is-drawn'), 1600);
  }));
}

document.querySelectorAll('[data-timeline-for]').forEach(buildTimeline);
