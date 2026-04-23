const appState = {
  allItems: [],
  filteredItems: [],
  visibleItems: [],
  offset: 0,
  limit: 12,
  hasMoreFiltered: true,
  observer: null,
  selectedYear: '',
  selectedCategories: new Set(),
  keyword: '',
  theme: 'dark',
};

const appEls = {
  heroTitle: document.getElementById('heroTitle'),
  heroSubtitle: document.getElementById('heroSubtitle'),
  publicCount: document.getElementById('publicCount'),
  categoryCount: document.getElementById('categoryCount'),
  aboutTitle: document.getElementById('aboutTitle'),
  aboutBody: document.getElementById('aboutBody'),
  awardsList: document.getElementById('awardsList'),
  emailLink: document.getElementById('emailLink'),
  worksGrid: document.getElementById('worksGrid'),
  worksEmpty: document.getElementById('worksEmpty'),
  worksLoading: document.getElementById('worksLoading'),
  sentinel: document.getElementById('scrollSentinel'),
  keywordSearch: document.getElementById('keywordSearch'),
  resetSearchButton: document.getElementById('resetSearchButton'),
  yearFilter: document.getElementById('yearFilter'),
  categoryFilters: document.getElementById('categoryFilters'),
  themeToggle: document.getElementById('themeToggle'),
  themeToggleLabel: document.getElementById('themeToggleLabel'),
};

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: { accept: 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}
  if (!res.ok) throw new Error(data?.error || data?.message || `요청 실패 (${res.status})`);
  return data;
}

function textLinesToList(text) {
  return String(text || '').split(/\r?\n/).map(v => v.trim()).filter(Boolean);
}

function fillProfile(profile = {}) {
  if (appEls.heroTitle) appEls.heroTitle.textContent = profile.hero_title || profile.heroTitle || 'Selected Works';
  if (appEls.heroSubtitle) appEls.heroSubtitle.textContent = profile.hero_subtitle || profile.heroSubtitle || 'PRINOL ART PORTFOLIO';
  if (appEls.aboutTitle) appEls.aboutTitle.textContent = profile.about_title || profile.aboutTitle || 'About';
  if (appEls.aboutBody) appEls.aboutBody.textContent = profile.about_body || profile.aboutBody || '';

  if (appEls.awardsList) {
    const awards = textLinesToList(profile.awards_text || profile.awards || '');
    appEls.awardsList.innerHTML = '';
    awards.forEach(award => {
      const li = document.createElement('li');
      li.textContent = award;
      appEls.awardsList.appendChild(li);
    });
  }

  const email = profile.email || '';
  if (appEls.emailLink) {
    if (email) {
      appEls.emailLink.textContent = email;
      appEls.emailLink.href = `mailto:${email}`;
    } else {
      appEls.emailLink.textContent = '';
      appEls.emailLink.removeAttribute('href');
    }
  }
}

async function loadProfile() {
  try {
    const raw = await fetchJson('/api/profile');
    const profile = raw?.profile ?? raw?.data ?? raw ?? {};
    fillProfile(profile);
  } catch (err) {
    console.warn(err);
  }
}

function makeCard(item) {
  const link = document.createElement('a');
  link.className = 'work-card';
  link.href = `artwork.html?id=${encodeURIComponent(item.id)}`;
  link.dataset.category = item.category || '';
  link.setAttribute('aria-label', item.title || 'Artwork detail');

  const image = document.createElement('img');
  image.className = 'work-card-image';
  image.src = item.image_url || `/images/${item.image_key}`;
  image.alt = item.title || 'Artwork';
  image.loading = 'lazy';

  if (Number(item.is_pinned || 0) === 1) {
    const pin = document.createElement('span');
    pin.className = 'pinned-badge';
    pin.setAttribute('aria-label', '고정된 작품');
    pin.title = '고정된 작품';
    pin.textContent = '★';
    link.appendChild(pin);
  }

  const overlay = document.createElement('div');
  overlay.className = 'work-card-overlay';

  const title = document.createElement('h3');
  title.className = 'work-card-title';
  title.textContent = item.title || 'Untitled';

  overlay.appendChild(title);
  link.appendChild(image);
  link.appendChild(overlay);
  return link;
}

function renderVisibleItems() {
  if (!appEls.worksGrid) return;
  appEls.worksGrid.innerHTML = '';
  appState.visibleItems.forEach(item => appEls.worksGrid.appendChild(makeCard(item)));

  const categories = new Set(appState.filteredItems.map(item => item.category).filter(Boolean));
  if (appEls.publicCount) appEls.publicCount.textContent = String(appState.filteredItems.length);
  if (appEls.categoryCount) appEls.categoryCount.textContent = String(categories.size);
  if (appEls.worksEmpty) appEls.worksEmpty.hidden = appState.visibleItems.length > 0;
}

function appendMoreVisibleItems() {
  const next = appState.filteredItems.slice(appState.offset, appState.offset + appState.limit);
  if (!next.length) {
    appState.hasMoreFiltered = false;
    return;
  }
  appState.visibleItems = [...appState.visibleItems, ...next];
  appState.offset += next.length;
  appState.hasMoreFiltered = appState.offset < appState.filteredItems.length;
  renderVisibleItems();
}

