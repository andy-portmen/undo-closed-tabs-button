'use strict';

var cache = [];
var png = chrome.runtime.getURL('/data/popup/document.png');

var notify = msg => chrome.notifications.create(null, {
  type: 'basic',
  iconUrl: '/data/icons/notification/48.png',
  title: 'Undo Closed Tabs Button',
  message: msg.message || msg,
});

function restore(ids, urls = []) {
  const id = ids.shift();
  const url = urls.shift();

  if (!id || id === 'undefined') {
    chrome.tabs.create({
      url
    }, () => {
      if (ids.length) {
        restore(ids, urls);
      }
      else {
        window.close();
      }
    });
  }
  else {
    chrome.sessions.restore(id, () => {
      if (ids.length) {
        restore(ids, urls);
      }
      else {
        window.close();
      }
    });
  }
}

chrome.storage.local.get({
  maxResults: 7,
  useGoogle: true
}, prefs => {
  chrome.sessions.getRecentlyClosed({
    maxResults: prefs.maxResults
  }, sessions => {
    cache = sessions;
    const item = document.querySelector('li');
    const ul = document.querySelector('ul');
    const lastChild = document.querySelector('.separator').parentNode;

    function add(tab, window) {
      const li = item.cloneNode(true);
      li.querySelector('span').textContent = tab.title || 'No title';
      if (navigator.userAgent.indexOf('Firefox') === -1) {
        li.style['background-image'] = `url(chrome://favicon/${tab.url})`;
      }
      else if (prefs.useGoogle) {
        li.style['background-image'] = `url(http://www.google.com/s2/favicons?domain_url=${tab.url})`;
      }
      else {
        li.style['background-image'] = `url(${png})`;
      }
      li.dataset.id = tab.sessionId;
      li.dataset.url = tab.url;

      ul.insertBefore(li, lastChild);
      if (window) {
        li.querySelector('div').dataset.id = window.sessionId;
      }
    }

    sessions.slice(0, prefs.maxResults).forEach(session => {
      if (session.tab) {
        add(session.tab);
      }
      else if (session.window) {
        session.window.tabs.forEach(tab => add(tab, session.window));
      }
    });
    if (sessions.length) {
      ul.removeChild(item);
    }
    else {
      item.dataset.disabled = true;
      document.querySelector('[data-cmd="clear-history"]').dataset.disabled = true;
      document.querySelector('[data-cmd="open-all"]').dataset.disabled = true;

    }
  });
});

document.addEventListener('click', ({target}) => {
  if (target.dataset.id && target.dataset.disabled !== 'true') {
    restore([target.dataset.id], [target.dataset.url]);
  }
  if (target.dataset.cmd === 'open-all') {
    const ids = cache.map(session => session.window ? session.window.sessionId : session.tab.sessionId);
    if (ids) {
      restore(ids);
    }
    else {
      window.close();
    }
  }
  else if (target.dataset.cmd === 'open-history') {
    chrome.tabs.create({
      url: 'chrome://history/'
    }, () => {
      if (chrome.runtime.lastError) {
        notify(chrome.runtime.lastError);
      }
    });
  }
  else if (target.dataset.cmd === 'clear-history') {
    chrome.browsingData.remove({}, {
      'history': true
    }, () => window.close());
  }
});
