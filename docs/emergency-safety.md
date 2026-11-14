# MuscleMap emergency-support reference boundaries

**Research focus:** safe emergency-support references only. This report does not diagnose, prescribe, provide treatment dosing, or reproduce a flight procedure. It records what is publicly accessible and how a secondary local overlay can be bounded conservatively.

**Reviewed:** 2026-11-13

## Bottom line

Public NASA material supports a high-level picture of human-spaceflight medical support: programs plan in-mission medical capabilities, trained Crew Medical Officers (CMOs), private communication with ground medical support, medical evacuation, and documentation of encounters and procedures. NASA’s current public standard also says that medical aspects are managed by the Flight Medicine team and constrained by the particular mission. These are requirements and concepts, not a generic consumer-facing emergency protocol. [1] [2] [3]

In this review, I did **not** find a public, mission-approved, vehicle-specific emergency checklist that MuscleMap could safely reproduce as a general procedure. NASA’s public training material says crews train with Medical Emergency Procedures and access a larger body of onboard procedures through the Space Station computers, International Procedure Viewer, and just-in-time training. NASA also requires a program-specific Crew Health Operations Concept and medical technical requirements document. That evidence points to controlled, mission- and vehicle-specific material rather than a public universal checklist. [3] [5]

Therefore the product should use a **secondary local emergency-support overlay** only for conservative escalation notices, source links, and incident documentation. It must not present its rules as medical triage, clinical decision support, a NASA procedure, or an approved flight rule.

## What the public space-agency references establish

### NASA standards and public operations pages

NASA-STD-3001 Volume 1, Revision C states that terrestrial and in-mission medical aspects are to follow current U.S. and appropriate partner medical-care standards, with mission limitations, and are managed by the Flight Medicine team, including flight surgeons and in-mission providers such as CMOs. [1] This supports a reminder to contact the designated flight/ground medical authority; it does **not** authorize an app to make medical decisions.

The same standard requires medical training for crew, flight surgeons, mission-control support, and other ground support personnel. The training scope includes first aid, CPR, medical-kit utilization, space-medicine hazards, and emergency medical interventions. It separately describes detailed and specific CMO training for assigned missions. [1] A 2007 NASA technical paper describes the ISS “stabilize and transport” concept and CMO training, while noting that exploration missions have different return times and may need more autonomous care. This is useful context, not a current operational checklist. [4]

NASA’s health-and-medical-care requirements describe in-mission capabilities such as obtaining and recording encounter history, recording physical examinations, assessing and trending vital signs, performing and recording procedures, recording treatment-plan execution, private communication with ground medical support, autonomous medical care, advanced life support, and medical evacuation. The standard requires evacuation to a higher level of care when an illness or injury exceeds the capability at the crew’s location. [2] These requirements support an incident-documentation design and a “contact trained medical authority / arrange emergency care” reminder. They do not supply symptom thresholds for a consumer overlay and do not permit inventing treatment steps.

NASA’s medical-operations page says space-medicine operations include preparing for medical emergencies and providing longitudinal clinical care. Its public spaceflight-care description emphasizes that medical support is integrated with vehicle constraints, equipment, crew training, and ground support. [3] The public NASA medical-operations page also says the ISS medical kit is basic and that an autonomous medical decision-support project is being investigated. [6] That is a strong reason not to imply that a local app can substitute for trained personnel, mission hardware, or ground support.

NASA’s 2024 training presentation is the clearest public boundary around actual procedures. It describes medical-emergency simulations, emergency-hardware familiarization, medical-contingency drills, and crew access to “an abundance of information and procedures” onboard through SSC, IPV, and JITT. It also describes flight surgeons as on-call and vehicle-specific training and console support. [5] The presentation demonstrates that procedures exist in an operational training environment; it does not publish the procedure text or authorize copying it into a general app.

### Public emergency symptom/escalation references

