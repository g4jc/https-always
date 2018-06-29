pref("extensions.https_everywhere.LogLevel", 5);
pref("extensions.https_everywhere.log_to_stdout", false);
pref("extensions.https_everywhere.globalEnabled",true);

// this is the HTTPS Everywhere preferences version (for migrations)
pref("extensions.https_everywhere.prefs_version", 0);

// this is a popup asking whether the user really meant to be on the dev branch
pref("extensions.https_everywhere.dev_popup_shown", false);

// show ruleset tests in the menu
pref("extensions.https_everywhere.show_ruleset_tests", false);
// run a ruleset performance test at startup
pref("extensions.https_everywhere.performance_tests", false);

// enable rulesets that trigger mixed content blocking
pref("extensions.https_everywhere.enable_mixed_rulesets", false);

// HTTP Nowhere preferences
pref("extensions.https_everywhere.http_nowhere.enabled", false);
pref("extensions.https_everywhere.http_nowhere.orig.ocsp.required", false);
