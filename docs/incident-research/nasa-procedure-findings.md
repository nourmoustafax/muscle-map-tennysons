# NASA medical-procedure availability findings

**Question:** Can the public NASA Space Apps 2026 health-monitoring resources or linked official NASA sources supply mission-applicable, approved medical-emergency treatment checklists for an astronaut “describe incident → step-by-step medical guide” app?

## Finding

**No applicable approved treatment checklist was established from these resources.** The initial text-only extraction showed only a third-party warning, but a subsequent stateful-browser check waited for dynamic loading and verified the actual 2026 Resources tab. It lists NASA's Five Hazards of Human Spaceflight, Risks of Human Spaceflight and Ongoing HRP Research in Space, plus two Canadian Space Agency science/radiation background resources. The three NASA links were opened: they provide hazard/risk and research context, not an executable medical emergency treatment checklist. [1] [12] [13] [14]


Official NASA pages do provide current, useful context about crew health, medical operations, program requirements, and research. They do **not** expose a general, mission-approved, step-by-step emergency-treatment checklist that an app may safely turn into patient-specific instructions. NASA’s own requirements say that in-mission capabilities, resources, training, procedures, medications, autonomous-care capability, and medical evacuation must be tailored to the particular program, vehicle, design reference mission, communications/return constraints, and crew needs. The relevant care is managed by the Flight Surgeon, Deputy Flight Surgeon, or designees—not by a generic public app. [5]

## What the official sources actually support

### Current agency standard: requirements, not a treatment checklist

**NASA-STD-3001, Volume 2, Revision F** is an official NASA Technical Standard approved **2026-07-14**, superseding Revision E. Its scope is human-spaceflight missions across design, development, test, operations, and maintenance. It establishes uniform technical requirements for crew health, training, medical operations, and human-rated systems. It is an approved requirements baseline, but it is not an operational medical treatment checklist and does not establish one universal sequence of actions for an undifferentiated incident. [4]

NASA’s public “Health and Medical Care” requirements page is more explicit about the implementation boundary. It requires programs to provide training and mission-specific capabilities/resources for diagnosis and treatment, including medical kits, history and examination recording, vital-sign monitoring, procedures and outcomes, treatment-plan recording, medication management, autonomous medical care/advanced life support, and medical evacuation. The same text says the exact capability varies with the vehicle and design reference mission and that in-mission care is managed through mission medical authority. [5]

### Current operational context: the MORD and program documents are the missing layer

**OCHMO-TB-044, “Medical Operations Spaceflight Considerations,” dated 2025-08-13**, says that the **Medical Operations Requirements Document (MORD)** establishes requirements for medical response capability, emergency medical services, training/certification, medical hardware, and related crew-health operations. It describes the kinds of documents used by historical and current programs and says it is **“for reference only”** and does not supersede or waive Agency, program, or contract requirements. This is useful for understanding the document hierarchy and safety boundary, but it is not a treatment protocol. [3]

NASA’s public in-flight-care page (page last updated **2026-07-17**) links technical briefs and research/reference material. It describes the problem—astronauts operate in an isolated environment without immediate terrestrial treatment—but does not publish a universal treatment checklist. [7] NASA’s pre-/post-flight page similarly points to standards, technical briefs, and reference material, not a public crew emergency procedure. [6]

### Medical selection standard: not emergency care

**OCHMO-STD-100.1A, Revision A, release date 2024-09-09**, is titled *NASA Space Flight Medical Selection, Recertification and Mission Evaluation Standards*. Its scope is medical screening, certification, recertification, and evaluation. It is not an in-flight emergency-treatment manual. [8]

## Candidate public handbooks and why they are not suitable

- **NASA-SP-2020-5006891, Chief Health and Medical Officer’s Spaceflight Mishap Investigation Flight Surgeon Handbook:** a quick-reference guide for mishap investigations. Its content covers investigation planning, teams, authorities, evidence, records, and flight-surgeon investigation support. It is not a crew-facing diagnostic or treatment checklist. [9]
- **“Emergency Procedures Handbook,” MAF Emergency Operations Center / Michoud Assembly Facility:** this is a facility emergency guide for MAF employees and visitors. It contains local 911/EMS contacts and workplace response directions. It is not spacecraft or astronaut medical guidance, and its instructions are subordinate to MAF emergency-management/Protective Services directions. [11]
- **“Autonomous Medical Care for Exploration Class Space Missions,” NTRS citation 20070032039:** **Version 6.0, 2007-02-21**. This is a research/design paper, not a current approved mission procedure. It discusses the ISS “stabilize and transport” concept, future exploration needs, crew medical officer training, treatment-guideline development, and medical informatics. Its age and research status make it unsuitable as a current operational authority; it is useful only as historical evidence that mission-specific treatment guidelines and informatics were recognized as development needs. [10]

