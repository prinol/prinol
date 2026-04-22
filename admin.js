const profileForm = document.getElementById('profileForm');
const artworkForm = document.getElementById('artworkForm');
const adminList = document.getElementById('adminList');
const profileStatus = document.getElementById('profileStatus');
const artworkStatus = document.getElementById('artworkStatus');
const logoutBtn = document.getElementById('logoutBtn');
const adminArtworkTemplate = document.getElementById('adminArtworkTemplate');

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      location.href = '/admin-login.html';
      throw new Error('인증이 필요합니다.');
    }
    throw new Error(data.detail ? `${data.error || '요청에 실패했습니다.'} (${data.detail})` : (data.error || '요청에 실패했습니다.'));
  }
  return data;
}

function setText(el, text, ok = true) {
  el.textContent = text;
  el.style.color = ok ? 'var(--muted)' : '#ff9797';
}

function parseTags(text = '') {
  return text.split(',').map(v => v.trim()).filter(Boolean).join(', ');
}

async function loadProfile() {
  const data = await fetchJson('/api/profile?admin=1');
  const profile = data.profile || {};
  document.getElementById('heroTitleInput').value = profile.hero_title || '';
  document.getElementById('heroSubtitleInput').value = profile.hero_subtitle || '';
  document.getElementById('aboutTitleInput').value = profile.about_title || '';
  document.getElementById('aboutBodyInput').value = profile.about_body || '';
  document.getElementById('awardsTextInput').value = profile.awards_text || '';
  document.getElementById('contactEmailInput').value = profile.contact_email || '';
  document.getElementById('contactInstagramInput').value = profile.contact_instagram || '';
}

async function loadArtworks() {
  const data = await fetchJson('/api/artworks?admin=1');
  adminList.innerHTML = '';
  (data.items || []).forEach(item => {
    const node = adminArtworkTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector('.admin-item-image').src = item.image_url;
    node.querySelector('.admin-item-image').alt = item.title;
    node.querySelector('.admin-item-title').textContent = item.title;
    node.querySelector('.admin-item-year').textContent = item.year || '';
    node.querySelector('.edit-title').value = item.title || '';
    node.querySelector('.edit-year').value = item.year || '';
    node.querySelector('.edit-category').value = item.category || '';
    node.querySelector('.edit-tags').value = item.tags || '';
    node.querySelector('.edit-description').value = item.description || '';
    node.querySelector('.edit-public').checked = Number(item.is_public) === 1;

    const status = node.querySelector('.item-status');
    node.querySelector('.save-item-btn').addEventListener('click', async () => {
      try {
        await fetchJson('/api/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: item.id,
            title: node.querySelector('.edit-title').value,
            year: node.querySelector('.edit-year').value,
            category: node.querySelector('.edit-category').value,
            tags: parseTags(node.querySelector('.edit-tags').value),
            description: node.querySelector('.edit-description').value,
            is_public: node.querySelector('.edit-public').checked ? 1 : 0
          })
        });
        setText(status, '저장되었습니다.');
        await loadArtworks();
      } catch (error) {
        setText(status, error.message, false);
      }
    });

    node.querySelector('.delete-item-btn').addEventListener('click', async () => {
      if (!confirm('이 작품을 삭제하시겠습니까?')) return;
      try {
        await fetchJson('/api/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id })
        });
        await loadArtworks();
      } catch (error) {
        setText(status, error.message, false);
      }
    });

    adminList.appendChild(node);
  });
}

profileForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setText(profileStatus, '저장 중...');
  try {
    await fetchJson('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hero_title: document.getElementById('heroTitleInput').value,
        hero_subtitle: document.getElementById('heroSubtitleInput').value,
        about_title: document.getElementById('aboutTitleInput').value,
        about_body: document.getElementById('aboutBodyInput').value,
        awards_text: document.getElementById('awardsTextInput').value,
        contact_email: document.getElementById('contactEmailInput').value,
        contact_instagram: document.getElementById('contactInstagramInput').value
      })
    });
    setText(profileStatus, '프로필이 저장되었습니다.');
  } catch (error) {
    setText(profileStatus, error.message, false);
  }
});

artworkForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const formData = new FormData(artworkForm);
    formData.set('is_public', document.getElementById('isPublicInput').checked ? '1' : '0');
    await fetchJson('/api/upload', {
      method: 'POST',
      body: formData
    });
    artworkForm.reset();
    document.getElementById('isPublicInput').checked = true;
    setText(artworkStatus, '작품이 저장되었습니다.');
    await loadArtworks();
  } catch (error) {
    setText(artworkStatus, error.message, false);
  }
});

logoutBtn?.addEventListener('click', async () => {
  try {
    await fetchJson('/api/auth', { method: 'DELETE' });
  } finally {
    location.href = '/admin-login.html';
  }
});

Promise.all([loadProfile(), loadArtworks()]).catch((error) => {
  console.error(error);
  if (error.message !== '인증이 필요합니다.') {
    adminList.innerHTML = `<p class="error-text">${error.message}</p>`;
  }
});
