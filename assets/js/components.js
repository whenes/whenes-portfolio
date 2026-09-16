const THEME_KEY = 'theme';

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch (_) { /* storage blocked: theme still applies this visit */ }
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.setAttribute('aria-label', theme === 'dark' ? i18n.themeToLight : i18n.themeToDark);
  });
  document.dispatchEvent(new CustomEvent('themechange'));
}

function initThemeToggle() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  setTheme(current);
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  });
}

const CHECK_ICON = '<svg class="icon" aria-hidden="true"><use href="#i-check"></use></svg>';

function showToast(message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    document.body.append(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast toast-live';
  toast.innerHTML = `${CHECK_ICON}<span class="toast-text"></span>`;
  toast.querySelector('.toast-text').textContent = message;
  container.append(toast);
  setTimeout(() => {
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
    setTimeout(() => toast.remove(), 400);
  }, 2600);
}

function initCopy() {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-copy], [data-copy-from]');
    if (!button) return;
    const source = button.dataset.copyFrom && document.querySelector(button.dataset.copyFrom);
    const text = source ? source.textContent : button.dataset.copy;
    try {
      await navigator.clipboard.writeText(text);
      showToast(button.dataset.copyMessage || i18n.copied);
    } catch (_) {
      showToast(i18n.copyBlocked);
    }
  });
}

function initFlagCases() {
  document.querySelectorAll('[data-flag-case]').forEach((root) => {
    const toggle = root.querySelector('.flag-switch');
    const render = (on) => {
      toggle.setAttribute('aria-checked', String(on));
      // Both states' copy lives in the markup (translated per page); only the matching one shows.
      root.querySelectorAll('[data-flag-state]').forEach((el) => {
        el.hidden = (el.dataset.flagState === 'on') !== on;
      });
      root.querySelectorAll('[data-flag-target]').forEach((el) => {
        const active = (el.dataset.flagTarget === 'modern') === on;
        el.classList.toggle('is-active', active);
        el.classList.toggle('is-idle', !active);
      });
    };
    toggle.addEventListener('click', () => render(toggle.getAttribute('aria-checked') !== 'true'));
    render(toggle.getAttribute('aria-checked') === 'true');
  });
}

function dedent(html) {
  const lines = html.replace(/^\n+|\s+$/g, '').split('\n');
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return lines.map((l) => l.slice(indent)).join('\n');
}

function initSnippets() {
  document.querySelectorAll('[data-snippet-for]').forEach((code) => {
    const source = document.getElementById(code.dataset.snippetFor);
    code.textContent = dedent(source.innerHTML);
  });
}

function initSwatches() {
  const render = () => {
    const styles = getComputedStyle(document.documentElement);
    document.querySelectorAll('[data-token-value]').forEach((el) => {
      el.textContent = styles.getPropertyValue(el.dataset.tokenValue).trim();
    });
  };
  render();
  document.addEventListener('themechange', render);
}

// Only the horizontal mobile nav needs this; scrollIntoView would also move the window mid smooth-scroll.
function revealInSidebar(link) {
  const bar = link.closest('.app-sidebar');
  if (!bar || bar.scrollWidth <= bar.clientWidth) return;
  const left = link.offsetLeft - bar.clientWidth / 2 + link.offsetWidth / 2;
  bar.scrollTo({ left, behavior: 'smooth' });
}

function initScrollSpy() {
  const links = [...document.querySelectorAll('.app-sidebar-link[href^="#"]')];
  const sections = links.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  if (!sections.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((link) => {
        const match = link.getAttribute('href') === `#${entry.target.id}`;
        link.toggleAttribute('aria-current', match);
        if (match) {
          link.setAttribute('aria-current', 'true');
          revealInSidebar(link);
        }
      });
    });
  }, { rootMargin: '-20% 0px -70% 0px' });
  sections.forEach((section) => observer.observe(section));
}

// Carries a deep link such as #job-totvs across to the other language's page.
function initLangSwitch() {
  document.querySelectorAll('.lang-switch a').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!location.hash || link.getAttribute('aria-current') === 'true') return;
      event.preventDefault();
      location.href = link.href.split('#')[0] + location.hash;
    });
  });
}

initThemeToggle();
initLangSwitch();
initCopy();
initFlagCases();
initSnippets();
initSwatches();
initScrollSpy();
