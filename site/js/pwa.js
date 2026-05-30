// Register service worker for offline-capable browsing.
// Safe no-op on browsers without service worker support or on file:// origins.
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function (err) {
      console.warn('SW registration failed:', err);
    });
  });
}
