# MERS-CoV, South Korea, 2015: the data, their documentation, and other open sources

_Created 2026-11-12 · Updated 2026-11-12_

Asked by the practitioner, 2026-11-12: *"dig deeper into the MERS documentation to find out if there are other data sets and
if there is metadata available"*. Researched the same day from open pages only; no data file was downloaded or opened.
The hospitals were placed separately: `data/mers_korea_2015_facilities.csv` in example-2015-mers-korea (9e8432c).
Used by TODO item 8, which is in progress.


Method: the researcher read help pages, repository files through the GitHub API, the CRAN DESCRIPTION, full-text XML from Europe PMC, figshare API metadata and HTTP HEAD responses. No data file was downloaded or opened.

### 1. The package's own documentation

**Where it is**
- Roxygen source: https://github.com/reconverse/outbreaks/blob/master/R/mers_korea_2015.R
- Rendered on rdrr.io: https://rdrr.io/cran/outbreaks/man/mers_korea_2015.html
- CRAN reference manual: https://cran.r-project.org/web/packages/outbreaks/refman/outbreaks.html

**What it says the data is**
- The data are "initial information collected by the Epidemic Intelligence group at [ECDC]" during "the first weeks of the outbreak". They were "used to follow the daily evolution of this outbreak using public information available".
- Caveat in the help page: "meant for teaching purposes"; it "represents neither the final outbreak investigation results nor a consolidated and complete description of the transmission chain."

**Authors and reference**
- Collected by ECDC's Epidemic Intelligence and Response section. Two named ECDC staff are the contacts; one of them did the "Transfer to R and documentation". I left their names and emails out.
- The only reference is Penttinen et al., Euro Surveill 2013;18(39):20596 (PMID 24094061), "Taking stock of the first 133 MERS coronavirus cases globally". It predates the Korean outbreak, so it is background, not the source of these data.
- The help page cites no WHO Disease Outbreak News, no Ministry of Health and Welfare or KCDC source, and no Cauchemez, Nouvellet or Cori paper.
- The Cauchemez, Nouvellet, Cori et al. paper (PNAS 2016, "Unraveling the drivers of MERS-CoV transmission") covers 681 cases in Saudi Arabia, not Korea: https://research-information.bris.ac.uk/en/publications/unraveling-the-drivers-of-mers-cov-transmission/. Nouvellet is a package author, not a data source.