For conservative public escalation wording, MedlinePlus’ adult emergency guidance is the most usable curated reference found. It says to call 911 or the local emergency number for signs such as choking, stopped breathing, serious head/neck/spine injury with loss of function or confusion, severe burns, severe chest pain or pressure, severe shortness of breath, prolonged or non-resolving seizure, sudden inability to speak/see/walk/move, and sudden one-sided weakness or drooping. It separately recommends emergency-department or emergency-number help for trouble breathing, fainting, sudden severe headache, persistent dizziness or weakness, smoke/poison-fume exposure, confusion, heavy bleeding, deep wounds, severe burns, blood in vomit or cough, severe pain, severe allergic reaction with breathing trouble or swelling, high fever with stiff neck, persistent vomiting/diarrhea, poisoning/overdose, and seizures. [7]

The American Heart Association gives a shorter independent cross-check: call 911 immediately for severe chest pain, difficulty breathing, choking, stroke symptoms, severe bleeding, unconsciousness, severe allergic reactions, or any situation in which life is in immediate danger. [8] NHS guidance likewise reserves the emergency number for life-threatening emergencies such as strokes and heart attacks, and instructs callers to provide the location and what happened. [9]

These references are public symptom/escalation guidance, not diagnostic criteria. MuscleMap should quote or paraphrase only the escalation direction and should link the source; it should not infer a disease, assign a severity diagnosis, or recommend medication.

## Recommended local overlay

Use a neutral name such as **Emergency Support** or **Safety Escalation**, not “triage,” “diagnosis,” “clinical assessment,” or “NASA medical procedure.” The overlay should be visibly secondary to the user’s established mission or local emergency plan.

### 1. Incident description to structured facts

Accept a free-text incident description, then extract only observable or user-stated facts:

- symptom words as written or conservatively normalized, without assigning a disease;
- body-region mentions such as chest, head, neck, face, arm, jaw, abdomen, back, leg, or eye;
- onset or time course if stated;
- consciousness/responsiveness, breathing difficulty, choking, bleeding, seizure, sudden weakness/speech/vision/movement change, confusion, exposure, and injury mechanism when stated;
- location of the person and location of the incident, if the user provides them;
- uncertainty and missing fields.

Region extraction is indexing and routing only. “Chest pain” must remain a reported symptom and region; it must not become “heart attack.” “Head injury” must not become “brain injury.” Do not infer a symptom or region from a body map, exercise context, prior condition, or model guess. If extraction is uncertain, preserve the raw text and mark the field unknown.

### 2. Conservative escalation rules

The overlay may show an immediate notice when the user reports any of the following: stopped breathing; choking; severe breathing difficulty; severe chest pain or pressure; unconsciousness or a person who cannot be awakened; severe bleeding; severe allergic-reaction signs with breathing trouble or swelling; sudden inability to speak, see, walk, or move; sudden one-sided weakness or drooping; a serious head, neck, or spine injury with confusion or loss of feeling/movement; or a seizure that is prolonged or not followed by rapid recovery. The notice should say:

> **Possible emergency. Call your local emergency number now and follow the instructions of emergency services or your designated medical authority. Do not rely on MuscleMap for diagnosis or treatment.**

The overlay may show an urgent emergency-care notice for reported trouble breathing, fainting, sudden severe headache, persistent dizziness or weakness, sudden confusion, smoke or poisonous-fume exposure, deep wound, serious burn, possible fracture or loss of movement, blood in vomit or cough, severe pain, high fever with stiff neck, persistent vomiting/diarrhea, poisoning or overdose, or seizure. Use local emergency-service terminology rather than hard-coding “911”; the cited public references use different national numbers. [7] [8] [9]

If the description is ambiguous, the person is deteriorating, or the user cannot rule out an emergency sign, default to the safer escalation notice. A rules match is not a medical conclusion. The UI should state that symptoms can have many causes and that the app cannot assess the person.

Do not include drug names, doses, medication selection, wound-treatment steps, airway maneuvers, resuscitation instructions, evacuation timing, or improvised spaceflight actions in this overlay. Any such instruction belongs to the applicable local emergency service, licensed clinician, or verified mission procedure under the responsible authority.

### 3. Established mission-procedure reminder

A procedure reminder is safe only when the deployment owner supplies a verified, versioned, mission- and vehicle-specific procedure and confirms that the user is trained and authorized to use it. Display the exact title, version/date, owning organization, source location, and a clear “follow only under the designated flight/ground medical authority” boundary.

When no verified procedure is configured, show:

