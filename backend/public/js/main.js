async function checkApiStatus() {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');

  try {
    const res = await fetch('/health');
    if (!res.ok) throw new Error('unhealthy');

    dot.classList.add('online');
    text.textContent = 'API is live';
  } catch {
    dot.classList.add('offline');
    text.textContent = 'API is unreachable';
  }
}

function setupCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const target = document.getElementById(btn.dataset.copyTarget);
      if (!target) return;

      try {
        await navigator.clipboard.writeText(target.textContent.trim());
        const original = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(() => { btn.textContent = original; }, 1500);
      } catch (err) {
        console.error('Clipboard copy failed:', err);
      }
    });
  });
}

checkApiStatus();
setupCopyButtons();
