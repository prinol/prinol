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

function getTimestamp(item) {
  const date = new Date(item.updated_at || item.created_at || 0).getTime();
  if (Number.isFinite(date) && date > 0) return date;
  return Number(item.id) || 0;
}

function getYearValue(item) {
  const y = Number(String(item.year || '').trim());
  return Number.isFinite(y) ? y : -999999;
}

function sortItems(items) {
  const sortValue = manageEls.sortFilter?.value || 'latest';
  const cloned = [...items];

  if (sortValue === 'year_desc') {
    return cloned.sort((a, b) => {
      const diff = getYearValue(b) - getYearValue(a);
      return diff !== 0 ? diff : getTimestamp(b) - getTimestamp(a);
    });
  }

  if (sortValue === 'year_asc') {
    return cloned.sort((a, b) => {
      const diff = getYearValue(a) - getYearValue(b);
      return diff !== 0 ? diff : getTimestamp(b) - getTimestamp(a);
    });
  }

  return cloned.sort((a, b) => getTimestamp(b) - getTimestamp(a));
}

function applySearch() {
  const q = (manageEls.search?.value || '').trim().toLowerCase();
  const publicOnly = !!manageEls.publicOnlyFilter?.checked;

  let items = manageState.artworks.filter((item) => {
    const haystack = [
      item.title,
      item.category,
      item.tags,
      item.description,
      item.year,
    ].join(' ').toLowerCase();

    const matchesText = !q || haystack.includes(q);
    const matchesPublic = !publicOnly || !!item.is_public;

    return matchesText && matchesPublic;
  });

  manageState.filtered = sortItems(items);
  renderList();
}

function setSelected(item) {
  manageState.selected = item || null;

  if (!item) {
    manageEls.editorTitle && (manageEls.editorTitle.textContent = '작품을 선택하세요');
    manageEls.editorEmpty?.classList.remove('hidden');
    manageEls.editorForm?.classList.add('hidden');
    if (manageEls.saveButton) manageEls.saveButton.disabled = true;
    return;
  }

  manageEls.editorTitle && (manageEls.editorTitle.textContent = item.title || '선택된 작품');
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

function createListRow(item) {
  const row = document.createElement('div');
  row.className = 'art-row';
  if (manageState.selected && String(manageState.selected.id) === String(item.id)) {
    row.classList.add('selected');
  }

  const main = document.createElement('button');
  main.type = 'button';
  main.className = 'art-row-main';

  const thumbWrap = document.createElement('div');
  thumbWrap.className = 'art-row-thumb-wrap';

  const thumb = document.createElement('img');
  thumb.className = 'art-row-thumb';
  thumb.src = item.image_url || `/images/${item.image_key}`;
  thumb.alt = item.title || 'Artwork';
  thumbWrap.appendChild(thumb);

  const text = document.createElement('div');
  text.className = 'art-row-text';

  const title = document.createElement('strong');
  title.className = 'art-row-title';
  title.textContent = item.title || '(제목 없음)';

  const meta = document.createElement('div');
  meta.className = 'art-row-meta';
  meta.textContent = [item.year, item.category].filter(Boolean).join(' · ');

  text.appendChild(title);
  text.appendChild(meta);
  main.appendChild(thumbWrap);
  main.appendChild(text);

  const quick = document.createElement('div');
  quick.className = 'art-row-quick';

  const rowToggle = document.createElement('label');
  rowToggle.className = 'row-toggle';

  const publicToggle = document.createElement('input');
  publicToggle.type = 'checkbox';
  publicToggle.checked = !!item.is_public;

  const toggleText = document.createElement('span');
  toggleText.textContent = '공개';

  rowToggle.appendChild(publicToggle);
  rowToggle.appendChild(toggleText);

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'danger-button row-delete-button';
  deleteButton.textContent = '삭제';

  quick.appendChild(rowToggle);
  quick.appendChild(deleteButton);

  main.addEventListener('click', () => {
    setSelected(item);
    renderList();
  });

  publicToggle.addEventListener('change', async (e) => {
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
          is_public: publicToggle.checked ? 1 : 0,
        }),
      });
      item.is_public = publicToggle.checked ? 1 : 0;
      if (manageState.selected && String(manageState.selected.id) === String(item.id)) {
        manageState.selected.is_public = item.is_public;
        if (manageEls.editPublic) manageEls.editPublic.checked = !!item.is_public;
      }
      manageStatus('공개 여부를 수정했습니다.');
      applySearch();
    } catch (err) {
      publicToggle.checked = !publicToggle.checked;
      manageStatus(err.message || '공개 여부 수정에 실패했습니다.', true);
    }
  });

  deleteButton.addEventListener('click', async (e) => {
    e.stopPropagation();
    const ok = confirm(`"${item.title || '이 작품'}"을 삭제할까요?`);
    if (!ok) return;

    try {
      await manageFetchJson('/api/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: item.id, image_key: item.image_key ?? '' }),
      });
      manageState.artworks = manageState.artworks.filter((v) => String(v.id) !== String(item.id));
      if (manageState.selected && String(manageState.selected.id) === String(item.id)) {
        setSelected(null);
      }
      manageStatus('작품을 삭제했습니다.');
      applySearch();
    } catch (err) {
      manageStatus(err.message || '삭제에 실패했습니다.', true);
    }
  });

  row.appendChild(main);
  row.appendChild(quick);
  return row;
}

function renderList() {
  if (!manageEls.list) return;

  manageEls.list.innerHTML = '';
  if (manageEls.count) {
    manageEls.count.textContent = `총 ${manageState.filtered.length}개`;
  }

  if (!manageState.filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'editor-empty';
    empty.textContent = '조건에 맞는 작품이 없습니다.';
    manageEls.list.appendChild(empty);
    return;
  }

  manageState.filtered.forEach((item) => {
    manageEls.list.appendChild(createListRow(item));
  });
}

async function loadArtworks() {
  manageStatus('작품 목록을 불러오는 중...');
  try {
    const raw = await manageFetchJson('/api/artworks?all=1&limit=100');
    manageState.artworks = Array.isArray(raw?.items) ? raw.items : [];
    manageStatus('작품 목록을 불러왔습니다.');
    applySearch();
  } catch (err) {
    manageStatus(err.message || '작품 목록을 불러오지 못했습니다.', true);
  }
}

async function saveSelectedArtwork() {
  if (!manageState.selected) return;

  const payload = {
    id: manageState.selected.id,
    title: manageEls.editTitle?.value.trim() || '',
    year: manageEls.editYear?.value.trim() || '',
    category: manageEls.editCategory?.value.trim() || '',
    tags: manageEls.editTags?.value.trim() || '',
    description: manageEls.editDescription?.value || '',
    is_public: manageEls.editPublic?.checked ? 1 : 0,
  };

  manageStatus('수정 저장 중...');
  try {
    await manageFetchJson('/api/update', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    manageState.selected = { ...manageState.selected, ...payload };
    manageState.artworks = manageState.artworks.map((item) =>
      String(item.id) === String(payload.id) ? { ...item, ...payload } : item
    );
    manageStatus('작품 정보를 저장했습니다.');
    applySearch();
    setSelected(manageState.artworks.find((item) => String(item.id) === String(payload.id)) || null);
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
