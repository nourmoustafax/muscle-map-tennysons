import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Manifest = {
  asset: { sizeBytes: number; sha256: string };
  source: { archiveSha256: string };
  coordinateTransform: {
    sourceUnit: string;
    threeUnit: string;
    formula: string;
  };
  license: { attribution: string; historicalNotice: string };
  stats: {
    meshCount: number;
    targetMeshCount: number;
    contextMeshCount: number;
    vertexCount: number;
    triangleCount: number;
  };
  targets: Record<
    string,
    Array<{ sourceId: string; representationId: string; conceptId: string }>
  >;
  meshes: Array<{
    sourceId: string;
    representationId: string;
    conceptId: string;
    role: string;
    vertices: number;
    triangles: number;
  }>;
};

const manifest = JSON.parse(
  readFileSync("public/assets/anatomy-manifest.json", "utf8"),
) as Manifest;
const glb = readFileSync("public/assets/muscular-atlas.glb");

function gltfJson(): {
  nodes: Array<{ name: string; extras: Record<string, unknown> }>;
  meshes: unknown[];
  buffers: Array<{ byteLength: number }>;
} {
  const length = glb.readUInt32LE(8);
  expect(length).toBe(glb.length);
  let offset = 12;
  while (offset < glb.length) {
    const chunkLength = glb.readUInt32LE(offset);
    const chunkType = glb.readUInt32LE(offset + 4);
    const chunk = glb.subarray(offset + 8, offset + 8 + chunkLength);
    if (chunkType === 0x4e4f534a)
      return JSON.parse(chunk.toString("utf8").trim()) as ReturnType<
        typeof gltfJson
      >;
    offset += 8 + chunkLength;
  }
  throw new Error("GLB JSON chunk missing");
}

describe("muscular atlas provenance and structure", () => {
  it("keeps the official attribution, historical notice, and documented axis transform", () => {
    expect(manifest.source.archiveSha256).toBe(
      "40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e",
    );
    expect(manifest.license.attribution).toContain("BodyParts3D");
    expect(manifest.license.attribution).toContain(
      "CC Attribution 4.0 International",
    );
    expect(manifest.license.historicalNotice).toContain(
      "CC Attribution-Share Alike 2.1 Japan",
    );
    expect(manifest.coordinateTransform).toMatchObject({
      sourceUnit: "mm",
      threeUnit: "m",
      formula: "x=x*0.001; y=z*0.001; z=-y*0.001",
    });
  });

  it("maps all five selectable meshes to the two source-defined regions", () => {
    expect(
      manifest.targets.RIGHT_QUADRICEPS_GROUP.map((entry) => entry.sourceId),
    ).toEqual(["FJ1433", "FJ1443", "FJ1441", "FJ1442"]);
    expect(
      manifest.targets.RIGHT_MEDIAL_GASTROCNEMIUS.map(
        (entry) => entry.sourceId,
      ),
    ).toEqual(["FJ1397"]);
    const targets = manifest.meshes.filter((mesh) => mesh.role === "target");
    expect(targets).toHaveLength(5);
    expect(new Set(targets.map((mesh) => mesh.sourceId))).toEqual(
      new Set(["FJ1433", "FJ1443", "FJ1441", "FJ1442", "FJ1397"]),
    );
  });

  it("contains actual full-body muscular context and stays within the compact asset budget", () => {
    expect(manifest.stats.meshCount).toBe(38);
    expect(manifest.stats.targetMeshCount).toBe(5);
    expect(
      manifest.meshes.some(
        (m) => m.sourceId === "FJ2810" && m.role === "context",
      ),
    ).toBe(true);
    expect(manifest.stats.contextMeshCount).toBeGreaterThanOrEqual(20);
    expect(manifest.stats.vertexCount).toBeGreaterThan(100_000);
    expect(manifest.stats.triangleCount).toBeGreaterThan(200_000);
    expect(statSync("public/assets/muscular-atlas.glb").size).toBeLessThan(
      20 * 1024 * 1024,
    );
    expect(manifest.asset.sizeBytes).toBe(glb.length);
    expect(createHash("sha256").update(glb).digest("hex")).toBe(
      manifest.asset.sha256,
    );
  });

  it("embeds stable FJ node IDs and selectable region metadata in the GLB", () => {
    const document = gltfJson();
    expect(document.nodes).toHaveLength(manifest.stats.meshCount);
    const ids = new Set(document.nodes.map((node) => node.name));
    expect(ids.has("FJ1433")).toBe(true);
    expect(ids.has("FJ1397")).toBe(true);
    const selectable = document.nodes.filter(
      (node) => node.extras.selectable === true,
    );
    expect(selectable).toHaveLength(5);
    expect(
      selectable.every((node) => typeof node.extras.region === "string"),
    ).toBe(true);
    expect(document.meshes).toHaveLength(manifest.stats.meshCount);
    expect(document.buffers[0].byteLength).toBeGreaterThan(0);
  });
});
