#!/usr/bin/env python3
"""Prepare MuscleMap's reduced BodyParts3D muscular atlas.

The script reads only the official Release 4.0 reduced OBJ ZIP and its English
parts list. It emits a self-contained GLB with the source mm coordinates baked
into Three.js coordinates (x=x, y=z, z=-y, scale 0.001), plus a provenance
manifest. No procedural geometry is created.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

ARCHIVE_NAME = "isa_BP3D_4.0_obj_99.zip"
ARCHIVE_SHA256 = "40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e"
ATTRIBUTION = "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International"
HISTORICAL_NOTICE = "BodyParts3D, (c) The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan"
LICENSE_NOTE = "Historical Release 4.0 header retains CC Attribution-Share Alike 2.1 Japan; the current official license page states CC BY 4.0. Derived assets conservatively preserve both notices."

# Five source meshes are the only meshes that map to the app's two selectable regions.
# Context is deliberately muscular (not an opaque skin shell), and spans head/neck,
# trunk, upper limbs, pelvis, thighs, and lower legs. Representation IDs are the
# identifiers in isa_parts_list_e.txt; the script resolves their FJ file IDs from OBJ
# headers, preventing a hand-copied file-name mapping from becoming stale.
SELECTIONS: list[tuple[str, str, str, str]] = [
    ("FJ1433", "FMA38928", "BP5598", "RIGHT_QUADRICEPS_GROUP"),
    ("FJ1443", "FMA38932", "BP5600", "RIGHT_QUADRICEPS_GROUP"),
    ("FJ1441", "FMA38934", "BP5604", "RIGHT_QUADRICEPS_GROUP"),
    ("FJ1442", "FMA38930", "BP5602", "RIGHT_QUADRICEPS_GROUP"),
    ("FJ1397", "FMA45957", "BP5539", "RIGHT_MEDIAL_GASTROCNEMIUS"),
    # Head / neck context.
    ("", "FMA13408", "BP4909", "CONTEXT_HEAD_NECK"),
    ("", "FMA13409", "BP4910", "CONTEXT_HEAD_NECK"),
    ("", "FMA22728", "BP4758", "CONTEXT_HEAD_NECK"),
    ("", "FMA22729", "BP8022", "CONTEXT_HEAD_NECK"),
    # Trunk context.
    ("", "FMA13336", "BP4967", "CONTEXT_TRUNK"),
    ("", "FMA13337", "BP8154", "CONTEXT_TRUNK"),
    ("", "FMA79979", "BP5613", "CONTEXT_TRUNK"),
    ("", "FMA79980", "BP8323", "CONTEXT_TRUNK"),
    # Upper-limb context.
    ("", "FMA34682", "BP7571", "CONTEXT_UPPER_LIMB"),
    ("", "FMA34683", "BP9075", "CONTEXT_UPPER_LIMB"),
    ("", "FMA37686", "BP5566", "CONTEXT_UPPER_LIMB"),
    ("", "FMA37687", "BP8816", "CONTEXT_UPPER_LIMB"),
    ("", "FMA37699", "BP5564", "CONTEXT_UPPER_LIMB"),
    ("", "FMA37700", "BP8344", "CONTEXT_UPPER_LIMB"),
    # Pelvis and posterior thigh context.
    ("", "FMA22328", "BP5065", "CONTEXT_PELVIS"),
    ("", "FMA22329", "BP8401", "CONTEXT_PELVIS"),
    ("", "FMA45888", "BP5575", "CONTEXT_THIGH"),
    ("", "FMA45889", "BP8331", "CONTEXT_THIGH"),
    # Lower-leg context, including the contralateral calf for orientation.
    ("", "FMA45960", "BP5541", "CONTEXT_LOWER_LEG"),
    ("", "FMA45961", "BP7939", "CONTEXT_LOWER_LEG"),
    ("", "FMA22544", "BP5018", "CONTEXT_LOWER_LEG"),
    ("", "FMA22545", "BP8720", "CONTEXT_LOWER_LEG"),
    ("", "FMA22558", "BP4999", "CONTEXT_LOWER_LEG"),
    ("", "FMA22559", "BP8819", "CONTEXT_LOWER_LEG"),
    # Source-derived orientation shell and previously missing contralateral/forearm context.
    ("", "FMA38929", "BP8094", "CONTEXT_THIGH"),
    ("", "FMA38931", "BP8754", "CONTEXT_THIGH"),
    ("", "FMA38933", "BP9128", "CONTEXT_THIGH"),
    ("", "FMA38935", "BP9207", "CONTEXT_THIGH"),
    ("", "FMA38470", "BP4837", "CONTEXT_UPPER_LIMB"),
    ("", "FMA38471", "BP8284", "CONTEXT_UPPER_LIMB"),
    ("", "FMA38501", "BP4827", "CONTEXT_UPPER_LIMB"),
    ("", "FMA38502", "BP8560", "CONTEXT_UPPER_LIMB"),
    ("", "FMA7163", "BP9115", "CONTEXT_SKIN"),
]

HEADER = re.compile(
    r"# File ID : (?P<file>[^\n]+).*?"
    r"# Representation ID : (?P<representation>[^\n]+).*?"
    r"# Concept ID : (?P<concept>[^\n]+).*?"
    r"# English name : (?P<name>[^\n]+).*?"
    r"# Bounds\(mm\): \((?P<minx>[^,]+),(?P<miny>[^,]+),(?P<minz>[^\)]+)\)-"
    r"\((?P<maxx>[^,]+),(?P<maxy>[^,]+),(?P<maxz>[^\)]+)\).*?"
    r"# Volume\(cm3\): (?P<volume>[^\n]+)",
    re.S,
)

@dataclass
class MeshRecord:
    file_id: str
    concept_id: str
    representation_id: str
    name: str
    region: str
    archive_member: str
    bounds_mm: list[list[float]]
    volume_cm3: float
    vertices: list[tuple[float, float, float]]
    faces: list[tuple[int, int, int]]
    role: str


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_header(text: str) -> dict[str, str] | None:
    match = HEADER.search(text[:5000])
    return match.groupdict() if match else None


def load_parts(path: Path) -> dict[str, tuple[str, str]]:
    result: dict[str, tuple[str, str]] = {}
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines()[1:]:
        cells = line.split("\t", 2)
        if len(cells) == 3:
            result[cells[1]] = (cells[0], cells[2].strip())
    return result


def resolve_members(archive: Path, metadata: Path) -> dict[str, dict[str, str]]:
    wanted = {representation for _, _, representation, _ in SELECTIONS}
    parts = load_parts(metadata)
    resolved: dict[str, dict[str, str]] = {}
    with zipfile.ZipFile(archive) as source:
        for member in source.namelist():
            if not member.lower().endswith(".obj"):
                continue
            with source.open(member) as handle:
                header = handle.read(5000).decode("utf-8", errors="replace")
            parsed = parse_header(header)
            if not parsed or parsed["representation"].strip() not in wanted:
                continue
            representation = parsed["representation"].strip()
            concept, label = parts.get(representation, (parsed["concept"].strip(), parsed["name"].strip()))
            resolved[representation] = {
                **parsed,
                "representation": representation,
                "concept": concept,
                "name": label,
                "member": member,
            }
    missing = wanted - resolved.keys()
    if missing:
        raise RuntimeError(f"Could not resolve representation IDs from official archive: {', '.join(sorted(missing))}")
    return resolved


def parse_obj(text: str) -> tuple[list[tuple[float, float, float]], list[tuple[int, int, int]]]:
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int]] = []
    for line in text.splitlines():
        if line.startswith("v "):
            _, x, y, z, *_ = line.split()
            vertices.append((float(x), float(y), float(z)))
        elif line.startswith("f "):
            items = line.split()[1:]
            if len(items) < 3:
                continue
            ids = [int(item.split("/", 1)[0]) for item in items]
            # Release 4.0 is triangulated, but fan triangulation also keeps this robust.
            for index in range(1, len(ids) - 1):
                triangle = (ids[0], ids[index], ids[index + 1])
                faces.append(tuple(value - 1 if value > 0 else len(vertices) + value for value in triangle))
    if not vertices or not faces:
        raise RuntimeError("OBJ contained no usable vertices/faces")
    if any(index < 0 or index >= len(vertices) for face in faces for index in face):
        raise RuntimeError("OBJ contains an invalid face index")
    return vertices, faces


def read_mesh(source: zipfile.ZipFile, info: dict[str, str], region: str) -> MeshRecord:
    text = source.read(info["member"]).decode("utf-8", errors="replace")
    vertices, faces = parse_obj(text)
    bounds = [[float(info[key]) for key in ("minx", "miny", "minz")], [float(info[key]) for key in ("maxx", "maxy", "maxz")]]
    role = "target" if region.startswith("RIGHT_") else "context"
    return MeshRecord(info["file"].strip(), info["concept"].strip(), info["representation"].strip(), info["name"].strip(), region, info["member"], bounds, float(info["volume"]), vertices, faces, role)


def transformed(mesh: MeshRecord) -> tuple[list[float], list[float], list[int]]:
    positions = [component for x, y, z in mesh.vertices for component in (x * 0.001, z * 0.001, -y * 0.001)]
    normals = [[0.0, 0.0, 0.0] for _ in mesh.vertices]
    for a, b, c in mesh.faces:
        ax, ay, az = mesh.vertices[a]
        bx, by, bz = mesh.vertices[b]
        cx, cy, cz = mesh.vertices[c]
        # Cross product after the documented axis conversion, so winding is correct.
        va = (ax, az, -ay)
        vb = (bx, bz, -by)
        vc = (cx, cz, -cy)
        ux, uy, uz = (vb[i] - va[i] for i in range(3))
        vx, vy, vz = (vc[i] - va[i] for i in range(3))
        normal = (uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx)
        for vertex in (a, b, c):
            normals[vertex][0] += normal[0]
            normals[vertex][1] += normal[1]
            normals[vertex][2] += normal[2]
    flat_normals: list[float] = []
    for x, y, z in normals:
        length = (x * x + y * y + z * z) ** 0.5 or 1.0
        flat_normals.extend((x / length, y / length, z / length))
    indices = [index for face in mesh.faces for index in face]
    return positions, flat_normals, indices


def align4(value: int) -> int:
    return (value + 3) & ~3


def make_glb(meshes: list[MeshRecord], output: Path) -> tuple[int, int, int]:
    blob = bytearray()
    buffer_views: list[dict] = []
    accessors: list[dict] = []
    gltf_meshes: list[dict] = []
    nodes: list[dict] = []
    materials = [
        {"name": "Selected region", "pbrMetallicRoughness": {"baseColorFactor": [0.84, 0.28, 0.22, 1], "metallicFactor": 0, "roughnessFactor": 0.82}},
        {"name": "Muscular context", "pbrMetallicRoughness": {"baseColorFactor": [0.43, 0.32, 0.28, 1], "metallicFactor": 0, "roughnessFactor": 0.9}},
    ]
    total_vertices = total_triangles = 0

    def add_view(data: bytes, target: int) -> int:
        nonlocal blob
        while len(blob) % 4:
            blob.append(0)
        offset = len(blob)
        blob.extend(data)
        view_index = len(buffer_views)
        buffer_views.append({"buffer": 0, "byteOffset": offset, "byteLength": len(data), "target": target})
        return view_index

    def add_accessor(view: int, count: int, component_type: int, accessor_type: str, minimum=None, maximum=None) -> int:
        value = {"bufferView": view, "componentType": component_type, "count": count, "type": accessor_type}
        if minimum is not None:
            value["min"] = minimum
            value["max"] = maximum
        accessors.append(value)
        return len(accessors) - 1

    for mesh in meshes:
        positions, normals, indices = transformed(mesh)
        position_values = [positions[index:index + 3] for index in range(0, len(positions), 3)]
        normal_bytes = struct.pack(f"<{len(normals)}f", *normals)
        position_bytes = struct.pack(f"<{len(positions)}f", *positions)
        index_bytes = struct.pack(f"<{len(indices)}I", *indices)
        position_view = add_view(position_bytes, 34962)
        normal_view = add_view(normal_bytes, 34962)
        index_view = add_view(index_bytes, 34963)
        position_accessor = add_accessor(position_view, len(position_values), 5126, "VEC3", [min(v[i] for v in position_values) for i in range(3)], [max(v[i] for v in position_values) for i in range(3)])
        normal_accessor = add_accessor(normal_view, len(mesh.vertices), 5126, "VEC3")
        index_accessor = add_accessor(index_view, len(indices), 5125, "SCALAR", [0], [len(mesh.vertices) - 1])
        material = 0 if mesh.role == "target" else 1
        gltf_meshes.append({"name": mesh.file_id, "primitives": [{"attributes": {"POSITION": position_accessor, "NORMAL": normal_accessor}, "indices": index_accessor, "material": material}]})
        extras = {"sourceId": mesh.file_id, "representationId": mesh.representation_id, "conceptId": mesh.concept_id, "region": mesh.region, "selectable": mesh.role == "target", "sourceLabel": mesh.name}
        nodes.append({"name": mesh.file_id, "mesh": len(gltf_meshes) - 1, "extras": extras})
        total_vertices += len(mesh.vertices)
        total_triangles += len(mesh.faces)

    document = {
        "asset": {"version": "2.0", "generator": "MuscleMap prepare_anatomy.py / BodyParts3D Release 4.0"},
        "scene": 0,
        "scenes": [{"name": "MuscleMap muscular atlas", "nodes": list(range(len(nodes)))}],
        "nodes": nodes,
        "meshes": gltf_meshes,
        "materials": materials,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": len(blob)}],
        "extras": {"attribution": ATTRIBUTION, "historicalNotice": HISTORICAL_NOTICE, "licenseNote": LICENSE_NOTE},
    }
    json_bytes = json.dumps(document, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    json_bytes += b" " * ((4 - len(json_bytes) % 4) % 4)
    while len(blob) % 4:
        blob.append(0)
    glb = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(json_bytes) + 8 + len(blob))
    glb += struct.pack("<II", len(json_bytes), 0x4E4F534A) + json_bytes
    glb += struct.pack("<II", len(blob), 0x004E4942) + blob
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(glb)
    return total_vertices, total_triangles, len(glb)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--archive", type=Path)
    parser.add_argument("--metadata", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--manifest", type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    archive = (args.archive or root / "assets/anatomy-source/bodyparts3d-4.0" / ARCHIVE_NAME).resolve()
    metadata = (args.metadata or root / "assets/anatomy-source/metadata/isa_parts_list_e.txt").resolve()
    output = (args.output or root / "public/assets/muscular-atlas.glb").resolve()
    manifest_path = (args.manifest or root / "public/assets/anatomy-manifest.json").resolve()
    expected_archive_hash = ARCHIVE_SHA256
    if not archive.exists() and args.archive is None:
        archive = root / "assets/anatomy-source/musclemap-source-subset.zip"
    subset = archive.name == "musclemap-source-subset.zip"
    if subset:
        subset_manifest = json.loads((root / "assets/anatomy-source/subset-manifest.json").read_text())
        if subset_manifest["sourceArchiveSha256"] != ARCHIVE_SHA256:
            raise SystemExit("Subset original-source hash mismatch")
        expected_archive_hash = subset_manifest["subsetSha256"]
        with zipfile.ZipFile(archive) as subset_source:
            for entry in subset_manifest["entries"]:
                if hashlib.sha256(subset_source.read(entry["path"])).hexdigest() != entry["sha256"]:
                    raise SystemExit("Subset source entry hash mismatch")
    if not archive.exists() or not metadata.exists():
        raise SystemExit("Official archive / verified subset or English metadata list is missing")
    actual_archive_hash = sha256(archive)
    if actual_archive_hash != expected_archive_hash:
        raise SystemExit(f"Archive SHA-256 mismatch: expected {ARCHIVE_SHA256}, got {actual_archive_hash}")
    resolved = resolve_members(archive, metadata)
    with zipfile.ZipFile(archive) as source:
        meshes = [read_mesh(source, resolved[representation], region) for _, _, representation, region in SELECTIONS]
    vertices, triangles, size = make_glb(meshes, output)
    targets = {}
    for mesh in meshes:
        entry = {"sourceId": mesh.file_id, "representationId": mesh.representation_id, "conceptId": mesh.concept_id, "label": mesh.name}
        if mesh.role == "target":
            targets.setdefault(mesh.region, []).append(entry)
    manifest = {
        "schemaVersion": 1,
        "asset": {"path": "/assets/muscular-atlas.glb", "format": "glTF 2.0 binary", "sizeBytes": size, "sha256": sha256(output), "generator": "scripts/prepare_anatomy.py"},
        "source": {"name": "BodyParts3D / Anatomography Release 4.0 reduced OBJ", "archive": "assets/anatomy-source/bodyparts3d-4.0/" + ARCHIVE_NAME, "archiveSha256": ARCHIVE_SHA256, "inputArchiveSha256": actual_archive_hash, "inputWasVerifiedSubset": subset, "metadata": "assets/anatomy-source/metadata/isa_parts_list_e.txt", "databaseUrl": "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html", "downloadUrl": "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html", "licenseUrl": "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html"},
        "license": {"attribution": ATTRIBUTION, "historicalNotice": HISTORICAL_NOTICE, "policy": LICENSE_NOTE},
        "coordinateTransform": {"sourceUnit": "mm", "threeUnit": "m", "formula": "x=x*0.001; y=z*0.001; z=-y*0.001", "sourceAxis": "right x<0, left x>0; posterior y>0; superior z>0", "note": "Transform is baked into the GLB; no mirroring or normalization is applied."},
        "stats": {"meshCount": len(meshes), "targetMeshCount": sum(mesh.role == "target" for mesh in meshes), "contextMeshCount": sum(mesh.role == "context" for mesh in meshes), "vertexCount": vertices, "triangleCount": triangles},
        "targets": targets,
        "meshes": [{"sourceId": mesh.file_id, "representationId": mesh.representation_id, "conceptId": mesh.concept_id, "label": mesh.name, "region": mesh.region, "role": mesh.role, "archiveMember": mesh.archive_member, "boundsMm": mesh.bounds_mm, "volumeCm3": mesh.volume_cm3, "vertices": len(mesh.vertices), "triangles": len(mesh.faces)} for mesh in meshes],
        "skin": {"included": True, "reason": "The original Skin mesh is a low-opacity orientation shell, not a muscular measurement or selectable region. No opaque skin hides muscle geometry."},
    }
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(output), "manifest": str(manifest_path), "bytes": size, "meshes": len(meshes), "vertices": vertices, "triangles": triangles}, indent=2))


if __name__ == "__main__":
    main()
