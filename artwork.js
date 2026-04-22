const TAG_CLASSES = [
  'tag-chip color-1',
  'tag-chip color-2',
  'tag-chip color-3',
  'tag-chip color-4',
  'tag-chip color-5',
  'tag-chip color-6',
];

const els = {
  detailCard: document.getElementById('detailCard'),
  detailError: document.getElementById('detailError'),
  detailImage: document.getElementById('detailImage'),
  detailTitle: document.getElementById('detailTitle'),
  detailYear: document.getElementById('detailYear'),
  detailCategory: document.getElementById('detailCategory'),
  detailDescription: document.getElementById('detailDescription'),
  detailTags: document.getElementById('detailTags'),
};

function splitTags(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  return String(value).split(',').map(v => v.trim()).filter(Boolean);
}

function getId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
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
    throw new Error(data?.error || data?.message || `요청 실패: ${res.status}`);
  }
  return data;
}

function renderTags(tags) {
  els.detailTags.innerHTML = '';
  tags.forEach((tag, index) => {
    const span = document.createElement('span');
    span.className = TAG_CLASSES[index % TAG_CLASSES.length];
    span.textContent = tag;
    els.detailTags.appendChild(span);
  });
}

async function init() {
  const id = getId();
  if (!id) {
    els.detailError.classList.remove('hidden');
    return;
  }

  try {
    const raw = await fetchJson('/api/artworks');
    const items = raw?.items ?? raw?.artworks ?? raw?.data ?? [];
    const item = Array.isArray(items) ? items.find(v => String(v.id) === String(id)) : null;

    if (!item) throw new Error('작품이 없습니다.');

    els.detailImage.src = item.image_url || `/images/${item.image_key}`;
    els.detailImage.alt = item.title || 'Artwork';
    els.detailTitle.textContent = item.title || '';
    els.detailYear.textContent = item.year || '';
    els.detailCategory.textContent = item.category || '';
    els.detailDescription.textContent = item.description || '';
    renderTags(splitTags(item.tags));

    els.detailCard.classList.remove('hidden');
  } catch (err) {
    console.warn(err);
    els.detailError.classList.remove('hidden');
  }
}

init();
