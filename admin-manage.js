const MAX_UPLOAD_BYTES = 500 * 1024;

const manageState = {
  artworks: [],
  filtered: [],
  selected: null,
  preparedReplacementFile: null,
  pending: new Map(), // id -> {is_public?, is_pinned?, delete?}
};

const manageEls = {
  search: document.getElementById('manageSearch'),
  sortFilter: document.getElementById('sortFilter'),
  publicOnlyFilter: document.getElementById('publicOnlyFilter'),
  count: document.getElementById('manageCount'),
  pendingCount: document.getElementById('pendingCount'),
  list: document.getElementById('artList'),
  editorTitle: document.getElementById('editorTitle'),
  editorEmpty: document.getElementById('editorEmpty'),
  editorForm: document.getElementById('artworkEditor'),
  editorImage: document.getElementById('editorImage'),
  editImageFile: document.getElementById('editImageFile'),
  editImageSizeInfo: document.getElementById('editImageSizeInfo'),
  editTitle: document.getElementById('editTitle'),
  editYear: document.getElementById('editYear'),
  editCategory: document.getElementById('editCategory'),
  editTags: document.getElementById('editTags'),
  editDescription: document.getElementById('editDescription'),
  editPublic: document.getElementById('editPublic'),
  editPinned: document.getElementById('editPinned'),
  saveButton: document.getElementById('saveArtworkButton'),
  resetButton: document.getElementById('resetEditorButton'),
  applyPendingButton: document.getElementById('applyPendingButton'),
  clearPendingButton: document.getElementById('clearPendingButton'),
  status: document.getElementById('editorStatus'),
};

function manageStatus(message, isError = false) {
  if (!manageEls.status) return;
  manageEls.status.textContent = message || '';
  manageEls.status.classList.toggle('error', !!isError);
  manageEls.status.classList.toggle('success', !isError && !!message);
}

function updatePendingSummary() {
  if (!manageEls.pendingCount) return;
  const count = manageState.pending.size;
  manageEls.pendingCount.textContent = count ? `일괄 반영 대기: ${count}개` : '일괄 반영 대기 없음';
}

function setPending(id, patch) {
  const current = manageState.pending.get(String(id)) || {};
  const next = { ...current, ...patch };
  const artwork = manageState.artworks.find(v => String(v.id) === String(id));

  if (artwork) {
    if (next.is_public === artwork.is_public) delete next.is_public;
    if (next.is_pinned === artwork.is_pinned) delete next.is_pinned;
    if (!next.delete) delete next.delete;
  }

  if (Object.keys(next).length === 0) {
    manageState.pending.delete(String(id));
  } else {
    manageState.pending.set(String(id), next);
  }
  updatePendingSummary();
}

