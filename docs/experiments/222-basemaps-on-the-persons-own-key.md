# 222 · Basemaps on the person's own key

_Created 2026-11-19 · Updated 2026-11-19_

**Status:** tried. Built in 0.148.0 (Map 0.36.0); seen with real keys only once published, because the practitioner's
keys are locked to Fieldwork's address.

## The question

The practitioner, 2026-11-18: *"can we include MapBox in our list of credentials? Users can get their own free account
and add credentials to their credentials file. Which means, when they have unlocked their credentials file, and MapBox
is in there, Mapbox tiles become available for interactive maps."* Then: *"Are there other tile providers that have
higher free limits?"*, and after the comparison, *"Forget about Mapbox. Let's use Carto and Esri."*

## What the providers' own pages said (read 2026-11-18, HTML only, no sign-up)

| Provider | Free each month | Card | Satellite | Key locked to a site |
| --- | --- | --- | --- | --- |
| Mapbox, trial | 20,000 static tiles | No | No | No (one fixed token) |
| CARTO basemaps | 5 million requests, non-commercial | No (email only) | No | Yes, host only |
| Esri ArcGIS Location Platform | 2 million tiles, pay-as-you-go off by default | Not stated for sign-up | Yes | Yes, referrer URLs |

The comparison of thirteen providers is summarised in the session that chose them; the figures are model summaries of
the providers' pages, not quotations, except where the manual quotes them. Three findings decided the design:

- **CARTO's raster tiles need a key since 25 September 2026**; its vector styles still load without one.
- **Esri's key is made in a seven-screen wizard** (credential type, public application, item access, privileges,
  settings, title, generate), walked through by the practitioner and recorded step for step in the Credentials manual.
  The practitioner: *"The ESRI account creation is a little involved."*
- **A key locked to Fieldwork's address does not work on `localhost`.** The practitioner chose to wait for the release
  rather than make a second key.

## What was built

- Six choices in `src/basemaps.ts`: `carto-positron`, `carto-voyager`, `carto-dark-matter`, `esri-imagery`,
  `esri-streets`, `esri-outdoor`. Each names its provider; the credentials are asked for a key by provider and the origin
  the manual gives (`https://basemaps.cartocdn.com`, `https://static-map-tiles-api.arcgis.com`). One Esri key also reads
  the imagery host, `ibasemaps-api.arcgis.com`.
- Offered on the interactive map only while the key answers; a style already chosen stays listed. Locked or absent, the
  map draws OpenStreetMap and says *needs your CARTO key*.
- Esri's credit is *Powered by Esri* and the service's own copyright text, read when a style is drawn.
- **Never drawn into a static figure.** A figure draws OpenStreetMap in its place and credits that.

**Validation (Chromium, 2026-11-18):** `tests/keyed-basemaps.browser.mjs`, 2 passed, with CARTO's tiles stubbed and a
made-up key: the styles offered with a key and Esri's not without one, tiles requested with the key, CARTO and
OpenStreetMap credited, the project holding the name and not the key; and, locked, OpenStreetMap with the reason.
`tests/basemaps-per-presentation.test.mjs`: the options rule, 16 passed.

## What it does not establish

- That CARTO and Esri accept the practitioner's keys from the published site: seen only after publishing.
- Esri's tile size and credit text with a real key; the 512-pixel tiles and the credit request are from Esri's tutorials.
- Whether either provider allows its tiles in exported or printed figures for this use. Until read, figures keep
  OpenStreetMap.
- A key that locks while a map is open keeps drawing until the map is next drawn.
- WebKit, and Edge on Windows.
