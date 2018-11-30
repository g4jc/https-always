window.addEventListener("load", https_always_load, true);
window.addEventListener("load", function load(event) {
  // need to wrap migratePreferences in another callback so that notification
  // always displays on browser restart
  window.removeEventListener("load", load, false);
  if (gBrowser) {
    gBrowser.addEventListener("DOMContentLoaded",
      migratePreferences.bind(null, gBrowser),
      true);
  }
}, false);

const CI = Components.interfaces;
const CC = Components.classes;

// LOG LEVELS ---
let VERB=1;
let DBUG=2;
let INFO=3;
let NOTE=4;
let WARN=5;

let HTTPSAlways = CC["@hyperbola.info/https-always;1"]
                      .getService(Components.interfaces.nsISupports)
                      .wrappedJSObject;

// avoid polluting global namespace
// see: https://developer.mozilla.org/en-US/docs/Security_best_practices_in_extensions#Code_wrapping
if (!httpsAlways) { var httpsAlways = {}; }

/**
 * JS Object that acts as a namespace for the toolbar.
 *
 * Used to display toolbar hints to new users and change toolbar UI for cases
 * such as when the toolbar is disabled.
 */
httpsAlways.toolbarButton = {

  /**
   * Name of preference for determining whether to show ruleset counter.
   */
  COUNTER_PREF: "extensions.https_always.show_counter",

  /**
   * Name of preference for whether HTTP Nowhere is on.
   */
  HTTP_NOWHERE_PREF: "extensions.https_always.http_nowhere.enabled",

  /**
   * Used to determine if a hint has been previously shown.
   * TODO: Probably extraneous, look into removing
   */
  hintShown: false,

  /**
   * Initialize the toolbar button used to hint new users and update UI on
   * certain events.
   */
  init: function() {
    HTTPSAlways.log(DBUG, 'Removing listener for toolbarButton init.');
    window.removeEventListener('load', httpsAlways.toolbarButton.init, false);

    var tb = httpsAlways.toolbarButton;

    // make sure the checkbox for showing counter is properly set
    var showCounter = tb.shouldShowCounter();
    var counterItem = document.getElementById('https-always-counter-item');
    if (counterItem) {
      counterItem.setAttribute('checked', showCounter ? 'true' : 'false');
    }

    // make sure UI for HTTP Nowhere mode is properly set
    var httpNowhereItem = document.getElementById('http-nowhere-item');
    var showHttpNowhere = tb.shouldShowHttpNowhere();
    var toolbarbutton = document.getElementById('https-always-button');
    if (httpNowhereItem) {
      httpNowhereItem.setAttribute('checked', showHttpNowhere ? 'true' : 'false');
    }
    if (toolbarbutton) {
      toolbarbutton.setAttribute('http_nowhere',
                                 showHttpNowhere ? 'true' : 'false');
    }

    // Make icon state match current status and tab.
    tb.updateIconState();

    // There is no gBrowser object on Android. Instead Android uses the
    // window.BrowserApp object:
    // https://developer.mozilla.org/en-US/Add-ons/Firefox_for_Android/API/BrowserApp
    if (gBrowser) {
      gBrowser.tabContainer.addEventListener(
        'TabSelect',
        tb.updateIconState,
        false
      );

      // add listener for top-level location change across all tabs
      let httpseProgressListener = {
        onLocationChange: function(aBrowser, aWebProgress, aReq, aLoc) {
          HTTPSAlways.log(DBUG, "Got on location change!");
          HTTPSAlways.resetApplicableList(aBrowser);
        },
        onStateChange: function(aBrowser, aWebProgress, aReq, aFlags, aStatus) {
          if ((gBrowser.selectedBrowser === aBrowser) &&
              (aFlags & CI.nsIWebProgressListener.STATE_STOP) &&
              aWebProgress.isTopLevel) {
            HTTPSAlways.log(DBUG, "Got on state change");
            tb.updateIconState();
          }
        }
      };
      gBrowser.addTabsProgressListener(httpseProgressListener);
    }

    // decide whether to show toolbar hint
    let hintPref = "extensions.https_always.toolbar_hint_shown";
    if (!Services.prefs.getPrefType(hintPref) 
        || !Services.prefs.getBoolPref(hintPref)) { 
      // only run once
      Services.prefs.setBoolPref(hintPref, true);
      // gBrowser unavailable on Android, see above.
      if (gBrowser) {
        gBrowser.addEventListener("DOMContentLoaded",
          tb.handleShowHint.bind(null, gBrowser),
          true);
      }
    }
  },

  /**
   * Shows toolbar hint if previously not shown.
   */
  handleShowHint: function(gBrowser) {
    var tb = httpsAlways.toolbarButton;
    if (!tb.hintShown){
      tb.hintShown = true;
      var nBox = gBrowser.getNotificationBox();
      var strings = document.getElementById('HttpsAlwaysStrings');
      var msg = strings.getString('https-always.toolbar.hint');
      var hint = nBox.appendNotification(
        msg,
        'https-always',
        'chrome://https-always/skin/icon-active-24.png');
    }
    gBrowser.removeEventListener("DOMContentLoaded", tb.handleShowHint, true);
  },

  selectedBrowser: function() {
    // gBrowser is unavailable on Android, see above.
    if (window.gBrowser) {
      return window.gBrowser.selectedBrowser;
    } else if (window.BrowserApp) {
      return window.BrowserApp.selectedBrowser;
    }
  },

  /**
   * Update the rulesets applied counter for the current tab.
   */
  updateIconState: function() {
    var toolbarbutton = document.getElementById('https-always-button');
    if (!toolbarbutton) {
      return;
    }

    var enabled = HTTPSAlways.prefs.getBoolPref("globalEnabled");
    var blocking = httpsAlways.toolbarButton.shouldShowHttpNowhere();
    var showCounter = httpsAlways.toolbarButton.shouldShowCounter();

    var browser = httpsAlways.toolbarButton.selectedBrowser();
    if (!browser) {
      return;
    }

    var alist = HTTPSAlways.getExpando(browser,"applicable_rules");
    if (!alist) {
      return;
    }
    // Make sure the list is up to date
    alist.populate_list();

    var counter = 0;
    for (var x in alist.active) {
      if (!(x in alist.breaking)) {
        ++counter;
      }
    }
    for (var x in alist.moot) {
      if (!(x in alist.active)) {
        ++counter;
      }
    }

    // inactive: extension is enabled, but no rules were triggered on this page.
    // active: extension is enabled and rewrote URLs on this page.
    // blocking: extension is in "block all HTTP requests" mode.
    // disabled: extension is disabled.
    var iconState = 'inactive';
    if (!enabled) {
      iconState = 'disabled';
    } else if (blocking) {
      iconState = 'blocking';
    } else if (counter) {
      iconState = 'active';
    }
    toolbarbutton.setAttribute('state', iconState);
    if (!showCounter) {
      toolbarbutton.setAttribute('rulesetsApplied', 0);
    } else {
      toolbarbutton.setAttribute('rulesetsApplied', counter);
    }

    HTTPSAlways.log(INFO, 'Setting icon state to: ' + iconState + '[' + counter + ']');
  },

  /**
   * Gets whether to show the rulesets applied counter.
   *
   * @return {boolean}
   */
  shouldShowCounter: function() {
    var tb = httpsAlways.toolbarButton;
    var sp = Services.prefs;

    var prefExists = sp.getPrefType(tb.COUNTER_PREF);

    // the default behavior is to hide the rulesets applied counter.
    return prefExists && sp.getBoolPref(tb.COUNTER_PREF);
  },

  /**
   * Gets whether to show HTTP Nowhere UI.
   *
   * @return {boolean}
   */
  shouldShowHttpNowhere: function() {
    var tb = httpsAlways.toolbarButton;
    var sp = Services.prefs;
    return sp.getBoolPref(tb.HTTP_NOWHERE_PREF);
  },

  /**
   * Toggles the user's preference for displaying the rulesets applied counter
   * and updates the UI.
   */
  toggleShowCounter: function() {
    var tb = httpsAlways.toolbarButton;
    var sp = Services.prefs;

    var showCounter = tb.shouldShowCounter();
    sp.setBoolPref(tb.COUNTER_PREF, !showCounter);

    tb.updateIconState();
  },

  /**
   * Toggles whether HTTP Nowhere mode is active, updates the toolbar icon.
   */
  toggleHttpNowhere: function() {
    HTTPSAlways.toggleHttpNowhere();
    reload_window();
  },

  /**
   * Resets all rules to their default state.
   */
  resetToDefaults: function() {
    HTTPSAlways.https_rules.resetRulesetsToDefaults()
  }
};

