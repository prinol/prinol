const manageState = {
  artworks: [],
  filtered: [],
  selected: null,
};

const manageEls = {
  search: document.getElementById('manageSearch'),
  sortFilter: document.getElementById('sortFilter'),
  publicOnlyFilter: document.getElementById('publicOnlyFilter'),
  count: document.getElementById('manageCount'),
  list: document.getElementById('artList'),
  template: document.getElementById('artListItemTemplate'),
  editorTitle: document.getElementById('editorTitle'),
  editorEmpty: document.getElementById('editorEmpty'),
  editorForm: document.getElementById('artworkEditor'),
  editorImage: document.getElementById('editorImage'),
  editTitle: document.getElementById('editTitle'),
  editYear: document.getElementById('editYear'),
  editCategory: document.getElementById('editCategory'),
  editTags: document.getElementById('editTags'),
  editDescription: document.getElementById('editDescription'),
  editPublic: document.getElementById('editPublic'),
  saveButton: document.getElementById('saveArtworkButton'),
  resetButton: document.getElementById('resetEditorButton'),
  status: document.getElementById('editorStatus'),
};

function manageStatus(message, isError = false) {
  if (!manageEls.status) return;
  manageEls.status.textContent = message || '';
  manageEls.status.classList.toggle('error', !!isError);
  manageEls.status.classList.toggle('success', !isError && !!message);
}

async function manageFetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: { accept: 'application/json', ...(options.headers || {}) },
    ...options
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}
  if (!res.ok) throw new Error(data?.error || data?.message || `요청 실패 (${res.status})`);
  return data;
}

function normalizeItems(raw) {
  const items = raw?.items ?? raw?.artworks ?? raw?.data ?? [];
  return Array.isArray(items) ? items : [];
}

function getTimestamp(item) {
  const date = new Date(item.updated_at || item.created_at || 0).getTime();
  if (!Number.isNaN(date) && date > 0) return date;
  const num = Number(item.id) || 0;
  return num;
}

function getYearValue(item) {
  const year = Number(String(item.year || '').trim());
  return Number.isNaN(year) ? -999999 : year;
}

function sortItems(items) {
  const sortValue = manageEls.sortFilter?.value || 'latest';
  const cloned = [...items];

  if (sortValue === 'year_desc') {
    return cloned.sort((a, b) => {
      const y = getYearValue(b) - getYearValue(a);
      return y !== 0 ? y : getTimestamp(b) - getTimestamp(a);
    });
  }

  if (sortValue === 'year_asc') {
    return cloned.sort((a, b) => {
      const y = getYearValue(a) - getYearValue(b);
      return y !== 0 ? y : getTimestamp(b) - getTimestamp(a);
    });
  }

  return cloned.sort((a, b) => getTimestamp(b) - getTimestamp(a));
}

function applySearch() {
  const q = (manageEls.search?.value || '').trim().toLowerCase();
  const publicOnly = !!manageEls.publicOnlyFilter?.checked;

  let items = manageState.artworks.filter(item => {
    const matchesText = !q || [item.title, item.category, item.tags, item.description, item.year]
      .join(' ')
      .toLowerCase()
      .includes(q);
    const matchesPublic = !publicOnly || !!item.is_public;
    return matchesText && matchesPublic;
  });

  manageState.filtered = sortItems(items);
  renderList();
}

function setSelected(item) {
  manageState.selected = item || null;

  if (!item) {
    if (manageEls.editorTitle) manageEls.editorTitle.textContent = '작품을 선택하세요';
    manageEls.editorEmpty?.classList.remove('hidden');
    manageEls.editorForm?.classList.add('hidden');
    if (manageEls.saveButton) manageEls.saveButton.disabled = true;
    manageStatus('');
    return;
  }

  if (manageEls.editorTitle) manageEls.editorTitle.textContent = item.title || '선택된 작품';
  manageEls.editorEmpty?.classList.add('hidden');
  manageEls.editorForm?.classList.remove('hidden');
  if (manageEls.saveButton) manageEls.saveButton.disabled = false;

  if (manageEls.editorImage) {
    manageEls.editorImage.src = item.image_url || `/images/${item.image_key}`;
    manageEls.editorImage.alt = item.title || 'Artwork';
  }
  if (manageEls.editTitle) manageEls.editTitle.value = item.title || '';
  if (manageEls.editYear) manageEls.editYear.value = item.year || '';
  if (manageEls.editCategory) manageEls.editCategory.value = item.category || '';
  if (manageEls.editTags) manageEls.editTags.value = item.tags || '';
  if (manageEls.editDescription) manageEls.editDescription.value = item.description || '';
  if (manageEls.editPublic) manageEls.editPublic.checked = !!item.is_public;
}