**Date compiled: not stated.** The repository history gives only these dates:
- Added in outbreaks 1.1.0, dated 2016-11-24 (NEWS: https://github.com/reconverse/outbreaks/blob/master/NEWS.md). The first commit, "added mers.korea.2015", was on 2016-11-22.
- Renamed to snake_case on 2016-12-14.
- Pull request #16, merged 2017-04-06 (https://github.com/reconverse/outbreaks/pull/16). It says "entire column of mers_korea_2015$linelist$week_report is in 2014" and that `dt_death[47]` was in 2014. Both were changed to 2015.

**Column definitions, verbatim from the help page**

`linelist`:

| Column | Definition |
|---|---|
| id | "Unique identifier" |
| age | "Age" |
| age_class | "Age using 10-year groups" |
| sex | "Sex" |
| place_infect | "Probable region of infection" |
| reporting_ctry | "Country reporting the case" |
| loc_hosp | "Local hospital name where the case was hospitalized" |
| dt_onset | "Date of onset of symptoms" |
| dt_report | "Date of reporting" |
| week_report | "Week number of date of reporting" |
| dt_start_exp | "Date of first probable exposure to another MERS Co-V case" |
| dt_end_exp | "Date of last probable exposure to another MERS Co-V case" |
| dt_diag | "Date of MERS Co-V diagnosis" |
| outcome | "Outcome (alive or dead)" |
| dt_death | "Date of death" |

`contacts`:

| Column | Definition |
|---|---|
| from | "Unique identifier of the probably source patient" (sic) |
| to | "Unique identifier of the secondary case" |
| exposure | "Probable place of exposure" |
| diff_dt_onset | "Time in days between two successive cases" |

**`dt_report` and `dt_diag`.** The help page gives nothing beyond the two phrases above. It does not say who reported, to whom (ECDC, WHO, or the Korean ministry), or whether "diagnosis" means the date of the laboratory result or the date it was announced. Nothing in the package explains the 7 cases whose report date is one day before their diagnosis date.

**What `from`/`to` represent.** The help page calls each link a "probable" source, built by ECDC from public information during the outbreak. The links are neither confirmed investigation results nor a model's output, and the help page disclaims completeness. Nothing says how a link was assigned.

**Build script: there is none.**
- The repository has no `data-raw/` or `inst/` folder. Its `raw/` folder holds only dengue, ebola, norovirus and zika files: https://github.com/reconverse/outbreaks/tree/master/raw
- The data ships only as the binary file `data/mers_korea_2015.RData`.

**Package licence (the two copies disagree)**
- CRAN 1.9.0 (2020-09-28): `GPL (>= 2)`, with URL reconhub/outbreaks: https://cran.r-project.org/web/packages/outbreaks/DESCRIPTION
- GitHub master (1.9.0.9000): `MIT + file LICENSE`. The LICENSE file was added on 2022-12-08: https://github.com/reconverse/outbreaks/blob/master/DESCRIPTION
- No licence or terms are stated for the MERS data itself.

### 2. Upstream sources

- **The ECDC epidemic-intelligence compilation from public reports.** No ECDC dataset, DOI or publication of it was found. The underlying public sources were most likely:
  - WHO Disease Outbreak News, which gave per-case age, sex, onset, admission, lab-confirmation date and condition. Example (4 June 2015): https://www.who.int/emergencies/disease-outbreak-news/item/04-june-2015-mers-korea-en
  - Korean Ministry of Health and Welfare (MOHW) and KCDC press releases.
  
  This is inferred from the help page's "public information available"; it is not stated.
- **Totals**: 186 cases (185 in Korea, 1 in China) and 38 deaths, according to WHO's Western Pacific office: https://www.who.int/westernpacific/emergencies/2015-mers-outbreak
- **Access**: everything above is free to read. WHO pages carry WHO's standard terms; no data licence was found.

### 3. Other datasets for the same outbreak

| Name | What it holds | Size | Licence | URL | Open access? |
|---|---|---|---|---|---|
| KCDC corrigendum supplement `mmc1.xlsx` (OPHRP 2016;7(2):138) | "the data used for the journal", i.e. the KCDC 186-case paper. Contents not inspected; probably the official line list. Users must cite the source. | 49,350 bytes (HEAD request) | CC BY-NC-ND 4.0 (article page) | https://ophrp.org/journal/view.php?number=533 ; file: https://ophrp.org/upload/article/PHRP4850385/mmc1.xlsx ; DOI 10.1016/j.phrp.2016.03.002 | Yes |
| KCDC, "MERS-CoV Outbreak in the Republic of Korea, 2015" (OPHRP 6(4):269) | Official description of 186 cases from interviews, CCTV, GPS and card records. Table 2 gives each of 5 superspreaders' "exposed duration" (symptom onset to "proper isolation"). Describes 14-day home quarantine. | Article | CC BY-NC-ND | https://pmc.ncbi.nlm.nih.gov/articles/PMC4588443 ; DOI 10.1016/j.phrp.2015.08.006 | Yes |
| Korea Disease Control and Prevention Agency (KDCA) on data.go.kr: "메르스 확진자 연령 지역 성별 신고주차 자료" | 185 cases (excludes the China case), May–July 2015. Columns: order, region, sex, age, report week (from hospital notification forms). Published 2025-12-02. | CSV; size not checked | "이용허락범위 제한 없음" (no restriction on use) | https://www.data.go.kr/data/15155636/fileData.do ; metadata: https://www.data.go.kr/catalog/15155636/fileData.json | Yes |
| WHO MERS case list, Republic of Korea (`MERS-CoV-cases-rok-*.xlsx`) | Case no., date notified to WHO, age, sex, health-care worker, comorbidities, onset, first hospitalisation, lab confirmation, status, outcome date | ~17.5 KB (10 Jul version, Wayback index) | WHO terms; none stated | The 21 Jul 2015 file is 404 at who.int. The 10 Jul 2015 version is in the Wayback index (http://www.who.int/csr/disease/coronavirus_infections/MERS-CoV-cases-rok-10Jul15.xlsx). Used in https://staff.math.su.se/hoehle/blog/2016/07/19/nowCast.html | Archived only |
| Chowell group (PeerJ 2015), Table S1 "South Korea MERS data" | Case data taken from the WHO website | Not checked | CC BY | https://doi.org/10.7717/peerj.1505 (supp-1); https://pmc.ncbi.nlm.nih.gov/articles/PMC4690341 | Yes |
| Cowling et al., Euro Surveill 2015;20(25):21163, appendix zip | Line list of 166 cases to 19 June, plus transmission chains, compiled from KCDC, MOHW, WHO and news | Archive record ~225 KB | Article CC BY; appendix licence not stated | Article: https://doi.org/10.2807/1560-7917.ES2015.20.25.21163 ; appendix (now 404, archived 2016-06-29): http://sph.hku.hk/bcowling/eurosurveillance2015appendix.zip | Archived only |
| figshare: "Supplementary data of individual patients during 2015 MERS outbreak in Korea" | Taken from the Pyeongtaek St. Mary's Hospital paper (Epidemiol Health 2015) | 12,284 bytes | CC BY 4.0 | https://doi.org/10.6084/m9.figshare.25981987.v1 | Yes |
| Pyeongtaek St. Mary's Hospital paper (Epidemiol Health 2015;37:e2015041) | First hospital cluster. Ward 7 exposure "May 20 ... to May 29, when the hospital was closed". Supplementary PDF. | PDF | CC BY | https://pmc.ncbi.nlm.nih.gov/articles/PMC4652064 | Yes |
| figshare: MATLAB code for intra- and inter-hospital model (PLoS One 2025) | Code plus small `.mat` inputs (e.g. `data_gangnam.mat`, 318 B) | ~60 KB | CC BY 4.0 | https://doi.org/10.6084/m9.figshare.26317555.v3 | Yes |
| Noh et al., IJERPH 2020 (hospital-list disclosure) | Daily confirmed cases and daily quarantined people, 20 May–5 Jul 2015, from mers.go.kr; uses the hospital-list disclosure date | Article; no data file | CC BY | https://pmc.ncbi.nlm.nih.gov/articles/PMC6981968 | Yes |
| Park et al., Infect Chemother 2016 (epidemiologic parameters) | Generations for 186 cases. Control timeline: contact definition broadened 29 May; testing expanded 3 June; facilities named 7 June; Rapid Response Team 8 June. | Article plus PDF supplement | CC BY-NC | https://pmc.ncbi.nlm.nih.gov/articles/PMC4945720 | Yes |
| Spreader paper, J Korean Med Sci 2017 | Spreader comparison; stricter measures from 7 June; PDF supplementary tables | PDF | CC BY-NC | https://pmc.ncbi.nlm.nih.gov/articles/PMC5383605 | Yes |
| Sci Rep 2020, contact networks | 186 people across 43 hospitals, from KCDC press releases; supplement is a PDF only | PDF | CC BY | https://pmc.ncbi.nlm.nih.gov/articles/PMC7062829 | Yes |
| Front Public Health 2024, contact networks | Data from KDCA "not publicly available"; access by request | n/a | n/a | https://pmc.ncbi.nlm.nih.gov/articles/PMC11140122 | No (restricted) |
| JAMIA Open 2021, data-assembly algorithm | Patient-level fields pulled automatically from WHO Disease Outbreak News, 30 May–9 Jun 2015 (5 fields, 315 cells) | PDF supplement | n/a | https://pmc.ncbi.nlm.nih.gov/articles/PMC8327373 | Yes |

**How these differ from the `outbreaks` tables.** The package has 162 cases from an early snapshot of public reports and 98 probable links. The KCDC `mmc1.xlsx` and the data.go.kr CSV are official and cover all 186 (or 185) cases. The WHO and Cowling lists are snapshots from other dates.

**Candidate response dates for a 7-1-7 "early response complete" date** (all from open sources):
- 20 May 2015: first case confirmed; Korea notified WHO the same day (WHO Western Pacific page above).
- 29 May 2015: close-contact definition broadened and all contacts quarantined (Infect Chemother 2016). The first hospital, Pyeongtaek St. Mary's, closed (PMC4652064).
- 7 June 2015: names of 24 affected hospitals disclosed (PMC4945720, PMC6981968; https://www.info.gov.hk/gia/general/201506/07/P201506070889_print.htm).
- 8 June 2015: Rapid Response Team set up (PMC4945720).
- 9–13 June 2015: joint mission by the Korean health ministry and WHO (https://www.who.int/news/item/15-06-2015-mers-cov-joint-mission-findings-discussion).
- 28 July 2015: "de facto" end. 23 December 2015: formal end (https://www.koreatimes.co.kr/southkorea/20151223/korea-declares-end-to-mers-outbreak-after-218-days; news source).
- MOHW 2015 MERS white paper (470 pp., Korean): said to be posted on mohw.go.kr; I did not find its PDF.

### 4. Metadata found

- **Package**: the roxygen column list above is the only data dictionary. Provenance is limited to NEWS.md, the commit history and PR #16. No DOI.
- **data.go.kr**: schema.org/DCAT JSON-LD with field descriptions (e.g. "신고 주차: 병의원 신고 기준", i.e. report week by hospital notification), a legal basis, creator KDCA and date created 2025-12-02.
- **figshare**: DOIs 10.6084/m9.figshare.25981987.v1 and 10.6084/m9.figshare.26317555.v3.
- **Article DOIs**: KCDC data 10.1016/j.phrp.2016.03.002; PeerJ 10.7717/peerj.1505.
- **Definitions**: case, onset, close contact and superspreader are defined in KCDC, OPHRP 2015, section 2.1 (PMC4588443).
- No codebook was found for `mmc1.xlsx`, the WHO xlsx or the Cowling appendix.

### 5. What remains unknown

- The exact meaning of `dt_report` versus `dt_diag`, and why 7 cases are reported a day before diagnosis. Possibly "report" means a WHO or ministry announcement and "diagnosis" a lab date taken from another source, but nothing says so.
- How the ECDC probable links (`from`/`to`, `exposure`) were assigned, and the date the snapshot was cut.
- Why the package has 162 cases, not 186. It probably stops in early-to-mid June, but this is not stated.
- Whether a data licence exists for the package tables.
- Columns and licence of the KCDC `mmc1.xlsx` (not opened) and the size of PeerJ Table S1.
- An official MOHW English press release for the 7 June disclosure (only secondary copies found), and a direct PDF of the white paper.
- The Wayback Machine was temporarily offline, so I could not confirm that the archived WHO 21 Jul 2015 xlsx and the archived DON exist.

## What was acted on, and what was not

| Possible next step, as offered 2026-11-12 | State |
| --- | --- |
| 1. A facilities table in the MERS repository | Done: 9e8432c; the hospitals mapped, 2026-11-12 |
| 2. The KDCA 185-case CSV, the most openly licensed data here | Done 2026-11-13 (example 4c7bf0c): 3,442 bytes, CP949, 185 rows; download approved by the practitioner |
| 3. An outbreak-level 7-1-7 review from the response dates above | Done 2026-11-13: three candidate dates, each a row; not met whichever counts |
| 4. README corrections: ECDC as the compiler, the column definitions, the gaps above | Done 2026-11-13: what the line list does not say |
