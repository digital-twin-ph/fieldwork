//! Spike 1 of experiment 129: get the graph OUT of WebAssembly in a shape
//! fieldwork could use, and find out what that costs in memory.
//!
//! Everything crosses as a flat typed array. One JS object per junction is
//! what the measurement is about, so the module must not force one: it writes
//! `(id, lon, lat)` and `(from, to, metres)` into buffers and hands over a
//! pointer. The caller can read them as `Float64Array`/`Uint32Array` without
//! copying, and decide for itself whether to build objects.
use graphways::graph::SpatialGraph;
use graphways::overpass::NetworkType;
use petgraph::visit::EdgeRef;
use rayon::prelude::*;
use std::sync::Mutex;

static GRAPH: Mutex<Option<SpatialGraph>> = Mutex::new(None);
static NODES: Mutex<Vec<f64>> = Mutex::new(Vec::new());
static EDGES: Mutex<Vec<f64>> = Mutex::new(Vec::new());

#[no_mangle]
pub extern "C" fn rayon_probe() -> i32 { (0..1000i32).into_par_iter().sum() }

#[no_mangle]
pub extern "C" fn alloc(len: usize) -> *mut u8 {
    let mut buffer = Vec::<u8>::with_capacity(len);
    let pointer = buffer.as_mut_ptr();
    std::mem::forget(buffer);
    pointer
}

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
    let count = graph.graph.node_count() as i32;
    *GRAPH.lock().unwrap() = Some(graph);
    count
}

/// `(osm id, lon, lat)` per junction, in petgraph index order so the edge
/// buffer can refer to junctions by index rather than by id.
#[no_mangle]
pub extern "C" fn export_nodes() -> *const f64 {
    let held = GRAPH.lock().unwrap();
    let Some(graph) = held.as_ref() else { return std::ptr::null() };
    let mut out = Vec::with_capacity(graph.graph.node_count() * 3);
    for node in graph.graph.node_weights() {
        out.push(node.id as f64);
        out.push(node.lon);
        out.push(node.lat);
    }
    let pointer = out.as_ptr();
    *NODES.lock().unwrap() = out;
    pointer
}
#[no_mangle]
pub extern "C" fn node_values() -> usize { NODES.lock().unwrap().len() }

/// `(from index, to index, metres)` per directed segment.
#[no_mangle]
pub extern "C" fn export_edges() -> *const f64 {
    let held = GRAPH.lock().unwrap();
    let Some(graph) = held.as_ref() else { return std::ptr::null() };
    let mut out = Vec::with_capacity(graph.graph.edge_count() * 3);
    for edge in graph.graph.edge_references() {
        out.push(edge.source().index() as f64);
        out.push(edge.target().index() as f64);
        out.push(edge.weight().length);
    }
    let pointer = out.as_ptr();
    *EDGES.lock().unwrap() = out;
    pointer
}
#[no_mangle]
pub extern "C" fn edge_values() -> usize { EDGES.lock().unwrap().len() }

/// Let the graph go once it has been exported, so the JS side is not building
/// its own copy while the module still holds the original.
#[no_mangle]
pub extern "C" fn drop_graph() { *GRAPH.lock().unwrap() = None; }
#[no_mangle]
pub extern "C" fn drop_buffers() {
    *NODES.lock().unwrap() = Vec::new();
    *EDGES.lock().unwrap() = Vec::new();
}

// ---------------------------------------------------------------------------
// Spike 4: ask the graph questions instead of handing it over.
// ---------------------------------------------------------------------------

static ANSWER: Mutex<Vec<f64>> = Mutex::new(Vec::new());

#[no_mangle]
pub extern "C" fn answer_values() -> usize { ANSWER.lock().unwrap().len() }
fn publish(values: Vec<f64>) -> *const f64 {
    let pointer = values.as_ptr();
    *ANSWER.lock().unwrap() = values;
    pointer
}

/// Snap `count` points, read as `(lat, lon)` pairs from `pointer`, to the
/// graph. Writes `(snapped lat, snapped lon, metres)` per point, with -1
/// metres where nothing was near enough.
#[no_mangle]
pub extern "C" fn snap_points(pointer: *const f64, count: usize, max_snap_m: f64) -> *const f64 {
    let held = GRAPH.lock().unwrap();
    let Some(graph) = held.as_ref() else { return std::ptr::null() };
    let input = unsafe { std::slice::from_raw_parts(pointer, count * 2) };
    let limit = if max_snap_m > 0.0 { Some(max_snap_m) } else { None };
    let mut out = Vec::with_capacity(count * 3);
    for pair in input.chunks_exact(2) {
        let point = graphways::graph::LatLon::new(pair[0], pair[1]);
        match graph.snap_point_within(point, limit) {
            Some(snap) => { out.push(snap.snapped_lat); out.push(snap.snapped_lon); out.push(snap.distance_m); }
            None => { out.push(f64::NAN); out.push(f64::NAN); out.push(-1.0); }
        }
    }
    publish(out)
}

/// One isochrone from `(lat, lon)` at `seconds`. Writes the ring as
/// `(lon, lat)` pairs, with `(NaN, NaN)` between parts.
#[no_mangle]
pub extern "C" fn isochrone(lat: f64, lon: f64, seconds: f64, max_snap_m: f64) -> *const f64 {
    let held = GRAPH.lock().unwrap();
    let Some(graph) = held.as_ref() else { return std::ptr::null() };
    let limit = if max_snap_m > 0.0 { Some(max_snap_m) } else { None };
    let polygons = match graph.isochrones(graphways::graph::LatLon::new(lat, lon), &[seconds], limit) {
        Ok(value) => value,
        Err(_) => return publish(Vec::new()),
    };
    let mut out = Vec::new();
    for multi in &polygons {
        for polygon in multi {
            if !out.is_empty() { out.push(f64::NAN); out.push(f64::NAN); }
            for point in polygon.exterior().points() { out.push(point.x()); out.push(point.y()); }
        }
    }
    publish(out)
}

/// A travel-time matrix between the first `origins` points and the rest.
/// Writes seconds row-major, with -1 where there is no route.
#[no_mangle]
pub extern "C" fn travel_matrix(pointer: *const f64, origins: usize, destinations: usize, max_snap_m: f64) -> *const f64 {
    let held = GRAPH.lock().unwrap();
    let Some(graph) = held.as_ref() else { return std::ptr::null() };
    let input = unsafe { std::slice::from_raw_parts(pointer, (origins + destinations) * 2) };
    let point = |i: usize| graphways::graph::LatLon::new(input[i * 2], input[i * 2 + 1]);
    let from: Vec<_> = (0..origins).map(point).collect();
    let to: Vec<_> = (origins..origins + destinations).map(point).collect();
    let limit = if max_snap_m > 0.0 { Some(max_snap_m) } else { None };
    let matrix = graph.travel_time_matrix(&from, &to, limit);
    let mut out = Vec::with_capacity(origins * destinations);
    for row in &matrix.durations_s { for cell in row { out.push(cell.unwrap_or(-1.0)); } }
    publish(out)
}
