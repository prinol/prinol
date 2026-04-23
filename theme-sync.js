(function () {
  const saved = localStorage.getItem('prinol-theme');
  const theme = (saved === 'light' || saved === 'dark')
    ? saved
    : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.dataset.theme = theme;
})();
