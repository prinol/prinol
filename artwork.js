const MAX_UPLOAD_BYTES = 500 * 1024;

const TAG_CLASSES = [
  'tag-chip color-1',
  'tag-chip color-2',
  'tag-chip color-3',
  'tag-chip color-4',
  'tag-chip color-5',
  'tag-chip color-6',
];

const state = {
  item: null,
  isAdmin: false,
  preparedFile: null,
};

const els = {
  image: document.getElementById('detailImage'),
  title: document.getElementById('detailTitle'),
  year: document.getElementById('detailYear'),
  category: document.getElementById('detailCategory'),
  description: document.getElementById('detailDescription'),
  tags: document.getElementById('detailTags'),
  error: document.getElementById('detailError'),

  adminBar: document.getElementById('detailAdminBar'),
  editToggleButton: document.getElementById('editToggleButton'),
  viewMode: document.getElementById('detailViewMode'),
  editForm: document.getElementById('detailEditForm'),
  editImageFile: document.getElementById('editImageFile'),
  editImageSizeInfo: document.getElementById('editImageSizeInfo'),
  editTitle: document.getElementById('editTitle'),
  editYear: document.getElementById('editYear'),
  editCategory: document.getElementById('editCategory'),
  editTags: document.getElementById('editTags'),
  editDescription: document.getElementById('editDescription'),
  editPublic: document.getElementById('editPublic'),
  editPinned: document.getElementById('editPinned'),
  detailSaveButton: document.getElementById('detailSaveButton'),
  detailCancelButton: document.getElementById('detailCancelButton'),
  detailEditStatus: document.getElementById('detailEditStatus'),
};

