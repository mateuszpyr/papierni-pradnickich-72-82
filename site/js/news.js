(function () {
  const listRoot   = document.getElementById('newsGrid');     // home: list
  const detailRoot = document.getElementById('newsDetail');   // news.html: full post
  const relatedRoot= document.getElementById('newsRelated');  // news.html: read next

  if (!listRoot && !detailRoot) return;

  // Compute base path so links work both from "/" and "/index.html"
  function newsUrl(slug) {
    return `news.html?slug=${encodeURIComponent(slug)}`;
  }

  let newsData = [];
  let isLoading = true;

  // --- Markdown file loader ---------------------------------------------
  // Parses our minimal YAML frontmatter (single-quoted scalars or bare numbers)
  // plus ::: pl / ::: en body sections produced by tools/convert-news.js.
  function parseFrontmatterValue(raw) {
    const s = raw.trim();
    if (s === '' || s === "''") return '';
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    if (s.startsWith("'") && s.endsWith("'")) {
      return s.slice(1, -1).replace(/''/g, "'");
    }
    return s;
  }
  function parseNewsMarkdown(text) {
    const item = {};
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    if (lines[0].trim() !== '---') return null;
    let i = 1;
    for (; i < lines.length; i++) {
      if (lines[i].trim() === '---') { i++; break; }
      const m = lines[i].match(/^([a-z_][a-z0-9_]*)\s*:\s*(.*)$/i);
      if (m) item[m[1]] = parseFrontmatterValue(m[2]);
    }
    const rest = lines.slice(i).join('\n');
    const grab = (lang) => {
      const re = new RegExp('^:::\\s*' + lang + '\\s*$([\\s\\S]*?)^:::\\s*$', 'm');
      const m = rest.match(re);
      if (!m) return [];
      // Split body into paragraphs on blank lines to match the array format
      // expected by renderBody / stripToLead.
      return m[1].split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
    };
    item.body_pl = grab('pl');
    item.body_en = grab('en');
    return item;
  }

  async function loadFromMarkdown() {
    const idxRes = await fetch('news/items/index.json', { cache: 'no-cache' });
    if (!idxRes.ok) throw new Error('index.json missing');
    const files = await idxRes.json();
    const items = await Promise.all(files.map(async (f) => {
      const r = await fetch(`news/items/${f}`, { cache: 'no-cache' });
      if (!r.ok) throw new Error(`failed: ${f}`);
      return parseNewsMarkdown(await r.text());
    }));
    return items.filter(Boolean).sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  async function load() {
    try {
      newsData = await loadFromMarkdown();
      isLoading = false;
      render();
    } catch (e) {
      isLoading = false;
      const errMsg = (window.WP_I18N && window.WP_I18N.t('news.error')) || 'Nie udało się załadować ogłoszeń.';
      if (listRoot)   listRoot.innerHTML   = `<p class="news-loading">${errMsg}</p>`;
      if (detailRoot) detailRoot.innerHTML = `<p class="news-loading">${errMsg}</p>`;
    }
  }

  function fmtDate(iso, lang) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'pl-PL', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch { return iso; }
  }

  function pick(item, field, lang) {
    return item[`${field}_${lang}`] || item[`${field}_pl`] || item[field] || '';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderInline(text) {
    let html = escapeHtml(text);
    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`);
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    return html;
  }

  function renderParagraph(p) {
    const lines = p.split('\n');
    const out = [];
    let listBuf = [];
    let quoteBuf = [];
    const flushList = () => {
      if (listBuf.length) {
        out.push('<ul>' + listBuf.map((li) => `<li>${renderInline(li)}</li>`).join('') + '</ul>');
        listBuf = [];
      }
    };
    const flushQuote = () => {
      if (quoteBuf.length) {
        out.push('<blockquote>' + quoteBuf.map((q) => `<p>${renderInline(q)}</p>`).join('') + '</blockquote>');
        quoteBuf = [];
      }
    };
    for (const line of lines) {
      const trimmed = line.trim();
      const liM = line.match(/^-\s+(.*)$/);
      const qM = trimmed.match(/^>\s?(.*)$/);
      const hM = trimmed.match(/^(#{1,4})\s+(.*)$/);
      if (liM) { flushQuote(); listBuf.push(liM[1]); continue; }
      if (qM) { flushList(); quoteBuf.push(qM[1]); continue; }
      flushList();
      flushQuote();
      if (trimmed === '') continue;
      if (trimmed === '---' || trimmed === '***') { out.push('<hr/>'); continue; }
      if (hM) {
        const level = Math.min(6, hM[1].length + 1); // ## -> h3, ### -> h4
        out.push(`<h${level}>${renderInline(hM[2])}</h${level}>`);
        continue;
      }
      out.push(`<p>${renderInline(line)}</p>`);
    }
    flushList();
    flushQuote();
    return out.join('');
  }

  function renderBody(body) {
    if (Array.isArray(body)) return body.map(renderParagraph).join('');
    return renderParagraph(String(body || ''));
  }

  // Compact list card (home + news.html "Read next")
  function listCardHtml(n, lang) {
    const title = pick(n, 'title', lang);
    const tag   = pick(n, 'tag', lang);
    const tagSlug = n.tag_slug || 'default';
    const lead  = pick(n, 'lead', lang) || stripToLead(n[`body_${lang}`] || n.body_pl);
    const author = n.author || '';
    const readMin = n.read_min;
    const minLabel = (window.WP_I18N && window.WP_I18N.t('news.min')) || 'min';
    const image = n.image;
    const slug = n.slug;
    const href = newsUrl(slug);

    return `
      <a class="news-list-card" href="${href}">
        ${image ? `<div class="news-list-thumb"><img src="${image}" alt="${escapeHtml(title)}" loading="lazy"/></div>` : '<div class="news-list-thumb news-list-thumb--empty"></div>'}
        <div class="news-list-text">
          ${tag ? `<span class="news-list-tag" data-tag="${tagSlug}">${escapeHtml(tag)}</span>` : ''}
          <h3 class="news-list-title">${escapeHtml(title)}</h3>
          <p class="news-list-lead">${escapeHtml(lead)}</p>
          <div class="news-list-meta">
            ${author ? `<span class="news-list-author">${escapeHtml(author)}</span>` : ''}
            <time>${fmtDate(n.date, lang)}</time>
            ${readMin ? `<span>${readMin} ${minLabel}</span>` : ''}
          </div>
        </div>
      </a>`;
  }

  // Featured card (big hero card for the newest item on home)
  function featuredCardHtml(n, lang) {
    const title = pick(n, 'title', lang);
    const tag   = pick(n, 'tag', lang);
    const tagSlug = n.tag_slug || 'default';
    const lead  = pick(n, 'lead', lang) || stripToLead(n[`body_${lang}`] || n.body_pl);
    const author = n.author || '';
    const readMin = n.read_min;
    const minLabel = (window.WP_I18N && window.WP_I18N.t('news.min')) || 'min';
    const image = n.image;
    const href = newsUrl(n.slug);

    return `
      <a class="news-hero-card" href="${href}">
        <div class="news-hero-media">
          ${image ? `<img src="${image}" alt="${escapeHtml(title)}" loading="lazy"/>` : ''}
          <div class="news-hero-overlay"></div>
        </div>
        <div class="news-hero-text">
          ${tag ? `<span class="news-list-tag news-hero-tag" data-tag="${tagSlug}">${escapeHtml(tag)}</span>` : ''}
          <h2 class="news-hero-title">${escapeHtml(title)}</h2>
          <p class="news-hero-lead">${escapeHtml(lead)}</p>
          <div class="news-list-meta news-hero-meta">
            ${author ? `<span class="news-list-author">${escapeHtml(author)}</span>` : ''}
            <time>${fmtDate(n.date, lang)}</time>
            ${readMin ? `<span>${readMin} ${minLabel}</span>` : ''}
          </div>
        </div>
      </a>`;
  }

  // Compact card for secondary news (image on top, content below)
  function compactCardHtml(n, lang) {
    const title = pick(n, 'title', lang);
    const tag   = pick(n, 'tag', lang);
    const tagSlug = n.tag_slug || 'default';
    const lead  = pick(n, 'lead', lang) || stripToLead(n[`body_${lang}`] || n.body_pl);
    const author = n.author || '';
    const readMin = n.read_min;
    const minLabel = (window.WP_I18N && window.WP_I18N.t('news.min')) || 'min';
    const image = n.image;
    const href = newsUrl(n.slug);

    return `
      <a class="news-card" href="${href}">
        <div class="news-card-media">
          ${image ? `<img src="${image}" alt="${escapeHtml(title)}" loading="lazy"/>` : ''}
        </div>
        <div class="news-card-text">
          ${tag ? `<span class="news-list-tag" data-tag="${tagSlug}">${escapeHtml(tag)}</span>` : ''}
          <h3 class="news-card-title">${escapeHtml(title)}</h3>
          <p class="news-card-lead">${escapeHtml(lead)}</p>
          <div class="news-list-meta">
            ${author ? `<span class="news-list-author">${escapeHtml(author)}</span>` : ''}
            <time>${fmtDate(n.date, lang)}</time>
            ${readMin ? `<span>${readMin} ${minLabel}</span>` : ''}
          </div>
        </div>
      </a>`;
  }

  function stripToLead(body) {
    if (!body) return '';
    const first = Array.isArray(body) ? body[0] : body;
    const plain = String(first || '').replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\n/g, ' ');
    return plain.length > 200 ? plain.slice(0, 200) + '…' : plain;
  }

  // Compact one-line row for older items below the featured/secondary block
  function compactRowHtml(n, lang) {
    const title = pick(n, 'title', lang);
    const tag   = pick(n, 'tag', lang);
    const tagSlug = n.tag_slug || 'default';
    const author = n.author || '';
    const readMin = n.read_min;
    const minLabel = (window.WP_I18N && window.WP_I18N.t('news.min')) || 'min';
    const href = newsUrl(n.slug);
    const image = n.image;
    return `
      <a class="news-compact-row" href="${href}">
        <div class="news-compact-thumb${image ? '' : ' news-compact-thumb--empty'}">
          ${image ? `<img src="${image}" alt="${escapeHtml(title)}" loading="lazy"/>` : ''}
        </div>
        <time class="news-compact-date">${fmtDate(n.date, lang)}</time>
        <div class="news-compact-text">
          ${tag ? `<span class="news-list-tag news-compact-tag" data-tag="${tagSlug}">${escapeHtml(tag)}</span>` : ''}
          <span class="news-compact-title">${escapeHtml(title)}</span>
        </div>
        ${author ? `<span class="news-compact-author">${escapeHtml(author)}</span>` : '<span></span>'}
        ${readMin ? `<span class="news-compact-readmin">${readMin} ${minLabel}</span>` : '<span></span>'}
      </a>`;
  }

  function renderList() {
    const lang = (window.WP_I18N && window.WP_I18N.lang) || 'pl';
    if (!newsData.length) {
      if (isLoading) return; // keep skeleton visible during initial load
      listRoot.innerHTML = `<p class="news-loading">${(window.WP_I18N && window.WP_I18N.t('news.empty')) || 'Brak aktualności.'}</p>`;
      return;
    }
    const sorted = [...newsData].sort((a, b) => (a.date < b.date ? 1 : -1));
    const limitAttr = listRoot.getAttribute('data-limit');
    const limit = limitAttr ? parseInt(limitAttr, 10) : 0;
    const items = limit > 0 ? sorted.slice(0, limit) : sorted;
    const hasMore = limit > 0 && sorted.length > limit;
    const moreLabel = (window.WP_I18N && window.WP_I18N.t('news.all')) || (lang === 'en' ? 'All news' : 'Wszystkie aktualności');
    const useFeatured = listRoot.hasAttribute('data-featured');

    let html;
    if (useFeatured && items.length > 0) {
      const heroHtml = featuredCardHtml(items[0], lang);
      const secondaryItems = items.slice(1, 3);
      const compactItems = items.slice(3);
      const secondaryHtml = secondaryItems.length
        ? `<div class="news-secondary-grid">${secondaryItems.map(n => compactCardHtml(n, lang)).join('')}</div>`
        : '';
      const compactHtml = compactItems.length
        ? `<h2 class="news-compact-heading">${lang === 'en' ? 'Older' : 'Pozostałe'}</h2><div class="news-compact-list">${compactItems.map(n => compactRowHtml(n, lang)).join('')}</div>`
        : '';
      html = heroHtml + secondaryHtml + compactHtml;
    } else {
      html = items.map(n => listCardHtml(n, lang)).join('');
    }
    listRoot.innerHTML = html;
    if (hasMore) {
      listRoot.insertAdjacentHTML('afterend',
        `<div class="news-more-wrap"><a class="news-more" href="news-index.html">${moreLabel} →</a></div>`);
      // Remove any older button (since render runs on i18n:changed)
      const all = document.querySelectorAll('.news-more-wrap');
      all.forEach((el, i) => { if (i < all.length - 1) el.remove(); });
    } else {
      document.querySelectorAll('.news-more-wrap').forEach((el) => el.remove());
    }
  }

  function renderDetail() {
    const lang = (window.WP_I18N && window.WP_I18N.lang) || 'pl';
    const params = new URLSearchParams(location.search);
    const slug = params.get('slug');
    const item = newsData.find((n) => n.slug === slug);

    if (!item) {
      if (isLoading) return; // keep skeleton visible during initial load
      const notFound = lang === 'en' ? 'Article not found.' : 'Nie znaleziono ogłoszenia.';
      const backHome = lang === 'en' ? '← Back to home' : '← Wróć na stronę główną';
      detailRoot.innerHTML = `
        <div class="news-detail-missing">
          <h2>${notFound}</h2>
          <p><a href="./" class="news-source">${backHome}</a></p>
        </div>`;
      if (relatedRoot) relatedRoot.innerHTML = '';
      return;
    }

    const title = pick(item, 'title', lang);
    const body  = renderBody(item[`body_${lang}`] || item.body_pl || item.body || '');
    const tag   = pick(item, 'tag', lang);
    const tagSlug = item.tag_slug || 'default';
    const author = item.author || '';
    const readMin = item.read_min;
    const minLabel = (window.WP_I18N && window.WP_I18N.t('news.min')) || 'min';
    const link = item.messenger_link;
    const discussLabel = (window.WP_I18N && window.WP_I18N.t('news.discuss')) || 'Dyskutuj na Messengerze';
    const shareLabel   = (window.WP_I18N && window.WP_I18N.t('news.share'))   || 'Kopiuj link';
    const sharedLabel  = (window.WP_I18N && window.WP_I18N.t('news.shared'))  || 'Skopiowano!';
    const backHome = lang === 'en' ? '← All news' : '← Wszystkie aktualności';

    document.title = `${title} — ${lang === 'en' ? 'Community of PP 72-82' : 'Wspólnota PP 72-82'}`;

    detailRoot.innerHTML = `
      <a class="news-back" href="news-index.html">${backHome}</a>
      <article class="news-detail">
        <aside class="news-detail-aside">
          <div class="news-detail-meta">
            ${author ? `<span class="news-detail-author">${escapeHtml(author)}</span>` : ''}
            <time>${fmtDate(item.date, lang)}</time>
            ${readMin ? `<span class="news-detail-read">${readMin} ${minLabel}</span>` : ''}
          </div>
          <div class="news-detail-actions">
            <button class="news-post-share" id="newsShareBtn" type="button" data-default="${escapeHtml(shareLabel)}" data-success="${escapeHtml(sharedLabel)}">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              <span>${escapeHtml(shareLabel)}</span>
            </button>
            ${link ? `<a class="news-post-discuss" href="${link}" target="_blank" rel="noopener noreferrer">💬 ${escapeHtml(discussLabel)}</a>` : ''}
          </div>
        </aside>
        <div class="news-detail-main">
          ${tag ? `<span class="news-detail-tag" data-tag="${tagSlug}">${escapeHtml(tag)}</span>` : ''}
          <h1 class="news-detail-title">${escapeHtml(title)}</h1>
          ${item.image ? `<figure class="news-detail-figure"><img src="${item.image}" alt="${escapeHtml(title)}"/></figure>` : ''}
          <div class="news-detail-body">${body}</div>
        </div>
      </article>`;

    // Share button — copy current URL to clipboard
    const shareBtn = document.getElementById('newsShareBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        const url = location.href;
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          // Fallback for older browsers
          const ta = document.createElement('textarea');
          ta.value = url; document.body.appendChild(ta);
          ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        }
        const span = shareBtn.querySelector('span');
        const original = shareBtn.dataset.default;
        span.textContent = shareBtn.dataset.success;
        shareBtn.classList.add('is-success');
        setTimeout(() => {
          span.textContent = original;
          shareBtn.classList.remove('is-success');
        }, 2000);
      });
    }

    if (relatedRoot) {
      const sameTag = newsData.filter((n) => n.slug !== slug && n.tag_slug && n.tag_slug === item.tag_slug)
                               .sort((a, b) => (a.date < b.date ? 1 : -1));
      const fillers = newsData.filter((n) => n.slug !== slug && !sameTag.includes(n))
                               .sort((a, b) => (a.date < b.date ? 1 : -1));
      const others = [...sameTag, ...fillers].slice(0, 3);
      if (others.length) {
        const heading = lang === 'en' ? 'Read next' : 'Czytaj więcej';
        relatedRoot.innerHTML = `
          <h2 class="news-related-heading">${heading}</h2>
          <div class="news-list">${others.map((n) => listCardHtml(n, lang)).join('')}</div>`;
      } else {
        relatedRoot.innerHTML = '';
      }
    }
  }

  function render() {
    if (listRoot)   renderList();
    if (detailRoot) renderDetail();
  }

  document.addEventListener('i18n:changed', render);
  load();
})();
