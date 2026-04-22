const adminEls = {
  logoutButton: document.getElementById('logoutButton'),
  adminStatus: document.getElementById('adminStatus'),
  profileForm: document.getElementById('profileForm'),
  heroTitle: document.getElementById('heroTitle'),
  heroSubtitle: document.getElementById('heroSubtitle'),
  aboutTitle: document.getElementById('aboutTitle'),
  artistIntro: document.getElementById('artistIntro'),
  awardsText: document.getElementById('awardsText'),
  contactEmail: document.getElementById('contactEmail'),
  contactInstagram: document.getElementById('contactInstagram'),
  profileStatus: document.getElementById('profileStatus'),
  uploadForm: document.getElementById('uploadForm'),
  uploadStatus: document.getElementById('uploadStatus'),
  adminList: document.getElementById('adminList'),
  refreshAdminList: document.getElementById('refreshAdminList'),
};

function setStatus(target, message, isError = false) {
  target.textContent = message;
  target.style.color = isError ? 'var(--danger)' : 'var(--muted)';
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    const next = encodeURIComponent(window.location.pathname);
    window.location.href = `/admin-login.html?returnTo=${next}`;
    throw new Error('관리자 인증이 만료되었습니다. 다시 로그인하세요.');
  }

  return response;
}

async function loadProfile() {
  const response = await apiFetch('/api/profile?admin=1');
  const data = await response.json();

  if (!response.ok) {
    setStatus(adminEls.profileStatus, data.error || '소개 정보를 불러오지 못했습니다.', true);
    return;
  }

  adminEls.heroTitle.value = data.hero_title || '';
  adminEls.heroSubtitle.value = data.hero_subtitle || '';
  adminEls.aboutTitle.value = data.about_title || '';
  adminEls.artistIntro.value = data.artist_intro || '';
  adminEls.awardsText.value = data.awards_text || '';
  adminEls.contactEmail.value = data.contact_email || '';
  adminEls.contactInstagram.value = data.contact_instagram || '';
  setStatus(adminEls.profileStatus, '소개 정보 불러옴');
}

async function loadAdminList() {
  adminEls.adminList.innerHTML = '<div class="meta">불러오는 중...</div>';
  const response = await apiFetch('/api/artworks?all=1');
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
    const response = await apiFetch('/api/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, is_public: !item.is_public }),
    });
    const data = await response.json();
    if (!response.ok) return alert(data.error || '상태 변경 실패');
    await loadAdminList();
  });

  wrapper.querySelector('.delete-btn').addEventListener('click', async () => {
    const ok = confirm(`'${item.title}' 작품을 삭제할까요?`);
    if (!ok) return;
    const response = await apiFetch('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id }),
    });
    const data = await response.json();
    if (!response.ok) return alert(data.error || '삭제 실패');
    await loadAdminList();
  });

  return wrapper;
}

adminEls.logoutButton.addEventListener('click', async () => {
  await fetch('/api/auth', { method: 'DELETE', credentials: 'same-origin' });
  window.location.href = '/admin-login.html';
});

adminEls.profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus(adminEls.profileStatus, '소개 저장 중...');

  const response = await apiFetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hero_title: adminEls.heroTitle.value,
      hero_subtitle: adminEls.heroSubtitle.value,
      about_title: adminEls.aboutTitle.value,
      artist_intro: adminEls.artistIntro.value,
      awards_text: adminEls.awardsText.value,
      contact_email: adminEls.contactEmail.value,
      contact_instagram: adminEls.contactInstagram.value,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    setStatus(adminEls.profileStatus, data.error || '소개 저장 실패', true);
    return;
  }

  setStatus(adminEls.profileStatus, '소개 저장 완료');
});

adminEls.uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus(adminEls.uploadStatus, '업로드 중...');
  const formData = new FormData(adminEls.uploadForm);
  formData.set('isPublic', document.getElementById('isPublic').checked ? 'true' : 'false');

  const response = await apiFetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    setStatus(adminEls.uploadStatus, data.error || '업로드 실패', true);
    return;
  }

  setStatus(adminEls.uploadStatus, '업로드 완료');
  adminEls.uploadForm.reset();
  document.getElementById('isPublic').checked = true;
  await loadAdminList();
});

adminEls.refreshAdminList.addEventListener('click', () => {
  loadAdminList().catch((error) => setStatus(adminEls.uploadStatus, error.message, true));
});

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

loadProfile().catch((error) => setStatus(adminEls.profileStatus, error.message, true));
loadAdminList().catch((error) => setStatus(adminEls.uploadStatus, error.message, true));
