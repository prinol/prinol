const loginForm = document.getElementById('loginForm');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('loginError');

function showError(message) {
  loginError.textContent = message;
  loginError.classList.remove('hidden');
}

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.classList.add('hidden');

  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passwordInput.value })
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || '로그인에 실패했습니다.');
    }
    location.href = '/admin.html';
  } catch (error) {
    showError(error.message);
  }
});