function renderList() {
  if (!manageEls.list || !manageEls.template) return;
  manageEls.list.innerHTML = '';
  if (manageEls.count) manageEls.count.textContent = `총 ${manageState.filtered.length}개`;

  if (!manageState.filtered.length) {
    const div = document.createElement('div');
    div.className = 'editor-empty';
    div.textContent = '조건에 맞는 작품이 없습니다.';
    manageEls.list.appendChild(div);
    return;
  }

  manageState.filtered.forEach(item => {
    const row = manageEls.template.content.firstElementChild.cloneNode(true);
    const mainButton = row.querySelector('.art-row-main');
    const thumb = row.querySelector('.art-row-thumb');
    const title = row.querySelector('.art-row-title');
    const meta = row.querySelector('.art-row-meta');
    const publicToggle = row.querySelector('.row-public-toggle');
    const deleteButton = row.querySelector('.row-delete-button');

    if (thumb) {
      thumb.src = item.image_url || `/images/${item.image_key}`;
      thumb.alt = item.title || 'Artwork';
    }
    if (title) title.textContent = item.title || '(제목 없음)';
    if (meta) meta.textContent = [item.year, item.category].filter(Boolean).join(' · ');
    if (publicToggle) publicToggle.checked = !!item.is_public;

    if (manageState.selected && String(manageState.selected.id) === String(item.id)) {
      row.classList.add('selected');
    }

    mainButton?.addEventListener('click', () => {
      setSelected(item);
      renderList();
    });

    publicToggle?.addEventListener('change', async (e) => {
      e.stopPropagation();
      try {
        await manageFetchJson('/api/update', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: item.id,
            title: item.title ?? '',
            year: item.year ?? '',
            category: item.category ?? '',
            tags: item.tags ?? '',
            description: item.description ?? '',
            is_public: publicToggle.checked ? 1 : 0
          })
        });
        item.is_public = publicToggle.checked ? 1 : 0;
        if (manageState.selected && String(manageState.selected.id) === String(item.id)) {
          manageState.selected.is_public = item.is_public;
          if (manageEls.editPublic) manageEls.editPublic.checked = !!item.is_public;
        }
        applySearch();
        manageStatus('공개 여부를 수정했습니다.');
      } catch (err) {
        publicToggle.checked = !publicToggle.checked;
        manageStatus(err.message || '공개 여부 수정에 실패했습니다.', true);
      }
    });

    deleteButton?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const ok = confirm(`"${item.title || '이 작품'}"을 삭제할까요?`);
      if (!ok) return;

      try {
        await manageFetchJson('/api/delete', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: item.id, image_key: item.image_key ?? '' })
        });
        manageState.artworks = manageState.artworks.filter(v => String(v.id) !== String(item.id));
        if (manageState.selected && String(manageState.selected.id) === String(item.id)) {
          setSelected(null);
        }
        applySearch();
        manageStatus('작품을 삭제했습니다.');
      } catch (err) {
        manageStatus(err.message || '삭제에 실패했습니다.', true);
      }
    });

    manageEls.list.appendChild(row);
  });
}

async function loadArtworks() {
  manageStatus('작품 목록을 불러오는 중...');
  try {
    const raw = await manageFetchJson('/api/artworks');
    manageState.artworks = normalizeItems(raw);
    manageStatus('작품 목록을 불러왔습니다.');
    applySearch();
  } catch (err) {
    manageStatus(err.message || '작품 목록을 불러오지 못했습니다.', true);
  }
}

async function saveSelectedArtwork() {
  if (!manageState.selected) return;

  manageStatus('수정 저장 중...');
  const payload = {
    id: manageState.selected.id,
    title: manageEls.editTitle?.value.trim() || '',
    year: manageEls.editYear?.value.trim() || '',
    category: manageEls.editCategory?.value.trim() || '',
    tags: manageEls.editTags?.value.trim() || '',
    description: manageEls.editDescription?.value || '',
    is_public: manageEls.editPublic?.checked ? 1 : 0
  };

  try {
    await manageFetchJson('/api/update', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    manageState.selected = { ...manageState.selected, ...payload };
    manageState.artworks = manageState.artworks.map(item =>
      String(item.id) === String(payload.id) ? { ...item, ...payload } : item
    );
    applySearch();
    setSelected(manageState.artworks.find(item => String(item.id) === String(payload.id)) || null);
    manageStatus('작품 정보를 저장했습니다.');
  } catch (err) {
    manageStatus(err.message || '수정 저장에 실패했습니다.', true);
  }
}

manageEls.search?.addEventListener('input', applySearch);
manageEls.sortFilter?.addEventListener('change', applySearch);
manageEls.publicOnlyFilter?.addEventListener('change', applySearch);
manageEls.saveButton?.addEventListener('click', saveSelectedArtwork);
manageEls.resetButton?.addEventListener('click', () => {
  setSelected(null);
  renderList();
});

loadArtworks();
