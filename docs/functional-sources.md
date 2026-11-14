# Functional/exercise companion data sources

Research date: 2026-11-14. Scope is limited to the named functional/exercise companion records and the CFT70 symptoms/issues records. All files described as downloaded below were obtained with `requests` from NASA NLSP’s verified public API routes; no access-controlled endpoint was used.

## Verified access and downloaded records

NASA NLSP labels all six records below `Available online`. The public detail pages are linked in References; the API responses and full related-record responses are preserved under `data/companion/`.

- **MR079G Campaign 11** — dataset catalog `MR079G_Campaign_11`, dataset ID `0dfd2185-49cf-567d-b744-d7177301e7ff`, experiment `MR079G`, species Human. The catalog describes processed Campaign 11 tabular data for Physical Fitness Evaluation: Isokinetic Muscle Function (Flight Analog). Three CSVs downloaded, 441 data rows total. The files are `MR079G_Campaign_11_April_2013_Exercise_Summary_MULTI.csv`, `...Control_Summary_MULTI.csv`, and `...MULTI.csv`. The observed data keys are `ID`, `Subject` where present, `Group`, `Statistic`/`Parameter`, `Test_Phase`, `BR_Day`, and `Measured_Value`. [1] [2]

- **BEDREST_FTT / BEDREST_FTT_CFT70** — dataset catalog `BEDREST_FTT_CFT70`, dataset ID `933d244c-5967-54ee-90c6-ce560da2108d`, experiment `BEDREST_FTT`, species Human. The full record contains 100 CSV files and 16,006 data rows. Observation-style files expose `ID`, `Campaign`, `Subject`, `GroupName`, `Date`, `Test_Phase`, `BR_Day`, `Session`, and a measure-specific value; average files expose `ID`, `Campaign`, `GroupName`, `Test_Phase`, `BR_Day`, `AVG`, `STDev`, `Count`, and often `StdErrMean`. Some line-test/jump files have a multi-line preamble before the data header, so consumers must detect the row containing the actual column names instead of assuming row 1 is the header. [3] [4]

- **POWER_CYCLE_SUMMARY / BEDREST_IRATS_POWER_CYCLE_SUMMARY** — dataset catalog `BEDREST_IRATS_POWER_CYCLE_SUMMARY`, dataset ID `0e311656-88ad-5871-9749-2922e6e0ff7a`, experiment `BEDREST_iRATS`, mission `UTMB Campaign 11 iRATS14`, species Human. Thirty CSVs downloaded, 12,732 data rows total. Observation files expose `ID`, `Task`, `Subject`, `Group`, `Test_Phase`, `BR_Day`, `Date`, `Metric`, `Trial`, and `Value`; average/summary files use variants such as `Group`, `GroupName`, `Statistic`, `Task`, `Trial`, and `Value`. [5] [6]

- **CFT70 anatomical reference used for join checking: NNX10AP86G_CFT70** — dataset catalog `NNX10AP86G_CFT70`, dataset ID `472a20ae-ba61-5f8c-9162-d440cdafa65e`, experiment `NNX10AP86G`, mission `UTMB Campaign 11`, species Human. Nineteen CSVs downloaded, 6,338 data rows total. Its `NNX10AP86G_CFT70_iDXA_obsv.csv` file is the anatomical reference used here because its columns are explicitly body-region measures: lean body mass, tissue, fat, total mass, BMC, and BMD by arms, legs, trunk, android/gynoid, and related regions. The file uses `Subject`, `Treatment`, `Test_Phase`, and `BR Day`; it does **not** contain a `Date` column. [7] [8]

- **CFT70 symptoms** — dataset catalog `CRF_CFT70_SYMPTOMS`, dataset ID `add226ba-b7a9-553b-882f-ca09f02d7089`, experiment `CRF`, mission `UTMB Campaign 11`, species Human. Three CSVs downloaded, 132 rows total: one file each for subject 5160, 8072, and 8936. The observed columns are `Record`, `Subject`, `Date`, `Occur Time`, `Test_Phase`, `BR_Day`, `CRF Status`, `Symptom`, `Pain Score`, `Result of Test`, `Test`, `Comments`, `Action`, `Intervention`, `Outcome Date Time`, and `Outcome`. [9] [10]

- **CFT70 issues** — dataset catalog `CRF_CFT70_ISSUES`, dataset ID `ade9b622-b54b-56df-ba58-e5471ea436d9`, experiment `CRF`, species Human. Three CSVs downloaded, 50 rows total: one file each for subject 5160, 8072, and 8936. The record’s mission field is broader than the symptoms record and lists several campaigns, including UTMB Campaign 11; the dataset description still explicitly says the records are CRF Issues data for subjects in the CFT70 study. Observed columns are `Record`, `Subject`, `Date`, `Test_Phase`, `BR_Day`, `CRF_status`, `Issue Reported`, `Action Taken`, `Description of Action Taken`, `Reported By`, `Reported To`, `Deviation Type`, `Deviation Subtype`, `Classification`, `Characterization`, `Science Impact`, and `Disposition Comments`. [11] [12]

All downloaded file records had a matching catalog MD5 checksum. The exact filenames, local paths, source file-record UUIDs, API download URLs, row counts, headers, and checksums are in [the manifest](../data/companion/manifest.json). The raw dataset and full related-record JSON files are also retained in that directory.

## IDs and dates: verified join result

