/* release-activity.js
   Builds a GitHub-style activity grid from the .release entries on the page.
   One row per year. Set data-unit="week" (default) or data-unit="month" on .activity
   to choose how much time each square covers. New releases added to the timeline
   appear in the grid automatically. */
(function () {
  const roots = document.querySelectorAll('.activity');
  if (!roots.length) return;

  const TYPES  = ['major', 'minor', 'patch'];            // most significant first
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today  = new Date(); today.setHours(0, 0, 0, 0);

  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dayOfYear = d => Math.round((d - new Date(d.getFullYear(), 0, 1)) / 864e5);   // 0-based

  /* ---------- 1. read every release from the timeline (newest first) ---------- */
  const releases = [...document.querySelectorAll('.release')].map(el => {
    const version = el.querySelector('.release__version').textContent.trim();
    const title   = el.querySelector('.release__title').textContent.trim();
    const [y, m, d] = el.querySelector('.release__date').textContent.trim().split('/').map(Number);
    const type = TYPES.find(t => el.classList.contains('release--' + t)) || 'patch';
    if (!el.id) el.id = version.replace(/\./g, '-');     // v2.16.2 -> v2-16-2
    return { version, title, type, id: el.id, date: new Date(y, m - 1, d) };
  });
  if (!releases.length) return;

  const newest = releases.reduce((a, b) => (b.date > a.date ? b : a));
  const yearsAll = releases.map(r => r.date.getFullYear());
  const years = [];
  for (let y = Math.max(...yearsAll); y >= Math.min(...yearsAll); y--) years.push(y);

  /* ---------- 2. what one square means ---------- */
  const UNITS = {
    week: {
      cols:   53,
      col:    d => Math.min(52, Math.floor(dayOfYear(d) / 7)),
      start:  (y, c) => new Date(y, 0, 1 + c * 7),
      end:    (y, c) => { const e = new Date(y, 0, 7 + c * 7), last = new Date(y, 11, 31); return e > last ? last : e; },
      label(y, c) {
        const s = this.start(y, c), e = this.end(y, c);
        return s.getMonth() === e.getMonth()
          ? `${s.getDate()}–${e.getDate()} ${MONTHS[s.getMonth()]} ${y}`
          : `${s.getDate()} ${MONTHS[s.getMonth()]} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${y}`;
      },
      header: () => MONTHS.map((m, i) => ({ col: Math.floor(dayOfYear(new Date(2023, i, 1)) / 7), text: m })),
    },
    month: {
      cols:   12,
      col:    d => d.getMonth(),
      start:  (y, c) => new Date(y, c, 1),
      label:  (y, c) => `${MONTHS[c]} ${y}`,
      header: () => MONTHS.map((m, i) => ({ col: i, text: m })),
    },
  };

  /* ---------- 3. shared tooltip ---------- */
  const tip = document.createElement('div');
  tip.className = 'activity__tip';
  tip.hidden = true;
  document.body.appendChild(tip);
  const hideTip = () => { tip.hidden = true; };
  window.addEventListener('scroll', hideTip, { passive: true });

  function showTip(a, heading, rel) {
    tip.innerHTML =
      `<div class="activity__tip-date">${esc(heading)}</div>` +
      rel.map(r =>
        `<div class="activity__tip-row"><b data-type="${r.type}">${esc(r.version)}</b>` +
        `<span class="activity__tip-day">${r.date.getDate()} ${MONTHS[r.date.getMonth()]}</span>${esc(r.title)}</div>`
      ).join('');
    tip.hidden = false;

    const c = a.getBoundingClientRect(), t = tip.getBoundingClientRect();
    const left  = Math.max(8, Math.min(c.left + c.width / 2 - t.width / 2, innerWidth - t.width - 8));
    const above = c.top - t.height - 10;
    tip.style.left = left + 'px';
    tip.style.top  = (above < 8 ? c.bottom + 10 : above) + 'px';
  }

  /* ---------- 4. build each grid ---------- */
  roots.forEach(root => {
    const unit    = UNITS[root.dataset.unit] || UNITS.week;
    const inner   = root.querySelector('.activity__inner');
    const scroll  = root.querySelector('.activity__scroll');
    const counter = root.querySelector('.activity__count');

    const buckets = new Map();
    releases.forEach(r => {
      const k = `${r.date.getFullYear()}-${unit.col(r.date)}`;
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(r);                               // stays newest-first
    });

    const head = unit.header()
      .map(h => `<span style="grid-column:${h.col + 1}">${h.text}</span>`).join('');

    let rows = '', cells = '';
    years.forEach(y => {
      rows += `<span>${y}</span>`;
      for (let c = 0; c < unit.cols; c++) {
        if (unit.start(y, c) > today) { cells += '<span class="cell is-out"></span>'; continue; }

        const rel = buckets.get(`${y}-${c}`);
        if (!rel) { cells += '<span class="cell"></span>'; continue; }

        const top   = TYPES.find(t => rel.some(r => r.type === t));
        const multi = rel.length > 1;
        const aria  = `${unit.label(y, c)}: ` + rel.map(r => `${r.version} ${r.title}`).join(', ');
        cells +=
          `<a class="cell cell--${top}${multi ? ' cell--multi' : ''}" href="#${rel[0].id}" ` +
          `data-key="${y}-${c}"${rel.includes(newest) ? ' data-newest' : ''} aria-label="${esc(aria)}">` +
          `${multi ? `<span class="cell__count">${rel.length}</span>` : ''}</a>`;
      }
    });

    inner.style.setProperty('--cols', unit.cols);
    inner.innerHTML =
      '<span></span>' +
      `<div class="activity__months" aria-hidden="true">${head}</div>` +
      `<div class="activity__rows" aria-hidden="true">${rows}</div>` +
      `<div class="activity__cells">${cells}</div>`;

    if (counter) {
      counter.textContent = `${releases.length} releases since ${years[years.length - 1]}`;
    }

    // on narrow screens the grid scrolls sideways: start at the newest release
    const n = inner.querySelector('[data-newest]');
    if (n) scroll.scrollLeft = n.offsetLeft - scroll.clientWidth / 2;

    const cellFrom = e => e.target.closest('a.cell');
    const show = a => {
      const [y, c] = a.dataset.key.split('-').map(Number);
      showTip(a, unit.label(y, c), buckets.get(a.dataset.key));
    };

    inner.addEventListener('mouseover', e => { const a = cellFrom(e); if (a) show(a); });
    inner.addEventListener('mouseout',  e => { if (cellFrom(e)) hideTip(); });
    inner.addEventListener('focusin',   e => { const a = cellFrom(e); if (a) show(a); });
    inner.addEventListener('focusout',  hideTip);
    scroll.addEventListener('scroll', hideTip, { passive: true });

    /* click: jump to the release and flash it */
    inner.addEventListener('click', e => {
      const a = cellFrom(e);
      if (!a) return;
      hideTip();
      const target = document.getElementById(a.getAttribute('href').slice(1));
      if (!target) return;
      target.classList.remove('is-flash');
      void target.offsetWidth;                                // restarts the animation on repeat clicks
      target.classList.add('is-flash');
    });
  });
})();