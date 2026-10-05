# Notation3 geospatial reasoning for public health

Research snapshot: 5 October 2026. This initial scoping review supports the repository's purpose: exploring Notation3 (N3) for geospatial reasoning in public health. It includes 15 selected research and technical sources, with older foundations retained where directly relevant.

The literature supports investigating N3 as a rule layer over spatially and temporally qualified evidence. This is a proposed research direction, not a validated architecture. The search found N3 work in public health, N3 representation in geospatial applications, and substantial geospatial health knowledge graph research. It did not establish an evaluated system combining all three. That is a search finding, not a claim that no such system exists.

## Scope and search method

Public web searches covered combinations of `Notation3`, `N3`, `EYE`, `geospatial`, `spatial reasoning`, `GeoSPARQL`, `public health`, `epidemiology`, and `knowledge graph`, followed by targeted searches for water-health, environmental contamination, conformance, and benchmarking work. Searches explicitly included 2025 and 2026, alongside undated searches for foundational work. Publisher pages, author manuscripts, proceedings, official specifications, and project documentation were preferred.

This is a curated scoping review, not a systematic review or exhaustive database search. Publication years come from source records rather than search-engine crawl dates. Preprints and published versions of the same work are not treated as independent evidence. No software benchmark, dataset ingestion, or endpoint execution was performed.

Sources below distinguish full-text inspection from abstract, metadata, or indexed publisher excerpts. Some publisher pages could not be opened directly; those limits are recorded. A downloadable N3 serialization alone does not demonstrate N3 rule execution.

## Findings across the research areas

| Area | What the reviewed sources establish | Implication for this repository |
| --- | --- | --- |
| N3 semantics and execution | Formal work on an existential subset, an evolving community specification, and several reasoning implementations. | Define and test the exact language subset used. |
| N3 and geography | Historical semantic annotation and constraint-clustering examples use N3, with significant implementation qualifications. | Reproduce a small example before claiming spatial reasoning capability. |
| Geospatial semantics | GeoSPARQL supplies a standard RDF vocabulary and spatial query functions. | Consider standard spatial facts as inputs to N3 rules. |
| Public and environmental health | WHOW, eKG, KnowWhereGraph, and SAWGraph provide relevant modeling and integration precedents. | Reuse suitable concepts and compare alternative domain models. |
| Evaluation | Recent work addresses spatial query benchmarking and N3 conformance separately. | Evaluate geometry, rule semantics, and public health interpretation separately and together. |

The implications in the final column are this review's proposals. The source annotations below provide the supporting evidence and its limits.

## N3 foundations and current implementations

### 1 Existential Notation3 Logic