function https_always_load() {
  window.removeEventListener('load', https_always_load, true);
  // on first run, put the context menu in the addons bar
  try {
    var first_run;
    try {
      first_run = Services.prefs.getBoolPref("extensions.https_always.firstrun_context_menu");
    } catch(e) {
      Services.prefs.setBoolPref("extensions.https_always.firstrun_context_menu", true);
      first_run = true;
    }
    if(first_run) {
      Services.prefs.setBoolPref("extensions.https_always.firstrun_context_menu", false);
      var navbar = document.getElementById("nav-bar");
      if(navbar.currentSet.indexOf("https-always-button") == -1) {
        var set = navbar.currentSet+',https-always-button';
        navbar.setAttribute('currentset', set);
        navbar.currentSet = set;
        document.persist('nav-bar', 'currentset');
      }
    }
  } catch(e) { }
}

function stitch_context_menu() {
  // the same menu appears both under Tools and via the toolbar button:
  var menu = document.getElementById("https-always-menu");
  if (!menu.firstChild) {
    var popup = document.getElementById("https-always-context");
    menu.appendChild(popup.cloneNode(true));
  }
}
function stitch_context_menu2() {
  // the same menu appears both under Tools and via the toolbar button:
  var menu = document.getElementById("https-always-menu2");
  if (!menu.firstChild) {
    var popup = document.getElementById("https-always-context");
    menu.appendChild(popup.cloneNode(true));
  }
}

