'use strict';

const Cc = Components.classes,
      Ci = Components.interfaces,
      Cu = Components.utils,
      Cr = Components.results,
      Ce = Components.Exception;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

function undoClosed() {
  this.wrappedJSObject = this;
}

undoClosed.prototype = {
  // properties required for XPCOM registration:
  classDescription: 'Undo closed Tab component',
  classID:          Components.ID('{0823d73b-a3b5-4a8e-99cd-881ba1167700}'),
  contractID:       '@undo/add0n.com;1',

  _xpcom_categories: [{
    category: 'profile-after-change',
  }],

  QueryInterface: function (aIID) {
    if (!aIID.equals(Ci.nsISupports) && !aIID.equals(Ci.nsIObserver) && !aIID.equals(Ci.nsISupportsWeakReference)) {
      throw Cr.NS_ERROR_NO_INTERFACE;
    }
    return this;
  },

  observe: function(aSubject, aTopic, aData) {
    switch (aTopic) {
    case 'profile-after-change':
      var myPrefObserver = {
        register: function() {
          var prefService = Cc['@mozilla.org/preferences-service;1']
            .getService(Ci.nsIPrefService);

          this.branch = prefService.getBranch('extensions.undoclosedtabsbutton.');
          if (!('addObserver' in this.branch)) {
            this.branch.QueryInterface(Ci.nsIPrefBranch2);
          }
          this.branch.addObserver('', this, false);
        },
        unregister: function() {
          this.branch.removeObserver('', this);
        },
        observe: function (aSubject, aTopic, aData) {
          switch (aData) {
          case 'oldAppearance':
            var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
              .getService(Components.interfaces.nsIWindowMediator);
            var enumerator = wm.getEnumerator('navigator:browser');
            while (enumerator.hasMoreElements()) {
              var win = enumerator.getNext();
              if (this.branch.getBoolPref('oldAppearance')) {
                win.document.getElementById('uctb-toolbar-button').setAttribute('old', 'true');
              }
              else {
                win.document.getElementById('uctb-toolbar-button').removeAttribute('old');
              }
            }
            break;
          }
        }
      };
      myPrefObserver.register();
      break;
    default:
      throw Ce('Unknown topic: ' + aTopic);
    }
  }
};

var components = [undoClosed];
if ('generateNSGetFactory' in XPCOMUtils) {
  var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);  // Gecko 2.0+
}
else {
  var NSGetModule = XPCOMUtils.generateNSGetModule(components);    // Gecko 1.9.x
}
