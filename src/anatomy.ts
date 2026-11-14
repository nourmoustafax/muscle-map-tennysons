import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Region } from "./domain";

export interface AnatomyViewer {
  dispose(): void;
  front(): void;
  back(): void;
  reset(): void;
  zoom(factor: number): void;
  select(region: Region): void;
  focus(region: Region): void;
}

type AtlasTemplate = THREE.Group;

type AnatomyMetadata = {
  sourceId?: string;
  representationId?: string;
  conceptId?: string;
  region?: string;
  selectable?: boolean;
  sourceLabel?: string;
};

const MODEL_URL = "/assets/muscular-atlas.glb";

/** The only source meshes that represent a measured region in the atlas. */
export const measuredRegionSourceIDs: Readonly<
  Record<Region, readonly string[]>
> = Object.freeze({
  RIGHT_QUADRICEPS_GROUP: Object.freeze([
    "FJ1433",
    "FJ1443",
    "FJ1441",
    "FJ1442",
  ]),
  RIGHT_MEDIAL_GASTROCNEMIUS: Object.freeze(["FJ1397"]),
});

const targetSourceIDs = new Set(Object.values(measuredRegionSourceIDs).flat());
const sourceRegionByID = new Map<string, Region>([
  ...measuredRegionSourceIDs.RIGHT_QUADRICEPS_GROUP.map(
    (sourceId): [string, Region] => [sourceId, "RIGHT_QUADRICEPS_GROUP"],
  ),
  ...measuredRegionSourceIDs.RIGHT_MEDIAL_GASTROCNEMIUS.map(
    (sourceId): [string, Region] => [sourceId, "RIGHT_MEDIAL_GASTROCNEMIUS"],
  ),
]);

const SELECTED_COLOR = 0x5aaec9;
const NONSELECTED_TARGET_COLOR = 0x988b82;
const CONTEXT_COLOR = 0x9a8177;
const SKIN_COLOR = 0xadc5b5;
const assetLoader = new GLTFLoader();
let cachedAtlas: Promise<AtlasTemplate> | undefined;

function loadAtlas(): Promise<AtlasTemplate> {
  if (!cachedAtlas) {
    cachedAtlas = new Promise<AtlasTemplate>((resolve, reject) => {
      assetLoader.load(
        MODEL_URL,
        (gltf) => resolve(gltf.scene),
        undefined,
        (error) => {
          cachedAtlas = undefined;
          reject(
            error instanceof Error
              ? error
              : new Error("The muscular atlas could not be loaded."),
          );
        },
      );
    });
  }
  return cachedAtlas;
}

function metadataOf(object: THREE.Object3D): AnatomyMetadata {
  return object.userData as AnatomyMetadata;
}

function setStatus(
  container: HTMLElement,
  message: string,
  state: "loading" | "ready" | "error",
): HTMLElement {
  let status = container.querySelector<HTMLElement>(".anatomy-status");
  if (!status) {
    status = document.createElement("div");
    status.className = "anatomy-status";
    status.setAttribute("aria-live", "polite");
    container.append(status);
  }
  status.className = `anatomy-status${state === "error" ? " anatomy-status-error" : ""}`;
  status.textContent = message;
  status.setAttribute("role", state === "error" ? "alert" : "status");
  return status;
}

function loadingState(container: HTMLElement): void {
  container.dataset.ready = "loading";
  const loading = document.createElement("div");
  loading.className = "model-loading";
  loading.setAttribute("role", "status");
  loading.textContent = "Loading the full-body muscular atlas…";
  container.append(loading);
  setStatus(container, "Loading local anatomical geometry…", "loading");
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  for (const item of Array.isArray(material) ? material : [material])
    item.dispose();
}

function selectedSourceIDs(region: Region): readonly string[] {
  return measuredRegionSourceIDs[region] ?? [];
}

function updateSelectionData(
  container: HTMLElement,
  region: Region,
  canvas?: HTMLCanvasElement,
): void {
  container.dataset.selectedRegion = region;
  container.dataset.selectedSourceIds = selectedSourceIDs(region).join(",");
  if (canvas) {
    canvas.dataset.selectedRegion = region;
    canvas.dataset.selectedSourceIds = selectedSourceIDs(region).join(",");
  }
}