Dörthe Arndt and Stephan Mennicke, 2025. *Theory and Practice of Logic Programming*, 25(3), 304–339. [DOI and publication](https://doi.org/10.1017/S1471068425000055). Full text inspected.

The authors identify an N3 subset that can be translated into existential rules and compare EYE and cwm with VLog and Nemo. Their experiments distinguish workloads with many facts from workloads with many dependent rules. The journal article extends the earlier 2023 conference work, including treatment of lists and built-ins.

**Relevance:** Formal foundation for selecting a tractable rule subset and designing workload-sensitive comparisons. **Limit:** Results do not establish performance for geometric operations, public health data, or unrestricted N3. Engine choice should remain an experiment.

### 2 Notation3 Language

W3C N3 Community Group, living specification, accessed 5 October 2026. [Language specification](https://w3c-cg.github.io/N3/spec/). Specification inspected.

N3 extends RDF with logical constructs and built-ins, including scoped negation as failure. The specification explicitly states that it is neither a W3C Standard nor on the W3C Standards Track.

**Relevance:** Reference for the syntax and semantics claimed by examples in this repository. **Proposed practice:** Record the specification revision, engine version, and built-ins used. **Limit:** Publication by a community group does not imply uniform implementation across engines.

### 3 Euler Yet another proof Engine

EYE project, living software documentation, accessed 5 October 2026. [Official repository](https://github.com/eyereasoner/eye). README inspected.

EYE implements N3 and documents forward and backward chaining. Its repository connects the implementation to examples, tests, and the research literature.

**Relevance:** A candidate engine for an initial runnable experiment. **Limit:** This review did not install or execute EYE, verify a particular release's conformance, or establish native GeoSPARQL function support. Treat spatial integration as work to investigate.

### 4 EYE JS

Jesse Wright, Jos De Roo, and Ieben Smessaert, 2024. *EYE JS: A client-side reasoning engine supporting Notation3, RDF Surfaces and RDF Lingua*. ISWC Posters, Demos, and Industry Tracks. [Proceedings paper](https://ceur-ws.org/Vol-3828/paper8.pdf). Full text inspected.

The paper presents an RDFJS-compatible TypeScript library for reasoning in browsers and Node.js, using WebAssembly technology.

**Relevance:** Establishes a research precedent for client-side N3 reasoning if local interactive exploration becomes a goal. **Limit:** It does not validate this repository's workloads, browser compatibility, memory use, or geospatial integration. Browser execution should remain optional until evaluated.

### 5 Building Thoroughly Tested Semantic Rule Engines in the Age of GenAI

Patrick Hochstenbach, Jos De Roo, Wout Slabbinck, Beatriz Esteves, and Pieter Colpaert, 2026. SAGE workshop associated with SEMANTiCS. The author's publication list labels the work a preprint. [Author page and paper link](https://pietercolpaert.be/papers/semantics2026-rule-engines/). Author abstract inspected; experiments not reproduced.

The authors report more than 1,000 N3 compliance tests, conformance gaps in tested engines, and full conformance by Eyeling against their suite.

**Relevance:** A current source for building a reproducible conformance baseline. **Limit:** These are author-reported results for a particular suite and implementation context. They do not establish universal correctness or legal compliance. Inspect the paper, test versions, and relevant cases before drawing comparative engine conclusions.

## Direct N3 precedents in geography and public health

### 6 Semantic annotation of existing geo datasets

A. Mobasheri, P. van Oosterom, S. Zlatanova, and M. Bakillah, 2013. *Semantic Annotation of Existing Geo-Datasets: A Case Study of Disaster Response in Netherlands*. ISPRS Archives XL-4/W1, 119–125. [DOI](https://doi.org/10.5194/isprsarchives-XL-4-W1-119-2013); [author-hosted full text](https://www.gdmc.nl/publications/2013/Semantic_annotation_existing_geo-datasets.pdf). Full text inspected.

The paper combines CityGML, RDF, and N3 in a semantic annotation approach for disaster-response information. It connects existing geographic datasets with application and domain concepts.

**Relevance:** A direct historical connection between N3 representation and geospatial emergency-response problems. **Important limit:** The authors state that the approach was performed manually and identify implementation and testing as a service as future work. It is not evidence of a deployed N3 spatial reasoner.

### 7 Geographic constraints for density based clustering

Qingyun Du, Zhi Dong, Chudong Huang, and Fu Ren, 2016. *Density-Based Clustering with Geographical Background Constraints Using a Semantic Expression Model*. ISPRS International Journal of Geo-Information, 5(5), 72. [Publisher article](https://www.mdpi.com/2220-9964/5/5/72); [DOI](https://doi.org/10.3390/ijgi5050072). Indexed publisher text and bibliographic record inspected; direct page retrieval failed.

The study expresses geographic background knowledge using N3 and incorporates constraints such as river obstacles and administrative membership into DBSCAN-related clustering. The publisher text identifies Jena rules as the mechanism generating clustering constraints.

**Relevance:** A concrete precedent for separating numerical spatial analysis from contextual rules. **Limit:** N3 representation and Jena rule execution must not be conflated with an end-to-end N3 reasoning implementation. The application does not establish epidemiological cluster validity.

### 8 N3 representation of risky behavior

Tolentino Herman and colleagues, 2007. *Representing risky behavior for sexually transmitted diseases on the Semantic Web by using Notation3*. AMIA Annual Symposium Proceedings, p. 1134. [PubMed record, PMID 18694231](https://pubmed.ncbi.nlm.nih.gov/18694231/). Bibliographic record inspected; no substantive abstract or full text reviewed.

The record establishes a public health publication explicitly using N3, with a CDC affiliation.

**Relevance:** Direct historical N3/public health precedent. **Limit:** Metadata does not establish spatial functionality, inference quality, study design, or operational use. Retrieve the original contribution before making stronger claims.

## Geospatial standards and environmental health knowledge graphs

### 9 GeoSPARQL 1.1

Open Geospatial Consortium. *OGC GeoSPARQL — A Geographic Query Language for RDF Data*, document 22-047r1. [Specification](https://docs.ogc.org/is/22-047r1/22-047r1.html); [version and development index](https://opengeospatial.github.io/ogc-geosparql/). Official documentation inspected.

GeoSPARQL defines geographic representation in RDF and spatial extensions to SPARQL. The official index identifies 1.1 as the current standard and separately identifies in-development material.

**Relevance:** A vocabulary and function reference for geometry, spatial relations, and interoperability. **Proposed use:** Compute or obtain spatial relations using a verified implementation, then expose them to N3 rules. **Limit:** Naming a predicate with a GeoSPARQL IRI does not make an N3 engine execute the corresponding spatial operation. Conformance and coordinate-reference-system behavior require explicit checks.

### 10 The Water Health Open Knowledge Graph

Anna Sofia Lippolis, Giorgia Lodi, and Andrea Giovanni Nuzzolese, 15 February 2025. *Scientific Data*, 12, 274. [Published article](https://www.nature.com/articles/s41597-025-04537-4). Full text inspected.

WHOW links water, pollution, weather, and health information through modular ontologies and distributed linked data. Its methodology uses competency questions, ontology patterns, mappings, and query-based tests.

**Relevance:** A particularly close domain precedent for water-quality and environmental-health experiments. **Proposed reuse:** Start from questions about observations, locations, time periods, and health indicators rather than designing a large ontology upfront. **Limit:** This is evidence of semantic integration and data publication, not N3 execution or proof that environmental conditions caused observed health outcomes.

### 11 The KnowWhereGraph Ontology

Cogan Shimizu and colleagues, 2024. [Author preprint, arXiv:2410.13948](https://arxiv.org/abs/2410.13948). Abstract and bibliographic record inspected; publication status beyond this preprint not verified.

The paper describes the ontology for a geospatial graph integrating natural hazards, climate, land characteristics, demographics, human health, and geographic identifiers.

**Relevance:** Modeling precedent for linking environmental context to populations and places. **Proposed comparison:** Examine its geographic organization alongside exact geometric relations for candidate filtering. **Limit:** It does not demonstrate an N3 public health reasoning workflow; performance and dataset currency were not assessed here.

### 12 ContaminOSO and SAWGraph

T. Hahmann, K. Schweikert, S. Stephen, and D. K. Kedrowski, 2025. *ContaminOSO: Ontological Foundations and Design Choices for an Ontology for Environmental Contamination Data*. FOIS 2025, pp. 284–298. [Publisher DOI](https://doi.org/10.3233/FAIA250501); [project publications](https://sawgraph.com/publications.html); [ontology documentation](https://sawgraph.com/ontologies.html). Publisher excerpts and project search records inspected; full paper not reviewed.

ContaminOSO models environmental contamination observations and samples and is used in SAWGraph's PFAS knowledge graph. The project connects contamination information with hydrologic, spatial, chemical, and facility concepts.

**Relevance:** A concrete environmental-health model for a possible contamination-screening example. **Limit:** This review does not establish N3 use, exposure estimation accuracy, or causal health inference. Full ontology and dataset inspection remains necessary before reuse.

## Epidemiological events and evaluation

### 13 An epidemiological knowledge graph from WHO Disease Outbreak News

Sergio Consoli and colleagues, 10 June 2025. *An epidemiological knowledge graph extracted from the World Health Organization's Disease Outbreak News*. Scientific Data, 12, 970. [Published article](https://www.nature.com/articles/s41597-025-05276-2). Full text inspected.

The study extracts epidemiological information from WHO reports using an ensemble of language models and publishes an RDF knowledge graph. It describes ontology and geographic grounding, data access, and limitations of the source reports.

**Relevance:** A possible source model for outbreak events, places, dates, and evidence provenance. **Limit:** Extracted statements need to remain distinguishable from verified source assertions. The paper notes that Disease Outbreak News is not an exhaustive record of outbreaks. Absence of a report should not become a negative disease claim.

### 14 Propagation phenomena in public health

Gabriel H. A. Medeiros, Lina F. Soualmia, and Cecilia Zanni-Merk, 2024. *Harnessing the Core Propagation Phenomenon Ontology to Develop a Knowledge Graph for Tracking Health-Related Phenomena*. [PubMed abstract](https://pubmed.ncbi.nlm.nih.gov/39176870/); [DOI](https://doi.org/10.3233/SHTI240811). Indexed abstract inspected; full paper not reviewed.

The authors propose a knowledge graph for tracking health-event propagation in space and time, specializing PropaPhen and suggesting UMLS and OpenStreetMap for instantiation.

**Relevance:** A conceptual reference for representing propagation as an event with spatial and temporal structure. **Limit:** The abstract describes a proposal; it does not establish validated transmission inference, N3 implementation, or successful outbreak prediction.

### 15 GeoSPARQL and SPARQL Benchmarking with GeoRDFBench Framework

Theofilos Ioannidis, Nikos Mamoulis, and Manolis Koubarakis, 3 September 2026. *Transactions on Graph Data and Knowledge*, 4(2), 8:1–8:50. [Published article and artifacts](https://drops.dagstuhl.de/entities/document/10.4230/TGDK.4.2.8). Publisher abstract, metadata, and artifact links inspected; experiments not reproduced.

GeoRDFBench formalizes benchmark components, supports expected result sets for accuracy checks, and separates workload specifications from execution. Its execution settings distinguish cache and repetition conditions.

**Relevance:** A current methodological reference for evaluating the spatial component of an N3 workflow. **Proposed adaptation:** Measure correctness before speed and report spatial computation separately from rule execution. **Limit:** A spatial-store benchmark is not an N3 or public health validation benchmark.

## Candidate research questions

The following questions are proposed by this review; they are not findings claimed by the cited papers.

1. Can N3 express useful public health screening rules over independently verified spatial and temporal relations, with each conclusion linked to its supporting facts and rules?
2. Which operations belong in geometry software, and which benefit from declarative rules? Compare precomputed relations with a narrowly defined function adapter.
3. Do a constrained N3 rule set and its outputs behave consistently across selected engines? Include blank nodes, built-ins, datatypes, and missing evidence in the comparison.
4. Can evidence completeness be represented explicitly so that missing observations do not silently produce negative public health conclusions?
5. How do results change with administrative boundary versions, coordinate systems, temporal resolution, and uncertain locations?
6. What does N3 add beyond a GeoSPARQL/SPARQL query baseline: clearer rules, reusable intermediate conclusions, or better explanations? Assess these benefits rather than assuming them.

## Proposed first experiment

A bounded water-quality screening example has a close research connection to WHOW and ContaminOSO. Use synthetic monitoring observations, synthetic service areas, and a versioned test threshold with no claim of regulatory validity.

The intended question is: **Which service areas have a qualifying observation during the selected period and should be flagged for further review?** A service-area relationship must be explicitly provided or modeled; geographic proximity alone is not evidence that a water source supplies a population.

| Component | Proposed responsibility | Evidence to collect |
| --- | --- | --- |
| Spatial computation | Determine the specified geometric relations using a documented coordinate system and boundary policy. | Hand-checkable fixtures, including boundaries and invalid geometry. |
| Observation model | Record sample, analyte, value, units, time, and source. | Explicit treatment of missing fields and incompatible units. |
| N3 rules | Combine accepted spatial results, modeled service relationships, time, and test conditions. | Expected positive, negative, and unknown cases; rule trace or derivation evidence. |
| Baseline | Express equivalent screening logic using SPARQL or a small reference implementation. | Agreement on the same fixtures. |
| Evaluation | Measure spatial preparation and rule execution separately. | Reproducible inputs, versions, outputs, timing, and memory observations. |

Call the output a screening flag. Whether it indicates exposure, disease risk, or a required intervention is a separate domain-validation question. This review does not select an engine, implement the experiment, or establish those public health interpretations.

## Reading order and remaining evidence gaps

Begin with **Existential Notation3 Logic**, the **N3 specification**, **GeoSPARQL 1.1**, and **WHOW**. Then read the **2016 clustering paper** to study the numerical/rule boundary, followed by the **2026 conformance work** and **GeoRDFBench** to plan evaluation.

Before making an implementation decision, retrieve and inspect the remaining full papers, especially the N3 public health contribution, clustering implementation details, ContaminOSO, and the 2026 conformance test suite. Follow their references and citations for additional direct N3/geospatial applications. A focused systematic search in bibliographic databases would be needed to support a novelty claim.

Remaining technical gaps include an experimentally verified N3–spatial function interface, a rule profile with explicit termination assumptions, provenance across external computations, and evaluation of uncertainty and incomplete evidence. These are candidate contributions for this repository, not already demonstrated capabilities.
