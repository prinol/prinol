async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'accept': 'application/json' },
    body: JSON.stringify(payload ?? {})
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}
  if (!res.ok) throw new Error(data?.error || data?.message || `요청 실패 (${res.status})`);
  return data;
}

document.getElementById('logoutButton')?.addEventListener('click', async () => {
  try {
    await postJson('/api/auth', { action: 'logout' });
  } catch (err) {
    console.warn(err);
  }
  location.href = 'admin-login.html';
});
