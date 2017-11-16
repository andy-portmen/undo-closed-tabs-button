'use strict';

function restore () {
  chrome.storage.local.get({
    maxResults: 7
  }, (prefs) => {
    document.getElementById('maxResults').value = prefs.maxResults;
  });
}
function save () {
  var maxResults = +document.getElementById('maxResults').value;
  chrome.storage.local.set({
    maxResults: Math.max(2, maxResults)
  }, () => {
    restore();
    let status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(() => status.textContent = '', 750);
  });
}

document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', save);
