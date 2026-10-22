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