function prepareMaterials(model: THREE.Object3D): void {
  model.traverse((object) => {
    const metadata = metadataOf(object);
    if (metadata.sourceId) {
      object.name = metadata.sourceId;
    }
    if (metadata.sourceId || metadata.region) {
      object.userData = {
        ...object.userData,
        anatomySourceId: metadata.sourceId,
        anatomyRegion: metadata.region,
      };
    }
    if (!(object as THREE.Mesh).isMesh) return;

    const mesh = object as THREE.Mesh;
    const parentMetadata = metadataOf(mesh.parent ?? object);
    const sourceMetadata = metadata.sourceId ? metadata : parentMetadata;
    const sourceId = sourceMetadata.sourceId;
    const region = sourceId ? sourceRegionByID.get(sourceId) : undefined;
    const isTarget =
      sourceMetadata.selectable === true &&
      !!sourceId &&
      targetSourceIDs.has(sourceId);
    const material = Array.isArray(mesh.material)
      ? mesh.material.map((entry) => entry.clone())
      : mesh.material.clone();

    // Geometry remains shared with the module-level GLTF cache. These are the
    // only material resources owned by this viewer instance.
    mesh.material = material;
    mesh.userData = {
      ...mesh.userData,
      anatomySourceId: sourceId,
      anatomyRegion: region,
      selectable: isTarget,
      region,
    };
  });
}

function applyMaterials(model: THREE.Object3D, selectedRegion: Region): void {
  model.traverse((object) => {
    if (!(object as THREE.Mesh).isMesh) return;
    const mesh = object as THREE.Mesh;
    const sourceId = mesh.userData.anatomySourceId as string | undefined;
    const region = mesh.userData.anatomyRegion as Region | undefined;
    const isTarget = mesh.userData.selectable === true;
    const isSkin = sourceId === "FJ2810";
    const isSelected = isTarget && region === selectedRegion;
    const materialList = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    for (const entry of materialList) {
      const physical = entry as THREE.MeshStandardMaterial;
      entry.transparent = isSkin;
      entry.opacity = isSkin ? 0.1 : 1;
      entry.depthWrite = !isSkin;
      entry.side = THREE.FrontSide;
      if ("color" in physical) {
        physical.color.set(
          isSkin
            ? SKIN_COLOR
            : isSelected
              ? SELECTED_COLOR
              : isTarget
                ? NONSELECTED_TARGET_COLOR
                : CONTEXT_COLOR,
        );
      }
      if ("roughness" in physical)
        physical.roughness = isSelected ? 0.76 : 0.88;
      if ("metalness" in physical) physical.metalness = 0;
      // Selection is conveyed by restrained blue material color, never glow.
      if ("emissive" in physical) {
        physical.emissive.set(0x000000);
        physical.emissiveIntensity = 0;
      }
      entry.needsUpdate = true;
    }
  });
}

function propagateMetadata(model: THREE.Object3D): void {
  model.traverse((object) => {
    const metadata = metadataOf(object);
    if (!metadata.sourceId) return;
    object.traverse((child) => {
      child.userData = {
        ...child.userData,
        ...metadata,
        sourceId: metadata.sourceId,
      };
    });
  });
}

function createRegionAlternatives(
  container: HTMLElement,
  onRegion: (region: Region) => void,
): () => void {
  const group = document.createElement("div");
  group.className = "anatomy-region-alternatives";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "Measured source-region alternatives");
  const buttons: Array<{ button: HTMLButtonElement; listener: () => void }> =
    [];
  const labels: Record<Region, string> = {
    RIGHT_QUADRICEPS_GROUP:
      "Right quadriceps group — rectus femoris, vastus lateralis, vastus medialis, and vastus intermedius (4 measured source meshes)",
    RIGHT_MEDIAL_GASTROCNEMIUS:
      "Right medial gastrocnemius — medial head (1 measured source mesh)",
  };

  for (const region of Object.keys(labels) as Region[]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "anatomy-region-alternative";
    button.dataset.region = region;
    button.textContent = labels[region];
    button.setAttribute("aria-label", labels[region]);
    const listener = (): void => onRegion(region);
    button.addEventListener("click", listener);
    group.append(button);
    buttons.push({ button, listener });
  }
  container.append(group);

  return () => {
    for (const { button, listener } of buttons)
      button.removeEventListener("click", listener);
    group.remove();
  };
}

