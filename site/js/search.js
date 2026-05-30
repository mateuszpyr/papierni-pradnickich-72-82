/* Lightweight client-side search across news + gallery + handbook.
   Renders a button in the header (injected into .header-tools) and a modal overlay.
   Keyboard: "/" focuses the search, Esc closes. */
(function () {
  'use strict';

  const t = {
    pl: {
      open: 'Szukaj',
      placeholder: 'Szukaj w aktualnościach, galerii, strefie…',
      empty: 'Brak wyników',
      hint: 'Wpisz frazę — szukamy w aktualnościach, albumach i strefie mieszkańca.',
      sections: { news: 'Aktualności', gallery: 'Galeria', handbook: 'Strefa mieszkańca' },
      close: 'Zamknij',
    },
    en: {
      open: 'Search',
      placeholder: 'Search news, gallery, residents’ area…',
      empty: 'No results',
      hint: 'Type a phrase — we look in news, albums and the residents’ area.',
      sections: { news: 'News', gallery: 'Gallery', handbook: 'Residents’ area' },
      close: 'Close',
    },
  };

  const getLang = () => (document.documentElement.lang || 'pl').toLowerCase().startsWith('en') ? 'en' : 'pl';
  const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // ----- inject UI -----
  const tools = document.querySelector('.header-tools');
  if (!tools) return;

  const btn = document.createElement('button');
  btn.className = 'search-toggle';
  btn.id = 'searchToggle';
  btn.type = 'button';
  btn.setAttribute('aria-label', t[getLang()].open);
  btn.title = t[getLang()].open;
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>' +
    '</svg>';
  tools.insertBefore(btn, tools.firstChild);

  const modal = document.createElement('div');
  modal.className = 'search-modal';
  modal.id = 'searchModal';
  modal.hidden = true;
  modal.innerHTML =
    '<div class="search-backdrop" data-close></div>' +
    '<div class="search-panel" role="dialog" aria-modal="true" aria-label="' + t[getLang()].open + '">' +
      '<div class="search-input-row">' +
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
        '<input type="search" class="search-input" id="searchInput" autocomplete="off" placeholder="' + t[getLang()].placeholder + '" />' +
        '<button class="search-close" type="button" data-close aria-label="' + t[getLang()].close + '">Esc</button>' +
      '</div>' +
      '<div class="search-results" id="searchResults">' +
        '<p class="search-hint">' + t[getLang()].hint + '</p>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);

  const input = modal.querySelector('#searchInput');
  const resultsEl = modal.querySelector('#searchResults');

  // ----- data -----
  let dataset = null; // built lazily
  let loadPromise = null;

  function buildHandbookEntries(lang) {
    // Static curated entries — covers headings + key topics from handbook.html.
    const pl = [
      { title: 'Telefony alarmowe',        keywords: '112 999 998 997 pogotowie straż pożarna policja',         hash: '#emergency' },
      { title: 'Zarząd wspólnoty',          keywords: 'zarząd kontakt mail telefon',                              hash: '#management' },
      { title: 'Administrator',              keywords: 'administrator zarządca firma kontakt',                     hash: '#administrator' },
      { title: 'Najczęstsze pytania (FAQ)',  keywords: 'faq pytania awaria opłaty czynsz parking',                hash: '#faq' },
      { title: 'Grupy społecznościowe',      keywords: 'messenger facebook grupa sąsiedzka dyskusja',              hash: '#groups' },
    ];
    const en = [
      { title: 'Emergency numbers',          keywords: '112 999 998 997 ambulance fire police',                    hash: '#emergency' },
      { title: 'Community board',            keywords: 'board contact mail phone management',                       hash: '#management' },
      { title: 'Property manager',            keywords: 'administrator property manager company contact',           hash: '#administrator' },
      { title: 'FAQ',                         keywords: 'faq questions breakdown fees rent parking',                hash: '#faq' },
      { title: 'Community groups',            keywords: 'messenger facebook group neighbour discussion',             hash: '#groups' },
    ];
    return (lang === 'en' ? en : pl).map((it) => ({
      kind: 'handbook',
      title: it.title,
      excerpt: it.keywords,
      url: 'handbook.html' + it.hash,
      hay: norm(it.title + ' ' + it.keywords),
    }));
  }

  async function loadData() {
    if (dataset) return dataset;
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      const lang = getLang();
      const items = [];

      // news (including markdown body for richer search)
      try {
        const idx = await fetch('news/items/index.json', { cache: 'no-cache' }).then((r) => r.json());
        const files = await Promise.all(
          idx.map((f) => fetch('news/items/' + f, { cache: 'no-cache' }).then((r) => r.text()).catch(() => ''))
        );
        files.forEach((raw, i) => {
          if (!raw) return;
          const fm = raw.match(/^---\s*([\s\S]*?)\s*---\s*([\s\S]*)$/);
          if (!fm) return;
          const meta = {};
          fm[1].split('\n').forEach((line) => {
            const m = line.match(/^([a-zA-Z_]+):\s*'?([^']*)'?\s*$/);
            if (m) meta[m[1]] = m[2];
          });
          const body = fm[2] || '';
          // pick language block ::: pl / ::: en when present, else full body
          const blockRe = new RegExp(':::\\s*' + (lang === 'en' ? 'en' : 'pl') + '\\s*([\\s\\S]*?):::', 'i');
          const block = body.match(blockRe);
          const bodyText = (block ? block[1] : body)
            .replace(/```[\s\S]*?```/g, ' ')
            .replace(/[#>*_`~\-]/g, ' ')
            .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
            .replace(/\s+/g, ' ')
            .trim();
          const title = (lang === 'en' ? meta.title_en : meta.title_pl) || meta.title_pl || idx[i];
          const lead  = (lang === 'en' ? meta.lead_en  : meta.lead_pl)  || '';
          const slug  = meta.slug || idx[i].replace(/\.md$/, '');
          items.push({
            kind: 'news',
            title,
            excerpt: lead,
            url: 'news.html?slug=' + encodeURIComponent(slug),
            hay: norm(title + ' ' + lead + ' ' + (meta.tag_pl || '') + ' ' + (meta.tag_en || '') + ' ' + bodyText),
            body: bodyText,
          });
        });
      } catch (e) { /* ignore */ }

      // gallery
      try {
        const gj = await fetch('assets/gallery/gallery.json', { cache: 'no-cache' }).then((r) => r.json());
        (gj.albums || []).forEach((al) => {
          const title = (lang === 'en' ? al.title_en : al.title_pl) || al.folder;
          const desc  = (lang === 'en' ? al.description_en : al.description_pl) || '';
          items.push({
            kind: 'gallery',
            title,
            excerpt: desc,
            url: 'gallery.html#' + encodeURIComponent(al.folder),
            hay: norm(title + ' ' + desc + ' ' + al.folder),
          });
        });
      } catch (e) { /* ignore */ }

      // handbook static entries
      buildHandbookEntries(lang).forEach((h) => items.push(h));

      dataset = items;
      return items;
    })();
    return loadPromise;
  }

  // ----- render -----
  function escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function highlight(text, query) {
    const safe = escapeHtml(text || '');
    if (!query) return safe;
    const nq = norm(query);
    const nt = norm(text || '');
    const idx = nt.indexOf(nq);
    if (idx === -1) return safe;
    // map indices: since norm only lowercases + strips diacritics (length preserved via NFD strip of combining marks),
    // length differs only by combining marks. Safe enough for Latin-script content here — fall back to plain when lengths differ.
    if (nt.length !== (text || '').length) return safe;
    return escapeHtml(text.slice(0, idx)) +
      '<mark>' + escapeHtml(text.slice(idx, idx + query.length)) + '</mark>' +
      escapeHtml(text.slice(idx + query.length));
  }

  function buildExcerpt(item, query) {
    const lead = item.excerpt || '';
    const nq = norm(query);
    if (lead && norm(lead).indexOf(nq) !== -1) return lead;
    // fall back to body snippet around the match
    const body = item.body || '';
    if (!body) return lead;
    const nb = norm(body);
    const i = nb.indexOf(nq);
    if (i === -1) return lead;
    const start = Math.max(0, i - 40);
    const end = Math.min(body.length, i + nq.length + 80);
    return (start > 0 ? '…' : '') + body.slice(start, end) + (end < body.length ? '…' : '');
  }

  function render(query) {
    const lang = getLang();
    const labels = t[lang];
    const q = norm(query);
    if (!q) {
      resultsEl.innerHTML = '<p class="search-hint">' + labels.hint + '</p>';
      return;
    }
    if (!dataset) {
      resultsEl.innerHTML = '<p class="search-hint">…</p>';
      return;
    }
    const hits = dataset.filter((it) => it.hay.indexOf(q) !== -1).slice(0, 20);
    if (!hits.length) {
      resultsEl.innerHTML = '<p class="search-empty">' + labels.empty + '</p>';
      return;
    }
    const groups = { news: [], gallery: [], handbook: [] };
    hits.forEach((h) => groups[h.kind].push(h));

    let html = '';
    ['news', 'gallery', 'handbook'].forEach((k) => {
      if (!groups[k].length) return;
      html += '<section class="search-group">';
      html += '<h3 class="search-group-title">' + labels.sections[k] + '</h3>';
      html += '<ul class="search-list">';
      groups[k].forEach((h) => {
        const excerpt = buildExcerpt(h, query);
        html += '<li><a class="search-item" href="' + h.url + '">';
        html +=   '<span class="search-item-title">' + highlight(h.title, query) + '</span>';
        if (excerpt) html += '<span class="search-item-excerpt">' + highlight(excerpt, query) + '</span>';
        html += '</a></li>';
      });
      html += '</ul></section>';
    });
    resultsEl.innerHTML = html;
  }

  // ----- open/close -----
  function open() {
    modal.hidden = false;
    document.body.classList.add('search-open');
    setTimeout(() => input.focus(), 30);
    loadData().then(() => render(input.value));
  }
  function close() {
    modal.hidden = true;
    document.body.classList.remove('search-open');
  }

  btn.addEventListener('click', open);
  modal.addEventListener('click', (e) => {
    if (e.target && e.target.matches('[data-close]')) close();
  });
  input.addEventListener('input', () => render(input.value));
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !modal.hidden === false) {
      const tag = (e.target && e.target.tagName) || '';
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        open();
      }
    } else if (e.key === 'Escape' && !modal.hidden) {
      close();
    }
  });

  // Refresh labels when language changes (i18n.js toggles document.documentElement.lang)
  const langObs = new MutationObserver(() => {
    const lang = getLang();
    btn.setAttribute('aria-label', t[lang].open);
    btn.title = t[lang].open;
    input.placeholder = t[lang].placeholder;
    // invalidate cached dataset so titles re-render in the new language
    dataset = null;
    loadPromise = null;
    if (!modal.hidden) loadData().then(() => render(input.value));
  });
  langObs.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