## Safe content that can be implemented from these sources

A prototype can safely demonstrate a **non-prescriptive incident handoff and documentation workflow**:

1. Capture the crew member’s free-text incident description and structured context such as mission phase, vehicle/location, event time, and communications status.
2. Convert the description into a neutral summary and a clearly labeled list of observed facts to confirm. Do not infer a diagnosis or recommend a drug, dose, procedure, or treatment sequence.
3. Provide fields for authorized personnel to enter or confirm history, examination findings, vital signs, tests, procedures performed, treatment plan, and outcome. These are documentation capabilities reflected in NASA’s requirements, not permission to invent clinical content. [5]
4. Route the incident to the mission’s designated flight surgeon/medical authority or ground-support channel, with a visible escalation state and source/version metadata. A public demo can show a placeholder such as **“Mission-configured medical procedure required—follow current program MORD/flight rules and medical authority.”**
5. If procedure content is ever added, require a program-authorized source identifier, vehicle/mission applicability, approval owner, revision/effective date, and an explicit human-medical-authority review path. Do not populate it from NASA standards, technical briefs, research papers, or historical manuals alone.

This supports the “describe incident → prepare a safe handoff” part of the concept. It does **not** support a general “describe incident → autonomous step-by-step treatment” feature.

## Blockers to mission-applicable treatment guidance

The public sources do not provide the program-specific MORD/flight rules, onboard medical-kit inventory and configuration, crew training/certification context, vehicle constraints, communications/latency assumptions, medication authorization, or current approval/verification workflow needed to turn incident text into mission-valid treatment steps. NASA’s public requirements also recognize that medical evacuation and definitive care depend on the mission scenario and available resources. [5]

Accordingly, the app should not claim NASA approval, should not present NASA standards as treatment authorization, and should not provide patient-specific diagnosis, medication, dose, or emergency-treatment instructions. The defensible NASA-backed scope is structured observation capture, neutral summarization, source/version display, and escalation to the authorized mission medical system.

## Downloaded official reference

The concise official brief used for the document-hierarchy finding is saved locally as [OCHMO-TB-044 Medical Operations Spaceflight Considerations](./ochmo-tb-044-medical-operations.pdf). It is a 20-page public NASA PDF dated 2025-08-13 and is explicitly reference-only; it is not an approved treatment checklist. [3]

## References

[1]: https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/?tab=resources "NASA Space Apps 2026 Health Monitoring Software resources URL"
[2]: https://www.nasa.gov/reference/medical-operations-and-clinical-care/ "NASA Medical Operations and Clinical Care"
[3]: https://www.nasa.gov/wp-content/uploads/2025/08/ochmo-tb-044-medical-operations.pdf "NASA OCHMO-TB-044 Medical Operations Spaceflight Considerations"
[4]: https://standards.nasa.gov/system/files/tmp/NASA-STD-3001%20Vol%202%20Rev%20F.pdf "NASA-STD-3001 Volume 2 Revision F"
[5]: https://www.nasa.gov/reference/3-0-health-and-medical-care/ "NASA-STD-3001 Health and Medical Care requirements"
[6]: https://www.nasa.gov/ochmo/health-and-medical-systems/pre-postflight-medical-care/ "NASA Pre- and Post-Flight Medical Care"
[7]: https://www.nasa.gov/ochmo/health-and-medical-systems/in-flight-medical-care/ "NASA In-Flight Medical Care"
[8]: https://www.nasa.gov/wp-content/uploads/2023/04/ochmo-std-100.1a.pdf "NASA OCHMO-STD-100.1A Medical Selection, Recertification and Mission Evaluation Standards"
[9]: https://www.nasa.gov/wp-content/uploads/2023/03/spaceflight-mishap-handbook-tagged.pdf "NASA Chief Health and Medical Officer Spaceflight Mishap Investigation Flight Surgeon Handbook"
[10]: https://ntrs.nasa.gov/api/citations/20070032039/downloads/20070032039.pdf "NTRS Autonomous Medical Care for Exploration Class Space Missions"
[11]: https://www.nasa.gov/wp-content/uploads/2023/12/maf-ns-06-18-emergencyprocedureshandbook-online.pdf "NASA Michoud Assembly Facility Emergency Procedures Handbook"

[12]: https://www.nasa.gov/hrp/hazards/ "NASA Five Hazards of Human Spaceflight"
[13]: https://www.nasa.gov/hrp/risks/ "NASA Risks of Human Spaceflight"
[14]: https://www.nasa.gov/hrp/ongoing-hrp-research/ "NASA Ongoing HRP Research in Space"
