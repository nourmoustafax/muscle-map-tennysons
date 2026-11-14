# MuscleMap mission integration: actual ISS muscle data acquisition and operations

**Research date:** 2026-11-13
**Scope:** documented NASA/CSA Human Research Program and ISS operations only. This report does not assume a public NASA, ISS, HRP, or OnePortal API and does not treat public reference pages as participant-level data.

## What the ISS record supports

### Ultrasound acquisition is not the same as CSA extraction

ISS Ultrasound 2 is a modified GE Vivid-q system used for cardiac, muscle, vessel, and blood-flow work. Its certified capabilities include panoramic image construction for estimating muscle-volume change, speckle tracking, and dynamic morphology; available probes include phased, linear, and curved arrays. When deployed, Ultrasound 2 can connect to HRF-1 or HRF-2 for power and real-time scan-head-video downlink. The HRF portable computer is used to run experiment software, control equipment, collect and store data and notes, and provide uplink/downlink capability. [2]

The acquisition event is therefore an image-capture operation: the crew positions the subject and probe, applies the protocol’s anatomical reference marks or guides, configures the scanner, captures/stores images, and may receive live ground direction. A NASA daily operations report documents an actual Sprint session as the third of seven planned thigh/calf scans: one crewmember operated the ultrasound, another configured equipment and placed right-leg reference marks and thigh/calf guides, and the ground team provided remote guidance. [4]

The metric event is a separate analysis operation. NASA’s validation study acquired panoramic ultrasound images with a customized thigh/calf template, then had two sonographers analyze the images; MRI images were analyzed by three trained investigators. Ultrasound and MRI CSA values correlated, but their absolute values differed significantly for every muscle in that study. The reported ultrasound inter-experimenter coefficients of variation were 2.4–4.1%, and the ultrasound-to-MRI standard error of measurement was 0.91–2.09 cm². [1] The product must not label an acquired image as “measured CSA” until an explicit, protocol-linked analysis has produced the derived value.

NASA’s Ultrasound 2 remote-guidance procedure makes the separation operationally explicit. A trained sonographer in the HRP Telescience Support Center directs one or two crewmembers; the subject may self-scan, or another crewmember may operate the probe and keyboard. The ground team sees cabin video and the Ultrasound 2 screen, communicates over a voice loop, and directs probe tilt/slide/rotation, scanner controls, and data handling. Preflight practice is part of the procedure, and training the assigned subject and operator together is described as most effective. [3]

Tele-guided self-ultrasound is evidence for feasible acquisition, not evidence for automatic segmentation. NASA’s evidence report cites 74 Tele-SUS sessions in which astronaut panoramic scans taken seven days before landing did not differ significantly from postflight expert-sonographer scans, and changes in ultrasound muscle size did not differ significantly from MRI changes. This supports a longitudinal, protocol-controlled self-scan workflow; it does not establish a universal CSA algorithm, a clinical threshold, or interchangeability of every ultrasound protocol with MRI. [5]

CSA’s Vascular Echo record is a useful counterexample: an ISS ultrasound probe was strapped over a thigh artery while the astronaut performed 30 foot extensions, and the stated outputs were arterial blood-flow and velocity changes. Resting ultrasound, ultrasound during exertion, leg Doppler ultrasound, blood pressure, and blood samples were collected before, during, and after flight. That is an ultrasound acquisition with vascular-flow endpoints, not a muscle-CSA dataset. [10]

### Exercise context: ARED, CEVIS, T2, and OnePortal

NASA identifies the current ISS exercise suite as the Advanced Resistive Exercise Device (ARED), the second-generation treadmill T2/COLBERT, and the Cycle Ergometer with Vibration Isolation and Stabilization (CEVIS). NASA reports that crew members average about two hours of exercise per day. ARED was installed in 2008 and uses a piston/flywheel system intended to mimic weightlifting in weightlessness; the HRP evidence report distinguishes the earlier 300-lb iRED from ARED’s 600-lb load capability. CEVIS was installed in 2001, upgraded in 2023, and is computer-controlled to maintain workload while displaying cycling speed, heart rate, elapsed time, and prescription details. [6] [5]