The downloadable anatomical iDXA file and the symptoms/issues files share real subject identifiers. The anatomical iDXA file has 24 subjects, including `5160`, `8072`, and `8936`. Symptoms and issues each contain those three subjects. This is a verified subject-ID overlap, not a guessed mapping.

A stronger key check was run across all three symptoms files and all three issues files using the bed-rest day. The symptoms rows produce 72 distinct `(Subject, BR_Day)` pairs; four intersect the anatomical iDXA pairs: `(5160, 29)`, `(8072, 28)`, `(8936, 29)`, and `(8936, 57)`. The issues rows produce 32 distinct pairs; three intersect: `(5160, 16)`, `(8072, 19)`, and `(8072, 43)`. These intersections show that `Subject` plus normalized bed-rest day can join at least some CFT70 CRF records to anatomical iDXA records.

A date join cannot be verified from the available anatomical iDXA file. Symptoms/issues have `Date`, but `NNX10AP86G_CFT70_iDXA_obsv.csv` has no date field. Therefore the safe implementation key is `Subject + BR_Day` plus an explicit `Test_Phase`/treatment check where applicable; do not claim that calendar dates join iDXA. The reproducible result is saved in [join_check_cft70.json](../data/companion/join_check_cft70.json).

The companion files themselves also show inconsistent identifier column names and semantics: MR079G and FTT use `ID` as a row/record key in addition to possible `Subject`; CRF uses `Record` and `Subject`; iDXA uses `ID` and `Subject`; and average tables omit `Subject` in many cases. Do not join on `ID` or `Record` across datasets without an independently verified crosswalk. `BR_Day` versus `BR Day` is a spelling variation that must be normalized only at the field-name level.

## Data dictionaries and gating status

No separate official NASA field-level codebook/data-dictionary download was exposed in the public NLSP full-record responses for these records. The full responses expose dataset metadata, related file records, and presentation templates, but no dictionary file or field-description endpoint for these CSVs. The CSV headers and values are publicly accessible, so [data_dictionaries_observed.json](../data/companion/data_dictionaries_observed.json) was generated as an **observed-header dictionary**. It records the exact field labels, files in which each label appears, and example values; it intentionally does not invent units, controlled vocabularies, or semantic definitions. Treat this as a machine-readable ingestion aid, not as an official NASA codebook.

Access is therefore **open for the downloaded CSVs and metadata**. No named dataset was gated in this run. This does not imply that an undiscovered unpublished codebook exists; it means no public codebook was returned by the verified NLSP record/API responses.

## References

[1]: https://nlsp.nasa.gov/search/data/details/0dfd2185-49cf-567d-b744-d7177301e7ff?dataType=DATASETS "NASA NLSP MR079G Campaign 11 dataset page"
[2]: https://nlsp.nasa.gov/api/v1/data/datasets/0dfd2185-49cf-567d-b744-d7177301e7ff/full "NASA NLSP MR079G full dataset record and related files"
[3]: https://nlsp.nasa.gov/search/data/details/933d244c-5967-54ee-90c6-ce560da2108d?dataType=DATASETS "NASA NLSP BEDREST_FTT CFT70 dataset page"
[4]: https://nlsp.nasa.gov/api/v1/data/datasets/933d244c-5967-54ee-90c6-ce560da2108d/full "NASA NLSP BEDREST_FTT full dataset record and related files"
[5]: https://nlsp.nasa.gov/search/data/details/0e311656-88ad-5871-9749-2922e6e0ff7a?dataType=DATASETS "NASA NLSP Power Cycle Summary dataset page"
[6]: https://nlsp.nasa.gov/api/v1/data/datasets/0e311656-88ad-5871-9749-2922e6e0ff7a/full "NASA NLSP Power Cycle Summary full dataset record and related files"
[7]: https://nlsp.nasa.gov/search/data/details/472a20ae-ba61-5f8c-9162-d440cdafa65e?dataType=DATASETS "NASA NLSP NNX10AP86G CFT70 dataset page"
[8]: https://nlsp.nasa.gov/api/v1/data/datasets/472a20ae-ba61-5f8c-9162-d440cdafa65e/full "NASA NLSP NNX10AP86G CFT70 full dataset record and related files"
[9]: https://nlsp.nasa.gov/search/data/details/add226ba-b7a9-553b-882f-ca09f02d7089?dataType=DATASETS "NASA NLSP CFT70 symptoms dataset page"
[10]: https://nlsp.nasa.gov/api/v1/data/datasets/add226ba-b7a9-553b-882f-ca09f02d7089/full "NASA NLSP CFT70 symptoms full dataset record and related files"
[11]: https://nlsp.nasa.gov/search/data/details/ade9b622-b54b-56df-ba58-e5471ea436d9?dataType=DATASETS "NASA NLSP CFT70 issues dataset page"
[12]: https://nlsp.nasa.gov/api/v1/data/datasets/ade9b622-b54b-56df-ba58-e5471ea436d9/full "NASA NLSP CFT70 issues full dataset record and related files"
[13]: https://github.com/nasa/OSDR_Tutorials/blob/main/source/pages/guides/biological_data_api.md "NASA OSDR Biological Data API tutorial"
[14]: https://ntrs.nasa.gov/citations/20140003299 "NASA NTRS Countermeasures and Functional Testing in Head-Down Tilt Bed Rest CFT70 overview"
