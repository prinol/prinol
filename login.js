const loginForm = document.getElementById('loginForm');
const adminPassword = document.getElementById('adminPassword');
const loginStatus = document.getElementById('loginStatus');

function setLoginStatus(message, isError = false) {
  loginStatus.textContent = message;
  loginStatus.style.color = isError ? 'var(--danger)' : 'var(--muted)';
}

function getReturnTo() {
  const returnTo = new URL(window.location.href).searchParams.get('returnTo');
  if (!returnTo || !returnTo.startsWith('/')) return '/admin.html';
  return returnTo;
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setLoginStatus('로그인 확인 중...');

  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: adminPassword.value }),
  });

  const data = await response.json().catch(() => ({ error: '로그인 응답을 읽지 못했습니다.' }));
  if (!response.ok) {
    setLoginStatus(data.error || '로그인 실패', true);
    return;
  }

  window.location.href = getReturnTo();
});
