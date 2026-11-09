"""A small NetCDF-4 grid shaped like DTU25MSS: latitude ascending, values at nodes, gzip chunks, a fill value and a
scale factor, plus a second variable so a choice has to be made. Values are a known function of position."""
import sys
import h5py
import numpy as np

path = sys.argv[1]
lat = np.round(np.arange(14.0, 15.2001, 0.01), 6)      # 121 nodes, south first
lon = np.round(np.arange(120.5, 121.5001, 0.01), 6)    # 101 nodes
LAT, LON = np.meshgrid(lat, lon, indexing="ij")
mss = 40 + (LAT - 14) * 1.5 + (LON - 120.5) * 0.25     # metres
packed = np.round(mss / 0.001).astype("int32")
packed[60, 50] = -2147483647                             # a fill value inside the area
with h5py.File(path, "w") as f:
    f.attrs["Conventions"] = "CF-1.7"
    la = f.create_dataset("latitude", data=lat); la.attrs["units"] = "degrees_north"; la.make_scale("latitude")
    lo = f.create_dataset("longitude", data=lon); lo.attrs["units"] = "degrees_east"; lo.make_scale("longitude")
    for name, data, extra in (("mss", packed, {"scale_factor": 0.001, "_FillValue": np.int32(-2147483647)}),
                              ("sigma", np.full(packed.shape, 50, "int32"), {"scale_factor": 0.001})):
        d = f.create_dataset(name, data=data, chunks=(40, 40), compression="gzip")
        for k, v in extra.items(): d.attrs[k] = v
        d.attrs["units"] = "m"
        d.dims[0].attach_scale(la); d.dims[1].attach_scale(lo)
print(path, packed.shape)
