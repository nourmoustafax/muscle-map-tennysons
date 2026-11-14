# CFT70 MRI/Ultrasound file acquisition

## Result

The four supplied NLSP download URLs are live file endpoints, not campaign-only metadata. Each returned HTTP 200 with `Content-Type: text/csv; charset=utf-8`, an attachment filename, and a complete CSV original. The files are the four requested CFT70 measurements: ultrasound quadriceps, ultrasound medial gastrocnemius, MRI quadriceps, and MRI medial gastrocnemius. The originals are stored unchanged under `data/raw/`.

The exact dataset record is [NLSP dataset `e621a7dd-7b6b-5a0a-8d9a-0670df11731b`](https://nlsp.nasa.gov/api/v1/data/datasets/e621a7dd-7b6b-5a0a-8d9a-0670df11731b). It identifies catalog `BEDREST_IRATS_MRI_ULTRASOUND_CFT70`, title `BEDREST_IRATS_MRI_ULTRASOUND_CFT70`, description “This dataset contains tabular data from MRI & Ultrasound CFT70 Integrated Resistance and Aerobic Exercise Training With Small Compact Exercise Equipment,” processing level `Processed Data`, availability `Available online`, experiment `BEDREST_iRATS`, species `Human`, and location `JSC LSDA Data Repository` [1]. The record’s mission/campaign label is `UTMB Campaign 11 iRATS14`; this report is based on the four actual file downloads, not that label alone.

## Downloaded originals and hashes

The local files below are byte-for-byte downloads from the corresponding NLSP endpoints. NLSP’s file-record `__file_md5sum` matches the locally computed MD5 for every file. SHA-256 values are computed locally from the saved bytes.

- `data/raw/BEDREST_IRATS_MRI_ULTRASOUND_CFT70_Ultrasound_Quadriceps.csv` — 12,509 bytes; SHA-256 `29159ef412d35f371681b6ec0efefb872f84c2ece521003215ab8f9dd7ec6b8d`; NLSP file ID [`8e007f6e-2433-5ecd-b1b5-527876ee77e8`](https://nlsp.nasa.gov/api/v1/files/8e007f6e-2433-5ecd-b1b5-527876ee77e8/download); file metadata [2].
- `data/raw/BEDREST_IRATS_MRI_ULTRASOUND_CFT70_Ultrasound_Medial_Gastrocnemius.csv` — 12,254 bytes; SHA-256 `8361ed7278dfebf5696ae570ee711a09d1707f16cc5f284c342ab304c4a3a0be`; NLSP file ID [`1caa9f53-93d6-54fb-805a-3548624f8d2b`](https://nlsp.nasa.gov/api/v1/files/1caa9f53-93d6-54fb-805a-3548624f8d2b/download); file metadata [3].
- `data/raw/BEDREST_IRATS_MRI_ULTRASOUND_CFT70_MRI_Quadriceps.csv` — 12,520 bytes; SHA-256 `b82bc0bd38d53826e76edbf67e283a0d9b8b7a3262aa1fe69db53751855c1c69`; NLSP file ID [`d40188a7-ffc4-54b7-bbbe-49ecf6fb03e9`](https://nlsp.nasa.gov/api/v1/files/d40188a7-ffc4-54b7-bbbe-49ecf6fb03e9/download); file metadata [4].
- `data/raw/BEDREST_IRATS_MRI_ULTRASOUND_CFT70_MRI_Medial_Gastrocnemius.csv` — 12,266 bytes; SHA-256 `949ac4b6e381429e6b6d81f6c5048c2a9e677cee530017b43b7a5e445fe58169`; NLSP file ID [`7737cb2a-0da7-51af-84b2-7b43471dea2a`](https://nlsp.nasa.gov/api/v1/files/7737cb2a-0da7-51af-84b2-7b43471dea2a/download); file metadata [5].

The raw directory also contains `download_manifest.json` and `file_metadata_manifest.json`. They record response/file facts and hashes; they do not add or alter measurement rows.

## File contents and values

All four CSVs have 351 data rows and the six source columns `ID`, `Subject`, `Group`, `Test_Phase`, `BR_Day`, plus the measurement column. `ID` runs uniquely from 1 through 351 in each file. All four files contain the same 27 anonymized subject labels and the same group/phase/day design:

- Subjects: `5016`, `5188`, `5210`, `5297`, `5627`, `6213`, `6403`, `6546`, `6611`, `6791`, `6877`, `6947`, `7036`, `7152`, `7326`, `7350`, `7574`, `7707`, `7750`, `8010`, `8072`, `8713`, `8837`, `8936`, `9667`, `9682`, `9713`.
- Groups: `Control` 117 rows and `Exercise` 234 rows per file.
- Test phases: `PRE_TEST` 27 rows, `IN_TEST` 243 rows, and `POST_TEST` 81 rows per file.
- `BR_Day` values present: 3, 6, 7, 10, 11, 15, 22, 29, 36, 53, and 69.

The measurement columns and observed numeric ranges are:

- Ultrasound quadriceps: column `Quadriceps`; numeric range 38.06–90.10; 349 numeric values and 2 literal `NA` values.
- Ultrasound medial gastrocnemius: column `Medial Gastrocnemius`; numeric range 5.10–14.01; 349 numeric values and 2 literal `NA` values.
- MRI quadriceps: column `Quadriceps`; numeric range 44.54–106.62; 348 numeric values and 3 literal `NA` values.
- MRI medial gastrocnemius: column `Medial Gastrocnemius`; numeric range 3.78–14.35; 348 numeric values and 3 literal `NA` values.

The `NA` cells are retained in the originals. In all four files, two are for subject `7036`, `Exercise`, `POST_TEST`, `BR_Day` 6 and 10. The third, present only in the MRI files, is for subject `6947`, `Control`, `POST_TEST`, `BR_Day` 10. No other blank or nonnumeric measurement cells were found.

The files use a UTF-8 BOM and CRLF line endings. No rows were invented, imputed, merged, or re-keyed.

## Units and source labels

The raw CSV headers and the NLSP file records do not state measurement units. Acquisition alone therefore records the unit as unknown; it does not infer a unit from magnitude. The release subsequently checked the associated Scott et al. paper, *Panoramic ultrasound: a novel and valid tool for monitoring change in muscle mass*, which describes the same 27-participant, right-leg, 70-day study and expresses CSA differences in cm². The prepared adapter assigns cm² on that explicit published-study basis, not on a fabricated CSV codebook. The paper also supplies BR−6 / BR3–69 / BR+3,+6,+10 timing. PRE_TEST is mapped to negative BR_Day, IN_TEST to BR_Day, and POST_TEST to 70 + BR_Day. Original labels and positive raw BR_Day remain in each source note. No calendar dates are assigned. [7]

The source labels that are actually present are the original filenames and CSV fields: modality/muscle labels in each filename, `Subject`, `Group`, `Test_Phase`, and `BR_Day` in the rows, and the measurement headers `Quadriceps` or `Medial Gastrocnemius`. The dataset metadata additionally labels the collection as `Processed Data`, `Human`, `BEDREST_iRATS`, and `JSC LSDA Data Repository` [1].

## Redistribution terms and caveat

The CFT70 dataset record and all four file records expose online availability, provenance, owner/creator fields, filenames, sizes, and checksums, but no dataset-specific `license`, `rights`, `copyright`, or `use restriction` field [1–5]. The fact that a file downloads without authentication establishes access, not by itself a CFT70-specific license grant.

NASA’s published Earthdata data-use guidance says NASA ESDIS content is generally not copyrighted; unless content is marked with a use restriction or license, NASA-led mission data are described there as CC0; NASA asks users to acknowledge NASA and warns against implying NASA endorsement, falsely claiming copyright, or using copyrighted third-party material without permission [6]. That guidance is an agency policy page for NASA Earthdata/ESDIS and is not an explicit license statement attached to this NLSP CFT70 record. For this release, retain the NLSP URLs, dataset/file IDs, and hashes; credit NASA NLSP/JSC LSDA and the CFT70 dataset; do not claim a stronger CFT70-specific license than the sources show; and do not imply NASA endorsement. If redistribution as a separate product is legally material, obtain confirmation from NLSP/LSDA because the CFT70 file records themselves do not state terms.

## Acquisition artifacts

- Raw originals: `/home/ubuntu/musclemap/data/raw/*.csv`
- Download/hash manifest: `/home/ubuntu/musclemap/data/raw/download_manifest.json`
- NLSP file metadata/hash manifest: `/home/ubuntu/musclemap/data/raw/file_metadata_manifest.json`
- This report: `/home/ubuntu/musclemap/docs/cft70-acquisition.md`

## References

[1]: https://nlsp.nasa.gov/api/v1/data/datasets/e621a7dd-7b6b-5a0a-8d9a-0670df11731b "NLSP CFT70 dataset record"
[2]: https://nlsp.nasa.gov/api/v1/data/lsdapub_ls_dataset_file/8e007f6e-2433-5ecd-b1b5-527876ee77e8 "NLSP CFT70 ultrasound quadriceps file record"
[3]: https://nlsp.nasa.gov/api/v1/data/lsdapub_ls_dataset_file/1caa9f53-93d6-54fb-805a-3548624f8d2b "NLSP CFT70 ultrasound medial gastrocnemius file record"
[4]: https://nlsp.nasa.gov/api/v1/data/lsdapub_ls_dataset_file/d40188a7-ffc4-54b7-bbbe-49ecf6fb03e9 "NLSP CFT70 MRI quadriceps file record"
[5]: https://nlsp.nasa.gov/api/v1/data/lsdapub_ls_dataset_file/7737cb2a-0da7-51af-84b2-7b43471dea2a "NLSP CFT70 MRI medial gastrocnemius file record"
[6]: https://www.earthdata.nasa.gov/engage/open-data-services-software-policies/data-use-guidance "NASA Earthdata Data Use and Citation Guidance"
[7]: https://pmc.ncbi.nlm.nih.gov/articles/PMC5476852/ "Scott et al. Panoramic ultrasound study: anatomical CSA unit and study-phase timing"