function createRenderer(container: HTMLElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute(
    "aria-label",
    "Interactive full-body muscular atlas. Select the measured right quadriceps group: rectus femoris, vastus lateralis, vastus medialis, and vastus intermedius (four source meshes), or the measured right medial gastrocnemius medial head (one source mesh).",
  );
  renderer.domElement.tabIndex = 0;
  renderer.domElement.dataset.ready = "loaded";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  container.append(renderer.domElement);
  return renderer;
}

function setFrontCamera(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  distance: number,
  back = false,
): void {
  camera.position.set(
    target.x,
    target.y,
    target.z + (back ? -distance : distance),
  );
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  // Keep the camera matrix synchronized before raycasts and projected hooks.
  camera.updateMatrixWorld(true);
}

function sourceBounds(
  model: THREE.Object3D,
  region: Region,
): THREE.Box3 | undefined {
  const ids = new Set(selectedSourceIDs(region));
  const bounds = new THREE.Box3();
  let found = false;
  model.updateMatrixWorld(true);
  model.traverse((object) => {
    if (!(object as THREE.Mesh).isMesh) return;
    const sourceId = metadataOf(object).sourceId;
    if (!sourceId || !ids.has(sourceId)) return;
    bounds.expandByObject(object);
    found = true;
  });
  return found && !bounds.isEmpty() ? bounds : undefined;
}

function distanceForBounds(
  bounds: THREE.Box3,
  camera: THREE.PerspectiveCamera,
): number {
  const size = bounds.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) / 2;
  return Math.max(
    (radius / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.45,
    0.08,
  );
}

