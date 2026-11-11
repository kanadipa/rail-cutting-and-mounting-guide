import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface RailSceneOptions {
  /** CSS colour behind the models. */
  background?: string;
}

export interface RailScene {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  /** Frames `object` (or everything in the scene) so it fills the view, looking at the plate. */
  fitTo(object?: THREE.Object3D, padding?: number): void;
  /** Stops rendering, removes the canvas and frees GPU memory. */
  dispose(): void;
}

/**
 * Framework-free viewer: a canvas filling `container`, an orthographic camera looking at the
 * mounting plate (−Z), lights, and touch-friendly orbit controls. Scene units are millimetres.
 *
 * Renders continuously and follows the container's size. Add models with `scene.add(...)`.
 */
export function createRailScene(container: HTMLElement, options: RailSceneOptions = {}): RailScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.touchAction = "none";

  const scene = new THREE.Scene();
  if (options.background) scene.background = new THREE.Color(options.background);
  addLights(scene);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100_000, 100_000);
  camera.position.set(0, 0, 1000);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.screenSpacePanning = true;
  controls.zoomToCursor = true;

  const resize = () => {
    const w = Math.max(container.clientWidth, 1);
    const h = Math.max(container.clientHeight, 1);
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    camera.left = -w / 2;
    camera.right = w / 2;
    camera.top = h / 2;
    camera.bottom = -h / 2;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  return {
    scene,
    camera,
    renderer,
    controls,
    fitTo(object = scene, padding = 1.15) {
      fitOrthographicCamera(camera, controls, object, container.clientWidth, container.clientHeight, padding);
    },
    dispose() {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

/** Ambient + two directional lights; enough to read the shape of grey CAD models. */
export function addLights(scene: THREE.Object3D): void {
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(300, 600, 1000);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(-500, -300, 600);
  scene.add(fill);
}

/**
 * Points an orthographic camera straight at the plate (down −Z) and zooms so `object`'s
 * bounding box fills a `width × height` pixel viewport, with `padding` around it.
 */
export function fitOrthographicCamera(
  camera: THREE.OrthographicCamera,
  controls: { target: THREE.Vector3; update(): void } | null,
  object: THREE.Object3D,
  width: number,
  height: number,
  padding = 1.15,
): void {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  camera.position.set(center.x, center.y, center.z + 1000);
  camera.up.set(0, 1, 0);
  camera.lookAt(center);
  camera.zoom = Math.min(width / (size.x * padding || 1), height / (size.y * padding || 1));
  camera.updateProjectionMatrix();
  if (controls) {
    controls.target.copy(center);
    controls.update();
  }
}
