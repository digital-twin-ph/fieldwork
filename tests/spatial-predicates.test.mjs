import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pointRelation,GEOSPARQL_PREDICATE} from '../build/spatial-predicates.js';

const square={type:'Polygon',coordinates:[[[0,0],[0,2],[2,2],[2,0],[0,0]]]};

test('a point relation is one of three, and an absent geometry is none of them',()=>{
  assert.equal(pointRelation([1,1],square),'Inside');
  assert.equal(pointRelation([0,1],square),'Boundary');
  assert.equal(pointRelation([5,5],square),'Outside');
  // Not a relation but the value this project returns for a record with no geometry. Argued
  // separately to be a category error: a missing geometry is not a spatial relation.
  assert.equal(pointRelation(null,square),'MissingLocation');
});

/** The vocabulary mapping lives in one place.
 *
 *  SpatialRelation is this project's vocabulary and OGC Simple Features named those relations
 *  first, so one fact travels in two vocabularies and a dictionary sits between them. That
 *  dictionary was written twice — in spatial-coverage.ts and map-output.ts — which is the
 *  measurable cost of a parallel name. This test is what keeps it written once.
 *
 *  MissingLocation has no standard predicate and must not acquire one: DE-9IM has no term for an
 *  absent geometry, which is independent evidence that a missing geometry is not a relation.
 */
test('the GeoSPARQL predicate for each relation is declared once and excludes the absent case',()=>{
  assert.deepEqual(GEOSPARQL_PREDICATE,{Inside:'sfWithin',Boundary:'sfTouches',Outside:'sfDisjoint'});
  assert.ok(Object.isFrozen(GEOSPARQL_PREDICATE));
  assert.equal(GEOSPARQL_PREDICATE.MissingLocation,undefined,
    'DE-9IM has no predicate for an absent geometry, and inventing one would make missingness a relation');
  // Every relation pointRelation can return is either mapped or deliberately absent.
  for(const relation of ['Inside','Boundary','Outside'])
    assert.ok(GEOSPARQL_PREDICATE[relation],`${relation} must carry its standard name`);
});