function show_applicable_list(menupopup) {
  var browser = httpsAlways.toolbarButton.selectedBrowser();
  if (!browser) {
    HTTPSAlways.log(WARN, "No browser for applicable list");
    return;
  }

  var alist = HTTPSAlways.getExpando(browser,"applicable_rules");
  var weird=false;

  if (!alist) {
    // This case occurs for error pages and similar.  We need a dummy alist
    // because populate_menu lives in there.  Would be good to refactor this
    // away.
    alist = new HTTPSAlways.ApplicableList(HTTPSAlways.log, browser.currentURI);
    weird = true;
  }
  alist.populate_menu(document, menupopup, weird);
}

function toggle_rule(rule_id) {
  // toggle the rule state
  HTTPSAlways.https_rules.rulesetsByID[rule_id].toggle();
  reload_window();
}

function reload_window() {
  var browser = httpsAlways.toolbarButton.selectedBrowser();
  if (browser) {
    browser.reload();
  }
}

function toggleEnabledState(){
  HTTPSAlways.toggleEnabledState();
  reload_window();
  toggleEnabledUI();
}

function toggleEnabledUI() {
  // Add/remove menu items depending on whether HTTPS-E is enabled
  var items = document.querySelectorAll(".hide-on-disable");
  var enabled = HTTPSAlways.prefs.getBoolPref("globalEnabled");
  for (let i = 0; i < items.length; i++) {
    items[i].hidden = !enabled;
  }

  httpsAlways.toolbarButton.updateIconState();
}

function open_in_tab(url) {
  let browserWindow = Services.wm.getMostRecentWindow("navigator:browser");
  browserWindow.gBrowser.addTab(url, {
          triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
        });
}

function httpse_chrome_opener(url, prefs) {
  HTTPSAlways.chrome_opener(url, prefs);
}

// hook event for showing hint
HTTPSAlways.log(DBUG, 'Adding listener for toolbarButton init.');
window.addEventListener("load", httpsAlways.toolbarButton.init, false);

function migratePreferences(gBrowser) {
  gBrowser.removeEventListener("DOMContentLoaded", migratePreferences, true);
  let prefs_version = HTTPSAlways.prefs.getIntPref("prefs_version");

  // first migration loses saved prefs
  if(prefs_version == 0) {
    try {
      // upgrades will have old rules as preferences, such as the EFF rule
      let upgrade = false;
      let childList = HTTPSAlways.prefs.getChildList("", {});
      for(let i=0; i<childList.length; i++) {
        if(childList[i] == 'EFF') {
          upgrade = true;
          break;
        }
      }

      if(upgrade) {
        let nBox = gBrowser.getNotificationBox();
        let strings = document.getElementById('HttpsAlwaysStrings');
        let msg = strings.getString('https-always.migration.notification0');
        nBox.appendNotification(
          msg, 
          'https-always-migration0', 
          'chrome://https-always/skin/icon-active-24.png', 
          nBox.PRIORITY_WARNING_MEDIUM
        );
      }
    } catch(e) {
      HTTPSAlways.log(WARN, "Migration from prefs_version 0 error: "+e);
    }

    HTTPSAlways.prefs.setIntPref("prefs_version", prefs_version+1);
  }
}
