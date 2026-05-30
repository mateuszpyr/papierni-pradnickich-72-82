(function () {
  const root = document.getElementById('albumsRoot');
  if (!root) return;

  let data = { albums: [] };
  let isLoading = true;

  async function load() {
    try {
      const res = await fetch('assets/gallery/gallery.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('gallery load failed');
      data = await res.json();
      isLoading = false;
      render();
    } catch (e) {
      isLoading = false;
      renderEmpty();
    }
  }

  function pick(o, field, lang) {
    return o[`${field}_${lang}`] || o[`${field}_pl`] || o[field] || '';
  }

  function fmtDate(iso, lang) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'pl-PL', { month: 'long', year: 'numeric' });
    } catch { return iso; }
  }

  function escAttr(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function renderImg(src, alt, extraAttrs = '') {
    return `<img src="${escAttr(src)}" alt="${escAttr(alt)}" ${extraAttrs}/>`;
  }

  function renderEmpty() {
    const lang = (window.WP_I18N && window.WP_I18N.lang) || 'pl';
    const msg = (window.WP_I18N && window.WP_I18N.t('gallery.empty')) || 'Galeria jest pusta — wkrótce pojawią się tutaj zdjęcia.';
    root.innerHTML = `<div class="gallery-empty">📷 ${msg}</div>`;
  }

  function render() {
    const lang = (window.WP_I18N && window.WP_I18N.lang) || 'pl';
    if (!data.albums || !data.albums.length) {
      if (isLoading) return; // keep skeleton visible during initial load
      renderEmpty(); renderStats(0, 0, lang); return;
    }

    const PREVIEW_MAX = 5; // max thumbs shown under cover (excluding cover itself)

    root.innerHTML = data.albums.map((album, ai) => {
      const title = pick(album, 'title', lang);
      const desc  = pick(album, 'description', lang);
      const meta  = fmtDate(album.date, lang);
      const images = album.images || [];
      const total = images.length;

      const countLabel = lang === 'en'
        ? `${total} ${total === 1 ? 'photo' : 'photos'}`
        : `${total} ${total === 1 ? 'zdjęcie' : (total >= 2 && total <= 4 ? 'zdjęcia' : 'zdjęć')}`;

      const metaLine = [meta, countLabel, desc].filter(Boolean).join(' · ');

      if (!total) {
        return `<section class="album">
          <header class="album-head"><h2>${title}</h2>${metaLine ? `<p class="album-meta">${metaLine}</p>` : ''}</header>
        </section>`;
      }

      const coverSrc = `assets/gallery/${album.folder}/${images[0].file}`;
      const coverAlt = pick(images[0], 'caption', lang) || title;
      const cover = `<button type="button" class="album-cover" data-album="${ai}" data-index="0" aria-label="${coverAlt}">
        ${renderImg(coverSrc, coverAlt, 'loading="lazy" decoding="async"')}
      </button>`;

      let preview = '';
      if (total > 1) {
        const rest = images.slice(1, 1 + PREVIEW_MAX);
        const overflow = total - 1 - rest.length;
        const thumbs = rest.map((img, idx) => {
          const realIndex = idx + 1;
          const src = `assets/gallery/${album.folder}/${img.file}`;
          const cap = pick(img, 'caption', lang) || title;
          const isLastWithOverflow = overflow > 0 && idx === rest.length - 1;
          return `<button type="button" class="album-thumb${isLastWithOverflow ? ' album-thumb--more' : ''}" data-album="${ai}" data-index="${realIndex}" aria-label="${cap}">
            ${renderImg(src, cap, 'loading="lazy" decoding="async"')}
            ${isLastWithOverflow ? `<span class="album-more-overlay">+${overflow}</span>` : ''}
          </button>`;
        }).join('');
        preview = `<div class="album-preview-grid">${thumbs}</div>`;
      }

      return `
        <section class="album">
          <header class="album-head">
            <h2>${title}</h2>
            ${metaLine ? `<p class="album-meta">${metaLine}</p>` : ''}
          </header>
          ${cover}
          ${preview}
        </section>`;
    }).join('');

    const totalPhotos = data.albums.reduce((s, a) => s + ((a.images || []).length), 0);
    renderStats(data.albums.length, totalPhotos, lang);

    bindLightbox();
  }

  function renderStats(albumCount, photoCount, lang) {
    const el = document.getElementById('galleryStats');
    if (!el) return;
    if (!albumCount) { el.hidden = true; el.textContent = ''; return; }
    const aWord = lang === 'en'
      ? (albumCount === 1 ? 'album' : 'albums')
      : (albumCount === 1 ? 'album' : (albumCount >= 2 && albumCount <= 4 ? 'albumy' : 'albumów'));
    const pWord = lang === 'en'
      ? (photoCount === 1 ? 'photo' : 'photos')
      : (photoCount === 1 ? 'zdjęcie' : (photoCount >= 2 && photoCount <= 4 ? 'zdjęcia' : 'zdjęć'));
    el.textContent = `${albumCount} ${aWord} · ${photoCount} ${pWord}`;
    el.hidden = false;
  }

  // ---- Lightbox ----
  const lb       = document.getElementById('lightbox');
  const lbImg    = document.getElementById('lightboxImg');
  const lbCap    = document.getElementById('lightboxCaption');
  const lbClose  = document.getElementById('lightboxClose');
  const lbPrev   = document.getElementById('lightboxPrev');
  const lbNext   = document.getElementById('lightboxNext');
  let curAlbum = 0, curIndex = 0;

  function open(a, i) {
    curAlbum = a; curIndex = i;
    show();
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function close() {
    lb.hidden = true;
    document.body.style.overflow = '';
  }
  function show() {
    const lang = (window.WP_I18N && window.WP_I18N.lang) || 'pl';
    const album = data.albums[curAlbum];
    const img = album.images[curIndex];
    lbImg.src = `assets/gallery/${album.folder}/${img.file}`;
    lbImg.alt = pick(img, 'caption', lang) || pick(album, 'title', lang);
    const counter = `${curIndex + 1} / ${album.images.length}`;
    lbCap.textContent = `${counter} · ${lbImg.alt}`;
  }
  function step(d) {
    const len = data.albums[curAlbum].images.length;
    curIndex = (curIndex + d + len) % len;
    show();
  }

  function bindLightbox() {
    root.querySelectorAll('.album-cover, .album-thumb').forEach((el) => {
      el.addEventListener('click', () => open(+el.dataset.album, +el.dataset.index));
    });
  }

  lbClose?.addEventListener('click', close);
  lbPrev?.addEventListener('click', () => step(-1));
  lbNext?.addEventListener('click', () => step(1));
  lb?.addEventListener('click', (e) => { if (e.target === lb) close(); });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });

  document.addEventListener('i18n:changed', render);
  load();
})();
