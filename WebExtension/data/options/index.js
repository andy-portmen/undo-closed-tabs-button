'use strict';

function restore() {
  chrome.storage.local.get({
    maxResults: 7,
    useGoogle: true,
    faqs: true
  }, prefs => {
    document.getElementById('maxResults').value = prefs.maxResults;
    document.getElementById('useGoogle').checked = prefs.useGoogle;
    document.getElementById('faqs').checked = prefs.faqs;
  });
}
function save() {
  var maxResults = Number(document.getElementById('maxResults').value);
  chrome.storage.local.set({
    maxResults: Math.min(chrome.sessions.MAX_SESSION_RESULTS, Math.max(2, maxResults)),
    useGoogle: document.getElementById('useGoogle').checked,
    faqs: document.getElementById('faqs').checked,
  }, () => {
    restore();
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(() => status.textContent = '', 750);
  });
}

document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', save);
