'use strict';

var cache = [];
var png = chrome.runtime.getURL('/data/popup/document.png');

function restore (ids, urls = []) {
  let id = ids.shift();
  let url = urls.shift();

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
  maxResults: 7
}, prefs => {
  chrome.sessions.getRecentlyClosed(prefs, (sessions) => {
    cache = sessions;
    let item = document.querySelector('li');
    let ul = document.querySelector('ul');
    let lastChild = document.querySelector('.separator').parentNode;

    function add (tab, window) {
      let li = item.cloneNode(true);
      li.querySelector('span').textContent = tab.title || 'No title';
      if (navigator.userAgent.indexOf('Firefox') === -1) {
        li.style['background-image'] =  `url(chrome://favicon/${tab.url})`;
      }
      else {
        li.style['background-image'] =  `url(${png})`;
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
        session.window.tabs.forEach((tab) => add(tab, session.window));
      }
    });
    if (sessions.length) {
      ul.removeChild(item);
    }
    else {
      item.dataset.disabled = true;
    }
  });
});

document.addEventListener('click', e => {
  let target = e.target;
  if (target.dataset.id && target.dataset.disabled !== 'true') {
    restore([target.dataset.id], [target.dataset.url]);
  }
  if (target.dataset.cmd === 'open-all') {
    let ids = cache.map(session => {
      return session.window ? session.window.sessionId : session.tab.sessionId;
    });
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
    });
  }
});
