const ADMIN_KEY_STORAGE = 'artfolio_admin_key';

const adminEls = {
  adminKey: document.getElementById('adminKey'),
  saveAdminKey: document.getElementById('saveAdminKey'),
  clearAdminKey: document.getElementById('clearAdminKey'),
  uploadForm: document.getElementById('uploadForm'),
  uploadStatus: document.getElementById('uploadStatus'),
  adminList: document.getElementById('adminList'),
  refreshAdminList: document.getElementById('refreshAdminList'),
};

function getAdminKey() {
  return localStorage.getItem(ADMIN_KEY_STORAGE) || '';
}

function setStatus(message, isError = false) {
  adminEls.uploadStatus.textContent = message;
  adminEls.uploadStatus.style.color = isError ? 'var(--danger)' : 'var(--muted)';
}

function authHeaders(json = false) {
  const key = getAdminKey();
  return {
    ...(key ? { Authorization: `Bearer ${key}` } : {}),
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

function fillSavedKey() {
  adminEls.adminKey.value = getAdminKey();
}

async function loadAdminList() {
  adminEls.adminList.innerHTML = '<div class="meta">불러오는 중...</div>';
  const response = await fetch('/api/artworks?all=1', { headers: authHeaders() });
  const data = await response.json();

  if (!response.ok) {
    adminEls.adminList.innerHTML = `<div class="meta">${data.error || '목록을 불러오지 못했습니다.'}</div>`;
    return;
  }

  if (!data.length) {
    adminEls.adminList.innerHTML = '<div class="meta">등록된 작품이 없습니다.</div>';
    return;
  }

  adminEls.adminList.innerHTML = '';
  data.forEach(item => adminEls.adminList.appendChild(createAdminItem(item)));
}

function createAdminItem(item) {
  const wrapper = document.createElement('article');
  wrapper.className = 'admin-item';
  wrapper.innerHTML = `
    <img class="admin-thumb" src="${item.image_url}" alt="${escapeHtml(item.title)}">
    <div>
      <strong>${escapeHtml(item.title)}</strong>
      <div class="meta">${escapeHtml(item.category || 'Uncategorized')} · ${escapeHtml(item.year || '')}</div>
      <div class="meta">${escapeHtml(item.description || '')}</div>
      <div class="admin-inline">
        <span class="visibility-pill">${item.is_public ? '공개' : '비공개'}</span>
        <button class="btn ghost toggle-btn" type="button">공개 상태 전환</button>
      </div>
    </div>
    <div class="admin-actions">
      <button class="btn danger delete-btn" type="button">삭제</button>
    </div>
  `;

  wrapper.querySelector('.toggle-btn').addEventListener('click', async () => {
    const response = await fetch('/api/update', {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ id: item.id, is_public: !item.is_public }),
    });
    const data = await response.json();
    if (!response.ok) return alert(data.error || '상태 변경 실패');
    await loadAdminList();
  });

  wrapper.querySelector('.delete-btn').addEventListener('click', async () => {
    const ok = confirm(`'${item.title}' 작품을 삭제할까요?`);
    if (!ok) return;
    const response = await fetch('/api/delete', {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ id: item.id }),
    });
    const data = await response.json();
    if (!response.ok) return alert(data.error || '삭제 실패');
    await loadAdminList();
  });

  return wrapper;
}

adminEls.saveAdminKey.addEventListener('click', () => {
  localStorage.setItem(ADMIN_KEY_STORAGE, adminEls.adminKey.value.trim());
  setStatus('관리자 키 저장됨');
  loadAdminList().catch((error) => setStatus(error.message, true));
});

adminEls.clearAdminKey.addEventListener('click', () => {
  localStorage.removeItem(ADMIN_KEY_STORAGE);
  adminEls.adminKey.value = '';
  setStatus('관리자 키 삭제됨');
  loadAdminList().catch((error) => setStatus(error.message, true));
});

adminEls.uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('업로드 중...');
  const formData = new FormData(adminEls.uploadForm);
  formData.set('isPublic', document.getElementById('isPublic').checked ? 'true' : 'false');

  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    setStatus(data.error || '업로드 실패', true);
    return;
  }

  setStatus('업로드 완료');
  adminEls.uploadForm.reset();
  document.getElementById('isPublic').checked = true;
  await loadAdminList();
});

adminEls.refreshAdminList.addEventListener('click', () => {
  loadAdminList().catch((error) => setStatus(error.message, true));
});

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

fillSavedKey();
loadAdminList().catch((error) => setStatus(error.message, true));
