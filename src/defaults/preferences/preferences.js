pref("extensions.https_always.LogLevel", 5);
pref("extensions.https_always.log_to_stdout", false);
pref("extensions.https_always.globalEnabled",true);

// this is the HTTPS Always preferences version (for migrations)
pref("extensions.https_always.prefs_version", 0);

// this is a popup asking whether the user really meant to be on the dev branch
pref("extensions.https_always.dev_popup_shown", false);

// enable rulesets that trigger mixed content blocking
pref("extensions.https_always.enable_mixed_rulesets", false);

// HTTP Nowhere preferences
pref("extensions.https_always.http_nowhere.enabled", false);
pref("extensions.https_always.http_nowhere.orig.ocsp.required", false);