These are exercise exposures and device telemetry, not direct anatomical measurements. MuscleMap should keep exercise sessions, ultrasound/MRI observations, and functional tests as separate streams linked by mission phase and time. NASA’s JSC exercise page describes OnePortal as a common GUI/application across exercise devices that collects, stores, and displays exercise data and prescriptions. NASA’s Information Integration Group separately describes “HRP Information Technology Architecture & One Portal” as a web portal for consolidation and integration of HRP research risks, gaps, and tasks. Neither page publishes a public participant-data endpoint, authentication contract, export schema, or API. [7] [8]

## Preflight, inflight, and postflight operations

NASA’s HRP Researchers Guide describes a Spaceflight Standard Measures project that collects a minimal, consistent set of core measurements before, during, and after ISS missions. Those measures are intended for reuse under data-sharing agreements, not as an anonymous public feed. ROI coordinates protocol definition, IRB approvals, crew training, flight procedures, and preflight baseline-data-collection sessions. [9]

Preflight availability is a hard constraint. Training and baseline collection must generally occur while crew are at JSC. From roughly L-60 to L-30, only simple tests are practical and require strong justification; from L-60 to L-15, schedules are usually too full for research testing; at the launch site around L-15, only passive monitoring or simple computer/pen-and-paper entries are feasible because investigator BDC facilities and freezers are unavailable. [9]

Inflight science is constrained during the first two weeks after docking, around vehicle dock/undock and EVAs, and on protected weekends. NASA specifically flags as difficult: complicated sessions before week two; more than five complicated sessions using multiple pieces of equipment; a single session requiring four or more hours in one day; daily or more-than-weekly activities; narrow timing windows; and extended continuous activities that interfere with other operations. [9]

Postflight priorities are rehabilitation and safe return to terrestrial function. Limited testing is possible during transport to JSC, with limited passive testing immediately after return; extensive or lengthy testing is not. NASA defines landing day as R+0 and the next day after crew wake as R+1. Total science BDC time during R+0 through R+7 is only 11.5 hours shared among multiple investigations. A cited NASA muscle evidence report describes isokinetic leg/ankle strength testing at preflight and approximately 5–7 days after landing, and MRI/ultrasound muscle-size work at study-specific windows. These are example study schedules, not a universal ISS cadence. [9] [5]

## Implementable MuscleMap architecture

1. **Separate acquisition from derived measurement.** Store an `UltrasoundAcquisition` record with subject pseudonym, mission/expedition, phase, date/time, body site and side, protocol/guide identifier, probe/device identifier when authorized, operator role, remote-guidance status, raw-image/video asset reference, scanner settings when available, quality notes, and transfer status. Store a separate `CSAObservation` or `MuscleVolumeObservation` only after analyst review or a validated, versioned analysis pipeline. Link it to one or more acquisition assets and record the template/landmark method, analyst or algorithm version, unit (cm² or volume unit), uncertainty/quality flag, and comparability group.

2. **Keep modality and endpoint explicit.** Do not merge panoramic muscle ultrasound, MRI muscle volume, vascular Doppler/flow, and functional performance into one “muscle score.” Preserve anatomical region, individual muscle, side, posture/position, phase label, and protocol. Because NASA found ultrasound and MRI absolute CSA differences despite correlation, show longitudinal same-protocol change separately from cross-modality comparison and avoid a universal modality-confidence number. [1]

3. **Model exercise as context, not proof of effect.** Use an `ExerciseSession` stream with device (`ARED`, `CEVIS`, `T2/COLBERT`), prescription/version, workload and duration where authorized, heart-rate/telemetry references, completion/exception state, and mission phase. Link observations by time window but do not infer that an exercise session caused a later CSA or function change. OnePortal data should enter only through an authorized export or adapter whose schema and access permissions are documented; no public API assumption is justified by the NASA pages. [7] [8]

4. **Use an offline-first transfer model.** The flight-side client should capture locally, encrypt at rest, append a manifest and checksum, and queue an immutable transfer package with `pending`, `transferred`, `acknowledged`, and `needs-review` states. A later authorized downlink/import should be idempotent and preserve the original file hash, source system, import time, and transformations. This is an implementation response to HRF-PC local collection/storage and NASA’s requirement that data be planned for downlink; it is not a claim that every ISS session is authorized to operate fully offline or without ground support. HRF systems can support ground/space control and real-time video/data paths, but the Ultrasound 2 remote-guidance procedure depends on live communications when remote guidance is used. [2] [3] [9]

