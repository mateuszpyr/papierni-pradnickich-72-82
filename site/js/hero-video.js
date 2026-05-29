(function () {
  const videos   = Array.from(document.querySelectorAll('.hero-video'));
  const btnPlay  = document.getElementById('videoToggle');
  const btnSound = document.getElementById('soundToggle');
  if (!videos.length) return;

  // Determine which video is visible for current theme
  function activeVideo() {
    return videos.find((v) => v.offsetParent !== null) || videos[0];
  }

  // Start muted (required for autoplay)
  btnSound?.classList.add('muted');

  videos.forEach((v) => {
    v.muted = true;
    v.addEventListener('error', () => { v.style.display = 'none'; });
  });

  btnPlay?.addEventListener('click', () => {
    const v = activeVideo();
    if (v.paused) {
      videos.forEach((x) => x.play().catch(() => {}));
      btnPlay.classList.remove('paused');
      btnPlay.setAttribute('aria-label', 'Pause video');
    } else {
      videos.forEach((x) => x.pause());
      btnPlay.classList.add('paused');
      btnPlay.setAttribute('aria-label', 'Play video');
    }
  });

  btnSound?.addEventListener('click', () => {
    const v = activeVideo();
    const next = !v.muted;
    // Mute all inactive videos, set sound state on the active one
    videos.forEach((x) => { x.muted = (x === v) ? next : true; });
    btnSound.classList.toggle('muted', next);
    btnSound.setAttribute('aria-label', next ? 'Unmute video' : 'Mute video');
    if (!v.muted && v.paused) v.play().catch(() => {});
  });

  // Respect reduced motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    videos.forEach((v) => v.pause());
    btnPlay?.classList.add('paused');
  }
})();
