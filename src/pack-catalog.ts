/** Build-time identity of the curated widget-pack catalog this bundle was built from.
 *
 *  The application loads no pack: `runtimeFetching: "none"` is an admission rule, and every
 *  widget it executes is compiled in. That is exactly why a run should say so positively
 *  rather than be silent about it — an absence cannot be checked, and a reader of a receipt
 *  would otherwise have to assume. See docs/experiments/49-catalog-in-the-interface.md.
 *
 *  The identity is generated into `widgets/pack-catalog.json` by the build rather than defined
 *  at bundle time, because a define does not reach the separate compilation in
 *  `validate:widgets`, and a default value would let a receipt name a catalog nobody built.
 *  The digest is of `widgets/packs.json` as built, so a receipt can be compared against the
 *  catalog in the repository. It records which catalog this build knew about; it is not a
 *  claim that any pack was reviewed, admitted, available or used. */
import identity from '../widgets/pack-catalog.json';
export const PACK_CATALOG={version:identity.catalogVersion,digest:identity.catalogDigest};

/** Where a node's widget definition came from. A closed set: a pack-supplied definition would
 *  have to say so, and the runtime shape rejects anything else, so this cannot quietly drift. */
export type WidgetDefinitionSource = 'host-registry' | 'pack';
export const HOST_REGISTRY:WidgetDefinitionSource='host-registry';

/** One recorded-metadata assertion per run, in the receipt section that is explicitly not a
 *  rule premise. */
export function packCatalogN3(runId:string):string{
  const iri=`<urn:fieldwork:run:${runId}:pack-catalog>`;
  return `${iri} a fw:PackCatalog; fw:packCatalogVersion ${JSON.stringify(PACK_CATALOG.version)}; `
    +`fw:packCatalogDigest ${JSON.stringify(PACK_CATALOG.digest)}.\n`;
}