5. **Treat privacy as an operational requirement.** Default astronaut identity to a pseudonymous subject key, separate access-controlled identity mapping from science records, and classify raw ultrasound, video, voice, notes, and derived measurements independently. Remote-guidance operations explicitly call for privatized voice and restricted video; NASA’s guide also describes IRB/HRMRB approvals, informed-consent briefings, secure-network Telescience Support Center operations, and controlled facilitation of data transfer to principal investigators. Do not expose raw images, cabin video, or crew notes in a public demo or browser endpoint. [3] [9]

6. **Make crew-time resilience visible.** A session template should state setup time, expected active scan/test time, number of crew, required equipment, live-ground dependency, acceptable timing window, and fallback. Support “image acquired / analysis pending” as a valid state; allow a missed scan or delayed downlink without fabricating a value. Prefer brief, repeatable sessions and preflight skills training, with flexible scheduling rather than daily or narrow-window defaults. NASA’s remote-guidance guidance says flight time is limited and recommends capturing a good image promptly without compromising quality. [3] [9]

7. **Use provenance-gated UI states.** A public or fixture-backed MuscleMap view may display NASA-described capabilities, protocol cards, or clearly labeled reference fixtures. It must not imply that NASA/CSA participant rows, OnePortal records, raw Ultrasound 2 files, or astronaut medical data are available unless an authorized source package is actually present. Every displayed derived value should expose source, access status, modality, protocol, phase, unit, analysis state, and missingness.

## Operational limits and non-claims

- An Ultrasound 2 image is not itself a CSA measurement. CSA requires a defined anatomical acquisition plus a separate analysis/segmentation step; retain both provenance layers. [1] [2] [3]
- Correlation between ultrasound and MRI does not make their absolute values interchangeable. Use same-protocol longitudinal comparisons and flag cross-modality comparisons. [1] [5]
- Tele-SUS and remote guidance demonstrate operational feasibility, not automatic analysis, clinical diagnosis, or a universal self-scan accuracy guarantee. [3] [5]
- Vascular Echo’s arterial-flow endpoints must not be relabeled as muscle CSA. [10]
- ARED/CEVIS/T2 records describe countermeasure exposure and device operation. They do not by themselves prove preserved muscle mass, strength, or performance for an individual. [6] [7]
- OnePortal is documented as an internal NASA HRP/exercise software and integration concept. No public API, participant-level endpoint, stable export schema, or permission to scrape/use crew data is established here. [7] [8]
- NASA’s standard-measures and data-sharing language does not authorize a public MuscleMap dataset. Use only released, authorized, de-identified files or local reference fixtures, with original source and access status preserved. [9]
- Crew time, training, equipment availability, communications, IRB/consent, and partner scheduling are part of feasibility. A design that requires long, daily, narrow-window, or live-remote sessions should be treated as non-nominal until ROI and flight operations approve it. [3] [9]

## References

[1]: https://ntrs.nasa.gov/citations/20100036574 "Reliability and Validity of Ultrasound Cross Sectional Area Measurements for Long-Duration Spaceflight"
[2]: https://www.nasa.gov/wp-content/uploads/2018/09/roi_iss_facilities_april2021.pdf "HRP Research Operations and Integration ISS Facilities Overview"
[3]: https://ntrs.nasa.gov/api/citations/20160011414/downloads/20160011414.pdf "Ultrasound 2 Remote Guidance Overview"
[4]: https://www.nasa.gov/blogs/stationreport/2014/01/07/iss-daily-summary-report-01-07-14/ "ISS Daily Summary Report – 01/07/14"
[5]: https://ntrs.nasa.gov/api/citations/20220019338/downloads/Evidence%20report%20aerobic%20and%20muscle_FINAL%209-21-22%20Pubpress%20accepted_v2.pdf "Evidence Report: Aerobic and Muscle"
[6]: https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/ "Astronaut Exercise"
[7]: https://www.nasa.gov/reference/jsc-exercise-countermeasures/ "JSC Exercise Countermeasures"
[8]: https://www.nasa.gov/intelligent-systems-division/collaborative-and-assistant-systems/information-integration-group/ "Information Integration Group"
[9]: https://www.nasa.gov/wp-content/uploads/2020/09/researchers_guide_human_research_tagged.pdf "A Researcher’s Guide to Human Research: International Space Station"
[10]: https://www.asc-csa.gc.ca/eng/multimedia/search/image/6378 "Astronaut Tim Peake participates in the Vascular Echo study"
