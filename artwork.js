const TAG_CLASSES = [
  'tag-chip color-1',
  'tag-chip color-2',
  'tag-chip color-3',
  'tag-chip color-4',
  'tag-chip color-5',
  'tag-chip color-6',
];

const els = {
  image: document.getElementById('detailImage'),
  title: document.getElementById('detailTitle'),
  year: document.getElementById('detailYear'),
  category: document.getElementById('detailCategory'),
  description: document.getElementById('detailDescription'),
  tags: document.getElementById('detailTags'),
  error: document.getElementById('detailError'),
};

function splitTags(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  return String(value).split(',').map(v => v.trim()).filter(Boolean);
}

function renderTags(tags) {
  if (!els.tags) return;
  els.tags.innerHTML = '';
  tags.forEach((tag, index) => {
    const span = document.createElement('span');
    span.className = TAG_CLASSES[index % TAG_CLASSES.length];
    span.textContent = tag;
    els.tags.appendChild(span);
  });
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {}
  if (!res.ok) throw new Error(data?.error || data?.message || `요청 실패 (${res.status})`);
  return data;
}

async function init() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) {
    if (els.error) els.error.hidden = false;
    return;
  }

  try {
    const data = await fetchJson('/api/artworks?public=1&limit=200&offset=0');
    const items = Array.isArray(data?.items) ? data.items : [];
    const item = items.find(v => String(v.id) === String(id));

    if (!item) throw new Error('작품을 찾을 수 없습니다.');

    if (els.image) {
      els.image.src = item.image_url || `/images/${item.image_key}`;
      els.image.alt = item.title || 'Artwork';
    }
    if (els.title) els.title.textContent = item.title || 'Untitled';
    if (els.year) els.year.textContent = item.year || '';
    if (els.category) els.category.textContent = item.category || '';
    if (els.description) els.description.textContent = item.description || '';
    renderTags(splitTags(item.tags));
  } catch (err) {
    console.warn(err);
    if (els.error) els.error.hidden = false;
  }
}

init();
