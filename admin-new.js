const newEls = {
  imageFile: document.getElementById('imageFile'),
  title: document.getElementById('title'),
  year: document.getElementById('year'),
  category: document.getElementById('category'),
  tags: document.getElementById('tags'),
  description: document.getElementById('description'),
  isPublic: document.getElementById('isPublic'),
  uploadButton: document.getElementById('uploadButton'),
  status: document.getElementById('uploadStatus'),
};

function newStatus(message, isError = false) {
  newEls.status.textContent = message || '';
  newEls.status.classList.toggle('error', !!isError);
  newEls.status.classList.toggle('success', !isError && !!message);
}

async function uploadArtwork() {
  const file = newEls.imageFile.files?.[0];
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
    const res = await fetch('/api/upload', { method: 'POST', body: formData, headers: { accept: 'application/json' } });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch {}
    if (!res.ok) throw new Error(data?.error || data?.message || `요청 실패 (${res.status})`);

    newStatus('작품을 등록했습니다.');
    newEls.imageFile.value = '';
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

newEls.uploadButton?.addEventListener('click', uploadArtwork);
