(function () {
  const v = document.getElementById('heroVideo');
  const btnPlay  = document.getElementById('videoToggle');
  const btnSound = document.getElementById('soundToggle');
  if (!v) return;

  const srcDark  = v.dataset.srcDark;
  const srcLight = v.dataset.srcLight;
  if (!srcDark && !srcLight) return;

  // Detect "expensive" environment: small screens, data saver, reduced motion, slow connection.
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const saveData = !!(conn && conn.saveData);
  const slowNet  = !!(conn && /^(slow-2g|2g)$/i.test(conn.effectiveType || ''));
  const reduced  = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Mobile gets video too now (MP4s are ~800-940 KB after compression). Skip only on data saver / slow net / reduced motion.
  const skipVideo = saveData || slowNet || reduced;

  function pickSrc() {
    const dark = document.documentElement.dataset.theme === 'dark'
      || (document.documentElement.dataset.theme !== 'light'
          && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    return dark ? (srcDark || srcLight) : (srcLight || srcDark);
  }

  let loaded = false;
  function loadAndPlay() {
    if (loaded) {
      v.play().catch(() => {});
      return;
    }
    loaded = true;
    v.src = pickSrc();
    v.muted = true;
    v.load();
    v.play().catch(() => {});
  }

  v.addEventListener('error', () => { v.style.display = 'none'; });

  if (skipVideo) {
    // Only the poster is rendered; controls become "play to load on demand"
    btnPlay?.classList.add('paused');
    btnPlay?.setAttribute('aria-label', 'Play video');
    btnSound?.classList.add('muted');
  } else {
    // Hero is always at the top of the page → load immediately. IntersectionObserver caused
    // intermittent no-op on some mobile contexts where first callback didn't fire.
    btnSound?.classList.add('muted');
    loadAndPlay();
  }

  // React to theme change: swap source only if already loaded
  const themeObserver = new MutationObserver(() => {
    if (!loaded) return;
    const want = pickSrc();
    if (v.currentSrc && v.currentSrc.endsWith(want.split('/').pop())) return;
    const wasPaused = v.paused;
    v.src = want;
    v.load();
    if (!wasPaused) v.play().catch(() => {});
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  btnPlay?.addEventListener('click', () => {
    if (!loaded) { loadAndPlay(); btnPlay.classList.remove('paused'); btnPlay.setAttribute('aria-label', 'Pause video'); return; }
    if (v.paused) {
      v.play().catch(() => {});
      btnPlay.classList.remove('paused');
      btnPlay.setAttribute('aria-label', 'Pause video');
    } else {
      v.pause();
      btnPlay.classList.add('paused');
      btnPlay.setAttribute('aria-label', 'Play video');
    }
  });

  btnSound?.addEventListener('click', () => {
    if (!loaded) loadAndPlay();
    const next = !v.muted;
    v.muted = next;
    btnSound.classList.toggle('muted', next);
    btnSound.setAttribute('aria-label', next ? 'Unmute video' : 'Mute video');
    if (!v.muted && v.paused) v.play().catch(() => {});
  });
})();
