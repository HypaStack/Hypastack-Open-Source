// Titlebar injection script — runs on every page load inside the Tauri webview.
// This injects a custom frameless titlebar with window controls.
(function () {
  function injectTitlebar() {
    // Prevent double-injection
    if (document.getElementById('tauri-titlebar')) return;

    // Mark document for Tauri-specific CSS overrides
    document.documentElement.classList.add('is-tauri');

    // --- CSS ---
    var style = document.createElement('style');
    style.id = 'tauri-titlebar-styles';
    style.textContent = [
      '#tauri-titlebar {',
      '  background-color: #111111;',
      '  height: 30px;',
      '  min-height: 30px;',
      '  width: 100%;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: space-between;',
      '  border-bottom: 1px solid #2e2e2e;',
      '  position: fixed;',
      '  top: 0; left: 0; right: 0;',
      '  z-index: 99999999;',
      '  user-select: none;',
      '  -webkit-user-select: none;',
      '  -webkit-app-region: drag;',
      '}',
      'html.is-tauri body {',
      '  padding-top: 30px !important;',
      '}',
      'html.is-tauri #global-preloader {',
      '  top: 30px !important;',
      '}',
      '#tauri-titlebar-left {',
      '  display: flex;',
      '  align-items: center;',
      '  padding-left: 10px;',
      '  -webkit-app-region: drag;',
      '}',
      '#tauri-titlebar-icon {',
      '  width: 16px;',
      '  height: 16px;',
      '  border-radius: 4px;',
      '  display: block;',
      '}',
      '#tauri-titlebar-controls {',
      '  display: flex;',
      '  align-items: stretch;',
      '  height: 100%;',
      '  -webkit-app-region: no-drag;',
      '}',
      '.tb-btn {',
      '  width: 40px;',
      '  height: 100%;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  background: transparent;',
      '  border: none;',
      '  outline: none;',
      '  cursor: pointer;',
      '  color: #6b6b6b;',
      '  transition: background-color 0.15s ease, color 0.15s ease;',
      '  -webkit-app-region: no-drag;',
      '}',
      '.tb-btn:hover {',
      '  background-color: rgba(255,255,255,0.06);',
      '  color: #e5e5eb;',
      '}',
      '.tb-btn:active {',
      '  background-color: rgba(255,255,255,0.03);',
      '}',
      '.tb-btn-close:hover {',
      '  background-color: #c0392b !important;',
      '  color: #ffffff !important;',
      '}',
      '.tb-btn-close:active {',
      '  background-color: #a93226 !important;',
      '}',
    ].join('\n');
    document.head.appendChild(style);

    // --- HTML ---
    var bar = document.createElement('div');
    bar.id = 'tauri-titlebar';
    bar.setAttribute('data-tauri-drag-region', '');

    bar.innerHTML = [
      '<div id="tauri-titlebar-left" data-tauri-drag-region>',
      '  <img id="tauri-titlebar-icon" src="https://r2.hypastack.com/cdn/u1y77k752jdm/icon.webp"',
      '       alt="" draggable="false" />',
      '</div>',
      '<div id="tauri-titlebar-controls">',
      '  <button class="tb-btn" id="tb-min" title="Minimize">',
      '    <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" rx="0.5" fill="currentColor"/></svg>',
      '  </button>',
      '  <button class="tb-btn" id="tb-max" title="Maximize">',
      '    <svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1" fill="none"/></svg>',
      '  </button>',
      '  <button class="tb-btn tb-btn-close" id="tb-close" title="Close">',
      '    <svg width="10" height="10" viewBox="0 0 10 10">',
      '      <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>',
      '      <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>',
      '    </svg>',
      '  </button>',
      '</div>',
    ].join('');

    document.body.prepend(bar);

    // --- Window controls via Tauri IPC ---
    var ipc = window.__TAURI_INTERNALS__;
    if (ipc) {
      document.getElementById('tb-min').addEventListener('click', function () {
        ipc.invoke('plugin:window|minimize', { label: 'main' });
      });
      document.getElementById('tb-max').addEventListener('click', function () {
        ipc.invoke('plugin:window|toggle_maximize', { label: 'main' });
      });
      document.getElementById('tb-close').addEventListener('click', function () {
        ipc.invoke('plugin:window|close', { label: 'main' });
      });
    }
  }

  // Run when DOM is ready (or immediately if already loaded)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectTitlebar);
  } else {
    injectTitlebar();
  }
})();
