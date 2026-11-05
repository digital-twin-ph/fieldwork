"""How many bytes of a Sentinel-5P NO2 swath does NYC need? Range reads only, counted, capped at 20 MB.

Experiment 179, phase 1. Reads the file's HDF5 structure, the latitude/longitude grids, then the NO2 column and
qa_value only for the scanlines that cross the five boroughs' box. Prints every quantity it reads and the byte cost.
"""
import json, sys, urllib.request, io
import numpy as np, h5py

CAP = 20_000_000
BOX = (-74.26, 40.49, -73.70, 40.92)  # W S E N, the five boroughs
ITEM = 'https://planetarycomputer.microsoft.com/api/stac/v1/collections/sentinel-5p-l2-netcdf/items/'
ORIGIN = {'Origin': 'https://digital-twin-ph.github.io'}

def get(url, headers=None):
    req = urllib.request.Request(url, headers={**ORIGIN, **(headers or {})})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read(), {k.lower(): v for k, v in r.headers.items()}

class Ranged(io.RawIOBase):
    """64 KB blocks, cached, as a browser range reader would fetch them."""
    BLOCK = 1 << 16
    def __init__(self, url):
        self.url, self.pos, self.cache = url, 0, {}
        _, h = get(url, {'Range': 'bytes=0-0'})
        self.size = int(h['content-range'].split('/')[1])
        self.requests = self.bytes = 0
    def seekable(self): return True
    def readable(self): return True
    def tell(self): return self.pos
    def seek(self, off, whence=0):
        self.pos = off if whence == 0 else self.pos + off if whence == 1 else self.size + off
        return self.pos
    def block(self, i):
        if i not in self.cache:
            start = i * self.BLOCK; end = min(start + self.BLOCK, self.size) - 1
            if self.bytes + (end - start + 1) > CAP:
                raise SystemExit(f'STOP: would exceed the {CAP/1e6:.0f} MB cap after {self.requests} requests, {self.bytes/1e6:.2f} MB')
            data, h = get(self.url, {'Range': f'bytes={start}-{end}'})
            self.requests += 1; self.bytes += len(data); self.cache[i] = data
        return self.cache[i]
    def readinto(self, b):
        n = min(len(b), self.size - self.pos)
        if n <= 0: return 0
        out = bytearray()
        while len(out) < n:
            i, off = divmod(self.pos + len(out), self.BLOCK)
            out += self.block(i)[off:off + n - len(out)]
        b[:n] = out; self.pos += n; return n

item_id = sys.argv[1]
item = json.loads(get(ITEM + item_id)[0])
href = item['assets']['no2']['href']
token = json.loads(get('https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-5p-l2-netcdf')[0])['token']
f = Ranged(href + '?' + token)
print(f'file {href.rsplit("/",1)[1]}: {f.size/1e6:.1f} MB')

with h5py.File(io.BufferedReader(f, buffer_size=1 << 16), 'r') as h:
    p = h['PRODUCT']
    lat, lon = p['latitude'], p['longitude']
    print('latitude', lat.shape, lat.dtype, 'chunks', lat.chunks, 'compression', lat.compression)
    print(f'  after opening: {f.requests} requests, {f.bytes/1e6:.2f} MB')
    la = lat[0]; lo = lon[0]
    print(f'  after latitude+longitude: {f.requests} requests, {f.bytes/1e6:.2f} MB')
    W, S, E, N = BOX
    inside = (lo >= W) & (lo <= E) & (la >= S) & (la <= N)
    rows, cols = np.nonzero(inside)
    print(f'pixels inside the box: {inside.sum()}  scanlines {rows.min() if len(rows) else None}-{rows.max() if len(rows) else None}')
    if len(rows):
        r0, r1 = rows.min(), rows.max() + 1
        no2 = p['nitrogendioxide_tropospheric_column'][0, r0:r1, :]
        qa = p['qa_value'][0, r0:r1, :]
        sel = inside[r0:r1, :]
        units = p['nitrogendioxide_tropospheric_column'].attrs.get('units')
        fill = p['nitrogendioxide_tropospheric_column'].attrs.get('_FillValue')
        vals = no2[sel]; q = qa[sel]
        good = vals[(q >= 0.75) & (vals != fill)] if fill is not None else vals[q >= 0.75]
        print(f'NO2 units {units!r}; pixels {sel.sum()}, with qa_value >= 0.75: {good.size}; '
              f'mean {float(good.mean()) if good.size else None}')
    print(f'TOTAL: {f.requests} requests, {f.bytes/1e6:.2f} MB of {f.size/1e6:.1f} MB')
