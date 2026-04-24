const MAX_UPLOAD_BYTES = 500 * 1024;

const newEls = {
  imageFile: document.getElementById('imageFile'),
  imageDropZone: document.getElementById('imageDropZone'),
  imageSizeInfo: document.getElementById('imageSizeInfo'),
  title: document.getElementById('title'),
  year: document.getElementById('year'),
  category: document.getElementById('category'),
  tags: document.getElementById('tags'),
  description: document.getElementById('description'),
  isPublic: document.getElementById('isPublic'),
  uploadButton: document.getElementById('uploadButton'),
  status: document.getElementById('uploadStatus'),
};

let preparedUploadFile = null;

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function newStatus(message, isError = false) {
  if (!newEls.status) return;
  newEls.status.textContent = message || '';
  newEls.status.classList.toggle('error', !!isError);
  newEls.status.classList.toggle('success', !isError && !!message);
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
  if (file.size <= limitBytes) {
    return new File([file], file.name || 'pasted-image.png', { type: file.type || 'image/jpeg' });
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
        const base = (file.name || 'pasted-image').replace(/\.[^.]+$/, '');
        return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
      }
    }
  }

  if (!blob) throw new Error('이미지 압축에 실패했습니다.');
  const base = (file.name || 'pasted-image').replace(/\.[^.]+$/, '');
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
}

async function prepareIncomingFile(file) {
  preparedUploadFile = null;
  if (!file) {
    if (newEls.imageSizeInfo) newEls.imageSizeInfo.textContent = '선택 전';
    return;
  }

  if (newEls.imageSizeInfo) {
    newEls.imageSizeInfo.textContent = `원본: ${formatBytes(file.size)} / 압축 준비 중...`;
  }

  try {
    const compressed = await compressImageToLimit(file, MAX_UPLOAD_BYTES);
    preparedUploadFile = compressed;
    if (newEls.imageSizeInfo) {
      newEls.imageSizeInfo.textContent = `원본: ${formatBytes(file.size)} → 업로드 파일: ${formatBytes(compressed.size)} (목표 500KB 이하)`;
    }
  } catch (err) {
    preparedUploadFile = null;
    if (newEls.imageSizeInfo) newEls.imageSizeInfo.textContent = err.message || '압축 실패';
  }
}

async function handleFileInputChange() {
  const file = newEls.imageFile.files?.[0];
  await prepareIncomingFile(file);
}

function getImageFileFromClipboard(event) {
  const items = event.clipboardData?.items || [];
  for (const item of items) {
    if (item.type && item.type.startsWith('image/')) return item.getAsFile();
  }
  return null;
}

function getImageFileFromDrop(event) {
  const files = event.dataTransfer?.files || [];
  for (const file of files) {
    if (file.type && file.type.startsWith('image/')) return file;
  }
  return null;
}

function wireDropAndPaste() {
  const zone = newEls.imageDropZone;
  if (!zone) return;

  const setDrag = (active) => zone.classList.toggle('is-dragover', active);

  zone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(true);
  });

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(true);
  });

  zone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(false);
  });

  zone.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(false);
    const file = getImageFileFromDrop(e);
    if (!file) {
      newStatus('드롭한 항목에서 이미지 파일을 찾지 못했습니다.', true);
      return;
    }
    await prepareIncomingFile(file);
    newStatus('드래그한 이미지를 업로드 파일로 준비했습니다.');
  });

  zone.addEventListener('paste', async (e) => {
    const file = getImageFileFromClipboard(e);
    if (!file) return;
    e.preventDefault();
    await prepareIncomingFile(file);
    newStatus('클립보드 이미지를 업로드 파일로 준비했습니다.');
  });

  zone.addEventListener('click', () => newEls.imageFile?.click());

  zone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      newEls.imageFile?.click();
    }
  });
}

async function uploadArtwork() {
  const file = preparedUploadFile || newEls.imageFile.files?.[0];
  if (!file) {
    newStatus('이미지 파일을 선택하세요.', true);
    return;
  }
  if (!newEls.title.value.trim()) {
    newStatus('작품명을 입력하세요.', true);
    return;
  }

  newStatus('업로드 중...');
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', newEls.title.value.trim());
  formData.append('year', newEls.year.value.trim());
  formData.append('category', newEls.category.value.trim());
  formData.append('tags', newEls.tags.value.trim());
  formData.append('description', newEls.description.value);
  formData.append('is_public', newEls.isPublic.checked ? '1' : '0');

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      headers: { accept: 'application/json' }
    });

    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch {}
    if (!res.ok) throw new Error(data?.error || data?.message || `요청 실패 (${res.status})`);

    newStatus('작품을 등록했습니다.');
    newEls.imageFile.value = '';
    if (newEls.imageSizeInfo) newEls.imageSizeInfo.textContent = '선택 전';
    preparedUploadFile = null;
    newEls.title.value = '';
    newEls.year.value = '';
    newEls.category.value = '';
    newEls.tags.value = '';
    newEls.description.value = '';
    newEls.isPublic.checked = true;
  } catch (err) {
    newStatus(err.message || '업로드에 실패했습니다.', true);
  }
}

newEls.imageFile?.addEventListener('change', handleFileInputChange);
newEls.uploadButton?.addEventListener('click', uploadArtwork);
wireDropAndPaste();
