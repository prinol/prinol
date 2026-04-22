const state = {
  artworks: [],
  filtered: [],
};

const els = {
  galleryGrid: document.getElementById('galleryGrid'),
  emptyState: document.getElementById('emptyState'),
  searchInput: document.getElementById('searchInput'),
  categoryFilter: document.getElementById('categoryFilter'),
  yearFilter: document.getElementById('yearFilter'),
  publicCount: document.getElementById('publicCount'),
  categoryCount: document.getElementById('categoryCount'),
  template: document.getElementById('artCardTemplate'),
  lightbox: document.getElementById('lightbox'),
  lightboxImage: document.getElementById('lightboxImage'),
  lightboxTitle: document.getElementById('lightboxTitle'),
  lightboxDescription: document.getElementById('lightboxDescription'),
  closeLightbox: document.getElementById('closeLightbox'),
};

async function fetchArtworks() {
  const response = await fetch('/api/artworks');
  if (!response.ok) throw new Error('작품 목록을 불러오지 못했습니다.');
  state.artworks = await response.json();
  fillFilters();
  applyFilters();
}

function fillFilters() {
  const categories = [...new Set(state.artworks.map(item => item.category).filter(Boolean))].sort();
  const years = [...new Set(state.artworks.map(item => item.year).filter(Boolean))].sort((a, b) => Number(b) - Number(a));

  els.categoryFilter.innerHTML = '<option value="all">전체</option>' + categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  els.yearFilter.innerHTML = '<option value="all">전체</option>' + years.map(y => `<option value="${escapeHtml(String(y))}">${escapeHtml(String(y))}</option>`).join('');

  els.publicCount.textContent = String(state.artworks.length);
  els.categoryCount.textContent = String(categories.length);
}

function applyFilters() {
  const q = els.searchInput.value.trim().toLowerCase();
  const category = els.categoryFilter.value;
  const year = els.yearFilter.value;

  state.filtered = state.artworks.filter(item => {
    const haystack = [item.title, item.description, item.tags].join(' ').toLowerCase();
    const matchesQuery = !q || haystack.includes(q);
    const matchesCategory = category === 'all' || item.category === category;
    const matchesYear = year === 'all' || String(item.year ?? '') === year;
    return matchesQuery && matchesCategory && matchesYear;
  });

  renderGallery();
}

function renderGallery() {
  els.galleryGrid.innerHTML = '';
  els.emptyState.classList.toggle('hidden', state.filtered.length > 0);

  state.filtered.forEach(item => {
    const node = els.template.content.firstElementChild.cloneNode(true);
    node.querySelector('img').src = item.image_url;
    node.querySelector('img').alt = item.title;
    node.querySelector('.card-category').textContent = item.category || 'Uncategorized';
    node.querySelector('.card-year').textContent = item.year || '';
    node.querySelector('.card-title').textContent = item.title;
    node.querySelector('.card-description').textContent = item.description || '';

    const tagsWrap = node.querySelector('.card-tags');
    parseTags(item.tags).forEach(tag => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = tag;
      tagsWrap.appendChild(span);
    });

    node.querySelector('.card-image-button').addEventListener('click', () => openLightbox(item));
    els.galleryGrid.appendChild(node);
  });
}

function parseTags(tags) {
  if (!tags) return [];
  return String(tags)
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

function openLightbox(item) {
  els.lightboxImage.src = item.image_url;
  els.lightboxImage.alt = item.title;
  els.lightboxTitle.textContent = item.title;
  els.lightboxDescription.textContent = item.description || '';
  els.lightbox.showModal();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

els.searchInput.addEventListener('input', applyFilters);
els.categoryFilter.addEventListener('change', applyFilters);
els.yearFilter.addEventListener('change', applyFilters);
els.closeLightbox.addEventListener('click', () => els.lightbox.close());
els.lightbox.addEventListener('click', (event) => {
  const rect = els.lightbox.getBoundingClientRect();
  const clickedInDialog = rect.top <= event.clientY && event.clientY <= rect.top + rect.height && rect.left <= event.clientX && event.clientX <= rect.left + rect.width;
  if (!clickedInDialog) els.lightbox.close();
});

fetchArtworks().catch((error) => {
  console.error(error);
  els.emptyState.textContent = error.message;
  els.emptyState.classList.remove('hidden');
});
