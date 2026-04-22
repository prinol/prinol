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

function profileStatus(message, isError = false) {
  profileEls.status.textContent = message || '';
  profileEls.status.classList.toggle('error', !!isError);
  profileEls.status.classList.toggle('success', !isError && !!message);
}

async function profileFetchJson(url, options = {}) {
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

function setProfileForm(profile = {}) {
  profileEls.heroTitle.value = profile.heroTitle ?? profile.hero_title ?? '';
  profileEls.heroSubtitle.value = profile.heroSubtitle ?? profile.hero_subtitle ?? '';
  profileEls.aboutTitle.value = profile.aboutTitle ?? profile.about_title ?? '';
  profileEls.aboutBody.value = profile.aboutBody ?? profile.about_body ?? '';
  profileEls.email.value = profile.email ?? '';
  const awards = profile.awards ?? profile.awards_text ?? '';
  profileEls.awards.value = Array.isArray(awards) ? awards.join('\n') : awards;
}

async function loadProfileData() {
  profileStatus('프로필을 불러오는 중...');
  try {
    const raw = await profileFetchJson('/api/profile');
    const profile = raw?.profile ?? raw?.item ?? raw?.data ?? raw ?? {};
    setProfileForm(profile);
    profileStatus('프로필을 불러왔습니다.');
  } catch (err) {
    profileStatus(err.message || '프로필을 불러오지 못했습니다.', true);
  }
}

async function saveProfileData() {
  profileStatus('저장 중...');
  const payload = {
    heroTitle: profileEls.heroTitle.value.trim(),
    heroSubtitle: profileEls.heroSubtitle.value.trim(),
    aboutTitle: profileEls.aboutTitle.value.trim(),
    aboutBody: profileEls.aboutBody.value,
    email: profileEls.email.value.trim(),
    awards: profileEls.awards.value
  };

  try {
    await profileFetchJson('/api/profile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    profileStatus('프로필을 저장했습니다.');
  } catch (err) {
    profileStatus(err.message || '프로필 저장에 실패했습니다.', true);
  }
}

profileEls.saveButton?.addEventListener('click', saveProfileData);
loadProfileData();
