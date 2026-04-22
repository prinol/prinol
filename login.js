const loginEls = {
  password: document.getElementById('adminPassword'),
  button: document.getElementById('loginButton'),
  status: document.getElementById('loginStatus'),
};

function loginStatus(message, isError = false) {
  if (!loginEls.status) return;
  loginEls.status.textContent = message || '';
  loginEls.status.classList.toggle('error', !!isError);
  loginEls.status.classList.toggle('success', !isError && !!message);
}

async function doLogin() {
  const password = loginEls.password?.value || '';
  if (!password.trim()) {
    loginStatus('관리자 암호를 입력하세요.', true);
    return;
  }

  loginStatus('로그인 중...');
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ action: 'login', password })
    });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch {}
    if (!res.ok) throw new Error(data?.error || data?.message || `요청 실패 (${res.status})`);

    loginStatus('로그인 성공');
    location.href = '/admin.html';
  } catch (err) {
    loginStatus(err.message || '로그인에 실패했습니다.', true);
  }
}

loginEls.button?.addEventListener('click', doLogin);
loginEls.password?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin();
});
