(function () {
  const v = document.getElementById('historyHeroVideo');
  const btnPlay  = document.getElementById('historyVideoToggle');
  const btnSound = document.getElementById('historySoundToggle');
  if (!v) return;

  const src = v.dataset.src;
  if (!src) return;

  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const saveData = !!(conn && conn.saveData);
  const slowNet  = !!(conn && /^(slow-2g|2g)$/i.test(conn.effectiveType || ''));
  const reduced  = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const skipVideo = saveData || slowNet || reduced;

  let loaded = false;
  function loadAndPlay() {
    if (loaded) { v.play().catch(() => {}); return; }
    loaded = true;
    v.src = src;
    v.muted = true;
    v.load();
    v.play().catch(() => {});
  }

  v.addEventListener('error', () => { v.style.display = 'none'; });

  btnSound?.classList.add('muted');

  if (skipVideo) {
    btnPlay?.classList.add('paused');
    btnPlay?.setAttribute('aria-label', 'Odtwarzaj wideo');
  } else {
    // Lazy-load when hero scrolls into view
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { loadAndPlay(); io.disconnect(); break; }
        }
      }, { rootMargin: '200px 0px' });
      io.observe(v);
    } else {
      loadAndPlay();
    }
  }

  btnPlay?.addEventListener('click', () => {
    if (!loaded) { loadAndPlay(); btnPlay.classList.remove('paused'); btnPlay.setAttribute('aria-label', 'Pauza'); return; }
    if (v.paused) {
      v.play().catch(() => {});
      btnPlay.classList.remove('paused');
      btnPlay.setAttribute('aria-label', 'Pauza');
    } else {
      v.pause();
      btnPlay.classList.add('paused');
      btnPlay.setAttribute('aria-label', 'Odtwarzaj wideo');
    }
  });

  btnSound?.addEventListener('click', () => {
    if (!loaded) loadAndPlay();
    const next = !v.muted;
    v.muted = next;
    btnSound.classList.toggle('muted', next);
    btnSound.setAttribute('aria-label', next ? 'Włącz dźwięk' : 'Wycisz');
    if (!v.muted && v.paused) v.play().catch(() => {});
  });
})();
