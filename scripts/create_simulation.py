#!/usr/bin/env python3
"""Create explicitly fictional demonstration records, never NASA research rows."""
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
START = datetime(2028, 3, 1, 9, tzinfo=timezone.utc)


def observation(stream, region, day, value, unit, measurement, modality,
                baseline=False, quality="valid"):
    identity = re.sub(r"[^A-Za-z0-9._:/-]", "-",
                      f"sim-{stream}-{region or measurement}-{day}")
    record = {
        "id": identity,
        "participant": "DEMO-01",
        "mode": "simulated",
        "stream": stream,
        "side": "right" if region else "bilateral",
        "day": day,
        "timepoint": f"MD{day}",
        "phase": "baseline" if baseline else "simulated mission",
        "acquiredAt": (START + timedelta(days=day)).isoformat().replace("+00:00", "Z"),
        "value": value,
        "unit": unit,
        "measurement": measurement,
        "modality": modality,
        "protocol": ("demo panoramic protocol A" if stream == "anatomy"
                     else "demo test / session protocol"),
        "site": region or "whole activity context",
        "quality": quality,
        "sourceId": "SIMULATED-MISSION-v2",
        "sourceRow": identity,
        "namespace": "fictional-mission-2028",
        "linkage": "verified",
        "baseline": baseline,
        "note": ("Fictional demonstration record. Not a NASA measurement, "
                 "prescribed treatment, or validated clinical case."),
    }
    if stream == "anatomy":
        record["region"] = region
    elif stream == "function":
        record["relatedRegion"] = region
    return record


rows = []
for region, values in [
    ("RIGHT_QUADRICEPS_GROUP", [54.0, 53.2, 51.9, None, 50.8]),
    ("RIGHT_MEDIAL_GASTROCNEMIUS", [18.0, 17.5, 17.1, 16.9, 17.2]),
]:
    for day, measured in zip([0, 14, 35, 52, 69], values):
        rows.append(observation("anatomy", region, day, measured, "cm²", "CSA",
                                "Panoramic ultrasound", day == 0,
                                "missing" if measured is None else "valid"))

for day, force in [(0, 420.0), (66, 402.0)]:
    rows.append(observation("function", "RIGHT_QUADRICEPS_GROUP", day,
                            force, "N", "Knee-extension force",
                            "Demo force test", day == 0))

# An explicitly fictional task association: plantar-flexion involves multiple
# muscles and does not directly measure medial-gastrocnemius size or strength.
for day, torque in [(0, 126.0), (67, 119.0)]:
    rows.append(observation("function", "RIGHT_MEDIAL_GASTROCNEMIUS", day,
                            torque, "Nm", "Ankle plantar-flexion torque",
                            "Demo plantar-flexion test", day == 0))

for day, duration in [(12, 29), (34, 31), (68, 30)]:
    rows.append(observation("activity", None, day, duration, "min",
                            "CEVIS session duration", "Simulated activity log"))

(ROOT / "public/data").mkdir(parents=True, exist_ok=True)
(ROOT / "public/data/simulated.json").write_text(json.dumps(rows, indent=2) + "\n")
print(f"Created {len(rows)} explicitly simulated rows for DEMO-01")