function shuffleArray(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function uploadedTime(item) {
  const created = new Date(item.created_at || 0).getTime();
  if (Number.isFinite(created) && created > 0) return created;
  const updated = new Date(item.updated_at || 0).getTime();
  if (Number.isFinite(updated) && updated > 0) return updated;
  return Number(item.id) || 0;
}

function orderItemsForRefresh(items) {
  const pinned = items.filter(item => Number(item.is_pinned || 0) === 1)
    .sort((a, b) => uploadedTime(b) - uploadedTime(a));
  const unpinned = shuffleArray(items.filter(item => Number(item.is_pinned || 0) !== 1));
  return [...pinned, ...unpinned];
}

function syncUrlKeyword() {
  const url = new URL(window.location.href);
  if (appState.keyword.trim()) {
    url.searchParams.set('q', appState.keyword.trim());
  } else {
    url.searchParams.delete('q');
  }
  history.replaceState({}, '', url.toString());
}

function applyFilters(reset = true) {
  const keyword = appState.keyword.trim().toLowerCase();
  const selectedYear = appState.selectedYear;
  const selectedCategories = appState.selectedCategories;

  appState.filteredItems = appState.allItems.filter(item => {
    const haystack = [item.title, item.description, item.tags, item.category, item.year].join(' ').toLowerCase();
    const yearOk = !selectedYear || String(item.year || '') === selectedYear;
    const categoryOk = selectedCategories.size === 0 || selectedCategories.has(String(item.category || ''));
    const keywordOk = !keyword || haystack.includes(keyword);
    return yearOk && categoryOk && keywordOk;
  });

  syncUrlKeyword();

  if (reset) {
    appState.offset = 0;
    appState.visibleItems = [];
    appState.hasMoreFiltered = true;
    appendMoreVisibleItems();
  } else {
    renderVisibleItems();
  }
}

function buildYearOptions() {
  if (!appEls.yearFilter) return;
  const years = [...new Set(appState.allItems.map(item => String(item.year || '')).filter(Boolean))]
    .sort((a, b) => Number(b) - Number(a));

  appEls.yearFilter.innerHTML = '<option value="">전체 연도</option>';
  years.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    appEls.yearFilter.appendChild(option);
  });
}

function buildCategoryFilters() {
  if (!appEls.categoryFilters) return;
  const categories = [...new Set(appState.allItems.map(item => String(item.category || '')).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'ko'));

  appEls.categoryFilters.innerHTML = '';
  categories.forEach(category => {
    const label = document.createElement('label');
    label.className = 'checkbox-chip';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = category;
    input.addEventListener('change', () => {
      if (input.checked) appState.selectedCategories.add(category);
      else appState.selectedCategories.delete(category);
      applyFilters(true);
    });

    const text = document.createElement('span');
    text.textContent = category;

    label.appendChild(input);
    label.appendChild(text);
    appEls.categoryFilters.appendChild(label);
  });
}

async function loadAllWorks() {
  if (appEls.worksLoading) appEls.worksLoading.hidden = false;
  try {
    const data = await fetchJson('/api/artworks?public=1&limit=500&offset=0');
    const items = Array.isArray(data?.items) ? data.items : [];
    appState.allItems = orderItemsForRefresh(items);
    buildYearOptions();
    buildCategoryFilters();
    applyFilters(true);
  } catch (err) {
    console.warn(err);
    if (appEls.worksEmpty) {
      appEls.worksEmpty.hidden = false;
      appEls.worksEmpty.textContent = '작품을 불러오지 못했습니다.';
    }
  } finally {
    if (appEls.worksLoading) appEls.worksLoading.hidden = true;
  }
}

function initInfiniteScroll() {
  if (!appEls.sentinel) return;
  appState.observer = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting)) {
      if (appState.hasMoreFiltered) appendMoreVisibleItems();
    }
  }, { rootMargin: '400px 0px' });
  appState.observer.observe(appEls.sentinel);
}

function getPreferredTheme() {
  const saved = localStorage.getItem('prinol-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme, persist = true) {
  appState.theme = theme;
  document.documentElement.dataset.theme = theme;

  if (appEls.themeToggle) {
    const isLight = theme === 'light';
    appEls.themeToggle.setAttribute('aria-pressed', String(isLight));
  }
  if (appEls.themeToggleLabel) {
    appEls.themeToggleLabel.textContent = theme === 'light' ? 'Light' : 'Dark';
  }

  if (persist) localStorage.setItem('prinol-theme', theme);
}

function bindTheme() {
  const initial = getPreferredTheme();
  applyTheme(initial, false);

  appEls.themeToggle?.addEventListener('click', () => {
    const next = appState.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next, true);
  });

  const media = window.matchMedia('(prefers-color-scheme: light)');
  media.addEventListener?.('change', (e) => {
    const saved = localStorage.getItem('prinol-theme');
    if (!saved) applyTheme(e.matches ? 'light' : 'dark', false);
  });
}

function bindEvents() {
  const params = new URLSearchParams(location.search);
  const initialQ = params.get('q') || '';
  appState.keyword = initialQ;
  if (appEls.keywordSearch) appEls.keywordSearch.value = initialQ;

  appEls.keywordSearch?.addEventListener('input', (e) => {
    appState.keyword = e.target.value || '';
    applyFilters(true);
  });

  appEls.resetSearchButton?.addEventListener('click', () => {
    appState.keyword = '';
    if (appEls.keywordSearch) appEls.keywordSearch.value = '';
    applyFilters(true);
  });

  appEls.yearFilter?.addEventListener('change', (e) => {
    appState.selectedYear = e.target.value || '';
    applyFilters(true);
  });
}

bindTheme();
loadProfile();
bindEvents();
loadAllWorks();
initInfiniteScroll();
