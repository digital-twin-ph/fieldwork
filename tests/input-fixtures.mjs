import initSqlJs from 'sql.js';
// `utm` writes the same two points in EPSG:32735 rather than degrees, to exercise a GeoPackage
// that declares a CRS the importer can honour by converting. `projected` writes EPSG:3857, which
// it cannot, and must be refused by its code.
export async function pointGeoPackage({projected=false,utm=false}={}){
  const SQL=await initSqlJs(),db=new SQL.Database(),srs=utm?32735:projected?3857:4326;
  db.run(`PRAGMA application_id=1196444487; CREATE TABLE gpkg_spatial_ref_sys (srs_name TEXT,srs_id INTEGER PRIMARY KEY,organization TEXT,organization_coordsys_id INTEGER,definition TEXT,description TEXT); CREATE TABLE gpkg_contents(table_name TEXT PRIMARY KEY,data_type TEXT,identifier TEXT,description TEXT,last_change TEXT,min_x DOUBLE,min_y DOUBLE,max_x DOUBLE,max_y DOUBLE,srs_id INTEGER); CREATE TABLE gpkg_geometry_columns(table_name TEXT,column_name TEXT,geometry_type_name TEXT,srs_id INTEGER,z INTEGER,m INTEGER); CREATE TABLE observations(id INTEGER PRIMARY KEY,name TEXT,case_count INTEGER,geom BLOB);`);
  db.run('INSERT INTO gpkg_spatial_ref_sys VALUES (?,?,?,?,?,?)',['WGS84',srs,'EPSG',srs,'undefined','test fixture']);
  db.run('INSERT INTO gpkg_contents(table_name,data_type,identifier,last_change,srs_id) VALUES (?,?,?,?,?)',['observations','features','Synthetic points','2026-10-05T00:00:00Z',srs]);
  db.run('INSERT INTO gpkg_geometry_columns VALUES (?,?,?,?,?,?)',['observations','geom','POINT',srs,0,0]);
  // The UTM easting/northing of the same two locations, computed with proj4 outside this fixture.
  const rows=utm?[[1,'Package inside',388717.950,7268931.152,3],[2,'Package outside',392764.879,7268963.020,7]]
                :[[1,'Package inside',25.9,-24.69,3],[2,'Package outside',25.94,-24.69,7]];
  for(const [id,name,x,y,count] of rows){const bytes=new Uint8Array(29),v=new DataView(bytes.buffer);bytes.set([71,80,0,1]);v.setInt32(4,srs,true);bytes[8]=1;v.setUint32(9,1,true);v.setFloat64(13,x,true);v.setFloat64(21,y,true);db.run('INSERT INTO observations VALUES (?,?,?,?)',[id,name,count,bytes]);}
  const bytes=db.export();db.close();return {SQL,bytes};
}
