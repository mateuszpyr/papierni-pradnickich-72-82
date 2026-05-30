(function () {
  const STORAGE_KEY = 'wp-lang';
  const SUPPORTED = ['pl', 'en'];
  let dict = {};
  let currentLang = localStorage.getItem(STORAGE_KEY) || (navigator.language && navigator.language.startsWith('en') ? 'en' : 'pl');
  if (!SUPPORTED.includes(currentLang)) currentLang = 'pl';
  let initialLoadDone = false;

  function get(key) {
    return key.split('.').reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), dict);
  }

  function apply() {
    document.documentElement.setAttribute('lang', currentLang);
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const val = get(key);
      if (typeof val === 'string') el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.getAttribute('data-i18n-html');
      const val = get(key);
      if (typeof val === 'string') el.innerHTML = val;
    });
    document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      // format: "attr:key;attr2:key2"
      const spec = el.getAttribute('data-i18n-attr');
      spec.split(';').forEach((pair) => {
        const [attr, key] = pair.split(':').map((s) => s.trim());
        const val = get(key);
        if (val != null) el.setAttribute(attr, val);
      });
    });
    const flag = document.querySelector('#langToggle .lang-flag');
    const code = document.querySelector('#langToggle .lang-code');
    if (flag && code) {
      // Show the OTHER language (what clicking switches to)
      const other = currentLang === 'pl' ? 'en' : 'pl';
      const flagSvg = {
        pl: '<svg viewBox="0 0 20 14" width="18" height="13" aria-hidden="true"><rect width="20" height="7" fill="#fff"/><rect y="7" width="20" height="7" fill="#dc143c"/><rect x="0.5" y="0.5" width="19" height="13" fill="none" stroke="rgba(0,0,0,.15)" stroke-width="1"/></svg>',
        en: '<svg viewBox="0 0 20 14" width="18" height="13" aria-hidden="true"><rect width="20" height="14" fill="#012169"/><path d="M0 0 L20 14 M20 0 L0 14" stroke="#fff" stroke-width="2.2"/><path d="M0 0 L20 14 M20 0 L0 14" stroke="#c8102e" stroke-width="1.2"/><path d="M10 0 V14 M0 7 H20" stroke="#fff" stroke-width="3.5"/><path d="M10 0 V14 M0 7 H20" stroke="#c8102e" stroke-width="2"/></svg>'
      };
      flag.innerHTML = flagSvg[other];
      code.textContent = other.toUpperCase();
    }
    if (initialLoadDone) {
      document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang: currentLang } }));
    } else {
      initialLoadDone = true;
    }
  }

  async function load(lang) {
    try {
      const res = await fetch(`i18n/${lang}.json`, { cache: 'no-cache' });
      if (!res.ok) throw new Error('i18n load failed');
      dict = await res.json();
      apply();
    } catch (e) {
      console.warn('i18n:', e);
    }
  }

  const btn = document.getElementById('langToggle');
  if (btn) {
    btn.addEventListener('click', () => {
      currentLang = currentLang === 'pl' ? 'en' : 'pl';
      localStorage.setItem(STORAGE_KEY, currentLang);
      load(currentLang);
    });
  }

  // Expose for other scripts
  window.WP_I18N = {
    get lang() { return currentLang; },
    t: get,
  };

  load(currentLang);
})();
