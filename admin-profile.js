const profileEls = {
  heroTitle: document.getElementById('heroTitle'),
  heroSubtitle: document.getElementById('heroSubtitle'),
  aboutTitle: document.getElementById('aboutTitle'),
  aboutBody: document.getElementById('aboutBody'),
  email: document.getElementById('email'),
  awards: document.getElementById('awards'),
  saveButton: document.getElementById('saveProfileButton'),
  status: document.getElementById('profileStatus'),
};

function setProfileStatus(message, isError = false) {
  if (!profileEls.status) return;
  profileEls.status.textContent = message || '';
  profileEls.status.classList.toggle('error', !!isError);
  profileEls.status.classList.toggle('success', !isError && !!message);
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: { accept: 'application/json', ...(options.headers || {}) },
    ...options,
  });

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`JSON 응답이 아닙니다: ${url}`);
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `요청 실패 (${res.status})`);
  }
  return data;
}

function fillForm(profile = {}) {
  profileEls.heroTitle.value = profile.hero_title ?? profile.heroTitle ?? '';
  profileEls.heroSubtitle.value = profile.hero_subtitle ?? profile.heroSubtitle ?? '';
  profileEls.aboutTitle.value = profile.about_title ?? profile.aboutTitle ?? '';
  profileEls.aboutBody.value = profile.about_body ?? profile.aboutBody ?? '';
  profileEls.email.value = profile.email ?? '';
  const awards = profile.awards_text ?? profile.awards ?? '';
  profileEls.awards.value = Array.isArray(awards) ? awards.join('\n') : awards;
}

async function loadProfile() {
  setProfileStatus('프로필을 불러오는 중...');
  try {
    const raw = await fetchJson('/api/profile');
    const profile = raw?.profile ?? raw?.item ?? raw?.data ?? raw ?? {};
    fillForm(profile);
    setProfileStatus('프로필을 불러왔습니다.');
  } catch (err) {
    setProfileStatus(err.message || '프로필을 불러오지 못했습니다.', true);
  }
}

async function saveProfile() {
  const payload = {
    heroTitle: profileEls.heroTitle.value.trim(),
    heroSubtitle: profileEls.heroSubtitle.value.trim(),
    aboutTitle: profileEls.aboutTitle.value.trim(),
    aboutBody: profileEls.aboutBody.value,
    email: profileEls.email.value.trim(),
    awards: profileEls.awards.value,
  };

  setProfileStatus('프로필 저장 중...');
  try {
    await fetchJson('/api/profile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setProfileStatus('프로필을 저장했습니다.');
  } catch (err) {
    setProfileStatus(err.message || '프로필 저장에 실패했습니다.', true);
  }
}

profileEls.saveButton?.addEventListener('click', saveProfile);
loadProfile();
