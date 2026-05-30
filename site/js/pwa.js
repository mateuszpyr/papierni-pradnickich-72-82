// Register service worker for offline-capable browsing.
// Safe no-op on browsers without service worker support or on file:// origins.
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .then(function (reg) {
        // Force check for updated SW on every page load (bypass HTTP cache for sw.js).
        reg.update().catch(function () {});
        // When a new SW takes control, reload once so the page picks up fresh CSS/JS.
        let reloaded = false;
        navigator.serviceWorker.addEventListener('controllerchange', function () {
          if (reloaded) return;
          reloaded = true;
          window.location.reload();
        });
      })
      .catch(function (err) { console.warn('SW registration failed:', err); });
  });
}
