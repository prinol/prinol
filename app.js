const state = {
  artworks: [],
  filtered: []
};

const elements = {
  brandText: document.getElementById('brandText'),
  heroTitle: document.getElementById('heroTitle'),
  heroSubtitle: document.getElementById('heroSubtitle'),
  aboutTitle: document.getElementById('aboutTitle'),
  aboutBody: document.getElementById('aboutBody'),
  awardsList: document.getElementById('awardsList'),
  contactEmail: document.getElementById('contactEmail'),
  contactInstagram: document.getElementById('contactInstagram'),
  publicCount: document.getElementById('publicCount'),
  categoryCount: document.getElementById('categoryCount'),
  searchInput: document.getElementById('searchInput'),
  categoryFilter: document.getElementById('categoryFilter'),
  gallery: document.getElementById('gallery'),
  emptyState: document.getElementById('emptyState'),
  artworkCardTemplate: document.getElementById('artworkCardTemplate')
};

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function normalizeTags(text = '') {
  return text.split(',').map(v => v.trim()).filter(Boolean);
}

function renderProfile(profile) {
  elements.brandText.textContent = profile.hero_title || 'PRINOL';
  elements.heroTitle.textContent = profile.hero_title || 'PRINOL';
  elements.heroSubtitle.textContent = profile.hero_subtitle || '';
  elements.aboutTitle.textContent = profile.about_title || '작가 소개';
  elements.aboutBody.textContent = profile.about_body || '';

  elements.awardsList.innerHTML = '';
  const lines = (profile.awards_text || '')
    .split(/\r?\n/)
    .map(v => v.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    const li = document.createElement('li');
    li.textContent = '등록된 수상 이력이 없습니다.';
    elements.awardsList.appendChild(li);
  } else {
    lines.forEach(line => {
      const li = document.createElement('li');
      li.textContent = line;
      elements.awardsList.appendChild(li);
    });
  }

  elements.contactEmail.textContent = profile.contact_email || '-';
  elements.contactEmail.href = profile.contact_email ? `mailto:${profile.contact_email}` : '#';
  elements.contactInstagram.textContent = profile.contact_instagram || '-';
  elements.contactInstagram.href = profile.contact_instagram || '#';
}

function populateCategoryFilter(artworks) {
  const categories = [...new Set(artworks.map(item => (item.category || '').trim()).filter(Boolean))].sort();
  elements.categoryFilter.innerHTML = '<option value="">전체 카테고리</option>';
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    elements.categoryFilter.appendChild(option);
  });
  elements.categoryCount.textContent = String(categories.length);
}

function applyFilters() {
  const search = elements.searchInput.value.trim().toLowerCase();
  const category = elements.categoryFilter.value;

  state.filtered = state.artworks.filter(item => {
    const haystack = [item.title, item.description, item.tags, item.category, item.year].join(' ').toLowerCase();
    const searchMatch = !search || haystack.includes(search);
    const categoryMatch = !category || item.category === category;
    return searchMatch && categoryMatch;
  });

  renderGallery();
}

function renderGallery() {
  elements.gallery.innerHTML = '';
  if (state.filtered.length === 0) {
    elements.emptyState.classList.remove('hidden');
    return;
  }
  elements.emptyState.classList.add('hidden');

  state.filtered.forEach(item => {
    const node = elements.artworkCardTemplate.content.firstElementChild.cloneNode(true);
    const img = node.querySelector('.artwork-image');
    img.src = item.image_url;
    img.alt = item.title;
    node.querySelector('.artwork-title').textContent = item.title || '';
    node.querySelector('.artwork-year').textContent = item.year || '';
    node.querySelector('.artwork-category').textContent = item.category || '';
    node.querySelector('.artwork-description').textContent = item.description || '';
    const tags = normalizeTags(item.tags).map(tag => `#${tag}`).join(' ');
    node.querySelector('.artwork-tags').textContent = tags;
    elements.gallery.appendChild(node);
  });
}

async function init() {
  elements.searchInput.addEventListener('input', applyFilters);
  elements.categoryFilter.addEventListener('change', applyFilters);

  const [profilePayload, artworksPayload] = await Promise.all([
    fetchJson('/api/profile'),
    fetchJson('/api/artworks')
  ]);

  renderProfile(profilePayload.profile);
  state.artworks = artworksPayload.items || [];
  elements.publicCount.textContent = String(state.artworks.length);
  populateCategoryFilter(state.artworks);
  applyFilters();
}

init().catch(err => {
  console.error(err);
  elements.emptyState.classList.remove('hidden');
  elements.emptyState.textContent = '데이터를 불러오지 못했습니다.';
});