function setStatus(message, isError = false) {
  if (!els.detailEditStatus) return;
  els.detailEditStatus.textContent = message || '';
  els.detailEditStatus.classList.toggle('error', !!isError);
  els.detailEditStatus.classList.toggle('success', !isError && !!message);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function splitTags(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  return String(value).split(',').map(v => v.trim()).filter(Boolean);
}

function renderTags(tags) {
  if (!els.tags) return;
  els.tags.innerHTML = '';
  tags.forEach((tag, index) => {
    const link = document.createElement('a');
    link.className = TAG_CLASSES[index % TAG_CLASSES.length] + ' detail-tag-link';
    link.textContent = tag;
    link.href = `./?q=${encodeURIComponent(tag)}#works`;
    link.title = `"${tag}" 키워드 작품 보기`;
    els.tags.appendChild(link);
  });
}

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

function getId() {
  const params = new URLSearchParams(location.search);
  return params.get('id');
}

function fillView(item) {
  if (els.image) {
    els.image.src = item.image_url || `/images/${item.image_key}`;
    els.image.alt = item.title || 'Artwork';
  }
  if (els.title) els.title.textContent = item.title || 'Untitled';
  if (els.year) els.year.textContent = item.year || '';
  if (els.category) els.category.textContent = item.category || '';
  if (els.description) els.description.textContent = item.description || '';
  renderTags(splitTags(item.tags));
}

function fillEdit(item) {
  if (els.editTitle) els.editTitle.value = item.title || '';
  if (els.editYear) els.editYear.value = item.year || '';
  if (els.editCategory) els.editCategory.value = item.category || '';
  if (els.editTags) els.editTags.value = item.tags || '';
  if (els.editDescription) els.editDescription.value = item.description || '';
  if (els.editPublic) els.editPublic.checked = !!item.is_public;
  if (els.editPinned) els.editPinned.checked = !!item.is_pinned;
  if (els.editImageFile) els.editImageFile.value = '';
  if (els.editImageSizeInfo) els.editImageSizeInfo.textContent = '새 파일을 선택하지 않으면 기존 이미지를 유지합니다.';
  state.preparedFile = null;
}

function toggleEditMode(show) {
  els.viewMode?.classList.toggle('hidden', show);
  els.editForm?.classList.toggle('hidden', !show);
  if (!show) setStatus('');
}

function loadImage(file) {
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
  if (!file.type.startsWith('image/')) throw new Error('이미지 파일만 업로드할 수 있습니다.');
  if (file.size <= limitBytes) return new File([file], file.name, { type: file.type || 'image/jpeg' });

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
  const file = els.editImageFile?.files?.[0];
  state.preparedFile = null;

  if (!file) {
    if (els.editImageSizeInfo) els.editImageSizeInfo.textContent = '새 파일을 선택하지 않으면 기존 이미지를 유지합니다.';
    return;
  }

  if (els.editImageSizeInfo) {
    els.editImageSizeInfo.textContent = `원본: ${formatBytes(file.size)} / 압축 준비 중...`;
  }

  try {
    const compressed = await compressImageToLimit(file, MAX_UPLOAD_BYTES);
    state.preparedFile = compressed;
    if (els.editImageSizeInfo) {
      els.editImageSizeInfo.textContent = `원본: ${formatBytes(file.size)} → 교체 파일: ${formatBytes(compressed.size)} (목표 500KB 이하)`;
    }
  } catch (err) {
    state.preparedFile = null;
    if (els.editImageSizeInfo) els.editImageSizeInfo.textContent = err.message || '압축 실패';
  }
}

async function checkAdmin() {
  try {
    const data = await fetchJson('/api/auth-status');
    state.isAdmin = !!data?.authenticated;
  } catch {
    state.isAdmin = false;
  }

  if (state.isAdmin) {
    els.adminBar?.classList.remove('hidden');
  }
}

async function loadItem() {
  const id = getId();
  if (!id) {
    if (els.error) els.error.hidden = false;
    return;
  }

  try {
    const data = await fetchJson(`/api/artworks?all=1&limit=500&offset=0`);
    const items = Array.isArray(data?.items) ? data.items : [];
    const item = items.find(v => String(v.id) === String(id));
    if (!item) throw new Error('작품을 찾을 수 없습니다.');

    state.item = item;
    fillView(item);
    fillEdit(item);
  } catch (err) {
    console.warn(err);
    if (els.error) {
      els.error.hidden = false;
      els.error.textContent = err?.message || '작품 정보를 불러오지 못했습니다.';
    }
  }
}

async function saveDetailEdit() {
  if (!state.item) return;

  setStatus('저장 중...');
  try {
    const replacementFile = state.preparedFile || els.editImageFile?.files?.[0];

    if (replacementFile) {
      const formData = new FormData();
      formData.append('id', state.item.id);
      formData.append('old_image_key', state.item.image_key || '');
      formData.append('file', replacementFile);
      formData.append('title', els.editTitle?.value.trim() || '');
      formData.append('year', els.editYear?.value.trim() || '');
      formData.append('category', els.editCategory?.value.trim() || '');
      formData.append('tags', els.editTags?.value.trim() || '');
      formData.append('description', els.editDescription?.value || '');
      formData.append('is_public', els.editPublic?.checked ? '1' : '0');
      formData.append('is_pinned', els.editPinned?.checked ? '1' : '0');

      const res = await fetch('/api/update', {
        method: 'POST',
        body: formData,
        headers: { accept: 'application/json' },
      });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch {}
      if (!res.ok) throw new Error(data?.error || data?.message || `요청 실패 (${res.status})`);
      state.item = data?.item || state.item;
    } else {
      const data = await fetchJson('/api/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: state.item.id,
          title: els.editTitle?.value.trim() || '',
          year: els.editYear?.value.trim() || '',
          category: els.editCategory?.value.trim() || '',
          tags: els.editTags?.value.trim() || '',
          description: els.editDescription?.value || '',
          is_public: els.editPublic?.checked ? 1 : 0,
          is_pinned: els.editPinned?.checked ? 1 : 0,
        }),
      });
      state.item = data?.item || state.item;
    }

    fillView(state.item);
    fillEdit(state.item);
    setStatus('저장했습니다.');
    toggleEditMode(false);
  } catch (err) {
    setStatus(err?.message || '저장에 실패했습니다.', true);
  }
}

els.editToggleButton?.addEventListener('click', () => toggleEditMode(true));
els.detailCancelButton?.addEventListener('click', () => {
  if (state.item) fillEdit(state.item);
  toggleEditMode(false);
});
els.detailSaveButton?.addEventListener('click', saveDetailEdit);
els.editImageFile?.addEventListener('change', prepareReplacementFile);

(async function init() {
  await Promise.all([checkAdmin(), loadItem()]);
})();
