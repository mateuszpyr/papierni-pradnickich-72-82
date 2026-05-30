(function () {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('wp-theme', next);
  });
})();

(function () {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const apply = () => {
    document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  };
  apply();
  if ('ResizeObserver' in window) {
    new ResizeObserver(apply).observe(header);
  } else {
    window.addEventListener('resize', apply);
  }
})();
