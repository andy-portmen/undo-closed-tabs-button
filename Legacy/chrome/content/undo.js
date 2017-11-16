/* globals gPrefService, gNavigatorBundle, undoCloseTab, gBrowser, gContextMenu, getBrowser, Services, AddonManager, Cc, Ci */
'use strict';

var undoClosedButt = {
  installButton: function (toolbarId, id, afterId) {
    if (!document.getElementById(id)) {
      var toolbar = document.getElementById(toolbarId);

      // If no afterId is given, then append the item to the toolbar
      var before = null;
      if (afterId) {
        var elem = document.getElementById(afterId);
        if (elem && elem.parentNode === toolbar) {
          before = elem.nextElementSibling;
        }
      }

      toolbar.insertItem(id, before);
      toolbar.setAttribute('currentset', toolbar.currentSet);
      document.persist(toolbar.id, 'currentset');

      if (toolbarId === 'addon-bar') {
        toolbar.collapsed = false;
      }
    }
  },
  session: (function () {
    var ss = Cc['@mozilla.org/browser/sessionstore;1']
      .getService(Ci.nsISessionStore);
    var wm = Cc['@mozilla.org/appshell/window-mediator;1']
      .getService(Ci.nsIWindowMediator);

    function getClosedTabCount() {
      try {
        return ss.getClosedTabCount(wm.getMostRecentWindow('navigator:browser'));
      }
      catch (e) {}
      return 0;
    }
    function getClosedTabData () {
      try {
        return ss.getClosedTabData(wm.getMostRecentWindow('navigator:browser'));
      } catch (e) {}
      return '[]';
    }
    return {
      getClosedTabCount: getClosedTabCount,
      getClosedTabData: getClosedTabData
    };
  })(),

  populateUndoSubmenu: function (aNode) {
    if (!aNode) {
      return;
    }
    // remove existing menu items
    while (aNode.hasChildNodes()) {
      aNode.removeChild(aNode.firstChild);
    }
    // return if no restorable tabs
    if (undoClosedButt.session.getClosedTabCount() === 0) {
      var noHistory = document.getElementById('bundle_undoclosedtabsbutton')
        .getString('noHistory');
      aNode.appendChild(document.createElement('menuitem'));
      aNode.firstChild.setAttribute('label', noHistory);
      aNode.firstChild.setAttribute('disabled', 'true');
      return;
    }
    // populate menu
    var undoItems = JSON.parse(undoClosedButt.session.getClosedTabData());

    function addClear() {
      var clearHistoryLabel = document.getElementById('bundle_undoclosedtabsbutton')
                                .getString('clearHistory');
      var mItem = aNode.appendChild(document.createElement('menuitem'));
      mItem.addEventListener('command', function () {
        undoClosedButt.clearClosedTabsHistory();
      }, false);
      mItem.setAttribute('label', clearHistoryLabel);
      mItem.tooltipText = mItem.label;
    }

    function addRestore () {
      var strings = gNavigatorBundle;
      var m = aNode.appendChild(document.createElement('menuitem'));
      m.setAttribute('label', strings.getString('menuRestoreAllTabs.label'));
      m.addEventListener('command', function () {
        for (var i = 0; i < undoItems.length; i++) {
          undoCloseTab();
        }
      }, false);
    }

    function addSeparator () {
      aNode.appendChild(document.createElement('menuseparator'));
    }

    function addItems () {
      for (var i = 0; i < undoItems.length; i++) {
        var m = aNode.appendChild(document.createElement('menuitem'));
        m.setAttribute('class', 'menuitem-iconic bookmark-item');
        m.setAttribute('label', undoItems[i].title);
        m.setAttribute('value', i);
        m.addEventListener('command', function (e) {
          undoCloseTab(e.originalTarget.getAttribute('value'));
        }, false);
        if (undoItems[i].image) {
          let iconURL = undoItems[i].image;
          if (/^https?:/.test(iconURL)) {
            iconURL = 'moz-anno:favicon:' + iconURL;
          }
          m.setAttribute('image', iconURL);
        }
        // Set the targetURI attribute so it will be shown in tooltip and statusbar.
        // SessionStore uses one-based indexes, so we need to normalize them.
        let tabData = undoItems[i].state;
        let activeIndex = (tabData.index || tabData.entries.length) - 1;
        if (activeIndex >= 0 && tabData.entries[activeIndex]) {
          m.setAttribute('targetURI', tabData.entries[activeIndex].url);
        }
      }
    }

    if (
      gPrefService.getBoolPref('extensions.undoclosedtabsbutton.showOpenAll') ||
      gPrefService.getBoolPref('extensions.undoclosedtabsbutton.clearHistory')
    ) {
      if (gPrefService.getBoolPref('extensions.undoclosedtabsbutton.onTop')) {
        if (gPrefService.getBoolPref('extensions.undoclosedtabsbutton.clearHistory')) {
          addClear();
        }
        if (gPrefService.getBoolPref('extensions.undoclosedtabsbutton.showOpenAll')) {
          addRestore();
        }
        addSeparator();
        addItems();
      }
      else {
        addItems();
        addSeparator();
        if (gPrefService.getBoolPref('extensions.undoclosedtabsbutton.clearHistory')) {
          addClear();
        }
        if (gPrefService.getBoolPref('extensions.undoclosedtabsbutton.showOpenAll')) {
          addRestore();
        }
      }
    }
    else {
      addItems();
    }
  },

  clearClosedTabsHistory: function () {
    var maxUndo;
    try {
      maxUndo = gPrefService.getIntPref('browser.sessionstore.max_tabs_undo');
    } catch (e) {
      maxUndo = 10;
      gPrefService.setIntPref('browser.sessionstore.max_tabs_undo', maxUndo);
    }
    //clear close tabs history
    gPrefService.setIntPref('browser.sessionstore.max_tabs_undo', 0);
    //restore maximum undo history pref
    gPrefService.setIntPref('browser.sessionstore.max_tabs_undo', maxUndo);
    // update button disabled on TabOpen & TabClose
    gBrowser.tabContainer.addEventListener('TabOpen',undoClosedButt.tabOpenClose,false);
    gBrowser.tabContainer.addEventListener('TabClose',undoClosedButt.tabOpenClose,false);
    gBrowser.tabContainer.addEventListener('TabOpen',undoClosedButt.tabbarOpenClose,false);
    gBrowser.tabContainer.addEventListener('TabClose',undoClosedButt.tabbarOpenClose,false);
    gBrowser.tabContainer.addEventListener('TabOpen',undoClosedButt.contextEntryOpenClose,false);
    gBrowser.tabContainer.addEventListener('TabClose',undoClosedButt.contextEntryOpenClose,false);
    // 1 second after browser window load
    setTimeout(function () {
      undoClosedButt.tabOpenClose();
    }, 250);
    setTimeout(function () {
      undoClosedButt.contextEntryOpenClose();
    }, 250);
  },

  onCommand: function () {
    if (gPrefService.getBoolPref('extensions.undoclosedtabsbutton.openMenu')) {
      undoClosedButt.rightClickMenu(document.getElementById('uctb-toolbar-button'), {button: 2});
    }
    else {
      undoCloseTab();
    }
  },

  rightClickMenu: function(aNode, aEvent) {
    if (aEvent.button === 2) {
      var popup = document.getElementById('uctb-menu');
      var x = aNode.boxObject.x;
      var y = aNode.boxObject.y + aNode.boxObject.height;
      popup.showPopup(aNode, x, y, 'popup', null, null);
    }
  },
  //Disable the toolbar button when no tabs to unclose
  tabOpenClose: function () {
    var button = document.getElementById('uctb-toolbar-button');
    var count = undoClosedButt.session.getClosedTabCount();
    // has closed tabs
    if (button && count > 0) {
      button.removeAttribute('disabled');
    }
    // no closed tabs
    else if (button && count < 1) {
      button.setAttribute('disabled', 'true');
    }
  },
  //Disable the context-menu entry when no tabs to unclose
  contextEntryOpenClose: function () {
    var contextEntry = document.getElementById('uctb-contextentry');
    var count = undoClosedButt.session.getClosedTabCount();
    // has closed tabs
    if (contextEntry && count > 0) {
      contextEntry.removeAttribute('disabled');
    }
    // no closed tabs
    else if (contextEntry && count < 1) {
      contextEntry.setAttribute('disabled', 'true');
    }
  },
  welcome: function () {
    function welcome (version) {
      var pre = gPrefService.getCharPref('extensions.undoclosedtabsbutton.version');
      if (pre === version) {
        return;
      }
      //Showing welcome screen
      setTimeout(function () {
        try {
          var newTab = getBrowser().addTab(
            'http://mybrowseraddon.com/undo.html?v=' + version + (pre ? '&p=' + pre + '&type=upgrade' : '&type=install')
          );
          getBrowser().selectedTab = newTab;
        }
        catch (e) {}
      }, 5000);
      gPrefService.setCharPref('extensions.undoclosedtabsbutton.version', version);
    }

    //Detect Firefox version
    var version = '';
    try {
      version = (
        navigator.userAgent.match(/Firefox\/([\d\.]*)/) ||
        navigator.userAgent.match(/Thunderbird\/([\d\.]*)/)
      )[1];
    } catch (e) {}
    //FF < 4.*
    var versionComparator = Components.classes['@mozilla.org/xpcom/version-comparator;1']
        .getService(Components.interfaces.nsIVersionComparator)
        .compare(version, '4.0');
    if (versionComparator < 0) {
      var addon = Services.extMan.getItemForID('undoclosedtabsbutton@supernova00.biz');
      welcome(addon.version);
    }
    //FF > 4.*
    else {
      Components.utils.import('resource://gre/modules/AddonManager.jsm');
      AddonManager.getAddonByID('undoclosedtabsbutton@supernova00.biz', function (addon) {
        welcome(addon.version);
      });
    }
  }
};

