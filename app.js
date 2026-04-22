const PAGE_SIZE = 12;

const state = {
  artworks: [],
  filtered: [],
  visibleCount: 0,
  observer: null,
  profile: null,
};

const els = {
  gallery: document.getElementById('gallery'),
  emptyState: document.getElementById('emptyState'),
  loadSentinel: document.getElementById('loadSentinel'),
  searchInput: document.getElementById('searchInput'),
  yearFilter: document.getElementById('yearFilter'),
  categoryFilter: document.getElementById('categoryFilter'),
  publicCount: document.getElementById('publicCount'),
  categoryCount: document.getElementById('categoryCount'),
  heroTitle: document.getElementById('heroTitle'),
  heroSubtitle: document.getElementById('heroSubtitle'),
  aboutTitle: document.getElementById('aboutTitle'),
  aboutBody: document.getElementById('aboutBody'),
  awardsList: document.getElementById('awardsList'),
  contactEmail: document.getElementById('contactEmail'),
  brandText: document.getElementById('brandText'),
  template: document.getElementById('artworkCardTemplate'),
};

const TAG_CLASSES = [
  'tag-chip color-1',
  'tag-chip color-2',
  'tag-chip color-3',
  'tag-chip color-4',
  'tag-chip color-5',
  'tag-chip color-6',
];

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function splitAwards(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  return String(value).split(/\r?\n/).map(v => v.trim()).filter(Boolean);
}

function splitTags(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  return String(value).split(',').map(v => v.trim()).filter(Boolean);
}

function normalizeProfile(raw) {
  const data = raw?.profile ?? raw?.item ?? raw?.data ?? raw ?? {};
  return {
    heroTitle: data.heroTitle ?? data.hero_title ?? 'PRINOL',
    heroSubtitle: data.heroSubtitle ?? data.hero_subtitle ?? data.subtitle ?? 'Personal Artwork Portfolio',
    aboutTitle: data.aboutTitle ?? data.about_title ?? '작가 소개',
    aboutBody: data.aboutBody ?? data.about_body ?? data.bio ?? '작가 소개 문장을 입력하세요.',
    awards: splitAwards(data.awards ?? data.awards_text ?? data.awardText ?? data.award_text ?? ''),
    email: data.email ?? data.contactEmail ?? data.contact_email ?? '',
  };
}

function toTimestamp(item) {
  const candidates = [item.updated_at, item.created_at, item.createdAt, item.id];
  for (const value of candidates) {
    if (!value) continue;
    const time = new Date(value).getTime();
    if (!Number.isNaN(time) && time > 0) return time;
    const num = Number(value);
    if (!Number.isNaN(num)) return num;
  }
  return 0;
}

function normalizeArtworks(raw) {
  const items = raw?.items ?? raw?.artworks ?? raw?.data ?? [];
  if (!Array.isArray(items)) return [];
  return items
    .filter(item => item && item.is_public !== 0 && item.is_public !== false)
    .sort((a, b) => toTimestamp(b) - toTimestamp(a));
}

function renderProfile() {
  const p = state.profile || normalizeProfile({});
  if (els.brandText) els.brandText.textContent = 'PRINOL';
  if (els.heroTitle) els.heroTitle.textContent = p.heroTitle || 'PRINOL';
  if (els.heroSubtitle) els.heroSubtitle.textContent = p.heroSubtitle || 'Personal Artwork Portfolio';
  if (els.aboutTitle) els.aboutTitle.textContent = p.aboutTitle || '작가 소개';
  if (els.aboutBody) els.aboutBody.innerHTML = escapeHtml(p.aboutBody || '').replace(/\n/g, '<br>');

  if (els.contactEmail) {
    const email = (p.email || '').trim();
    if (email) {
      els.contactEmail.textContent = email;
      els.contactEmail.href = `mailto:${email}`;
    } else {
      els.contactEmail.textContent = '-';
      els.contactEmail.removeAttribute('href');
    }
  }

  if (els.awardsList) {
    els.awardsList.innerHTML = '';
    const awards = p.awards || [];
    if (awards.length === 0) {
      const li = document.createElement('li');
      li.textContent = '수상 이력이 없습니다.';
      els.awardsList.appendChild(li);
    } else {
      awards.forEach(text => {
        const li = document.createElement('li');
        li.textContent = text;
        els.awardsList.appendChild(li);
      });
    }
  }
}

function renderFilterOptions() {
  if (els.categoryFilter) {
    const currentCategory = els.categoryFilter.value;
    const categories = [...new Set(state.artworks.map(item => item.category).filter(Boolean))];
    els.categoryFilter.innerHTML = '<option value="">전체 카테고리</option>';
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      els.categoryFilter.appendChild(option);
    });
    els.categoryFilter.value = currentCategory;
  }

  if (els.yearFilter) {
    const currentYear = els.yearFilter.value;
    const years = [...new Set(state.artworks.map(item => String(item.year || '').trim()).filter(Boolean))]
      .sort((a, b) => Number(b) - Number(a) || String(b).localeCompare(String(a)));
    els.yearFilter.innerHTML = '<option value="">전체 연도</option>';
    years.forEach(year => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      els.yearFilter.appendChild(option);
    });
    els.yearFilter.value = currentYear;
  }
}

