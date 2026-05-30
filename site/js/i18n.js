(function () {
  const STORAGE_KEY = 'wp-lang';
  const SUPPORTED = ['pl', 'en'];
  let dict = {};
  let currentLang = localStorage.getItem(STORAGE_KEY) || (navigator.language && navigator.language.startsWith('en') ? 'en' : 'pl');
  if (!SUPPORTED.includes(currentLang)) currentLang = 'pl';

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
      flag.textContent = other === 'pl' ? '🇵🇱' : '🇬🇧';
      code.textContent = other.toUpperCase();
    }
    document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang: currentLang } }));
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
