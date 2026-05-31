(function () {
  'use strict';

  const stage = document.getElementById('bookStage');
  if (!stage) return;
  const pager = document.getElementById('bookPager');
  const tabs = Array.from(stage.querySelectorAll('.book-tab'));
  const pages = Array.from(pager ? pager.querySelectorAll('.book-page') : []);
  const prevBtn = document.getElementById('bookPrev');
  const nextBtn = document.getElementById('bookNext');
  const currentEl = document.getElementById('bookCurrent');
  const totalEl = document.getElementById('bookTotal');

  if (!pages.length) return;

  if (totalEl) totalEl.textContent = String(pages.length);

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let currentIdx = 0;
  let switching = false;

  function indexOfChapter(name) {
    const i = pages.findIndex((p) => p.dataset.chapter === name);
    return i >= 0 ? i : 0;
  }

  function chapterFromHash() {
    const h = (location.hash || '').replace(/^#/, '');
    if (!h) return null;
    // Direct match: hash equals a chapter name (e.g. #witkowice, #test6)
    if (pages.some((p) => p.dataset.chapter === h)) return h;
    // Section prefix match for Witkowice (e.g. #wit-park)
    if (h.startsWith('wit-')) return 'witkowice';
    return 'papiernia';
  }

  function applyState(idx, opts) {
    opts = opts || {};
    pages.forEach((p, i) => {
      const active = i === idx;
      p.classList.toggle('is-active', active);
      if (active) {
        p.removeAttribute('hidden');
        p.removeAttribute('aria-hidden');
      } else {
        p.setAttribute('aria-hidden', 'true');
        p.setAttribute('hidden', '');
      }
    });
    tabs.forEach((t, i) => {
      const active = t.dataset.chapter === pages[idx].dataset.chapter;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    fitTabs(idx);
    if (currentEl) currentEl.textContent = String(idx + 1);
    if (prevBtn) prevBtn.disabled = idx === 0;
    if (nextBtn) nextBtn.disabled = idx === pages.length - 1;
    currentIdx = idx;

    if (!opts.silent) {
      const ch = pages[idx].dataset.chapter;
      const targetHash = opts.targetHash || (ch === 'papiernia' ? '' : '#' + ch);
      try {
        if (targetHash) {
          if (location.hash !== targetHash) history.replaceState(null, '', targetHash);
        } else if (location.hash) {
          history.replaceState(null, '', location.pathname + location.search);
        }
      } catch (e) { /* ignore */ }
    }
  }

  const tabsRow = stage.querySelector('.book-tabs');
  const tabsWrap = stage.querySelector('.book-tabs-wrap');
  const tabsLeftBtn = document.getElementById('bookTabsLeft');
  const tabsRightBtn = document.getElementById('bookTabsRight');

  function updateEdgeFades() {
    if (!tabsRow || !tabsWrap) return;
    const overflow = tabsRow.scrollWidth - tabsRow.clientWidth > 1;
    tabsWrap.classList.toggle('is-overflow', overflow);
    const canLeft = overflow && tabsRow.scrollLeft > 2;
    const canRight = overflow && tabsRow.scrollLeft + tabsRow.clientWidth < tabsRow.scrollWidth - 2;
    tabsWrap.classList.toggle('has-left', canLeft);
    tabsWrap.classList.toggle('has-right', canRight);
    if (tabsLeftBtn) tabsLeftBtn.classList.toggle('is-visible', canLeft);
    if (tabsRightBtn) tabsRightBtn.classList.toggle('is-visible', canRight);
  }

  function fitTabs(activeIdx) {
    if (!tabs.length || !tabsRow) return;
    tabs.forEach((t) => t.classList.remove('book-tab--compact'));
    const activeTab = tabs[activeIdx];
    const available = tabsRow.clientWidth;
    if (activeTab && tabsRow.scrollWidth > available) {
      const tabLeft = activeTab.offsetLeft;
      const tabRight = tabLeft + activeTab.offsetWidth;
      if (tabLeft < tabsRow.scrollLeft) tabsRow.scrollLeft = Math.max(0, tabLeft - 12);
      else if (tabRight > tabsRow.scrollLeft + available) tabsRow.scrollLeft = tabRight - available + 12;
    }
    updateEdgeFades();
  }

  function updateTabsAndNav(idx) {
    tabs.forEach((t) => {
      const active = t.dataset.chapter === pages[idx].dataset.chapter;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    fitTabs(idx);
    if (currentEl) currentEl.textContent = String(idx + 1);
    if (prevBtn) prevBtn.disabled = idx === 0;
    if (nextBtn) nextBtn.disabled = idx === pages.length - 1;
  }

  function flipTo(idx, opts) {
    if (idx === currentIdx) return;
    if (idx < 0 || idx >= pages.length) return;
    if (switching) return;
    opts = opts || {};
    if (reduceMotion) {
      applyState(idx, opts);
      window.scrollTo({ top: 0, behavior: opts.scroll === false ? 'auto' : 'smooth' });
      return;
    }
    switching = true;
    const dir = idx > currentIdx ? 'next' : 'prev';
    const outgoing = pages[currentIdx];
    const incoming = pages[idx];

    // Update tabs/indicator immediately for snappy feel
    updateTabsAndNav(idx);

    // Lock pager height to prevent vertical jump when swapping pages of different sizes
    const outH = pager.offsetHeight;
    incoming.removeAttribute('hidden');
    // Temporarily place incoming in flow without animation classes to measure
    const inH = incoming.offsetHeight;
    const lockH = Math.max(outH, inH);
    pager.style.minHeight = lockH + 'px';

    incoming.classList.add('book-page--enter-' + dir);
    outgoing.classList.add('book-page--exit-' + dir);
    stage.classList.add('is-flipping');

    const finish = () => {
      outgoing.classList.remove('book-page--exit-' + dir);
      incoming.classList.remove('book-page--enter-' + dir);
      stage.classList.remove('is-flipping');
      applyState(idx, opts);
      // Smoothly settle pager height back to natural after animation
      pager.style.transition = 'min-height 0.25s ease';
      pager.style.minHeight = incoming.offsetHeight + 'px';
      setTimeout(() => {
        pager.style.transition = '';
        pager.style.minHeight = '';
      }, 280);
      switching = false;
      if (opts.scroll !== false) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    let done = false;
    const onEnd = (e) => {
      if (e && e.target !== incoming) return;
      if (done) return;
      done = true;
      incoming.removeEventListener('animationend', onEnd);
      finish();
    };
    incoming.addEventListener('animationend', onEnd);
    setTimeout(() => { if (!done) { done = true; finish(); } }, 600);
  }

  // tab clicks
  tabs.forEach((t) => {
    t.addEventListener('click', () => {
      const idx = indexOfChapter(t.dataset.chapter);
      flipTo(idx);
    });
  });

  // prev/next
  if (prevBtn) prevBtn.addEventListener('click', () => flipTo(currentIdx - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => flipTo(currentIdx + 1));

  // keyboard
  document.addEventListener('keydown', (e) => {
    if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName)) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowLeft') { if (currentIdx > 0) flipTo(currentIdx - 1); }
    else if (e.key === 'ArrowRight') { if (currentIdx < pages.length - 1) flipTo(currentIdx + 1); }
  });

  // hash sync (deep links from search results, internal anchors)
  function syncFromHash() {
    const ch = chapterFromHash();
    if (!ch) return;
    const idx = indexOfChapter(ch);
    if (idx !== currentIdx) {
      flipTo(idx, { silent: true, scroll: false });
      // after flip, scroll to the actual section if present
      setTimeout(() => {
        const id = (location.hash || '').replace(/^#/, '');
        if (id && id !== 'witkowice' && id !== 'papiernia') {
          const el = document.getElementById(id);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, reduceMotion ? 60 : 750);
    }
  }

  // initial setup — if hash points to chapter 2, jump there immediately without animation
  const initialChapter = chapterFromHash();
  const initialIdx = initialChapter ? indexOfChapter(initialChapter) : 0;
  applyState(initialIdx, { silent: true });
  // Clear pre-paint hint now that JS-managed state is in place
  document.documentElement.removeAttribute('data-book-init');
  if (initialIdx > 0) {
    // scroll to the specific section if hash refers to one
    setTimeout(() => {
      const id = (location.hash || '').replace(/^#/, '');
      if (id && id !== 'witkowice' && id !== 'papiernia') {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }, 0);
  }

  window.addEventListener('hashchange', syncFromHash);

  // Re-fit tabs on resize (debounced)
  let resizeT;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => fitTabs(currentIdx), 120);
  });

  // Edge fades reflect scroll position
  if (tabsRow) tabsRow.addEventListener('scroll', updateEdgeFades, { passive: true });
  // Allow mouse wheel to scroll tabs horizontally on desktop
  if (tabsRow) {
    tabsRow.addEventListener('wheel', (e) => {
      if (tabsRow.scrollWidth <= tabsRow.clientWidth) return;
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      e.preventDefault();
      tabsRow.scrollLeft += e.deltaY;
    }, { passive: false });
  }
  // Arrow buttons
  if (tabsLeftBtn) tabsLeftBtn.addEventListener('click', () => {
    if (tabsRow) tabsRow.scrollLeft = Math.max(0, tabsRow.scrollLeft - tabsRow.clientWidth * 0.7);
  });
  if (tabsRightBtn) tabsRightBtn.addEventListener('click', () => {
    if (tabsRow) tabsRow.scrollLeft += tabsRow.clientWidth * 0.7;
  });
})();