function resetVisibleCount() {
  state.visibleCount = Math.min(PAGE_SIZE, state.filtered.length);
}

function applyFilters() {
  const keyword = (els.searchInput?.value || '').trim().toLowerCase();
  const category = els.categoryFilter?.value || '';
  const year = els.yearFilter?.value || '';

  state.filtered = state.artworks.filter(item => {
    const itemYear = String(item.year || '').trim();
    const matchesCategory = !category || item.category === category;
    const matchesYear = !year || itemYear === year;
    const haystack = [
      item.title,
      item.description,
      item.category,
      item.tags,
      item.year,
    ].join(' ').toLowerCase();
    const matchesKeyword = !keyword || haystack.includes(keyword);
    return matchesCategory && matchesYear && matchesKeyword;
  });

  resetVisibleCount();
  renderGallery();
  updateSentinel();
}

function renderTags(container, tags) {
  container.innerHTML = '';
  tags.forEach((tag, index) => {
    const span = document.createElement('span');
    span.className = TAG_CLASSES[index % TAG_CLASSES.length];
    span.textContent = tag;
    container.appendChild(span);
  });
}

function renderGallery() {
  if (!els.gallery || !els.template) return;
  els.gallery.innerHTML = '';

  const visibleItems = state.filtered.slice(0, state.visibleCount);

  if (!visibleItems.length) {
    els.emptyState?.classList.remove('hidden');
  } else {
    els.emptyState?.classList.add('hidden');
  }

  visibleItems.forEach(item => {
    const node = els.template.content.firstElementChild.cloneNode(true);
    const link = node.querySelector('.thumb-link');
    const img = node.querySelector('.thumb-image');
    const title = node.querySelector('.thumb-title');
    const year = node.querySelector('.thumb-year');
    const category = node.querySelector('.thumb-category');
    const tagsWrap = node.querySelector('.thumb-tags');

    if (link) link.href = `artwork.html?id=${encodeURIComponent(item.id)}`;
    if (img) {
      img.src = item.image_url || `/images/${item.image_key}`;
      img.alt = item.title || 'Artwork';
      img.loading = 'lazy';
    }
    if (title) title.textContent = item.title || '';
    if (year) year.textContent = item.year || '';
    if (category) category.textContent = item.category || '';
    if (tagsWrap) renderTags(tagsWrap, splitTags(item.tags));

    els.gallery.appendChild(node);
  });

  if (els.publicCount) els.publicCount.textContent = String(state.artworks.length);
  if (els.categoryCount) {
    const count = new Set(state.artworks.map(item => item.category).filter(Boolean)).size;
    els.categoryCount.textContent = String(count);
  }
}

function loadMore() {
  if (state.visibleCount >= state.filtered.length) return;
  state.visibleCount = Math.min(state.visibleCount + PAGE_SIZE, state.filtered.length);
  renderGallery();
  updateSentinel();
}

function updateSentinel() {
  if (!els.loadSentinel) return;
  els.loadSentinel.style.display = state.visibleCount < state.filtered.length ? 'block' : 'none';
}

function setupInfiniteScroll() {
  if (!els.loadSentinel) return;
  if (state.observer) state.observer.disconnect();

  state.observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) loadMore();
    });
  }, { rootMargin: '300px 0px' });

  state.observer.observe(els.loadSentinel);
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`JSON 응답이 아닙니다: ${url}`);
  }
  if (!res.ok) {
    const message = data?.error || data?.message || `요청 실패: ${res.status}`;
    throw new Error(message);
  }
  return data;
}

async function loadProfile() {
  try {
    const raw = await fetchJson('/api/profile');
    state.profile = normalizeProfile(raw);
  } catch (err) {
    console.warn('프로필 로드 실패:', err);
    state.profile = normalizeProfile({});
  }
  renderProfile();
}

async function loadArtworks() {
  try {
    const raw = await fetchJson('/api/artworks');
    state.artworks = normalizeArtworks(raw);
  } catch (err) {
    console.warn('작품 로드 실패:', err);
    state.artworks = [];
  }
  renderFilterOptions();
  applyFilters();
}

function bindEvents() {
  els.searchInput?.addEventListener('input', applyFilters);
  els.categoryFilter?.addEventListener('change', applyFilters);
  els.yearFilter?.addEventListener('change', applyFilters);
}

async function init() {
  bindEvents();
  setupInfiniteScroll();
  await Promise.all([loadProfile(), loadArtworks()]);
}

init();
