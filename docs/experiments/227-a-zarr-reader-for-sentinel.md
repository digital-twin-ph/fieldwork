# 227 · A Zarr reader for Sentinel data, spiked on ESA's EOPF stores

_Created 2026-11-21 · Updated 2026-11-21_

**Status:** tried. Spike run 2026-11-21: **yes, a point can be read; no worked example can use it yet.** Nothing of it is in
the application.

## The question

The practitioner, 2026-11-21, on explorer.eopf.copernicus.eu: *"Can we check out what this offers for FW? … It's a Zarr
explorer"*, then *"Can we spike a zarr reader and see if there is any worked example that can use it?"* ESA is moving
the Sentinel archive from its SAFE download format to Zarr. Fieldwork reads GeoTIFF/COG and NetCDF and has no Zarr
reader ([47](47-sea-level-pack.md), [179](179-eo-and-stac-for-the-nyc-monitors.md)).

## What EOPF serves, as read 2026-11-21

| | |
| --- | --- |
| Who | ESA, Copernicus; built by Development Seed and EOX. A project "to demonstrate the benefits"; no retention promised |
| Catalogue | STAC 1.1 at `api.explorer.eopf.copernicus.eu/stac`, open, no account |
| Data | Zarr v3 over HTTPS (`s3.explorer.eopf.copernicus.eu`), open, no account |
| Licence | the Copernicus Sentinel legal notice; credit "Contains modified Copernicus Sentinel data [year]" |
| Browser access | the catalogue echoes the page's origin; the store answers `access-control-allow-origin: *` |
| Holdings | Sentinel-2 L2A, 34,604 scenes, from 17 September 2021; Sentinel-1 radar (Europe, staging); Sentinel-3 OLCI (staging) |

The catalogue's extent is global, but the scenes are not: none over Rio de Janeiro at any date, none over Germany in
2021, 1,791 over Germany and 124 over London, the newest from September 2026.

## The format

One Sentinel-2 scene's reflectance group holds the bands at six resolutions, 10 m to 720 m. At 10 m each band is one
array of 10,980 × 10,980, stored as a **single shard** of 2,025 inner chunks of 244 × 244, with the shard's index at its
end (16 bytes a chunk, little-endian, then a CRC-32C). Each chunk is reflectance stored as 16-bit integers
(`scale_offset`, scale 10,000 and offset −0.1, then `cast_value`, 0 for no data), shuffled and compressed with Blosc and
Zstandard. `scale_offset` and `cast_value` are newer codecs a library reader may not know.

## The spike

`scripts/zarr-point-spike.mjs`, about 50 lines, no Zarr library: a longitude and latitude placed on the scene's grid
(UTM 33N), the shard's index read by one byte range (32 KB), the chunk holding the pixel by another, Blosc's frame
decoded, Zstandard by Node's own `zlib`, unshuffled, and the integer turned back into reflectance. NDVI from red (B04)
and near-infrared (B08), at five places in scene `S2C_MSIL2A_20260927T101801_N0513_R065_T33UVU_20260927T153810`
(27 September 2026, 0.07% cloud, east of Berlin).

**The check:** the same five pixels from Planetary Computer's Cloud-Optimised GeoTIFFs of the same product (baseline
05.13), read with geotiff.js as Fieldwork reads them (`scripts/zarr-point-spike-check.mjs`):

| Place | NDVI, Zarr | NDVI, GeoTIFF |
| --- | --- | --- |
| Müggelberge, forest | 0.855 | 0.855 |
| Köpenick old town | 0.240 | 0.240 |
| Farmland near Strausberg | 0.389 | 0.389 |
| Strausberg town centre | 0.339 | 0.339 |
| Müggelsee, lake | −0.206 | −0.206 |

Red and near-infrared agree to four decimals at all five. Ten pixels took 17 s and 789 KB, every request one after
another from this machine; nothing was done in parallel.

**Found on the way: the transform's origin is a pixel centre.** The metadata says `spatial:registration: pixel`, and
its transform starts at 399,965 m where the GeoTIFF's corner is 399,960 m. Read as a corner, three of five points fell
one pixel off: the same over a field, 0.252 for 0.339 in a town. Read as the first pixel's centre, all five agree.

## Which worked example could use it

None today. Brazil dengue (Rio, 2024) reads vegetation and land surface temperature from MODIS and would gain 10 m
NDVI, but EOPF holds nothing over Rio. NYC reads Sentinel-5P, which EOPF does not hold. Salmonella Germany is early
2021, before EOPF's first scene. Sea-level Philippines and the population models read raster files. EOPF's Sentinel-3
is OLCI, ocean and land colour, not land surface temperature.

## What this establishes, and what it does not

**Establishes:** a Sentinel-2 Zarr point can be read with two byte ranges and a small decoder, giving what the
GeoTIFF of the same product gives, and both servers answer a browser.

**Does not establish:** that it runs in a browser (Node was used; the browser has no Zstandard in its own library, so
a decoder is needed, in JavaScript or in Fieldwork's Rust kernel); speed with requests in parallel; any area read
rather than a point; Sentinel-1 or Sentinel-3 stores; that EOPF's samples stay available; that the stores keep this
layout once ESA produces Zarr operationally.

## Open

For the practitioner: whether a worked example in EOPF's coverage (Europe, late 2021 onwards) is worth making, or
whether this waits until ESA's operational Zarr covers the places Fieldwork's examples are in.