function getEffectiveValue(item, key) {
  const pending = manageState.pending.get(String(item.id));
  if (pending && key in pending) return pending[key];
  return item[key];
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function manageFetchJson(url, options = {}) {
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

  let items = manageState.artworks.filter(item => {
    const haystack = [item.title, item.category, item.tags, item.description, item.year].join(' ').toLowerCase();
    const matchesText = !q || haystack.includes(q);
    const effectivePublic = !!getEffectiveValue(item, 'is_public');
    const matchesPublic = !publicOnly || effectivePublic;
    return matchesText && matchesPublic;
  });

  manageState.filtered = sortItems(items);
  renderList();
}

function setSelected(item) {
  manageState.selected = item || null;
  manageState.preparedReplacementFile = null;
  if (manageEls.editImageFile) manageEls.editImageFile.value = '';
  if (manageEls.editImageSizeInfo) manageEls.editImageSizeInfo.textContent = '새 파일을 선택하지 않으면 기존 이미지를 유지합니다.';

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
  if (manageEls.editPinned) manageEls.editPinned.checked = !!item.is_pinned;
}

function createListRow(item) {
  const row = document.createElement('div');
  row.className = 'art-row';
  if (manageState.selected && String(manageState.selected.id) === String(item.id)) {
    row.classList.add('selected');
  }

  const pending = manageState.pending.get(String(item.id));
  if (pending) row.classList.add('has-pending');
  if (pending?.delete) row.classList.add('marked-delete');

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
  const effectivePinned = !!getEffectiveValue(item, 'is_pinned');
  title.textContent = effectivePinned ? `📌 ${item.title || '(제목 없음)'}` : (item.title || '(제목 없음)');

  const meta = document.createElement('div');
  meta.className = 'art-row-meta';
  meta.textContent = [item.year, item.category].filter(Boolean).join(' · ');

  text.appendChild(title);
  text.appendChild(meta);
  main.appendChild(thumbWrap);
  main.appendChild(text);

  const quick = document.createElement('div');
  quick.className = 'art-row-quick';

  const publicToggleWrap = document.createElement('label');
  publicToggleWrap.className = 'row-toggle';
  const publicToggle = document.createElement('input');
  publicToggle.type = 'checkbox';
  publicToggle.checked = !!getEffectiveValue(item, 'is_public');
  const publicText = document.createElement('span');
  publicText.textContent = '공개';
  publicToggleWrap.appendChild(publicToggle);
  publicToggleWrap.appendChild(publicText);

  const pinnedToggleWrap = document.createElement('label');
  pinnedToggleWrap.className = 'row-toggle';
  const pinnedToggle = document.createElement('input');
  pinnedToggle.type = 'checkbox';
  pinnedToggle.checked = !!getEffectiveValue(item, 'is_pinned');
  const pinnedText = document.createElement('span');
  pinnedText.textContent = '고정';
  pinnedToggleWrap.appendChild(pinnedToggle);
  pinnedToggleWrap.appendChild(pinnedText);

  const deleteToggleWrap = document.createElement('label');
  deleteToggleWrap.className = 'row-toggle row-delete-toggle';
  const deleteToggle = document.createElement('input');
  deleteToggle.type = 'checkbox';
  deleteToggle.checked = !!pending?.delete;
  const deleteText = document.createElement('span');
  deleteText.textContent = '삭제대기';
  deleteToggleWrap.appendChild(deleteToggle);
  deleteToggleWrap.appendChild(deleteText);

  main.addEventListener('click', () => {
    setSelected(item);
    renderList();
  });

  publicToggle.addEventListener('change', (e) => {
    e.stopPropagation();
    setPending(item.id, { is_public: publicToggle.checked ? 1 : 0 });
    renderList();
  });

  pinnedToggle.addEventListener('change', (e) => {
    e.stopPropagation();
    setPending(item.id, { is_pinned: pinnedToggle.checked ? 1 : 0 });
    renderList();
  });

  deleteToggle.addEventListener('change', (e) => {
    e.stopPropagation();
    setPending(item.id, { delete: deleteToggle.checked });
    renderList();
  });

  quick.appendChild(publicToggleWrap);
  quick.appendChild(pinnedToggleWrap);
  quick.appendChild(deleteToggleWrap);

  row.appendChild(main);
  row.appendChild(quick);
  return row;
}

function renderList() {
  if (!manageEls.list) return;
  manageEls.list.innerHTML = '';
  if (manageEls.count) manageEls.count.textContent = `총 ${manageState.filtered.length}개`;

  if (!manageState.filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'editor-empty';
    empty.textContent = '조건에 맞는 작품이 없습니다.';
    manageEls.list.appendChild(empty);
    return;
  }

  manageState.filtered.forEach(item => {
    manageEls.list.appendChild(createListRow(item));
  });
}

async function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 불러오지 못했습니다.'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('이미지 변환에 실패했습니다.'));
      else resolve(blob);
    }, type, quality);
  });
}

async function compressImageToLimit(file, limitBytes = MAX_UPLOAD_BYTES) {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 업로드할 수 있습니다.');
  }

  if (file.size <= limitBytes) {
    return new File([file], file.name, { type: file.type || 'image/jpeg' });
  }

  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  let blob = null;
  const sourceRatio = img.naturalHeight / img.naturalWidth;

  for (let scaleStep = 0; scaleStep < 7; scaleStep++) {
    const scale = scaleStep === 0 ? 1 : Math.pow(0.88, scaleStep);
    const targetW = Math.max(480, Math.round(img.naturalWidth * scale));
    const targetH = Math.max(480, Math.round(targetW * sourceRatio));

    canvas.width = targetW;
    canvas.height = targetH;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42, 0.34]) {
      blob = await canvasToBlob(canvas, 'image/jpeg', quality);
      if (blob.size <= limitBytes) {
        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
      }
    }
  }

  if (!blob) throw new Error('이미지 압축에 실패했습니다.');
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}

async function prepareReplacementFile() {
  const file = manageEls.editImageFile.files?.[0];
  manageState.preparedReplacementFile = null;

  if (!file) {
    if (manageEls.editImageSizeInfo) {
      manageEls.editImageSizeInfo.textContent = '새 파일을 선택하지 않으면 기존 이미지를 유지합니다.';
    }
    return;
  }

  if (manageEls.editImageSizeInfo) {
    manageEls.editImageSizeInfo.textContent = `원본: ${formatBytes(file.size)} / 압축 준비 중...`;
  }

  try {
    const compressed = await compressImageToLimit(file, MAX_UPLOAD_BYTES);
    manageState.preparedReplacementFile = compressed;
    if (manageEls.editImageSizeInfo) {
      manageEls.editImageSizeInfo.textContent = `원본: ${formatBytes(file.size)} → 교체 파일: ${formatBytes(compressed.size)} (목표 500KB 이하)`;
    }
  } catch (err) {
    manageState.preparedReplacementFile = null;
    if (manageEls.editImageSizeInfo) {
      manageEls.editImageSizeInfo.textContent = err.message || '압축 실패';
    }
  }
}

