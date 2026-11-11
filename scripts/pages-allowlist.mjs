// WHAT MAY BE PUBLISHED TO PAGES: every file the asset manifest lists must match, or staging stops. Shared with
// tests/pages-allowlist.test.mjs, which checks that every file a worked example offers is listed and allowed.
export const PUBLISHABLE=/^(index\.html|styles\.css|study-area\.css|icon\.svg|manifest\.webmanifest|build\/.+|vendor\/.+|examples\/old-naledi\/(data\.js|provenance\.json)|examples\/john-snow\/(NOTICE\.txt|upstream-LICENSE|provenance\.json|network\.json|soho\.graphml|pumps\.csv|cholera_deaths\.csv)|examples\/hagelloch-1861\/flurkarte-nw-iii-3-1824\.jpg)$/;