function UCT_init() {
  // Install Button
  if (gPrefService.getBoolPref('extensions.undoclosedtabsbutton.firstRun')) {
    undoClosedButt.installButton('nav-bar', 'uctb-toolbar-button');
    gPrefService.setBoolPref('extensions.undoclosedtabsbutton.firstRun', false);
  }
  // Set hotkey
  var modifier = gPrefService.getCharPref('extensions.undoclosedtabsbutton.modifier');
  var key = gPrefService.getCharPref('extensions.undoclosedtabsbutton.key');
  if (key && modifier) {
    document.getElementById('uctb-key').setAttribute('key', key);
    document.getElementById('uctb-key').setAttribute('modifiers', modifier);
  }
  // Show welcome if needed
  undoClosedButt.welcome();
  // Change icon if needed
  try {
    if (gPrefService.getBoolPref('extensions.undoclosedtabsbutton.oldAppearance')) {
      document.getElementById('uctb-toolbar-button').setAttribute('old', 'true');
    }
  } catch (e) {}
  // Add context menu
  document.getElementById('contentAreaContextMenu').addEventListener('popupshowing', function () {
    var someConditions = !(gContextMenu.isContentSelected ||
      gContextMenu.onLink ||
      gContextMenu.onImage ||
      gContextMenu.onTextInput);
    someConditions = someConditions &&
      !gPrefService.getBoolPref('extensions.undoclosedtabsbutton.removecontextentry');
    gContextMenu.showItem('uctb-contextentry', someConditions);
    gContextMenu.showItem('uctb-separator', someConditions);
  }, false);

  // Add attribute to nsSessionStore persistTabAttribute after delay
  // we call this after nsSessionStore.init
  window.setTimeout(function () {
    if (!window.__SSi) {// nsISessionStore not initialized
      return;
    }
    var ss = Cc['@mozilla.org/browser/sessionstore;1'].
      getService(Ci.nsISessionStore);
    ss.persistTabAttribute('image');
  }, 2000, false);
  // update button disabled on TabOpen & TabClose
  gBrowser.tabContainer.addEventListener('TabOpen',undoClosedButt.tabOpenClose,false);
  gBrowser.tabContainer.addEventListener('TabClose',undoClosedButt.tabOpenClose,false);
  gBrowser.tabContainer.addEventListener('TabOpen',undoClosedButt.contextEntryOpenClose,false);
  gBrowser.tabContainer.addEventListener('TabClose',undoClosedButt.contextEntryOpenClose,false);
  // 1 second after browser window load
  setTimeout(function () {
    // add tab image and url in statustext to closed tab list
    // add menu entry to clear the closed tabs list
    undoClosedButt.populateUndoSubmenu(document.getElementById('uctb-menu'));
    undoClosedButt.tabOpenClose();
    undoClosedButt.contextEntryOpenClose();
  }, 250);
}
window.addEventListener('load', UCT_init, false);
