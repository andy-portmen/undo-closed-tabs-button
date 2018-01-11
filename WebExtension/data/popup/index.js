'use strict';

var isFirefox = navigator.userAgent.indexOf('Firefox') !== -1;
document.body.dataset.firefox = isFirefox;

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

var init = () => chrome.storage.local.get({
  maxResults: 7,
  useGoogle: true
}, prefs => {
  chrome.sessions.getRecentlyClosed({
    maxResults: prefs.maxResults
  }, sessions => {
    cache = sessions;
    const item = document.querySelector('li');
    const ul = document.querySelector('ul');

    function add(tab, window) {
      const li = item.cloneNode(true);
      li.title = li.querySelector('label').textContent =
        tab.title || 'No title';
      if (isFirefox === false) {
        li.style['background-image'] = `url(chrome://favicon/${tab.url})`;
      }
      else if (tab.favIconUrl) {
        li.style['background-image'] = `url(${tab.favIconUrl})`;
      }
      else if (prefs.useGoogle) { // this is not going to be called in FF > 57
        li.style['background-image'] = `url(http://www.google.com/s2/favicons?domain_url=${tab.url})`;
      }
      else {
        li.style['background-image'] = `url(${png})`;
      }
      li.dataset.id = tab.sessionId;
      li.dataset.url = tab.url;

      ul.appendChild(li);
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
      item.remove();
    }
    else {
      item.dataset.disabled = true;
      // document.querySelector('[data-cmd="clear-history"]').dataset.disabled = true;
      document.querySelector('[data-cmd="open-all"]').dataset.disabled = true;
      document.querySelector('[data-cmd="forget-tabs"]').dataset.disabled = true;
    }
  });
});
document.addEventListener('DOMContentLoaded', () => {
  window.setTimeout(init, 200);
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
  else if (target.dataset.cmd === 'forget-tabs') {
    const forget = session => {
      if (session.tab) {
        return browser.sessions.forgetClosedTab(session.tab.windowId, session.tab.sessionId);
      }
      else {
        return browser.sessions.forgetClosedWindow(session.window.sessionId);
      }
    };

    const loop = () => browser.sessions.getRecentlyClosed({}).then(sessions => {
      console.log(sessions.length);
      if (sessions.length) {
        return Promise.all(sessions.map(forget)).then(loop);
      }
    });
    loop().then(() => window.location.reload());
  }
});