export function mountAnatomy(
  container: HTMLElement,
  region: Region,
  onSelect: (region: Region) => void,
): AnatomyViewer {
  let disposed = false;
  let renderer: THREE.WebGLRenderer | undefined;
  let controls: OrbitControls | undefined;
  let model: THREE.Object3D | undefined;
  let scene: THREE.Scene | undefined;
  let camera: THREE.PerspectiveCamera | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let resizeFallback: (() => void) | undefined;
  let framePending = false;
  let selectedRegion = region;
  let pendingFocus: Region | undefined;
  let target = new THREE.Vector3();
  let fullBodyTarget = new THREE.Vector3();
  let fitDistance = 2.2;
  let downX = 0;
  let downY = 0;
  let onControlsChange: (() => void) | undefined;
  let onPointerDown: ((event: PointerEvent) => void) | undefined;
  let onPointerUp: ((event: PointerEvent) => void) | undefined;
  let removeRegionAlternatives = (): void => undefined;

  container.replaceChildren();
  loadingState(container);
  updateSelectionData(container, selectedRegion);

  const requestRender = (): void => {
    if (disposed || framePending || !renderer || !scene || !camera) return;
    framePending = true;
    window.requestAnimationFrame(() => {
      framePending = false;
      if (!disposed && renderer && scene && camera) {
        renderer.render(scene, camera);
        const hotspots: Record<string, { x: number; y: number }> = {};
        for (const [id, sourceId] of Object.entries({
          RIGHT_QUADRICEPS_GROUP: "FJ1433",
          RIGHT_MEDIAL_GASTROCNEMIUS: "FJ1397",
        })) {
          const node = model?.getObjectByName(sourceId);
          if (!node) continue;
          const point = new THREE.Vector3();
          const positions = (node as THREE.Mesh).geometry?.getAttribute(
            "position",
          );
          if (positions) {
            for (let i = 0; i < positions.count; i++) {
              point.x += positions.getX(i);
              point.y += positions.getY(i);
              point.z += positions.getZ(i);
            }
            point.divideScalar(positions.count).applyMatrix4(node.matrixWorld);
          } else new THREE.Box3().setFromObject(node).getCenter(point);
          point.project(camera);
          hotspots[id] = {
            x: ((point.x + 1) / 2) * container.clientWidth,
            y: ((1 - point.y) / 2) * container.clientHeight,
          };
        }
        renderer.domElement.dataset.hotspots = JSON.stringify(hotspots);
        renderer.domElement.dataset.cameraPosition = JSON.stringify(
          camera.position.toArray(),
        );
      }
    });
  };

  const resize = (): void => {
    if (disposed || !renderer || !camera) return;
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    requestRender();
  };

  const setFullBodyView = (back = false): void => {
    if (disposed || !camera || !controls) return;
    target.copy(fullBodyTarget);
    setFrontCamera(camera, target, fitDistance, back);
    controls.target.copy(target);
    controls.minDistance = fitDistance * 0.38;
    controls.maxDistance = fitDistance * 2.6;
    controls.update();
    requestRender();
  };

  const focusLoadedRegion = (focusRegion: Region): void => {
    if (disposed || !model || !camera || !controls) return;
    const bounds = sourceBounds(model, focusRegion);
    if (!bounds) return;
    target.copy(bounds.getCenter(new THREE.Vector3()));
    const distance = distanceForBounds(bounds, camera);
    camera.near = Math.max(Math.min(distance / 100, fitDistance / 100), 0.001);
    camera.far = Math.max(fitDistance * 5, distance * 5);
    setFrontCamera(
      camera,
      target,
      distance,
      focusRegion === "RIGHT_MEDIAL_GASTROCNEMIUS",
    );
    controls.target.copy(target);
    controls.minDistance = Math.max(distance * 0.42, 0.05);
    controls.maxDistance = Math.max(distance * 2.7, fitDistance * 1.2);
    controls.update();
    requestRender();
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    resizeObserver?.disconnect();
    if (resizeFallback) window.removeEventListener("resize", resizeFallback);
    removeRegionAlternatives();
    if (renderer?.domElement && onPointerDown && onPointerUp) {
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
    }
    if (controls && onControlsChange)
      controls.removeEventListener("change", onControlsChange);
    controls?.dispose();
    if (model) {
      model.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) {
          // Geometry is shared with the cache and intentionally not disposed.
          disposeMaterial((object as THREE.Mesh).material);
        }
      });
    }
    renderer?.renderLists.dispose();
    renderer?.forceContextLoss();
    renderer?.dispose();
    if (renderer?.domElement.parentElement === container)
      renderer.domElement.remove();
    renderer = undefined;
    controls = undefined;
    model = undefined;
    scene = undefined;
    camera = undefined;
  };

  const viewer: AnatomyViewer = {
    dispose,
    front: () => setFullBodyView(false),
    back: () => setFullBodyView(true),
    reset: () => {
      pendingFocus = undefined;
      if (disposed || !camera || !controls) return;
      camera.near = Math.max(fitDistance / 100, 0.001);
      camera.far = fitDistance * 5;
      setFullBodyView(false);
    },
    zoom: (factor: number) => {
      if (
        disposed ||
        !camera ||
        !controls ||
        !Number.isFinite(factor) ||
        factor <= 0
      )
        return;
      const offset = camera.position
        .clone()
        .sub(controls.target)
        .multiplyScalar(factor);
      const distance = THREE.MathUtils.clamp(
        offset.length(),
        controls.minDistance,
        controls.maxDistance,
      );
      camera.position
        .copy(controls.target)
        .add(offset.normalize().multiplyScalar(distance));
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      requestRender();
    },
    select: (nextRegion: Region) => {
      selectedRegion = nextRegion;
      updateSelectionData(container, selectedRegion, renderer?.domElement);
      if (model) {
        applyMaterials(model, selectedRegion);
        requestRender();
      }
    },
    focus: (nextRegion: Region) => {
      selectedRegion = nextRegion;
      pendingFocus = nextRegion;
      updateSelectionData(container, selectedRegion, renderer?.domElement);
      if (model) {
        applyMaterials(model, selectedRegion);
        focusLoadedRegion(nextRegion);
        pendingFocus = undefined;
      }
    },
  };

  removeRegionAlternatives = createRegionAlternatives(
    container,
    (nextRegion) => {
      viewer.focus(nextRegion);
      onSelect(nextRegion);
    },
  );

  let loaderPromise: Promise<void>;
  try {
    loaderPromise = loadAtlas()
      .then((template) => {
        if (disposed) return;
        scene = new THREE.Scene();
        scene.background = null;
        scene.add(new THREE.HemisphereLight(0xe4f4ea, 0x42524a, 2.1));
        const keyLight = new THREE.DirectionalLight(0xfff4e4, 3.0);
        keyLight.position.set(2, 3, 4);
        scene.add(keyLight);
        const rimLight = new THREE.DirectionalLight(0xc2ded0, 1.7);
        rimLight.position.set(-2, 2, -3);
        scene.add(rimLight);
        camera = new THREE.PerspectiveCamera(28, 1, 0.001, 100);
        camera.up.set(0, 1, 0);
        renderer = createRenderer(container);
        updateSelectionData(container, selectedRegion, renderer.domElement);
        model = template.clone(true);
        propagateMetadata(model);
        prepareMaterials(model);
        applyMaterials(model, selectedRegion);
        scene.add(model);
        const bounds = new THREE.Box3().setFromObject(model);
        fullBodyTarget = bounds.getCenter(new THREE.Vector3());
        target.copy(fullBodyTarget);
        const size = bounds.getSize(new THREE.Vector3());
        const radius = Math.max(size.x, size.y, size.z) / 2;
        fitDistance = Math.max(
          (radius / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.15,
          0.5,
        );
        camera.near = Math.max(fitDistance / 100, 0.001);
        camera.far = fitDistance * 5;
        setFrontCamera(camera, fullBodyTarget, fitDistance);
        controls = new OrbitControls(camera, renderer.domElement);
        controls.target.copy(fullBodyTarget);
        controls.update();
        controls.enableDamping = false;
        controls.enablePan = false;
        controls.minDistance = fitDistance * 0.38;
        controls.maxDistance = fitDistance * 2.6;
        onControlsChange = requestRender;
        controls.addEventListener("change", onControlsChange);
        onPointerDown = (event: PointerEvent): void => {
          downX = event.clientX;
          downY = event.clientY;
        };
        onPointerUp = (event: PointerEvent): void => {
          if (
            Math.hypot(event.clientX - downX, event.clientY - downY) > 5 ||
            disposed ||
            !camera ||
            !model
          )
            return;
          const rect = renderer!.domElement.getBoundingClientRect();
          const pointer = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1,
          );
          const raycaster = new THREE.Raycaster();
          camera.updateMatrixWorld(true);
          raycaster.setFromCamera(pointer, camera);
          const intersections = raycaster.intersectObject(model, true);
          const hit = intersections.find((item) => {
            const metadata = metadataOf(item.object);
            return (
              metadata.selectable === true &&
              !!metadata.sourceId &&
              targetSourceIDs.has(metadata.sourceId)
            );
          });
          const selected = hit
            ? sourceRegionByID.get(metadataOf(hit.object).sourceId as string)
            : undefined;
          if (selected) {
            viewer.select(selected);
            onSelect(selected);
          }
        };
        renderer.domElement.addEventListener("pointerdown", onPointerDown);
        renderer.domElement.addEventListener("pointerup", onPointerUp);
        resizeObserver =
          typeof ResizeObserver !== "undefined"
            ? new ResizeObserver(resize)
            : undefined;
        if (resizeObserver) resizeObserver.observe(container);
        else {
          resizeFallback = resize;
          window.addEventListener("resize", resizeFallback);
        }
        container.querySelector(".model-loading")?.remove();
        container.dataset.ready = "loaded";
        if (pendingFocus) {
          const focusRegion = pendingFocus;
          pendingFocus = undefined;
          focusLoadedRegion(focusRegion);
        } else if (selectedRegion === "RIGHT_MEDIAL_GASTROCNEMIUS") {
          setFullBodyView(true);
        }
        const status = setStatus(
          container,
          "Loaded · BodyParts3D muscular atlas · drag to rotate",
          "ready",
        );
        status.dataset.ready = "loaded";
        resize();
        requestRender();
      })
      .catch((error: unknown) => {
        if (disposed) return;
        const message =
          error instanceof Error
            ? error.message
            : "The local muscular atlas could not be loaded.";
        container.dataset.ready = "error";
        const fallback =
          container.querySelector(".model-loading") ??
          document.createElement("div");
        fallback.className = "model-loading";
        fallback.setAttribute("role", "alert");
        fallback.textContent = `Anatomical viewer unavailable: ${message}`;
        if (!fallback.parentElement) container.append(fallback);
        setStatus(
          container,
          "Anatomical viewer unavailable. Use the measured region buttons below.",
          "error",
        );
      });
  } catch (error) {
    loaderPromise = Promise.reject(error);
  }
  void loaderPromise;

  return viewer;
}
