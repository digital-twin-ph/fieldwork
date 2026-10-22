use graphways::graph::SpatialGraph;
use graphways::overpass::NetworkType;
use rayon::prelude::*;

#[no_mangle]
pub extern "C" fn rayon_probe() -> i32 { (0..1000i32).into_par_iter().sum() }

/// Hand the module a buffer to write an extract into: wasm32 has no filesystem,
/// so the bytes arrive through memory.
#[no_mangle]
pub extern "C" fn alloc(len: usize) -> *mut u8 {
    let mut buffer = Vec::<u8>::with_capacity(len);
    let pointer = buffer.as_mut_ptr();
    std::mem::forget(buffer);
    pointer
}

/// Junctions in the graph graphways builds from that extract, or a negative
/// code: -1 the PBF could not be read, -2 the graph could not be built.
/// Apply a study-area bbox before the extract is read. Degrees, CRS84.
#[no_mangle]
pub extern "C" fn set_bbox(west: f64, south: f64, east: f64, north: f64) {
    graphways::pbf::set_bbox(west, south, east, north);
}

#[no_mangle]
pub extern "C" fn graph_from_pbf(pointer: *mut u8, len: usize, drive: i32) -> i32 {
    let bytes = unsafe { std::slice::from_raw_parts(pointer, len) };
    let network = if drive != 0 { NetworkType::Drive } else { NetworkType::Walk };
    let (data, _pois) = match graphways::pbf::read_pbf_bytes(bytes, network) {
        Ok(value) => value,
        Err(_) => return -1,
    };
    let graph = SpatialGraph::from_osm_data(data, network, true);
    graph.graph.node_count() as i32
}
