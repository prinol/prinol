const appState = {
  offset: 0,
  limit: 12,
  loading: false,
  hasMore: true,
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
};

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: { accept: 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {}
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `요청 실패 (${res.status})`);
  }
  return data;
}

function textLinesToList(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function fillProfile(profile = {}) {
  if (appEls.heroTitle) appEls.heroTitle.textContent = profile.hero_title || profile.heroTitle || 'Selected Works';
  if (appEls.heroSubtitle) appEls.heroSubtitle.textContent = profile.hero_subtitle || profile.heroSubtitle || 'PRINOL ART PORTFOLIO';
  if (appEls.aboutTitle) appEls.aboutTitle.textContent = profile.about_title || profile.aboutTitle || 'About';
  if (appEls.aboutBody) appEls.aboutBody.textContent = profile.about_body || profile.aboutBody || '';

  if (appEls.awardsList) {
    const awards = textLinesToList(profile.awards_text || profile.awards || '');
    appEls.awardsList.innerHTML = '';
    awards.forEach((award) => {
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
  link.setAttribute('aria-label', item.title || 'Artwork detail');

  const image = document.createElement('img');
  image.className = 'work-card-image';
  image.src = item.image_url || `/images/${item.image_key}`;
  image.alt = item.title || 'Artwork';
  image.loading = 'lazy';

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

function renderWorks(items, append = true) {
  if (!appEls.worksGrid) return;

  if (!append) {
    appEls.worksGrid.innerHTML = '';
  }

  items.forEach((item) => {
    appEls.worksGrid.appendChild(makeCard(item));
  });

  const currentItems = appEls.worksGrid.querySelectorAll('.work-card').length;
  const uniqueCategories = new Set(
    Array.from(appEls.worksGrid.querySelectorAll('.work-card')).map((card) =>
      card.dataset.category || ''
    )
  );

  if (appEls.publicCount) appEls.publicCount.textContent = String(currentItems);
  if (appEls.categoryCount) {
    // fallback without card dataset
    const set = new Set(items.map((item) => item.category).filter(Boolean));
    const current = Number(appEls.categoryCount.dataset.current || 0);
    const total = Math.max(current, set.size);
    appEls.categoryCount.textContent = String(total || set.size);
    appEls.categoryCount.dataset.current = String(total || set.size);
  }

  if (appEls.worksEmpty) {
    appEls.worksEmpty.hidden = currentItems > 0;
  }
}

async function loadWorks() {
  if (appState.loading || !appState.hasMore) return;

  appState.loading = true;
  if (appEls.worksLoading) appEls.worksLoading.hidden = false;

  try {
    const data = await fetchJson(`/api/artworks?public=1&limit=${appState.limit}&offset=${appState.offset}`);
    const items = Array.isArray(data?.items) ? data.items : [];
    const total = Number(data?.total || 0);

    renderWorks(items, true);

    const allCards = document.querySelectorAll('.work-card').length;
    appState.offset += items.length;
    appState.hasMore = items.length === appState.limit && (total === 0 || allCards < total);

    if (!items.length && appState.offset === 0 && appEls.worksEmpty) {
      appEls.worksEmpty.hidden = false;
    }
  } catch (err) {
    console.warn(err);
    if (appEls.worksEmpty && appState.offset === 0) {
      appEls.worksEmpty.hidden = false;
      appEls.worksEmpty.textContent = '작품을 불러오지 못했습니다.';
    }
    appState.hasMore = false;
  } finally {
    appState.loading = false;
    if (appEls.worksLoading) appEls.worksLoading.hidden = true;
  }
}

function initInfiniteScroll() {
  if (!appEls.sentinel) return;
  const io = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      loadWorks();
    }
  }, { rootMargin: '400px 0px' });
  io.observe(appEls.sentinel);
}

loadProfile();
loadWorks();
initInfiniteScroll();
