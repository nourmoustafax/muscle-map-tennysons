# Official NASA Space Apps Challenge 2026 verification

**Verification date:** 2026-11-14
**Challenge ID:** `2026-health-monitoring-software`
**Current title:** *Create Health Monitoring Software for Astronauts on Space Missions*

## Availability and attribution

The two requested official 2026 URLs were checked directly. The details URL [1] and resources URL [2] both currently fail in the browser with `ERR_TIMED_OUT` (“www.spaceappschallenge.org took too long to respond”). The stateless page fetch does not expose challenge content; it returns only a 316-character “Third-Party Link” interstitial. A direct HTTPS request also times out during the TLS handshake. Therefore, the challenge is **not currently available for substantive page-level verification** in this environment.

This report preserves the current-versus-historical distinction: all challenge references here are to the 2026 URL/title only. No prior-year challenge page, rule set, or legacy dataset is substituted.

NASA’s current 2026 announcement confirms the event dates (Nov. 14–15, 2026), that challenges are created by NASA subject-matter experts, and that the event broadly uses NASA’s free and open data. It also describes challenge work involving physiological and behavioral health indicators for long-duration missions. That announcement is context, not a substitute for the inaccessible challenge-specific details or resources tab [3].

## Supported contribution for MuscleMap

A specific challenge-required contribution cannot be verified from the currently inaccessible details/resources pages. The only current 2026 challenge-specific support located outside those pages is in the NASA Space Apps repository discussions: a response says that a prototype demonstrating progress may use dummy data or a mock API, and another discussion records that challenge resources were stated to become available Friday, Nov. 13, with no project work before the hackathon [4] [5]. These are discussion responses, not the authoritative challenge-page specification; they should be treated as limited corroboration, not as permission to add a dataset or claim a required metric.

Accordingly, the supported contribution is limited to an educational/prototyping demonstration of personal-monitoring software behavior using existing MuscleMap functionality or clearly labeled mock/computed values. No new dataset, scan, exercise prescription, interval, or clinical claim is supported by the currently verifiable official material.

## Limitations and unresolved caveats

- No challenge-specific dataset, field list, schema, API, or required computed indicator could be read from the resources tab. Do not add or assume one.
- No official 2026 equipment requirement, sensor/device list, acquisition procedure, calibration rule, validation target, or cross-person/cross-device comparability requirement could be verified.
- No official 2026 instruction was accessible on approvals, human-subjects review, participant training, medical supervision, privacy, or redistribution/licensing of health data or derived outputs. These requirements must remain **unverified**, not inferred from older rules or general practice.
- The current resource timing and mock-data statements come from repository discussions [4] [5], not from a readable challenge page. They do not establish a dataset license, clinical validity, or permission to redistribute real personal-health data.

## References

[1]: https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/?tab=details "Official 2026 challenge details URL"
[2]: https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/?tab=resources "Official 2026 challenge resources URL"
[3]: https://science.nasa.gov/universe/nasa-welcomes-all-ages-experience-levels-for-space-apps-challenge/ "NASA 2026 Space Apps Challenge announcement"
[4]: https://github.com/nasa/spaceapps/discussions/1787 "NASA Space Apps repository discussion: Prototype or Real Product?"
[5]: https://github.com/nasa/spaceapps/discussions/1772 "NASA Space Apps repository discussion: Health Monitoring Software Resources availability"