async function loadArtworks() {
  manageStatus('작품 목록을 불러오는 중...');
  try {
    const raw = await manageFetchJson('/api/artworks?all=1&limit=200');
    manageState.artworks = Array.isArray(raw?.items) ? raw.items : [];
    manageStatus('작품 목록을 불러왔습니다.');
    updatePendingSummary();
    applySearch();
  } catch (err) {
    manageStatus(err.message || '작품 목록을 불러오지 못했습니다.', true);
  }
}

async function applyPendingChanges() {
  const entries = [...manageState.pending.entries()];
  if (!entries.length) {
    manageStatus('반영할 목록 변경사항이 없습니다.');
    return;
  }

  manageStatus(`목록 변경사항 ${entries.length}개 반영 중...`);
  try {
    for (const [id, patch] of entries) {
      const item = manageState.artworks.find(v => String(v.id) === String(id));
      if (!item) continue;

      if (patch.delete) {
        await manageFetchJson('/api/delete', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: item.id, image_key: item.image_key ?? '' }),
        });
        manageState.artworks = manageState.artworks.filter(v => String(v.id) !== String(id));
        if (manageState.selected && String(manageState.selected.id) === String(id)) {
          setSelected(null);
        }
      } else {
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
            is_public: 'is_public' in patch ? patch.is_public : (item.is_public ? 1 : 0),
            is_pinned: 'is_pinned' in patch ? patch.is_pinned : (item.is_pinned ? 1 : 0),
          }),
        });

        item.is_public = 'is_public' in patch ? patch.is_public : item.is_public;
        item.is_pinned = 'is_pinned' in patch ? patch.is_pinned : item.is_pinned;
        if (manageState.selected && String(manageState.selected.id) === String(id)) {
          manageState.selected = { ...manageState.selected, ...item };
          if (manageEls.editPublic) manageEls.editPublic.checked = !!item.is_public;
          if (manageEls.editPinned) manageEls.editPinned.checked = !!item.is_pinned;
        }
      }
    }

    manageState.pending.clear();
    updatePendingSummary();
    applySearch();
    manageStatus('목록 변경사항을 일괄 반영했습니다.');
  } catch (err) {
    manageStatus(err.message || '일괄 반영에 실패했습니다.', true);
  }
}

function clearPendingChanges() {
  manageState.pending.clear();
  updatePendingSummary();
  applySearch();
  manageStatus('대기 중인 목록 변경사항을 초기화했습니다.');
}

async function saveSelectedArtwork() {
  if (!manageState.selected) return;
  manageStatus('수정 저장 중...');

  try {
    const replacementFile = manageState.preparedReplacementFile || manageEls.editImageFile?.files?.[0];

    if (replacementFile) {
      const formData = new FormData();
      formData.append('id', manageState.selected.id);
      formData.append('old_image_key', manageState.selected.image_key || '');
      formData.append('file', replacementFile);
      formData.append('title', manageEls.editTitle?.value.trim() || '');
      formData.append('year', manageEls.editYear?.value.trim() || '');
      formData.append('category', manageEls.editCategory?.value.trim() || '');
      formData.append('tags', manageEls.editTags?.value.trim() || '');
      formData.append('description', manageEls.editDescription?.value || '');
      formData.append('is_public', manageEls.editPublic?.checked ? '1' : '0');
      formData.append('is_pinned', manageEls.editPinned?.checked ? '1' : '0');

      const res = await fetch('/api/update', {
        method: 'POST',
        body: formData,
        headers: { accept: 'application/json' },
      });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch {}
      if (!res.ok) throw new Error(data?.error || data?.message || `요청 실패 (${res.status})`);

      const item = data?.item || {};
      manageState.selected = { ...manageState.selected, ...item };
      manageState.artworks = manageState.artworks.map((v) =>
        String(v.id) === String(item.id) ? { ...v, ...item } : v
      );
    } else {
      const payload = {
        id: manageState.selected.id,
        title: manageEls.editTitle?.value.trim() || '',
        year: manageEls.editYear?.value.trim() || '',
        category: manageEls.editCategory?.value.trim() || '',
        tags: manageEls.editTags?.value.trim() || '',
        description: manageEls.editDescription?.value || '',
        is_public: manageEls.editPublic?.checked ? 1 : 0,
        is_pinned: manageEls.editPinned?.checked ? 1 : 0,
      };

      await manageFetchJson('/api/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      manageState.selected = { ...manageState.selected, ...payload };
      manageState.artworks = manageState.artworks.map((item) =>
        String(item.id) === String(payload.id) ? { ...item, ...payload } : item
      );
    }

    manageState.pending.delete(String(manageState.selected.id));
    updatePendingSummary();
    manageStatus('작품 정보를 저장했습니다.');
    applySearch();
    setSelected(manageState.artworks.find((item) => String(item.id) === String(manageState.selected.id)) || null);
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
manageEls.editImageFile?.addEventListener('change', prepareReplacementFile);
manageEls.applyPendingButton?.addEventListener('click', applyPendingChanges);
manageEls.clearPendingButton?.addEventListener('click', clearPendingChanges);

loadArtworks();