> **No approved mission procedure is available in MuscleMap. Contact the designated flight surgeon/ground medical support or local emergency services. Do not improvise from public NASA material.**

Never convert NASA-STD-3001 requirements, a NASA technical paper, a public training slide, or a symptom reference into an “approved flight procedure.” Do not imply that the overlay is connected to NASA, ESA, a vehicle provider, a flight surgeon, or emergency dispatch unless that relationship is actually established and documented.

### 4. Incident documentation

The documentation feature should be an incident log, not a medical record and not a clinical assessment. With the user’s authorization, retain the original description, timestamp and timezone, incident location if provided, extracted symptom/region terms, uncertainty flags, escalation notice shown, source/reference version, user acknowledgement, contacts/actions the user records, and later updates. Preserve the original entry as immutable and append corrections or follow-ups rather than silently rewriting it.

Because these entries can contain sensitive health information, apply least-privilege access, encryption in transit and at rest, explicit retention/deletion rules, audit history, and a clear export/delete path. Collect no vital signs, identity, diagnosis, or treatment information unless a separately authorized and governed workflow requires it. NASA’s public standard supports the importance of recording histories, examinations, vital signs, procedures, and outcomes in actual mission medical operations, but that requirement should not be read as permission for MuscleMap to collect clinical data by default. [2]

## Safety acceptance criteria

A release is within these boundaries only if:

1. The screen is labeled Emergency Support/Safety Escalation and explicitly says it is not diagnosis, treatment, medical triage, or an approved flight procedure.
2. High-risk reported signs produce a local-emergency-number notice without waiting for a score, diagnosis, or body-region inference.
3. The app preserves the user’s wording and marks uncertain extraction rather than fabricating symptoms.
4. Public NASA references are presented as background/requirements, never as executable mission steps.
5. A mission-procedure reminder requires a configured, versioned, authorized source; otherwise the app says none is available.
6. No treatment dosing, medication advice, or invented evacuation/flight protocol is present.
7. Incident logging records the notice and provenance while minimizing sensitive data and protecting access.
8. Testing includes ambiguous text, multiple symptoms, negation such as “no chest pain,” missing location, non-English/local emergency-number contexts, and model/extractor failure. A failed extractor must not suppress the conservative emergency notice.

## Limitations

Public NASA standards and research papers describe capabilities, roles, requirements, and training concepts. They do not establish that a generic local overlay is approved for any mission, vehicle, crew, or medical authority. Mission procedures may be controlled, training-only, vehicle-specific, time-sensitive, or unavailable to the public; this review does not certify or validate them.

MedlinePlus, AHA, and NHS references are general public emergency guidance. They are not substitutes for local dispatch instructions, a licensed clinician, or a mission flight surgeon. Their examples are intentionally used as conservative escalation cues only. Local emergency numbers, access to care, language, communications delay, and spaceflight constraints vary.

No rule engine based on symptom text can safely rule out an emergency. A “no match” result must never be worded as “safe,” “minor,” “not urgent,” or “cleared.”

## References

[1]: https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf "NASA-STD-3001 Volume 1, Revision C"
[2]: https://www.nasa.gov/reference/3-0-health-and-medical-care/ "NASA-STD-3001 Section 3.0 Health and Medical Care"
[3]: https://www.nasa.gov/reference/6-0-medical-operations/ "NASA-STD-3001 Section 6.0 Medical Operations"
[4]: https://ntrs.nasa.gov/api/citations/20070032039/downloads/20070032039.pdf "Autonomous Medical Care for Exploration Class Space Missions"
[5]: https://ntrs.nasa.gov/api/citations/20240001015/downloads/Med%20Ops%20Crew%20Training%20%20Ground%20Support%20Training.pdf "Medical Operations: Training and Ground Team Responsibilities"
[6]: https://www.nasa.gov/reference/medical-operations-and-clinical-care/ "NASA Medical Operations and Clinical Care"
[7]: https://medlineplus.gov/ency/patientinstructions/000593.htm "When to use the emergency room - adult"
[8]: https://www.heart.org/en/health-topics/house-calls/when-to-call-911 "American Heart Association: When to call 911"
[9]: https://www.nhs.uk/nhs-services/urgent-and-emergency-care-services/when-to-call-999/ "NHS: When to call 999"
